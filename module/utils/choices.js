/**
 * @module utils/choices
 * @description Choices made when an item is added to an actor (ChoiceSet rules, roadmap/STAGE-11). A ChoiceSet stores
 * the pick in its `selection`; the item's other rules name it as `{choice:<flag>}` in any text, such as a selector
 * "skill:{choice:weapon}" or a GrantItem's uuid.
 */

import { CHOICE_LIST_VALUES } from "../config/rule-keys.js";

const PLACEHOLDER = /\{choice:([a-z][a-z0-9-]*)\}/gi;

/**
 * The selections of an item's ChoiceSet rules, by flag. A ChoiceSet without a selection is left out: a ChoiceSet
 * with flag "weapon" and selection "kenjutsu" gives `{ weapon: "kenjutsu" }`.
 * @param {object[]} rules - Raw `system.rules` of one item, stored data that may hold anything
 * @returns {Record<string, string>}
 */
export function getChoiceSelections(rules) {
  const selections = {};
  for (const rule of rules ?? []) {
    if (rule?.key === "ChoiceSet" && typeof rule.flag === "string" && rule.selection) {
      selections[rule.flag] = String(rule.selection);
    }
  }
  return selections;
}

/**
 * An item's rules with its choices filled in. The ChoiceSet rules themselves are returned unchanged. With a
 * ChoiceSet "weapon" set to "kenjutsu", a selector "skill:{choice:weapon}" becomes "skill:kenjutsu".
 * @param {object[]} rules - Raw `system.rules` of one item
 * @returns {object[]}
 */
export function applyChoices(rules) {
  const selections = getChoiceSelections(rules);
  if (Object.keys(selections).length === 0) {
    return rules ?? [];
  }
  return rules.map(rule => (rule?.key === "ChoiceSet" ? rule : getFilledValue(rule, selections)));
}

/**
 * An item's rules as they read once each choice is made: an open ChoiceSet takes its first option, or the first value
 * of its "traits" or "rings" list, and the placeholders are filled. The rules editor validates this copy, so a rule
 * that names a choice is judged by what it becomes, not by its `{choice:...}` text. A "skills" choice is a uuid, which
 * any text field takes, so its placeholder stays. An open "traits" ChoiceSet fills "{choice:trait}" with "sta".
 * @param {object[]} rules - Raw `system.rules` of one item
 * @returns {object[]}
 */
export function getAnsweredRules(rules) {
  return applyChoices(
    (rules ?? []).map(rule => {
      if (rule?.key !== "ChoiceSet" || rule.selection) {
        return rule;
      }
      const sample = rule.options?.[0]?.value ?? CHOICE_LIST_VALUES[rule.list]?.[0];
      return sample === undefined ? rule : { ...rule, selection: sample };
    })
  );
}

/**
 * Whether a text still names a choice that has no selection.
 * @param {string} text
 * @returns {boolean}
 */
export function hasOpenChoice(text) {
  return new RegExp(PLACEHOLDER.source, "i").test(String(text));
}

/**
 * Put a text's `{choice:<flag>}` placeholders in from the selections; one without a selection stays as it is.
 * @param {string} text
 * @param {Record<string, string>} selections
 * @returns {string}
 */
function getFilledText(text, selections) {
  return text.replace(PLACEHOLDER, (whole, flag) => selections[flag] ?? whole);
}

/**
 * Copy a value with every string's placeholders filled.
 * @param {*} value
 * @param {Record<string, string>} selections
 * @returns {*}
 */
function getFilledValue(value, selections) {
  if (typeof value === "string") {
    return getFilledText(value, selections);
  }
  if (Array.isArray(value)) {
    return value.map(v => getFilledValue(v, selections));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, getFilledValue(v, selections)])
    );
  }
  return value;
}
