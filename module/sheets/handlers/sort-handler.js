/**
 * @fileoverview Sort Handler - Item List Sorting System
 * 
 * Manages sortable item lists in actor sheets with per-user, per-actor preferences.
 * Handles sort column clicks, visual indicators, and preference persistence.
 * 
 * **Responsibilities:**
 * - Initialize sort visual indicators on render
 * - Handle sort column header clicks
 * - Toggle sort direction for repeated clicks
 * - Persist sort preferences to user flags
 * - Update visual indicators (active class, direction)
 * 
 * **Integration:**
 * Used by BaseActorSheet and child sheets for consistent sorting behavior
 * across all item lists (skills, spells, advantages, etc.).
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag|BaseUser.getFlag}
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag|BaseUser.setFlag}
 */

import { SYS_ID } from "../../config/constants.js";
import { getSortPref, setSortPref } from "../../utils/sorting.js";

/**
 * Sort Handler Class
 * Manages item list sorting preferences and visual indicators.
 */
export class SortHandler {
  /**
   * Initialize sort visual indicators based on current sort preferences.
   * Sets the active column and sort direction indicators for list headers.
   * Should be called from child sheet's _onRender() method.
   * 
   * **Usage:**
   * ```javascript
   * // In child sheet's _onRender method:
   * SortHandler.initializeIndicators(root, actor.id, "skills", ["name", "rank", "trait", "emphasis"]);
   * ```
   * 
   * **Visual Indicators:**
   * - Active column receives `.is-active` CSS class
   * - Sort direction set via `data-dir="asc"` or `data-dir="desc"` attribute
   * - Inactive columns have neither class nor attribute
   * 
   * @param {HTMLElement} root - Sheet root element
   * @param {string} actorId - Actor ID for preference storage
   * @param {string} scope - Sort scope identifier (e.g., "skills", "spells", "advantages")
   * @param {string[]} allowedKeys - Array of allowed sort keys for this scope
   * @returns {void}
   * 
   * @see {@link #handleClick} - Click handler that updates sort preferences
   * @see {@link ../../utils/sorting.js|getSortPref} - Retrieves stored sort preference
   */
  static initializeIndicators(root, actorId, scope, allowedKeys) {
    try {
      const header = root.querySelector(`.item-list.-header[data-scope="${scope}"]`);
      if (!header) return;

      const pref = getSortPref(actorId, scope, allowedKeys, allowedKeys[0]);

      // Update visual indicators for all sort headers in this scope
      header.querySelectorAll('.item-sort-by').forEach(a => {
        const sortKey = a.dataset.sortby;
        const isActive = sortKey === pref.key;
        a.classList.toggle('is-active', isActive);
        
        if (isActive) {
          a.setAttribute('data-dir', pref.dir);
        } else {
          a.removeAttribute('data-dir');
        }
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to initialize sort indicators", { err, scope });
    }
  }

  /**
   * Generic unified sort click handler for list column headers.
   * Handles user clicks on sortable column headers, toggling sort direction
   * and updating visual indicators. Stores preferences per-user, per-actor.
   * 
   * **Event Delegation:**
   * This method should be called from sheet's `_onAction()` handler:
   * ```javascript
   * case "item-sort-by": 
   *   return SortHandler.handleClick(this.actor.id, event, element, 
   *     (scope) => this._getAllowedSortKeys(scope), () => this.render());
   * ```
   * 
   * **Template Requirements:**
   * - Headers need `<a class="item-sort-by" data-action="item-sort-by" data-sortby="{key}">`
   * - Parent header section needs `data-scope="{scope}"` attribute
   * 
   * **Sort Behavior:**
   * - First click on a column: Sort ascending by that column
   * - Second click on same column: Toggle to descending
   * - Click on different column: Sort ascending by new column
   * 
   * **Visual Feedback:**
   * - Updates `.is-active` class on clicked header
   * - Sets `data-dir` attribute to "asc" or "desc"
   * - Removes indicators from inactive columns
   * - Triggers sheet re-render to apply new sort
   * 
   * @param {string} actorId - Actor ID for preference storage
   * @param {MouseEvent} event - Click event from sort header
   * @param {HTMLElement} element - The clicked element with data-sortby attribute
   * @param {Function} getAllowedKeys - Function that returns allowed keys for a scope
   * @param {Function} renderSheet - Function to re-render the sheet
   * @returns {Promise<void>}
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag|BaseUser.getFlag}
   * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag|BaseUser.setFlag}
   * @see {@link ../../utils/sorting.js|getSortPref} - Read sort preference from user flags
   * @see {@link ../../utils/sorting.js|setSortPref} - Save sort preference to user flags
   * @see {@link #initializeIndicators} - Initialize visual indicators on render
   */
  static async handleClick(actorId, event, element, getAllowedKeys, renderSheet) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const el = /** @type {HTMLElement} */ (element || event.currentTarget);
      const header = /** @type {HTMLElement|null} */ (el.closest('.item-list.-header'));
      const scope = header?.dataset?.scope || "items";
      const key = el.dataset.sortby || "name";
      
      // Get allowed keys from provided function
      const allowed = getAllowedKeys?.(scope) ?? ["name"];
      
      // Validate sort key
      if (!allowed.includes(key)) {
        console.warn(`${SYS_ID}`, "Invalid sort key for scope", { scope, key, allowed });
        return;
      }
      
      // Get current preference and toggle direction if same key
      const cur = getSortPref(actorId, scope, allowed, allowed[0]);
      await setSortPref(actorId, scope, key, { toggleFrom: cur });
      
      // Update visual indicators before re-render
      if (header) {
        header.querySelectorAll('.item-sort-by').forEach(a => {
          a.classList.toggle('is-active', a === el);
          if (a !== el) a.removeAttribute('data-dir');
        });
        
        // Set direction indicator on the clicked element
        const newPref = getSortPref(actorId, scope, allowed, allowed[0]);
        el.setAttribute('data-dir', newPref.dir);
      }
      
      // Re-render sheet to apply new sort
      renderSheet();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Unified sort click failed", {
        err,
        actorId,
        scope: element?.closest('.item-list.-header')?.dataset?.scope
      });
    }
  }
}
