/**
 * L5R4 Roll Notation Parser
 *
 * Parses Legend of the Five Rings 4th Edition dice notation strings into structured
 * roll configuration objects. Supports the Roll & Keep system with modifiers for
 * unskilled rolls, emphasis, exploding bonuses, and flat bonuses.
 *
 * Supported Notation Formats:
 * - Basic: "XkY" (roll X dice, keep Y highest)
 * - With bonus: "XkY+Z" (roll X dice, keep Y, add flat bonus Z)
 * - With explode bonus: "XkYxZ" (keep Y, then add Z dice that auto-explode)
 * - Unskilled: "uXkY" (prefix u - dice don't explode per Unskilled Roll rules)
 * - Emphasis: "eXkY" (prefix e - re-roll 1s per Skill Emphasis rules)
 * - Combined: "e7k3x2+5" (emphasis, 7 roll 3 keep, 2 explode bonus, +5 flat)
 *
 * Game Mechanics Integration:
 * - Enforces Ten Dice Rule via TenDiceRule when bonuses are non-negative
 * - Preserves unskilled/emphasis flags for formula-builder consumption
 * - Supports explode bonus notation for custom roll modifiers
 *
 * Usage:
 * This parser is invoked by the chat service when users type roll commands like
 * [[7k3+5]] in chat. The parsed result is passed to buildFormula for conversion
 * to Foundry Roll API syntax.
 *
 * Responsibilities:
 * - Parse dice notation strings into structured data
 * - Extract roll/keep values, bonuses, and modifiers
 * - Apply Ten Dice Rule for valid positive bonus scenarios
 * - Preserve game mechanic flags (unskilled, emphasis)
 *
 * Related Files:
 * - ten-dice-rule.js: Enforces max 10 dice rolled/kept per L5R4 rules
 * - formula-builder.js: Converts parsed data to Foundry Roll formulas
 * - chat.js: Invokes parser when detecting inline roll notation
 */

import { TenDiceRule } from "./ten-dice-rule.js";

/**
 * Parsed roll configuration containing all components of an L5R4 dice roll
 * @typedef {Object} RollConfig
 * @property {number|string} dice_count - Number of d10 dice to roll (1-10 after TenDiceRule)
 * @property {number|string} kept - Number of dice to keep (1-10 after TenDiceRule)
 * @property {number|string|undefined} explode_bonus - Additional dice that auto-explode (optional)
 * @property {number} bonus - Flat bonus to add to roll total (can be negative)
 * @property {boolean} unskilled - If true, dice don't explode (Unskilled Roll penalty)
 * @property {boolean} emphasis - If true, re-roll 1s (Skill Emphasis mechanic)
 */

/**
 * Parses L5R4 roll notation string into structured roll configuration
 *
 * Accepts various formats of Roll & Keep notation and extracts all components:
 * dice to roll, dice to keep, modifiers (unskilled/emphasis), exploding bonus
 * dice, and flat bonuses. Applies the Ten Dice Rule when appropriate.
 *
 * Valid Input Formats:
 * - "7k3" → Roll 7 dice, keep 3 highest
 * - "7k3+5" → Roll 7, keep 3, add +5 bonus
 * - "7k3x2" → Roll 7, keep 3, add 2 auto-exploding dice
 * - "7k3x2+5" → Combined explode bonus and flat bonus
 * - "u3k3" → Unskilled roll (no exploding per game rules)
 * - "e7k3+2" → Emphasis (re-roll 1s per Skill Emphasis)
 *
 * Ten Dice Rule Application:
 * For non-negative bonuses, automatically applies Ten Dice Rule which caps rolled
 * and kept dice at 10, converting excess into flat bonuses. For negative bonuses,
 * skips Ten Dice Rule to preserve the penalty effect.
 *
 * @param {string} roll - Dice notation string to parse (e.g., "7k3+5", "e7k3x2")
 * @returns {RollConfig} Parsed roll configuration object
 */
