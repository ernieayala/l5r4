/**
 * @module services/xp/formatter
 * @description Formats the XP history entries services/xp/calculator.js builds for display in the XP manager: a
 * localized category per entry type, progression notation for rank increases ("Reflexes 2→3"), item names, fallback
 * labels for older or malformed entries, and sorting by timestamp or the user's column preference
 * (module/services/sort-preferences.js, module/utils/sorting.js). The costs themselves come from the XP ledger: a Trait 4 × the new rank, the Void Ring
 * 6 × the new rank, a Skill its new rank, an Emphasis 2, an item its listed cost, a spell its Mastery Level.
 */

import { SORT_KEYS } from "../../config/sort-keys.js";
import { applySortPref } from "../../utils/sorting.js";
import { getSortPref } from "../sort-preferences.js";

/**
 * Column extractors for sortable XP entry fields.
 *
 * Defines how to extract sortable values from formatted entries for user-driven sorting.
 * Used with applySortPref from utils/sorting.js to enable column-click sorting in sheets.
 *
 * @typedef {object} SortColumnExtractors
 * @property {Function} note - Extracts note text (string sort)
 * @property {Function} cost - Extracts absolute XP cost (numeric sort, ignores sign for gains/losses)
 * @property {Function} type - Extracts entry type category (string sort)
 *
 * @type {SortColumnExtractors}
 */
const SORT_COLUMNS = Object.freeze({
  note: e => e.note || "",
  cost: e => Math.abs(Number.isFinite(+e.delta) ? +e.delta : 0),
  type: e => e.type || ""
});

/**
 * The category label key and the fallback name of each item-based entry type.
 * @type {Readonly<Record<string, {type: string, fallback: string}>>}
 */
const ITEM_ENTRY_LABELS = Object.freeze({
  advantage: { type: "l5r4.ui.sheets.advantage", fallback: "Advantage" },
  disadvantage: { type: "l5r4.ui.sheets.disadvantage", fallback: "Disadvantage" },
  kata: { type: "l5r4.ui.sheets.kata", fallback: "Kata" },
  kiho: { type: "l5r4.ui.sheets.kiho", fallback: "Kiho" },
  spell: { type: "l5r4.character.experience.breakdown.spells", fallback: "Spell" }
});

/**
 * Legacy entries recognized by the raw i18n key in their note, in the order they are tried: the key the note holds,
 * the category label key, and the label key that replaces the note.
 * @type {ReadonlyArray<{marker: string, type: string, note: string}>}
 */
const LEGACY_ENTRY_LABELS = Object.freeze([
  {
    marker: "l5r4.character.experience.traitChange",
    type: "l5r4.character.experience.breakdown.traits",
    note: "l5r4.character.experience.fallbackLabels.traitIncrease"
  },
  {
    marker: "l5r4.character.experience.voidChange",
    type: "l5r4.character.experience.breakdown.void",
    note: "l5r4.character.experience.fallbackLabels.voidIncrease"
  },
  {
    marker: "l5r4.character.experience.skillCreate",
    type: "l5r4.character.experience.breakdown.skills",
    note: "l5r4.character.experience.fallbackLabels.skillCreated"
  },
  {
    marker: "l5r4.character.experience.skillChange",
    type: "l5r4.character.experience.breakdown.skills",
    note: "l5r4.character.experience.fallbackLabels.skillIncreased"
  }
]);

/**
 * Formats raw XP history entries for display in character sheets.
 *
 * Transforms calculator-generated entries into human-readable, localized strings with proper
 * type labels, progression notation, and optional user-driven sorting. Handles all L5R4 XP
 * purchase types: traits, void, skills, emphasis, advantages, disadvantages, kata, kiho, spells.
 *
 * Entry Processing:
 * 1. Maps entry types to localized category labels
 * 2. Formats progression strings ("Reflexes 2→3")
 * 3. Applies fallback labels for legacy/malformed entries
 * 4. Formats delta with sign prefix ("+12", "-3")
 * 5. Sorts by timestamp or user preference
 *
 * Fallback Logic:
 * formatLegacyEntryLabels handles legacy entries that may contain raw i18n keys instead of
 * proper type identifiers. This ensures backward compatibility with older character data.
 *
 * @param {Array<object>} entries - Raw XP entries from xp-calculator.buildXpHistory()
 * @param {object} [options={}] - Formatting options
 * @param {boolean} [options.sort=false] - Enable user preference sorting (requires actorId)
 * @param {string|null} [options.actorId=null] - Actor ID for retrieving sort preferences
 * @param {string} [options.scope="xp-purchases"] - Sort scope identifier
 * @param {object|null} [options.sortPref=null] - Override sort preference (bypasses stored preference)
 * @returns {Array<{id: string, deltaFormatted: string, note: string, type: string, delta: number, ts: number}>}
 *   Formatted entries ready for template rendering: the entry id, the XP cost with its sign ("+12", "-3"), a
 *   human-readable description, the localized category label, the raw XP cost (positive for expenditures,
 *   negative for gains), and the timestamp for chronological sorting
 */
