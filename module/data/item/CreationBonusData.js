import { numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/**
 * Shared data model for `family` and `school` items. Their Trait bonus is a TraitAdjust rule in `system.rules`;
 * `trait` and `bonus` are the older form, still read when an item has no such rule
 * (module/utils/xp-calculations.js, getCreationBonusInternal), so they are stored
 * (roadmap/STAGE-02-DATA-MODELS.md decision 6).
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
