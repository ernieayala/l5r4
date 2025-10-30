/**
 * PC Actor Preparation Module
 *
 * Handles derived data calculation for Player Character actors. Extracted from main
 * L5R4Actor class to maintain file size limits (<300 lines per file).
 *
 * Calculates combat stats, wound thresholds, insight, and equipment-based modifiers
 * per L5R4 game rules for PC actors exclusively.
 *
 * @module documents/actor/preparation/pc-preparation
 */

// Config
import { SYS_ID } from "../../../config/constants.js";

// Utils
import { toInt } from "../../../utils/type-coercion.js";

// Services
import { applyStanceAutomation } from "../../../services/stance/core/automation.js";

// Local
import { WOUND_LEVEL_ORDER } from "../constants/wound-constants.js";
import { prepareTraitsAndRings } from "../calculations/shared-traits-rings.js";
import { applyConditionEffects } from "../calculations/condition-effects.js";
import { enrichActorItems } from "../calculations/item-enrichment.js";

/**
 * Prepare derived data for Player Character actors.
 *
 * Calculates all combat statistics, wound thresholds, and insight rank for PC actors.
 * Implements full L5R4 character rules including equipment-based modifiers, stance
 * automation, and formula-based wound calculations.
 *
 * **Calculated Values:**
 * - School name (from equipped school item)
 * - Traits and Rings (via prepareTraitsAndRings)
 * - Initiative: (Insight Rank + Reflexes)kReflexes
 * - Armor TN: (Reflexes × 5 + 5) + armor bonus + modifiers
 * - Armor Reduction: Damage reduction from equipped armor
 * - Stance Effects: Bonuses/penalties from current combat stance
 * - Wound Levels: Earth-based thresholds with progressive penalties
 * - Healing Rate: (Stamina × 2) + Insight Rank + modifiers
 * - Insight Points: (Rings × 10) + Skill Ranks
 * - Insight Rank: Character advancement tier (1-8+)
 *
 * **Armor Stacking:**
 * The `allowArmorStacking` system setting controls how multiple equipped armor pieces
 * interact:
 * - Enabled: All armor bonuses and reductions stack additively
 * - Disabled (default): Only highest armor bonus and highest reduction apply
 * This is a house rule option; RAW L5R4 assumes characters wear one armor piece.
 *
 * **Wound Calculation:**
 * Uses formula mode exclusively for PCs:
 * - Healthy: Earth × 5 (buffer for normal activity per core rules)
 * - Other ranks: Earth × multiplier (cumulative)
 * - Multiplier defaults to 2 (standard lethality: very deadly, 1-3 round combats)
 * - Higher multipliers (3/4/5) available for less lethal campaigns
 *
 * **Side Effects:**
 * Mutates the `sys` parameter extensively, populating:
 * - sys.school, sys.initiative, sys.armorTn, sys.woundLevels, sys.wounds, sys.insight
 *
 * @param {L5R4Actor} actor - The PC actor being prepared
 * @param {Object} sys - Actor system data (actor.system) to mutate
 * @param {Function} finalizeWoundPenaltiesFn - Function to finalize wound penalties
 * @param {Function} calculateInsightRankFn - Function to calculate insight rank
 * @returns {void}
 */
