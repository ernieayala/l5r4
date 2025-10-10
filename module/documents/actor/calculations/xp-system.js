/**
 * @fileoverview L5R4 XP System - Experience Point Tracking and Calculation
 * 
 * Centralized XP calculation and tracking for PC actors. Handles all XP-related
 * computations including trait advancement costs, skill XP, automatic expenditure
 * tracking, and total/spent/available XP breakdowns.
 * 
 * **Core Responsibilities:**
 * - **XP Calculation**: Compute total, spent, and available XP for PCs
 * - **Expenditure Tracking**: Automatic logging of XP spent on advancements
 * - **Advancement Costs**: Calculate XP costs for traits, void, skills, items
 * - **Insight Rank**: Convert insight points to rank using L5R4 progression
 * - **Creation Bonuses**: Handle Family/School bonuses in XP calculations
 * 
 * **XP Categories:**
 * - **Base XP**: Starting XP pool (default 40)
 * - **Manual XP**: GM-granted adjustments
 * - **Disadvantages**: Grant XP (capped at +10 total)
 * - **Traits**: 4 × effective rank per step
 * - **Void**: 6 × rank per step
 * - **Skills**: Triangular progression (1+2+3+...+rank)
 * - **Advantages/Kata/Kiho**: Direct cost from items
 * 
 * **Automatic Tracking:**
 * Called from Actor._preUpdate() to automatically log XP expenditures when
 * traits or void change, with deduplication to prevent duplicate entries.
 * 
 * **Usage:**
 * ```javascript
 * import { preparePcExperience, trackXpExpenditure } from "./xp-system.js";
 * 
 * // During prepareDerivedData
 * preparePcExperience(actor, sys);
 * console.log(sys._xp.available); // 15 XP remaining
 * 
 * // During _preUpdate
 * trackXpExpenditure(actor, changed, options);
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prepareData|Actor.prepareData}
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  calculateXpStepCostForTrait as _calculateXpStepCostForTrait,
  getCreationFreeBonus,
  getCreationFreeBonusVoid
} from "../../../utils/xp-calculations.js";

/**
 * Calculate experience cost for advancing a trait to a specific rank.
 * Uses L5R4 trait advancement formula: 4 × effective new rank, with bonuses and discounts.
 * 
 * **Cost Calculation:**
 * - Base cost: 4 × (new base rank + creation bonuses)
 * - Modified by: per-step discounts (can be negative)
 * - Minimum: 0 XP (free if discounts exceed base cost)
 * 
 * **Example:** 
 * Family +1 bonus via AE, buying base rank 3:
 * Cost = 4 × (3 + 1) = 16 XP
 * 
 * @param {number} r - New base rank being purchased (typically 3+)
 * @param {number} freeEff - Creation bonuses from Family/School (0 if already baked into base)
 * @param {number} discount - Per-step cost modifier (negative reduces cost)
 * @returns {number} XP cost for this advancement step (minimum 0)
 * 
 * @example
 * calculateXpStepCostForTrait(3, 1, 0); // 16 XP (3 + 1 bonus) × 4
 * calculateXpStepCostForTrait(4, 0, -2); // 14 XP (4 × 4 - 2 discount)
 * 
 * @deprecated Import from utils/xp-calculations.js instead
 */
export const calculateXpStepCostForTrait = _calculateXpStepCostForTrait;

/**
 * Convert insight points to insight rank using L5R4 progression table.
 * Uses the standard thresholds with accelerating progression after rank 4.
 * 
 * **Rank Thresholds:**
 * - Rank 1: 0-149 points
 * - Rank 2: 150-174 points  
 * - Rank 3: 175-199 points
 * - Rank 4: 200-224 points
 * - Rank 5+: Every 25 points above 225
 * 
 * @param {number} insight - Total insight points
 * @returns {number} Corresponding insight rank (minimum 1)
 * 
 * @example
 * calculateInsightRank(125); // 1
 * calculateInsightRank(180); // 3
 * calculateInsightRank(250); // 6 (225 = rank 5, +25 = rank 6)
 */
export function calculateInsightRank(insight) {
  const t = [150, 175, 200, 225];
  let rank = 1;
  for (let i = 0; i < t.length; i++) {
    if (insight >= t[i]) {
      rank = i + 2;
    }
  }
  if (insight >= 225) {
    rank += Math.floor((insight - 225) / 25);
  }
  return rank;
}

