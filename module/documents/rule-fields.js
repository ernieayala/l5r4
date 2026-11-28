/**
 * @module documents/rule-fields
 * @description A rule's fields as the rules editor shows and reads them (roadmap/STAGE-11, Sheets): one input per
 * field of the rule key's model (module/data/rules/rule-models.js), its kind taken from the field's class, and the
 * submitted text turned back into the field's type. Validation stays with the model.
 */

import { createRule, RULE_MODELS } from "../data/rules/rule-models.js";

/**
 * @typedef {object} RuleFieldView
 * @property {string} name
 * @property {"boolean"|"number"|"select"|"text"|"value"|"list"|"json"} kind  How the editor shows it: a number or
 *   formula is "value", a list of words "list", anything else structured "json"
 * @property {*} value               What the input shows
 * @property {Record<string, string>|null} choices  For a select
 * @property {boolean} nullable      A select or number may be left empty
 */

/**
 * The editor's view of one stored rule: its fields, and the validation error that keeps the engine from using it.
 * The error comes from the rule as the engine reads it, its choices made (`answered`, from `getAnsweredRules`), so a
 * `{choice:...}` in a field with fixed values is no error. A select keeps a stored value it has no option for, such
 * as a placeholder or an invalid value, so saving the form leaves it in place.
 * @param {object} source - An entry of `system.rules`, stored user JSON
 * @param {object} [answered=source] - The same rule with its item's choices made
 * @returns {{key: string, error: string|null, fields: RuleFieldView[]}}
 */
export function buildRuleView(source, answered = source) {
  const Model = RULE_MODELS[source?.key];
  if (!Model) {
    return {
      key: String(source?.key ?? ""),
      error: `Unknown rule key "${source?.key}"`,
      fields: []
    };
  }
  let error = null;
  try {
    createRule(answered);
  } catch (err) {
    error = err.message;
  }
  const fields = Object.entries(Model.schema.fields)
    .filter(([name]) => name !== "key")
    .map(([name, field]) => buildFieldView(source, { name, field }));
  return { key: source.key, error, fields };
}

/**
 * A new rule of a key with its fields' initial values. A field the model leaves without one starts where the rule is
 * valid if it can: a selector at "any" (every roll) and a list field at its first option. Text the author must
 * write, such as a Note's text, stays empty, and the editor shows the error until it is filled. Stored rules are not
 * given these starting values: a stored rule without a selector stays invalid instead of reaching every roll.
 * @param {string} key - A key of RULE_MODELS
 * @returns {object}
 */
export function buildNewRule(key) {
  const { fields } = RULE_MODELS[key].schema;
  const rule = { key };
  for (const [name, field] of Object.entries(fields)) {
    let value = field.getInitialValue({});
    if (value === undefined && name === "selector") {
      value = "any";
    } else if (value === undefined && kindOf(field) === "select") {
      value = Object.keys(choicesOf(field))[0];
    }
    if (name !== "key" && value !== undefined) {
      rule[name] = value;
    }
  }
  return rule;
}

/**
 * A stored rule with the editor's submitted fields put in. Fields the form did not send, and properties outside the
 * key's model, stay as they were; a rule with an unknown key is returned unchanged, for the JSON view to fix.
 * @param {object} source - The stored rule
 * @param {Record<string, *>} values - Submitted fields by name
 * @returns {object}
 */
export function parseRuleForm(source, values) {
  const Model = RULE_MODELS[source?.key];
  if (!Model) {
    return source;
  }
  const rule = { ...source };
  for (const [name, field] of Object.entries(Model.schema.fields)) {
    if (name !== "key" && name in values) {
      rule[name] = parseFieldValue(field, name, values[name]);
    }
  }
  return rule;
}

