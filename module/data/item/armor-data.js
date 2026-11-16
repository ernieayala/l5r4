/**
 * @module data/item/armor-data
 * @description The data model of the `armor` Item subtype.
 */

import { booleanField, numberField, stringField } from "../fields.js";
import { migrateArmorSource } from "../migrate-source.js";
import EquipmentData from "./equipment-data.js";

/** Data model for the `armor` Item subtype: Armor TN bonus, Reduction, type, and whether it is worn. */
export default class ArmorData extends EquipmentData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bonus: numberField(0),
      equipped: booleanField(false),
      reduction: numberField(0),
      armorType: stringField("ashigaru")
    };
  }

  /** @override */
  static migrateData(source) {
    migrateArmorSource(source);
    return super.migrateData(source);
  }

  /**
   * Armor's rules apply only while it is worn.
   * @override
   */
  get rulesActive() {
    return this.equipped;
  }
}
