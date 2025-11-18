/**
 * @module sorting
 * @description Manages sorting preferences and multi-column sorting for actor sheet lists.
 *
 * Persists user's sort preferences (column and direction) in Foundry user flags.
 * Each actor and scope (e.g., "skills", "inventory") has independent sort preferences.
 *
 * Supports multi-column sorting with primary column (user-selected) and secondary
 * columns (all other columns as tiebreakers).
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Gets sort preference for an actor sheet scope.
 *
 * Reads from Foundry user flags. Validates key against allowed keys.
 * Returns default if no preference set or key is invalid.
 *
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Scope identifier (e.g., "skills", "inventory")
 * @param {string[]} allowedKeys - Valid column keys for this scope
 * @param {string} [defaultKey="name"] - Default column key if none set
 * @returns {Object} Sort preference
 * @returns {string} return.key - Column key to sort by
 * @returns {string} return.dir - Sort direction: "asc" or "desc"
 *
 * @example
 * getSortPref("actor123", "skills", ["name", "rank", "trait"])
 * // { key: "rank", dir: "desc" }
 */
export function getSortPref(actorId, scope, allowedKeys, defaultKey = "name") {
  // Validate key against allowed keys
  const safeKey = k => (allowedKeys.includes(k) ? k : defaultKey);
  const sortByActor = game.user?.flags?.[SYS_ID]?.sortByActor ?? {};
  const rec = sortByActor?.[actorId]?.[scope];
  const key = safeKey(String(rec?.key ?? defaultKey));
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
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Scope identifier (e.g., "skills", "inventory")
 * @param {string} key - Column key to sort by
 * @param {Object} [opts={}] - Options
 * @param {Object} [opts.toggleFrom] - Override previous preference for toggle logic
 * @returns {Promise<void>}
 *
 * @example
 * // First click on "rank" column
 * await setSortPref("actor123", "skills", "rank")
 * // Sets: { key: "rank", dir: "asc" }
 *
 * @example
 * // Second click on "rank" column (toggles direction)
 * await setSortPref("actor123", "skills", "rank")
 * // Sets: { key: "rank", dir: "desc" }
 *
 * @example
 * // Click on "name" column (different column, resets to asc)
 * await setSortPref("actor123", "skills", "name")
 * // Sets: { key: "name", dir: "asc" }
 */
export async function setSortPref(actorId, scope, key, opts = {}) {
  const map = (await game.user.getFlag(SYS_ID, "sortByActor")) ?? {};
  const prev = map?.[actorId]?.[scope] ?? opts.toggleFrom ?? { key: "name", dir: "asc" };
  // Toggle direction if same key, otherwise reset to ascending
  const next = { key, dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc" };
  const out = { ...map };
  out[actorId] = { ...(out[actorId] ?? {}), [scope]: next };
  await game.user.setFlag(SYS_ID, "sortByActor", out);
}

/**
 * Sorts list using multi-column sort with user preference.
 *
 * Primary column (from pref) uses specified direction (asc/desc).
 * Secondary columns (all others) use ascending for tiebreaking.
 * Supports both string (locale-aware) and numeric comparison.
 *
 * @param {Array} list - Array of items to sort
 * @param {Object.<string, Function>} columns - Map of column key to extractor function
 * @param {Object} pref - Sort preference
 * @param {string} pref.key - Primary column key
 * @param {string} pref.dir - Sort direction: "asc" or "desc"
 * @param {string} [locale=game.i18n?.lang] - Locale for string comparison
 * @returns {Array} Sorted array (mutates original)
 *
 * @example
 * const items = [{ name: "Kenjutsu", rank: 3 }, { name: "Athletics", rank: 2 }];
 * const columns = {
 *   name: item => item.name,
 *   rank: item => item.rank
 * };
 * sortWithPref(items, columns, { key: "rank", dir: "desc" });
 * // Result: [{ name: "Kenjutsu", rank: 3 }, { name: "Athletics", rank: 2 }]
 */
export function sortWithPref(list, columns, pref, locale = game.i18n?.lang) {
  const primary = pref.key;
  const dirMul = pref.dir === "desc" ? -1 : 1;
  // Build precedence: primary first, then all other columns (deduplicated)
  const precedence = [primary, ...Object.keys(columns)].filter((v, i, a) => a.indexOf(v) === i);
  // String comparator: locale-aware
  const sc = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), locale);
  // Numeric comparator: handles null/undefined as 0
  const nc = (a, b) => Math.sign(Number(a ?? 0) - Number(b ?? 0));
  return list.sort((a, b) => {
    for (const k of precedence) {
      const Av = columns[k]?.(a);
      const Bv = columns[k]?.(b);
      // Select comparator based on type of extracted values
      const r = typeof Av === "number" || typeof Bv === "number" ? nc(Av, Bv) : sc(Av, Bv);
      if (r !== 0) {
        // Apply direction multiplier only to primary column
        return k === primary ? r * dirMul : r;
      }
    }
    return 0;
  });
}
