/**
 * Wealth Manager Application
 *
 * UI application for managing a character's wealth in the L5R4 system.
 * Provides interface for adding/removing money and converting between currency denominations.
 *
 * L5R4 Currency System
 * - 1 koku = 5 bu (silver coins)
 * - 1 bu = 10 zeni (copper pennies)
 * - Therefore: 1 koku = 50 zeni
 *
 * Historical Context:
 * - Originally, 1 koku = rice to feed one person for one year
 * - By 1170, currency devalued: ~12 koku needed for one year's rice
 * - Prices reflect this devaluation
 *
 * Foundry VTT Integration:
 * - Extends Application v2 (requires Foundry v13+)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Implements event delegation pattern (data-action attributes)
 * - Stores wealth in actor.system.wealth (koku, bu, zeni)
 *
 * @module apps/wealth-manager
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html|Application v2 Documentation}
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Wealth Manager Application for L5R4 character currency management.
 *
 * Provides a modal dialog interface for:
 * - Viewing current wealth (koku, bu, zeni)
 * - Adding/removing money
 * - Converting between currency denominations
 *
 * User Actions:
 * - Add money (specify amount and denomination)
 * - Remove money (specify amount and denomination)
 * - Convert up (e.g., 10 zeni → 1 bu, 5 bu → 1 koku)
 * - Convert down (e.g., 1 koku → 5 bu, 1 bu → 10 zeni)
 *
 * @extends foundry.applications.api.ApplicationV2
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 */
export default class WealthManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "wealth-manager-{id}",
    classes: ["l5r4", "wealth-manager"],
    tag: "form",
    window: {
      title: "l5r4.ui.wealthManager.title",
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
   * Constructs the Wealth Manager application instance.
   *
   * @param {Actor} actor - The L5R4 actor document whose wealth will be managed
   * @param {object} [options={}] - Additional application options (merged with DEFAULT_OPTIONS)
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /**
   * Retrieves the actor's current wealth data.
   *
   * Safely accesses actor.system.wealth with fallback to default values.
   *
   * @returns {object} Wealth object with koku, bu, zeni properties
   * @private
   */
  _getWealth() {
    return {
      koku: Number(this.actor.system?.wealth?.koku) || 0,
      bu: Number(this.actor.system?.wealth?.bu) || 0,
      zeni: Number(this.actor.system?.wealth?.zeni) || 0
    };
  }

  /**
   * Prepares template context data for rendering the wealth manager UI.
   *
   * @override
   * @async
   * @returns {Promise<object>} Context object for wealth-manager.hbs template
   * @property {object} wealth - Current wealth values (koku, bu, zeni)
   */
  async _prepareContext() {
    const wealth = this._getWealth();

    return {
      wealth
    };
  }

  /**
   * Event handler for adding money.
   *
   * Reads amount and denomination from form inputs, validates amount is positive,
   * then adds to the appropriate currency field.
   *
   * @async
   * @param {Event} event - Form submission event
   * @param {HTMLElement} target - Event target element
   * @private
   */
  async _onAddMoney(event, _target) {
    event.preventDefault();

    const formData = new FormData(this.element);
    const amount = Number(formData.get("add-amount")) || 0;
    const denomination = formData.get("add-denomination") || "koku";

    if (amount <= 0) {
      return;
    }

    const wealth = this._getWealth();
    wealth[denomination] = Math.max(0, (wealth[denomination] || 0) + amount);

    try {
      await this.actor.update({ "system.wealth": wealth });
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to add money", { err });
    }
  }

  /**
   * Event handler for removing money.
   *
   * Reads amount and denomination from form inputs, validates amount is positive,
   * then removes from the appropriate currency field. Only removes if sufficient
   * funds exist in that specific denomination.
   *
   * @async
   * @param {Event} event - Form submission event
   * @param {HTMLElement} target - Event target element
   * @private
   */
  async _onRemoveMoney(event, _target) {
    event.preventDefault();

    const formData = new FormData(this.element);
    const amount = Number(formData.get("remove-amount")) || 0;
    const denomination = formData.get("remove-denomination") || "koku";

    if (amount <= 0) {
      return;
    }

    const wealth = this._getWealth();

    // Check if we have enough in this denomination
    if ((wealth[denomination] || 0) < amount) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.wealthManager.insufficientFunds"));
      return;
    }

    wealth[denomination] = Math.max(0, (wealth[denomination] || 0) - amount);

    try {
      await this.actor.update({ "system.wealth": wealth });
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to remove money", { err });
    }
  }

  /**
   * Event handler for converting currency up (smaller to larger denominations).
   *
   * Converts 10 zeni → 1 bu, or 5 bu → 1 koku.
   * Only converts if sufficient funds available.
   *
   * @async
   * @param {Event} event - Click event
   * @param {HTMLElement} target - Button element with data-from attribute
   * @private
   */
  async _onConvertUp(event, target) {
    event.preventDefault();

    const from = target.dataset.from;
    const wealth = this._getWealth();

    if (from === "zeni" && wealth.zeni >= 10) {
      wealth.zeni = Math.max(0, wealth.zeni - 10);
      wealth.bu = (wealth.bu || 0) + 1;
    } else if (from === "bu" && wealth.bu >= 5) {
      wealth.bu = Math.max(0, wealth.bu - 5);
      wealth.koku = (wealth.koku || 0) + 1;
    } else {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.wealthManager.insufficientForConversion"));
      return;
    }

    try {
      await this.actor.update({ "system.wealth": wealth });
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to convert currency", { err });
    }
  }

  /**
   * Event handler for converting currency down (larger to smaller denominations).
   *
   * Converts 1 koku → 5 bu, or 1 bu → 10 zeni.
   * Only converts if sufficient funds available.
   *
   * @async
   * @param {Event} event - Click event
   * @param {HTMLElement} target - Button element with data-from attribute
   * @private
   */
  async _onConvertDown(event, target) {
    event.preventDefault();

    const from = target.dataset.from;
    const wealth = this._getWealth();

    if (from === "koku" && wealth.koku >= 1) {
      wealth.koku = Math.max(0, wealth.koku - 1);
      wealth.bu = (wealth.bu || 0) + 5;
    } else if (from === "bu" && wealth.bu >= 1) {
      wealth.bu = Math.max(0, wealth.bu - 1);
      wealth.zeni = (wealth.zeni || 0) + 10;
    } else {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.wealthManager.insufficientForConversion"));
      return;
    }

    try {
      await this.actor.update({ "system.wealth": wealth });
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to convert currency", { err });
    }
  }
}
