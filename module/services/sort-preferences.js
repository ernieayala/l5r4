/**
 * @module services/sort-preferences
 * @description The user's sort preference (column and direction) for each actor sheet list, kept in user flags.
 * Each actor and scope (e.g., "skills", "inventory") has its own preference; module/utils/sorting.js sorts a list
 * by one.
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Gets sort preference for an actor sheet scope.
 *
 * Reads from Foundry user flags. Validates key against allowed keys.
 * Returns default if no preference set or key is invalid.
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Scope identifier (e.g., "skills", "inventory")
 * @param {object} options
 * @param {string[]} options.allowedKeys - Valid column keys for this scope
 * @param {string} [options.defaultKey="name"] - Default column key if none set
 * @returns {{key: string, dir: string}} Sort preference: the column key to sort by and the direction, "asc" or
 *   "desc"
 */
export function getSortPref(actorId, scope, { allowedKeys, defaultKey = "name" }) {
  // Validate key against allowed keys
  const getAllowedKey = k => (allowedKeys.includes(k) ? k : defaultKey);
  const sortByActor = game.user?.flags?.[SYS_ID]?.sortByActor ?? {};
  const rec = sortByActor?.[actorId]?.[scope];
  const key = getAllowedKey(String(rec?.key ?? defaultKey));
  // Normalize direction to "asc" or "desc"
  const dir = rec?.dir === "desc" ? "desc" : "asc";
  return { key, dir };
}

/**
 * Sets sort preference for an actor sheet scope.
 *
 * Persists to Foundry user flags. Implements toggle behavior:
 * - If clicking same column: toggles asc/desc
 * - If clicking different column: resets to asc
 *
 * A first click on "rank" sorts it ascending, a second click descending, and a click on "name" then sorts
 * that ascending.
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Scope identifier (e.g., "skills", "inventory")
 * @param {object} options
 * @param {string} options.key - Column key to sort by
 * @param {object} [options.toggleFrom] - Override previous preference for toggle logic
 * @returns {Promise<void>}
 */
export async function updateSortPref(actorId, scope, { key, toggleFrom }) {
  const map = (await game.user.getFlag(SYS_ID, "sortByActor")) ?? {};
  const prev = map?.[actorId]?.[scope] ?? toggleFrom ?? { key: "name", dir: "asc" };
  // Toggle direction if same key, otherwise reset to ascending
  const next = { key, dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc" };
  const out = { ...map };
  out[actorId] = { ...(out[actorId] ?? {}), [scope]: next };
  await game.user.setFlag(SYS_ID, "sortByActor", out);
}
