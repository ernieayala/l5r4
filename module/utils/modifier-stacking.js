/**
 * @module utils/modifier-stacking
 * @description Stacking for roll modifiers from rules. Untyped modifiers all add up. Modifiers sharing a type
 * (for example two "armor" bonuses) do not stack: per component, the largest bonus and the largest penalty of
 * that type apply.
 */

/**
 * @typedef {object} RollModifierValue
 * @property {number} [roll=0]   Rolled dice
 * @property {number} [keep=0]   Kept dice
 * @property {number} [total=0]  Flat bonus
 * @property {string} [type="untyped"]
 */

const COMPONENTS = Object.freeze(["roll", "keep", "total"]);

/**
 * Sum modifiers into one roll/keep/total bonus under the stacking rules. Two untyped +1 rolled dice give 2 rolled
 * dice; two "armor" bonuses of 2 and 3 give a total of 3.
 * @param {RollModifierValue[]} modifiers
 * @returns {{roll: number, keep: number, total: number}}
 */
export function stackModifiers(modifiers) {
  const result = { roll: 0, keep: 0, total: 0 };
  const typed = new Map();
  for (const modifier of modifiers) {
    const type = modifier.type || "untyped";
    if (type === "untyped") {
      for (const component of COMPONENTS) {
        result[component] += Number(modifier[component] ?? 0);
      }
      continue;
    }
    const best = typed.get(type) ?? {
      roll: [0, 0],
      keep: [0, 0],
      total: [0, 0]
    };
    for (const component of COMPONENTS) {
      const value = Number(modifier[component] ?? 0);
      const [bonus, penalty] = best[component];
      best[component] = [Math.max(bonus, value), Math.min(penalty, value)];
    }
    typed.set(type, best);
  }
  for (const best of typed.values()) {
    for (const component of COMPONENTS) {
      result[component] += best[component][0] + best[component][1];
    }
  }
  return result;
}
