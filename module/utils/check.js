/**
 * @module utils/check
 * @description The arithmetic of a Roll & Keep check, as pure functions the roll pipeline
 * (module/services/dice/check/) calls: the dice pool, its Foundry formula, the TN with Raises, Free
 * Raises, and wound penalties, success, contested rolls, and inline Roll & Keep notation.
 * game-rules/23_roll_and_keep.md, p.75
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/28_raises.md, p.79
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/33_wounds.md, p.82
 */

import { CONTEST_MARGIN_PER_RAISE } from "../config/game-mechanics.js";
import { getStackedModifiers } from "./modifier-stacking.js";
import { applyTenDiceRule } from "./ten-dice.js";

/**
 * @typedef {object} PoolModifier
 * @property {number} [roll=0]
 * @property {number} [keep=0]
 * @property {number} [total=0]
 * @property {string} [type]           Modifiers of one type do not stack (module/utils/modifier-stacking.js)
 * @property {boolean} [enabled=true]  A modifier the roller switched off adds nothing
 */

/**
 * A check's dice pool after the Ten Dice Rule; `rerollOnes` is an Emphasis.
 * game-rules/58_skills_overview.md, p.133
 * @typedef {object} CheckPool
 * @property {number} roll         Rolled dice after the Ten Dice Rule
 * @property {number} keep         Kept dice after the Ten Dice Rule
 * @property {number} bonus        Flat bonus, including what the Ten Dice Rule converted
 * @property {number|null} explode Dice explode on this face or higher; null when they never explode
 * @property {boolean} rerollOnes  1s are re-rolled once (Emphasis)
 */

/**
 * Build the dice pool for a check: the base pool plus enabled modifiers, stacked as the sheet stacks them, and a
 * Void Point (+1k1), then the Ten Dice Rule last, which also keeps no more dice than are rolled. Unskilled dice
 * never explode. A Skill of 4 with a Trait of 3 builds 7k3: `{ roll: 7, keep: 3, bonus: 0, explode: 10,
 * rerollOnes: false }`. A keep override keeps fewer dice than the pool allows after the Ten Dice Rule: 12k4 keeping
 * 3 is 10k3, and 14k12 keeping 3 is 10k3+12.
 * game-rules/23_roll_and_keep.md, p.75
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/27_skills_in_rolls.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/41_conditional_effects.md, p.89
 * @param {object} spec - The pool's parts
 * @param {number} spec.roll - Base rolled dice
 * @param {number} spec.keep - Base kept dice
 * @param {number} [spec.bonus=0] - Base flat bonus
 * @param {PoolModifier[]} [spec.modifiers] - Modifiers to add
 * @param {boolean} [spec.voidPoint=false] - A Void Point spent on the roll
 * @param {boolean} [spec.unskilled=false] - An Unskilled Roll
 * @param {number} [spec.explode=10] - Explode threshold before the unskilled rule
 * @param {boolean} [spec.rerollOnes=false] - Re-roll 1s once
 * @param {number|null} [spec.keepOverride] - Keep fewer dice than the pool allows, at least 1; ignored when not
 *   lower
 * @param {boolean} [spec.littleTruths=false] - The Little Truths Ten Dice exception (see applyTenDiceRule)
 * @returns {CheckPool} The pool
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
  const { rolled, kept, flat } = getModifiedPool({ roll, keep, bonus, modifiers, voidPoint });
  const ten = applyTenDiceRule(rolled, kept, { bonus: flat, littleTruths });
  // The roller's keep is the last word on kept dice, so the Ten Dice Rule's conversions cannot add any back (#150).
  // Its +2s stand for dice past the ten-dice limit, not dice kept, so they stay (Ernie's ruling, #150)
  return {
    roll: ten.roll,
    keep: keepOverride ? Math.min(ten.keep, keepOverride) : ten.keep,
    bonus: ten.bonus,
    explode: unskilled ? null : explode,
    rerollOnes
  };
}

/**
 * The Roll & Keep explosion modifier (module/services/dice/roll-keep-die.js): every die that meets `explode`
 * rolls again into its own total, before the keep. Empty when the dice do not explode.
 * game-rules/26_special_dice_rules.md, p.77
 * @param {number|null} explode
 * @returns {string} "xa10", "xa>=9", or ""
 */
export function getExplodeModifier(explode) {
  if (explode === null) {
    return "";
  }
  return explode >= 10 ? "xa10" : `xa>=${explode}`;
}

/**
 * The Foundry Roll formula for a pool: d10s, 1s re-rolled once, each die exploding into its own total, the
 * highest kept, the flat bonus.
 * game-rules/23_roll_and_keep.md, p.75
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/58_skills_overview.md, p.133
 * @param {CheckPool} pool
 * @returns {string} Such as "7d10xa10k3+0", "5d10r1xa>=9k2+2", or "3d10k3-1"
 */
export function getPoolFormula({ roll, keep, bonus, explode, rerollOnes }) {
  const reroll = rerollOnes ? "r1" : "";
  const flat = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  return `${roll}d10${reroll}${getExplodeModifier(explode)}k${keep}${flat}`;
}

