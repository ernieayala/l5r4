/**
 * @module choices
 * @description Choices made when an item is added to an actor (ChoiceSet rules, roadmap/STAGE-11). A ChoiceSet stores
 * the pick in its `selection`; the item's other rules name it as `{choice:<flag>}` in any text, such as a selector
 * "skill:{choice:weapon}" or a GrantItem's uuid.
 */

const PLACEHOLDER = /\{choice:([a-z][a-z0-9-]*)\}/gi;

/**
 * The selections of an item's ChoiceSet rules, by flag. A ChoiceSet without a selection is left out.
 * @param {object[]} rules  Raw `system.rules` of one item, stored data that may hold anything
 * @returns {Record<string, string>}
 *
 * @example
 * choiceSelections([{ key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" }]); // { weapon: "kenjutsu" }
 */
export function choiceSelections(rules) {
  const selections = {};
  for (const rule of rules ?? []) {
    if (rule?.key === "ChoiceSet" && typeof rule.flag === "string" && rule.selection) {
      selections[rule.flag] = String(rule.selection);
    }
  }
  return selections;
}

/**
 * Put a text's `{choice:<flag>}` placeholders in from the selections; one without a selection stays as it is.
 * @param {string} text
 * @param {Record<string, string>} selections
 * @returns {string}
 */
function fillText(text, selections) {
  return text.replace(PLACEHOLDER, (whole, flag) => selections[flag] ?? whole);
}

/**
 * Copy a value with every string's placeholders filled.
 * @param {*} value
 * @param {Record<string, string>} selections
 * @returns {*}
 */
function fill(value, selections) {
  if (typeof value === "string") {
    return fillText(value, selections);
  }
  if (Array.isArray(value)) {
    return value.map(v => fill(v, selections));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, selections)]));
  }
  return value;
}

/**
 * An item's rules with its choices filled in. The ChoiceSet rules themselves are returned unchanged.
 * @param {object[]} rules  Raw `system.rules` of one item
 * @returns {object[]}
 *
 * @example
 * applyChoices([
 *   { key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" },
 *   { key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 }
 * ])[1].selector; // "skill:kenjutsu"
 */
export function applyChoices(rules) {
  const selections = choiceSelections(rules);
  if (Object.keys(selections).length === 0) {
    return rules ?? [];
  }
  return rules.map(rule => (rule?.key === "ChoiceSet" ? rule : fill(rule, selections)));
}

/**
 * Whether a text still names a choice that has no selection.
 * @param {string} text
 * @returns {boolean}
 */
export function hasOpenChoice(text) {
  return new RegExp(PLACEHOLDER.source, "i").test(String(text));
}
