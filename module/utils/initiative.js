/**
 * @module utils/initiative
 * @description Initiative pools and roll formulas. An Initiative Roll rolls Insight Rank + Reflexes and keeps
 * Reflexes, under the Ten Dice Rule.
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/31_combat_round.md, p.81
 */

import { buildPool, poolFormula } from "./check.js";

/**
 * The Initiative pool before the Ten Dice Rule: Insight Rank 2 and Reflexes 3 give `{ roll: 5, keep: 3 }`.
 * game-rules/31_combat_round.md, p.81
 * @param {object} pool
 * @param {number} pool.insightRank - The character's computed Insight Rank
 * @param {number} pool.reflexes - The character's Reflexes
 * @param {number} [pool.rollMod=0] - Rolled-dice modifier
 * @param {number} [pool.keepMod=0] - Kept-dice modifier
 * @returns {{roll: number, keep: number}}
 */
export function initiativeDice({ insightRank, reflexes, rollMod = 0, keepMod = 0 }) {
  return { roll: insightRank + reflexes + rollMod, keep: reflexes + keepMod };
}

/**
 * The Roll formula for an Initiative pool: the Ten Dice Rule applied, tens exploding, and the flat bonus left out
 * when it is zero.
 * @param {object} pool
 * @param {number} pool.roll - Rolled dice
 * @param {number} pool.keep - Kept dice
 * @param {number} [pool.bonus=0] - Flat bonus (modifiers, +10 for a Void Point)
 * @param {object} [options]
 * @param {boolean} [options.littleTruths=false] - Apply the Little Truths exception (see applyTenDiceRule)
 * @returns {string}  A formula such as "5d10xa10k3" or "10d10xa10k10+4"
 */
export function initiativeFormula({ roll, keep, bonus = 0 }, { littleTruths = false } = {}) {
  // The roll pipeline's pool and formula (module/utils/check.js), with a zero bonus left out
  return poolFormula(buildPool({ roll, keep, bonus, littleTruths })).replace(/\+0$/, "");
}
