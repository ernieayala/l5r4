/**
 * @fileoverview L5R4 Sorting Preference System
 * 
 * Manages user-specific sorting preferences for actor item lists.
 * Stores preferences in user flags and provides locale-aware comparison
 * for consistent sorting across different languages and data types.
 * 
 * **Core Responsibilities:**
 * - **Preference Storage**: Read/write sort preferences to user flags
 * - **Locale-Aware Sorting**: Multi-column sorting with proper collation
 * - **Legacy Compatibility**: Migrate old advantage-only preferences
 * 
 * **Design Principles:**
 * - **Per-User Preferences**: Stored in user flags, not actor data
 * - **Per-Actor Scopes**: Different sorting for different actors
 * - **Per-Scope Settings**: Different sorting for weapons, skills, etc.
 * - **Toggle Behavior**: Clicking same column toggles asc/desc
 * - **Fallback Columns**: Primary sort with secondary tie-breakers
 * 
 * **Storage Structure:**
 * ```javascript
 * game.user.flags["l5r4-enhanced"].sortByActor = {
 *   [actorId]: {
 *     [scope]: { key: "name", dir: "asc" },
 *     "weapons": { key: "damage", dir: "desc" },
 *     "advDis": { key: "type", dir: "asc" }
 *   }
 * }
 * ```
 * 
 * **Usage Examples:**
 * ```javascript
 * // Read preferences
 * const pref = getSortPref(actorId, "weapons", ["name", "damage", "skill"], "name");
 * 
 * // Update preferences (with toggle behavior)
 * await setSortPref(actorId, "weapons", "damage", { toggleFrom: pref });
 * 
 * // Sort array with preferences
 * const sorted = sortWithPref(weapons, {
 *   name: w => w.name,
 *   damage: w => w.system.damage,
 *   skill: w => w.system.associatedSkill
 * }, pref);
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag|User.getFlag}
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag|User.setFlag}
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Read a sort preference for an actor's items, validating against allowed keys.
 * @param {string} actorId - Actor ID for preference storage
 * @param {string} scope - Scope identifier (e.g., "advDis", "weapons", "items")
 * @param {string[]} allowedKeys - Valid sort keys for this scope
 * @param {string} [defaultKey="name"] - Default sort key if none found
 * @returns {{key: string, dir: "asc"|"desc"}} Sort preference object
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag
 * @example
 * const pref = getSortPref(actor.id, "weapons", ["name", "damage"], "name");
 * // Returns: { key: "name", dir: "asc" } (or saved preference)
 */
export function getSortPref(actorId, scope, allowedKeys, defaultKey="name") {
  const safeKey = (k) => allowedKeys.includes(k) ? k : defaultKey;
  const sortByActor = /** @type {{[id:string]: {[scope:string]: {key?: string, dir?: "asc"|"desc"}}}} */ (game.user?.flags?.[SYS_ID]?.sortByActor ?? {});
  const rec = sortByActor?.[actorId]?.[scope];
  const key = safeKey(String(rec?.key ?? defaultKey));
  const dir = rec?.dir === "desc" ? "desc" : "asc";
  return { key, dir };
}

/**
 * Write a sort preference for an actor's items. If switching to a new key, reset dir to asc.
 * If clicking the same key, toggle between asc and desc.
 * @param {string} actorId - Actor ID for preference storage
 * @param {string} scope - Scope identifier for the sort preference
 * @param {string} key - Sort key to set
 * @param {{toggleFrom?: {key:string, dir:"asc"|"desc"}}} [opts] - Options for toggling behavior
 * @returns {Promise<void>}
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag
 * @example
 * // Toggle behavior: clicking same column toggles direction
 * const current = getSortPref(actorId, "weapons", ["name", "damage"]);
 * await setSortPref(actorId, "weapons", "damage", { toggleFrom: current });
 */
export async function setSortPref(actorId, scope, key, opts={}) {
  const map = /** @type {{[id:string]: {[scope:string]: {key:string,dir:"asc"|"desc"}}}} */ (await game.user.getFlag(SYS_ID, "sortByActor")) ?? {};
  const prev = map?.[actorId]?.[scope] ?? opts.toggleFrom ?? { key: "name", dir: "asc" };
  const next = { key, dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc" };
  const out = { ...map };
  out[actorId] = { ...(out[actorId] ?? {}), [scope]: next };
  await game.user.setFlag(SYS_ID, "sortByActor", out);
}

/**
 * Sort a list by a column map and preference with locale-aware comparison.
 * Each column accessor returns either a string or a number.
 * Primary column honors direction; tie-breakers always ascend.
 * @template T
 * @param {T[]} list - Array of items to sort
 * @param {{[key:string]: (it:T)=>string|number}} columns - Column accessor functions
 * @param {{key:string, dir:"asc"|"desc"}} pref - Sort preference (key and direction)
 * @param {string} [locale] - Locale for string comparison (defaults to game.i18n.lang)
 * @returns {T[]} Sorted array
 * @example
 * const sortedWeapons = sortWithPref(weapons, {
 *   name: w => w.name,
 *   damage: w => w.system.damage,
 *   skill: w => w.system.associatedSkill
 * }, { key: "damage", dir: "desc" });
 */
export function sortWithPref(list, columns, pref, locale=game.i18n?.lang) {
  const primary = pref.key;
  const dirMul = pref.dir === "desc" ? -1 : 1;
  const precedence = [primary, ...Object.keys(columns)].filter((v,i,a)=>a.indexOf(v)===i);
  const sc = (a,b) => String(a ?? "").localeCompare(String(b ?? ""), locale);
  const nc = (a,b) => Math.sign((Number(a)||0) - (Number(b)||0));
  return list.sort((a,b)=>{
    for (const k of precedence) {
      const Av = columns[k]?.(a);
      const Bv = columns[k]?.(b);
      const r = typeof Av === "number" || typeof Bv === "number" ? nc(Av,Bv) : sc(Av,Bv);
      if (r !== 0) return k === primary ? r * dirMul : r;
    }
    return 0;
  });
}
