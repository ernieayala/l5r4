import { htmlField, numberField, sourceField } from "../fields.js";

/**
 * Shared data model for every Item subtype: the 3.2.1 `itemDescription` template plus `rules` and `source`.
 *
 * `rules` holds the item's mechanics as data for the rule engine (module/documents/actor/rules.js,
 * roadmap/AUTOMATION.md §1). Subtypes extend `defineSchema` and `migrateData`, and may add rules derived from their
 * own fields (`ownedRules`) or stop their rules applying (`rulesActive`). `source` is the book and page a pack entry
 * cites in place of the book's text (roadmap/STAGE-15); a new field with a blank default, so stored items need no
 * conversion.
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
      rules: new ArrayField(new ObjectField()),
      source: sourceField()
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
