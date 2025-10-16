/**
 * L5R4 Ten Dice Rule Implementation
 *
 * Enforces the Ten Dice Rule from Legend of the Five Rings 4th Edition core rules.
 * This rule caps all rolls at maximum 10 rolled dice and 10 kept dice, converting
 * excess dice into flat bonuses using specific conversion ratios.
 *
 * Conversion Mechanics:
 * - Rolled dice exceeding 10 convert to kept dice at 2:1 ratio
 * - Kept dice exceeding 10 convert to +2 flat bonus per die
 * - When both at 10, additional rolled/kept each become +2 bonus
 *
 * Optional House Rule:
 * Supports "Little Truths exception" setting which grants +2 bonus when kept dice
 * fall below 10 due to conversion. This is not part of official L5R4 rules.
 *
 * Game Rules Reference:
 * Ten Dice Rule mechanic from core rulebook prevents unwieldy dice pools and
 * maintains balanced high-level play (Rings and Traits chapter).
 * - 12k4 becomes 10k5 (2 excess rolled → 1 kept)
 * - 13k9 becomes 10k10+2 (2 excess rolled → 1 kept, 1 leftover → +2)
 * - 10k12 becomes 10k10+4 (2 excess kept → +4)
 * - 14k12 becomes 10k10+12 (4 excess rolled → +8, 2 excess kept → +4)
 *
 * Foundry Integration:
 * Uses `game.settings.get()` to check optional "LtException" world setting.
 * Requires Foundry runtime context (game global) to function properly.
 *
 * Related Files:
 * - roll-parser.js: Invokes this rule during dice notation parsing
 * - formula-builder.js: Uses output to construct Foundry Roll formulas
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Return value structure from TenDiceRule function
 * @typedef {Object} TenDiceRuleResult
 * @property {number} diceRoll - Number of dice to roll (capped at 10)
 * @property {number} diceKeep - Number of dice to keep (capped at 10)
 * @property {number} bonus - Total flat bonus including conversions and input bonus
 */

/**
 * Applies the Ten Dice Rule to cap rolled and kept dice at 10, converting excess
 *
 * Implements the official L5R4 Ten Dice Rule which prevents any roll from using
 * more than 10 rolled dice (XkY where X≤10) or 10 kept dice (Y≤10). Excess dice
 * are converted using the following rules:
 *
 * Conversion Rules:
 * 1. If both rolled≥10 AND kept≥10: Convert all excess to +2 bonus per die
 * 2. If only rolled>10: Convert excess rolled to kept at 2:1 ratio
 * 3. If kept>10 after conversion: Convert excess kept to +2 bonus per die
 * 4. Odd leftover rolled dice when kept=10: Become +2 bonus each
 *
 * Little Truths Exception (Optional House Rule):
 * If enabled via world setting "LtException", grants +2 bonus when kept dice
 * remain below 10 after conversion. This is NOT part of official L5R4 rules.
 *
 * @param {number} diceRoll - Number of dice to roll (before Ten Dice Rule applied)
 * @param {number} diceKeep - Number of dice to keep (before Ten Dice Rule applied)
 * @param {number} [bonus=0] - Starting flat bonus to add to conversion bonuses
 * @returns {TenDiceRuleResult} Capped values with conversion bonuses applied
 */
export function TenDiceRule(diceRoll, diceKeep, bonus = 0) {
  // Enforce minimum 1k1 - you cannot make a roll with 0 dice
  // Penalties can reduce dice pools below 1k1, but L5R4 requires at least 1k1 to attempt any action
  if (diceRoll < 1) diceRoll = 1;
  if (diceKeep < 1) diceKeep = 1;

  // Enforce L5R4 rule: Cannot keep more dice than rolled
  if (diceKeep > diceRoll) diceKeep = diceRoll;

  // Fast path: Both dice already at or above cap - convert all excess directly to +2 bonuses
  if (diceRoll >= 10 && diceKeep >= 10) {
    const excessRolled = diceRoll - 10;
    const excessKept = diceKeep - 10;
    bonus += excessRolled * 2 + excessKept * 2;
    return { diceRoll: 10, diceKeep: 10, bonus };
  }

  // Cap rolled dice at 10, tracking excess for conversion to kept dice
  let extras = 0;
  if (diceRoll > 10) {
    extras = diceRoll - 10;
    diceRoll = 10;
  }

  // Convert excess rolled dice to kept dice at 2:1 ratio per Ten Dice Rule
  // Example: 12k3 → 10k4 (2 excess rolled become 1 kept, 0 leftover)
  // Example: 13k3 → 10k4 (3 excess rolled become 1 kept, 1 leftover)
  while (extras >= 2) {
    diceKeep += 1;
    extras -= 2;
  }

  // If kept dice now exceed 10, convert excess to +2 flat bonus per die
  if (diceKeep > 10) {
    const excessKept = diceKeep - 10;
    bonus += excessKept * 2;
    diceKeep = 10;
  }

  // Optional house rule: "Little Truths exception" grants +2 when kept < 10
  // This is NOT part of official L5R4 rules - controlled by world setting
  if (game.settings.get(SYS_ID, "LtException") && diceKeep < 10) {
    bonus += 2;
  }

  // Edge case: Odd leftover rolled dice when kept dice already at cap become +2 bonus
  // Example: 11k10 → 10k10+2 (1 leftover rolled die can't convert to kept, becomes bonus)
  if (diceKeep === 10 && extras > 0) {
    bonus += extras * 2;
  }

  return { diceRoll, diceKeep, bonus };
}
