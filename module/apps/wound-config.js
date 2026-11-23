/**
 * @module apps/wound-config
 * @description A form window for one actor's wound tracking: manual or formula Wounds, the Earth multiplier, the
 * Wound and penalty modifiers, and an NPC's number of Wound Ranks. DebouncedFieldMixin saves each field as it
 * changes, and `_validateFieldValue` rejects a value outside the allowed range first; the window stays open after
 * submit so the user can make several adjustments.
 */
import { SYS_ID } from "../config/constants.js";
import { NPC_NUMBER_WOUND_LEVELS } from "../config/game-mechanics.js";
import { F, T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";
import { DebouncedFieldMixin, toFieldValue } from "../mixins/debounced-field-mixin.js";

/**
 * Valid wound calculation modes.
 * @constant {string[]}
 */
const VALID_WOUND_MODES = Object.freeze(["manual", "formula"]);

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

/**
 * The wound configuration window for one actor.
 */
export default class WoundConfigApplication extends DebouncedFieldMixin(
  foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
) {
  static DEFAULT_OPTIONS = {
    id: "wound-config-{id}",
    classes: ["l5r4", "l5r4-wound-config"],
    tag: "form",
    window: {
      title: "l5r4.apps.woundConfig.title",
      icon: "fa-solid fa-gear",
      resizable: true
    },
    position: {
      width: 500,
      height: 400
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
    return F("l5r4.apps.woundConfig.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /**
   * Prepare context data for rendering the wound configuration form.
   * Retrieves wound mode, multipliers, modifiers, and NPC wound levels.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with wound configuration data
   * @override
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
          npcNumberWoundLevels: NPC_NUMBER_WOUND_LEVELS
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
        npcNumberWoundLevels: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 }
      }
    };
  }

  // _onRender is provided by DebouncedFieldMixin

  /**
   * Handle field change events with validation notification.
   * Overrides DebouncedFieldMixin to add user notification on validation failure.
   *
   * @param {Event} event - The change event
   * @param {HTMLElement} element - The form field element that changed
   * @override
   */
  async _onFieldChange(event, element) {
    const field = element.name;
    const value = toFieldValue(element);

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

    this.updateDebounced(field, validatedValue);
  }

  /**
   * Validate field values before applying updates.
   * Enforces constraints on wound mode, multipliers, NPC wound levels, and modifiers.
   * Overrides DebouncedFieldMixin validation hook.
   *
   * @param {string} field - The field name being validated
   * @param {*} value - The value to validate
   * @returns {*|null} Validated value or null if invalid
   * @override
   */
  _validateFieldValue(field, value) {
    switch (field) {
      case "woundMode":
        return validateWoundMode(value);

      case "woundsMultiplier":
        return validateWholeNumber(field, value, {
          min: MIN_WOUND_MULTIPLIER,
          max: MAX_WOUND_MULTIPLIER
        });

      case "nrWoundLvls":
        return validateWholeNumber(field, value, {
          min: MIN_NPC_WOUND_LEVELS,
          max: MAX_NPC_WOUND_LEVELS
        });

      case "woundsMod":
      case "woundsPenaltyMod":
      case "wounds.mod":
        return validateModifier(field, value);

      default:
        return value;
    }
  }

  /**
   * Update actor with new wound configuration value.
   * Validates field value before updating, prevents updates after application close. The wound mode decides which
   * fields the window shows, so a new mode renders it again.
   *
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
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
      if (field === "woundMode" && this.rendered) {
        this.render();
      }
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
   */
  async _onSubmitForm(event, _form, _formData) {
    if (event) {
      event.preventDefault();
    }
  }

  // close() method is provided by DebouncedFieldMixin
}

/**
 * A wound mode from the form: "manual" or "formula".
 * @param {*} value
 * @returns {string|null} The mode, or null when it is neither
 */
function validateWoundMode(value) {
  if (!VALID_WOUND_MODES.includes(value)) {
    console.warn(`${SYS_ID}`, `Invalid woundMode: ${value}. Must be "manual" or "formula".`);
    return null;
  }
  return value;
}

/**
 * A whole number from the form within its field's range.
 * @param {string} field - The field name, for the warning
 * @param {*} value
 * @param {object} range
 * @param {number} range.min - The least value allowed
 * @param {number} range.max - The greatest value allowed
 * @returns {number|null} The number, or null when it is not a whole number in range
 */
function validateWholeNumber(field, value, { min, max }) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    console.warn(`${SYS_ID}`, `Invalid ${field}: ${value}. Must be integer ${min}-${max}.`);
    return null;
  }
  return number;
}

/**
 * A Wound or penalty modifier from the form, rounded down.
 * @param {string} field - The field name, for the warning
 * @param {*} value
 * @returns {number|null} The modifier, or null when it is not a finite number
 */
function validateModifier(field, value) {
  const mod = Number(value);
  if (!Number.isFinite(mod)) {
    console.warn(`${SYS_ID}`, `Invalid ${field}: ${value}. Must be a number.`);
    return null;
  }
  return Math.floor(mod);
}
