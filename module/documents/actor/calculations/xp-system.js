/**
 * Experience Point System
 *
 * Implements Legend of the Five Rings 4th Edition experience point calculations for
 * character advancement. Handles XP tracking, cost calculations, and free bonus
 * management for both character creation and post-creation advancement.
 *
 * Key Responsibilities:
 * - **XP Cost Calculation**: Compute XP costs for trait, Void, skill, emphasis,
 *   advantage, disadvantage, kata, kiho, and spell memorization purchases per L5R4 rules
 * - **Insight Rank**: Calculate Insight Rank thresholds for school advancement
 * - **Free Bonuses**: Track and apply character creation bonuses from family/school
 *   that don't cost XP (e.g., family grants +1 trait, school grants +1 trait)
 * - **XP Expenditure Tracking**: Log all XP spending for character sheet history
 * - **Disadvantage Cap**: Enforce 10 XP maximum from disadvantages per game rules
 *
 * L5R4 Game Rules Implemented:
 * - **Trait Advancement**: Cost = 4 × new rank (e.g., Reflexes 2→3 = 12 XP)
 * - **Void Advancement**: Cost = 6 × new rank (e.g., Void 2→3 = 18 XP)
 * - **Skill Advancement**: Cost = new rank (e.g., Kenjutsu 2→3 = 3 XP). Total cost
 *   from rank 0→N is sum(1 to N) = N × (N + 1) / 2
 * - **Emphasis**: 2 XP each
 * - **Advantages/Kata/Kiho**: Listed cost from item description
 * - **Disadvantages**: Grant XP up to 10 XP maximum (character creation only)
 * - **Insight Rank**: (Sum of all 5 Rings × 10) + (Sum of all Skill Ranks)
 *   - Rank 1: 0-149, Rank 2: 150-174, Rank 3: 175-199, Rank 4: 200-224,
 *     Rank 5: 225-249, then +25 insight per rank thereafter
 *
 * Free Bonus System:
 * During character creation, family selection grants +1 to one trait and school
 * selection grants +1 to another trait. These "creation bonuses" let characters
 * start with traits at rank 3 instead of 2 without spending XP. The system tracks
 * these bonuses to ensure only the first rank-3 purchase is free; subsequent
 * advancement costs full XP.
 *
 * This module uses `xpFreeTraitBase` flags to convert free "effective" bonuses to
 * permanent "base" bonuses when a trait is first advanced to rank 3, preventing
 * double-counting and ensuring proper XP tracking.
 *
 * Foundry VTT Integration:
 * - Reads actor.flags[SYS_ID] for XP tracking data (xpBase, xpManual, xpSpent, etc.)
 * - Uses actor.items collection to sum costs from skills, advantages, disadvantages
 * - Stores computed XP breakdown in sys._xp for sheet display
 * - Uses foundry.utils.setProperty() for deep flag updates during _preUpdate hooks
 * - Leverages game.i18n for localized XP log entries
 * - Requires Foundry v10+ for foundry.utils.randomID()
 *
 * @module documents/actor/calculations/xp-system
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#flags|Foundry Flags API}
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  calculateXpStepCostForTrait,
  getCreationFreeBonus
} from "../../../utils/xp-calculations.js";

/**
 * Calculate total XP cost to advance a trait from oldRank to newRank.
 *
 * Sums the XP cost for each individual rank step using the L5R4 formula (4 × rank).
 * Accounts for free effective ranks from family/school bonuses and optional discounts.
 *
 * If a character has a free effective bonus (freeEff), the cost is reduced. For example,
 * if advancing Stamina from rank 2 to 4 with freeEff=1 and no discount:
 * - Step 2→3: 4 × (3 - 1) = 8 XP (free bonus offsets one rank)
 * - Step 3→4: 4 × (4 - 1) = 12 XP (free bonus still applies)
 * - Total: 20 XP instead of the normal 28 XP (12 + 16)
 *
 * @param {number} oldRank - Current trait rank (typically 2-9)
 * @param {number} newRank - Target trait rank (typically 3-10)
 * @param {number} freeEff - Free effective ranks from creation bonuses (usually 0 or 1)
 * @param {number} disc - XP cost discount modifier (negative = cheaper, positive = more expensive)
 * @returns {number} Total XP cost for all steps from oldRank to newRank (minimum 0)
 * @private
 */
