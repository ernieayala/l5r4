import { RULE_KEYS } from "../../config/rule-keys.js";

/**
 * Base DataModel for one entry of `system.rules` (roadmap/AUTOMATION.md §1). Each rule key extends it with its own
 * fields (module/data/rules/rule-models.js); module/utils/rule-engine.js computes what the validated data produces.
 *
 * A rule is user-authored JSON, so the engine builds it with `strict: true` and skips one that fails validation.
 */
export default class RuleData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, AnyField, NumberField, StringField } = foundry.data.fields;
    return {
      key: new StringField({ required: true, blank: false, choices: RULE_KEYS }),
      label: new StringField({ required: true, blank: true, initial: "" }),
      // Lower runs first, as Active Effect change priorities do.
      priority: new NumberField({ required: true, nullable: false, initial: 100 }),
      // Terms of module/utils/predicate.js: option strings and { not | or | and | gte | ... } objects.
      predicate: new ArrayField(new AnyField({ serializable: true, nullable: false }))
    };
  }
}

/**
 * A rule value: a number, or a formula over the actor's roll data (module/utils/rule-values.js).
 * @param {number} initial
 * @returns {foundry.data.fields.AnyField}
 */
export function valueField(initial) {
  return new foundry.data.fields.AnyField({
    serializable: true,
    nullable: false,
    initial,
    validate: value =>
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && value.trim() !== ""),
    validationError: "must be a number or a formula"
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
