import { htmlField, numberField } from "../fields.js";

/**
 * Shared data model for every Item subtype: the 3.2.1 `itemDescription` template plus `rules`.
 *
 * `rules` holds the item's mechanics as data for the rule engine (module/documents/actor/rules.js,
 * roadmap/AUTOMATION.md §1). Subtypes extend `defineSchema` and `migrateData`, and may add rules derived from their
 * own fields (`ownedRules`) or stop their rules applying (`rulesActive`).
 */
export default class ItemData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, ObjectField } = foundry.data.fields;
    return {
      description: htmlField(),
      specialRules: htmlField(),
      // 3.2.1's Free Raises on every roll; the world migration moves a value into a FreeRaise rule and sets this to
      // 0 (module/setup/migrations/items/item-rules.js). Nothing else reads it.
      freeRaises: numberField(0),
      rules: new ArrayField(new ObjectField())
    };
  }

  /**
   * The rules this item gives its owner.
   * @type {object[]}
   */
  get ownedRules() {
    return this.rules;
  }

  /**
   * Whether this item's rules apply to its owner now.
   * @type {boolean}
   */
  get rulesActive() {
    return true;
  }
}
