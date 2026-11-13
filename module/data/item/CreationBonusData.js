import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/**
 * Shared data model for `family` and `school` items. Their Trait bonus is a transferred Active Effect; `trait`
 * and `bonus` are the older form, still read when an item has no such effect
 * (module/utils/xp-calculations.js:161-166), so they are stored (roadmap/STAGE-02-DATA-MODELS.md decision 6).
 */
export default class CreationBonusData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      trait: stringField(),
      bonus: numberField(0)
    };
  }
}
