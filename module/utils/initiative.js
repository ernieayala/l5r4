/**
 * @module utils/initiative
 * @description Initiative pools and roll formulas. An Initiative Roll rolls Insight Rank + Reflexes and keeps
 * Reflexes, under the Ten Dice Rule.
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/31_combat_round.md, p.81
 */

import { VOID_INITIATIVE_BONUS } from "../config/game-mechanics.js";
import { buildPool, getPoolFormula } from "./check.js";

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
export function getInitiativePool({ insightRank, reflexes, rollMod = 0, keepMod = 0 }) {
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
export function getInitiativeFormula({ roll, keep, bonus = 0 }, { littleTruths = false } = {}) {
  // The roll pipeline's pool and formula (module/utils/check.js), with a zero bonus left out
  return getPoolFormula(buildPool({ roll, keep, bonus, littleTruths })).replace(/\+0$/, "");
}

/**
 * The Initiative pool as the sheet shows it, the pool the Initiative Roll rolls: the Ten Dice Rule applied (at least
 * 1k1, keeping no more than it rolls), `XkY`, then the flat bonus with its sign and no space, a Void Point's +10
 * included when one is marked; a zero bonus is left out. 5k3 with a -2 total gives "5k3-2", with +3 and Void
 * "5k3+13", with 0 "5k3"; a Feared 1k3+4 gives "1k1+4" (#103).
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/41_conditional_effects.md, p.89
 * @param {{roll: number, keep: number, totalMod: number, useVoid: boolean}} initiative - The prepared Initiative
 * @param {object} [options]
 * @param {boolean} [options.littleTruths=false] - Apply the Little Truths exception (see applyTenDiceRule)
 * @returns {string}
 */
export function formatInitiativePool(
  { roll, keep, totalMod, useVoid },
  { littleTruths = false } = {}
) {
  const bonus = totalMod + (useVoid ? VOID_INITIATIVE_BONUS : 0);
  const pool = buildPool({ roll, keep, bonus, littleTruths });
  const flat = pool.bonus > 0 ? `+${pool.bonus}` : pool.bonus < 0 ? String(pool.bonus) : "";
  return `${pool.roll}k${pool.keep}${flat}`;
}