function calculateTraitXpCost(oldRank, newRank, freeEff, disc) {
  let totalXP = 0;
  for (let r = oldRank + 1; r <= newRank; r++) {
    totalXP += calculateXpStepCostForTrait(r, freeEff, disc);
  }
  return totalXP;
}

/**
 * Calculate total XP cost to advance Void Ring from oldRank to newRank.
 *
 * Implements the L5R4 Void advancement formula: Cost = 6 × new rank.
 * Sums the cost for each rank step and applies optional discounts.
 *
 * Void costs more than regular traits because it directly contributes to Insight Rank
 * calculation and grants Void Points (powerful meta-currency for boosting rolls).
 *
 * If advancing Void from 2 to 4 with no discount:
 * - Step 2→3: 6 × 3 = 18 XP
 * - Step 3→4: 6 × 4 = 24 XP
 * - Total: 42 XP
 *
 * @param {number} oldRank - Current Void Ring rank (typically 2-9)
 * @param {number} newRank - Target Void Ring rank (typically 3-10)
 * @param {number} disc - XP cost discount modifier (negative = cheaper, positive = more expensive)
 * @returns {number} Total XP cost for all steps from oldRank to newRank (minimum 0)
 * @private
 */
function calculateVoidXpCost(oldRank, newRank, disc) {
  let totalXP = 0;
  for (let r = oldRank + 1; r <= newRank; r++) {
    // Void Ring advancement: 6 XP × new rank per L5R4 rules
    const step = 6 * r + disc;
    totalXP += Math.max(0, step);
  }
  return totalXP;
}

/**
 * Type guard to safely check if an item matches an expected type.
 *
 * Defensive helper that validates both the item exists and has a string type
 * property matching the expected value. Prevents errors when iterating actor.items
 * with potentially malformed or null entries.
 *
 * @param {Object|null} item - Foundry Item document (or null)
 * @param {string} expectedType - Expected item.type value (e.g., "skill", "advantage")
 * @returns {boolean} True if item exists and item.type === expectedType
 * @private
 */
function isItemOfType(item, expectedType) {
  return item && typeof item.type === "string" && item.type === expectedType;
}

/**
 * Calculate Insight Rank from total insight value.
 *
 * Implements L5R4 Insight Rank thresholds:
 * - Rank 1: 0-149 insight
 * - Rank 2: 150-174 insight
 * - Rank 3: 175-199 insight
 * - Rank 4: 200-224 insight
 * - Rank 5: 225-249 insight
 * - Rank 6+: +25 insight per rank
 *
 * Insight Rank determines when characters learn new school Techniques and is a
 * measure of overall character power. Total insight = (sum of 5 Ring ranks × 10)
 * + (sum of all skill ranks).
 *
 * @param {number} insight - Total insight value (Rings × 10 + Skills)
 * @returns {number} Insight Rank (1-50+)
 */
export function calculateInsightRank(insight) {
  // Insight Rank thresholds per L5R4 rules: Rank 2 = 150, Rank 3 = 175, Rank 4 = 200, Rank 5 = 225
  const t = [150, 175, 200, 225];
  let rank = 1;
  for (let i = 0; i < t.length; i++) {
    if (insight >= t[i]) {
      rank = i + 2;
    }
  }
  // Rank 6+: Each additional 25 insight grants +1 rank
  if (insight >= 225) {
    rank += Math.floor((insight - 225) / 25);
  }
  return rank;
}

