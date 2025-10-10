/**
 * @fileoverview L5R4 Target Number Calculator - Success/Failure Evaluation
 * 
 * Pure utility functions for calculating effective target numbers and
 * evaluating roll success/failure. Handles raises, wound penalties, and
 * outcome determination with localized result strings.
 * 
 * **Defensive Coding:** All numeric inputs use type coercion to prevent
 * string concatenation bugs from dialog inputs or malformed data. Invalid
 * values (NaN, undefined, null) default to 0 or appropriate fallbacks.
 * 
 * **Wound Penalty Implementation Note:**
 * Per L5R4 rules (Combat_and_Wounds.md), wound penalties should "increase the
 * TN of ALL rolls made." However, this calculator is agnostic - it applies
 * wound penalties only if the caller passes applyWoundPenalty=true. Different
 * roll types may have different policies:
 * - Skill/Trait rolls: Apply to all rolls with TN > 0
 * - NPC rolls: Apply only to attack rolls
 * - Spell rolls: May not apply wound penalties
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { T } from "../../../utils/localization.js";

/**
 * @typedef {Object} TNResult
 * @property {number} effective - The effective target number after all modifiers
 * @property {number} raises - Number of raises declared for this roll
 * @property {string} outcome - Localized outcome string ("Success", "Failure", or "Missed")
 */

/**
 * Calculate effective target number with raises and wound penalties.
 * 
 * **Formula:** effectiveTN = baseTN + (raises × 5) + woundPenalty
 * 
 * **Type Safety:** All numeric inputs are coerced to numbers. Invalid values
 * (NaN, undefined, null) default to 0. This prevents string concatenation bugs
 * from dialog inputs or malformed actor data.
 * 
 * @param {number} baseTN - Base target number
 * @param {number} raises - Number of raises declared
 * @param {number} woundPenalty - Wound penalty to add
 * @param {boolean} applyWoundPenalty - Whether to apply wound penalty
 * @returns {number} Effective target number
 * @see evaluateTN - Use this TN to evaluate roll success/failure
 * 
 * @example
 * calculateEffectiveTN(15, 2, 10, true); // 15 + 10 + 10 = 35
 * calculateEffectiveTN(15, 0, 10, false); // 15 (wound penalty not applied)
 * calculateEffectiveTN("15", "2", "10", true); // 35 (strings coerced)
 */
export function calculateEffectiveTN(baseTN, raises, woundPenalty, applyWoundPenalty) {
  // Defensive type coercion: Prevent string concatenation bugs
  // Number("5") = 5, Number(undefined) = NaN, Number(NaN) || 0 = 0
  const _baseTN = Number(baseTN) || 0;
  const _raises = Number(raises) || 0;
  const _woundPenalty = Number(woundPenalty) || 0;
  
  let effectiveTN = _baseTN + (_raises * 5);
  if (applyWoundPenalty && _woundPenalty > 0) {
    effectiveTN += _woundPenalty;
  }
  return effectiveTN;
}

/**
 * Evaluate roll result against target number and return outcome object.
 * 
 * **Note:** Returns null if effectiveTN is zero, negative, or NaN (invalid TN).
 * 
 * **Type Safety:** Numeric inputs are coerced to numbers. Invalid effectiveTN
 * returns null. Invalid rollTotal is treated as 0 (failure).
 * 
 * @param {number} rollTotal - Total roll result
 * @param {number} effectiveTN - Effective target number
 * @param {number} raises - Number of raises declared
 * @returns {TNResult|null} TN result object or null if no TN
 * @see calculateEffectiveTN - Calculate effectiveTN from base TN and modifiers
 * @see replaceFailureWithMissed - Post-process result for attack rolls
 * 
 * @example
 * evaluateTN(25, 20, 1); // { effective: 20, raises: 1, outcome: "Success" }
 * evaluateTN(15, 20, 0); // { effective: 20, raises: 0, outcome: "Failure" }
 * evaluateTN(25, NaN, 1); // null (invalid TN)
 */
export function evaluateTN(rollTotal, effectiveTN, raises) {
  // Defensive type coercion
  const _effectiveTN = Number(effectiveTN);
  const _rollTotal = Number(rollTotal) || 0;
  
  // Return null for invalid or zero TN (including NaN)
  if (!_effectiveTN || _effectiveTN <= 0) return null;

  const outcome = (_rollTotal >= _effectiveTN)
    ? T("l5r4.ui.mechanics.rolls.success")
    : T("l5r4.ui.mechanics.rolls.failure");

  return {
    effective: _effectiveTN,
    raises: raises || 0,  // Ensure raises is always a number
    outcome
  };
}

/**
 * Build TN label suffix for roll flavor text.
 * 
 * Returns empty string if effectiveTN is zero or negative.
 * 
 * @param {number} effectiveTN - Effective target number
 * @param {number} raises - Number of raises
 * @param {string} raisesLabel - Localized "Raises" label
 * @returns {string} Formatted TN label suffix
 * @see evaluateTN - Provides the effective TN and raises values
 * 
 * @example
 * buildTNLabel(25, 2, "Raises"); // " [TN 25 (Raises: 2)]"
 * buildTNLabel(15, 0, "Raises"); // " [TN 15]"
 */
export function buildTNLabel(effectiveTN, raises, raisesLabel) {
  if (effectiveTN <= 0) return "";
  
  const raisePart = raises ? ` (${raisesLabel}: ${raises})` : "";
  return ` [TN ${effectiveTN}${raisePart}]`;
}

/**
 * Replace failure outcome with "Missed" for attack rolls.
 * Used to provide more contextual feedback for combat.
 * 
 * @param {TNResult|null} tnResult - TN result object from evaluateTN
 * @param {string} rollType - Type of roll ("attack" for combat)
 * @returns {TNResult|null} Modified TN result or original
 * 
 * @example
 * const result = { effective: 20, raises: 0, outcome: "Failure" };
 * replaceFailureWithMissed(result, "attack"); // outcome becomes "Missed"
 */
export function replaceFailureWithMissed(tnResult, rollType) {
  if (!tnResult) return null;
  if (rollType !== "attack") return tnResult;
  
  const failureLabel = T("l5r4.ui.mechanics.rolls.failure");
  if (tnResult.outcome === failureLabel) {
    return {
      ...tnResult,
      outcome: T("l5r4.ui.mechanics.rolls.missed")
    };
  }
  
  return tnResult;
}