/**
 * Compute comprehensive XP totals and breakdown for PC actors.
 * Calculates total XP available, XP spent on various advancements, and
 * provides detailed breakdown by category for sheet display.
 * 
 * **XP Sources (Total):**
 * - Base XP: Starting pool (default 40, configurable per actor)
 * - Manual adjustments: GM-granted XP from special circumstances
 * - Disadvantages: Grant XP (capped at +10 total across all disadvantages)
 * 
 * **XP Expenditure Categories:**
 * - **Traits**: 4 × new effective rank per step, with Family/School bonuses
 * - **Void**: 6 × new rank per step
 * - **Skills**: Triangular progression (1+2+3+...+rank), free ranks reduce cost regardless of School status
 * - **Emphases**: 2 XP each (comma/semicolon separated), free emphasis reduces cost independently
 * - **Advantages**: Direct cost from item
 * - **Kata**: Direct cost from item
 * - **Kiho**: Direct cost from item
 * 
 * **Family/School Bonuses:**
 * Active Effect bonuses from Family/School items are treated as "free" advancements
 * and don't cost XP. The system tracks which bonuses have been "baked into" base
 * values to ensure correct XP calculation for future advancements.
 * 
 * **Results Storage:**
 * Results stored in `sys._xp` for sheet display (not persisted to database).
 * Sheet can access `sys._xp.total`, `sys._xp.spent`, `sys._xp.available`, and
 * `sys._xp.breakdown` for detailed category breakdown.
 * 
 * @param {Actor} actor - The PC actor to calculate XP for
 * @param {object} sys - The actor's system data object
 * @param {object} [sys.traits] - Character traits
 * @param {object} [sys.rings] - Character rings including void
 * @param {object} [sys._xp] - XP data storage (will be created/updated)
 * @returns {void} - Modifies sys._xp in place
 * 
 * @example
 * preparePcExperience(actor, sys);
 * console.log(sys._xp.total); // 50 XP total
 * console.log(sys._xp.spent); // 35 XP spent
 * console.log(sys._xp.available); // 15 XP remaining
 * console.log(sys._xp.breakdown.traits); // 20 XP on traits
 */
export function preparePcExperience(actor, sys) {
  const flags = actor.flags?.[SYS_ID] ?? {};

  // Base total XP
  const xpBase = Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40;

  // Manual adjustments
  const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
  const manualSum = xpManual.reduce((a, e) => a + toInt(e?.delta), 0);

  // Disadvantage granted XP, capped at +10
  let disadvGranted = 0;
  for (const it of actor.items) {
    // Defensive check: ensure this is an actual Item document, not an Active Effect
    if (!it || typeof it.type !== "string" || it.type !== "disadvantage") {
      continue;
    }
    // Disadvantage costs are displayed as positive but contribute negative XP
    // Convert positive cost to negative XP contribution (up to 10 total)
    disadvGranted += Math.max(0, toInt(it.system?.cost));
  }
  const disadvCap = Math.min(10, disadvGranted);

  // Traits (not Void): cost per purchased step = 4 × new effective rank (see sheet logger for same logic)
  // Eight L5R4 traits excluding Void (which has separate XP progression: 6× vs 4×)
  const TRAITS = /** @type {const} */ (["sta","wil","str","per","ref","awa","agi","int"]);
  const traitDiscounts = actor.flags?.[SYS_ID]?.traitDiscounts ?? {};
  const freeTraitBase  = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

  let traitsXP = 0;
  for (const k of Object.keys(sys.traits ?? {})) {
    // Foundry sys.traits.* is post-AE (includes Family); remove freebies when summing.
    const effCur   = toInt(sys?.traits?.[k]);                           // effective (post-AE)
    const freeBase = toInt(freeTraitBase?.[k] ?? 0);                    // baked into base at creation
    const freeEff  = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k)); // AE freebies (Family/School) only
    const disc     = toInt(traitDiscounts?.[k] ?? 0);

    /** Work in *base* space so Family +1 is free by RAW. */
    const baseline = 2 + freeBase;
    const baseCur  = Math.max(baseline, effCur - freeEff);
    for (let r = baseline + 1; r <= baseCur; r++) {
      traitsXP += calculateXpStepCostForTrait(r, freeEff, disc);
    }
  }

  // Void: cost per purchased step = 6 × new rank, after baseline
  // Like traits, subtract Active Effect bonuses to get base purchased value
  const voidEffCur = toInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
  const voidFreeBase = toInt(freeTraitBase?.void ?? 0);
  const voidFreeEff = voidFreeBase > 0 ? 0 : toInt(getCreationFreeBonusVoid(actor));
  const voidBaseline = 2 + voidFreeBase;
  const voidBaseCur = Math.max(voidBaseline, voidEffCur - voidFreeEff);
  let voidXP = 0;
  if (voidBaseCur > voidBaseline) {
    for (let r = voidBaseline + 1; r <= voidBaseCur; r++) {
      const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
      voidXP += Math.max(0, step);
    }
  }

  // Skills: sum of next-rank costs above baseline; free ranks reduce XP cost regardless of School status
  let skillsXP = 0;
  for (const it of actor.items) {
    // Defensive check: ensure this is an actual Item document, not an Active Effect
    if (!it || typeof it.type !== "string" || it.type !== "skill") {
      continue;
    }
    const r = toInt(it.system?.rank);
    const freeRanks = Math.max(0, toInt(it.system?.freeRanks ?? 0));
    if (r > freeRanks) {
      skillsXP += (r * (r + 1)) / 2 - (freeRanks * (freeRanks + 1)) / 2;
    }
    // Emphases: 2 XP each, split on comma/semicolon, minus free emphasis
    const emph = String(it.system?.emphasis ?? "").trim();
    if (emph) {
      const emphases = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      const freeEmphasis = Math.max(0, toInt(it.system?.freeEmphasis ?? 0));
      const paidEmphases = Math.max(0, emphases.length - freeEmphasis);
      skillsXP += 2 * paidEmphases;
    }
  }

  // Advantages, Kata, and Kiho: calculate separately for proper categorization
  let advantagesXP = 0;
  let kataXP = 0;
  let kihoXP = 0;
  for (const it of actor.items) {
    // Defensive check: ensure this is an actual Item document with a valid type
    if (!it || typeof it.type !== "string") {
      continue;
    }
    if (it.type === "advantage") {
      advantagesXP += toInt(it.system?.cost);
    } else if (it.type === "kata") {
      kataXP += toInt(it.system?.cost);
    } else if (it.type === "kiho") {
      kihoXP += toInt(it.system?.cost);
    }
  }

  const total = xpBase + disadvCap + manualSum;
  const spent = traitsXP + voidXP + skillsXP + advantagesXP + kataXP + kihoXP;
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
      kiho: kihoXP
    }
  };
}