/**
 * Calculate and store complete XP breakdown for a PC actor.
 *
 * Computes total XP available, total XP spent, and XP remaining from all sources.
 * Stores the complete breakdown in sys._xp for sheet display. This function is
 * called during actor.prepareDerivedData() to ensure XP totals are always current.
 *
 * XP Sources (Total):
 * - Base XP (default 40 for starting characters)
 * - Disadvantages (up to 10 XP cap per game rules)
 * - Manual adjustments (GM-awarded XP from flags.xpManual array)
 *
 * XP Expenditures (Spent):
 * - Traits: Sum of all trait advancements beyond baseline (2 + free bonuses)
 * - Void Ring: Advancements beyond baseline (2 + free bonuses)
 * - Skills: Triangular sum (rank × (rank + 1) / 2) minus free ranks
 * - Emphases: 2 XP each (total emphases minus free emphases)
 * - Advantages: Sum of all advantage costs
 * - Kata: Sum of all kata costs
 * - Kiho: Sum of all kiho costs
 * - Spells: Mastery level for each memorized spell
 *
 * Free Bonus Handling:
 * The system tracks two types of free bonuses to prevent double-counting:
 * - **freeEff** (effective): Ongoing bonus from family/school, reduces XP cost
 * - **freeBase** (base): Permanent bonus stored in xpFreeTraitBase flag after
 *   first advancement to rank 3, ensures bonus only applies once
 *
 * @param {Actor} actor - Foundry Actor document (must be type "pc")
 * @param {Object} sys - Actor's system data object (actor.system)
 */
export function preparePcExperience(actor, sys) {
  const flags = actor.flags?.[SYS_ID] ?? {};

  // Base XP: Default 40 for starting L5R4 characters per game rules
  const xpBase = Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40;

  const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
  const manualSum = xpManual.reduce((a, e) => a + toInt(e?.delta), 0);

  // Sum XP granted by disadvantages
  let disadvGranted = 0;
  for (const it of actor.items) {
    if (!isItemOfType(it, "disadvantage")) {
      continue;
    }
    disadvGranted += Math.max(0, toInt(it.system?.cost));
  }

  // Disadvantage cap: Maximum XP from disadvantages (default 10 per L5R4 rules, configurable by GM)
  const configuredCap = Number.isFinite(+flags.disadvantageCap)
    ? Number(flags.disadvantageCap)
    : 10;
  const disadvCap = Math.min(configuredCap, disadvGranted);

  const traitDiscounts = actor.flags?.[SYS_ID]?.traitDiscounts ?? {};
  const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

  let traitsXP = 0;
  for (const k of Object.keys(sys.traits ?? {})) {
    // Read base trait value from _source to exclude Active Effect bonuses
    // Active Effects (from family, school, etc.) should not count as XP expenditure
    const baseCur = toInt(actor._source?.system?.traits?.[k] ?? sys.traits[k]);
    const freeBase = toInt(freeTraitBase?.[k] ?? 0);

    const freeEff = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k));
    const disc = toInt(traitDiscounts?.[k] ?? 0);

    const baseline = 2 + freeBase;

    if (baseCur > baseline) {
      traitsXP += calculateTraitXpCost(baseline, baseCur, freeEff, disc);
    }
  }

  // Read base Void Ring value from _source to exclude Active Effect bonuses
  // Active Effects should not count as XP expenditure
  const voidBaseCur = toInt(
    actor._source?.system?.rings?.void?.rank ??
      actor._source?.system?.rings?.void?.value ??
      actor._source?.system?.rings?.void ??
      sys?.rings?.void?.rank ??
      sys?.rings?.void?.value ??
      sys?.rings?.void ??
      0
  );
  const voidFreeBase = toInt(freeTraitBase?.void ?? 0);
  const voidBaseline = 2 + voidFreeBase;
  const voidDisc = toInt(traitDiscounts?.void ?? 0);

  const voidXP =
    voidBaseCur > voidBaseline ? calculateVoidXpCost(voidBaseline, voidBaseCur, voidDisc) : 0;

  let skillsXP = 0;
  for (const it of actor.items) {
    if (!isItemOfType(it, "skill")) {
      continue;
    }
    const r = toInt(it.system?.rank);
    const freeRanks = Math.max(0, toInt(it.system?.freeRanks ?? 0));
    if (r > freeRanks) {
      // Skill cost: Sum from 1 to N = N × (N + 1) / 2 (triangular sum)
      // Subtract free ranks using same formula
      skillsXP += (r * (r + 1)) / 2 - (freeRanks * (freeRanks + 1)) / 2;
    }
    const trainedEmphases = Array.isArray(it.system?.trainedEmphases)
      ? it.system.trainedEmphases
      : [];
    if (trainedEmphases.length > 0) {
      const freeEmphasis = Math.max(0, toInt(it.system?.freeEmphasis ?? 0));
      const paidEmphases = Math.max(0, trainedEmphases.length - freeEmphasis);

      // Emphasis cost: 2 XP each per L5R4 rules
      skillsXP += 2 * paidEmphases;
    }
  }

  let advantagesXP = 0;
  let kataXP = 0;
  let kihoXP = 0;
  let spellsXP = 0;
  for (const it of actor.items) {
    if (isItemOfType(it, "advantage")) {
      advantagesXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "kata")) {
      kataXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "kiho")) {
      kihoXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "spell")) {
      if (it.system?.memorized === true) {
        spellsXP += toInt(it.system?.mastery);
      }
    }
  }

  const total = xpBase + disadvCap + manualSum;
  const spent = traitsXP + voidXP + skillsXP + advantagesXP + kataXP + kihoXP + spellsXP;
  const available = total - spent;

  sys._xp = {
    total,
    spent,
    available,
    breakdown: {
      base: xpBase,
      manual: manualSum,
      disadvantagesGranted: disadvCap,
      traits: traitsXP,
      void: voidXP,
      skills: skillsXP,
      advantages: advantagesXP,
      kata: kataXP,
      kiho: kihoXP,
      spells: spellsXP
    }
  };
}

