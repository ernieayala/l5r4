/**
 * Wealth Manager Application
 *
 * Provides an interface for managing actor wealth including adding, removing,
 * and converting between currency denominations (koku, bu, zeni).
 *
 * Key Responsibilities:
 * - **Add Money**: Increase wealth in specified denomination
 * - **Remove Money**: Decrease wealth with validation for sufficient funds
 * - **Currency Conversion**: Convert between denominations (10 zeni = 1 bu, 5 bu = 1 koku)
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses data-action delegation for event handling
 * - Updates actor system wealth data
 *
 * Architectural Notes:
 * - **No DebouncedFieldMixin**: Button-driven discrete transactions, not real-time updates
 * - **Actor-based constructor**: Standard pattern for actor configuration dialogs
 * - **No form submission**: Each button triggers immediate discrete action (add/remove/convert)
 *
 * @module apps/wealth-manager
 */

// Config imports
import { SYS_ID } from "../config/constants.js";

// Utils imports
import { T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import { logError } from "../utils/error-logging.js";

export default class WealthManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "wealth-manager-{id}",
    classes: ["l5r4", "wealth-manager"],
    tag: "form",
    window: {
      title: "l5r4.apps.wealthManager.title",
      icon: "fas fa-calculator",
      resizable: true
    },
    position: {
      width: 400,
      height: "auto"
    },
    actions: {
      "add-money": WealthManagerApplication.prototype._onAddMoney,
      "remove-money": WealthManagerApplication.prototype._onRemoveMoney,
      "convert-up": WealthManagerApplication.prototype._onConvertUp,
      "convert-down": WealthManagerApplication.prototype._onConvertDown
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/wealth-manager.hbs`
    }
  };

  /**
   * Create a new WealthManagerApplication instance.
   *
   * @param {Actor} actor - The actor whose wealth is being managed
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("WealthManagerApplication requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `wealth-manager-${actor.id}`
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
    const baseTitle = T("l5r4.apps.wealthManager.title");
    return `${baseTitle}: ${this.actor?.name ?? "Unknown"}`;
  }

  /**
   * Retrieve current wealth values from actor system data.
   * Ensures all denominations return valid integers.
   *
   * @returns {object} Wealth object with koku, bu, and zeni properties
   * @private
   */
  _getWealth() {
    return {
      koku: toInt(this.actor.system?.wealth?.koku, 0),
      bu: toInt(this.actor.system?.wealth?.bu, 0),
      zeni: toInt(this.actor.system?.wealth?.zeni, 0)
    };
  }

  /**
   * Prepare context data for rendering the wealth manager.
   * Retrieves current wealth values from actor.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with wealth data
   * @private
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "WealthManager: No actor reference");
      return this._getFallbackContext();
    }

    try {
      const wealth = this._getWealth();

      return {
        wealth
      };
    } catch (err) {
      logError("Failed to prepare wealth manager context", err, {
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
      wealth: { koku: 0, bu: 0, zeni: 0 }
    };
  }

  /**
   * Handle add money action.
   * Extracts amount and denomination from form, validates positive amount,
   * and updates actor wealth.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onAddMoney(event, _target) {
    event.preventDefault();

    const formData = new FormData(this.element);
    const amount = toInt(formData.get("add-amount"), 0);
    const denomination = formData.get("add-denomination") || "koku";

    if (amount <= 0) {
      return;
    }

    const wealth = this._getWealth();
    wealth[denomination] = Math.max(0, (wealth[denomination] || 0) + amount);

    try {
      await this.actor.update({ "system.wealth": wealth });
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to add money", err, {
        amount,
        denomination,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.wealthManager.errors.addMoneyFailed"));
    }
  }

  /**
   * Handle remove money action.
   * Extracts amount and denomination from form, validates positive amount
   * and sufficient funds, then updates actor wealth.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onRemoveMoney(event, _target) {
    event.preventDefault();

    const formData = new FormData(this.element);
    const amount = toInt(formData.get("remove-amount"), 0);
    const denomination = formData.get("remove-denomination") || "koku";

    if (amount <= 0) {
      return;
    }

    const wealth = this._getWealth();

    if ((wealth[denomination] || 0) < amount) {
      ui.notifications?.warn(T("l5r4.apps.wealthManager.errors.insufficientFunds"));
      return;
    }

    wealth[denomination] = Math.max(0, (wealth[denomination] || 0) - amount);

    try {
      await this.actor.update({ "system.wealth": wealth });
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to remove money", err, {
        amount,
        denomination,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.wealthManager.errors.removeMoneyFailed"));
    }
  }

  /**
   * Handle convert up action (smaller to larger denomination).
   * Conversion rates: 10 zeni → 1 bu, 5 bu → 1 koku.
   * Validates sufficient funds before converting.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element with data-from attribute
   * @private
   */
  async _onConvertUp(event, target) {
    event.preventDefault();

    const from = target.dataset.from;
    const wealth = this._getWealth();

    // L5R4 currency conversion rates (smaller to larger denomination):
    // 10 zeni = 1 bu
    // 5 bu = 1 koku

    if (from === "zeni" && wealth.zeni >= 10) {
      // Convert 10 zeni to 1 bu
      wealth.zeni = Math.max(0, wealth.zeni - 10);
      wealth.bu = (wealth.bu || 0) + 1;
    } else if (from === "bu" && wealth.bu >= 5) {
      // Convert 5 bu to 1 koku
      wealth.bu = Math.max(0, wealth.bu - 5);
      wealth.koku = (wealth.koku || 0) + 1;
    } else {
      ui.notifications?.warn(T("l5r4.apps.wealthManager.errors.insufficientForConversion"));
      return;
    }

    try {
      await this.actor.update({ "system.wealth": wealth });
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to convert currency", err, {
        from,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.wealthManager.errors.convertFailed"));
    }
  }

  /**
   * Handle convert down action (larger to smaller denomination).
   * Conversion rates: 1 koku → 5 bu, 1 bu → 10 zeni.
   * Validates sufficient funds before converting.
   *
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element with data-from attribute
   * @private
   */
  async _onConvertDown(event, target) {
    event.preventDefault();

    const from = target.dataset.from;
    const wealth = this._getWealth();

    // L5R4 currency conversion rates (larger to smaller denomination):
    // 1 koku = 5 bu
    // 1 bu = 10 zeni

    if (from === "koku" && wealth.koku >= 1) {
      // Convert 1 koku to 5 bu
      wealth.koku = Math.max(0, wealth.koku - 1);
      wealth.bu = (wealth.bu || 0) + 5;
    } else if (from === "bu" && wealth.bu >= 1) {
      // Convert 1 bu to 10 zeni
      wealth.bu = Math.max(0, wealth.bu - 1);
      wealth.zeni = (wealth.zeni || 0) + 10;
    } else {
      ui.notifications?.warn(T("l5r4.apps.wealthManager.errors.insufficientForConversion"));
      return;
    }

    try {
      await this.actor.update({ "system.wealth": wealth });
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to convert currency", err, {
        from,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.wealthManager.errors.convertFailed"));
    }
  }
}
