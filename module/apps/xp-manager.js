/**
 * @fileoverview L5R4 XP Manager Application for Foundry VTT v13+
 * 
 * This module provides a comprehensive experience point management interface for L5R4 characters,
 * built on Foundry's modern ApplicationV2 architecture. It replaces the legacy Dialog-based modal
 * with a more robust and maintainable solution while preserving the familiar user interface.
 *
 * **Core Responsibilities:**
 * - **XP Tracking**: Comprehensive experience point breakdown and history management
 * - **Manual Adjustments**: GM and player tools for XP modifications with audit trails
 * - **Purchase History**: Automatic reconstruction of XP expenditures from character data
 * - **Legacy Migration**: Retroactive data format updates for existing characters
 * - **Real-time Updates**: Live synchronization with character sheet changes
 *
 * **Key Features:**
 * - **Automatic XP Calculation**: Rebuilds XP history from traits, skills, void, and advantages
 * - **Manual Entry System**: Add/remove XP with notes and timestamps for record keeping
 * - **Type Categorization**: Organized display by expenditure type (traits, skills, advantages, etc.)
 * - **Legacy Data Support**: Handles migration from old XP tracking formats
 * - **Audit Trail**: Complete history of all XP changes with timestamps and descriptions
 *
 * **ApplicationV2 Architecture:**
 * - **HandlebarsApplicationMixin**: Modern template rendering with async context preparation
 * - **Form Integration**: Native form handling with action delegation system
 * - **Unique Identification**: Actor-specific window IDs prevent conflicts
 * - **Responsive Layout**: Resizable window with optimized dimensions
 * - **Event Delegation**: Clean action-based event handling system
 *
 * **XP Calculation System:**
 * The manager automatically reconstructs XP expenditures by analyzing:
 * - **Traits**: Cost calculated using L5R4 progression (4×rank) with family bonuses
 * - **Void Ring**: Separate progression (6×rank) with discount support
 * - **Skills**: Rank-based costs with school skill free rank handling
 * - **Emphases**: Fixed 2 XP cost with free emphasis support for school skills
 * - **Advantages**: Direct cost from item system data
 * - **Disadvantages**: Direct cost from item system data (displayed as negative XP)
 * - **Kata**: Direct cost from item system data
 * - **Kiho**: Direct cost from item system data
 *
 * **Data Migration Features:**
 * - **Retroactive Updates**: Rebuilds XP history from current character state
 * - **Legacy Format Support**: Handles old XP tracking data structures
 * - **Type Standardization**: Ensures consistent entry formatting and categorization
 * - **Timestamp Generation**: Creates logical timestamps for historical entries
 * - **Error Recovery**: Graceful handling of corrupted or missing XP data
 *
 * **Usage Examples:**
 * ```javascript
 * // Open XP manager for an actor
 * const xpManager = new XpManagerApplication(actor);
 * await xpManager.render(true);
 * 
 * // Add manual XP adjustment
 * await actor.setFlag('l5r4', 'xpManual', [...existing, {
 *   id: foundry.utils.randomID(),
 *   delta: 10,
 *   note: 'Session reward',
 *   ts: Date.now()
 * }]);
 * ```
 *
 * **Performance Considerations:**
 * - **Lazy Calculation**: XP history rebuilt only when manager opens
 * - **Efficient Updates**: Uses Foundry's flag system for minimal data changes
 * - **Template Caching**: Handlebars templates cached for fast rendering
 * - **Event Optimization**: Action delegation reduces event listener overhead
 *
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html|ApplicationV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#setFlag|Document.setFlag}
 */

import { SYS_ID } from "../config/constants.js";
import { getSortPref, setSortPref } from "../utils/sorting.js";
import { buildXpHistory } from "../services/xp/xp-calculator.js";
import { formatXpEntries } from "../services/xp/xp-formatter.js";
import { needsRetroactiveUpdate, calculateXpDataVersion } from "../services/xp/xp-versioning.js";

/**
 * XP Manager Application using ApplicationV2 architecture.
 * Provides experience point management with breakdown, manual adjustments, and purchase history.
 * 
 * @class XpManagerApplication
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 * @memberof module:apps
 */
