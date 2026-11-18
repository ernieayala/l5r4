/**
 * @module sheets/handlers/sort-handler
 * @description Column sorting for actor item lists (skills, weapons, techniques, and the rest): a click on a sortable
 * column header stores the user's preference in user flags (getSortPref, updateSortPref) and re-renders the sheet,
 * whose sort header shows the stored sort (templates/actor/_partials/_sort-header.hbs).
 */

import { SYS_ID } from "../../config/constants.js";
import { getSortPref, updateSortPref } from "../../services/sort-preferences.js";

/**
 * Static utility class for handling sortable column header interactions.
 *
 * Designed for use with Foundry's Application v2 event delegation system.
 * All methods are static - no instance creation required. Handlers are meant
 * to be called from sheet event delegation callbacks with appropriate parameters.
 *
 * Typical workflow:
 * 1. User clicks a `[data-action="sort-items"]` head in a `[data-sort-header]` list
 * 2. Sheet's delegated event handler calls `SortHandler.updateSortPref(...)`
 * 3. Handler stores the user's preference and triggers a re-render
 * 4. Sheet re-renders with the newly sorted list and its header marked
 *
 * @class SortHandler
 */
export class SortHandler {
  /**
   * Handles click events on sortable column headers with toggle logic.
   *
   * Implements Application v2 event delegation pattern - receives both the event
   * and the target element. Validates the sort key against allowed keys, persists
   * the new preference to user flags, and triggers a sheet re-render with the new sort order.
   *
   * Toggle behavior:
   * - First click on a column: Sort by that column ascending
   * - Second click on same column: Toggle to descending
   * - Click on different column: Switch to new column ascending
   *
   * Error handling:
   * - Invalid sort keys are rejected with a warning (doesn't crash the sheet)
   * - Errors are logged but don't prevent re-render.
   *
   * @param {Event} event - The DOM click event (preventDefault called automatically)
   * @param {HTMLElement} element - The clicked `[data-action="sort-items"]` head (Application v2 pattern)
   * @param {object} options
   * @param {string} options.actorId - The actor's UUID or ID for preference storage
   * @param {Function} options.getAllowedKeys - Callback to get valid keys for a scope: (scope) => string[]
   * @param {Function} options.renderSheet - Callback to trigger sheet re-render after sort change
   * @returns {Promise<void>}
   */
  static async updateSortPref(event, element, { actorId, getAllowedKeys, renderSheet }) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const el = element || event.currentTarget;
      const header = el.closest("[data-sort-header]");
      const scope = header?.dataset?.scope || "items";
      const key = el.dataset.sortBy || "name";

      const allowed = getAllowedKeys?.(scope) ?? ["name"];

      if (!allowed.includes(key)) {
        console.warn(`${SYS_ID}`, "Invalid sort key for scope", { scope, key, allowed });
        return;
      }

      const cur = getSortPref(actorId, scope, { allowedKeys: allowed, defaultKey: allowed[0] });
      await updateSortPref(actorId, scope, { key, toggleFrom: cur });

      renderSheet();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Unified sort click failed", {
        err,
        actorId,
        scope: element?.closest("[data-sort-header]")?.dataset?.scope
      });
    }
  }
}
