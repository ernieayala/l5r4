/**
 * L5R4 Dice Formula Builder
 *
 * Constructs Roll formula strings for Foundry VTT's Roll API that implement
 * Legend of the Five Rings 4th Edition Roll & Keep mechanics.
 *
 * Game Mechanics Reference:
 * - Roll & Keep System: Roll X dice, keep Y highest (e.g., 7k3)
 * - Exploding Dice: Dice showing 10 explode (re-roll and add result)
 * - Emphasis: Re-roll any dice showing 1 (once per die)
 * - Unskilled Rolls: Dice never explode (significant penalty)
 *
 * This function expects input pre-processed by TenDiceRule to enforce the
 * Ten Dice Rule (max 10 rolled dice, max 10 kept dice, excess converts to bonus).
 *
 * Foundry VTT Integration:
 * - Requires: Foundry VTT v13+ Roll API
 * - Formula Syntax: `XdYrZkAx10+B` where:
 *   - X = number of dice to roll
 *   - Y = die size (always 10 for L5R4)
 *   - rZ = re-roll modifier (r1 for Emphasis)
 *   - kA = keep highest A dice
 *   - x10 = explode on 10s
 *   - +B = flat bonus
 *
 * Usage Patterns:
 * - Standard skill roll (Kenjutsu 4 + Agility 3): buildFormula(7, 3, 0, {}) returns "7d10k3x10+0"
 * - Skill roll with Emphasis: buildFormula(7, 3, 0, { emphasis: true }) returns "7d10r1k3x10+0"
 * - Unskilled roll (no exploding): buildFormula(3, 3, 0, { unskilled: true }) returns "3d10k3+0"
 * - Roll with bonuses from Ten Dice Rule: buildFormula(10, 10, 6, {}) returns "10d10k10x10+6"
 *
 * @param {number} diceRoll - Number of d10 dice to roll (1-10 after TenDiceRule)
 * @param {number} diceKeep - Number of dice to keep (1-10 after TenDiceRule)
 * @param {number} bonus - Flat bonus to add to roll total
 * @param {Object} options - Roll modifiers
 * @param {boolean} [options.emphasis=false] - If true, re-roll 1s (Skill Emphasis mechanic)
 * @param {boolean} [options.unskilled=false] - If true, dice don't explode (Unskilled Roll penalty)
 * @returns {string} Foundry Roll formula string (e.g., "7d10r1k3x10+5")
 */
export function buildFormula(
  diceRoll,
  diceKeep,
  bonus,
  { emphasis = false, unskilled = false } = {}
) {
  // Build formula string in correct order for Foundry Roll parser
  const baseFormula = `${diceRoll}d10`;
  const emphasisMod = emphasis ? "r1" : ""; // Re-roll 1s when Emphasis applies
  const keepMod = `k${diceKeep}`;
  const explodeMod = unskilled ? "" : "x10"; // No exploding for Unskilled Rolls

  // Handle bonus: include sign for positive/zero, negative already has sign
  const bonusMod = bonus >= 0 ? `+${bonus}` : `${bonus}`;

  return `${baseFormula}${emphasisMod}${keepMod}${explodeMod}${bonusMod}`;
}
