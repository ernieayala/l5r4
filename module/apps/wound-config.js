/**
 * Wound Configuration Application
 *
 * Provides a form interface for configuring actor wound tracking including wound
 * calculation mode, multipliers, modifiers, and NPC wound level settings.
 *
 * Key Responsibilities:
 * - **Wound Mode Selection**: Toggle between manual and formula-based wound calculation
 * - **Multiplier Configuration**: Set wound multiplier for formula-based calculation
 * - **Modifier Management**: Configure wound and penalty modifiers
 * - **NPC Wound Levels**: Set number of wound levels for NPC actors
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses data-action delegation for event handling
 * - Implements debounced updates for real-time field changes
 * - Validates field values before applying updates
 *
 * Architectural Notes:
 * - **Uses DebouncedFieldMixin**: Real-time numeric updates with validation for multipliers/modifiers
 * - **Custom validation**: Overrides _validateFieldValue() to enforce wound calculation constraints
 * - **Actor-based constructor**: Standard pattern for actor configuration dialogs
 * - **closeOnSubmit: false**: Keeps dialog open for multiple adjustments during character setup
 *
 * @module apps/wound-config
 */

// Config imports
import { SYS_ID } from "../config/constants.js";
import { NPC_NUMBER_WOUND_LVLS } from "../config/game-mechanics.js";

