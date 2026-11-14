/**
 * Field factories shared by the data models.
 *
 * Fields are as permissive as template.json was: no integer, min, or choices constraints, so data stored by
 * 3.2.1 validates unchanged (roadmap/STAGE-02-DATA-MODELS.md decision 1). A stored value a field cannot cast
 * falls back to the field's initial value when the document loads (common/abstract/data.mjs:79-83).
 *
 * @module data/fields
 */

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
 * @param {number} rank  Initial rank.
 * @returns {foundry.data.fields.SchemaField}
 */
export function rankPointsField(rank) {
  return new foundry.data.fields.SchemaField({ rank: numberField(rank), points: numberField(0) });
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
