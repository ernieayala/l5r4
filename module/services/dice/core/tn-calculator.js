/**
 * Target Number Calculator
 *
 * Core utilities for calculating effective Target Numbers (TN) in L5R4 rolls.
 * Implements the Raises mechanic (+5 TN per Raise), wound penalty application,
 * and success/failure evaluation per game rules.
 *
 * Used by: skill-roll.js, trait-roll.js, ring-roll.js, simple-roll.js
 *
 * Game Mechanics:
 * - Base TN: Set by GM or automatic (e.g., Armor TN for attacks)
 * - Raises: +5 TN per Raise declared before rolling
 * - Wound Penalties: Added to TN when character is injured (typically for attacks)
 * - Success: Roll total >= effective TN
 *
 * API: Roll
 * Requires: Foundry v13+
 *
 * @module services/dice/core/tn-calculator
 */

import { T } from "../../../utils/localization.js";

/**
 * Calculates the effective Target Number for a roll including Raises and wound penalties.
 *
 * Implements L5R4 core rule: each Raise adds +5 to the TN. Wound penalties are conditionally
 * applied based on roll type (typically only for attack rolls and some physical actions).
 *
 * @param {number} baseTN - The base Target Number set by GM or game mechanics
 * @param {number} raises - Number of Raises declared (each adds +5 to TN)
 * @param {number} woundPenalty - Current wound penalty value from character's wound rank
 * @param {boolean} applyWoundPenalty - Whether to apply wound penalty to this roll
 * @returns {number} The final effective TN (baseTN + raises*5 + conditionalWoundPenalty)
 */
export function calculateEffectiveTN(baseTN, raises, woundPenalty, applyWoundPenalty) {
  const _baseTN = Number(baseTN) || 0;
  const _raises = Number(raises) || 0;
  const _woundPenalty = Number(woundPenalty) || 0;

  let effectiveTN = _baseTN + _raises * 5;
  if (applyWoundPenalty && _woundPenalty > 0) {
    effectiveTN += _woundPenalty;
  }
  return effectiveTN;
}

/**
 * Evaluates a roll result against the effective TN and determines success/failure.
 *
 * Returns structured result for display in chat messages. Success requires the roll
 * total to meet or exceed the effective TN (including all Raises declared).
 *
 * @param {number} rollTotal - The total value of the completed roll
 * @param {number} effectiveTN - The effective TN (from calculateEffectiveTN)
 * @param {number} raises - Number of Raises declared (for display purposes)
 * @returns {Object|null} Result object with {effective, raises, outcome} or null if TN invalid
 * @returns {number} returns.effective - The effective TN used
 * @returns {number} returns.raises - Number of Raises declared
 * @returns {string} returns.outcome - Localized "Success" or "Failure" string
 */
export function evaluateTN(rollTotal, effectiveTN, raises) {
  const _effectiveTN = Number(effectiveTN);
  const _rollTotal = Number(rollTotal) || 0;

  if (!_effectiveTN || _effectiveTN <= 0) {
    return null;
  }

  const outcome =
    _rollTotal >= _effectiveTN
      ? T("l5r4.ui.mechanics.rolls.success")
      : T("l5r4.ui.mechanics.rolls.failure");

  return {
    effective: _effectiveTN,
    raises: raises || 0,
    outcome
  };
}

/**
 * Constructs a formatted TN label string for display in chat messages.
 *
 * Format: " [TN {effective}]" or " [TN {effective} ({raisesLabel}: {raises})]"
 * Returns empty string if TN is 0 or negative (no TN applies to roll).
 *
 * @param {number} effectiveTN - The effective TN to display
 * @param {number} raises - Number of Raises declared
 * @param {string} raisesLabel - Localized label for "Raises" text
 * @returns {string} Formatted TN label with optional Raises, or empty string if no TN
 */
export function buildTNLabel(effectiveTN, raises, raisesLabel) {
  if (effectiveTN <= 0) {
    return "";
  }

  const raisePart = raises ? ` (${raisesLabel}: ${raises})` : "";
  return ` [TN ${effectiveTN}${raisePart}]`;
}

/**
 * Replaces "Failure" outcome with "Missed" for attack rolls.
 *
 * L5R4 thematic convention: attack rolls that fail to hit display "Missed" rather
 * than "Failure" for more natural combat narration. Non-attack rolls use standard
 * "Success"/"Failure" terminology.
 *
 * @param {Object|null} tnResult - Result object from evaluateTN()
 * @param {string} rollType - Type of roll (e.g., "attack", "skill", "trait")
 * @returns {Object|null} Modified result with "Missed" outcome for failed attacks, or original result
 */
export function replaceFailureWithMissed(tnResult, rollType) {
  if (!tnResult) {
    return null;
  }
  if (rollType !== "attack") {
    return tnResult;
  }

  const failureLabel = T("l5r4.ui.mechanics.rolls.failure");
  if (tnResult.outcome === failureLabel) {
    return {
      ...tnResult,
      outcome: T("l5r4.ui.mechanics.rolls.missed")
    };
  }

  return tnResult;
}
