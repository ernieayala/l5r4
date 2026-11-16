/**
 * @module utils/rule-bag
 * @description Reads the rule bag that preparation leaves on an actor (module/utils/rule-engine.js,
 * getDerivedRuleOutputs): the entries of one kind for a roll's selectors and options, and the bonus the RollModifier
 * entries give a sheet formula.
 */

import { testPredicate } from "./predicate.js";
import { getStackedModifiers } from "./modifier-stacking.js";

/**
 * Bag entries of one kind for any of the selectors, whose predicates hold for the options. An entry from a weapon
 * counts only for a roll made with that weapon.
 * @param {Record<string, Record<string, object[]>>} bag
 * @param {string} kind - A BAG_KINDS value.
 * @param {object} match
 * @param {string[]} match.selectors
 * @param {Set<string>} match.options
 * @param {string|null} [match.weaponId=null] - The weapon the roll is made with
 * @returns {object[]}
 */
export function getBagEntries(bag, kind, { selectors, options, weaponId = null }) {
  const byKind = bag?.[kind] ?? {};
  return selectors
    .flatMap(selector => byKind[selector] ?? [])
    .filter(entry => !entry.weaponId || entry.weaponId === weaponId)
    .filter(entry => testPredicate(entry.predicate, options));
}

/**
 * The roll, keep, and total bonus the RollModifier rules give rolls with any of the selectors, stacked: what a
 * sheet shows in a formula such as a Skill's "7k3", before the roll dialog adds its situational choices. Optional
 * modifiers and those limited to one attack range wait for the dialog.
 * @param {Record<string, Record<string, object[]>>} bag
 * @param {string[]} selectors
 * @param {object} match
 * @param {Set<string>} match.options
 * @param {string|null} [match.weaponId=null] - The weapon the formula is for
 * @returns {{roll: number, keep: number, total: number}}
 */
export function getSelectorBonus(bag, selectors, { options, weaponId = null }) {
  return getStackedModifiers(
    getBagEntries(bag, "rollModifiers", { selectors, options, weaponId }).filter(
      e => !e.optional && !e.range
    )
  );
}
