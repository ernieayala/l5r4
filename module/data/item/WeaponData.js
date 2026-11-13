import { booleanField, numberField, stringField } from "../fields.js";
import EquipmentData from "./EquipmentData.js";

/**
 * Data model for the `weapon` Item subtype, bows included (`isBow`): damage, skill, bow Strength, range, arrow.
 * `equipped` is not read by the system; it is stored because the item-management Quench batch sets it
 * (roadmap/STAGE-02-DATA-MODELS.md decision 6).
 */
export default class WeaponData extends EquipmentData {
  /**
   * Defaults that differ between `weapon` and the legacy `bow` subtype.
   * @type {{associatedSkill: string, fallbackTrait: string}}
   */
  static SKILL_DEFAULTS = { associatedSkill: "", fallbackTrait: "agi" };

  /** @override */
  static defineSchema() {
    const { associatedSkill, fallbackTrait } = this.SKILL_DEFAULTS;
    return {
      ...super.defineSchema(),
      damageRoll: numberField(0),
      damageKeep: numberField(0),
      size: stringField("medium"),
      damageFormula: stringField(),
      explodesOn: numberField(10),
      associatedSkill: stringField(associatedSkill),
      fallbackTrait: stringField(fallbackTrait),
      isBow: booleanField(false),
      str: numberField(1),
      range: numberField(100),
      arrow: stringField("willow"),
      equipped: booleanField(false)
    };
  }
}
