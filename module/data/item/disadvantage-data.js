/**
 * @module data/item/disadvantage-data
 * @description The data model of the `disadvantage` Item subtype.
 */

import { numberField, stringField } from "../fields.js";
import ItemData from "./base-data.js";

/** Data model for the `disadvantage` Item subtype: XP granted and subtype. */
export default class DisadvantageData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cost: numberField(0),
      type: stringField("physical")
    };
  }
}
