/**
 * @module utils/rule-json
 * @description Reads the rules a user types as JSON in the rules editor (module/sheets/rules-editor.js) into a list
 * of rule objects, or the reason it cannot.
 */

/**
 * Parse the rules a user typed as JSON. The engine validates each rule's fields; this checks the shape: a list of
 * objects, each with a string `key`. A list with one Note rule gives `{ rules }`; "{" gives an "invalidJson" error
 * with the parser's message.
 * @param {string} text
 * @returns {{rules?: object[], error?: "invalidJson"|"notList", detail?: string}}
 */
export function parseRulesJson(text) {
  let rules;
  try {
    rules = JSON.parse(text.trim() || "[]");
  } catch (err) {
    return { error: "invalidJson", detail: err.message };
  }
  const isRule = rule =>
    rule !== null &&
    typeof rule === "object" &&
    !Array.isArray(rule) &&
    typeof rule.key === "string";
  if (!Array.isArray(rules) || !rules.every(isRule)) {
    return { error: "notList" };
  }
  return { rules };
}
