/**
 * @module apps/xp-manager
 * @description A window over one character's experience points: manual XP entries with notes, the XP spent on
 * purchases (rebuilt from the actor's items when their version changes), sorting with the saved sort preference, and
 * the Disadvantage XP cap. It uses no DebouncedFieldMixin and no form submission: each button (add, delete, sort,
 * recalculate) is one action that writes the actor's flags. Manual XP and the cap are the GM's: a player's window
 * shows them without their controls, and their actions do nothing for a player.
 */
import { SYS_ID } from "../config/constants.js";
import { SORT_COLUMNS, SORT_KEYS } from "../config/sort-keys.js";
import { F, T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { logError } from "../utils/error-logging.js";
import { getSortPref, getSortPrefs, updateSortPref } from "../services/sort-preferences.js";
import { askDisadvantageCap } from "../services/xp/disadvantage-cap.js";
import { formatXpEntries } from "../services/xp/formatter.js";
import { isRetroactiveUpdateDue, updateXpHistory, xpSpentOf } from "../services/xp/versioning.js";

/**
 * The XP manager window for one actor.
 */
export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "xp-manager-{id}",
    classes: ["l5r4", "l5r4-xp-manager"],
    tag: "form",
    window: {
      title: "l5r4.apps.xpManager.title",
      icon: "fa-solid fa-chart-line",
      resizable: true
    },
    position: {
      width: 600,
      height: 700
    },
    actions: {
      "add-xp": XpManagerApplication.#onAddXp,
      "delete-xp-entry": XpManagerApplication.#onDeleteXpEntry,
      "sort-items": XpManagerApplication.#onSortItems,
      "recalculate-xp": XpManagerApplication.#onRecalculateXp,
      "change-disadvantage-cap": XpManagerApplication.#onChangeDisadvantageCap
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
    return F("l5r4.apps.xpManager.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /**
   * Prepare context data for rendering the XP manager.
   * Retrieves XP data, manual entries, spending history, and disadvantage cap.
   * Performs retroactive updates if needed.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with XP data and entries
   * @override
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "XpManager: No actor reference");
      return this._getFallbackContext();
    }

    try {
      if (await isRetroactiveUpdateDue(this.actor)) {
        await updateXpHistory(this.actor);
      }
      const sys = this.actor.system ?? {};
      const xp = sys?._xp ?? {};
      const ledgers = this.#buildLedgers();
      const disadvantageCap = disadvantageCapOf(this._getFlags());

      return {
        // The Disadvantage cap and manual XP are the GM's (roadmap/STAGE-18-PLAYTEST.md decision 9)
        isGM: game.user.isGM,
        xp: buildXpSummary(xp),
        disadvantageCap,
        ...ledgers,
        sortColumns: SORT_COLUMNS,
        sortState: getSortPrefs(this.actor.id)
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
   */
  _getFallbackContext() {
    return {
      isGM: game.user.isGM,
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
      spentTotal: 0,
      sortColumns: SORT_COLUMNS
    };
  }

  /**
   * Retrieve actor flags for the system.
   *
   * @returns {object} Actor flags object or empty object if unavailable
   */
  _getFlags() {
    return this.actor.flags?.[SYS_ID] ?? {};
  }

  /**
   * Retrieve manual XP entries from actor flags.
   *
   * @param {boolean} [duplicate=false] - Whether to return a deep copy
   * @returns {Array} Array of manual XP entries
   */
  _getXpManual(duplicate = false) {
    const flags = this._getFlags();
    const manual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
    return duplicate ? foundry.utils.duplicate(manual) : manual;
  }

  /**
   * Calculate total XP delta from array of entries.
   * Sums delta values, ignoring invalid entries.
   *
   * @param {Array} entries - Array of XP entries with delta properties
   * @returns {number} Total XP delta
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
   * Handle add XP action.
   * Extracts amount and note from form, creates new manual XP entry,
   * and clears form fields after successful addition.
   *
   * @this {XpManagerApplication}
   * @param {Event} event - The click event
   * @param {HTMLElement} _element - The clicked element (unused)
   */
  static async #onAddXp(event, _element) {
    event.preventDefault();

    const form = this.element;
    const amount = toInt(form.querySelector("[data-field='xp-amount']")?.value, 0);
    const note = form.querySelector("[data-field='xp-note']")?.value?.trim() || "";

    if (!game.user.isGM || amount === 0) {
      return;
    }

    const manual = this._getXpManual(true);
    manual.push(buildXpEntry(amount, note));

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
   * @this {XpManagerApplication}
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked element with data-entry-id attribute
   */
  static async #onDeleteXpEntry(event, element) {
    event.preventDefault();
    if (!game.user.isGM) {
      return;
    }

    const entryId = element.dataset.entryId;
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
   * Allowed sort keys: the purchases header's (SORT_KEYS["xp-purchases"]: note, cost, type).
   *
   * @this {XpManagerApplication}
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked sort header with data-sort-by attribute
   */
  static async #onSortItems(event, element) {
    event.preventDefault();
    event.stopPropagation();

    const header = element.closest("[data-sort-header]");
    const scope = header?.dataset?.scope || "xp-purchases";
    const key = element.dataset.sortBy || "note";
    const allowed = SORT_KEYS["xp-purchases"];

    if (!allowed.includes(key)) {
      return;
    }

    const cur = getSortPref(this.actor.id, scope, { allowedKeys: allowed, defaultKey: "note" });
    await updateSortPref(this.actor.id, scope, { key, toggleFrom: cur });

    // The render marks the sorted head from the stored sort (templates/actor/_partials/_sort-header.hbs)
    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Handle recalculate XP purchases action.
   * Resets retroactive version flag and rebuilds XP spending history.
   *
   * @this {XpManagerApplication}
   * @param {Event} event - The click event
   * @param {HTMLElement} _element - The clicked element (unused)
   */
  static async #onRecalculateXp(event, _element) {
    event.preventDefault();

    try {
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);

      await updateXpHistory(this.actor);

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
   * Asks for the new Disadvantage XP cap (askDisadvantageCap) and stores it.
   *
   * @this {XpManagerApplication}
   * @param {Event} event - The click event
   * @param {HTMLElement} _element - The clicked element (unused)
   */
  static async #onChangeDisadvantageCap(event, _element) {
    event.preventDefault();
    if (!game.user.isGM) {
      return;
    }

    const currentCap = disadvantageCapOf(this._getFlags());

    try {
      const newCap = await askDisadvantageCap(currentCap);

      if (newCap !== null) {
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
   * The manual and purchase entries as display rows, with each list's total.
   * @returns {{manualEntries: object[], spentEntries: object[], manualTotal: number, spentTotal: number}}
   */
  #buildLedgers() {
    const manual = this._getXpManual();
    const spent = xpSpentOf(this.actor);
    return {
      manualEntries: formatXpEntries(manual, { sort: false }),
      spentEntries: formatXpEntries(spent, {
        sort: true,
        actorId: this.actor.id,
        scope: "xp-purchases"
      }),
      manualTotal: this._calculateTotal(manual),
      spentTotal: this._calculateTotal(spent)
    };
  }
}

/**
 * The Disadvantage XP cap the actor's flags hold, 10 when unset or not a number.
 * @param {object} flags - The actor's system flags
 * @returns {number}
 */
function disadvantageCapOf(flags) {
  return Number.isFinite(+flags.disadvantageCap) ? Number(flags.disadvantageCap) : 10;
}

/**
 * The XP totals and the spending breakdown the window shows, each defaulted when preparation left it unset, and a
 * monk's kiho against what the Monk Schools allow, with a warning for each limit passed (Stage 18 decision 19).
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * @param {object} xp - The actor's prepared `system._xp`
 * @returns {object}
 */
function buildXpSummary(xp) {
  const kiho = xp.kiho ?? null;
  return {
    kiho,
    kihoWarnings: [
      ...(kiho && kiho.school > kiho.schoolAllowed
        ? ["l5r4.character.experience.tooManySchoolKiho"]
        : []),
      ...(kiho && kiho.bonus > kiho.bonusAllowed
        ? ["l5r4.character.experience.tooManyBonusKiho"]
        : [])
    ],
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
  };
}

/**
 * A new manual XP entry.
 * @param {number} amount - The XP added, or taken away when negative
 * @param {string} note - The user's note
 * @returns {{id: string, delta: number, note: string, ts: number}}
 */
function buildXpEntry(amount, note) {
  return {
    id: foundry.utils.randomID(),
    delta: amount,
    note,
    ts: Date.now()
  };
}
