/**
 * @module data/item/kiho-data
 * @description The data model of the `kiho` Item subtype.
 */

import { numberField, stringField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `kiho` Item subtype: Ring, kiho type, and Mastery Level, which is also its XP cost (#43). A
 * monk's free kiho, and the higher price others pay, are Cost rules. Its rules apply while it is activated, through
 * the effect its activation makes (module/services/effects/activation.js), not while it is owned.
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * game-rules/87_kiho.md, p.261, 266
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