/**
 * Track XP expenditure when traits or void are updated.
 * Automatically logs XP costs to the actor's XP log when advancements occur.
 * Called from Actor._preUpdate() hook before changes are committed.
 * 
 * **Tracking Logic:**
 * - Detects trait/void increases in update data
 * - Calculates XP cost for each step of advancement
 * - Creates timestamped log entries with detailed info
 * - Prevents duplicate entries using type:note key
 * - Handles Family/School creation bonuses correctly
 * 
 * **Free Rank Handling:**
 * When a Family/School bonus exists as an Active Effect and the trait is being
 * advanced from 2→3, the system "bakes in" the bonus as a free base rank and
 * makes that step free. Future advancements then price correctly.
 * 
 * **Log Entry Format:**
 * ```javascript
 * {
 *   id: "abc123",
 *   delta: 16,  // XP cost
 *   note: "Stamina 2 → 3",
 *   ts: 1234567890,
 *   type: "trait",
 *   traitKey: "sta",
 *   traitLabel: "Stamina",
 *   fromValue: 2,
 *   toValue: 3
 * }
 * ```
 * 
 * @param {Actor} actor - The actor being updated
 * @param {object} changed - The update delta object
 * @param {object} [changed.system] - System data changes
 * @param {object} [changed.system.traits] - Trait changes
 * @param {object} [changed.system.rings] - Ring changes
 * @param {object} [options] - Update options from Foundry
 * @returns {void} - Modifies changed.flags[SYS_ID].xpSpent if entries added
 * 
 * @example
 * // Called automatically from _preUpdate
 * trackXpExpenditure(actor, { system: { traits: { sta: 3 } } }, options);
 * // Adds log entry: "Stamina 2 → 3 (16 XP)"
 */
