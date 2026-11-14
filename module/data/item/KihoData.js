import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/**
 * Data model for the `kiho` Item subtype: Ring, Mastery Level, kiho type, XP cost. Its rules apply while it is
 * activated, through the effect its activation makes (module/services/effects/activation.js; p.261), not while it is
 * owned.
 */
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

  /** @override */
  get rulesActive() {
    return false;
  }
}
