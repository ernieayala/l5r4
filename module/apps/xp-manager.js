/**
 * XP Manager Application
 *
 * UI application for viewing and managing a character's Experience Points (XP) in the L5R4 system.
 * Displays both manually-awarded XP entries and automatically-calculated XP expenditures from
 * character advancement (traits, skills, advantages, disadvantages, kata, kiho).
 *
 * L5R4 Game Rules Context:
 * - Starting characters receive 40 XP for customization
 * - Trait advancement costs 4 × new rank (e.g., Reflexes 2→3 = 12 XP)
 * - Void advancement costs 6 × new rank (e.g., Void 2→3 = 18 XP)
 * - Skill advancement costs next rank (e.g., Kenjutsu 2→3 = 3 XP)
 * - New skills cost 1 XP to acquire at rank 1
 * - Emphases cost 2 XP each
 * - Advantages/Disadvantages have variable XP costs (disadvantages grant XP, max 10)
 * - Kata and Kiho have variable XP costs based on their mastery level
 *
 * XP Tracking System:
 * - **Manual XP** (flags[SYS_ID].xpManual): GM-awarded XP gains (session rewards, story awards)
 * - **Spent XP** (flags[SYS_ID].xpSpent): Auto-calculated from character's purchased abilities
 * - **Versioning** (flags[SYS_ID].xpRetroactiveVersion): Content hash to detect when recalculation needed
 *
 * Retroactive Recalculation:
 * When traits, skills, or purchased items change, the system detects this via version hash
 * comparison and rebuilds the entire XP expenditure history by reverse-engineering the
 * character's current state. This ensures XP costs always reflect actual character progression.
 *
 * Foundry VTT Integration:
 * - Extends Application v2 (requires Foundry v13+)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Implements event delegation pattern (data-action attributes, _onAction handler registration)
 * - Stores XP data in actor.flags[SYS_ID] for persistence
 * - Integrates with xp-calculator service for spent XP computation
 * - Integrates with xp-formatter service for display formatting and sorting
 * - Integrates with xp-versioning service for change detection
 *
 * @module apps/xp-manager
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html|Application v2 Documentation}
 * @see module:services/xp/xp-calculator for XP history reconstruction logic
 * @see module:services/xp/xp-versioning for change detection mechanism
 * @see module:services/xp/xp-formatter for entry formatting and sorting
 */

import { SYS_ID } from "../config/constants.js";
import { getSortPref, setSortPref } from "../utils/sorting.js";
import { buildXpHistory } from "../services/xp/xp-calculator.js";
import { formatXpEntries } from "../services/xp/xp-formatter.js";
import { needsRetroactiveUpdate, calculateXpDataVersion } from "../services/xp/xp-versioning.js";

