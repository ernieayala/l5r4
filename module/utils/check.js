/**
 * @module check
 * @description The arithmetic of a Roll & Keep check, as pure functions the roll pipeline
 * (module/services/dice/check/) calls: the dice pool (p.75, p.77), its Foundry formula, the TN with Raises, Free
 * Raises, and wound penalties (pp.79, 82), success, contested rolls (p.80), and inline Roll & Keep notation.
 */

import { applyTenDiceRule } from "./ten-dice.js";

/**
 * @typedef {object} PoolModifier
 * @property {number} [roll=0]
 * @property {number} [keep=0]
 * @property {number} [total=0]
 * @property {boolean} [enabled=true]  A modifier the roller switched off adds nothing
 */

/**
 * @typedef {object} CheckPool
 * @property {number} roll         Rolled dice after the Ten Dice Rule
 * @property {number} keep         Kept dice after the Ten Dice Rule
 * @property {number} bonus        Flat bonus, including what the Ten Dice Rule converted
 * @property {number|null} explode Dice explode on this face or higher; null when they never explode
 * @property {boolean} rerollOnes  1s are re-rolled once (Emphasis, p.133)
 */

/**
 * Build the dice pool for a check: the base pool plus enabled modifiers and a Void Point (+1k1, p.78), then the
 * Ten Dice Rule last (p.77). Unskilled dice never explode (p.80).
 *
 * @param {object} spec
 * @param {number} spec.roll                Base rolled dice
 * @param {number} spec.keep                Base kept dice
 * @param {number} [spec.bonus=0]           Base flat bonus
 * @param {PoolModifier[]} [spec.modifiers] Modifiers to add
 * @param {boolean} [spec.voidPoint=false]  A Void Point spent on the roll
 * @param {boolean} [spec.unskilled=false]  An Unskilled Roll
 * @param {number} [spec.explode=10]        Explode threshold before the unskilled rule
 * @param {boolean} [spec.rerollOnes=false] Re-roll 1s once
 * @param {number|null} [spec.keepOverride] Keep fewer dice than the pool allows (p.75); ignored when not lower
 * @param {boolean} [spec.littleTruths=false] The Little Truths Ten Dice exception (see applyTenDiceRule)
 * @returns {CheckPool}
 *
 * @example
 * // Kyujutsu 4 + Reflexes 3 (p.79): 7k3
 * buildPool({ roll: 7, keep: 3 }); // { roll: 7, keep: 3, bonus: 0, explode: 10, rerollOnes: false }
 */
export function buildPool({
  roll,
  keep,
  bonus = 0,
  modifiers = [],
  voidPoint = false,
  unskilled = false,
  explode = 10,
  rerollOnes = false,
  keepOverride = null,
  littleTruths = false
}) {
  let rolled = roll;
  let kept = keep;
  let flat = bonus;
  for (const modifier of modifiers) {
    if (modifier.enabled === false) {
      continue;
    }
    rolled += Number(modifier.roll ?? 0);
    kept += Number(modifier.keep ?? 0);
    flat += Number(modifier.total ?? 0);
  }
  if (voidPoint) {
    rolled += 1;
    kept += 1;
  }
  if (keepOverride !== null && keepOverride !== undefined && keepOverride < kept) {
    kept = Math.max(0, keepOverride);
  }
  const ten = applyTenDiceRule(rolled, kept, flat, { littleTruths });
  return {
    roll: ten.diceRoll,
    keep: ten.diceKeep,
    bonus: ten.bonus,
    explode: unskilled ? null : explode,
    rerollOnes
  };
}

/**
 * The Foundry Roll formula for a pool: d10s, 1s re-rolled once, the highest kept, explosions, the flat bonus.
 *
 * @param {CheckPool} pool
 * @returns {string} Such as "7d10k3x10+0", "5d10r1k2x>=9+2", or "3d10k3-1"
 */
export function poolFormula({ roll, keep, bonus, explode, rerollOnes }) {
  const reroll = rerollOnes ? "r1" : "";
  const explosions = explode === null ? "" : explode >= 10 ? "x10" : `x>=${explode}`;
  const flat = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  return `${roll}d10${reroll}k${keep}${explosions}${flat}`;
}

