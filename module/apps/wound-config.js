/**
 * Wound Configuration Application
 * 
 * Provides interactive UI for configuring actor wound mechanics per L5R4 core rules.
 * Manages wound calculation modes, Earth Ring multipliers, wound level counts, and penalty modifiers.
 * 
 * Game Mechanics Implemented:
 * - Wound Rank System: Healthy/Nicked/Grazed/Hurt/Injured/Crippled/Down/Out progression
 * - Earth Multiplier: Configurable lethality (Earth x2/x3/x4/x5) for wound capacity
 * - NPC Simplified Wounds: 1-8 wound levels instead of full 8-rank progression
 * - Manual vs Formula Modes: NPCs can use custom wounds or calculated Earth-based values
 * - Wound Penalties: TN penalties at each wound rank (+3/+5/+10/+15/+20/+40)
 * 
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin (Foundry v13+)
 * - Uses event delegation pattern via data-action attributes
 * - Implements debounced updates to prevent excessive actor updates
 * - Leverages foundry.utils.mergeObject for option composition
 * 
 * Responsibilities:
 * - Render wound configuration form from wound-config.hbs template
 * - Validate wound settings against game rule bounds (multiplier 2-5, NPC levels 1-8)
 * - Update actor.system wound properties with debouncing
 * - Provide fallback context on data preparation errors
 * 
 * @module apps/wound-config
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html}
 */

import { SYS_ID } from "../config/constants.js";
import { NPC_NUMBER_WOUND_LVLS } from "../config/game-data.js";

/**
 * Valid wound calculation modes for NPC actors.
 * - manual: Direct wound value entry (custom total wounds)
 * - formula: Earth Ring-based calculation (multiplier × Earth Ring)
 * @constant {string[]}
 */
const VALID_WOUND_MODES = ["manual", "formula"];

/**
 * Minimum Earth Ring multiplier for wound calculation.
 * Default L5R4 lethality is Earth x2 (very lethal, 1-3 round combats).
 * @constant {number}
 */
const MIN_WOUND_MULTIPLIER = 2;

/**
 * Maximum Earth Ring multiplier for wound calculation.
 * Earth x5 creates "juggernaut" characters with 7+ round combats.
 * @constant {number}
 */
const MAX_WOUND_MULTIPLIER = 5;

/**
 * Minimum wound levels for simplified NPC stat blocks.
 * @constant {number}
 */
const MIN_NPC_WOUND_LEVELS = 1;

/**
 * Maximum wound levels for simplified NPC stat blocks.
 * Standard progression is 8 levels (Healthy through Out).
 * @constant {number}
 */
const MAX_NPC_WOUND_LEVELS = 8;

/**
 * @typedef {Object} WoundConfigContext
 * @property {L5R4Actor} actor - The actor being configured
 * @property {object} system - Actor.system reference
 * @property {string} woundMode - "manual" or "formula" (NPCs only)
 * @property {number} nrWoundLvls - Number of wound levels for NPCs (1-8)
 * @property {number} woundsMultiplier - Earth Ring multiplier (2-5)
 * @property {number} woundsMod - Flat bonus to total wounds
 * @property {number} woundsPenaltyMod - Modifier to wound penalties
 * @property {object} wounds - Wound tracking data
 * @property {object} visibleManualWoundLevels - Manual wound level configuration
 * @property {object} config - Static configuration data
 * @property {object} config.npcNumberWoundLvls - NPC wound level lookup
 */

/**
 * Wound Configuration Application
 * 
 * ApplicationV2-based form for managing actor wound system settings.
 * Supports both PC and NPC wound configuration with game rule validation.
 * 
 * Features:
 * - Earth multiplier adjustment (2x-5x lethality scaling)
 * - NPC wound mode switching (manual/formula)
 * - Wound bonus/penalty modifiers
 * - Real-time validation with debounced updates
 * - Defensive error handling with fallback contexts
 * 
 * @extends {foundry.applications.api.ApplicationV2}
 * @mixes {foundry.applications.api.HandlebarsApplicationMixin}
 */
