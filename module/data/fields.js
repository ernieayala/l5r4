/**
 * @module data/fields
 * @description Field factories shared by the data models and the rule models.
 *
 * Fields are as permissive as template.json was: no integer, min, or choices constraints, so data stored by
 * 3.2.1 validates unchanged (roadmap/STAGE-02-DATA-MODELS.md decision 1). A stored value a field cannot cast
 * falls back to the field's initial value when the document loads [src: common/abstract/data.mjs:79-83].
 */

import { hasOptionPrefix } from "../utils/predicate.js";
import { isRuleFormula } from "../utils/rule-values.js";

/**
 * A required, non-null number.
 * @param {number} initial
 * @returns {foundry.data.fields.NumberField}
 */
export function numberField(initial) {
  return new foundry.data.fields.NumberField({ required: true, nullable: false, initial });
}

/**
 * A required string that may be blank.
 * @param {string} [initial=""]
 * @returns {foundry.data.fields.StringField}
 */
export function stringField(initial = "") {
  return new foundry.data.fields.StringField({ required: true, blank: true, initial });
}

/**
 * A boolean.
 * @param {boolean} [initial=false]
 * @returns {foundry.data.fields.BooleanField}
 */
export function booleanField(initial = false) {
  return new foundry.data.fields.BooleanField({ initial });
}

/**
 * Rich text, declared in system.json `htmlFields` so the server sanitizes it.
 * @returns {foundry.data.fields.HTMLField}
 */
export function htmlField() {
  return new foundry.data.fields.HTMLField({ required: true, blank: true, initial: "" });
}

/**
 * A koku / bu / zeni amount, all starting at 0.
 * @returns {foundry.data.fields.SchemaField}
 */
export function coinsField() {
  return new foundry.data.fields.SchemaField({
    koku: numberField(0),
    bu: numberField(0),
    zeni: numberField(0)
  });
}

/**
 * A rank with points toward the next one (Honor, Glory, Status, Shadowlands Taint).
 * @param {number} rank - Initial rank.
 * @returns {foundry.data.fields.SchemaField}
 */
export function rankPointsField(rank) {
  return new foundry.data.fields.SchemaField({ rank: numberField(rank), points: numberField(0) });
}

/**
 * The book and printed page a document comes from (module/config/sources.js); blank for one made at the table.
 * @returns {foundry.data.fields.SchemaField}
 */
export function sourceField() {
  return new foundry.data.fields.SchemaField({ book: stringField(), page: numberField(0) });
}

/**
 * One entry per Elemental Ring plus Void, each starting at `initial`.
 * @param {number} initial
 * @returns {foundry.data.fields.SchemaField}
 */
export function spellSlotsField(initial) {
  return new foundry.data.fields.SchemaField({
    water: numberField(initial),
    fire: numberField(initial),
    earth: numberField(initial),
    air: numberField(initial),
    void: numberField(initial)
  });
}

/**
 * A rule value: a number, or a formula over the actor's roll data that parses (module/utils/rule-values.js), so the
 * rules editor marks "abc" as an error before the rule ever reaches a roll (#172). A rule that runs before part of
 * the roll data is worked out refuses a formula reading it (#175).
 * @param {number|string} initial
 * @param {RegExp|null} [unseen=null] - The `@` paths the rule's formula cannot read
 * @returns {foundry.data.fields.AnyField}
 */
export function valueField(initial, unseen = null) {
  return new foundry.data.fields.AnyField({
    serializable: true,
    nullable: false,
    initial,
    validate: value => {
      if (typeof value === "string" && unseen?.test(value)) {
        throw new Error("reads a value this rule runs before (see ACTIVE_EFFECTS.md, Predicates)");
      }
      return (
        (typeof value === "number" && Number.isFinite(value)) ||
        (typeof value === "string" && value.trim() !== "" && isRuleFormula(value))
      );
    },
    validationError: "must be a number or a formula"
  });
}

/**
 * A rule's predicate: terms of module/utils/predicate.js, option strings and `{ not | or | and | gte | ... }` objects.
 * A rule that runs before some roll options are prepared refuses a predicate testing them (#175).
 * @param {string[]} [unseen=[]] - Option prefixes the rule can never see, each ending in ":"
 * @returns {foundry.data.fields.ArrayField}
 */
export function predicateField(unseen = []) {
  const { AnyField, ArrayField } = foundry.data.fields;
  return new ArrayField(new AnyField({ serializable: true, nullable: false }), {
    validate: value => {
      if (unseen.length && hasOptionPrefix(value, unseen)) {
        throw new Error(`cannot test ${unseen.join(" ")}: this rule runs before they are known`);
      }
      return true;
    }
  });
}

/**
 * The roll a rule applies to, such as "skill:kenjutsu", "trait:ref", "ring:fire", "attack", or "damage".
 * @returns {foundry.data.fields.StringField}
 */
export function selectorField() {
  return new foundry.data.fields.StringField({ required: true, blank: false });
}

/**
 * The stacking type: modifiers sharing a type other than "untyped" do not add up (module/utils/modifier-stacking.js).
 * @returns {foundry.data.fields.StringField}
 */
export function typeField() {
  return new foundry.data.fields.StringField({ required: true, blank: false, initial: "untyped" });
}
