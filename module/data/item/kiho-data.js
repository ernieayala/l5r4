/**
 * @module data/item/kiho-data
 * @description The data model of the `kiho` Item subtype.
 */

import { booleanField, numberField, stringField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `kiho` Item subtype: Ring, kiho type, and Mastery Level, which is also its XP cost (#43).
 * `schoolKiho` marks a kiho the player took as one their Monk School gives, which costs no XP (Stage 18 decision 19);
 * the higher price others pay is a Cost rule. Its rules apply while it is activated, through the effect its
 * activation makes (module/services/effects/activation.js), not while it is owned.
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
      type: stringField("internal"),
      schoolKiho: booleanField(false)
    };
  }

  /** @override */
  get rulesActive() {
    return false;
  }
}
