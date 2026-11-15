import { booleanField, htmlField } from "../fields.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `tattoo` Item subtype: its effect text, and whether it is always on. A tattoo works while it is
 * activated, one at a time, as a kata does (p.115; module/services/effects/activation.js); a `passive` one, such as
 * the Mantis, applies while it is owned.
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
