/**
 * @fileoverview L5R4 Wound Configuration Application for Foundry VTT v13+
 * 
 * This module provides a comprehensive wound system configuration interface for L5R4 actors,
 * built on Foundry's modern ApplicationV2 architecture. It replaces the inline configuration
 * section with a dedicated application window that provides real-time updates via debouncing.
 *
 * **Event Handling:**
 * - Uses ApplicationV2 action delegation for all user interactions
 * - Debounced updates (300ms) prevent excessive actor modifications
 * - Actions: `wound-mode-change`, `field-change`
 *
 * @author L5R4 System Team
 * @since 2.1.0
 * @version 2.0.0
 */

import { SYS_ID } from "../config/constants.js";
import { NPC_NUMBER_WOUND_LVLS } from "../config/game-data.js";

/**
 * Validation constants for wound configuration per game rules.
 * @see game-rules/Combat_and_Wounds.md
 */
const VALID_WOUND_MODES = ["manual", "formula"];
const MIN_WOUND_MULTIPLIER = 2; // Earth x2 (lethal)
const MAX_WOUND_MULTIPLIER = 5; // Earth x5 (juggernaut)
const MIN_NPC_WOUND_LEVELS = 1;
const MAX_NPC_WOUND_LEVELS = 8;

/**
 * Wound Configuration Application using ApplicationV2 architecture.
 * Provides real-time wound system configuration for PC and NPC actors.
 * 
 * **Features:**
 * - Formula vs Manual wound mode switching
 * - Configurable wound levels, multipliers, and modifiers
 * - Real-time updates with debouncing
 * - Singleton pattern (one window per actor)
 * 
 * **Event System:**
 * Uses ApplicationV2 action delegation exclusively:
 * - `wound-mode-change`: Switches between Formula/Manual modes
 * - `field-change`: Updates numeric/text fields with debouncing
 * 
 * @extends {ApplicationV2}
 * @mixes {HandlebarsApplicationMixin}
 */
