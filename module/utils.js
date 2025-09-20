/**
 * @fileoverview L5R4 Utility Functions - Shared Helpers for Foundry VTT v13+
 * 
 * This utility module provides shared helper functions used throughout the L5R4 system,
 * including localization, type coercion, DOM manipulation, and L5R4-specific calculations.
 * Emphasizes pure functions and defensive programming practices to ensure system stability
 * and maintainability across all components of the Legend of the Five Rings 4th Edition system.
 *
 * **Core Responsibilities:**
 * - **Localization**: Template rendering and translation utilities with fallback handling
 * - **Type Coercion**: Safe conversion between data types with comprehensive fallbacks
 * - **DOM Manipulation**: Element selection and attribute handling with error checking
 * - **Sorting Preferences**: User preference management for list ordering and display
 * - **Rank/Points Conversions**: L5R4 advancement cost calculations and XP management
 * - **Wound Penalty Reading**: Combat wound penalty extraction and application
 * - **Trait Normalization**: Consistent trait value processing across actor types
 * - **Weapon Skill Resolution**: Weapon-to-skill mapping logic for combat mechanics
 * - **Data Validation**: Input sanitization and format validation utilities
 *
 * **System Architecture:**
 * The utils module follows functional programming principles:
 * - **Pure Functions**: Stateless operations with predictable outputs
 * - **Immutable Operations**: Functions don't modify input parameters
 * - **Composable Design**: Small, focused functions that can be combined
 * - **Error Boundaries**: Comprehensive error handling with graceful degradation
 * - **Performance Optimization**: Efficient algorithms with minimal overhead
 *
 * **Design Principles:**
 * - **Pure Functions**: No side effects, predictable outputs for given inputs
 * - **Defensive Programming**: Graceful handling of invalid or missing data
 * - **Type Safety**: Explicit type checking and conversion with comprehensive fallbacks
 * - **Performance**: Efficient algorithms with minimal computational overhead
 * - **Reusability**: Generic functions applicable across multiple contexts
 * - **Documentation**: Clear JSDoc with usage examples and parameter types
 * - **Consistency**: Uniform naming conventions and parameter patterns
 * - **Extensibility**: Easy addition of new utilities without breaking changes
 *
 * **Function Categories:**
 * 1. **Template Utilities**: `R()` for Handlebars template rendering with context
 * 2. **Localization**: `T()` for game text translation with parameter substitution
 * 3. **Type Conversion**: `toInt()`, `toFloat()` with safe fallbacks and validation
 * 4. **DOM Helpers**: Element selection and manipulation utilities with error handling
 * 5. **L5R4 Mechanics**: Rank calculations, wound penalties, trait processing
 * 6. **Data Processing**: Sorting, filtering, and transformation utilities
 * 7. **Validation**: Input sanitization and format checking functions
 * 8. **Math Utilities**: Specialized calculations for L5R4 game mechanics
 *
 * **Usage Examples:**
 * ```javascript
 * // Template rendering
 * const html = await R("path/to/template.hbs", { data: "context" });
 * 
 * // Localization
 * const text = T("l5r4.ui.common.cancel");
 * const formatted = T("l5r4.messages.xp-gained", { amount: 5 });
 * 
 * // Type conversion
 * const safeInt = toInt(userInput, 0); // fallback to 0
 * const safeFloat = toFloat(calculation, 1.0);
 * 
 * // L5R4 mechanics
 * const cost = getAdvancementCost("trait", currentRank);
 * const penalty = getWoundPenalty(actor);
 * const normalizedTrait = normalizeTrait(traitValue);
 * ```
 *
 * **Code Navigation Guide:**
 * 1. `T()`, `F()`, `R()` - Localization and template rendering helpers
 * 2. `toInt()`, `clamp()`, `sum()` - Type coercion and math utilities
 * 3. `on()`, `qs()`, `qsa()` - DOM manipulation helpers
 * 4. `getSortPref()`, `setSortPref()`, `sortWithPref()` - Sorting preference system
 * 5. `rankPointsToValue()`, `valueToRankPoints()`, `applyRankPointsDelta()` - Rank/points conversion
 * 6. `getWoundPenalty()`, `normalizeTrait()` - L5R4 game mechanics
 * 7. `resolveWeaponSkillTrait()` - Weapon skill resolution for combat
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 * @see {@link https://foundryvtt.com/api/classes/game.Game.html#i18n|Game.i18n}
 * @see {@link https://handlebarsjs.com/|Handlebars Template Engine}
 * @see {@link ../config.js|Config Module} - System constants and configuration
 * @see {@link ../documents/actor.js|Actor Document} - Actor integration and calculations
 * 6. `readWoundPenalty()` - Actor wound penalty calculation
 * 7. `normalizeTraitKey()`, `getEffectiveTrait()` - Trait system utilities
 * 8. `resolveWeaponSkillTrait()` - Weapon attack dice pool resolution
 */

