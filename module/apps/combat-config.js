/**
 * @module apps/combat-config
 * @description A form window for one actor's combat values: the initiative roll, keep, and total modifiers and the
 * movement multiplier and modifier. DebouncedFieldMixin saves each field as it changes; the window stays open after
 * submit so the user can tweak values during combat setup.
 */
import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";
import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";

/**
 * The combat configuration window for one actor.
 */
export default class CombatConfigApplication extends DebouncedFieldMixin(
  foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
) {
  static DEFAULT_OPTIONS = {
    id: "combat-config-{id}",
    classes: ["l5r4", "l5r4-combat-config"],
    tag: "form",
    window: {
      title: "l5r4.apps.combatConfig.title",
      icon: "fa-solid fa-gear",
      resizable: true
    },
    position: {
      width: 400,
      height: 350
    },
    actions: {},
    form: {
      handler: CombatConfigApplication.prototype._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false // Keep open for tweaking initiative/movement during combat
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/combat-config.hbs`
    }
  };

  /**
   * Create a new CombatConfigApplication instance.
   *
   * @param {Actor} actor - The actor whose combat settings are being configured
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("CombatConfigApplication requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `combat-config-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
    this._initializeDebouncing();
  }

  /**
   * Dynamic window title including actor name.
   *
   * @returns {string} Localized title with actor name
   */
  get title() {
    return F("l5r4.apps.combatConfig.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /**
   * Prepare context data for rendering the combat configuration form. The form edits the stored values
   * (`source`): the prepared ones already hold rule modifiers and an NPC's formula, and writing them back would
   * count those twice (#30).
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with actor and system data
   * @override
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "CombatConfig: No actor reference");
      return this._getFallbackContext();
    }

    try {
      return {
        actor: this.actor,
        source: this.actor._source.system
      };
    } catch (err) {
      logError("Failed to prepare combat config context", err, {
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
      actor: this.actor,
      source: {
        initiative: { roll: 0, keep: 0, rollMod: 0, keepMod: 0, totalMod: 0 },
        movement: { multiplier: 1, modifier: 0 }
      }
    };
  }

  // _onRender and _onFieldChange are provided by DebouncedFieldMixin

  /**
   * Update actor with new combat configuration value.
   * Updates system data fields for initiative and movement settings.
   * Includes validation to prevent updates after application close.
   *
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
   */
  async _updateActor(field, value) {
    try {
      if (!this.actor) {
        console.warn(`${SYS_ID}`, "CombatConfig: No actor for update");
        return;
      }

      if (!this.rendered) {
        console.warn(`${SYS_ID}`, "CombatConfig: Update after close");
        return;
      }

      const updateData = { [`system.${field}`]: value };
      await this.actor.update(updateData);
    } catch (err) {
      logError("Failed to update combat config", err, {
        field,
        value,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.combatConfig.errors.updateFailed"));
    }
  }

  /**
   * Form submit handler.
   * Prevents default form submission since updates are handled via field changes.
   *
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} _form - The form element (unused)
   * @param {FormData} _formData - The form data (unused)
   */
  async _onSubmitForm(event, _form, _formData) {
    if (event) {
      event.preventDefault();
    }
  }

  // close() method is provided by DebouncedFieldMixin
}
