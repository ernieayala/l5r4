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
 * @property {number} diceRoll  Dice to roll, 1-10
 * @property {number} diceKeep  Dice to keep, 1-10
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
 * @param {number} diceRoll - Rolled dice before the rule
 * @param {number} diceKeep - Kept dice before the rule
 * @param {number} [bonus=0] - Flat bonus to add the conversions to
 * @param {object} [options]
 * @param {boolean} [options.littleTruths=false] - Apply the Little Truths exception
 * @returns {TenDiceResult}
 */
export function applyTenDiceRule(diceRoll, diceKeep, bonus = 0, { littleTruths = false } = {}) {
  // Penalties can shrink a pool below 1k1, but a roll needs at least one die rolled and kept
  if (diceRoll < 1) {
    diceRoll = 1;
  }
  if (diceKeep < 1) {
    diceKeep = 1;
  }

  // No roll keeps more dice than it rolls; only ten rolled dice reach the extra kept dice below
  // game-rules/41_conditional_effects.md, p.89
  if (diceRoll < 10 && diceKeep > diceRoll) {
    diceKeep = diceRoll;
  }

  let extras = Math.max(diceRoll - 10, 0);
  diceRoll = Math.min(diceRoll, 10);
  const converts = extras > 0;

  // Two extra rolled dice become one kept die, until kept dice reach ten
  while (extras >= 2 && diceKeep < 10) {
    diceKeep += 1;
    extras -= 2;
  }

  // Rolled and kept dice both at ten: every extra die of either kind is +2 (the 13k9 and 14k12 examples)
  if (diceKeep >= 10) {
    bonus += (diceKeep - 10) * 2 + extras * 2;
    diceKeep = 10;
  } else if (littleTruths && converts) {
    bonus += 2;
  }

  return { diceRoll, diceKeep, bonus };
}