export default class WoundConfigApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  
  /**
   * Default application configuration options.
   * Defines window appearance, form behavior, and action handlers.
   * @type {object}
   * @property {string} id - Unique identifier template with {id} placeholder
   * @property {string[]} classes - CSS classes applied to application
   * @property {string} tag - HTML tag for the application root (form element)
   * @property {object} window - Window chrome configuration
   * @property {object} position - Default window dimensions
   * @property {object} actions - Action handler mappings for event delegation
   * @property {object} form - Form submission and change behavior
   */
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

  /**
   * Application template parts configuration.
   * Defines the Handlebars template used for rendering the form.
   * @type {object}
   * @property {object} form - Main form template configuration
   * @property {string} form.template - Path to the Handlebars template file
   */
  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/wound-config.hbs`
    }
  };

  /**
   * Creates a new Wound Configuration Application instance.
   * Generates a unique application ID per actor to enable singleton behavior.
   * 
   * @param {Actor} actor - The actor whose wounds to configure (PC or NPC)
   * @param {object} options - Additional application options to merge with defaults
   */
  constructor(actor, options = {}) {
    // Set actor first, then merge with unique ID options for singleton behavior
    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `wound-config-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
    // Create debounced update function (300ms delay) to batch rapid field changes
    this._updateDebounced = foundry.utils.debounce(this._updateActor.bind(this), 300);
    
    this._debug("Constructor", { actorId: this.actor.id, appId: this.id });
  }

  /**
   * Debounced version of _updateActor to prevent excessive actor modifications.
   * Waits 300ms after the last call before executing the update.
   * Set in constructor via foundry.utils.debounce().
   * @type {Function}
   * @private
   * @see _updateActor
   */
  _updateDebounced;

  /**
   * Debug logging helper - only logs if debug mode is enabled.
   * @param {string} message - Debug message
   * @param {object} data - Additional data to log
   * @private
   */
  _debug(message, data = {}) {
    // Debug logging can be enabled via browser console: game.settings.set("l5r4-enhanced", "debugWoundConfig", true)
    if (game.settings?.get(SYS_ID, "debugWoundConfig")) {
      console.log(`${SYS_ID} | WoundConfig | ${message}:`, data);
    }
  }

  /**
   * Prepare context data for the Wound Configuration template.
   * Provides current wound system configuration and computed values.
   * @param {object} options - Render options (unused but required by ApplicationV2)
   * @returns {Promise<object>} Template context data
   * @returns {object} context - The prepared context object
   * @returns {Actor} context.actor - The actor being configured
   * @returns {object} context.system - Actor's system data
   * @returns {string} context.woundMode - Current wound calculation mode ("manual" or "formula")
   * @returns {number} context.nrWoundLvls - Number of wound levels (formula mode)
   * @returns {number} context.woundsMultiplier - Wound calculation multiplier
   * @returns {number} context.woundsMod - Wound pool modifier
   * @returns {number} context.woundsPenaltyMod - Wound penalty modifier
   * @returns {object} context.wounds - Wound level data
   * @returns {object} context.visibleManualWoundLevels - Visible manual wound levels
   * @returns {object} context.config - System configuration including npcNumberWoundLvls
   * @async
   */
  async _prepareContext(options) {
    // Guard against missing actor reference
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
   * Provides safe fallback context when _prepareContext fails.
   * @returns {object} Fallback context with safe defaults
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
   * Called after the application is rendered.
   * Logs debug information about the rendered DOM structure.
   * 
   * @param {object} context - The prepared context data from _prepareContext
   * @param {object} options - Render options passed to the render call
   * @returns {void}
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
    
    // Log all form elements for debugging
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
   * Handle wound mode changes (Formula/Manual switch).
   * Re-renders the application to show appropriate fields.
   * 
   * @param {Event} event - Change event on wound mode dropdown
   * @param {HTMLElement} element - The dropdown element that triggered the change
   * @returns {Promise<void>}
   * @async
   */
  async _onWoundModeChange(event, element) {
    // Don't prevent default for select elements - let them work naturally
    const newMode = element.value;
    
    this._debug("Mode Change", { 
      newMode, 
      oldMode: this.actor.system.woundMode,
      actorId: this.actor.id,
      elementName: element.name
    });
    
    // Only process if the value actually changed
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
   * Handle field changes in the wound configuration form.
   * Debounces updates to prevent excessive actor modifications.
   * Type coercion: checkboxes → boolean, numbers → int, others → string.
   * 
   * @param {Event} event - Change event on form field
   * @param {HTMLElement} element - The form element that changed
   * @returns {Promise<void>}
   * @async
   */
  async _onFieldChange(event, element) {
    // Don't prevent default - let form elements work naturally
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
    
    // Use debounced update to prevent excessive actor updates
    this._updateDebounced(field, value);
  }


  /**
   * Validates field value against game rules.
   * @param {string} field - Field name
   * @param {any} value - Value to validate
   * @returns {any|null} Validated value or null if invalid
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
        // Pass through other fields without validation
        return value;
    }
  }

  /**
   * Update actor with new field value.
   * Internal method called by debounced update function.
   * Guards against updates after application close and missing actor references.
   * Validates field values against game rules.
   * 
   * @param {string} field - Field path relative to system (e.g., "nrWoundLvls")
   * @param {any} value - New field value (already type-coerced)
   * @returns {Promise<void>}
   * @async
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
      
      // Validate field value against game rules
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
      
      // Foundry automatically re-renders sheets after actor updates
      
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
   * Handle form changes with real-time actor updates.
   * No-op: Action-based handlers (_onWoundModeChange, _onFieldChange) handle all updates.
   * Retained for ApplicationV2 compatibility.
   * 
   * @param {Event} event - Form change event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - Form data
   * @returns {Promise<void>}
   * @async
   */
  async _onChangeForm(event, form, formData) {
    // Since action-based handlers are working, we don't need this form handler
    // Just prevent any errors and let the action handlers do the work
    return;
  }

  /**
   * Handle form submission (prevent default browser behavior).
   * All updates happen via change handlers, no form submission needed.
   * 
   * @param {Event} event - Form submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - Form data object
   * @returns {Promise<void>}
   * @async
   */
  async _onSubmitForm(event, form, formData) {
    if (event) event.preventDefault();
    // No action needed - all updates happen via change handlers
    this._debug("Form Submit Prevented", { actorId: this.actor.id });
  }

  /**
   * Clean up when the application is closed.
   * Cancels any pending debounced updates to prevent race conditions.
   * @param {object} options - Close options passed to parent
   * @returns {Promise<void>}
   * @async
   */
  async close(options = {}) {
    this._debug("Application Closing", { actorId: this.actor.id });
    
    // Cancel any pending debounced updates to prevent race condition
    if (this._updateDebounced && typeof this._updateDebounced.cancel === "function") {
      this._updateDebounced.cancel();
    }
    
    return super.close(options);
  }

  /**
   * Get the window title for this application instance.
   * Overrides base ApplicationV2 title property to include actor name.
   * @returns {string} Localized window title with actor name (e.g., "Wound Configuration: Hida Bushi")
   */
  get title() {
    const baseTitle = game.i18n.localize("l5r4.ui.mechanics.wounds.woundConfiguration");
    return `${baseTitle}: ${this.actor.name}`;
  }
}
