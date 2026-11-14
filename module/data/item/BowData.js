import WeaponData from "./WeaponData.js";

/**
 * Data model for the legacy `bow` Item subtype, kept so stored bows stay valid until
 * module/setup/migrations/items/bow-to-weapon.js converts them to weapons with `isBow`
 * (roadmap/STAGE-02-DATA-MODELS.md decision 5). Same fields as a weapon, with the 3.2.1 bow defaults.
 */
export default class BowData extends WeaponData {
  static SKILL_DEFAULTS = { associatedSkill: "kyujutsu", fallbackTrait: "ref" };
}