/**
 * The most Raises a roll allows: the Void Ring, none on an Unskilled Roll.
 * game-rules/28_raises.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {number} voidRing
 * @param {boolean} [unskilled=false]
 * @returns {number}
 */
export function getMaxRaises(voidRing, unskilled = false) {
  return unskilled ? 0 : Math.max(0, voidRing);
}

/**
 * Whether a modifier, TN change, or action cost applies at a roll's range: one with no range always does, one limited
 * to a range only at that range, so never on a roll with no range (#171).
 * @param {{range?: string}} entry
 * @param {"melee"|"ranged"|null} range - The roll's range
 * @returns {boolean}
 */
export function isForRange(entry, range) {
  return !entry.range || entry.range === range;
}

/**
 * The TN a roll must meet. Each declared Raise adds 5; each Free Raise the roller spends on the TN takes 5 off;
 * the Wound Rank's penalty is added; TN modifiers add. A roll with no TN given (0) has none, whatever its Raises: a
 * Raise there counts only in a Contested Roll. A base of 20 with two Raises and a wound penalty of 3 is 33.
 * game-rules/28_raises.md, p.79
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/33_wounds.md, p.82
 * @param {object} spec - The TN's parts
 * @param {number} spec.base - TN set by the GM, a spell, or a target's Armor TN
 * @param {number} [spec.raises=0] - Declared Raises
 * @param {number} [spec.freeRaisesToTn=0] - Free Raises spent to lower the TN
 * @param {number} [spec.woundPenalty=0] - The current Wound Rank's TN penalty
 * @param {number[]} [spec.modifiers=[]] - Other TN changes (conditions, armor, rules)
 * @returns {number|null} The TN, never below 0; null when the roll has no TN, its Raises included: a Raise on a roll
 *   with no TN counts only in a Contested Roll (roadmap/STAGE-18 decision 12)
 */
export function getTn({ base, raises = 0, freeRaisesToTn = 0, woundPenalty = 0, modifiers = [] }) {
  if (base <= 0) {
    return null;
  }
  const extra = modifiers.reduce((sum, value) => sum + value, 0);
  return Math.max(0, base + raises * 5 - freeRaisesToTn * 5 + woundPenalty + extra);
}

/**
 * Compare a total with the TN: meeting it succeeds. A roll that misses its raised TN fails.
 * game-rules/23_roll_and_keep.md, p.75
 * game-rules/28_raises.md, p.79
 * @param {number} total
 * @param {number|null} tn
 * @returns {{success: boolean, margin: number}|null} null when the roll has no TN
 */
export function getCheckResult(total, tn) {
  if (tn === null) {
    return null;
  }
  return { success: total >= tn, margin: total - tn };
}

/**
 * Resolve a Contested Roll: the highest result wins. A roller who declared Raises must beat each opponent by 5 per
 * Raise or fail; a margin of exactly 5 per Raise is enough (Ernie's ruling, 2026-11-14). A roller who fails drops out,
 * and the highest total among the rest wins, so 22 with one Raise beats 17 and loses to 18. With no one left, as when
 * both sides fall short of their Raises, or with the best totals level, it is a tie, which is re-rolled (Ernie's
 * ruling, #166): 40 with 2 Raises against 32 with 1 Raise is a tie.
 * game-rules/29_types_of_rolls.md, p.80
 * @param {Array<{id: string, total: number, raises?: number}>} entries
 * @returns {{winner: string|null, tie: boolean}}
 */
export function getContestResult(entries) {
  const standing = entries.filter(e => {
    const margin = CONTEST_MARGIN_PER_RAISE * (e.raises ?? 0);
    return margin === 0 || entries.every(o => o === e || e.total - o.total >= margin);
  });
  const best = Math.max(...standing.map(e => e.total));
  const leaders = standing.filter(e => e.total === best);
  return leaders.length === 1 ? { winner: leaders[0].id, tie: false } : { winner: null, tie: true };
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

/**
 * A check's pool before the Ten Dice Rule: the base pool plus the enabled modifiers, stacked as the sheet stacks
 * them, and a Void Point (+1k1).
 * game-rules/25_rings_and_traits.md, p.78
 * @param {object} spec - buildPool's parts of the same names
 * @param {number} spec.roll
 * @param {number} spec.keep
 * @param {number} spec.bonus
 * @param {PoolModifier[]} spec.modifiers
 * @param {boolean} spec.voidPoint
 * @returns {{rolled: number, kept: number, flat: number}} Rolled and kept dice, and the flat bonus
 */
function getModifiedPool({ roll, keep, bonus, modifiers, voidPoint }) {
  const added = getStackedModifiers(modifiers.filter(modifier => modifier.enabled !== false));
  const flat = bonus + added.total;
  const extra = voidPoint ? 1 : 0;
  return { rolled: roll + added.roll + extra, kept: keep + added.keep + extra, flat };
}