/**
 * XP Manager Application for L5R4 character XP tracking and management.
 *
 * Provides a modal dialog interface for viewing XP gains (manual entries), XP expenditures
 * (automatically calculated from character advancement), and managing manual XP awards.
 * Uses Foundry v13's Application v2 architecture with Handlebars template rendering.
 *
 * The application displays two separate XP entry lists:
 * 1. Manual entries - GM-awarded XP that can be added/deleted through this UI
 * 2. Spent entries - Read-only list of XP costs from trait/skill/item purchases (auto-calculated)
 *
 * User Actions:
 * - Add manual XP entry (positive or negative amounts)
 * - Delete manual XP entry
 * - Sort spent entries by note, cost, or type
 * - Trigger manual recalculation of spent XP history
 *
 * @extends foundry.applications.api.ApplicationV2
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 */
export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
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
   * Constructs the XP Manager application instance.
   *
   * @param {Actor} actor - The L5R4 actor document whose XP will be managed
   * @param {object} [options={}] - Additional application options (merged with DEFAULT_OPTIONS)
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /**
   * Retrieves the actor's L5R4 system flags object.
   *
   * Safely accesses actor.flags[SYS_ID] with fallback to empty object if undefined.
   * The flags object contains xpManual, xpSpent, and xpRetroactiveVersion data.
   *
   * @returns {object} The actor's L5R4 flags object, or empty object if not set
   * @private
   */
  _getFlags() {
    return this.actor.flags?.[SYS_ID] ?? {};
  }

  /**
   * Retrieves the actor's manual XP entry history.
   *
   * Manual XP entries represent GM-awarded experience (session rewards, story milestones).
   * Each entry contains: { id, delta, note, ts }
   * - id: unique entry identifier (randomID)
   * - delta: XP amount (positive for gains, negative for penalties)
   * - note: description of award/penalty
   * - ts: timestamp in milliseconds
   *
   * @param {boolean} [duplicate=false] - If true, returns deep copy for safe mutation
   * @returns {Array<{id: string, delta: number, note: string, ts: number}>} Array of manual XP entries
   * @private
   */
  _getXpManual(duplicate = false) {
    const flags = this._getFlags();
    const manual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
    return duplicate ? foundry.utils.duplicate(manual) : manual;
  }

  /**
   * Retrieves the actor's calculated XP expenditure history.
   *
   * Returns cached XP history from flags.xpSpentCache if available, otherwise
   * returns empty array. The cache is populated by _performRetroactiveUpdate()
   * when needed (detected via version hash comparison).
   *
   * Each entry contains: { id, delta, note, ts, type, autoCalculated }
   *
   * @returns {Array<object>} Array of spent XP entries (cached, computed by buildXpHistory)
   * @private
   * @see buildXpHistory in module:services/xp/xp-calculator
   */
  _getXpSpent() {
    const flags = this._getFlags();
    return Array.isArray(flags.xpSpentCache) ? flags.xpSpentCache : [];
  }

  /**
   * Calculates total XP from an array of XP entries.
   *
   * Sums the delta values from all entries, safely handling malformed entries by
   * skipping non-objects or non-numeric deltas. Negative deltas (penalties or spent XP)
   * are summed as-is.
   *
   * @param {Array<{delta: number}>} entries - Array of XP entries with delta properties
   * @returns {number} Sum of all delta values, or 0 if entries array is empty
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
   * Prepares template context data for rendering the XP manager UI.
   *
   * Checks if retroactive XP recalculation is needed (via version hash comparison),
   * triggers recalculation if necessary, then assembles all XP data for display:
   * - Current XP totals (spent, total, available)
   * - XP breakdown by category (traits, void, skills, advantages, kata, kiho, spells)
   * - Formatted manual entry list
   * - Formatted spent entry list (with applied sort preferences)
   *
   * Manual entries are unsorted by default; spent entries respect user sort preferences
   * persisted via the sorting utility service.
   *
   * @override
   * @async
   * @returns {Promise<object>} Context object for xp-manager.hbs template
   * @property {object} xp - Current XP values and breakdown
   * @property {Array} manualEntries - Formatted manual XP entries
   * @property {Array} spentEntries - Formatted spent XP entries
   * @property {number} manualTotal - Sum of manual entry deltas
   * @property {number} spentTotal - Sum of spent entry deltas (typically negative)
   */
  async _prepareContext() {
    // Check if character data changed since last XP calculation via version hash comparison
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
  }

  /**
   * Event handler for adding a manual XP entry.
   *
   * Reads amount and note from form inputs, validates amount is non-zero, then appends
   * a new entry to the xpManual flag array with a unique ID and current timestamp.
   * After successful save, resets form inputs and re-renders the application.
   *
   * L5R4 Usage: GMs use this to award XP at end of session or for story accomplishments.
   * Negative amounts can be entered to represent XP penalties if needed.
   *
   * @async
   * @param {Event} event - Form submission event
   * @param {HTMLElement} target - Event target element (form or submit button)
   * @private
   */
  async _onAddXp(event, _target) {
    event.preventDefault();

    const form = this.element;
    // querySelector used here to access form inputs by ID (standard form pattern)
    // IDs are unique within the form scope, making this a reliable selector
    const amount = Number(form.querySelector("#xp-amount")?.value) || 0;
    const note = form.querySelector("#xp-note")?.value?.trim() || "";

    if (amount === 0) {
      return;
    }

    const manual = this._getXpManual(true);
    // Manual XP entry structure: { id, delta, note, ts }
    manual.push({
      id: foundry.utils.randomID(),
      delta: amount,
      note,
      ts: Date.now()
    });

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);

      // querySelector used to reset form inputs after successful submission
      const amountField = form.querySelector("#xp-amount");
      const noteField = form.querySelector("#xp-note");
      if (amountField) {
        amountField.value = "1";
      }
      if (noteField) {
        noteField.value = "";
      }

      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Event handler for deleting a manual XP entry.
   *
   * Reads entry ID from data-entry-id attribute, filters it from xpManual array,
   * saves the updated array, and re-renders. Only manual entries can be deleted;
   * spent entries are read-only as they reflect character purchases.
   *
   * @async
   * @param {Event} event - Click event from delete button
   * @param {HTMLElement} target - Delete button element (must have data-entry-id attribute)
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
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Event handler for changing spent XP entry sort order.
   *
   * Implements column header click sorting with ascending/descending toggle.
   * Sort preference is persisted per actor and per scope ("xp-purchases") using
   * the sorting utility service, so sort order survives sheet closure.
   *
   * Allowed sort keys: "note", "cost", "type"
   * Sort direction toggles between "asc" and "desc" on repeated clicks.
   *
   * Updates UI to show active sort column with direction indicator, then re-renders
   * the application with new sort order applied to spent entries list.
   *
   * @async
   * @param {Event} event - Click event from sort header
   * @param {HTMLElement} target - Sort button element (must have data-sortby attribute)
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

    this.render();
  }

  /**
   * Event handler for manually triggering XP expenditure recalculation.
   *
   * Forces a complete rebuild of the xpSpent array by resetting the version hash to 0,
   * which causes _prepareContext to detect version mismatch and call _performRetroactiveUpdate.
   *
   * This is a maintenance action for players/GMs who want to ensure XP history is
   * up-to-date even if the automatic version detection missed a change. Shows success/
   * failure notification toast after operation completes.
   *
   * @async
   * @param {Event} event - Click event from recalculate button
   * @param {HTMLElement} target - Recalculate button element
   * @private
   */
  async _onRecalculateXpPurchase(event, _target) {
    event.preventDefault();

    try {
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);

      await this._performRetroactiveUpdate();

      ui.notifications?.info(game.i18n.localize("l5r4.character.experience.recalculateSuccess"));
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to recalculate XP purchases", err);
      ui.notifications?.error(game.i18n.localize("l5r4.character.experience.recalculateFailed"));
    }
  }

  /**
   * Event handler for changing the disadvantage XP cap.
   *
   * Opens a dialog prompting the user to enter a new maximum XP value from disadvantages.
   * Default is 10 per L5R4 rules, but GMs can adjust this for house rules or campaign needs.
   *
   * @async
   * @param {Event} event - Click event from the cap value element
   * @param {HTMLElement} target - Clicked element
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
        window: { title: game.i18n.localize("l5r4.character.experience.disadvantageCapTitle") },
        content,
        ok: {
          label: game.i18n.localize("l5r4.ui.common.ok"),
          callback: (_e, b, d) => {
            const form = b.form ?? d.form;
            // querySelector used to retrieve dialog input value by ID (Foundry dialog pattern)
            const input = form?.querySelector("#disadvantage-cap");
            return input ? Number(input.value) : null;
          }
        },
        cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
        rejectClose: false,
        modal: true
      });

      if (newCap !== null && Number.isFinite(newCap) && newCap >= 0) {
        await this.actor.setFlag(SYS_ID, "disadvantageCap", newCap);
        this.render();
      }
    } catch (err) {
      // Dialog cancelled or error occurred
      if (err) {
        console.warn(`${SYS_ID}`, "Failed to set disadvantage cap", { err });
      }
    }
  }

  /**
   * Performs retroactive XP expenditure recalculation and caches result.
   *
   * Rebuilds the complete XP spent history by calling buildXpHistory, which reverse-engineers
   * the character's current state (traits, skills, advantages, etc.) to generate XP cost
   * entries per L5R4 advancement rules.
   *
   * The calculated history is cached in flags.xpSpentCache for performance. Manual XP entries
   * from flags.xpManual are preserved separately and merged for display only.
   *
   * Updates xpRetroactiveVersion to the current data hash to mark this version as processed,
   * preventing unnecessary recalculations until character data changes again.
   *
   * Called automatically when version mismatch is detected, or manually via recalculate button.
   *
   * @async
   * @private
   * @see buildXpHistory in module:services/xp/xp-calculator
   * @see calculateXpDataVersion in module:services/xp/xp-versioning
   */
  async _performRetroactiveUpdate() {
    try {
      const retroactiveSpent = await buildXpHistory(this.actor);
      const existingCache = this._getXpSpent();

      // Cache the calculated XP history
      const changed = JSON.stringify(existingCache) !== JSON.stringify(retroactiveSpent);
      if (changed) {
        await this.actor.setFlag(SYS_ID, "xpSpentCache", retroactiveSpent);
      }

      // Update version hash to prevent recalculation until data changes
      const currentVersion = calculateXpDataVersion(this.actor);
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to perform retroactive XP update", err);
    }
  }
}
