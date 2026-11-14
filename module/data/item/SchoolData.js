import { numberField } from "../fields.js";
import CreationBonusData from "./CreationBonusData.js";

/**
 * Data model for the `school` Item subtype. `rank` is a School Rank set by hand, for a character with Multiple
 * Schools (p.105); 0 follows the owner's Insight Rank, as a single School does (p.104; roadmap/STAGE-11 decision 2).
 */
export default class SchoolData extends CreationBonusData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), rank: numberField(0) };
  }

  /**
   * The School Rank: the rank set by hand, else the owner's Insight Rank, else 1 for an unowned School.
   * @type {number}
   */
  get schoolRank() {
    return this.rank || this.parent.actor?.system.insight?.rank || 1;
  }
}
