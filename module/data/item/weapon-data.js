import { booleanField, numberField, stringField } from "../fields.js";
import { migrateWeaponSource } from "../migrate-source.js";
import EquipmentData from "./equipment-data.js";

/**
 * Data model for the `weapon` Item subtype, bows included (`isBow`): damage, skill, bow Strength, range, arrow, the
 * Strength needed to wield it, and its attack TN mounted and on foot.
 * `equipped` is not read by the system; it is stored because the item-management Quench batch sets it
 * (roadmap/STAGE-02-DATA-MODELS.md decision 6). `addsStrength` and `explodes` are off for the thrown weapons that
 * add no Strength and whose dice do not explode, such as shuriken and tsubute (Core Rulebook pp.200, 202).
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
      // A whole face from 2 to 10, so an exploding die always stops (p.77); migrateWeaponSource brings older values in
      explodesOn: new foundry.data.fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 2,
        max: 10,
        initial: 10
      }),
      explodes: booleanField(true),
      addsStrength: booleanField(true),
      associatedSkill: stringField(associatedSkill),
      fallbackTrait: stringField(fallbackTrait),
      isBow: booleanField(false),
      str: numberField(1),
      range: numberField(100),
      arrow: stringField("willow"),
      // The least Strength that may wield it, 0 for none, and its attack TN change mounted and on foot: the dai-kyu
      // needs Strength 3 and is +10 on foot, the han-kyu +10 mounted (p.199)
      minStrength: numberField(0),
      tnMounted: numberField(0),
      tnOnFoot: numberField(0),
      equipped: booleanField(false)
    };
  }

  /** @override */
  static migrateData(source) {
    migrateWeaponSource(source);
    return super.migrateData(source);
  }

  /**
   * The face this weapon's damage dice explode on, or null when they never explode (p.202).
   * @type {number|null}
   */
  get damageExplode() {
    return this.explodes ? this.explodesOn : null;
  }
}
