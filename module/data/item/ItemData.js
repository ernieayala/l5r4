import { htmlField, numberField } from "../fields.js";

/**
 * Shared data model for every Item subtype: the 3.2.1 `itemDescription` template plus `rules`.
 *
 * `rules` holds the item's mechanics as data for the rule engine (roadmap Stage 7, AUTOMATION.md §1); nothing reads
 * it before then (roadmap/STAGE-02-DATA-MODELS.md decision 2). Subtypes extend `defineSchema` and `migrateData`.
 */
export default class ItemData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, ObjectField } = foundry.data.fields;
    return {
      description: htmlField(),
      specialRules: htmlField(),
      freeRaises: numberField(0),
      rules: new ArrayField(new ObjectField())
    };
  }
}
