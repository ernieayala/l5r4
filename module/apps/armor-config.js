/**
 * Armor Configuration Application
 *
 * Provides a form interface for configuring actor armor values including TN modifiers,
 * reduction modifiers, and armor stacking behavior.
 *
 * Key Responsibilities:
 * - **Armor TN Configuration**: Manage armor TN bonus and modifiers
 * - **Reduction Configuration**: Manage armor reduction values
 * - **Stacking Behavior**: Toggle armor stacking flag for multiple armor items
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses data-action delegation for event handling
 * - Implements debounced updates for real-time field changes
 *
 * Architectural Notes:
 * - **Uses DebouncedFieldMixin**: Real-time numeric updates needed for TN/reduction values
 * - **Actor-based constructor**: Standard pattern for actor configuration dialogs
 * - **closeOnSubmit: false**: Keeps dialog open for multiple adjustments during setup
 *
 * @module apps/armor-config
 */

// Config imports
import { SYS_ID } from "../config/constants.js";

// Utils imports
import { T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";

// Mixins
import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";

export default class ArmorConfigApplication extends DebouncedFieldMixin(
  foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
) {
  static DEFAULT_OPTIONS = {
    id: "armor-config-{id}",
    classes: ["l5r4", "armor-config-app"],
    tag: "form",
    window: {
      title: "l5r4.apps.armorConfig.title",
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
      closeOnSubmit: false // Keep open for multiple armor adjustments
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/armor-config.hbs`
    }
  };

  /**
   * Create a new ArmorConfigApplication instance.
   *
   * @param {Actor} actor - The actor whose armor is being configured
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("ArmorConfigApplication requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `armor-config-${actor.id}`
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
    const baseTitle = T("l5r4.apps.armorConfig.title");
    return `${baseTitle}: ${this.actor?.name ?? "Unknown"}`;
  }

  /**
   * Prepare context data for rendering the armor configuration form.
   * Retrieves armor TN values, reduction modifiers, and stacking flag from actor.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with actor, system data, and allowArmorStacking flag
   * @private
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "ArmorConfig: No actor reference");
      return this._getFallbackContext();
    }

    try {
      const allowArmorStacking = this.actor?.getFlag?.(SYS_ID, "allowArmorStacking") ?? false;

      return {
        actor: this.actor,
        system: this.actor?.system ?? {},
        allowArmorStacking
      };
    } catch (err) {
      logError("Failed to prepare armor config context", err, {
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
      actor: this.actor,
      system: {
        armorTn: { mod: 0, reductionMod: 0 }
      },
      allowArmorStacking: false
    };
  }

  // _onRender and _onFieldChange are provided by DebouncedFieldMixin

  /**
   * Update actor with new armor configuration value.
   * Handles both system data fields and flag-based allowArmorStacking setting.
   * Includes validation to prevent updates after application close.
   *
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
   * @private
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

      let updateData;
      if (field === "allowArmorStacking") {
        updateData = { [`flags.${SYS_ID}.allowArmorStacking`]: value };
      } else {
        updateData = { [`system.${field}`]: value };
      }

      await this.actor.update(updateData);
    } catch (err) {
      logError("Failed to update armor config", err, {
        field,
        value,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.armorConfig.errors.updateFailed"));
    }
  }

  /**
   * Form submit handler.
   * Prevents default form submission since updates are handled via field changes.
   *
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} _form - The form element (unused)
   * @param {FormData} _formData - The form data (unused)
   * @private
   */
  async _onSubmitForm(event, _form, _formData) {
    if (event) {
      event.preventDefault();
    }
  }

  // close() method is provided by DebouncedFieldMixin
}
