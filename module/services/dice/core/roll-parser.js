/**
 * @fileoverview L5R4 Roll Parser - Roll Notation Parsing Utilities
 * 
 * Pure utility functions for parsing L5R4 roll notation strings into
 * normalized dice pool components. Supports compact roll notation with
 * special flags and applies Ten Dice Rule automatically.
 * 
 * **Supported Formats:**
 * - Basic: "6k3" (6 dice, keep 3)
 * - With exploding: "6k3x10" (explode on 10s)
 * - With bonus: "6k3x10+4" (flat +4 bonus)
 * - With flags: "6k3x10+4u" (unskilled), "6k3x10+4e" (emphasis)
 * 
 * **Special Flags:**
 * - "u": Unskilled roll (no exploding dice)
 * - "e": Emphasis (reroll 1s)
 * 
 * **L5R4 Dice Mechanics:**
 * - Rises: When dice pool exceeds 10, excess dice convert to rises
 * - Each 2 rises can convert back to 1 kept die (Ten Dice Rule)
 * - Unskilled: Rises are consumed without benefit
 * - Emphasis: More efficient rise-to-kept conversion
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @see {@link https://foundryvtt.com/api/} Foundry VTT API
 */

import { TenDiceRule } from "./ten-dice-rule.js";

/**
 * @typedef {Object} ParsedRoll
 * @property {number} dice_count - Total dice to roll
 * @property {number} kept - Number of dice to keep
 * @property {number} explode_bonus - Exploding dice threshold
 * @property {number} bonus - Flat bonus to add
 * @property {boolean} unskilled - Whether this is an unskilled roll
 * @property {boolean} emphasis - Whether emphasis applies (reroll 1s)
 */

/**
 * Parse L5R4 roll notation strings into normalized dice pool components.
 * Supports compact roll notation with special flags and applies Ten Dice Rule.
 * 
 * **Supported Formats:**
 * - Basic: "6k3" (6 dice, keep 3)
 * - With exploding: "6k3x10" (explode on 10s)
 * - With bonus: "6k3x10+4" (flat +4 bonus)
 * - With flags: "6k3x10+4u" (unskilled), "6k3x10+4e" (emphasis)
 * 
 * **Special Flags:**
 * - "u": Unskilled roll (no exploding dice)
 * - "e": Emphasis (reroll 1s)
 * 
 * @param {string} roll - Roll notation string to parse
 * @returns {ParsedRoll} Parsed roll components
 * 
 * @example
 * roll_parser("6k3x10+4"); // { dice_count: 6, kept: 3, explode_bonus: 10, bonus: 4, unskilled: false, emphasis: false }
 * 
 * @example
 * roll_parser("15k12x10+0"); // Applies TenDiceRule automatically
 * 
 * @throws {TypeError} If roll parameter is not a string
 * @note Negative bonuses bypass Ten Dice Rule application
 * @note Flags 'u' and 'e' are mutually exclusive; 'u' takes precedence
 */
