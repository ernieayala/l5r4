/**
 * @fileoverview L5R4 XP Formatter Service
 * 
 * Formats XP entry data for display in the XP Manager UI. Handles type-specific
 * formatting, localization, and sorting of experience point entries.
 * 
 * **Core Responsibilities:**
 * - **Entry Formatting**: Convert raw XP entries to display-ready objects
 * - **Type Categorization**: Apply type-specific labels and formatting
 * - **Localization**: Translate types and notes using i18n
 * - **Legacy Support**: Parse and format old-style entries
 * - **Sorting Integration**: Apply user preferences for list ordering
 * 
 * **Design Principles:**
 * - **Pure Functions**: No side effects, no mutations
 * - **Type Safety**: Defensive coding with fallbacks
 * - **Locale Aware**: Respects game.i18n for all strings
 * - **Extensible**: Easy to add new entry types
 * 
 * **Entry Types:**
 * - **trait**: Trait advancements (Stamina, Reflexes, etc.)
 * - **void**: Void Ring advancements
 * - **skill**: Skill ranks and emphases
 * - **advantage**: Purchased advantages
 * - **disadvantage**: Character disadvantages (grant XP)
 * - **kata**: Purchased kata
 * - **kiho**: Purchased kiho
 * - **legacy**: Untyped manual entries
 * 
 * **Format Result:**
 * ```javascript
 * {
 *   id: "abc123",              // Entry ID
 *   deltaFormatted: "+16",     // Display string with sign
 *   note: "Stamina 2→3",       // Human-readable description
 *   type: "Traits",            // Localized type label
 *   delta: 16,                 // Raw XP value
 *   ts: 1234567890             // Timestamp
 * }
 * ```
 * 
 * **Usage:**
 * ```javascript
 * import { formatXpEntries } from "./xp-formatter.js";
 * 
 * const formatted = formatXpEntries(rawEntries, {
 *   sort: true,
 *   sortPref: { key: "note", dir: "asc" },
 *   actorId: actor.id,
 *   scope: "xp-purchases"
 * });
 * ```
 * 
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link ../../apps/xp-manager.js|XP Manager} - UI that uses this service
 * @see {@link ../../utils/sorting.js|Sorting Utils} - Sort preference system
 */

import { getSortPref, sortWithPref } from "../../utils/sorting.js";

/**
 * Format XP entries for display with localization and type categorization.
 * Converts raw XP entry objects into display-ready format with localized
 * type labels, formatted delta values, and optional sorting.
 * 
 * **Formatting Rules:**
 * - **Delta**: Positive values get "+", negative get "-", zero gets ""
 * - **Type**: Uses stored type or parses legacy entries
 * - **Note**: Uses structured fields (traitLabel, skillName) or falls back to note field
 * - **Timestamp**: Preserved for sorting purposes
 * 
 * **Type-Specific Formatting:**
 * - **trait**: "Stamina 2→3" from traitLabel + fromValue + toValue
 * - **void**: "Void 2→3" using localized ring name
 * - **skill**: "Kenjutsu 3" or "Kenjutsu - Emphasis: Katana"
 * - **advantage/disadvantage/kata/kiho**: Uses itemName or note
 * - **legacy**: Attempts to parse old localization keys
 * 
 * **Sorting:**
 * When `options.sort` is true, applies user preferences from sorting system.
 * Default sorting is by timestamp (chronological order).
 * 
 * @param {Array<object>} entries - Raw XP entries to format
 * @param {object} [options] - Formatting options
 * @param {boolean} [options.sort=false] - Apply sorting preferences
 * @param {string} [options.actorId] - Actor ID for sort preferences (required if sort=true)
 * @param {string} [options.scope="xp-purchases"] - Sorting scope
 * @param {object} [options.sortPref] - Override sort preference (optional)
 * @returns {Array<object>} Formatted entries ready for display
 * 
 * @example
 * // Format without sorting (chronological)
 * const formatted = formatXpEntries(entries);
 * 
 * @example
 * // Format with user sort preferences
 * const formatted = formatXpEntries(entries, {
 *   sort: true,
 *   actorId: actor.id,
 *   scope: "xp-purchases"
 * });
 */
export function formatXpEntries(entries, options = {}) {
  const {
    sort = false,
    actorId = null,
    scope = "xp-purchases",
    sortPref = null
  } = options;

  // Map entries to formatted display objects
  let formatted = entries.slice().map(e => {
    let formattedNote = e.note || "";
    let type = "";
    
    // Use stored type and format note based on type, with fallback parsing for legacy entries
    if (e.type === "trait" && e.traitLabel && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
      formattedNote = e.fromValue !== undefined ? 
        `${e.traitLabel} ${e.fromValue}→${e.toValue}` : 
        `${e.traitLabel} ${e.toValue}`;
    } else if (e.type === "void" && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.void");
      formattedNote = e.fromValue !== undefined ? 
        `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${e.fromValue}→${e.toValue}` : 
        `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${e.toValue}`;
    } else if (e.type === "skill" && e.skillName && e.toValue !== undefined) {
      type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
      // Check if this is an emphasis entry (has emphasis field) or use the pre-formatted note
      if (e.emphasis || e.note?.includes("Emphasis:")) {
        formattedNote = e.note; // Use the pre-formatted note for emphasis
      } else {
        formattedNote = e.fromValue !== undefined ? 
          `${e.skillName} ${e.fromValue}→${e.toValue}` : 
          `${e.skillName} ${e.toValue}`;
      }
    } else if (e.type === "advantage") {
      type = game.i18n.localize("l5r4.ui.sheets.advantage");
      formattedNote = e.itemName || e.note || "Advantage";
    } else if (e.type === "disadvantage") {
      type = game.i18n.localize("l5r4.ui.sheets.disadvantage");
      formattedNote = e.itemName || e.note || "Disadvantage";
    } else if (e.type === "kata") {
      type = game.i18n.localize("l5r4.ui.sheets.kata");
      formattedNote = e.itemName || e.note || "Kata";
    } else if (e.type === "kiho") {
      type = game.i18n.localize("l5r4.ui.sheets.kiho");
      formattedNote = e.itemName || e.note || "Kiho";
    } else {
      // Parse legacy entries based on localization keys in notes
      if (formattedNote.includes("l5r4.character.experience.traitChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.traitIncrease");
      } else if (formattedNote.includes("l5r4.character.experience.voidChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.void");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.voidIncrease");
      } else if (formattedNote.includes("l5r4.character.experience.skillCreate")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.skillCreated");
      } else if (formattedNote.includes("l5r4.character.experience.skillChange")) {
        type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
        formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.skillIncreased");
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

  // Apply sorting if requested
  if (sort && actorId) {
    const pref = sortPref || getSortPref(actorId, scope, ["note", "cost", "type"], "note");
    const columns = {
      note: (e) => e.note || "",
      cost: (e) => Math.abs(Number.isFinite(+e.delta) ? +e.delta : 0),
      type: (e) => e.type || ""
    };
    formatted = sortWithPref(formatted, columns, pref);
  } else {
    // Default sort by timestamp (chronological)
    formatted.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  return formatted;
}