// Utils imports
import { T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";

// Mixins
import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";

/**
 * Valid wound calculation modes.
 * @constant {string[]}
 */
const VALID_WOUND_MODES = ["manual", "formula"];

/**
 * Minimum allowed wound multiplier for formula-based calculation.
 * @constant {number}
 */
const MIN_WOUND_MULTIPLIER = 2;

/**
 * Maximum allowed wound multiplier for formula-based calculation.
 * @constant {number}
 */
const MAX_WOUND_MULTIPLIER = 5;

/**
 * Minimum number of wound levels for NPC actors.
 * @constant {number}
 */
const MIN_NPC_WOUND_LEVELS = 1;

/**
 * Maximum number of wound levels for NPC actors.
 * @constant {number}
 */
const MAX_NPC_WOUND_LEVELS = 8;

export default class WoundConfigApplication extends DebouncedFieldMixin(
  foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
) {
  static DEFAULT_OPTIONS = {
    id: "wound-config-{id}",
    classes: ["l5r4", "wound-config-app"],
    tag: "form",
    window: {
      title: "l5r4.apps.woundConfig.title",
      icon: "fas fa-cog",
      resizable: true
    },
    position: {
      width: 500,
      height: 400
    },
    actions: {
      "wound-mode-change": WoundConfigApplication.prototype._onWoundModeChange
    },
    form: {
      handler: WoundConfigApplication.prototype._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false // Keep open for adjusting multipliers/modifiers during setup
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/wound-config.hbs`
    }
  };

  /**
   * Create a new WoundConfigApplication instance.
   *
   * @param {Actor} actor - The actor whose wounds are being configured
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("WoundConfigApplication requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `wound-config-${actor.id}`
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
    const baseTitle = T("l5r4.apps.woundConfig.title");
    return `${baseTitle}: ${this.actor?.name ?? "Unknown"}`;
  }

  /**
   * Prepare context data for rendering the wound configuration form.
   * Retrieves wound mode, multipliers, modifiers, and NPC wound levels.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with wound configuration data
   * @private
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "WoundConfig: No actor reference in _prepareContext");
      return this._getFallbackContext();
    }

    const sys = this.actor?.system ?? {};

    try {
      const context = {
        actor: this.actor,
        system: sys,
        woundMode: sys.woundMode ?? "manual",
        nrWoundLvls: sys.nrWoundLvls ?? 3,
        woundsMultiplier: sys.woundsMultiplier ?? 2,
        woundsMod: sys.woundsMod ?? 0,
        woundsPenaltyMod: sys.woundsPenaltyMod ?? 0,
        wounds: sys.wounds ?? {},
        visibleManualWoundLevels: sys.visibleManualWoundLevels ?? {},
        config: {
          npcNumberWoundLvls: NPC_NUMBER_WOUND_LVLS
        }
      };

      return context;
    } catch (err) {
      logError("Failed to prepare wound config context", err, {
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
      system: {},
      woundMode: "manual",
      nrWoundLvls: 3,
      woundsMultiplier: 2,
      woundsMod: 0,
      woundsPenaltyMod: 0,
      wounds: {},
      visibleManualWoundLevels: {},
      config: {
        npcNumberWoundLvls: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 }
      }
    };
  }

  // _onRender is provided by DebouncedFieldMixin

  /**
   * Handle wound mode change action.
   * Switches between manual and formula-based wound calculation modes.
   *
   * @param {Event} event - The change event
   * @param {HTMLElement} element - The select element with new mode value
   * @private
   */
  async _onWoundModeChange(event, element) {
    const newMode = element.value;

    if (newMode === this.actor?.system?.woundMode) {
      return;
    }

    try {
      await this.actor.update({ "system.woundMode": newMode });
      if (this.rendered) {
        this.render();
      }
    } catch (err) {
      logError("Failed to update wound mode", err, {
        newMode,
        actorId: this.actor.id
      });
      ui.notifications?.error(T("l5r4.apps.woundConfig.errors.updateFailed"));
    }
  }

  /**
   * Handle field change events with validation notification.
   * Overrides DebouncedFieldMixin to add user notification on validation failure.
   *
   * @param {Event} event - The change event
   * @param {HTMLElement} element - The form field element that changed
   * @private
   */
  async _onFieldChange(event, element) {
    const field = element.name;

    // Type coercion (inherited from mixin logic)
    const value =
      element.type === "checkbox"
        ? element.checked
        : element.type === "number" || element.dataset.type === "Number"
          ? parseInt(element.value, 10) || 0
          : element.value;

    if (!field) {
      console.warn(`${SYS_ID}`, "Field change event with no field name");
      return;
    }

    // Validate and notify user if validation fails
    const validatedValue = this._validateFieldValue(field, value);
    if (validatedValue === null) {
      ui.notifications?.warn(T("l5r4.apps.woundConfig.errors.invalidWoundConfigValue"));
      return;
    }

    this._updateDebounced(field, validatedValue);
  }

  /**
   * Validate field values before applying updates.
   * Enforces constraints on wound mode, multipliers, NPC wound levels, and modifiers.
   * Overrides DebouncedFieldMixin validation hook.
   *
   * @param {string} field - The field name being validated
   * @param {*} value - The value to validate
   * @returns {*|null} Validated value or null if invalid
   * @protected
   */
  _validateFieldValue(field, value) {
    switch (field) {
      case "woundMode":
        if (!VALID_WOUND_MODES.includes(value)) {
          console.warn(`${SYS_ID}`, `Invalid woundMode: ${value}. Must be "manual" or "formula".`);
          return null;
        }
        return value;

      case "woundsMultiplier": {
        const mult = Number(value);
        if (!Number.isInteger(mult) || mult < MIN_WOUND_MULTIPLIER || mult > MAX_WOUND_MULTIPLIER) {
          console.warn(
            `${SYS_ID}`,
            `Invalid woundsMultiplier: ${value}. Must be integer ${MIN_WOUND_MULTIPLIER}-${MAX_WOUND_MULTIPLIER}.`
          );
          return null;
        }
        return mult;
      }

      case "nrWoundLvls": {
        const lvl = Number(value);
        if (!Number.isInteger(lvl) || lvl < MIN_NPC_WOUND_LEVELS || lvl > MAX_NPC_WOUND_LEVELS) {
          console.warn(
            `${SYS_ID}`,
            `Invalid nrWoundLvls: ${value}. Must be integer ${MIN_NPC_WOUND_LEVELS}-${MAX_NPC_WOUND_LEVELS}.`
          );
          return null;
        }
        return lvl;
      }

      case "woundsMod":
      case "woundsPenaltyMod":
      case "wounds.mod": {
        const mod = Number(value);
        if (!Number.isFinite(mod)) {
          console.warn(`${SYS_ID}`, `Invalid ${field}: ${value}. Must be a number.`);
          return null;
        }
        return Math.floor(mod);
      }

      default:
        return value;
    }
  }

  /**
   * Update actor with new wound configuration value.
   * Validates field value before updating, prevents updates after application close.
   *
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
   * @private
   */
  async _updateActor(field, value) {
    try {
      if (!this.actor) {
        console.warn(`${SYS_ID}`, "WoundConfig: No actor reference available for update");
        return;
      }

      if (!this.rendered || this.rendered === false) {
        console.warn(`${SYS_ID}`, "WoundConfig: Attempted update after application closed");
        return;
      }

      const updateData = { [`system.${field}`]: value };

      await this.actor.update(updateData);
    } catch (err) {
      logError("Failed to update wound configuration", err, {
        field,
        value,
        actorId: this.actor?.id
      });
      ui.notifications?.error(T("l5r4.apps.woundConfig.errors.updateFailed"));
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