export function roll_parser(roll) {
  let unskilled = false;
  let emphasis = false;

  // Extract modifier prefix - only one allowed (unskilled OR emphasis, not both)
  if (roll.includes("u")) {
    roll = roll.replace("u", "");
    unskilled = true;
  } else if (roll.includes("e")) {
    roll = roll.replace("e", "");
    emphasis = true;
  }

  // Split on 'k' to separate rolled dice from kept dice and any modifiers
  // Format: "XkY..." where X=rolled, Y...=kept plus optional modifiers
  const parts = roll.split("k");
  const dice_count = parseIntIfPossible(parts[0]);
  const keptPortion = parts[1] || ""; // Everything after 'k': kept, explode bonus, flat bonus

  let kept, explode_bonus, bonus;

  // Parse keptPortion which can contain 'x' notation and '+/-' bonuses
  // Possible formats: "3", "3+5", "3-10", "3x2", "3x2+5", "3x2-5"
  const xParts = keptPortion.split("x");
  kept = parseIntIfPossible(xParts[0]);

  if (xParts.length > 1) {
    // Format: "3x2+5" → xParts = ["3", "2+5"]
    const explodePortion = xParts[1];
    const bonusParts = splitPreservingSign(explodePortion);
    explode_bonus = parseIntIfPossible(bonusParts[0]);
    bonus = sumBonusParts(bonusParts);
  } else {
    // Format: "3+5" or "3-10" → xParts = ["3+5"] or ["3-10"]
    const bonusParts = splitPreservingSign(xParts[0]);
    if (bonusParts.length > 1) {
      kept = parseIntIfPossible(bonusParts[0]);
    }
    bonus = sumBonusParts(bonusParts);
  }

  let result;
  // Negative bonuses skip Ten Dice Rule to preserve penalty effect
  // Positive bonuses apply Ten Dice Rule which may convert excess dice to bonuses
  if (bonus < 0) {
    result = { dice_count, kept, explode_bonus, bonus, unskilled, emphasis };
  } else {
    const tenDiceResult = TenDiceRule(dice_count, kept, bonus);
    result = {
      dice_count: tenDiceResult.diceRoll,
      kept: tenDiceResult.diceKeep,
      explode_bonus,
      bonus: tenDiceResult.bonus,
      unskilled,
      emphasis
    };
  }

  return result;
}

/**
 * Splits a string on + or - while preserving the sign with each part
 *
 * Handles both positive and negative modifiers in notation like "3+5-2+10".
 * Preserves the sign character with each subsequent part for correct parsing.
 *
 * Examples:
 * - "3+5" → ["3", "+5"]
 * - "3-10" → ["3", "-10"]
 * - "3+5-2" → ["3", "+5", "-2"]
 *
 * @param {string} str - String containing numbers with + or - separators
 * @returns {string[]} Array of parts with signs preserved
 */
function splitPreservingSign(str) {
  if (!str) {
    return [];
  }

  // Match: number, then capture +/- followed by number, repeating
  // Regex: (\d+) captures first number, ([+-]\d+) captures signed numbers
  const matches = str.match(/^(\d+)((?:[+-]\d+)*)$/);

  if (!matches) {
    return [str]; // Fallback if pattern doesn't match
  }

  const firstPart = matches[1]; // First number without sign
  const remainingParts = matches[2]; // Everything else: "+5-10+2"

  if (!remainingParts) {
    return [firstPart];
  }

  // Split remaining on lookahead before +/-, keeping the sign with each number
  // Regex: (?=[+-]) means "split before + or -" without consuming the character
  const signedParts = remainingParts.match(/[+-]\d+/g) || [];

  return [firstPart, ...signedParts];
}

/**
 * Sums all bonus parts from a split array, skipping the first element
 *
 * Used internally to calculate total flat bonuses when parsing notation like
 * "7k3+5+2" which splits into ["7k3", "5", "2"]. Sums indices 1 onward.
 * Handles non-numeric values gracefully by treating them as 0.
 * Now supports negative values from splitPreservingSign (e.g., "-10").
 *
 * @param {string[]} parts - Array of string parts from split operation
 * @returns {number} Sum of all parts after index 0, or 0 if only one part exists
 */
function sumBonusParts(parts) {
  if (parts.length <= 1) {
    return 0;
  }
  return parts
    .slice(1)
    .map(part => parseIntIfPossible(part))
    .reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * Safely parses a value to integer if it contains only digits
 *
 * Returns the original value unchanged if it's not a valid numeric string.
 * Handles both positive (+5) and negative (-10) signs. This prevents
 * accidentally converting non-numeric strings to NaN or unexpected values.
 *
 * @param {*} x - Value to parse (typically string or number)
 * @returns {number|*} Parsed integer if valid numeric string, otherwise original value
 */
function parseIntIfPossible(x) {
  const s = x?.toString();
  if (!s) {
    return x;
  }
  const hasSign = s.startsWith("+") || s.startsWith("-");
  const digits = hasSign ? s.slice(1) : s;
  if (digits && [...digits].every(ch => ch >= "0" && ch <= "9")) {
    return parseInt(s, 10);
  }
  return x;
}