/**
 * Track XP expenditures when traits or Void Ring increase.
 *
 * DEPRECATED: Real-time XP tracking has been replaced with retroactive calculation.
 * This function now only handles free bonus consumption (converting effective bonuses
 * to permanent base bonuses when traits reach rank 3).
 *
 * XP expenditure tracking is now handled by buildXpHistory() in xp-calculator.js,
 * which reconstructs the complete XP history from the character's current state.
 * This ensures XP costs always match actual character progression without desync issues.
 *
 * @param {Actor} actor - Foundry Actor document being updated
 * @param {Object} changed - Update delta object passed to _preUpdate hook
 */
export function trackXpExpenditure(actor, changed) {
  try {
    if (actor.type !== "pc") {
      return;
    }

    const oldSys = actor._source?.system ?? actor.system;
    const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    // Handle free bonus consumption: When advancing to rank 3 with an effective bonus
    // (e.g., family/school grant), convert the effective bonus to a permanent base
    // bonus so it only applies once.
    if (changed?.system?.traits) {
      for (const [k, v] of Object.entries(changed.system.traits)) {
        const newBase = toInt(v);
        const oldBase = toInt(oldSys?.traits?.[k]);
        if (!Number.isFinite(newBase) || newBase <= oldBase) {
          continue;
        }

        const freeBase = toInt(freeTraitBase?.[k] ?? 0);
        const freeEff = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k));

        // Check if advancing to rank 3 with an effective bonus
        for (let r = oldBase + 1; r <= newBase; r++) {
          if (freeBase === 0 && freeEff > 0 && r === 3) {
            foundry.utils.setProperty(
              changed,
              `flags.${SYS_ID}.xpFreeTraitBase.${k}`,
              (freeTraitBase?.[k] ?? 0) + 1
            );
            break; // Only consume once
          }
        }
      }
    }

    // Invalidate XP cache to trigger recalculation
    if (changed?.system?.traits || changed?.system?.rings?.void) {
      foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpRetroactiveVersion`, 0);
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Free bonus tracking failed", { err });
  }
}
