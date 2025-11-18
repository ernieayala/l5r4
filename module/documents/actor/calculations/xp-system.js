/**
 * @module xp-system
 * @description Manages L5R4 experience point (XP) tracking and calculations.
 *
 * L5R4 XP System:
 * - Characters earn XP to improve traits, skills, and abilities
 * - Traits cost increases with rank (4×rank for most traits)
 * - Void Ring costs 6×rank
 * - Skills use triangular number formula: rank×(rank+1)/2
 * - Advantages/Kata/Kiho have fixed costs
 * - Spells cost their Mastery Level when memorized
 *
 * XP Sources:
 * - Base XP (starting 40 for new characters)
 * - Disadvantages (capped, typically 10 XP max)
 * - Manual adjustments (GM awards, session XP)
 *
 * Architecture:
 * - Calculates total XP earned and spent
 * - Tracks XP breakdown by category
 * - Handles free trait bonuses from character creation
 * - Applies trait discounts from advantages/disadvantages
 * - Calculates Insight Rank from Insight total
 *
 * Foundry Integration:
 * - Reads from actor flags for XP tracking
 * - Modifies sys._xp with calculated values
 * - Tracks retroactive free bonus application
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import {
  calculateXpStepCostForTrait,
  getCreationFreeBonus
} from "../../../utils/xp-calculations.js";

/**
 * Calculates XP cost to raise a trait from one rank to another.
 *
 * @param {number} oldRank - Starting trait rank
 * @param {number} newRank - Target trait rank
 * @param {number} freeEff - Free bonus points available (from character creation)
 * @param {number} disc - Discount modifier (from advantages/disadvantages)
 * @returns {number} Total XP cost
 *
 * @description
 * Sums XP cost for each rank increase:
 * - Standard trait cost: 4×rank (modified by discounts)
 * - Free bonuses reduce cost at specific ranks
 * - Discounts apply to each step
 */
function calculateTraitXpCost(oldRank, newRank, freeEff, disc) {
  let totalXP = 0;
  // Sum cost for each rank increase
  for (let r = oldRank + 1; r <= newRank; r++) {
    totalXP += calculateXpStepCostForTrait(r, freeEff, disc);
  }
  return totalXP;
}

/**
 * Calculates XP cost to raise Void Ring from one rank to another.
 *
 * @param {number} oldRank - Starting Void rank
 * @param {number} newRank - Target Void rank
 * @param {number} disc - Discount modifier
 * @returns {number} Total XP cost
 *
 * @description
 * Void Ring has special cost formula:
 * - Base cost: 6×rank per step
 * - More expensive than regular traits (4×rank)
 * - Discounts can apply from advantages
 * - Minimum cost per step is 0
 */
function calculateVoidXpCost(oldRank, newRank, disc) {
  let totalXP = 0;
  // Sum cost for each Void rank increase
  for (let r = oldRank + 1; r <= newRank; r++) {
    const step = 6 * r + disc; // Void costs 6×rank
    totalXP += Math.max(0, step);
  }
  return totalXP;
}

/**
 * Type guard to check if an item matches expected type.
 *
 * @param {Item} item - The item to check
 * @param {string} expectedType - Expected item type
 * @returns {boolean} True if item matches type
 */
function isItemOfType(item, expectedType) {
  return item && typeof item.type === "string" && item.type === expectedType;
}

/**
 * Calculates Insight Rank from total Insight points.
 *
 * @param {number} insight - Total Insight points
 * @returns {number} Insight Rank (1-10+)
 *
 * @description
 * L5R4 Insight Rank thresholds:
 * - Rank 1: 0-149 Insight
 * - Rank 2: 150-174 Insight
 * - Rank 3: 175-199 Insight
 * - Rank 4: 200-224 Insight
 * - Rank 5: 225-249 Insight
 * - Rank 6+: Every 25 Insight above 225
 *
 * Insight Rank determines:
 * - School Rank (techniques available)
 * - Character power level
 * - Mastery abilities
 *
 * @example
 * calculateInsightRank(180); // Returns 3
 * calculateInsightRank(250); // Returns 6
 */