export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  
  /**
   * Default ApplicationV2 configuration options.
   * Defines window behavior, styling, dimensions, and action handlers.
   * 
   * @static
   * @type {object}
   * @property {string} id - Unique window identifier pattern using actor ID
   * @property {string[]} classes - CSS classes applied to application element
   * @property {string} tag - HTML tag for root element (form for native submission)
   * @property {object} window - Window behavior configuration
   * @property {object} position - Default window dimensions
   * @property {object} actions - Map of action names to handler methods
   */
  static DEFAULT_OPTIONS = {
    id: "xp-manager-{id}",
    classes: ["l5r4", "xp-modal-dialog"],
    tag: "form",
    window: {
      title: "l5r4.character.experience.xpLog",
      icon: "fas fa-star",
      resizable: true
    },
    position: {
      width: 600,
      height: 700
    },
    actions: {
      "xp-add-confirm": XpManagerApplication.prototype._onAddXp,
      "xp-delete-manual": XpManagerApplication.prototype._onDeleteEntry,
      "item-sort-by": XpManagerApplication.prototype._onSortClick,
      "recalculate-xp-purchase": XpManagerApplication.prototype._onRecalculateXpPurchase
    }
  };

  /**
   * ApplicationV2 template parts configuration.
   * Defines Handlebars templates used for rendering the application.
   * 
   * @static
   * @type {object}
   * @property {object} form - Main form template configuration
   * @property {string} form.template - Path to Handlebars template file
   */
  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/xp-manager.hbs`
    }
  };

  /**
   * Creates a new XP Manager instance for the specified actor.
   * Initializes ApplicationV2 with actor-specific window ID to prevent conflicts.
   * 
   * @param {Actor} actor - The actor whose XP to manage
   * @param {object} [options={}] - ApplicationV2 configuration overrides
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /**
   * Prepare context data for the XP Manager template.
   * Updates XP data if needed and formats entries for display using services.
   * 
   * @private
   * @async
   * @param {object} [options] - Render options passed by ApplicationV2
   * @returns {Promise<object>} Template context object
   * @returns {Promise<object>} context.xp - XP summary with spent, total, available, and breakdown
   * @returns {Promise<Array<object>>} context.manualEntries - Formatted manual XP entries
   * @returns {Promise<Array<object>>} context.spentEntries - Formatted purchase history entries
   * @returns {Promise<number>} context.manualTotal - Sum of manual adjustments
   * @returns {Promise<number>} context.spentTotal - Sum of XP purchases
   */
  async _prepareContext() {
    // Only run retroactive update if needed to avoid timing issues with character sheet
    if (await needsRetroactiveUpdate(this.actor)) {
      await this._performRetroactiveUpdate();
    }
    const sys = this.actor.system ?? {};
    const xp = sys?._xp ?? {};
    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? ns.xpManual : [];
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent : [];

    // Format entries using service
    const manualEntries = formatXpEntries(manual, { sort: false });
    const spentEntries = formatXpEntries(spent, { 
      sort: true, 
      actorId: this.actor.id,
      scope: "xp-purchases"
    });
    
    // Safely sum deltas, handling null/invalid entries
    const manualTotal = manual.reduce((s, e) => {
      if (!e || typeof e !== 'object') return s;
      return s + (Number.isFinite(+e.delta) ? +e.delta : 0);
    }, 0);
    const spentTotal = spent.reduce((s, e) => {
      if (!e || typeof e !== 'object') return s;
      return s + (Number.isFinite(+e.delta) ? +e.delta : 0);
    }, 0);

    return {
      xp: {
        spent: xp.spent ?? 0,
        total: xp.total ?? 40,
        available: xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0),
        breakdown: {
          base: xp?.breakdown?.base ?? 40,
          disadvantagesGranted: xp?.breakdown?.disadvantagesGranted ?? 0,
          manual: xp?.breakdown?.manual ?? 0,
          traits: xp?.breakdown?.traits ?? 0,
          void: xp?.breakdown?.void ?? 0,
          skills: xp?.breakdown?.skills ?? 0,
          advantages: xp?.breakdown?.advantages ?? 0,
          kata: xp?.breakdown?.kata ?? 0,
          kiho: xp?.breakdown?.kiho ?? 0
        }
      },
      manualEntries,
      spentEntries,
      manualTotal,
      spentTotal
    };
  }

  /**
   * Handle adding XP from form submission.
   * Reads amount and note from form fields, validates, and adds to xpManual flag.
   * 
   * @private
   * @async
   * @param {PointerEvent} event - The click event from action delegation
   * @param {HTMLElement} target - The clicked button element
   * @returns {Promise<void>} Resolves after flag update and re-render
   * 
   * @remarks
   * - Silently ignores zero-value entries
   * - Creates entry with random ID and current timestamp
   * - Clears form on success and triggers re-render
   * - Logs warning and preserves form state on setFlag failure
   */
  async _onAddXp(event, target) {
    event.preventDefault();
    
    const form = this.element;
    const amount = Number(form.querySelector('#xp-amount')?.value) || 0;
    const note = form.querySelector('#xp-note')?.value?.trim() || "";
    
    if (amount === 0) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    manual.push({
      id: foundry.utils.randomID(),
      delta: amount,
      note,
      ts: Date.now()
    });

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);
      
      // Reset to default values for next entry (defensive - form may be destroyed)
      const amountField = form.querySelector('#xp-amount');
      const noteField = form.querySelector('#xp-note');
      if (amountField) amountField.value = "1";
      if (noteField) noteField.value = "";
      
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Handle deleting a manual XP entry.
   * Removes the specified entry from xpManual flag and re-renders.
   * 
   * @private
   * @async
   * @param {PointerEvent} event - The click event from action delegation
   * @param {HTMLElement} target - The clicked delete button element with data-entry-id
   * @returns {Promise<void>} Resolves after flag update and re-render
   */
  async _onDeleteEntry(event, target) {
    event.preventDefault();
    
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    const filtered = manual.filter(e => e.id !== entryId);

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", filtered);
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Handle sorting XP purchases by column.
   * Updates sort preference and visual indicators, then re-renders.
   * 
   * @private
   * @async
   * @param {PointerEvent} event - The click event from action delegation
   * @param {HTMLElement} target - The clicked sort header element with data-sortby
   * @returns {Promise<void>} Resolves after sort preference update
   */
  async _onSortClick(event, target) {
    event.preventDefault();
    event.stopPropagation();
    
    const header = target.closest('.item-list.-header');
    const scope = header?.dataset?.scope || "xp-purchases";
    const key = target.dataset.sortby || "note";
    const allowed = ["note", "cost", "type"];
    
    if (!allowed.includes(key)) return;
    
    const cur = getSortPref(this.actor.id, scope, allowed, "note");
    await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });
    
    // Update visual indicators
    if (header) {
      header.querySelectorAll('.item-sort-by').forEach(a => {
        a.classList.toggle('is-active', a === target);
        if (a !== target) a.removeAttribute('data-dir');
      });
      
      // Set direction indicator on active element
      const newPref = getSortPref(this.actor.id, scope, allowed, "note");
      target.setAttribute('data-dir', newPref.dir);
    }
    
    this.render();
  }

  /**
   * Handle recalculating XP purchases from current character state.
   * Forces a retroactive XP update and re-renders the manager to show changes.
   * 
   * @private
   * @async
   * @param {PointerEvent} event - The click event from action delegation
   * @param {HTMLElement} target - The clicked recalculate button element
   * @returns {Promise<void>} Resolves after recalculation and notification
   */
  async _onRecalculateXpPurchase(event, target) {
    event.preventDefault();
    
    try {
      // Force retroactive update by clearing the version flag
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);
      
      // Run the retroactive update
      await this._performRetroactiveUpdate();
      
      ui.notifications?.info(game.i18n.localize("l5r4.character.experience.recalculateSuccess"));
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to recalculate XP purchases", err);
      ui.notifications?.error(game.i18n.localize("l5r4.character.experience.recalculateFailed"));
    }
  }

  /**
   * Perform retroactive XP update using the calculator service.
   * Rebuilds XP history from current character state and updates flags.
   * 
   * @private
   * @async
   * @returns {Promise<void>} Resolves when XP history is rebuilt and flags updated
   * 
   * @remarks
   * - Compares new history to existing to avoid unnecessary updates
   * - Marks current data version as processed to prevent re-runs
   * - Logs warning but does not throw on failure
   */
  async _performRetroactiveUpdate() {
    try {
      // Build XP history using service
      const spent = await buildXpHistory(this.actor);
      
      // Get existing spent data for comparison
      const flags = this.actor.flags?.[SYS_ID] ?? {};
      const existingSpent = Array.isArray(flags.xpSpent) ? flags.xpSpent : [];
      
      // Update if data changed (additions, removals, or order)
      const changed = JSON.stringify(existingSpent) !== JSON.stringify(spent);
      if (changed) {
        await this.actor.setFlag(SYS_ID, "xpSpent", spent);
      }
      
      // Mark this version as processed
      const currentVersion = calculateXpDataVersion(this.actor);
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to perform retroactive XP update", err);
    }
  }
}
