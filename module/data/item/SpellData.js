import { booleanField, numberField, stringField } from "../fields.js";
import { migrateKeywordsSource } from "../migrate-source.js";
import ItemData from "./ItemData.js";

/**
 * Data model for the `spell` Item subtype: Ring, Mastery Level, keywords, range, area, duration, Raises text,
 * memorized, and maho. `keywords` is text (roadmap/STAGE-02-DATA-MODELS.md decision 8).
 */
export default class SpellData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ring: stringField("earth"),
      mastery: numberField(1),
      keywords: stringField(),
      range: stringField(),
      aoe: stringField(),
      duration: stringField(),
      raises: stringField(),
      memorized: booleanField(false),
      maho: booleanField(false)
    };
  }

  /** @override */
  static migrateData(source) {
    migrateKeywordsSource(source);
    return super.migrateData(source);
  }
}
