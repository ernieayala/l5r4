/**
 * @module data/rules/rule-data
 * @description The base DataModel of every rule key. The field factories the rule models share are in
 * module/data/fields.js.
 */

import { RULE_KEYS } from "../../config/rule-keys.js";
import { predicateField } from "../fields.js";

/**
 * Base DataModel for one entry of `system.rules` (roadmap/AUTOMATION.md §1). Each rule key extends it with its own
 * fields (module/data/rules/rule-models.js); module/utils/rule-engine.js computes what the validated data produces.
 *
 * A rule is user-authored JSON, so the engine builds it with `strict: true` and skips one that fails validation.
 */
export default class RuleData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const { NumberField, StringField } = foundry.data.fields;
    return {
      key: new StringField({ required: true, blank: false, choices: RULE_KEYS }),
      label: new StringField({ required: true, blank: true, initial: "" }),
      // Lower runs first, as Active Effect change priorities do.
      priority: new NumberField({ required: true, nullable: false, initial: 100 }),
      predicate: predicateField()
    };
  }
}