export function roll_parser(roll) {
  let unskilled = false;
  let emphasis = false;

  // Extract flags first (u=unskilled, e=emphasis) - they're mutually exclusive
  if (roll.includes("u")) { roll = roll.replace("u", ""); unskilled = true; }
  else if (roll.includes("e")) { roll = roll.replace("e", ""); emphasis = true; }

  // Split on 'k' to get dice count and the keep/bonus portion
  const parts = roll.split('k');
  const dice_count = parseIntIfPossible(parts[0]);
  const keptPortion = parts[1] || '';

  // Parse the keep/explode/bonus portion: format is "K[xE][+B]" where K=kept, E=explode, B=bonus
  let kept, explode_bonus, bonus;
  
  // Split on 'x' to separate kept from explode+bonus
  const xParts = keptPortion.split('x');
  kept = parseIntIfPossible(xParts[0]);
  
  if (xParts.length > 1) {
    // Has explode modifier: parse "10+4" or "10" or "10+-4"
    const explodePortion = xParts[1];
    const plusParts = explodePortion.split('+');
    explode_bonus = parseIntIfPossible(plusParts[0]);
    
    if (plusParts.length > 1) {
      // Has bonus after explode - sum multiple bonus parts
      bonus = plusParts.slice(1)
        .map(part => parseIntIfPossible(part))
        .reduce((sum, val) => sum + (val || 0), 0);
    } else {
      bonus = 0;
    }
  } else {
    // No explode modifier, check for bonus only: "3+4" or "3"
    const plusParts = xParts[0].split('+');
    if (plusParts.length > 1) {
      kept = parseIntIfPossible(plusParts[0]);
      // Sum multiple bonus parts
      bonus = plusParts.slice(1)
        .map(part => parseIntIfPossible(part))
        .reduce((sum, val) => sum + (val || 0), 0);
    } else {
      bonus = 0;
    }
  }

  if (!bonus) bonus = 0;

  const u_modifiers = { kept, rises: 0, bonus };
  const e_modifiers = { kept, rises: 0, bonus };
  const { kept: new_kept, rises } = unskilled ? unskilledModifiers(u_modifiers) : emphasisModifiers(e_modifiers);

  let result;
  if (bonus < 0) {
    result = { dice_count, kept: new_kept, explode_bonus, bonus, unskilled };
  } else {
    const tenDiceResult = TenDiceRule(dice_count, new_kept, calculate_bonus({ rises, bonus }));
    result = {
      dice_count: tenDiceResult.diceRoll,
      kept: tenDiceResult.diceKeep,
      explode_bonus,
      bonus: tenDiceResult.bonus,
      unskilled
    };
  }

  result.explode_bonus = explode_bonus;
  result.emphasis = emphasis;
  return result;
}

/**
 * Parse string to integer if possible, preserving non-numeric values.
 * 
 * @param {*} x - Value to parse
 * @returns {number|*} Parsed integer or original value
 * @internal Exported for testing purposes only
 */
export function parseIntIfPossible(x) {
  const s = x?.toString();
  if (!s) return x;
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  if (digits && [...digits].every(ch => ch >= '0' && ch <= '9')) return parseInt(s, 10);
  return x;
}

/**
 * Apply unskilled modifiers to roll (consumes rises without benefit).
 * For unskilled rolls, rises are consumed but provide no bonus to kept dice.
 * 
 * @param {object} roll - Roll modifiers object
 * @param {number} roll.kept - Kept dice count (passed through unchanged)
 * @param {number} roll.rises - Rise count (consumed without benefit)
 * @returns {{kept: number, rises: number}} Modified roll with rises consumed
 * @internal Exported for testing purposes only
 * @note Currently rises is always 0 in roll_parser, but function supports future use
 */
export function unskilledModifiers(roll) {
  const { kept } = roll;
  let { rises } = roll;
  while (rises) {
    if (rises > 2) rises -= 3;
    else if (rises > 1) rises -= 2;
    else rises--;
  }
  return { kept, rises };
}

/**
 * Apply emphasis modifiers to roll (increases kept dice based on rises).
 * 
 * @param {object} roll - Roll modifiers object
 * @param {number} roll.kept - Kept dice count
 * @param {number} roll.rises - Rise count
 * @returns {{kept: number, rises: number}} Modified roll
 * @internal Exported for testing purposes only
 * @note Currently rises is always 0 in roll_parser, but function supports future use
 */
export function emphasisModifiers(roll) {
  let { kept } = roll; let { rises } = roll;
  while (rises) {
    if (rises > 2) { kept += 2; rises -= 3; }
    else if (rises > 1) { kept++; rises -= 2; }
    else break;
  }
  return { kept, rises };
}

/**
 * Calculate flat bonus from rises and base bonus.
 * Each rise adds +2 to the total bonus.
 * 
 * @param {object} params - Bonus calculation parameters
 * @param {number} params.rises - Rise count (each worth +2)
 * @param {number} params.bonus - Base bonus
 * @returns {number} Total bonus (base + rises * 2)
 * @internal Exported for testing purposes only
 */
export function calculate_bonus({ rises, bonus } = {}) {
  return bonus + rises * 2;
}
