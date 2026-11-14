import { booleanField, coinsField, stringField } from "../fields.js";
import { migrateKeywordsSource } from "../migrate-source.js";
import ItemData from "./ItemData.js";

/**
 * Shared data model for physical equipment (armor, weapons, bows, common items): keywords, nemuranai, price.
 * `keywords` is text, as the item sheet edits it (roadmap/STAGE-02-DATA-MODELS.md decision 8).
 */
export default class EquipmentData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      keywords: stringField(),
      nemuranai: booleanField(false),
      price: coinsField()
    };
  }

  /** @override */
  static migrateData(source) {
    migrateKeywordsSource(source);
    return super.migrateData(source);
  }
}
