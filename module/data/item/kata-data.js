import { numberField, stringField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `kata` Item subtype: Ring and Mastery Level, which is also its XP cost (p.259; #43). Its rules
 * apply while it is executed, through the effect its activation makes (module/services/effects/activation.js), not
 * while it is owned.
 */
export default class KataData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ring: stringField("earth"),
      mastery: numberField(1)
    };
  }

  /** @override */
  get rulesActive() {
    return false;
  }
}
