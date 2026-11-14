import { htmlField, numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/** Data model for the `advantage` Item subtype: XP cost, subtype, clan restriction, and demands text. */
export default class AdvantageData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cost: numberField(0),
      type: stringField("physical"),
      clan: stringField(),
      demands: htmlField()
    };
  }
}
