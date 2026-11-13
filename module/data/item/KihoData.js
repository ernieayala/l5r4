import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/** Data model for the `kiho` Item subtype: Ring, Mastery Level, kiho type, XP cost. */
export default class KihoData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ring: stringField("earth"),
      mastery: numberField(1),
      type: stringField("internal"),
      cost: numberField(0)
    };
  }
}
