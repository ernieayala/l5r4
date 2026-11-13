/**
 * @module modifier-stacking
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

const COMPONENTS = ["roll", "keep", "total"];

/**
 * Sum modifiers into one roll/keep/total bonus under the stacking rules.
 * @param {RollModifierValue[]} modifiers
 * @returns {{roll: number, keep: number, total: number}}
 *
 * @example
 * stackModifiers([{ roll: 1 }, { roll: 1 }]); // { roll: 2, keep: 0, total: 0 }
 * stackModifiers([{ total: 2, type: "armor" }, { total: 3, type: "armor" }]); // { roll: 0, keep: 0, total: 3 }
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
