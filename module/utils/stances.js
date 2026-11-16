/**
 * @module utils/stances
 * @description Stance lookups over an actor's statuses: which stance is active, and which conditions rule a stance
 * out.
 * game-rules/36_stances.md, p.84
 * game-rules/41_conditional_effects.md, p.89
 */

import { STANCE_LIMITS, STATUS_EFFECTS } from "../config/status-effects.js";

/**
 * Ids of the five stances: the status effects in the "stance" group.
 * @type {ReadonlySet<string>}
 */
export const STANCE_IDS = Object.freeze(
  new Set(STATUS_EFFECTS.filter(s => s.system?.group === "stance").map(s => s.id))
);

/**
 * The active stance among a set of statuses, or "" for none.
 * @param {Iterable<string>} statuses
 * @returns {string}
 */
export function getActiveStance(statuses) {
  return [...statuses].find(id => STANCE_IDS.has(id)) ?? "";
}

/**
 * The statuses that rule a stance out: Dazed allows only Defense and Full Defense, Prone only Attack and Defense;
 * Fatigued and Mounted forbid Full Attack. So Full Attack while mounted conflicts with "mounted".
 * game-rules/36_stances.md, p.84
 * game-rules/41_conditional_effects.md, p.89
 * @param {string} stanceId
 * @param {Iterable<string>} statuses
 * @returns {string[]}
 */
export function getStanceConflicts(stanceId, statuses) {
  return [...statuses].filter(status => STANCE_LIMITS[status]?.includes(stanceId));
}