/**
 * The editor's view of one field of a stored rule: its stored value, or the field's initial value when the rule
 * leaves it out. A select keeps a stored value that is not one of its choices, a `{choice:...}` placeholder or an
 * invalid value, as an option, so saving the form never changes a field the user did not touch (#84).
 * @param {object} source - An entry of `system.rules`, stored user JSON
 * @param {object} model
 * @param {string} model.name - The field's name
 * @param {foundry.data.fields.DataField} model.field - The field of the rule key's model
 * @returns {RuleFieldView}
 */
function buildFieldView(source, { name, field }) {
  const kind = kindOf(field);
  const value = name in source ? source[name] : field.getInitialValue({});
  return {
    name,
    kind,
    value: formatFieldValue(kind, value),
    choices: kind === "select" ? selectChoicesOf(field, value) : null,
    nullable: Boolean(field.nullable)
  };
}

/**
 * How the editor shows a field.
 * @param {foundry.data.fields.DataField} field
 * @returns {RuleFieldView["kind"]}
 */
function kindOf(field) {
  const { AnyField, ArrayField, BooleanField, NumberField, StringField } = foundry.data.fields;
  if (field instanceof BooleanField) {
    return "boolean";
  }
  if (field instanceof NumberField) {
    return "number";
  }
  if (field instanceof StringField) {
    return field.choices ? "select" : "text";
  }
  if (field instanceof ArrayField) {
    return field.element instanceof StringField ? "list" : "json";
  }
  return field instanceof AnyField ? "value" : "json";
}

/**
 * The values a select field allows, keyed by value as `selectOptions` reads them (it would number a plain list
 * [src: client/applications/handlebars.mjs:470-475]). The rule models give choices as a list or an object keyed by
 * value.
 * @param {foundry.data.fields.StringField} field
 * @returns {Record<string, string>}
 */
function choicesOf(field) {
  const values = Array.isArray(field.choices) ? field.choices : Object.keys(field.choices);
  return Object.fromEntries(values.map(value => [value, value]));
}

/**
 * A select's options: the field's choices, led by the stored value when it is none of them.
 * @param {foundry.data.fields.StringField} field
 * @param {*} value - The stored value
 * @returns {Record<string, string>}
 */
function selectChoicesOf(field, value) {
  const choices = choicesOf(field);
  if (value === null || value === undefined || value === "" || String(value) in choices) {
    return choices;
  }
  return { [String(value)]: String(value), ...choices };
}

/**
 * A field's stored value as its input shows it.
 * @param {string} kind
 * @param {*} value
 * @returns {*}
 */
function formatFieldValue(kind, value) {
  switch (kind) {
    case "boolean":
      return Boolean(value);
    case "list":
      return Array.isArray(value) ? value.join(", ") : "";
    case "json":
      return JSON.stringify(value ?? []);
    default:
      return value ?? "";
  }
}

/**
 * One submitted field turned back into its type. The input is user text, so a list or JSON that does not parse
 * throws with the field's name.
 * @param {foundry.data.fields.DataField} field
 * @param {string} name
 * @param {*} raw
 * @returns {*}
 */
function parseFieldValue(field, name, raw) {
  const kind = kindOf(field);
  const text = raw === null || raw === undefined ? "" : String(raw).trim();
  switch (kind) {
    case "boolean":
      return Boolean(raw);
    case "number":
      return text === "" ? (field.nullable ? null : field.getInitialValue({})) : Number(text);
    case "select":
      return text === "" ? (field.nullable ? null : field.getInitialValue({})) : text;
    case "value":
      // A cleared field takes the field's default, as an untouched one would, rather than an invalid "" (#172)
      if (text === "") {
        return field.getInitialValue({});
      }
      return Number.isFinite(Number(text)) ? Number(text) : text;
    case "list":
      return text
        .split(",")
        .map(word => word.trim())
        .filter(Boolean);
    case "json":
      try {
        return JSON.parse(text || "[]");
      } catch (err) {
        throw new Error(`${name}: ${err.message}`, { cause: err });
      }
    default:
      // An empty text field that may be null means "none", as a ChoiceSet without a selection
      return text === "" && field.nullable ? null : text;
  }
}