export function preparePcData(actor, sys, finalizeWoundPenaltiesFn, calculateInsightRankFn) {
  // Extract school name from equipped school item for display on character sheet
  // Error handling: If items collection is malformed, preserve existing school name
  try {
    const schoolItem = (actor.items?.contents ?? actor.items).find(i => i.type === "school");
    sys.school = schoolItem?.name ?? "";
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to derive school name in preparePcData", { err });
    sys.school = sys.school ?? "";
  }

  prepareTraitsAndRings(sys);

  // Helper: Get trait value safely as integer
  const tEff = sys._derived?.traitsEff || {};
  const TR = k => toInt(tEff[k]);

  // Initiative calculation per L5R4 combat rules:
  // Roll: Insight Rank + Reflexes + modifiers (determines action order)
  // Keep: Reflexes + modifiers (number of dice kept)
  // Higher Initiative Score acts first each round
  sys.initiative = sys.initiative || {};
  sys.initiative.roll = toInt(sys.insight?.rank) + TR("ref") + toInt(sys.initiative.rollMod);
  sys.initiative.keep = TR("ref") + toInt(sys.initiative.keepMod);

  // Note: Void Point initiative bonus (+10) is applied in initiative.js
  // when dialog is confirmed, not in prepareDerivedData

  // Armor TN calculation per L5R4 combat rules:
  // Base TN = (Reflexes × 5) + 5 (default difficulty to hit character)
  // Current TN = Base + Manual Modifier + Armor Bonus
  // Attackers must meet or exceed this TN to hit
  sys.armorTn = sys.armorTn || {};
  const ref = TR("ref");
  const baseTN = 5 * ref + 5;
  const modTN = toInt(sys.armorTn.mod);

  // Check armor stacking setting (house rule option)
  // If disabled (default), only highest armor bonus applies (prevents exploit of wearing multiple armor)
  // If enabled, all equipped armor bonuses stack (generous house rule)
  let allowStack = false;
  try {
    allowStack = game.settings.get(SYS_ID, "allowArmorStacking");
  } catch (_) {
    /* setting not registered: default false */
  }

  // Iterate equipped armor items to calculate total TN bonus and damage reduction
  let bonusTN = 0;
  let reduction = 0;

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
      // Stacking enabled: Sum all armor bonuses/reductions
      bonusTN += b;
      reduction += r;
    } else {
      // Stacking disabled: Use highest single armor bonus/reduction
      bonusTN = Math.max(bonusTN, b);
      reduction = Math.max(reduction, r);
    }
  }

  sys.armorTn.base = baseTN;
  sys.armorTn.bonus = bonusTN;
  sys.armorTn.reduction = reduction;

  // Apply Void Point armor TN boost if active (+10)
  const voidTnBonus = sys.armorTn.useVoid ? 10 : 0;
  sys.armorTn.current = baseTN + modTN + bonusTN + voidTnBonus;

  applyStanceAutomation(actor, sys);
  applyConditionEffects(actor, sys);

  // Movement calculation per L5R4 combat rules:
  // Free Action: Water Ring × 5 feet
  // Simple Action: Water Ring × 10 feet
  // Maximum per Round: Water Ring × 20 feet (hard limit)
  // Conditions like Blinded reduce effective Water Ring by 2 for movement (applied after condition effects)
  // Custom modifiers: multiplier (for water ring) and modifier (flat modifier)
  const baseWater = toInt(sys.rings.water);
  const waterPenalty = sys._conditionEffects?.waterRingPenalty ?? 0;
  const effectiveWater = Math.max(1, baseWater + waterPenalty); // Minimum 1 per L5R4 rules
  sys.movement = sys.movement || {};
  const movementMultiplier = parseFloat(sys.movement.multiplier) || 1;
  const movementModifier = toInt(sys.movement.modifier) || 0;
  sys.movement.freeAction = effectiveWater * 5 * movementMultiplier + movementModifier;
  sys.movement.simpleAction = effectiveWater * 10 * movementMultiplier + movementModifier;
  sys.movement.maximum = effectiveWater * 20 * movementMultiplier + movementModifier;

  // Wound threshold calculation per L5R4 rules with lethality variants:
  // Healthy rank: Earth × 5 + modifier (buffer for normal activity)
  // Other ranks: Earth × multiplier + previous threshold + modifier (cumulative)
  //
  // Lethality variants (Earth multiplier):
  // ×2 (default): Very lethal, 1-3 round combats (RAW L5R4)
  // ×3: Moderate lethality, 3-4 round combats
  // ×4: Lower lethality, 5-6 round combats
  // ×5: High survivability, 7+ round combats
  const earth = sys.rings.earth;
  const mult = toInt(sys.woundsMultiplier);
  const add = toInt(sys.woundsMod);

  sys.woundLevels = sys.woundLevels || {};
  const order = WOUND_LEVEL_ORDER;
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

  finalizeWoundPenaltiesFn(sys, order);

  // Insight calculation per L5R4 character advancement:
  // Insight Points = (Sum of 5 Ring ranks × 10) + (Sum of all Skill ranks)
  // This value determines Insight Rank (school technique progression)
  // MUST be calculated BEFORE heal rate, as heal rate depends on insight rank
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

  // Auto-calculate Insight Rank if setting enabled (default: enabled)
  // If disabled, GMs can manually set rank for special circumstances
  if (game.settings.get(SYS_ID, "calculateRank")) {
    sys.insight.rank = calculateInsightRankFn(sys.insight.points);
  }

  // Calculate derived healing stamina for advantages that boost stamina for healing
  // (e.g., "For the purposes of recovering Wounds, your Stamina is considered to be two ranks higher")
  const baseStamina = TR("sta");
  const healingStaminaMod = toInt(sys.wounds?.healingStaminaMod);
  const healingStamina = baseStamina + healingStaminaMod;

  // Store derived value for use in healing calculations
  sys._derived = sys._derived || {};
  sys._derived.healingStamina = healingStamina;

  // Healing rate per L5R4 rules: (Stamina × 2) + Insight Rank + modifiers
  // Uses healingStamina to account for advantages that boost healing
  // MUST be calculated AFTER insight rank is determined
  sys.wounds.healRate = healingStamina * 2 + toInt(sys.insight?.rank) + toInt(sys.wounds?.mod);

  // Enrich all actor items with calculated roll formulas
  // This runs in Documents layer (prepareDerivedData) per architecture rules
  // Sheets will only read these pre-calculated formulas, never recalculate them
  enrichActorItems(actor);
}