export function calculateInsightRank(insight) {
  // Thresholds for Ranks 2-5
  const t = [150, 175, 200, 225];
  let rank = 1;

  // Check standard thresholds
  for (let i = 0; i < t.length; i++) {
    if (insight >= t[i]) {
      rank = i + 2;
    }
  }

  // Rank 6+: Every 25 Insight above 225
  if (insight >= 225) {
    rank += Math.floor((insight - 225) / 25);
  }

  return rank;
}

/**
 * Prepares PC experience point tracking and calculations.
 *
 * @param {Actor} actor - The PC actor
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Calculates complete XP accounting:
 *
 * XP Earned:
 * - Base XP (default 40 for new characters)
 * - Disadvantages (capped, typically 10 XP max)
 * - Manual adjustments (GM awards, session XP)
 *
 * XP Spent:
 * - Traits: 4×rank per step (with discounts/free bonuses)
 * - Void: 6×rank per step
 * - Skills: Triangular number formula
 * - Emphases: 2 XP each
 * - Advantages/Kata/Kiho: Fixed costs
 * - Spells: Mastery Level (when memorized)
 *
 * Stores results in sys._xp with total/spent/available breakdown.
 */
export function preparePcExperience(actor, sys) {
  const flags = actor.flags?.[SYS_ID] ?? {};

  // Base XP: Starting character points (default 40)
  const xpBase = Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40;

  // Manual XP: GM awards, session XP, etc.
  const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
  const manualSum = xpManual.reduce((a, e) => a + toInt(e?.delta), 0);

  // Calculate XP from disadvantages
  let disadvGranted = 0;
  for (const it of actor.items) {
    if (!isItemOfType(it, "disadvantage")) {
      continue;
    }
    disadvGranted += Math.max(0, toInt(it.system?.cost));
  }

  // Apply disadvantage cap (default 10 XP max)
  const configuredCap = Number.isFinite(+flags.disadvantageCap)
    ? Number(flags.disadvantageCap)
    : 10;
  const disadvCap = Math.min(configuredCap, disadvGranted);

  // Get trait discounts and free bonuses from flags
  const traitDiscounts = actor.flags?.[SYS_ID]?.traitDiscounts ?? {};
  const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

  // Calculate XP spent on traits
  let traitsXP = 0;
  for (const k of Object.keys(sys.traits ?? {})) {
    const baseCur = toInt(actor._source?.system?.traits?.[k] ?? sys.traits[k]);
    const freeBase = toInt(freeTraitBase?.[k] ?? 0);

    // Free bonus from character creation (e.g., clan/family bonuses)
    const freeEff = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k));
    const disc = toInt(traitDiscounts?.[k] ?? 0);

    // Baseline: Starting rank 2 + any free increases
    const baseline = 2 + freeBase;

    // Calculate XP cost for ranks above baseline
    if (baseCur > baseline) {
      traitsXP += calculateTraitXpCost(baseline, baseCur, freeEff, disc);
    }
  }

  // Calculate XP spent on Void Ring (special handling)
  // Void Ring can be stored in multiple formats due to data model evolution
  // Try _source first (original data), then prepared data, with multiple fallback paths
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
  const voidBaseline = 2 + voidFreeBase; // Starting Void rank 2
  const voidDisc = toInt(traitDiscounts?.void ?? 0);

  // Void costs 6×rank (more expensive than regular traits)
  const voidXP =
    voidBaseCur > voidBaseline ? calculateVoidXpCost(voidBaseline, voidBaseCur, voidDisc) : 0;

  // Calculate XP spent on skills and emphases
  let skillsXP = 0;
  for (const it of actor.items) {
    if (!isItemOfType(it, "skill")) {
      continue;
    }
    const r = toInt(it.system?.rank);
    const freeRanks = Math.max(0, toInt(it.system?.freeRanks ?? 0));

    // Skill cost: Triangular number formula
    // Rank 1=1 XP, Rank 2=3 XP, Rank 3=6 XP, Rank 4=10 XP, etc.
    // Formula: rank×(rank+1)/2
    if (r > freeRanks) {
      skillsXP += (r * (r + 1)) / 2 - (freeRanks * (freeRanks + 1)) / 2;
    }

    // Emphasis cost: 2 XP each (after free emphases)
    const trainedEmphases = Array.isArray(it.system?.trainedEmphases)
      ? it.system.trainedEmphases
      : [];
    if (trainedEmphases.length > 0) {
      const freeEmphasis = Math.max(0, toInt(it.system?.freeEmphasis ?? 0));
      const paidEmphases = Math.max(0, trainedEmphases.length - freeEmphasis);

      skillsXP += 2 * paidEmphases;
    }
  }

  // Calculate XP spent on advantages, kata, kiho, and spells
  let advantagesXP = 0;
  let kataXP = 0;
  let kihoXP = 0;
  let spellsXP = 0;
  for (const it of actor.items) {
    if (isItemOfType(it, "advantage")) {
      // Advantages have fixed XP costs
      advantagesXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "kata")) {
      // Kata (martial techniques) have fixed costs
      kataXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "kiho")) {
      // Kiho (mystical abilities) have fixed costs
      kihoXP += toInt(it.system?.cost);
    } else if (isItemOfType(it, "spell")) {
      // Spells cost their Mastery Level when memorized
      if (it.system?.memorized === true) {
        spellsXP += toInt(it.system?.mastery);
      }
    }
  }

  // Calculate totals
  const total = xpBase + disadvCap + manualSum;
  const spent = traitsXP + voidXP + skillsXP + advantagesXP + kataXP + kihoXP + spellsXP;
  const available = total - spent;

  // Store XP tracking data for UI display
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
 * Tracks XP expenditure and applies free bonuses during actor updates.
 *
 * @param {Actor} actor - The PC actor being updated
 * @param {Object} changed - Object containing changed properties
 *
 * @description
 * Monitors trait increases to apply free bonuses:
 * - When a trait reaches rank 3 for the first time
 * - If character has unused free bonus from creation
 * - Automatically applies free bonus to save XP
 *
 * Free Bonus System:
 * - Characters get free +1 to certain traits at creation
 * - If not used during creation, can apply when raising to rank 3
 * - Tracked in xpFreeTraitBase flag
 * - Retroactive version flag prevents double-application
 *
 * Only runs for PC actors during updates.
 */
