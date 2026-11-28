/**
 * @module apps/armor-config
 * @description A form window for one actor's armor values: the Armor TN modifier, the reduction modifier, and
 * whether armor items stack. FieldSaveMixin saves each field as it changes; the window stays open after submit so the
 * user can make several adjustments.
 */
import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";
import { buildAddedValues } from "../utils/added-values.js";
import { getWindowId } from "../utils/window-id.js";
import { FieldSaveMixin } from "../mixins/field-save-mixin.js";

/**
 * The number fields Active Effects can add to, by their form names.
 * @constant {string[]}
 */
const ADDED_FIELDS = Object.freeze(["armorTn.mod", "armorTn.reductionMod"]);

/**
 * The armor configuration window for one actor.
 */
export default class ArmorConfigApplication extends FieldSaveMixin(
  foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
) {
  static DEFAULT_OPTIONS = {
    id: "armor-config-{id}",
    classes: ["l5r4", "l5r4-armor-config"],
    tag: "form",
    window: {
      title: "l5r4.apps.armorConfig.title",
      icon: "fa-solid fa-gear",
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
      id: ArmorConfigApplication.getWindowId(actor)
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
    return F("l5r4.apps.armorConfig.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /**
   * Prepare context data for rendering the armor configuration form. The form edits the stored modifiers (`source`):
   * the prepared ones hold what Active Effects add, and writing them back would count that twice. What they add
   * shows as a hint under each field (`added`, #184).
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with actor, stored system data, additions, and allowArmorStacking flag
   * @override
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "ArmorConfig: No actor reference");
      return this._getFallbackContext();
    }

    try {
      const allowArmorStacking = this.actor?.getFlag?.(SYS_ID, "allowArmorStacking") ?? false;

      const source = this.actor._source.system;
      return {
        actor: this.actor,
        source,
        added: buildAddedValues(source, this.actor.system, ADDED_FIELDS),
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
   */
  _getFallbackContext() {
    return {
      actor: this.actor,
      source: {
        armorTn: { mod: 0, reductionMod: 0 }
      },
      added: {},
      allowArmorStacking: false
    };
  }

  // _onRender and _onFieldChange are provided by FieldSaveMixin

  /**
   * Update actor with new armor configuration value.
   * Handles both system data fields and flag-based allowArmorStacking setting.
   *
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
   */
  async _updateActor(field, value) {
    try {
      if (!this.actor) {
        console.warn(`${SYS_ID}`, "ArmorConfig: No actor for update");
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
   */
  async _onSubmitForm(event, _form, _formData) {
    if (event) {
      event.preventDefault();
    }
  }

  /**
   * The id of the actor's window, from its UUID, so each token's actor has its own (#189).
   * @param {Actor} actor
   * @returns {string}
   */
  static getWindowId(actor) {
    return getWindowId("armor-config", actor.uuid);
  }
}
