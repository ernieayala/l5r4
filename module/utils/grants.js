/**
 * @module utils/grants
 * @description Items given with another (GrantItem rules, roadmap/STAGE-11 decisions 2 and 7): which grants are due,
 * how a granted Skill changes, and what removing the giver does to it. The giver keeps a list of records, one per
 * granted uuid, in `flags.l5r4-enhanced.grants` (a list, since a uuid's dots would split a flag key); the granted
 * item names its giver in `flags.l5r4-enhanced.grantedBy`.
 */

import { SYS_ID } from "../config/constants.js";
import { hasOpenChoice } from "./choices.js";
import { toSkillKey } from "./selectors.js";

/**
 * @typedef {object} GrantRule
 * @property {string} uuid       The item to copy, choices filled in
 * @property {number} rank       School Rank the grant waits for; 0 at once
 * @property {number} skillRank  Free ranks a granted Skill comes with
 * @property {string} emphasis   A free Emphasis for a granted Skill, or ""
 */

/**
 * @typedef {object} GrantRecord
 * @property {string} uuid         The GrantItem rule's uuid
 * @property {string|null} itemId  The granted item; null once the owner removed it, so it is not granted again
 * @property {boolean} created     The grant made the item, rather than marking a Skill the actor had
 * @property {number} freeRanks    Free ranks the grant added to a Skill's
 * @property {string} emphasis     The Emphasis the grant added to the trained list, or ""
 * @property {number} freeEmphasis Free Emphases the grant added, 0 or 1
 * @property {number} [rank]       The ranks the grant gives a Skill, whatever it added; records made before #160 lack it
 * @property {string} [grantEmphasis] The Emphasis the grant gives, whatever it added
 */

/**
 * Whether a School was added beside the character's other School, as the purchase marks it with
 * `flags.l5r4-enhanced.secondSchool` (Multiple Schools, roadmap/STAGE-18 decision 10).
 * game-rules/64_advantages.md, p.151
 * @param {object} item - An item or its data
 * @returns {boolean}
 */
export function isSecondSchool(item) {
  return item.type === "school" && item.flags?.[SYS_ID]?.secondSchool === true;
}

/**
 * The grants due: rules not yet recorded whose School Rank the giver has reached. A uuid still naming an open
 * choice waits for it.
 * @param {GrantRule[]} rules
 * @param {GrantRecord[]} records
 * @param {number} schoolRank
 * @returns {GrantRule[]}
 */
export function getPendingGrants(rules, records, schoolRank) {
  return rules.filter(
    rule =>
      !records.some(record => record.uuid === rule.uuid) &&
      rule.rank <= schoolRank &&
      !hasOpenChoice(rule.uuid)
  );
}

/**
 * The record of a grant that gave no item: a uuid that is not an item, or a second School's Skill.
 * @param {string} uuid - The GrantItem rule's uuid
 * @returns {GrantRecord}
 */
export function buildEmptyGrantRecord(uuid) {
  return { uuid, itemId: null, created: false, freeRanks: 0, emphasis: "", freeEmphasis: 0 };
}

/**
 * The School Skills a character holds below rank 1. A School added beside another (Multiple Schools) gives no free
 * Skills, and its Techniques wait until this list is empty.
 * game-rules/64_advantages.md, p.151
 * @param {string[]} schoolSkills - The names of the Skills the School teaches
 * @param {Map<string, number>} ranks - The character's Skill ranks, by toSkillKey name
 * @returns {string[]} The missing names, as given
 */
export function getMissingSchoolSkills(schoolSkills, ranks) {
  return schoolSkills.filter(name => (ranks.get(toSkillKey(name)) ?? 0) < 1);
}

/**
 * A Skill's data once a grant gives it free ranks and an Emphasis: a School Skill, at least `skillRank`
 * ranks, at least that many free, and the Emphasis available, trained, and free. A grant gives a Skill at a rank, so
 * a second grant of a rank the Skill has adds nothing, and free ranks and Emphases never pass what the Skill holds
 * (Ernie's ruling, #160). A rank 0 Skill granted 1 rank and the Emphasis "Void Recovery" becomes rank 1 with 1 free
 * rank, a School Skill, with that Emphasis trained and free; granted rank 1 again, it stays so.
 * game-rules/48_character_creation_expanded.md, p.102-103
 * @param {{rank: number, freeRanks: number, availableEmphases: string[], trainedEmphases: string[],
 *   freeEmphasis: number}} system
 * @param {GrantRule} rule
 * @returns {{update: object, record: Omit<GrantRecord, "uuid"|"itemId"|"created">}}
 */
export function buildGrantedSkill(system, rule) {
  const trained = system.trainedEmphases.filter(Boolean);
  const addEmphasis = Boolean(rule.emphasis) && !trained.includes(rule.emphasis);
  const available = system.availableEmphases.filter(Boolean);
  const addAvailable = Boolean(rule.emphasis) && !available.includes(rule.emphasis);
  const trainedEmphases = addEmphasis ? [...trained, rule.emphasis] : trained;
  const freeRanks = Math.max(system.freeRanks, rule.skillRank);
  const freeEmphasis = Math.min(
    trainedEmphases.length,
    system.freeEmphasis + (rule.emphasis ? 1 : 0)
  );
  return {
    update: {
      rank: Math.max(system.rank, rule.skillRank),
      freeRanks,
      school: true,
      // A trained Emphasis is one the Skill offers, so the Emphasis manager lists it checked (#187)
      availableEmphases: addAvailable ? [...available, rule.emphasis] : available,
      trainedEmphases,
      freeEmphasis
    },
    record: {
      freeRanks: freeRanks - system.freeRanks,
      emphasis: addEmphasis ? rule.emphasis : "",
      freeEmphasis: freeEmphasis - system.freeEmphasis,
      rank: rule.skillRank,
      grantEmphasis: rule.emphasis ?? ""
    }
  };
}

/**
 * What removing a grant's giver does to a granted Skill (decision 7): a Skill the grant made, with no ranks or
 * Emphases bought on top and no other giver granting it, is deleted; otherwise the Skill stays without the free ranks
 * and Emphasis the grant gave, keeping what the other givers grant (#160).
 * @param {{rank: number, freeRanks: number, trainedEmphases: string[], freeEmphasis: number}} system
 * @param {GrantRecord} record
 * @param {GrantRecord[]} [others=[]] - The other givers' records for the same Skill
 * @returns {{delete: true}|{update: object}}
 */
export function buildUngrantedSkill(system, record, others = []) {
  const trained = system.trainedEmphases.filter(Boolean);
  const bought = system.rank > system.freeRanks || trained.length > system.freeEmphasis;
  if (record.created && !bought && !others.length) {
    return { delete: true };
  }
  const keptRank = Math.max(0, ...others.map(other => other.rank ?? other.freeRanks));
  const keptEmphases = others.map(other => other.grantEmphasis ?? other.emphasis).filter(Boolean);
  const freeRanks = Math.max(keptRank, system.freeRanks - record.freeRanks);
  const keepsEmphasis = keptEmphases.includes(record.emphasis);
  const emphases =
    record.emphasis && !keepsEmphasis ? trained.filter(e => e !== record.emphasis) : trained;
  return {
    update: {
      freeRanks,
      school: freeRanks > 0,
      trainedEmphases: emphases,
      freeEmphasis: keepsEmphasis
        ? system.freeEmphasis
        : Math.max(0, system.freeEmphasis - record.freeEmphasis)
    }
  };
}