import { SYS_ID } from "./config.js";

/**
 * Localize a translation key.
 * @param {string} key - The i18n key to localize
 * @returns {string} The localized string
 */
export const T = (key) => game.i18n.localize(key);

/**
 * Localize a translation key with formatting data.
 * @param {string} key - The i18n key to localize
 * @param {object} data - Data object for string interpolation
 * @returns {string} The formatted localized string
 */
export const F = (key, data) => game.i18n.format(key, data);

/**
 * Render a Handlebars template using Foundry's v13+ namespaced API.
 * @param {string} path - Template path relative to the system
 * @param {object} data - Template context data
 * @returns {Promise<string>} Rendered HTML string
 * @see https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html
 */
export const R = (path, data) => foundry.applications.handlebars.renderTemplate(path, data);

/**
 * Safe integer coercion with fallback.
 * Accepts string or number; trims strings; returns fallback on NaN.
 * @param {unknown} v - Value to convert to integer
 * @param {number} [fallback=0] - Fallback value if conversion fails
 * @returns {number} Parsed integer or fallback
 */
export function toInt(v, fallback = 0) {
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Clamp a number within the specified range [min, max].
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped number
 */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Sum multiple numbers efficiently. Non-numeric values are ignored.
 * @param {...unknown} nums - Numbers to sum
 * @returns {number} Sum of all finite numbers
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
 * Update a Foundry document safely with optimized options for derived-data flows.
 * @param {Document} doc - The document to update
 * @param {object} data - Update data object
 * @param {{render?: boolean, diff?: boolean}} [opts] - Update options
 * @param {boolean} [opts.render=false] - Whether to trigger a render
 * @param {boolean} [opts.diff=true] - Whether to use differential updates
 * @returns {Promise<Document>} The updated document
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
 * @param {HTMLElement} root - Root element to attach the listener to
 * @param {string} selector - CSS selector to match target elements
 * @param {string} type - Event type like "click", "change", etc.
 * @param {(ev:Event, el:Element)=>void} handler - Event handler function
 */
export function on(root, selector, type, handler) {
  root.addEventListener(type, (ev) => {
    const el = /** @type {Element|null} */ (ev.target instanceof Element ? ev.target.closest(selector) : null);
    if (el && root.contains(el)) handler(ev, el);
  });
}

/**
 * Query selector helper - find first matching element.
 * @param {Element|Document} root - Root element to search within
 * @param {string} sel - CSS selector
 * @returns {Element|null} First matching element or null
 */
export const qs = (root, sel) => root.querySelector(sel);

/**
 * Query selector all helper - find all matching elements.
 * @param {Element|Document} root - Root element to search within
 * @param {string} sel - CSS selector
 * @returns {Element[]} Array of matching elements
 */
export const qsa = (root, sel) => Array.from(root.querySelectorAll(sel));

/* --------------------------------------------------------------------------
 * Sorting helpers — per-user, per-actor, per-scope
 * Stores under flags[SYS_ID].sortByActor[actorId][scope] = { key, dir }
 * --------------------------------------------------------------------------*/

/**
 * Read a sort preference for an actor's items, validating against allowed keys.
 * Falls back to legacy advSortByActor when scope === "advDis".
 * @param {string} actorId - Actor ID for preference storage
 * @param {string} scope - Scope identifier (e.g., "advDis", "weapons", "items")
 * @param {string[]} allowedKeys - Valid sort keys for this scope
 * @param {string} [defaultKey="name"] - Default sort key if none found
 * @returns {{key: string, dir: "asc"|"desc"}} Sort preference object
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
 * Write a sort preference for an actor's items. If switching to a new key, reset dir to asc.
 * @param {string} actorId - Actor ID for preference storage
 * @param {string} scope - Scope identifier for the sort preference
 * @param {string} key - Sort key to set
 * @param {{toggleFrom?: {key:string, dir:"asc"|"desc"}}} [opts] - Options for toggling behavior
 * @param {object} [opts.toggleFrom] - Previous preference to toggle from
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
 * Sort a list by a column map and preference with locale-aware comparison.
 * Each column accessor returns either a string or a number.
 * Primary column honors direction; tie-breakers always ascend.
 * @template T
 * @param {T[]} list - Array of items to sort
 * @param {{[key:string]: (it:T)=>string|number}} columns - Column accessor functions
 * @param {{key:string, dir:"asc"|"desc"}} pref - Sort preference (key and direction)
 * @param {string} [locale] - Locale for string comparison (defaults to game.i18n.lang)
 * @returns {T[]} Sorted array
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
 * Convert a rank/points pair to a single decimal value (e.g., rank 5, points 6 = 5.6).
 * @param {{rank:number, points:number}} rp - Rank/points object
 * @param {number} rp.rank - The rank value (0-10)
 * @param {number} rp.points - The points value (0-9)
 * @returns {number} Combined decimal value
 */
export function rankPointsToValue(rp) {
  const r = Number(rp?.rank ?? 0) || 0;
  const p = Number(rp?.points ?? 0) || 0;
  return r + (p / 10);
}

/**
 * Convert a decimal value (0.0..10.0) to normalized rank/points.
 * Ensures points ∈ [0,9], and 10.0 => { rank:10, points:0 }.
 * @param {number} value - Decimal value to convert
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {{rank:number, points:number, value:number}} Normalized rank/points object
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
 * @param {{rank:number, points:number}} rp - Current rank/points object
 * @param {number} delta - Delta to apply (positive or negative)
 * @param {number} [minRank=0] - Minimum allowed rank
 * @param {number} [maxRank=10] - Maximum allowed rank
 * @returns {{rank:number, points:number, value:number}} Updated and normalized rank/points object
 */
export function applyRankPointsDelta(rp, delta, minRank = 0, maxRank = 10) {
  const now = rankPointsToValue(rp);
  const next = now + Number(delta || 0);
  return valueToRankPoints(next, minRank, maxRank);
}

/* --------------------------------------------------------------------------
 * Shared Actor Sheet Utilities
 * --------------------------------------------------------------------------*/

/**
 * Compute the current wound penalty from an actor, handling legacy data shapes.
 * Works for both PC and NPC actors with different wound tracking systems.
 * @param {Actor} actor - The actor to read wound penalty from
 * @returns {number} Current wound penalty (0 or negative number)
 */
export function readWoundPenalty(actor) {
  // Newer shape
  if (actor.system?.wounds?.penalty != null) return toInt(actor.system.wounds.penalty, 0);
  // Fallback to woundLvlsUsed shape if present
  const levels = Object.values(actor.system?.woundLvlsUsed || {});
  const current = levels
    .filter((w) => w?.current)
    .reduce((a, b) => (toInt(a?.penalty, -999) > toInt(b?.penalty, -999) ? a : b), null);
  return toInt(current?.penalty, 0);
}

/**
 * Normalize a trait label/key into a system trait key ("ref", "awa", etc.).
 * Accepts multiple input formats:
 * - Short keys ("ref")
 * - English labels ("Reflexes")
 * - i18n keys ("l5r4.mechanics.traits.ref")
 * - Localized labels in any language (via game.i18n.localize)
 * @param {string|null|undefined} raw - Raw trait identifier to normalize
 * @returns {string} Normalized trait key or empty string if not found
 */
export function normalizeTraitKey(raw) {
  const known = ["sta","wil","str","per","ref","awa","agi","int"];
  if (raw == null) return "";
  let k = String(raw).trim();

  // If given an i18n key like "l5r4.mechanics.traits.ref"
  const m = /^l5r4\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && known.includes(m[1].toLowerCase())) return m[1].toLowerCase();

  // Plain short key?
  if (known.includes(k.toLowerCase())) return k.toLowerCase();

  // English labels -> keys
  const english = {
    stamina: "sta",
    willpower: "wil",
    strength: "str",
    perception: "per",
    reflexes: "ref",
    awareness: "awa",
    agility: "agi",
    intelligence: "int"
  };
  if (english[k.toLowerCase()]) return english[k.toLowerCase()];

  // Localized labels (any language): compare against localized names
  try {
    for (const key of known) {
      const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${key}`) ?? "";
      if (label && label.toLowerCase() === k.toLowerCase()) return key;
    }
  } catch (_) { /* ignore if i18n not ready here */ }

  return "";
}

/**
 * Get the effective trait value for an actor, handling both PC and NPC cases.
 * For PCs: uses derived effective traits if available, falls back to base traits.
 * For NPCs: uses base traits directly.
 * @param {Actor} actor - The actor to read traits from
 * @param {string} traitKey - Trait identifier ("sta","wil","str","per","ref","awa","agi","int","void")
 * @returns {number} Effective trait value
 */
export function getEffectiveTrait(actor, traitKey) {
  if (traitKey === "void") {
    return toInt(actor.system?.rings?.void?.rank, 0);
  }
  
  // Try derived effective traits first (PC sheets)
  const derived = actor.system?._derived?.traitsEff?.[traitKey];
  if (derived != null) return toInt(derived, 0);
  
  // Fall back to base traits (both PC and NPC)
  return toInt(actor.system?.traits?.[traitKey], 0);
}

/**
 * Extract roll parameters from a dataset element, handling trait bonuses.
 * Common pattern used in both PC and NPC attack/damage rolls.
 * @param {HTMLElement} el - Element with dataset properties (roll, keep, trait, label, description)
 * @param {Actor} actor - Actor for trait lookups and bonus calculations
 * @returns {{diceRoll: number, diceKeep: number, traitBonus: number, label: string, description: string}} Roll parameters object
 */
export function extractRollParams(el, actor) {
  const diceRoll = toInt(el.dataset.roll, 0);
  const diceKeep = toInt(el.dataset.keep, 0);
  const label = String(el.dataset.label ?? "");
  const description = String(el.dataset.description ?? "");
  
  const hasTrait = Object.prototype.hasOwnProperty.call(el.dataset, "trait");
  const traitKey = hasTrait ? String(el.dataset.trait || "").toLowerCase() : "";
  const traitBonus = hasTrait ? getEffectiveTrait(actor, traitKey) : 0;
  
  return {
    diceRoll,
    diceKeep,
    traitBonus,
    label,
    description
  };
}

/**
 * Resolve weapon skill/trait association for attack rolls.
 * Checks if the weapon has an associated skill that the character possesses,
 * otherwise falls back to the weapon's fallback trait.
 * @param {Actor} actor - The actor making the attack
 * @param {Item} weapon - The weapon item (weapon or bow type)
 * @returns {{skillRank: number, traitValue: number, rollBonus: number, keepBonus: number, description: string}} Roll parameters
 */
export function resolveWeaponSkillTrait(actor, weapon) {
  if (!weapon || !actor) {
    return { skillRank: 0, traitValue: 0, rollBonus: 0, keepBonus: 0, description: "No weapon/actor" };
  }

  const weaponSystem = weapon.system || {};
  const associatedSkill = weaponSystem.associatedSkill;
  const fallbackTrait = weaponSystem.fallbackTrait || "agi";

  // Try to find the associated skill on the character
  let skill = null;
  if (associatedSkill && associatedSkill.trim()) {
    skill = actor.items.find(i => i.type === "skill" && i.name === associatedSkill);
  }

  if (skill) {
    // Use the skill + its associated trait
    const skillRank = toInt(skill.system?.rank || 0);
    const skillTrait = skill.system?.trait || fallbackTrait;
    const traitValue = getEffectiveTrait(actor, skillTrait);
    
    return {
      skillRank,
      traitValue,
      rollBonus: skillRank + traitValue,
      keepBonus: traitValue,
      description: `${skill.name} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue})`
    };
  } else {
    // Fall back to trait only
    const traitValue = getEffectiveTrait(actor, fallbackTrait);
    
    return {
      skillRank: 0,
      traitValue,
      rollBonus: traitValue,
      keepBonus: traitValue,
      description: `${fallbackTrait.toUpperCase()} (${traitValue}) - No skill`
    };
  }
}
