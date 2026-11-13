import { booleanField, numberField, stringField } from "../fields.js";
import { migrateArmorSource } from "../migrate-source.js";
import EquipmentData from "./EquipmentData.js";

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
}
