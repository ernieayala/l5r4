import { booleanField, numberField, stringField } from "../fields.js";
import { migrateSkillSource } from "../migrate-source.js";
import ItemData from "./ItemData.js";

/**
 * Data model for the `skill` Item subtype: rank, Trait, skill type, Emphases, Mastery text, School skill and free
 * ranks for XP, and roll bonuses. `emphasis` is the pre-array Emphasis text, kept for
 * module/setup/migrations/items/emphasis.js.
 */
export default class SkillData extends ItemData {
  /** @override */
  static defineSchema() {
    const { ArrayField, StringField } = foundry.data.fields;
    // Blank entries are allowed: one blank in a stored list must not invalidate the whole list.
    const strings = () => new ArrayField(new StringField({ required: true, blank: true }));
    return {
      ...super.defineSchema(),
      rank: numberField(0),
      type: stringField("high"),
      trait: stringField("sta"),
      emphasis: stringField(),
      availableEmphases: strings(),
      trainedEmphases: strings(),
      mastery3: stringField(),
      mastery5: stringField(),
      mastery7: stringField(),
      insightBonus: numberField(0),
      school: booleanField(false),
      freeRanks: numberField(0),
      freeEmphasis: numberField(0),
      rollBonus: numberField(0),
      keepBonus: numberField(0),
      totalBonus: numberField(0)
    };
  }

  /**
   * The roll, keep, and total bonus fields, which the skill sheet edits and Active Effects on the skill change,
   * act as one RollModifier on this skill's rolls.
   * @override
   */
  get ownedRules() {
    const { rollBonus: roll, keepBonus: keep, totalBonus: total } = this;
    if (!roll && !keep && !total) {
      return this.rules;
    }
    const selector = `skill:${this.parent.name.toLowerCase().trim()}`;
    return [...this.rules, { key: "RollModifier", selector, roll, keep, total }];
  }

  /** @override */
  static migrateData(source) {
    migrateSkillSource(source);
    return super.migrateData(source);
  }
}
