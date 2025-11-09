/**
 * Condition Manager Application
 *
 * ApplicationV2 dialog for managing active status conditions on an actor.
 * Provides multi-checkbox interface for toggling conditions (excluding stances).
 *
 * Key Features:
 * - Browse all non-stance status effects from STATUS_EFFECTS constant
 * - Toggle conditions on/off via multi-checkbox (real-time updates)
 * - Automatically creates/removes ActiveEffects on the actor
 * - Excludes stance effects (handled separately via stance system)
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 (Foundry v13+)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Uses Foundry's multi-checkbox element for real-time toggling
 * - Manages actor.effects collection via Foundry API
 *
 * Workflow:
 * 1. User clicks condition manager button in combat panel
 * 2. Dialog opens showing all available conditions with multi-checkbox
 * 3. User clicks conditions to toggle them on/off (real-time)
 * 4. ActiveEffects are created/removed immediately on toggle
 *
 * @module apps/condition-manager
 * @see module:config/game-data.STATUS_EFFECTS - Status effect definitions
 * @see module:documents/actor/calculations/condition-effects - Condition effect application
 */

import { STATUS_EFFECTS } from "../config/game-data.js";
import { SYS_ID } from "../config/constants.js";

/**
 * Status IDs that are stances (excluded from condition manager).
 * Stances are managed via the stance system, not this dialog.
 *
 * @constant {Set<string>}
 */
const STANCE_IDS = new Set([
  "attackStance",
  "fullAttackStance",
  "defenseStance",
  "fullDefenseStance",
  "centerStance"
]);

/**
 * Get active status condition IDs from actor's effects.
 * Only returns non-stance conditions.
 *
 * @param {Actor} actor - The actor to check
 * @returns {Set<string>} Set of active condition IDs
 * @private
 */
function getActiveConditions(actor) {
  const conditions = new Set();

  if (!actor?.effects) {
    return conditions;
  }

  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

    const statuses = effect.statuses || new Set();
    for (const statusId of statuses) {
      if (!STANCE_IDS.has(statusId)) {
        conditions.add(statusId);
      }
    }
  }

  return conditions;
}

/**
 * Condition Manager dialog for toggling actor status conditions.
 *
 * Foundry ApplicationV2 that provides UI for enabling/disabling status conditions.
 * Uses multi-checkbox element for real-time toggling without save/cancel buttons.
 * Excludes stances which are managed via the stance system.
 *
 * @extends {foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)}
 */
export default class ConditionManager extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /**
   * Default application configuration options.
   * Defines window properties, CSS classes, and action handlers.
   *
   * @type {ApplicationConfiguration}
   */
  static DEFAULT_OPTIONS = {
    id: "condition-manager-{id}",
    classes: ["l5r4", "condition-manager"],
    window: {
      icon: "fa-solid fa-heart-pulse",
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    }
  };

  /**
   * Template parts for the application.
   * Uses single template for entire form.
   *
   * @type {Record<string, TemplatePartConfiguration>}
   */
  static PARTS = {
    form: {
      template: "systems/l5r4-enhanced/templates/apps/condition-manager.hbs"
    }
  };

  /**
   * Create ConditionManager instance.
   *
   * @param {Actor} actor - The actor whose conditions to manage
   */
  constructor(actor) {
    if (!actor) {
      throw new Error("ConditionManager requires an actor");
    }

    super({
      id: actor.id,
      window: {
        title: `${game.i18n.localize("l5r4.ui.common.conditions")}: ${actor.name}`
      }
    });

    this.actor = actor;
  }

  /**
   * Prepare context data for template rendering.
   * Filters out stances and marks which conditions are currently active.
   *
   * @param {RenderOptions} options - Rendering options
   * @returns {Promise<ApplicationRenderContext>} Template context data
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get active conditions for this actor
    const activeConditions = getActiveConditions(this.actor);

    // Filter out stances and map to template-friendly format
    const conditionList = STATUS_EFFECTS.filter(status => !STANCE_IDS.has(status.id)).map(
      status => ({
        id: status.id,
        name: status.name,
        img: status.img,
        active: activeConditions.has(status.id)
      })
    );

    return {
      ...context,
      actor: this.actor,
      actorName: this.actor.name,
      conditionList
    };
  }

  /**
   * Attach event listeners after rendering.
   * Sets up change listener on multi-checkbox for real-time toggling.
   *
   * @param {ApplicationRenderContext} context - Render context
   * @param {RenderOptions} options - Render options
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Find the multi-checkbox element and attach change listener
    const multiCheckbox = this.element.querySelector("multi-checkbox");

    if (multiCheckbox) {
      // Listen for change events on the multi-checkbox (fired when selection changes)
      multiCheckbox.addEventListener("change", this._onCheckboxChange.bind(this));
    }
  }

  /**
   * Refresh all tokens associated with an actor.
   * Updates token status icons and appearance to reflect current ActiveEffects.
   *
   * @param {Actor} actor - The actor whose tokens should be refreshed
   * @returns {void}
   * @private
   */
  _refreshTokens(actor) {
    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      token.object?.refresh();
    }
  }

  /**
   * Handle change event on multi-checkbox.
   * Triggered when user toggles a condition checkbox.
   *
   * @param {Event} event - Change event from multi-checkbox
   * @returns {Promise<void>}
   * @private
   */
  async _onCheckboxChange(event) {
    // The change event target is the multi-checkbox element
    const multiCheckbox = event.target;

    // Get selected values from the multi-checkbox's value property
    let selectedValues = new Set();
    if (Array.isArray(multiCheckbox.value)) {
      selectedValues = new Set(multiCheckbox.value);
    } else if (multiCheckbox.value) {
      selectedValues = new Set([multiCheckbox.value]);
    }

    // Get previously active conditions from actor
    const previouslyActive = getActiveConditions(this.actor);

    // Find conditions to add (selected but not previously active)
    const toAdd = Array.from(selectedValues).filter(id => !previouslyActive.has(id));

    // Find conditions to remove (previously active but not selected)
    const toRemove = Array.from(previouslyActive).filter(id => !selectedValues.has(id));

    // Add new conditions
    for (const conditionId of toAdd) {
      const statusDef = STATUS_EFFECTS.find(s => s.id === conditionId);

      if (statusDef) {
        await this.actor.createEmbeddedDocuments("ActiveEffect", [
          {
            name: game.i18n.localize(statusDef.name),
            icon: statusDef.img,
            statuses: [conditionId],
            flags: {
              [SYS_ID]: {
                conditionId: conditionId
              }
            }
          }
        ]);
      }
    }

    // Remove deselected conditions
    for (const conditionId of toRemove) {
      const effectToRemove = this.actor.effects.find(
        e => !e.disabled && e.statuses?.has(conditionId)
      );

      if (effectToRemove) {
        await effectToRemove.delete();
      }
    }

    // Refresh tokens if any changes were made
    if (toAdd.length > 0 || toRemove.length > 0) {
      this._refreshTokens(this.actor);
    }
  }
}
