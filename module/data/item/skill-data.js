import { booleanField, numberField, stringField } from "../fields.js";
import { migrateSkillSource } from "../migrate-source.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `skill` Item subtype: rank, Trait, skill type, Emphases, Mastery text, School skill and free
 * ranks for XP, whether it is a Social Skill (p.134; roadmap/STAGE-11 decision 9), and roll bonuses. `emphasis` is
 * the pre-array Emphasis text, kept for module/setup/migrations/items/emphasis.js.
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
      school: booleanField(false),
      social: booleanField(false),
      freeRanks: numberField(0),
      freeEmphasis: numberField(0),
      rollBonus: numberField(0),
      keepBonus: numberField(0),
      totalBonus: numberField(0)
    };
  }

  /**
   * Rules the skill brings by its own fields: the roll, keep, and total bonus fields, which the skill sheet edits
   * and Active Effects on the skill change, act as one RollModifier on this skill's rolls; Rank 10 is the Mastery
   * Ability every Skill has, a Free Raise on all rolls made with it (Core Rulebook p.133,
   * `game-rules/58_skills_overview.md`).
   * @override
   */
  get ownedRules() {
    const { rollBonus: roll, keepBonus: keep, totalBonus: total } = this;
    const selector = `skill:${this.parent.name.toLowerCase().trim()}`;
    const own = [];
    if (roll || keep || total) {
      own.push({ key: "RollModifier", selector, roll, keep, total });
    }
    if (this.rank >= 10) {
      own.push({ key: "FreeRaise", selector, value: 1 });
    }
    return own.length ? [...this.rules, ...own] : this.rules;
  }

  /** @override */
  static migrateData(source) {
    migrateSkillSource(source);
    return super.migrateData(source);
  }
}
