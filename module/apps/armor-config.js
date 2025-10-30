/**
 * Armor Configuration Application
 *
 * Provides interactive UI for configuring actor armor mechanics.
 * Manages armor TN modifier and armor reduction modifier.
 *
 * @module apps/armor-config
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Armor Configuration Application
 *
 * ApplicationV2-based form for managing actor armor settings.
 * Handles armor TN modifier and armor reduction modifier.
 *
 * @extends {foundry.applications.api.ApplicationV2}
 * @mixes {foundry.applications.api.HandlebarsApplicationMixin}
 */
export default class ArmorConfigApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "armor-config-{id}",
    classes: ["l5r4", "armor-config-app"],
    tag: "form",
    window: {
      title: "l5r4.ui.common.armor",
      icon: "fas fa-cog",
      resizable: true
    },
    position: {
      width: 400,
      height: 300
    },
    actions: {},
    form: {
      handler: ArmorConfigApplication.prototype._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/armor-config.hbs`
    }
  };

  /**
   * Creates armor configuration application instance.
   *
   * @param {L5R4Actor} actor - The actor to configure armor for
   * @param {object} [options={}] - Application options
   */
  constructor(actor, options = {}) {
    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `armor-config-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
    this._updateDebounced = foundry.utils.debounce(this._updateActor.bind(this), 300);
  }

  /**
   * Debounced update handler.
   * @type {Function}
   * @private
   */
  _updateDebounced;

  /**
   * Prepares context data for template rendering.
   *
   * @param {object} options - Render options
   * @returns {Promise<object>} Template context
   * @override
   * @async
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "ArmorConfig: No actor reference");
      return this._getFallbackContext();
    }

    try {
      return {
        actor: this.actor,
        system: this.actor.system
      };
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to prepare armor config context", { err });
      return this._getFallbackContext();
    }
  }

  /**
   * Provides fallback context.
   *
   * @returns {object} Minimal safe context
   * @private
   */
  _getFallbackContext() {
    return {
      actor: this.actor,
      system: {
        armorTn: { mod: 0, reductionMod: 0 }
      }
    };
  }

  /**
   * Post-render hook.
   *
   * @param {object} _context - Rendered context
   * @param {object} _options - Render options
   * @override
   */
  _onRender(_context, _options) {
    if (!this.element) {
      console.warn(`${SYS_ID}`, "ArmorConfig _onRender: No element");
      return;
    }

    const fields = this.element.querySelectorAll('[data-action="field-change"]');
    fields.forEach(field => {
      field.addEventListener("change", event => {
        this._onFieldChange(event, event.target);
      });
    });
  }

  /**
   * Handles field changes with debounced updates.
   *
   * @param {Event} event - Input/change event
   * @param {HTMLInputElement} element - Form element
   * @returns {Promise<void>}
   * @async
   */
  async _onFieldChange(event, element) {
    const field = element.name;
    const value =
      element.type === "checkbox"
        ? element.checked
        : element.type === "number" || element.dataset.type === "Number"
          ? parseInt(element.value) || 0
          : element.value;

    if (!field) {
      console.warn(`${SYS_ID}`, "Field change with no field name");
      return;
    }

    this._updateDebounced(field, value);
  }

  /**
   * Debounced actor update handler.
   *
   * @param {string} field - Field name
   * @param {*} value - New value
   * @returns {Promise<void>}
   * @private
   * @async
   */
  async _updateActor(field, value) {
    try {
      if (!this.actor) {
        console.warn(`${SYS_ID}`, "ArmorConfig: No actor for update");
        return;
      }

      if (!this.rendered) {
        console.warn(`${SYS_ID}`, "ArmorConfig: Update after close");
        return;
      }

      const updateData = { [`system.${field}`]: value };
      await this.actor.update(updateData);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to update armor config", { err, field, value });
      ui.notifications?.error("Failed to update armor configuration");
    }
  }

  /**
   * Form submission handler.
   *
   * @param {Event} event - Submit event
   * @param {HTMLFormElement} _form - Form element
   * @param {FormData} _formData - Form data
   * @returns {Promise<void>}
   * @override
   * @async
   */
  async _onSubmitForm(event, _form, _formData) {
    if (event) {
      event.preventDefault();
    }
  }

  /**
   * Cleanup on close.
   *
   * @param {object} [options={}] - Close options
   * @returns {Promise<void>}
   * @override
   * @async
   */
  async close(options = {}) {
    if (this._updateDebounced && typeof this._updateDebounced.flush === "function") {
      await this._updateDebounced.flush();
    }
    return super.close(options);
  }

  /**
   * Dynamic window title.
   *
   * @returns {string} Localized title
   * @override
   */
  get title() {
    const baseTitle = game.i18n.localize("l5r4.ui.common.armor");
    return `${baseTitle}: ${this.actor.name}`;
  }
}
