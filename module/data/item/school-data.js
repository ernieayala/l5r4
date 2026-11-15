import { booleanField, numberField } from "../fields.js";
import CreationBonusData from "./creation-bonus-data.js";

/**
 * Data model for the `school` Item subtype. `rank` is a School Rank set by hand, for a character with Multiple
 * Schools (p.105); 0 follows the owner's Insight Rank, as a single School does (p.104; roadmap/STAGE-11 decision 2).
 * `shugenja` marks the School whose Rank a Spell Casting Roll adds (pp.80, 163).
 */
export default class SchoolData extends CreationBonusData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), rank: numberField(0), shugenja: booleanField(false) };
  }

  /**
   * The School Rank: the rank set by hand, else the owner's Insight Rank, else 1 for an unowned School.
   * @type {number}
   */
  get schoolRank() {
    return this.rank || this.parent.actor?.system.insight?.rank || 1;
  }
}
