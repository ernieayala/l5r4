import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/**
 * Data model for the `kata` Item subtype: Ring, Mastery Level, XP cost. Its rules apply while it is executed, through
 * the effect its activation makes (module/services/effects/activation.js; p.259), not while it is owned.
 */
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

  /** @override */
  get rulesActive() {
    return false;
  }
}
