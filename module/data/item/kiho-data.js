import { numberField, stringField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `kiho` Item subtype: Ring, kiho type, and Mastery Level, which is also its XP cost (p.231;
 * #43). A monk's free kiho, and the higher price others pay (p.266), are Cost rules. Its rules apply while it is
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
      type: stringField("internal")
    };
  }

  /** @override */
  get rulesActive() {
    return false;
  }
}
