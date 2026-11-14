/**
 * @module purchase
 * @description What an item asks of its buyer before it is added to an actor (roadmap/STAGE-11): its Prerequisite
 * rules and its ChoiceSet rules. Rules are stored user JSON, so each reader checks the shape it needs and skips a
 * rule that does not have it.
 */

import { CHOICE_LISTS } from "../config/rule-keys.js";
import { testPredicate } from "./predicate.js";

/**
 * The Prerequisite rules an actor does not meet: each rule whose own predicate holds (when it applies) and whose
 * `requires` does not.
 * @param {object[]} rules     An item's raw `system.rules`
 * @param {Set<string>} options  The buyer's roll options
 * @returns {Array<{label: string, requires: Array}>}
 *
 * @example
 * unmetPrerequisites(
 *   [{ key: "Prerequisite", label: "Kenjutsu 3", requires: [{ gte: ["skill:kenjutsu", 3] }] }],
 *   new Set(["skill:kenjutsu:2"])
 * ); // [{ label: "Kenjutsu 3", requires: [...] }]
 */
export function unmetPrerequisites(rules, options) {
  return (rules ?? [])
    .filter(rule => rule?.key === "Prerequisite" && Array.isArray(rule.requires))
    .filter(rule => testPredicate(Array.isArray(rule.predicate) ? rule.predicate : [], options))
    .filter(rule => !testPredicate(rule.requires, options))
    .map(rule => ({ label: String(rule.label ?? ""), requires: rule.requires }));
}

/**
 * @typedef {object} OpenChoice
 * @property {number} index   The rule's index in the item's rules
 * @property {string} flag
 * @property {string} prompt
 * @property {Array<{value: string, label: string}>} options  The rule's own options
 * @property {string|null} list  A built-in list instead: traits, rings, or skills
 * @property {string[]} filter   Skill types the skills list keeps; empty keeps all
 */

/**
 * The ChoiceSet rules of an item that have no selection yet.
 * @param {object[]} rules  An item's raw `system.rules`
 * @returns {OpenChoice[]}
 */
export function openChoices(rules) {
  const open = [];
  (rules ?? []).forEach((rule, index) => {
    if (rule?.key !== "ChoiceSet" || rule.selection || typeof rule.flag !== "string") {
      return;
    }
    const options = (Array.isArray(rule.options) ? rule.options : [])
      .filter(option => option && typeof option.value === "string" && option.value)
      .map(option => ({ value: option.value, label: String(option.label || option.value) }));
    open.push({
      index,
      flag: rule.flag,
      prompt: String(rule.prompt ?? ""),
      options,
      list: CHOICE_LISTS.includes(rule.list) ? rule.list : null,
      filter: Array.isArray(rule.filter) ? rule.filter.map(String) : []
    });
  });
  return open;
}

/**
 * An item's rules with selections stored in their ChoiceSet rules.
 * @param {object[]} rules
 * @param {Record<number, string>} selections  Selection by rule index
 * @returns {object[]} A copy
 */
export function withSelections(rules, selections) {
  return rules.map((rule, index) =>
    index in selections ? { ...rule, selection: selections[index] } : rule
  );
}
