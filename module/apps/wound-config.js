/**
 * @fileoverview L5R4 Wound Configuration Application for Foundry VTT v13+
 * 
 * This module provides a comprehensive wound system configuration interface for L5R4 NPCs,
 * built on Foundry's modern ApplicationV2 architecture. It replaces the inline configuration
 * section with a dedicated application window that provides real-time updates.
 *
 * @author L5R4 System Team
 * @since 2.1.0
 * @version 2.1.0
 */

import { SYS_ID } from "../config.js";

/**
 * Wound Configuration Application using ApplicationV2 architecture
 * Provides real-time wound system configuration for NPC actors
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
      template: "systems/l5r4/templates/apps/wound-config.hbs"
    }
  };

  /**
   * @param {Actor} actor - The NPC actor whose wounds to configure
   * @param {object} options - Application options
   */
  constructor(actor, options = {}) {
    // Set actor first, then merge with unique ID options
    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `wound-config-${actor.id}`
    });
    super(mergedOptions);
    this.actor = actor;
    this.#updateDebounced = foundry.utils.debounce(this.#updateActor.bind(this), 300);
    
    this._debug("Constructor", { actorId: this.actor.id, appId: this.id });
  }

  /**
   * Debounced update function to prevent excessive actor modifications.
   * @type {Function}
   * @private
   */
  #updateDebounced;

  /**
   * Debug logging helper - only logs if debug mode is enabled.
   * @param {string} message - Debug message
   * @param {object} data - Additional data to log
   * @private
   */
  _debug(message, data = {}) {
    // Debug logging can be enabled via browser console: game.settings.set("l5r4", "debugWoundConfig", true)
    if (game.settings?.get(SYS_ID, "debugWoundConfig")) {
      console.log(`L5R4 | WoundConfig | ${message}:`, data);
    }
  }

  /**
   * Prepare context data for the Wound Configuration template.
   * Provides current wound system configuration and computed values.
   * @returns {Promise<object>} Template context data
   */
  async _prepareContext(options) {
    const sys = this.actor.system;
    
    try {
      // Ensure we have the wound levels config with fallback
      const npcNumberWoundLvls = CONFIG.L5R4?.npcNumberWoundLvls || { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 };
      
      const context = {
        actor: this.actor,
        system: sys,
        woundMode: sys.woundMode || "manual",
        nrWoundLvls: sys.nrWoundLvls || 3,
        woundsMultiplier: sys.woundsMultiplier || 2,
        woundsMod: sys.woundsMod || 0,
        woundsPenaltyMod: sys.woundsPenaltyMod || 0,
        wounds: sys.wounds || {},
        visibleManualWoundLevels: sys.visibleManualWoundLevels || {},
        config: {
          ...CONFIG.L5R4,
          npcNumberWoundLvls
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
      console.warn("L5R4", "Failed to prepare wound config context", { err, actorId: this.actor?.id });
      // Comprehensive error handling with fallback context
      return {
        actor: this.actor,
        system: sys || {},
        woundMode: "manual",
        nrWoundLvls: 3,
        woundsMultiplier: 2,
        woundsMod: 0,
        wounds: {},
        visibleManualWoundLevels: {},
        config: { 
          npcNumberWoundLvls: { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 }
        }
      };
    }
  }

  /**
   * Called after the application is rendered to set up event handlers.
   * 
   * @param {ApplicationRenderContext} context - The render context
   * @param {object} options - Render options
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
      console.warn("L5R4", "WoundConfig _onRender: No element reference available");
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
    
    // Set up direct event listeners to ensure immediate response
    this._setupDirectEventListeners();
  }

  /**
   * Set up direct event listeners to supplement ApplicationV2 action delegation.
   * This ensures immediate response to user interactions.
   * @private
   */
  _setupDirectEventListeners() {
    if (!this.element) return;
    
    // Add direct change listeners to all form elements
    const formElements = this.element.querySelectorAll('input, select, textarea');
    
    formElements.forEach(element => {
      // Remove any existing listeners to prevent duplicates
      element.removeEventListener('change', this._onDirectChange);
      element.removeEventListener('input', this._onDirectInput);
      
      // Add new listeners
      element.addEventListener('change', this._onDirectChange.bind(this));
      element.addEventListener('input', this._onDirectInput.bind(this));
    });
    
    this._debug("Direct event listeners attached", { count: formElements.length });
  }

  /**
   * Direct change event handler for immediate response.
   * Supplements the ApplicationV2 action system.
   * 
   * @param {Event} event - Direct change event
   * @private
   */
  _onDirectChange(event) {
    const element = event.target;
    const action = element.dataset.action;
    
    this._debug("Direct Change Event", {
      elementName: element.name,
      elementType: element.type,
      elementValue: element.value,
      action: action,
      actorId: this.actor.id
    });
    
    // Route to appropriate handler based on action
    if (action === "wound-mode-change") {
      this._onWoundModeChange(event, element);
    } else if (action === "field-change") {
      this._onFieldChange(event, element);
    }
  }

  /**
   * Direct input event handler for immediate response to typing.
   * Provides real-time feedback for number inputs.
   * 
   * @param {Event} event - Direct input event
   * @private
   */
  _onDirectInput(event) {
    const element = event.target;
    
    // Only handle input events for number fields to provide immediate feedback
    if (element.type === "number" && element.dataset.action === "field-change") {
      this._debug("Direct Input Event", {
        elementName: element.name,
        elementValue: element.value,
        actorId: this.actor.id
      });
      
      // Use the same handler as change events
      this._onFieldChange(event, element);
    }
  }


  /**
   * Handle wound mode changes (Formula/Manual switch).
   * Re-renders the application to show appropriate fields.
   * 
   * @param {Event} event - Change event on wound mode dropdown
   * @param {HTMLElement} element - The dropdown element
   * @returns {Promise<void>}
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
      console.warn("L5R4", "Failed to update wound mode", { err, newMode, actorId: this.actor.id });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.woundConfigUpdateFailed"));
    }
  }

  /**
   * Handle field changes in the wound configuration form.
   * Debounces updates to prevent excessive actor modifications.
   * 
   * @param {Event} event - Change event on form field
   * @param {HTMLElement} element - The form element that changed
   * @returns {Promise<void>}
   */
  async _onFieldChange(event, element) {
    // Don't prevent default - let form elements work naturally
    const field = element.name;
    const value = element.type === "checkbox" ? element.checked :
                  (element.type === "number" || element.dataset.type === "Number") ? parseInt(element.value) || 0 :
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
      console.warn("L5R4", "Field change event with no field name", { element: element.outerHTML });
      return;
    }
    
    // Use debounced update to prevent excessive actor updates
    this.#updateDebounced(field, value);
  }


  /**
   * Update actor with new field value.
   * Internal method called by debounced update function.
   * 
   * @param {string} field - Field path to update
   * @param {any} value - New field value
   * @returns {Promise<void>}
   * @private
   */
  async #updateActor(field, value) {
    try {
      if (!this.actor) {
        console.warn("L5R4", "WoundConfig: No actor reference available for update");
        return;
      }
      
      if (this.rendered === false) {
        console.warn("L5R4", "WoundConfig: Attempted update after application closed");
        return;
      }
      
      const updateData = { [`system.${field}`]: value };
      
      this._debug("Actor Update", { 
        field, 
        value, 
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
      console.warn("L5R4", "Failed to update wound configuration", { 
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
   * Called automatically when form fields change due to submitOnChange: true.
   * 
   * @param {Event} event - Form change event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - Form data
   * @returns {Promise<void>}
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
   * @param {FormDataExtended} formData - Form data
   * @returns {Promise<void>}
   */
  async _onSubmitForm(event, form, formData) {
    if (event) event.preventDefault();
    // No action needed - all updates happen via change handlers
    this._debug("Form Submit Prevented", { actorId: this.actor.id });
  }

  /**
   * Clean up event listeners when the application is closed.
   * @param {object} options - Close options
   * @returns {Promise<void>}
   */
  async close(options = {}) {
    // Clean up direct event listeners
    if (this.element) {
      const formElements = this.element.querySelectorAll('input, select, textarea');
      formElements.forEach(element => {
        element.removeEventListener('change', this._onDirectChange);
        element.removeEventListener('input', this._onDirectInput);
      });
    }
    
    this._debug("Application Closing", { actorId: this.actor.id });
    return super.close(options);
  }

  /**
   * Get the window title for this application instance.
   * @returns {string} Localized window title
   */
  get title() {
    const baseTitle = game.i18n.localize("l5r4.ui.mechanics.wounds.woundConfiguration");
    return `${baseTitle}: ${this.actor.name}`;
  }
}
