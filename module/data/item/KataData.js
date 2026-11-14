import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/** Data model for the `kata` Item subtype: Ring, Mastery Level, XP cost. */
export default class KataData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ring: stringField("earth"),
      mastery: numberField(1),
      cost: numberField(0)
    };
  }
}
