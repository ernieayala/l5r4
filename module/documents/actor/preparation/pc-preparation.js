/**
 * @module documents/actor/preparation/pc-preparation
 * @description Prepares a PC's derived data in dependency order: Traits and Rings, Insight, the rules that need
 * them, Armor TN from its base (Reflexes × 5 + 5) and the equipped armor with its rules, movement, Wound Ranks from
 * the Earth Ring, Initiative (Insight Rank + Reflexes), healing, and the owned items' formulas. Modifies the actor's
 * system data in place; reads the actor's items and its armor-stacking flag.
 */

import { SYS_ID } from "../../../config/constants.js";
import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS,
  RIDING_ARMOR_MOUNTED_BONUS
} from "../../../config/game-mechanics.js";
import { TRAIT_KEYS } from "../../../config/reference-data.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import { getInitiativePool } from "../../../utils/initiative.js";
import { getCreationFreeBonusSources } from "../../../utils/xp-calculations.js";
import {
  prepareTraitsAndRings,
  prepareMovement,
  ringsOf
} from "../calculations/shared-traits-rings-system.js";
import { prepareHealRate } from "../calculations/wound-system.js";
import { prepareItemFormulas } from "../calculations/item-enrichment-system.js";
import { applyArmorRules, applyDerivedRules } from "../rules.js";

/**
 * Prepares derived data for PC actors.
 *
 * Calculates all derived values for PCs including traits, initiative, armor TN,
 * wounds, insight, and healing rates. Executes calculations in dependency order.
 * PC calculations differ from NPCs (see file header).
 *
 * @param {Actor} actor - The PC actor being prepared
 * @param {object} sys - The actor's system data object (mutated in place)
 * @param {Function} finalizeWoundPenaltiesFn - Callback to finalize wound penalties
 * @param {Function} calculateInsightRankFn - Callback to calculate insight rank from points
 *
 * @returns {void} Mutates sys object in place
 */
