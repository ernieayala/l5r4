/**
 * XP Manager Application
 *
 * Provides a comprehensive interface for managing character experience points including
 * manual XP entries, automatic XP spending tracking, and disadvantage cap management.
 *
 * Key Responsibilities:
 * - **Manual XP Management**: Add and delete manual XP entries with notes
 * - **XP Spending Tracking**: Display automatic XP spending from character purchases
 * - **Sorting**: Sort XP entries by date, amount, or type
 * - **Disadvantage Cap**: Configure disadvantage XP cap for character creation
 * - **Retroactive Updates**: Handle XP data versioning and migrations
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses actor flags for XP data storage
 * - Uses data-action delegation for event handling
 * - Integrates with XP calculation services
 *
 * Architectural Notes:
 * - **No DebouncedFieldMixin**: Complex manual entry system with discrete add/delete actions
 * - **Actor-based constructor**: Standard pattern for actor configuration dialogs
 * - **No form submission**: Multiple action buttons for different operations (add, delete, sort, recalculate)
 * - **Sorting integration**: Uses persistent sort preferences via getSortPref/setSortPref utilities
 *
 * @module apps/xp-manager
 */

// Config imports
import { SYS_ID } from "../config/constants.js";

// Utils imports
import { T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { getSortPref, setSortPref } from "../utils/sorting.js";
import { logError } from "../utils/error-logging.js";

// Services imports
import { buildXpHistory } from "../services/xp/xp-calculator.js";
import { formatXpEntries } from "../services/xp/xp-formatter.js";
import { needsRetroactiveUpdate, calculateXpDataVersion } from "../services/xp/xp-versioning.js";

export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "xp-manager-{id}",
    classes: ["l5r4", "xp-modal-dialog"],
    tag: "form",
    window: {
      title: "l5r4.apps.xpManager.title",
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
      "recalculate-xp-purchase": XpManagerApplication.prototype._onRecalculateXpPurchase,
      "change-disadvantage-cap": XpManagerApplication.prototype._onChangeDisadvantageCap
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/xp-manager.hbs`
    }
  };

  /**
   * Create a new XpManagerApplication instance.
   *
   * @param {Actor} actor - The actor whose XP is being managed
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("XpManagerApplication requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `xp-manager-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
  }

  /**
   * Dynamic window title including actor name.
   *
   * @returns {string} Localized title with actor name
   */
  get title() {
    const baseTitle = T("l5r4.apps.xpManager.title");
    return `${baseTitle}: ${this.actor?.name ?? "Unknown"}`;
  }

  /**
   * Retrieve actor flags for the system.
   *
   * @returns {object} Actor flags object or empty object if unavailable
   * @private
   */
  _getFlags() {
    return this.actor.flags?.[SYS_ID] ?? {};
  }

  /**
   * Retrieve manual XP entries from actor flags.
   *
   * @param {boolean} [duplicate=false] - Whether to return a deep copy
   * @returns {Array} Array of manual XP entries
   * @private
   */
  _getXpManual(duplicate = false) {
    const flags = this._getFlags();
    const manual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
    return duplicate ? foundry.utils.duplicate(manual) : manual;
  }

  /**
   * Retrieve cached XP spending entries from actor flags.
   *
   * @returns {Array} Array of XP spending entries
   * @private
   */
  _getXpSpent() {
    const flags = this._getFlags();
    return Array.isArray(flags.xpSpentCache) ? flags.xpSpentCache : [];
  }

  /**
   * Calculate total XP delta from array of entries.
   * Sums delta values, ignoring invalid entries.
   *
   * @param {Array} entries - Array of XP entries with delta properties
   * @returns {number} Total XP delta
   * @private
   */
  _calculateTotal(entries) {
    return entries.reduce((s, e) => {
      if (!e || typeof e !== "object") {
        return s;
      }
      return s + (Number.isFinite(+e.delta) ? +e.delta : 0);
    }, 0);
  }

  /**
   * Prepare context data for rendering the XP manager.
   * Retrieves XP data, manual entries, spending history, and disadvantage cap.
   * Performs retroactive updates if needed.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with XP data and entries
   * @private
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "XpManager: No actor reference");
      return this._getFallbackContext();
    }

    try {
      if (await needsRetroactiveUpdate(this.actor)) {
        await this._performRetroactiveUpdate();
      }
      const sys = this.actor.system ?? {};
      const xp = sys?._xp ?? {};
      const manual = this._getXpManual();
      const spent = this._getXpSpent();

      const manualEntries = formatXpEntries(manual, { sort: false });
      const spentEntries = formatXpEntries(spent, {
        sort: true,
        actorId: this.actor.id,
        scope: "xp-purchases"
      });

      const manualTotal = this._calculateTotal(manual);
      const spentTotal = this._calculateTotal(spent);

      const flags = this._getFlags();
      const disadvantageCap = Number.isFinite(+flags.disadvantageCap)
        ? Number(flags.disadvantageCap)
        : 10;

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
            kiho: xp?.breakdown?.kiho ?? 0,
            spells: xp?.breakdown?.spells ?? 0
          }
        },
        disadvantageCap,
        manualEntries,
        spentEntries,
        manualTotal,
        spentTotal
      };
    } catch (err) {
      logError("Failed to prepare XP manager context", err, {
        actorId: this.actor?.id
      });
      return this._getFallbackContext();
    }
  }

  /**
   * Provide fallback context when actor data is unavailable or errors occur.
   * Returns safe default values to prevent rendering failures.
   *
   * @returns {object} Fallback context with default values
   * @private
   */
  _getFallbackContext() {
    return {
      xp: {
        spent: 0,
        total: 40,
        available: 40,
        breakdown: {
          base: 40,
          disadvantagesGranted: 0,
          manual: 0,
          traits: 0,
          void: 0,
          skills: 0,
          advantages: 0,
          kata: 0,
          kiho: 0,
          spells: 0
        }
      },
      disadvantageCap: 10,
      manualEntries: [],
      spentEntries: [],
      manualTotal: 0,
      spentTotal: 0
    };
  }

  /**
   * Handle add XP action.
   * Extracts amount and note from form, creates new manual XP entry,
   * and clears form fields after successful addition.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onAddXp(event, _target) {
    event.preventDefault();

    const form = this.element;
    const amount = toInt(form.querySelector("[data-field='xp-amount']")?.value, 0);
    const note = form.querySelector("[data-field='xp-note']")?.value?.trim() || "";

    if (amount === 0) {
      return;
    }

    const manual = this._getXpManual(true);
    manual.push({
      id: foundry.utils.randomID(),
      delta: amount,
      note,
      ts: Date.now()
    });

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);

      const amountField = form.querySelector("[data-field='xp-amount']");
      const noteField = form.querySelector("[data-field='xp-note']");
      if (amountField) {
        amountField.value = "1";
      }
      if (noteField) {
        noteField.value = "";
      }

      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("actor.setFlag failed in XpManagerApplication", err, {
        actorId: this.actor?.id
      });
    }
  }

  /**
   * Handle delete manual XP entry action.
   * Removes entry by ID from manual XP entries.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element with data-entry-id attribute
   * @private
   */
  async _onDeleteEntry(event, target) {
    event.preventDefault();

    const entryId = target.dataset.entryId;
    if (!entryId) {
      return;
    }

    const manual = this._getXpManual(true);
    const filtered = manual.filter(e => e.id !== entryId);

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", filtered);
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("actor.setFlag failed in XpManagerApplication", err, {
        actorId: this.actor?.id
      });
    }
  }

  /**
   * Handle sort column click action.
   * Toggles sort direction and updates sort preferences for XP entries.
   * Allowed sort keys: note, cost, type.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked sort header with data-sortby attribute
   * @private
   */
  async _onSortClick(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const header = target.closest(".item-list.-header");
    const scope = header?.dataset?.scope || "xp-purchases";
    const key = target.dataset.sortby || "note";
    const allowed = ["note", "cost", "type"];

    if (!allowed.includes(key)) {
      return;
    }

    const cur = getSortPref(this.actor.id, scope, allowed, "note");
    await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });

    if (header) {
      header.querySelectorAll(".item-sort-by").forEach(a => {
        a.classList.toggle("is-active", a === target);
        if (a !== target) {
          a.removeAttribute("data-dir");
        }
      });

      const newPref = getSortPref(this.actor.id, scope, allowed, "note");
      target.setAttribute("data-dir", newPref.dir);
    }

    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Handle recalculate XP purchases action.
   * Resets retroactive version flag and rebuilds XP spending history.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onRecalculateXpPurchase(event, _target) {
    event.preventDefault();

    try {
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);

      await this._performRetroactiveUpdate();

      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to recalculate XP purchases", err, {
        actorId: this.actor?.id
      });
    }
  }

  /**
   * Handle change disadvantage cap action.
   * Displays dialog for entering new disadvantage XP cap value.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onChangeDisadvantageCap(event, _target) {
    event.preventDefault();

    const flags = this._getFlags();
    const currentCap = Number.isFinite(+flags.disadvantageCap) ? Number(flags.disadvantageCap) : 10;

    const content = await foundry.applications.handlebars.renderTemplate(
      `systems/${SYS_ID}/templates/dialogs/disadvantage-cap-dialog.hbs`,
      { currentCap }
    );

    try {
      const newCap = await foundry.applications.api.DialogV2.prompt({
        window: { title: T("l5r4.apps.xpManager.disadvantageCapTitle") },
        content,
        ok: {
          label: T("l5r4.ui.label.ok"),
          callback: (_e, b, d) => {
            const form = b.form ?? d.form;
            const input = form?.querySelector("[data-field='disadvantage-cap']");
            return input ? toInt(input.value, null) : null;
          }
        },
        cancel: { label: T("l5r4.ui.label.cancel") },
        rejectClose: false,
        modal: true
      });

      if (newCap !== null && Number.isFinite(newCap) && newCap >= 0) {
        await this.actor.setFlag(SYS_ID, "disadvantageCap", newCap);
        if (this.rendered) {
          this.render();
        }
      }
    } catch (err) {
      if (err) {
        logError("Failed to set disadvantage cap", err, {
          actorId: this.actor?.id
        });
      }
    }
  }

  /**
   * Perform retroactive XP update.
   * Rebuilds XP spending history from actor items and updates version flag.
   * Only updates cache if spending history has changed.
   *
   * @private
   */
  async _performRetroactiveUpdate() {
    try {
      // Rebuild XP spending history from current actor items
      // This recalculates all XP costs based on current item data
      const retroactiveSpent = await buildXpHistory(this.actor);
      const existingCache = this._getXpSpent();

      // Only update cache if spending history has actually changed
      // This prevents unnecessary flag updates and re-renders
      const changed = JSON.stringify(existingCache) !== JSON.stringify(retroactiveSpent);
      if (changed) {
        await this.actor.setFlag(SYS_ID, "xpSpentCache", retroactiveSpent);
      }

      // Update version flag to prevent redundant recalculations
      // Version is based on item count and modification timestamps
      const currentVersion = calculateXpDataVersion(this.actor);
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
    } catch (err) {
      logError("Failed to perform retroactive XP update", err, {
        actorId: this.actor?.id
      });
    }
  }
}
