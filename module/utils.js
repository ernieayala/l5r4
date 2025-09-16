// Shared config (system id, paths)
// Import order: external → shared internal (config, utils) → feature modules → file-local helpers
// @see https://foundryvtt.com/api/
import { SYS_ID } from "./config.js";

/**
 * L5R4 utilities for Foundry VTT v13
 * Scope: small, fast helpers used across modules and sheets.
 * No side effects on import.
 *
 * Foundry API index: https://foundryvtt.com/api/
 */

/** Localize a key. */
export const T = (key) => game.i18n.localize(key);

/** Localize with formatting data. */
export const F = (key, data) => game.i18n.format(key, data);

/**
 * Render a Handlebars template using Foundry's v13+ namespaced API.
 * @param {string} path
 * @param {object} data
 * @returns {Promise<string>}
 * @see https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html
 */
export const R = (path, data) => foundry.applications.handlebars.renderTemplate(path, data);

/**
 * Safe integer coercion.
 * Accepts string or number; trims strings; returns fallback on NaN.
 * @param {unknown} v
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function toInt(v, fallback = 0) {
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Clamp a number into [min, max].
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Sum numbers quickly. Non-numeric values are ignored.
 * @param {...unknown} nums
 * @returns {number}
 */
export function sum(...nums) {
  let t = 0;
  for (const x of nums) {
    const n = Number(x);
    if (Number.isFinite(n)) t += n;
  }
  return t;
}

/**
 * Update a document safely with typical options for derived-data flows.
 * @param {Document} doc
 * @param {object} data
 * @param {{render?: boolean, diff?: boolean}} [opts]
 * @returns {Promise<Document>}
 * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
 */
export function safeUpdate(doc, data, { render = false, diff = true } = {}) {
  return doc.update(data, { render, diff });
}

/* --------------------------------------------------------------------------
 * Minimal DOM helpers for sheets
 * --------------------------------------------------------------------------*/

/**
 * Delegate an event to a selector within a root element.
 * Useful in DocumentSheet.activateListeners to avoid binding per-row handlers.
 * @param {HTMLElement} root
 * @param {string} selector
 * @param {string} type - event type like "click"
 * @param {(ev:Event, el:Element)=>void} handler
 */
export function on(root, selector, type, handler) {
  root.addEventListener(type, (ev) => {
    const el = /** @type {Element|null} */ (ev.target instanceof Element ? ev.target.closest(selector) : null);
    if (el && root.contains(el)) handler(ev, el);
  });
}

/** Query helpers */
export const qs = (root, sel) => root.querySelector(sel);
export const qsa = (root, sel) => Array.from(root.querySelectorAll(sel));

/* --------------------------------------------------------------------------
 * Sorting helpers — per-user, per-actor, per-scope
 * Stores under flags[SYS_ID].sortByActor[actorId][scope] = { key, dir }
 * --------------------------------------------------------------------------*/

/**
 * Read a sort preference, validating against allowed keys.
 * Falls back to legacy advSortByActor when scope === "advDis".
 * @param {string} actorId
 * @param {string} scope  eg "advDis", "weapons", "items"
 * @param {string[]} allowedKeys
 * @param {string} [defaultKey="name"]
 * @returns {{key: string, dir: "asc"|"desc"}}
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag
 */
export function getSortPref(actorId, scope, allowedKeys, defaultKey="name") {
  const safeKey = (k) => allowedKeys.includes(k) ? k : defaultKey;
  const sortByActor = /** @type {{[id:string]: {[scope:str..."asc"|"desc"}}}} */ (game.user?.flags?.[SYS_ID]?.sortByActor ?? {});
  let rec = sortByActor?.[actorId]?.[scope];

  // Back-compat: old storage for advantages only
  if (!rec && scope === "advDis") {
    const legacy = /** @type {{[id:string]: {key?: string,...r?: string}}} */ (game.user?.flags?.[SYS_ID]?.advSortByActor ?? {});
    const l = legacy?.[actorId];
    if (l) rec = { key: l.key, dir: l.dir };
  }
  const key = safeKey(String(rec?.key ?? defaultKey));
  const dir = rec?.dir === "desc" ? "desc" : "asc";
  return { key, dir };
}

/**
 * Write a sort preference. If switching to a new key, reset dir to asc.
 * @param {string} actorId
 * @param {string} scope
 * @param {string} key
 * @param {{toggleFrom?: {key:string, dir:"asc"|"desc"}}} [opts]
 * @returns {Promise<void>}
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag
 */
export async function setSortPref(actorId, scope, key, opts={}) {
  const map = /** @type {{[id:string]: {[scope:string]: {key:string,dir:"asc"|"desc"}}}} */ (await game.user.getFlag(SYS_ID, "sortByActor")) ?? {};
  const prev = map?.[actorId]?.[scope] ?? opts.toggleFrom ?? { key: "name", dir: "asc" };
  const next = { key, dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc" };
  const out = { ...(map ?? {}) };
  out[actorId] = { ...(out[actorId] ?? {}), [scope]: next };
  await game.user.setFlag(SYS_ID, "sortByActor", out);
}

/**
 * Sort a list by a column map and a preference.
 * Each column accessor returns either a string or a number.
 * Primary column honors dir; tie-breakers ascend.
 * @template T
 * @param {T[]} list
 * @param {{[key:string]: (it:T)=>string|number}} columns
 * @param {{key:string, dir:"asc"|"desc"}} pref
 * @param {string} [locale]
 * @returns {T[]}
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

/**
 * Convert a rank/points pair to a single decimal value (e.g., 5.6).
 * @param {{rank:number, points:number}} rp
 * @returns {number}
 */
export function rankPointsToValue(rp) {
  const r = Number(rp?.rank ?? 0) || 0;
  const p = Number(rp?.points ?? 0) || 0;
  return r + (p / 10);
}

/**
 * Convert a decimal value (0.0..10.0) to normalized rank/points.
 * Ensures points ∈ 0..9, and 10.0 => { rank:10, points:0 }.
 * @param {number} value
 * @param {number} [minRank=0]
 * @param {number} [maxRank=10]
 * @returns {{rank:number, points:number, value:number}}
 */
export function valueToRankPoints(value, minRank = 0, maxRank = 10) {
  const min = Number(minRank) || 0;
  const max = Number(maxRank) || 10;
  let v = Math.max(min, Math.min(max, Number(value) || 0));
  if (v === max) return { rank: max, points: 0, value: max }; // exact 10.0
  const rank = Math.floor(v);
  let points = Math.round((v - rank) * 10);
  if (points >= 10) return { rank: Math.min(rank + 1, max), points: 0, value: Math.min(rank + 1, max) };
  return { rank, points, value: rank + points / 10 };
}

/**
 * Apply a decimal delta (e.g., +0.1, -1.0) to a rank/points pair and normalize.
 * @param {{rank:number, points:number}} rp
 * @param {number} delta
 * @param {number} [minRank=0]
 * @param {number} [maxRank=10]
 * @returns {{rank:number, points:number, value:number}}
 */
export function applyRankPointsDelta(rp, delta, minRank = 0, maxRank = 10) {
  const now = rankPointsToValue(rp);
  const next = now + Number(delta || 0);
  return valueToRankPoints(next, minRank, maxRank);
}