export function preparePcData(actor, sys, finalizeWoundPenaltiesFn, calculateInsightRankFn) {
  // Extract school name from equipped school item
  // Defensive: Handle both v10 (items.contents) and v11 (items) API
  try {
    const schoolItem = (actor.items?.contents ?? actor.items).find(i => i.type === "school");
    sys.school = schoolItem?.name ?? "";
  } catch (err) {
    logError("Failed to derive school name in preparePcData", err, {
      actorId: actor?.id,
      actorName: actor?.name
    });
    sys.school = sys.school ?? "";
  }

  // Calculate base traits and rings first (required for all subsequent calculations)
  prepareTraitsAndRings(sys);

  // Insight needs only Rings and Skill ranks; it comes before the rules so predicates can test Insight and School
  // Rank
  // game-rules/49_improving_your_character.md, p.104
  prepareInsight(actor, sys, calculateInsightRankFn);

  // Rules that need Traits and Rings, before the values their outputs feed (Initiative, Wounds, roll bonuses)
  applyDerivedRules(actor, sys);

  // Helper to access effective trait values (after all modifiers)
  const tEff = sys._derived?.traitsEff || {};
  const effectiveTraitOf = k => toInt(tEff[k]);

  // Calculate PC armor TN from base formula + equipped armor
  // Base TN = Reflexes × 5 + 5 (L5R4 core rules)
  sys.armorTn = sys.armorTn || {};
  const ref = effectiveTraitOf("ref");
  const baseTn = 5 * ref + 5;
  const modTn = toInt(sys.armorTn.mod);

  // Check if armor stacking is allowed (optional house rule)
  const allowStack = actor.getFlag(SYS_ID, "allowArmorStacking") ?? false;

  let bonusTn = 0;
  let reduction = 0;

  // Aggregate bonuses from all equipped armor items
  // Default behavior: Use highest bonus (RAW)
  // Optional behavior: Stack all bonuses (house rule)
  const mounted = actor.statuses.has("mounted");
  for (const it of actor.items) {
    if (!it || typeof it.type !== "string" || it.type !== "armor") {
      continue;
    }
    const a = it.system ?? {};
    if (!a?.equipped) {
      continue;
    }
    // Riding armor's +4 is +12 on horseback: 8 more than its entered bonus while mounted
    // game-rules/73_armor.md, p.198
    const b =
      toInt(a.bonus) + (mounted && a.armorType === "riding" ? RIDING_ARMOR_MOUNTED_BONUS : 0);
    const r = toInt(a.reduction);
    if (allowStack) {
      bonusTn += b;
      reduction += r;
    } else {
      bonusTn = Math.max(bonusTn, b);
      reduction = Math.max(reduction, r);
    }
  }

  sys.armorTn.base = baseTn;
  sys.armorTn.bonus = bonusTn;

  const reductionMod = toInt(sys.armorTn.reductionMod);
  sys.armorTn.reduction = Math.max(0, reduction + reductionMod);

  // Stances, conditions, and Void Points change the Armor TN through ArmorTN rules on their effects
  applyArmorRules(actor, sys, { base: baseTn, armor: bonusTn, other: modTn });

  // Calculate movement rates (depends on traits)
  prepareMovement(sys);

  // Calculate PC wound thresholds using Earth Ring formulas (L5R4 core rules)
  // Healthy: Earth × 5 + modifier
  // Other levels: Earth × multiplier + previous threshold + modifier
  // Cumulative thresholds (each level adds to previous)
  const order = WOUND_LEVEL_ORDER;
  try {
    const earth = toInt(sys.rings.earth) || 1;
    const mult = toInt(sys.woundsMultiplier) || 2;
    const add = toInt(sys.woundsMod) || 0;

    sys.woundLevels = sys.woundLevels || {};
    let prev = 0;
    for (const key of order) {
      const lvl =
        sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      // Each wound level starts from its base penalty (issue #32), so prepareWoundPenalties gives every row its
      // own penalty plus the modifier, and Healthy stays 0 whatever the modifier.
      lvl.penalty = DEFAULT_WOUND_PENALTIES[key] ?? 0;
      prev = lvl.value;
    }
  } catch (err) {
    // Fallback to default thresholds if calculation fails
    logError("Failed to prepare PC wound thresholds", err, {
      actorId: actor?.id,
      earthRing: sys.rings?.earth
    });
    sys.woundLevels = sys.woundLevels || {};
    for (const key of WOUND_LEVEL_ORDER) {
      sys.woundLevels[key] = {
        value: DEFAULT_WOUND_THRESHOLDS[key] || 0,
        penalty: DEFAULT_WOUND_PENALTIES[key] || 0,
        current: false
      };
    }
  }

  // Apply wound penalties to traits/rings
  finalizeWoundPenaltiesFn(sys, order);

  // Initiative pool: Insight Rank + Reflexes, keep Reflexes. Calculated once the Insight Rank above is final.
  // game-rules/31_combat_round.md, p.81
  sys.initiative = sys.initiative || {};
  Object.assign(
    sys.initiative,
    getInitiativePool({
      insightRank: toInt(sys.insight.rank),
      reflexes: effectiveTraitOf("ref"),
      rollMod: toInt(sys.initiative.rollMod),
      keepMod: toInt(sys.initiative.keepMod)
    })
  );

  prepareHealRate(sys, toInt(sys.insight.rank));

  // Enrich embedded items with calculated data
  prepareItemFormulas(actor);
}

/**
 * Calculate Insight points and, unless the GM sets it by hand, Insight Rank: the Rings times ten plus every Skill
 * rank. The Rings come from the stored ranks plus the Family and School TraitAdjust bonuses, so an effect that
 * raises a Trait for a while (a kata, a spell) never changes the Insight Rank.
 * game-rules/49_improving_your_character.md, p.104
 * @param {Actor} actor
 * @param {object} sys - Prepared system data
 * @param {Function} calculateInsightRankFn - Insight Rank from points
 */
function prepareInsight(actor, sys, calculateInsightRankFn) {
  const stored = actor._source.system;
  const ownedTraitOf = key =>
    toInt(stored.traits[key]) + getCreationFreeBonusSources(actor, key).rules;
  const rings = ringsOf(Object.fromEntries(TRAIT_KEYS.map(key => [key, ownedTraitOf(key)])));
  const voidRank = toInt(stored.rings.void.rank) + getCreationFreeBonusSources(actor, "void").rules;
  const ringsTotal = rings.air + rings.earth + rings.fire + rings.water + voidRank;

  let skillTotal = 0;
  for (const it of actor.items) {
    if (it.type === "skill") {
      skillTotal += toInt(it._source.system.rank);
    }
  }

  sys.insight = sys.insight || {};
  sys.insight.points = ringsTotal * 10 + skillTotal * 1;

  // Default to auto-calculate insight rank from points
  if (sys.insight.autoCalculate === undefined) {
    sys.insight.autoCalculate = true;
  }

  // Calculate insight rank from points using school progression table
  if (sys.insight.autoCalculate) {
    sys.insight.rank = calculateInsightRankFn(sys.insight.points);
  }
}
