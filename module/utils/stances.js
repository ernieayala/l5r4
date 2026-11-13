/**
 * @module stances
 * @description Stance lookups over an actor's statuses (Core Rulebook p.84): which stance is active, and which
 * conditions rule a stance out (p.84, p.89).
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
export function activeStance(statuses) {
  return [...statuses].find(id => STANCE_IDS.has(id)) ?? "";
}

/**
 * The statuses that rule a stance out: Dazed allows only Defense and Full Defense, Prone only Attack and Defense
 * (p.89); Fatigued and Mounted forbid Full Attack (pp.84, 89).
 * @param {string} stanceId
 * @param {Iterable<string>} statuses
 * @returns {string[]}
 *
 * @example
 * stanceConflicts("fullAttackStance", ["mounted"]); // ["mounted"]
 */
export function stanceConflicts(stanceId, statuses) {
  return [...statuses].filter(status => STANCE_LIMITS[status]?.includes(stanceId));
}
