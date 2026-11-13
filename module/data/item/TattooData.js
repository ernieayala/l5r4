import { htmlField } from "../fields.js";
import ItemData from "./ItemData.js";

/** Data model for the `tattoo` Item subtype: its effect text. */
export default class TattooData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      effect: htmlField()
    };
  }
}