export function formatXpEntries(entries, options = {}) {
  const { sort = false, actorId = null, scope = "xp-purchases", sortPref = null } = options || {};
  const formatted = entries.slice().map(formatXpEntry);
  if (sort && actorId) {
    const pref =
      sortPref ||
      getSortPref(actorId, scope, { allowedKeys: SORT_KEYS["xp-purchases"], defaultKey: "note" });
    return applySortPref(formatted, SORT_COLUMNS, { pref, locale: game.i18n?.lang });
  }
  return formatted.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

/**
 * Formats one raw XP entry for display: its category label, its note, and its signed cost.
 * @param {object} e - Raw XP entry from the calculator
 * @returns {{id: string, deltaFormatted: string, note: string, type: string, delta: number, ts: number}}
 */
function formatXpEntry(e) {
  const { type, note } = formatEntryLabels(e);
  return {
    id: e.id,
    deltaFormatted: (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "") + (e.delta ?? 0),
    note,
    type,
    delta: e.delta,
    ts: e.ts
  };
}

/**
 * The localized category label and the note of an entry, by its type: a rank progression for a Trait, the Void Ring,
 * or a Skill; the item's name for an item-based entry; the legacy labels otherwise.
 * @param {object} e - Raw XP entry from the calculator
 * @returns {{type: string, note: string}}
 */
function formatEntryLabels(e) {
  if (e.type === "trait" && e.traitLabel && e.toValue !== undefined) {
    return {
      type: game.i18n.localize("l5r4.character.experience.breakdown.traits"),
      note: formatProgression(e.traitLabel, e.fromValue, e.toValue)
    };
  }
  if (e.type === "void" && e.toValue !== undefined) {
    const voidLabel = game.i18n.localize("l5r4.ui.mechanics.rings.void");
    return {
      type: game.i18n.localize("l5r4.character.experience.breakdown.void"),
      note: formatProgression(voidLabel, e.fromValue, e.toValue)
    };
  }
  if (e.type === "skill" && e.skillName && e.toValue !== undefined) {
    return {
      type: game.i18n.localize("l5r4.character.experience.breakdown.skills"),
      note:
        e.emphasis || e.note?.includes("Emphasis:")
          ? e.note
          : formatProgression(e.skillName, e.fromValue, e.toValue)
    };
  }
  if (Object.hasOwn(ITEM_ENTRY_LABELS, e.type)) {
    const { type, fallback } = ITEM_ENTRY_LABELS[e.type];
    return { type: game.i18n.localize(type), note: formatItemEntry(e, fallback) };
  }
  return formatLegacyEntryLabels(e);
}

/**
 * The category label and note of an entry with no recognized type: older entries hold a raw i18n key in their note
 * instead of a type identifier, which keeps character data from before type tracking readable.
 * @param {object} e - Raw XP entry from the calculator
 * @returns {{type: string, note: string}}
 */
function formatLegacyEntryLabels(e) {
  const note = e.note || "";
  const legacy = LEGACY_ENTRY_LABELS.find(({ marker }) => note.includes(marker));
  if (legacy) {
    return { type: game.i18n.localize(legacy.type), note: game.i18n.localize(legacy.note) };
  }
  if (e.type) {
    return { type: e.type, note };
  }
  return {
    type: game.i18n.localize("l5r4.character.experience.breakdown.manualAdjustments"),
    note
  };
}

/**
 * Formats a rank progression for display.
 *
 * Creates a human-readable progression string showing rank changes.
 * If fromValue is undefined (new skill/trait), displays only the toValue.
 *
 * @param {string} label - The trait/skill name (localized)
 * @param {number} [fromValue] - Starting rank (undefined for new acquisitions)
 * @param {number} toValue - Ending rank
 * @returns {string} Formatted progression (e.g., "Kenjutsu 1→2" or "Iaijutsu 1")
 */
function formatProgression(label, fromValue, toValue) {
  return fromValue !== undefined ? `${label} ${fromValue}→${toValue}` : `${label} ${toValue}`;
}

/**
 * Extracts display name for item-based entries (advantages, disadvantages, kata, kiho).
 *
 * Tries itemName first, then note field, then fallback if neither exists.
 * Handles cases where entries may have incomplete data from older versions.
 *
 * @param {object} entry - Raw XP entry from calculator
 * @param {string} [entry.itemName] - Item name from actor.items
 * @param {string} [entry.note] - Legacy note field
 * @param {string} fallback - Fallback label if both fields missing
 * @returns {string} Display name for the entry
 */
function formatItemEntry(entry, fallback) {
  return entry.itemName || entry.note || fallback;
}
