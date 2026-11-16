/**
 * @module data/item/tattoo-data
 * @description The data model of the `tattoo` Item subtype.
 */

import { booleanField, htmlField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `tattoo` Item subtype: its effect text, and whether it is always on. A tattoo works while it is
 * activated, one at a time, as a kata does (module/services/effects/activation.js); a `passive` one, such as the
 * Mantis, applies while it is owned.
 * game-rules/52_dragon_schools.md, p.115
 */
export default class TattooData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      effect: htmlField(),
      passive: booleanField(false)
    };
  }

  /** @override */
  get rulesActive() {
    return this.passive;
  }
}
