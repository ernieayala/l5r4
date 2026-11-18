/**
 * @module data/item/skill-data
 * @description The data model of the `skill` Item subtype.
 */

import { booleanField, numberField, stringField } from "../fields.js";
import { migrateSkillSource } from "../migrate-source.js";
import ItemData from "./base-data.js";

/**
 * Data model for the `skill` Item subtype: rank, Trait, skill type, Emphases, Mastery text, School skill and free
 * ranks for XP, whether it is a Social Skill (roadmap/STAGE-11 decision 9), and roll bonuses. `emphasis` is the
 * pre-array Emphasis text, kept for module/setup/migrations/items/emphasis.js.
 * game-rules/58_skills_overview.md, p.134
 */
export default class SkillData extends ItemData {
  /** @override */
  static defineSchema() {
    const { ArrayField, StringField } = foundry.data.fields;
    // Blank entries are allowed: one blank in a stored list must not invalidate the whole list.
    const stringsField = () => new ArrayField(new StringField({ required: true, blank: true }));
    return {
      ...super.defineSchema(),
      rank: numberField(0),
      type: stringField("high"),
      trait: stringField("sta"),
      emphasis: stringField(),
      availableEmphases: stringsField(),
      trainedEmphases: stringsField(),
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

  /** @override */
  static migrateData(source) {
    migrateSkillSource(source);
    return super.migrateData(source);
  }

  /**
   * The Mastery Abilities the Skill's rank has reached, lowest first: each Rank 3, 5, or 7 text at or below the rank.
   * Rank 10's is a rule (ownedRules), not text.
   * game-rules/58_skills_overview.md, p.133
   * @type {Array<{rank: number, field: string, text: string}>} `field` names the text's field, as `mastery3`
   */
  get reachedMasteries() {
    return [3, 5, 7]
      .map(rank => ({ rank, field: `mastery${rank}`, text: this[`mastery${rank}`] }))
      .filter(({ rank, text }) => this.rank >= rank && text);
  }

  /**
   * Rules the skill brings by its own fields: the roll, keep, and total bonus fields, which the skill sheet edits
   * and Active Effects on the skill change, act as one RollModifier on this skill's rolls; Rank 10 is the Mastery
   * Ability every Skill has, a Free Raise on all rolls made with it.
   * game-rules/58_skills_overview.md, p.133
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
}
