/**
 * @module grants
 * @description Items given with another (GrantItem rules, roadmap/STAGE-11 decisions 2 and 7): which grants are due,
 * how a granted Skill changes, and what removing the giver does to it. The giver keeps a list of records, one per
 * granted uuid, in `flags.l5r4-enhanced.grants` (a list, since a uuid's dots would split a flag key); the granted
 * item names its giver in `flags.l5r4-enhanced.grantedBy`.
 */

import { hasOpenChoice } from "./choices.js";

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
 * @property {number} freeRanks    Free ranks the grant gave a Skill
 * @property {string} emphasis     The Emphasis the grant added to the trained list, or ""
 * @property {number} freeEmphasis Free Emphases the grant gave a Skill, 0 or 1
 */

/**
 * The grants due: rules not yet recorded whose School Rank the giver has reached. A uuid still naming an open
 * choice waits for it.
 * @param {GrantRule[]} rules
 * @param {GrantRecord[]} records
 * @param {number} schoolRank
 * @returns {GrantRule[]}
 */
export function pendingGrants(rules, records, schoolRank) {
  return rules.filter(
    rule =>
      !records.some(record => record.uuid === rule.uuid) &&
      rule.rank <= schoolRank &&
      !hasOpenChoice(rule.uuid)
  );
}

/**
 * A Skill's data once a grant gives it free ranks and an Emphasis: a School Skill (p.102), at least `skillRank`
 * ranks, those ranks free, and the Emphasis trained and free.
 * @param {{rank: number, freeRanks: number, trainedEmphases: string[], freeEmphasis: number}} system
 * @param {GrantRule} rule
 * @returns {{update: object, record: {freeRanks: number, emphasis: string, freeEmphasis: number}}}
 *
 * @example
 * grantSkill({ rank: 0, freeRanks: 0, trainedEmphases: [], freeEmphasis: 0 },
 *   { skillRank: 1, emphasis: "Void Recovery" }).update;
 * // { rank: 1, freeRanks: 1, school: true, trainedEmphases: ["Void Recovery"], freeEmphasis: 1 }
 */
export function grantSkill(system, rule) {
  const trained = system.trainedEmphases.filter(Boolean);
  const addEmphasis = Boolean(rule.emphasis) && !trained.includes(rule.emphasis);
  return {
    update: {
      rank: Math.max(system.rank, rule.skillRank),
      freeRanks: system.freeRanks + rule.skillRank,
      school: true,
      trainedEmphases: addEmphasis ? [...trained, rule.emphasis] : trained,
      freeEmphasis: system.freeEmphasis + (rule.emphasis ? 1 : 0)
    },
    record: {
      freeRanks: rule.skillRank,
      emphasis: addEmphasis ? rule.emphasis : "",
      freeEmphasis: rule.emphasis ? 1 : 0
    }
  };
}

/**
 * What removing a grant's giver does to a granted Skill (decision 7): a Skill the grant made, with no ranks or
 * Emphases bought on top, is deleted; otherwise the Skill stays without the free ranks and Emphasis the grant gave.
 * @param {{rank: number, freeRanks: number, trainedEmphases: string[], freeEmphasis: number}} system
 * @param {GrantRecord} record
 * @returns {{delete: true}|{update: object}}
 */
export function ungrantSkill(system, record) {
  const trained = system.trainedEmphases.filter(Boolean);
  const bought = system.rank > system.freeRanks || trained.length > system.freeEmphasis;
  if (record.created && !bought) {
    return { delete: true };
  }
  const freeRanks = Math.max(0, system.freeRanks - record.freeRanks);
  const emphases = record.emphasis ? trained.filter(e => e !== record.emphasis) : trained;
  return {
    update: {
      freeRanks,
      school: freeRanks > 0,
      trainedEmphases: emphases,
      freeEmphasis: Math.max(0, system.freeEmphasis - record.freeEmphasis)
    }
  };
}
