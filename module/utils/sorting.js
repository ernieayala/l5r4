/**
 * Sort Preference Management Utility
 * 
 * Provides user-scoped, actor-scoped sort preference storage and retrieval
 * using Foundry VTT's user flag system. Each actor can have different sort
 * preferences for different scopes (e.g., "skills", "weapons", "items").
 * 
 * Sort preferences are stored in `game.user.flags[SYS_ID].sortByActor` as:
 * ```
 * {
 *   [actorId]: {
 *     [scope]: { key: string, dir: "asc"|"desc" }
 *   }
 * }
 * ```
 * 
 * @module utils/sorting
 * @requires Foundry VTT v13+ (uses User.flags API)
 */

import { SYS_ID } from "../config/constants.js";

/**
 * @typedef {Object} SortPreference
 * @property {string} key - The property key to sort by
 * @property {"asc"|"desc"} dir - Sort direction (ascending or descending)
 */

/**
 * @typedef {Object.<string, Function>} ColumnExtractors
 * @description Map of column keys to extractor functions that pull sortable values from items.
 * Each function receives an item and returns a sortable value (string or number).
 * @example
 * {
 *   name: (item) => item.name,
 *   rank: (item) => item.system.rank
 * }
 */

/**
 * Retrieves the current sort preference for a specific actor and scope.
 * 
 * Reads from Foundry user flags at `game.user.flags[SYS_ID].sortByActor[actorId][scope]`.
 * If no preference exists or the stored key is not in allowedKeys, returns the defaultKey.
 * Direction defaults to "asc" if not explicitly set to "desc".
 * 
 * @param {string} actorId - The actor's UUID or ID
 * @param {string} scope - The sort scope (e.g., "skills", "weapons", "items")
 * @param {string[]} allowedKeys - Valid sort keys for this scope (security whitelist)
 * @param {string} [defaultKey="name"] - Fallback key if no preference stored
 * @returns {SortPreference} The validated sort preference with key and direction
 * @example
 * // Get skill sorting preference
 * const pref = getSortPref(actor.id, "skills", ["name", "rank", "trait"], "name");
 * // Returns: { key: "rank", dir: "desc" }
 */
export function getSortPref(actorId, scope, allowedKeys, defaultKey="name") {
  const safeKey = (k) => allowedKeys.includes(k) ? k : defaultKey;
  const sortByActor = (game.user?.flags?.[SYS_ID]?.sortByActor ?? {});
  const rec = sortByActor?.[actorId]?.[scope];
  const key = safeKey(String(rec?.key ?? defaultKey));
  const dir = rec?.dir === "desc" ? "desc" : "asc";
  return { key, dir };
}

/**
 * Sets the sort preference for a specific actor and scope with toggle logic.
 * 
 * If the user clicks the same column twice, the direction toggles (asc ↔ desc).
 * If the user clicks a different column, direction resets to "asc".
 * 
 * Persists to Foundry user flags via `game.user.setFlag(SYS_ID, "sortByActor", ...)`.
 * 
 * @param {string} actorId - The actor's UUID or ID
 * @param {string} scope - The sort scope (e.g., "skills", "weapons")
 * @param {string} key - The new sort key
 * @param {Object} [opts={}] - Additional options
 * @param {SortPreference} [opts.toggleFrom] - Previous preference for toggle calculation (overrides stored value)
 * @returns {Promise<void>}
 * @async
 * @example
 * // Toggle skill sorting by rank
 * await setSortPref(actor.id, "skills", "rank");
 * // First click: sorts by rank ascending
 * // Second click: sorts by rank descending
 * // Click "name": sorts by name ascending
 */
export async function setSortPref(actorId, scope, key, opts={}) {
  const map = (await game.user.getFlag(SYS_ID, "sortByActor")) ?? {};
  // Determine previous preference for toggle logic
  const prev = map?.[actorId]?.[scope] ?? opts.toggleFrom ?? { key: "name", dir: "asc" };
  // Toggle direction if same key, otherwise reset to ascending
  const next = { key, dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc" };
  const out = { ...map };
  out[actorId] = { ...(out[actorId] ?? {}), [scope]: next };
  await game.user.setFlag(SYS_ID, "sortByActor", out);
}

/**
 * Performs multi-column sorting with user preference and locale-aware comparison.
 * 
 * Sorts the list by the primary key (from pref) first, then uses remaining columns
 * as tiebreakers in the order they appear in the columns object. Direction multiplier
 * only applies to the primary column; tiebreakers always sort ascending.
 * 
 * Automatically selects numeric comparison for number types, string comparison for others.
 * String comparison uses `String.localeCompare()` for proper locale-aware sorting
 * (handles accents, case, etc.).
 * 
 * @param {Array<any>} list - Array of items to sort (mutates in place)
 * @param {ColumnExtractors} columns - Map of column keys to extractor functions
 * @param {SortPreference} pref - User's sort preference (key and direction)
 * @param {string} [locale=game.i18n?.lang] - Locale code for string comparison
 * @returns {Array<any>} The sorted array (same reference as input)
 * @example
 * // Sort skills by rank descending, name ascending (tiebreaker)
 * const sorted = sortWithPref(
 *   skills,
 *   { name: s => s.name, rank: s => s.system.rank },
 *   { key: "rank", dir: "desc" },
 *   "en"
 * );
 */
export function sortWithPref(list, columns, pref, locale=game.i18n?.lang) {
  const primary = pref.key;
  const dirMul = pref.dir === "desc" ? -1 : 1;
  // Build precedence: primary first, then all other columns (deduplicated)
  const precedence = [primary, ...Object.keys(columns)].filter((v,i,a)=>a.indexOf(v)===i);
  // String comparator: locale-aware
  const sc = (a,b) => String(a ?? "").localeCompare(String(b ?? ""), locale);
  // Numeric comparator: handles null/undefined as 0
  const nc = (a,b) => Math.sign((Number(a)||0) - (Number(b)||0));
  return list.sort((a,b)=>{
    for (const k of precedence) {
      const Av = columns[k]?.(a);
      const Bv = columns[k]?.(b);
      // Select comparator based on type of extracted values
      const r = typeof Av === "number" || typeof Bv === "number" ? nc(Av,Bv) : sc(Av,Bv);
      if (r !== 0) return k === primary ? r * dirMul : r; // Apply direction only to primary
    }
    return 0;
  });
}
