/**
 * @module documents/actor/preparation/pc-preparation
 * @description Prepares a PC's derived data in dependency order: Traits and Rings, Insight, the rules that need
 * them, Armor TN from its base (Reflexes × 5 + 5) and the equipped armor with its rules, movement, Wound Ranks from
 * the Earth Ring, Initiative (Insight Rank + Reflexes), healing, the owned items' formulas, and XP. Modifies the
 * actor's system data in place; reads the actor's items and its armor-stacking flag.
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
import { getWoundThreshold, prepareHealRate } from "../calculations/wound-system.js";
import { prepareItemFormulas } from "../calculations/item-enrichment-system.js";
import { getInsightRank, preparePcExperience } from "../calculations/xp-system.js";
import { applyArmorRules, applyDerivedRules } from "../rules.js";

/**
 * Prepares derived data for PC actors.
 *
 * Calculates all derived values for PCs including traits, initiative, armor TN,
 * wounds, insight, healing rates, and XP. Executes calculations in dependency order.
 * PC calculations differ from NPCs (see file header).
 *
 * @param {Actor} actor - The PC actor being prepared
 * @param {object} sys - The actor's system data object (mutated in place)
 *
 * @returns {void} Mutates sys object in place
 */
export function preparePcData(actor, sys) {
  prepareSchoolName(actor, sys);

  // Calculate base traits and rings first (required for all subsequent calculations)
  prepareTraitsAndRings(sys);

  // Insight needs only Rings and Skill ranks; it comes before the rules so predicates can test Insight and School
  // Rank
  // game-rules/49_improving_your_character.md, p.104
  prepareInsight(actor, sys, getInsightRank);

  // Rules that need Traits and Rings, before the values their outputs feed (Initiative, Wounds, roll bonuses)
  applyDerivedRules(actor, sys);

  preparePcArmorTn(actor, sys);

  // Calculate movement rates (depends on traits)
  prepareMovement(sys);

  preparePcWoundLevels(actor, sys);

  // Apply wound penalties to traits/rings
  actor._finalizeWoundPenalties(sys, WOUND_LEVEL_ORDER);

  preparePcInitiative(sys);

  prepareHealRate(sys, toInt(sys.insight.rank));

  // Enrich embedded items with calculated data
  prepareItemFormulas(actor);

  preparePcExperience(actor, sys);
}

/**
 * Set `sys.school` to the name of the actor's School item, or empty without one.
 * @param {Actor} actor
 * @param {object} sys - Prepared system data
 */
function prepareSchoolName(actor, sys) {
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
}

/**
 * Prepare the PC's Armor TN from its base, Reflexes × 5 + 5, the equipped armor's bonus and Reduction, and the
 * ArmorTN rules on its effects (stances, conditions, Void Points). The highest armor counts unless the actor allows
 * armor stacking (a house rule).
 * game-rules/32_attack_and_defense.md, p.82
 * @param {Actor} actor
 * @param {object} sys - Prepared system data, after the effective Traits are known
 */
function preparePcArmorTn(actor, sys) {
  sys.armorTn = sys.armorTn || {};
  const baseTn = 5 * effectiveTraitOf(sys, "ref") + 5;
  const modTn = toInt(sys.armorTn.mod);
  const { bonusTn, reduction } = getEquippedArmor(actor);

  sys.armorTn.base = baseTn;
  sys.armorTn.bonus = bonusTn;

  const reductionMod = toInt(sys.armorTn.reductionMod);
  sys.armorTn.reduction = Math.max(0, reduction + reductionMod);

  // Stances, conditions, and Void Points change the Armor TN through ArmorTN rules on their effects
  applyArmorRules(actor, sys, { base: baseTn, armor: bonusTn, other: modTn });
}

/**
 * The equipped armor's Armor TN bonus and Reduction: the highest of each by default (RAW), or every piece added
 * together when the actor allows armor stacking (a house rule).
 * @param {Actor} actor
 * @returns {{bonusTn: number, reduction: number}}
 */
function getEquippedArmor(actor) {
  // Check if armor stacking is allowed (optional house rule)
  const allowStack = actor.getFlag(SYS_ID, "allowArmorStacking") ?? false;
  let bonusTn = 0;
  let reduction = 0;
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
  return { bonusTn, reduction };
}

/**
 * Prepare the PC's Wound Ranks: each threshold from the Earth Ring, each rank's on top of the one before it, and
 * each rank's base penalty; the default thresholds when that fails.
 * game-rules/33_wounds.md, p.82
 * @param {Actor} actor
 * @param {object} sys - Prepared system data, after the Rings are known
 */
function preparePcWoundLevels(actor, sys) {
  try {
    const earth = toInt(sys.rings.earth) || 1;
    const mult = toInt(sys.woundsMultiplier) || 2;
    const add = toInt(sys.woundsMod) || 0;

    sys.woundLevels = sys.woundLevels || {};
    let prev = 0;
    for (const key of WOUND_LEVEL_ORDER) {
      const lvl =
        sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      lvl.value = getWoundThreshold(key, { earth, mult, add, prev });
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
}

/**
 * Initiative pool: Insight Rank + Reflexes, keep Reflexes. Calculated once the Insight Rank is final.
 * game-rules/31_combat_round.md, p.81
 * @param {object} sys - Prepared system data
 */
function preparePcInitiative(sys) {
  sys.initiative = sys.initiative || {};
  Object.assign(
    sys.initiative,
    getInitiativePool({
      insightRank: toInt(sys.insight.rank),
      reflexes: effectiveTraitOf(sys, "ref"),
      rollMod: toInt(sys.initiative.rollMod),
      keepMod: toInt(sys.initiative.keepMod)
    })
  );
}

/**
 * An effective Trait, after all modifiers.
 * @param {object} sys - Prepared system data, after the effective Traits are known
 * @param {string} key - Trait key
 * @returns {number}
 */
function effectiveTraitOf(sys, key) {
  return toInt((sys._derived?.traitsEff || {})[key]);
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
