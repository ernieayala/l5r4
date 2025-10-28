/**
 * XP Entry Formatter Service
 *
 * Formats raw XP history entries from xp-calculator for human-readable display in sheets.
 * Handles localization, progression labeling (e.g., "Reflexes 2→3"), item naming, and
 * optional sorting by user preference.
 *
 * Responsibilities:
 * - Localize entry types (traits, skills, advantages, etc.)
 * - Format progression notation for rank increases
 * - Apply fallback labels for legacy/malformed entries
 * - Sort entries by timestamp or user preference
 *
 * Game Mechanics:
 * - Traits: Cost 4 × new rank (e.g., Reflexes 2→3 = 12 XP)
 * - Void: Cost 6 × new rank (e.g., Void 2→3 = 18 XP)
 * - Skills: Cost equals next rank (e.g., 2→3 = 3 XP)
 * - Emphasis: 2 XP each
 * - Advantages/Disadvantages/Kata/Kiho: Listed cost from item
 * - Spells: Mastery level when memorized
 *
 * Foundry Integration:
 * - Uses game.i18n.localize() for all user-facing strings
 * - Requires Foundry v13+
 * - Integrates with sorting.js for user sort preferences
 *
 * @module services/xp/xp-formatter
 * @requires Foundry VTT v13+
 * @see module:services/xp/xp-calculator for raw entry generation
 */

import { getSortPref, sortWithPref } from "../../utils/sorting.js";

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
 * @private
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
 * @param {Object} entry - Raw XP entry from calculator
 * @param {string} [entry.itemName] - Item name from actor.items
 * @param {string} [entry.note] - Legacy note field
 * @param {string} fallback - Fallback label if both fields missing
 * @returns {string} Display name for the entry
 * @private
 */
function formatItemEntry(entry, fallback) {
  return entry.itemName || entry.note || fallback;
}

/**
 * Column extractors for sortable XP entry fields.
 *
 * Defines how to extract sortable values from formatted entries for user-driven sorting.
 * Used with sortWithPref from utils/sorting.js to enable column-click sorting in sheets.
 *
 * @typedef {Object} SortColumnExtractors
 * @property {Function} note - Extracts note text (string sort)
 * @property {Function} cost - Extracts absolute XP cost (numeric sort, ignores sign for gains/losses)
 * @property {Function} type - Extracts entry type category (string sort)
 *
 * @type {SortColumnExtractors}
 * @private
 */
const SORT_COLUMNS = {
  note: e => e.note || "",
  cost: e => Math.abs(Number.isFinite(+e.delta) ? +e.delta : 0),
  type: e => e.type || ""
};

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
 * Lines 60-76 handle legacy entries that may contain raw i18n keys instead of
 * proper type identifiers. This ensures backward compatibility with older character data.
 *
 * @param {Array<Object>} entries - Raw XP entries from xp-calculator.buildXpHistory()
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.sort=false] - Enable user preference sorting (requires actorId)
 * @param {string|null} [options.actorId=null] - Actor ID for retrieving sort preferences
 * @param {string} [options.scope="xp-purchases"] - Sort scope identifier
 * @param {Object|null} [options.sortPref=null] - Override sort preference (bypasses stored preference)
 * @returns {Array<Object>} Formatted entries ready for template rendering
 * @returns {string} return.id - Unique entry identifier
 * @returns {string} return.deltaFormatted - XP cost with sign ("+12", "-3")
 * @returns {string} return.note - Human-readable description
 * @returns {string} return.type - Localized category label
 * @returns {number} return.delta - Raw XP cost (positive for expenditures, negative for gains)
 * @returns {number} return.ts - Timestamp for chronological sorting
 */
export function formatXpEntries(entries, options = {}) {
  const { sort = false, actorId = null, scope = "xp-purchases", sortPref = null } = options || {};

  let formatted = entries.slice().map(e => {
    let formattedNote = e.note || "";
    let type = "";

    if (e.type === "trait" && e.traitLabel && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
      formattedNote = formatProgression(e.traitLabel, e.fromValue, e.toValue);
    } else if (e.type === "void" && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.void");
      const voidLabel = game.i18n.localize("l5r4.ui.mechanics.rings.void");
      formattedNote = formatProgression(voidLabel, e.fromValue, e.toValue);
    } else if (e.type === "skill" && e.skillName && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.skills");

      if (e.emphasis || e.note?.includes("Emphasis:")) {
        formattedNote = e.note;
      } else {
        formattedNote = formatProgression(e.skillName, e.fromValue, e.toValue);
      }
    } else if (e.type === "advantage") {
      type = game.i18n.localize("l5r4.ui.sheets.advantage");
      formattedNote = formatItemEntry(e, "Advantage");
    } else if (e.type === "disadvantage") {
      type = game.i18n.localize("l5r4.ui.sheets.disadvantage");
      formattedNote = formatItemEntry(e, "Disadvantage");
    } else if (e.type === "kata") {
      type = game.i18n.localize("l5r4.ui.sheets.kata");
      formattedNote = formatItemEntry(e, "Kata");
    } else if (e.type === "kiho") {
      type = game.i18n.localize("l5r4.ui.sheets.kiho");
      formattedNote = formatItemEntry(e, "Kiho");
    } else if (e.type === "spell") {
      type = game.i18n.localize("l5r4.character.experience.breakdown.spells");
      formattedNote = formatItemEntry(e, "Spell");
    } else {
      // Fallback for legacy entries that may have raw i18n keys instead of proper type identifiers.
      // This ensures backward compatibility with character data created before proper type tracking.
      if (formattedNote.includes("l5r4.character.experience.traitChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
        formattedNote = game.i18n.localize(
          "l5r4.character.experience.fallbackLabels.traitIncrease"
        );
      } else if (formattedNote.includes("l5r4.character.experience.voidChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.void");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.voidIncrease");
      } else if (formattedNote.includes("l5r4.character.experience.skillCreate")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.skillCreated");
      } else if (formattedNote.includes("l5r4.character.experience.skillChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
        formattedNote = game.i18n.localize(
          "l5r4.character.experience.fallbackLabels.skillIncreased"
        );
      } else if (e.type) {
        type = e.type;
      } else {
        type = game.i18n.localize("l5r4.character.experience.breakdown.manualAdjustments");
      }
    }

    return {
      id: e.id,
      deltaFormatted: (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "") + (e.delta ?? 0),
      note: formattedNote,
      type: type,
      delta: e.delta,
      ts: e.ts
    };
  });

  if (sort && actorId) {
    const pref = sortPref || getSortPref(actorId, scope, ["note", "cost", "type"], "note");
    formatted = sortWithPref(formatted, SORT_COLUMNS, pref);
  } else {
    formatted.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  return formatted;
}
