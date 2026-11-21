/**
 * @module data/item/school-data
 * @description The data model of the `school` Item subtype.
 */

import { booleanField, numberField } from "../fields.js";
import CreationBonusData from "./creation-bonus-data.js";

/**
 * Data model for the `school` Item subtype. `rank` is a School Rank set by hand, for a character with Multiple
 * Schools; 0 follows the owner's Insight Rank, as a single School does (roadmap/STAGE-11 decision 2).
 * `shugenja` marks the School whose Rank a Spell Casting Roll adds. `kiho` is how many kiho a Monk School gives at
 * its first Rank, 0 for any other School; each later Rank gives two more (Stage 18 decision 19).
 * game-rules/49_improving_your_character.md, p.104-105
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/66_magic_and_spell_casting.md, p.163
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 */
export default class SchoolData extends CreationBonusData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: numberField(0),
      shugenja: booleanField(false),
      kiho: numberField(0)
    };
  }

  /**
   * The School Rank: the rank set by hand, else the owner's Insight Rank, else 1 for an unowned School.
   * @type {number}
   */
  get schoolRank() {
    return this.rank || this.parent.actor?.system.insight?.rank || 1;
  }
}
