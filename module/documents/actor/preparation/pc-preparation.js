/**
 * @file PC Actor Data Preparation
 * @module documents/actor/preparation/pc-preparation
 *
 * Handles derived data calculation for PC actors in the L5R4 system.
 * Coordinates trait/ring calculations, initiative, armor TN, wounds, insight,
 * and healing rates in the correct dependency order.
 *
 * Key responsibilities:
 * - Calculate PC initiative (Insight Rank + Reflexes formula)
 * - Calculate armor TN from base + equipped armor items
 * - Process wound thresholds using Earth Ring formulas
 * - Calculate insight points and rank from rings/skills
 * - Calculate healing rates from Stamina
 * - Apply stance and condition effects
 *
 * Architecture: Pure calculation functions that mutate sys object in place.
 * Foundry API: Uses actor.items collection and actor flags for armor stacking.
 *
 * PC-specific differences from NPCs:
 * - Initiative uses Insight Rank + Reflexes (not custom values)
 * - Armor TN calculated from base (5*Ref+5) + equipped armor
 * - Wound thresholds calculated from Earth Ring formulas
 * - Insight calculated from rings and skill ranks
 * - Healing rate calculated from Stamina + Insight Rank
 */

import { SYS_ID } from "../../../config/constants.js";

import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

import { applyStanceAutomation } from "../../../services/stance/core/automation.js";

import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../../../config/game-mechanics.js";
import { prepareTraitsAndRings, prepareMovement } from "../calculations/shared-traits-rings.js";
import { applyConditionEffects } from "../calculations/condition-effects.js";
import { enrichActorItems } from "../calculations/item-enrichment.js";

/**
 * Prepares derived data for PC actors.
 *
 * Calculates all derived values for PCs including traits, initiative, armor TN,
 * wounds, insight, and healing rates. Executes calculations in dependency order.
 * PC calculations differ significantly from NPCs (see file header).
 *
 * @param {Actor} actor - The PC actor being prepared
 * @param {object} sys - The actor's system data object (mutated in place)
 * @param {Function} finalizeWoundPenaltiesFn - Callback to finalize wound penalties
 * @param {Function} calculateInsightRankFn - Callback to calculate insight rank from points
 *
 * @returns {void} Mutates sys object in place
 *
 * @example
 * // Called from Actor.prepareData()
 * preparePcData(this, this.system, finalizeWoundPenalties, calculateInsightRank);
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

  // Helper to access effective trait values (after all modifiers)
  const tEff = sys._derived?.traitsEff || {};
  const TR = k => toInt(tEff[k]);

  // Calculate PC initiative using standard formula: (Insight Rank + Reflexes)k(Reflexes)
  // This differs from NPCs which can have custom initiative values
  sys.initiative = sys.initiative || {};
  sys.initiative.roll = toInt(sys.insight?.rank) + TR("ref") + toInt(sys.initiative.rollMod);
  sys.initiative.keep = TR("ref") + toInt(sys.initiative.keepMod);

  // Calculate PC armor TN from base formula + equipped armor
  // Base TN = Reflexes × 5 + 5 (L5R4 core rules)
  sys.armorTn = sys.armorTn || {};
  const ref = TR("ref");
  const baseTN = 5 * ref + 5;
  const modTN = toInt(sys.armorTn.mod);

  // Check if armor stacking is allowed (optional house rule)
  const allowStack = actor.getFlag(SYS_ID, "allowArmorStacking") ?? false;

  let bonusTN = 0;
  let reduction = 0;

  // Aggregate bonuses from all equipped armor items
  // Default behavior: Use highest bonus (RAW)
  // Optional behavior: Stack all bonuses (house rule)
  for (const it of actor.items) {
    if (!it || typeof it.type !== "string" || it.type !== "armor") {
      continue;
    }
    const a = it.system ?? {};
    if (!a?.equipped) {
      continue;
    }
    const b = toInt(a.bonus);
    const r = toInt(a.reduction);
    if (allowStack) {
      bonusTN += b;
      reduction += r;
    } else {
      bonusTN = Math.max(bonusTN, b);
      reduction = Math.max(reduction, r);
    }
  }

  sys.armorTn.base = baseTN;
  sys.armorTn.bonus = bonusTN;

  const reductionMod = toInt(sys.armorTn.reductionMod);
  sys.armorTn.reduction = Math.max(0, reduction + reductionMod);

  // Add Void Point bonus if active (+10 TN for spending Void Point)
  const voidTnBonus = sys.armorTn.useVoid ? 10 : 0;
  sys.armorTn.current = baseTN + modTN + bonusTN + voidTnBonus;

  // Apply stance effects (must happen after traits/armor are calculated)
  applyStanceAutomation(actor, sys);

  // Apply condition effects (must happen after stance)
  applyConditionEffects(actor, sys);

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

  // Calculate Insight Points from rings and skills (L5R4 core rules)
  // Formula: (Sum of Rings × 10) + (Sum of Skill Ranks × 1)
  const ringsTotal =
    toInt(sys.rings.air) +
    toInt(sys.rings.earth) +
    toInt(sys.rings.fire) +
    toInt(sys.rings.water) +
    toInt(sys.rings?.void?.rank);

  let skillTotal = 0;
  for (const it of actor.items) {
    if (!it || typeof it.type !== "string" || it.type !== "skill") {
      continue;
    }
    skillTotal += toInt(it.system?.rank);
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

  // Calculate healing rate (L5R4 core rules)
  // Formula: (Stamina × 2) + Insight Rank + modifiers
  const baseStamina = TR("sta");
  const healingStaminaMod = toInt(sys.wounds?.healingStaminaMod);
  const healingStamina = baseStamina + healingStaminaMod;

  sys._derived = sys._derived || {};
  sys._derived.healingStamina = healingStamina;

  sys.wounds.healRate = healingStamina * 2 + toInt(sys.insight?.rank) + toInt(sys.wounds?.mod);

  // Enrich embedded items with calculated data
  enrichActorItems(actor);
}
