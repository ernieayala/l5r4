/**
 * @fileoverview L5R4 Formula Builder - Roll Formula Construction
 * 
 * Utility functions for constructing Foundry-compatible roll formulas
 * from L5R4 dice pool components. Handles emphasis (reroll 1s), exploding
 * dice, and flat bonuses in standard Foundry Roll notation.
 * 
 * Produces formula strings compatible with Foundry's Roll class.
 * 
 * @see {@link https://foundryvtt.com/api/Roll.html|Foundry Roll API}
 * @author L5R4 System Team
 * @since 1.1.0
 */

/**
 * @typedef {object} FormulaOptions
 * @property {boolean} [emphasis=false] - Add reroll 1s modifier (r1)
 * @property {boolean} [unskilled=false] - Remove exploding dice (no x10)
 */

/**
 * Build a Foundry Roll formula from L5R4 dice pool components.
 * 
 * **Formula Format:**
 * - Standard: `{roll}d10k{keep}x10+{bonus}`
 * - Emphasis: `{roll}d10r1k{keep}x10+{bonus}` (reroll 1s)
 * - Unskilled: `{roll}d10k{keep}+{bonus}` (no exploding)
 * 
 * **Note:** No validation is performed on input values. Caller should ensure
 * diceRoll >= diceKeep >= 1 for valid L5R4 rolls.
 * 
 * @param {number} diceRoll - Number of dice to roll (no validation applied)
 * @param {number} diceKeep - Number of dice to keep (no validation applied)
 * @param {number} bonus - Flat bonus to add (can be negative)
 * @param {FormulaOptions} [options={}] - Formula options
 * @returns {string} Foundry Roll formula string
 * 
 * @example
 * buildFormula(6, 3, 5); // "6d10k3x10+5"
 * buildFormula(6, 3, 5, { emphasis: true }); // "6d10r1k3x10+5"
 * buildFormula(6, 3, 5, { unskilled: true }); // "6d10k3+5"
 * buildFormula(4, 2, -2); // "4d10k2x10+-2"
 */
export function buildFormula(diceRoll, diceKeep, bonus, { emphasis = false, unskilled = false } = {}) {
  const baseFormula = `${diceRoll}d10`;
  const emphasisMod = emphasis ? "r1" : "";
  const keepMod = `k${diceKeep}`;
  const explodeMod = unskilled ? "" : "x10";
  const bonusMod = `+${bonus}`;

  return `${baseFormula}${emphasisMod}${keepMod}${explodeMod}${bonusMod}`;
}

/**
 * Build label suffix showing modifiers applied to roll.
 * 
 * Returns formatted string for display in roll labels. Returns empty string
 * if all modifiers are 0 (no modifications to show).
 * 
 * @param {number} rollMod - Bonus dice to roll
 * @param {number} keepMod - Bonus dice to keep
 * @param {number} totalMod - Flat bonus to total (can be negative)
 * @param {string} modLabel - Localized "Mod" label
 * @returns {string} Formatted modifier suffix or empty string
 * 
 * @example
 * buildModifierLabel(2, 1, 5, "Mod"); // " Mod (2k1+5)"
 * buildModifierLabel(0, 0, -3, "Mod"); // " Mod (0k0-3)"
 * buildModifierLabel(0, 0, 0, "Mod"); // ""
 */
export function buildModifierLabel(rollMod, keepMod, totalMod, modLabel) {
  if (rollMod || keepMod || totalMod) {
    // Negative values already include sign, positive need explicit +
    const sign = totalMod < 0 ? totalMod : `+${totalMod}`;
    return ` ${modLabel} (${rollMod}k${keepMod}${sign})`;
  }
  return "";
}