/**
 * The most Raises a roll allows: the Void Ring (p.79), none on an Unskilled Roll (p.80).
 *
 * @param {number} voidRing
 * @param {boolean} [unskilled=false]
 * @returns {number}
 */
export function maxRaises(voidRing, unskilled = false) {
  return unskilled ? 0 : Math.max(0, voidRing);
}

/**
 * The TN a roll must meet. Each declared Raise adds 5; each Free Raise the roller spends on the TN takes 5 off
 * (p.79); the Wound Rank's penalty is added (p.82); TN modifiers add. A roll with no TN given (0) and no Raises has
 * none.
 *
 * @param {object} spec
 * @param {number} spec.base                   TN set by the GM, a spell, or a target's Armor TN
 * @param {number} [spec.raises=0]             Declared Raises
 * @param {number} [spec.freeRaisesToTN=0]     Free Raises spent to lower the TN
 * @param {number} [spec.woundPenalty=0]       The current Wound Rank's TN penalty
 * @param {number[]} [spec.modifiers=[]]       Other TN changes (conditions, armor, rules)
 * @returns {number|null} The TN, never below 0; null when the roll has no TN
 *
 * @example
 * targetNumber({ base: 20, raises: 2, woundPenalty: 3 }); // 33
 */
export function targetNumber({
  base,
  raises = 0,
  freeRaisesToTN = 0,
  woundPenalty = 0,
  modifiers = []
}) {
  if (base <= 0 && raises <= 0) {
    return null;
  }
  const extra = modifiers.reduce((sum, value) => sum + value, 0);
  return Math.max(0, base + raises * 5 - freeRaisesToTN * 5 + woundPenalty + extra);
}

/**
 * Compare a total with the TN (p.75): meeting it succeeds. A roll that misses its raised TN fails (p.79).
 *
 * @param {number} total
 * @param {number|null} tn
 * @returns {{success: boolean, margin: number}|null} null when the roll has no TN
 */
export function evaluateCheck(total, tn) {
  if (tn === null) {
    return null;
  }
  return { success: total >= tn, margin: total - tn };
}

/**
 * Resolve a Contested Roll (p.80): the highest result wins. A roller who declared Raises must beat each opponent
 * by 5 per Raise, so each total counts as total - 5 × Raises; equal best counts are a tie, which is re-rolled.
 *
 * @param {Array<{id: string, total: number, raises?: number}>} entries
 * @returns {{winner: string|null, tie: boolean, scores: Record<string, number>}}
 *
 * @example
 * // 22 with one Raise counts as 17, short of 18
 * contest([{ id: "a", total: 22, raises: 1 }, { id: "b", total: 18 }]); // { winner: "b", tie: false, ... }
 */
export function contest(entries) {
  const scores = Object.fromEntries(entries.map(e => [e.id, e.total - 5 * (e.raises ?? 0)]));
  const best = Math.max(...Object.values(scores));
  const leaders = entries.filter(e => scores[e.id] === best);
  return leaders.length === 1
    ? { winner: leaders[0].id, tie: false, scores }
    : { winner: null, tie: true, scores };
}

/**
 * Parse inline Roll & Keep notation: an optional "u" (Unskilled) or "e" (Emphasis) prefix, XkY, an optional
 * explode threshold "xN", and flat bonuses, as in "7k3", "u3k3", "e7k3+5", "7k3x9-2".
 *
 * @param {string} text
 * @returns {{roll: number, keep: number, bonus: number, unskilled: boolean, rerollOnes: boolean,
 *   explode: number}|null} null when the text is not Roll & Keep notation
 */
export function parseRollAndKeep(text) {
  const match = /^\s*([ue]?)(\d+)k(\d+)(?:x(\d+))?((?:[+-]\d+)*)\s*$/i.exec(text);
  if (!match) {
    return null;
  }
  const [, prefix, roll, keep, explode, bonuses] = match;
  const bonus = (bonuses.match(/[+-]\d+/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
  const threshold = explode ? Math.min(10, Math.max(2, Number(explode))) : 10;
  return {
    roll: Number(roll),
    keep: Number(keep),
    bonus,
    unskilled: prefix.toLowerCase() === "u",
    rerollOnes: prefix.toLowerCase() === "e",
    explode: threshold
  };
}