export function trackXpExpenditure(actor, changed, options) {
  try {
    // Only track for PCs
    if (actor.type !== "pc") return;

    // Use _source to get base values before Active Effects
    // actor.system contains effective values after AEs are applied
    const oldSys = /** @type {any} */ (actor._source?.system ?? actor.system);
    const ns = actor.flags?.[SYS_ID] ?? {};
    const spent = Array.isArray(ns.xpSpent) ? [...ns.xpSpent] : [];
    
    // Build set of existing entries to prevent duplicates
    const existingEntries = new Set();
    for (const entry of spent) {
      const t = String(entry?.type || "");
      const n = String(entry?.note || "");
      existingEntries.add(`${t}:${n}`);
    }

    const traitDiscounts = actor.flags?.[SYS_ID]?.traitDiscounts ?? {};
    const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    /**
     * Add timestamped XP log entry with deduplication.
     * Prevents duplicate entries by checking type:note key against existing entries.
     * 
     * @param {number} delta - XP cost to log
     * @param {string} note - Human-readable description (e.g., "Stamina 2 → 3")
     * @param {object} [extraData={}] - Additional metadata for log entry
     * @param {string} [extraData.type] - Entry type ("trait", "void", etc.)
     * @param {string} [extraData.traitKey] - Trait identifier if applicable
     * @param {number} [extraData.fromValue] - Starting value
     * @param {number} [extraData.toValue] - Ending value
     * @returns {void} - Modifies spent array in place, skips if duplicate exists
     */
    const pushNote = (delta, note, extraData = {}) => {
      /* istanbul ignore next - extraData.type always provided by all callers */
      const t = String(extraData?.type || "");
      const key = `${t}:${note}`;
      if (existingEntries.has(key)) return; // Skip duplicates
      spent.push({
        id: foundry.utils.randomID(),
        delta,
        note,
        ts: Date.now(),
        ...extraData
      });
      existingEntries.add(key);
    };

    // Traits delta → XP
    if (changed?.system?.traits) {
      for (const [k, v] of Object.entries(changed.system.traits)) {
        const newBase = toInt(v);
        const oldBase = toInt(oldSys?.traits?.[k]);
        if (!Number.isFinite(newBase) || newBase <= oldBase) continue;

        const freeBase = toInt(freeTraitBase?.[k] ?? 0);
        const freeEff  = freeBase > 0 ? 0 : toInt(getCreationFreeBonus(actor, k));
        const disc     = toInt(traitDiscounts?.[k] ?? 0);

        let deltaXP = 0;
        let stepFreeEff = freeEff;
        let consumedFreeBase = false;
        for (let r = oldBase + 1; r <= newBase; r++) {
          // If a Family/School creation bonus (+1) exists as an AE (stepFreeEff > 0)
          // and it is not yet baked into base (freeBase === 0), make the 2→3 step free
          // and convert it into a base freebie so future steps price correctly.
          if (!consumedFreeBase && freeBase === 0 && stepFreeEff > 0 && r === 3) {
            foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpFreeTraitBase.${k}`, (freeTraitBase?.[k] ?? 0) + 1);
            consumedFreeBase = true;
            stepFreeEff = 0;
            continue;
          }
          deltaXP += calculateXpStepCostForTrait(r, stepFreeEff, disc);
        }

        if (deltaXP > 0) {
          // Create localized log entry for experience tracking
          const label = game.i18n?.localize?.(`l5r4.ui.mechanics.traits.${k}`) || k.toUpperCase();
          pushNote(deltaXP, game.i18n.format("l5r4.character.experience.traitChange", { label, from: oldBase, to: newBase }), {
            type: "trait",
            traitKey: k,
            traitLabel: label,
            fromValue: oldBase,
            toValue: newBase
          });
        }
      }
    }

    // Void
    const newVoid = changed?.system?.rings?.void?.rank ?? changed?.system?.rings?.void?.value;
    if (newVoid !== undefined) {
      // Use _source to get base void value before Active Effects
      const oldSysVoid = actor._source?.system ?? actor.system;
      const oldVoid = toInt(oldSysVoid?.rings?.void?.rank ?? oldSysVoid?.rings?.void?.value ?? oldSysVoid?.rings?.void);
      const next = toInt(newVoid);
      if (Number.isFinite(next) && next > oldVoid) {
        const baselineVoid = 2 + toInt(freeTraitBase?.void ?? 0);
        let deltaXP = 0;
        for (let r = Math.max(oldVoid, baselineVoid) + 1; r <= next; r++) {
          const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
          deltaXP += Math.max(0, step);
        }
        if (deltaXP > 0) {
          pushNote(deltaXP, game.i18n.format("l5r4.character.experience.voidChange", { from: oldVoid, to: next }), {
            type: "void",
            fromValue: oldVoid,
            toValue: next
          });
        }
      }
    }

    if (spent.length !== (ns.xpSpent?.length ?? 0)) {
      foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpSpent`, spent);
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "XP tracking failed", { err });
  }
}