export function trackXpExpenditure(actor, changed) {
  try {
    if (actor.type !== "pc") {
      return;
    }

    const oldSys = actor._source?.system ?? actor.system;
    const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    // Check for trait increases
    if (changed?.system?.traits) {
      for (const [k, v] of Object.entries(changed.system.traits)) {
        const newBase = toInt(v);
        const oldBase = toInt(oldSys?.traits?.[k]);
        if (!Number.isFinite(newBase) || newBase <= oldBase) {
          continue;
        }

        const freeBase = toInt(freeTraitBase?.[k] ?? 0);
        const freeEff = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k));

        // Apply free bonus when reaching rank 3 (if available)
        for (let r = oldBase + 1; r <= newBase; r++) {
          if (freeBase === 0 && freeEff > 0 && r === 3) {
            // Mark free bonus as used
            foundry.utils.setProperty(
              changed,
              `flags.${SYS_ID}.xpFreeTraitBase.${k}`,
              (freeTraitBase?.[k] ?? 0) + 1
            );
            break;
          }
        }
      }
    }

    // Reset retroactive version to recalculate XP
    if (changed?.system?.traits || changed?.system?.rings?.void) {
      foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpRetroactiveVersion`, 0);
    }
  } catch (err) {
    logError("Free bonus tracking failed", err);
  }
}