export default class WoundConfigApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wound-config-{id}",
    classes: ["l5r4", "wound-config-app"],
    tag: "form",
    window: {
      title: "l5r4.ui.mechanics.wounds.woundConfiguration",
      icon: "fas fa-cog",
      resizable: true
    },
    position: {
      width: 500,
      height: 400
    },
    actions: {
      "wound-mode-change": WoundConfigApplication.prototype._onWoundModeChange,
      "field-change": WoundConfigApplication.prototype._onFieldChange
    },
    form: {
      handler: WoundConfigApplication.prototype._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/wound-config.hbs`
    }
  };

  /**
   * Creates wound configuration application instance.
   * 
   * Initializes debounced update handler to prevent excessive actor.update() calls
   * during rapid field changes (e.g., typing in number inputs).
   * 
   * @param {L5R4Actor} actor - The actor to configure wounds for
   * @param {object} [options={}] - Application options (merged with defaults)
   * @param {string} [options.id] - Override app ID (auto-generated: wound-config-{actorId})
   */
  constructor(actor, options = {}) {
    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `wound-config-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
    // Debounce prevents update spam during rapid typing (300ms cooldown)
    this._updateDebounced = foundry.utils.debounce(this._updateActor.bind(this), 300);
    this._debug("Constructor", { actorId: this.actor.id, appId: this.id });
  }

  /**
   * Debounced update handler for actor wound configuration.
   * Set in constructor, called by _onFieldChange.
   * @type {Function}
   * @private
   */
  _updateDebounced;

  /**
   * Conditional debug logger for wound configuration operations.
   * Only logs when debugWoundConfig setting is enabled.
   * 
   * @param {string} message - Debug message identifier
   * @param {object} [data={}] - Contextual data to log
   * @private
   */
  _debug(message, data = {}) {
    if (game.settings?.get(SYS_ID, "debugWoundConfig")) {
      console.log(`${SYS_ID} | WoundConfig | ${message}:`, data);
    }
  }

  /**
   * Prepares context data for wound configuration template rendering.
   * 
   * Extracts actor.system wound properties and packages them with
   * NPC wound level configuration for Handlebars template consumption.
   * 
   * Error Resilience:
   * Falls back to safe defaults if actor or system data is corrupted.
   * 
   * @param {object} options - Render options from ApplicationV2
   * @returns {Promise<WoundConfigContext>} Template context with wound settings
   * @override
   * @async
   */
  async _prepareContext(options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "WoundConfig: No actor reference in _prepareContext");
      return this._getFallbackContext();
    }

    const sys = this.actor.system;

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

      this._debug("Context Prepared", {
        actorId: this.actor.id,
        woundMode: context.woundMode,
        nrWoundLvls: context.nrWoundLvls,
        hasVisibleManualWoundLevels: Object.keys(context.visibleManualWoundLevels || {}).length > 0,
        configKeys: Object.keys(context.config || {}).length
      });

      return context;
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to prepare wound config context", { err, actorId: this.actor?.id });
      return this._getFallbackContext();
    }
  }

  /**
   * Provides safe fallback context when actor data is unavailable or corrupted.
   * 
   * Returns minimum viable context with default wound settings:
   * - Manual mode with 3 wound levels
   * - Earth x2 multiplier (default L5R4 lethality)
   * - No modifiers or bonuses
   * 
   * Prevents template rendering crashes during edge cases.
   * 
   * @returns {WoundConfigContext} Minimal safe template context
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
        npcNumberWoundLvls: { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 }
      }
    };
  }

  /**
   * Post-render hook for ApplicationV2 lifecycle.
   * 
   * Logs form element discovery for debugging delegated event handlers.
   * All input events are handled via data-action delegation at form root.
   * 
   * @param {WoundConfigContext} context - Rendered template context
   * @param {object} options - Render options
   * @override
   */
  _onRender(context, options) {
    this._debug("_onRender called", {
      actorId: this.actor.id,
      element: this.element,
      hasElement: !!this.element,
      elementTagName: this.element?.tagName,
      elementClasses: this.element?.className
    });

    if (!this.element) {
      console.warn(`${SYS_ID}`, "WoundConfig _onRender: No element reference available");
      return;
    }

    const formElements = this.element.querySelectorAll('input, select, textarea');
    this._debug("Form Elements Found", {
      count: formElements.length,
      elements: Array.from(formElements).map(el => ({
        name: el.name,
        type: el.type,
        dataAction: el.dataset.action,
        value: el.value
      }))
    });
  }

  /**
   * Handles wound mode changes for NPC actors (manual vs formula).
   * 
   * Manual Mode: Direct total wound value entry
   * Formula Mode: Earth Ring-based calculation (multiplier × Earth)
   * 
   * Triggers full re-render to show/hide mode-specific fields.
   * 
   * @param {Event} event - Change event from select element
   * @param {HTMLSelectElement} element - The select element (data-action="wound-mode-change")
   * @returns {Promise<void>}
   * @async
   */
  async _onWoundModeChange(event, element) {
    const newMode = element.value;

    this._debug("Mode Change", {
      newMode,
      oldMode: this.actor.system.woundMode,
      actorId: this.actor.id,
      elementName: element.name
    });

    if (newMode === this.actor.system.woundMode) {
      this._debug("Mode unchanged, skipping update");
      return;
    }

    try {
      await this.actor.update({ "system.woundMode": newMode });
      this._debug("Mode Update Success, re-rendering");
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to update wound mode", { err, newMode, actorId: this.actor.id });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.woundConfigUpdateFailed"));
    }
  }

  /**
   * Handles field changes with debounced actor updates.
   * 
   * Coerces input types:
   * - checkbox → boolean
   * - number inputs → integer
   * - text → string
   * 
   * Updates are debounced (300ms) to prevent excessive actor.update() calls
   * during rapid typing in number fields.
   * 
   * @param {Event} event - Input/change event
   * @param {HTMLInputElement|HTMLSelectElement} element - Form element (data-action="field-change")
   * @returns {Promise<void>}
   * @async
   */
  async _onFieldChange(event, element) {
    const field = element.name;
    const value = element.type === "checkbox" ? element.checked :
                  (element.type === "number" || element.dataset.type === "Number") ? (parseInt(element.value) || 0) :
                  element.value;

    this._debug("Field Change", {
      field,
      value,
      type: element.type,
      dataType: element.dataset.type,
      actorId: this.actor.id,
      elementName: element.name
    });

    if (!field) {
      console.warn(`${SYS_ID}`, "Field change event with no field name", { element: element.outerHTML });
      return;
    }

    this._updateDebounced(field, value);
  }

  /**
   * Validates field values against L5R4 game rule bounds.
   * 
   * Validation Rules:
   * - woundMode: Must be "manual" or "formula"
   * - woundsMultiplier: Integer 2-5 (Earth x2 default, x5 max lethality)
   * - nrWoundLvls: Integer 1-8 (NPC simplified wound levels)
   * - woundsMod/woundsPenaltyMod: Any finite number (floored to integer)
   * 
   * @param {string} field - Field name from actor.system
   * @param {*} value - User-provided value to validate
   * @returns {*|null} Validated value, or null if invalid
   * @private
   */
  _validateFieldValue(field, value) {
    switch (field) {
      case "woundMode":
        if (!VALID_WOUND_MODES.includes(value)) {
          console.warn(`${SYS_ID}`, `Invalid woundMode: ${value}. Must be "manual" or "formula".`);
          return null;
        }
        return value;

      case "woundsMultiplier":
        const mult = Number(value);
        if (!Number.isInteger(mult) || mult < MIN_WOUND_MULTIPLIER || mult > MAX_WOUND_MULTIPLIER) {
          console.warn(`${SYS_ID}`, `Invalid woundsMultiplier: ${value}. Must be integer ${MIN_WOUND_MULTIPLIER}-${MAX_WOUND_MULTIPLIER}.`);
          return null;
        }
        return mult;

      case "nrWoundLvls":
        const lvl = Number(value);
        if (!Number.isInteger(lvl) || lvl < MIN_NPC_WOUND_LEVELS || lvl > MAX_NPC_WOUND_LEVELS) {
          console.warn(`${SYS_ID}`, `Invalid nrWoundLvls: ${value}. Must be integer ${MIN_NPC_WOUND_LEVELS}-${MAX_NPC_WOUND_LEVELS}.`);
          return null;
        }
        return lvl;

      case "woundsMod":
      case "woundsPenaltyMod":
        const mod = Number(value);
        if (!Number.isFinite(mod)) {
          console.warn(`${SYS_ID}`, `Invalid ${field}: ${value}. Must be a number.`);
          return null;
        }
        return Math.floor(mod);

      default:
        return value;
    }
  }

  /**
   * Debounced actor update handler for wound configuration changes.
   * 
   * Validates input, constructs system.{field} update object, and applies to actor.
   * Called via 300ms debounce to batch rapid changes (e.g., typing in number inputs).
   * 
   * Defensive Checks:
   * - Bails if actor reference lost
   * - Bails if application closed (rendered = false)
   * - Validates against game rules before update
   * 
   * @param {string} field - Actor.system field name (e.g., "woundsMultiplier")
   * @param {*} value - New field value (pre-coerced by _onFieldChange)
   * @returns {Promise<void>}
   * @private
   * @async
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

      const validatedValue = this._validateFieldValue(field, value);
      if (validatedValue === null) {
        ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.invalidWoundConfigValue"));
        return;
      }

      const updateData = { [`system.${field}`]: validatedValue };

      this._debug("Actor Update", {
        field,
        value,
        validatedValue,
        updateData,
        updatePath: `system.${field}`,
        actorId: this.actor.id,
        actorType: this.actor.type
      });

      await this.actor.update(updateData);

      this._debug("Update Success", {
        field,
        value,
        actorId: this.actor.id,
        updatedValue: foundry.utils.getProperty(this.actor.system, field)
      });

    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to update wound configuration", {
        err,
        field,
        value,
        actorId: this.actor?.id,
        errorMessage: err.message,
        errorStack: err.stack
      });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.woundConfigUpdateFailed"));
    }
  }

  /**
   * Form submission handler (ApplicationV2 form lifecycle).
   * 
   * Prevents default submission - all updates handled via debounced field changes.
   * No batch submission needed since changes apply immediately via _onFieldChange.
   * 
   * @param {Event} event - Submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - Submitted form data
   * @returns {Promise<void>}
   * @override
   * @async
   */
  async _onSubmitForm(event, form, formData) {
    if (event) event.preventDefault();
    this._debug("Form Submit Prevented", { actorId: this.actor.id });
  }

  /**
   * Cleanup hook when application closes.
   * 
   * Cancels any pending debounced updates to prevent orphaned actor.update()
   * calls after the form is closed.
   * 
   * @param {object} [options={}] - Close options
   * @returns {Promise<void>}
   * @override
   * @async
   */
  async close(options = {}) {
    this._debug("Application Closing", { actorId: this.actor.id });

    if (this._updateDebounced && typeof this._updateDebounced.cancel === "function") {
      this._updateDebounced.cancel();
    }

    return super.close(options);
  }

  /**
   * Dynamic window title with actor name.
   * 
   * @returns {string} Localized title: "Wound Configuration: {ActorName}"
   * @override
   */
  get title() {
    const baseTitle = game.i18n.localize("l5r4.ui.mechanics.wounds.woundConfiguration");
    return `${baseTitle}: ${this.actor.name}`;
  }
}
