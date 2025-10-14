/**
 * Sort Handler for Item Lists
 *
 * Manages user-initiated column sorting for actor item lists (skills, weapons, techniques, etc.).
 * Handles click events on sortable column headers, updates visual indicators (active column, direction),
 * persists preferences via user flags, and triggers sheet re-renders.
 *
 * Integration with Foundry VTT v13+:
 * - Uses Application v2 event delegation pattern (event handlers receive event + target element)
 * - Manipulates DOM directly for visual indicator updates (classList, data attributes)
 * - Integrates with user flag system via sorting.js utilities (getSortPref, setSortPref)
 *
 * Visual Indicator Convention:
 * - `.item-sort-by` elements receive `.is-active` class when they're the active sort column
 * - `data-dir="asc"|"desc"` attribute shows current sort direction on active column
 * - Relies on CSS to render direction arrows based on these attributes
 *
 * @module sheets/handlers/sort-handler
 * @requires Foundry VTT v13+ (Application v2 event patterns, User.flags API)
 */

import { SYS_ID } from "../../config/constants.js";
import { getSortPref, setSortPref } from "../../utils/sorting.js";

/**
 * Static utility class for handling sortable column header interactions.
 *
 * Designed for use with Foundry v13's Application v2 event delegation system.
 * All methods are static - no instance creation required. Handlers are meant
 * to be called from sheet event delegation callbacks with appropriate parameters.
 *
 * Typical workflow:
 * 1. User clicks a `.item-sort-by` element in an `.item-list.-header`
 * 2. Sheet's delegated event handler calls `SortHandler.handleClick(...)`
 * 3. Handler updates user preferences, visual indicators, and triggers re-render
 * 4. Sheet re-renders with newly sorted item list
 *
 * @class SortHandler
 * @static
 */
export class SortHandler {
  /**
   * Updates visual indicators for sortable column headers.
   *
   * Applies `.is-active` class to the currently active sort column and sets
   * its `data-dir` attribute to show sort direction. Removes indicators from
   * all other columns. CSS uses these attributes to render direction arrows.
   *
   * @param {HTMLElement} header - The `.item-list.-header` container element
   * @param {string} activeKey - The data-sortby value of the active column
   * @param {"asc"|"desc"} direction - Current sort direction for the active column
   * @private
   */
  static _updateVisualIndicators(header, activeKey, direction) {
    header.querySelectorAll(".item-sort-by").forEach(a => {
      const sortKey = a.dataset.sortby;
      const isActive = sortKey === activeKey;
      a.classList.toggle("is-active", isActive);

      if (isActive) {
        a.setAttribute("data-dir", direction);
      } else {
        a.removeAttribute("data-dir");
      }
    });
  }

  /**
   * Initializes visual sort indicators on sheet render based on stored preferences.
   *
   * Called during sheet render to restore the user's last sort state for a given
   * scope (skills, weapons, etc.). Reads preferences from user flags via getSortPref
   * and updates the DOM accordingly.
   *
   * Safe to call even if the header element doesn't exist - fails gracefully with
   * a console warning.
   *
   * @param {HTMLElement} root - The sheet's root element (Application v2 pattern)
   * @param {string} actorId - The actor's UUID or ID for preference lookup
   * @param {string} scope - Sort scope identifier (e.g., "skills", "weapons", "techniques")
   * @param {string[]} allowedKeys - Valid sort keys for this scope (security whitelist)
   * @static
   */
  static initializeIndicators(root, actorId, scope, allowedKeys) {
    try {
      const header = root.querySelector(`.item-list.-header[data-scope="${scope}"]`);
      if (!header) return;

      const pref = getSortPref(actorId, scope, allowedKeys, allowedKeys[0]);
      this._updateVisualIndicators(header, pref.key, pref.dir);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to initialize sort indicators", { err, scope });
    }
  }

  /**
   * Handles click events on sortable column headers with toggle logic.
   *
   * Implements Application v2 event delegation pattern - receives both the event
   * and the target element. Validates the sort key against allowed keys, persists
   * the new preference to user flags, updates visual indicators, and triggers a
   * sheet re-render with the new sort order.
   *
   * Toggle behavior:
   * - First click on a column: Sort by that column ascending
   * - Second click on same column: Toggle to descending
   * - Click on different column: Switch to new column ascending
   *
   * Error handling:
   * - Invalid sort keys are rejected with a warning (doesn't crash the sheet)
   * - Missing DOM elements handled gracefully with fallbacks
   * - Errors are logged but don't prevent re-render
   *
   * @param {string} actorId - The actor's UUID or ID for preference storage
   * @param {Event} event - The DOM click event (preventDefault called automatically)
   * @param {HTMLElement} element - The clicked `.item-sort-by` element (Application v2 pattern)
   * @param {Function} getAllowedKeys - Callback to get valid keys for a scope: (scope) => string[]
   * @param {Function} renderSheet - Callback to trigger sheet re-render after sort change
   * @returns {Promise<void>}
   * @async
   * @static
   */
  static async handleClick(actorId, event, element, getAllowedKeys, renderSheet) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const el = element || event.currentTarget;
      const header = el.closest(".item-list.-header");
      const scope = header?.dataset?.scope || "items";
      const key = el.dataset.sortby || "name";

      const allowed = getAllowedKeys?.(scope) ?? ["name"];

      if (!allowed.includes(key)) {
        console.warn(`${SYS_ID}`, "Invalid sort key for scope", { scope, key, allowed });
        return;
      }

      const cur = getSortPref(actorId, scope, allowed, allowed[0]);
      await setSortPref(actorId, scope, key, { toggleFrom: cur });

      if (header) {
        const newPref = getSortPref(actorId, scope, allowed, allowed[0]);
        this._updateVisualIndicators(header, newPref.key, newPref.dir);
      }

      renderSheet();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Unified sort click failed", {
        err,
        actorId,
        scope: element?.closest(".item-list.-header")?.dataset?.scope
      });
    }
  }
}
