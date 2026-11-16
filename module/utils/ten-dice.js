/**
 * @module utils/ten-dice
 * @description The Ten Dice Rule: no roll uses more than ten rolled or ten kept dice. Two extra rolled dice become
 * one kept die until kept dice reach ten; once rolled and kept dice both reach ten, every extra die of either kind
 * is +2 to the total. No roll keeps more dice than it rolls.
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/41_conditional_effects.md, p.89
 */

/**
 * @typedef {object} TenDiceResult
 * @property {number} roll      Dice to roll, 1-10
 * @property {number} keep      Dice to keep, 1-10
 * @property {number} bonus     Flat bonus: the input bonus plus every conversion
 */

/**
 * Applies the Ten Dice Rule to a pool.
 *
 * A pool is at least 1k1 and keeps no more dice than it rolls.
 *
 * The Little Truths exception is an optional house rule (the `LtException` world setting), not a book rule: +2
 * when the rule converted extra rolled dice and the kept dice still end below ten.
 *
 * The book's examples: 12k4 becomes 10k5; 13k9 becomes 10k10+2; 10k12 becomes 10k10+4; 14k12 becomes 10k10+12.
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/41_conditional_effects.md, p.89
 * @param {number} roll - Rolled dice before the rule
 * @param {number} keep - Kept dice before the rule
 * @param {object} [options]
 * @param {number} [options.bonus=0] - Flat bonus to add the conversions to
 * @param {boolean} [options.littleTruths=false] - Apply the Little Truths exception
 * @returns {TenDiceResult}
 */
export function applyTenDiceRule(roll, keep, { bonus = 0, littleTruths = false } = {}) {
  // Penalties can shrink a pool below 1k1, but a roll needs at least one die rolled and kept
  if (roll < 1) {
    roll = 1;
  }
  if (keep < 1) {
    keep = 1;
  }

  // No roll keeps more dice than it rolls; only ten rolled dice reach the extra kept dice below
  // game-rules/41_conditional_effects.md, p.89
  if (roll < 10 && keep > roll) {
    keep = roll;
  }

  let extras = Math.max(roll - 10, 0);
  roll = Math.min(roll, 10);
  const converts = extras > 0;

  // Two extra rolled dice become one kept die, until kept dice reach ten
  while (extras >= 2 && keep < 10) {
    keep += 1;
    extras -= 2;
  }

  // Rolled and kept dice both at ten: every extra die of either kind is +2 (the 13k9 and 14k12 examples)
  if (keep >= 10) {
    bonus += (keep - 10) * 2 + extras * 2;
    keep = 10;
  } else if (littleTruths && converts) {
    bonus += 2;
  }

  return { roll, keep, bonus };
}
