/**
 * Condition Manager Application
 *
 * Provides an interface for managing actor status conditions and effects.
 * Filters out stance effects and displays only non-stance conditions.
 *
 * Key Responsibilities:
 * - **Condition Display**: Show all available non-stance conditions
 * - **Condition Toggle**: Enable/disable conditions via multi-checkbox interface
 * - **Effect Management**: Create and delete ActiveEffect documents for conditions
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses ActiveEffect documents for condition tracking
 * - Refreshes tokens when conditions change
 *
 * Architectural Notes:
 * - **No DebouncedFieldMixin**: Uses custom multi-checkbox component with batched updates
 * - **Actor-based constructor**: Standard pattern for actor configuration dialogs
 * - **No form submission**: Multi-checkbox component handles change events directly
 *
 * @module apps/condition-manager
 */

// Config imports
import { SYS_ID } from "../config/constants.js";
import { STATUS_EFFECTS } from "../config/game-data.js";

// Utils imports
import { T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";

/**
 * Set of stance effect IDs to exclude from condition manager.
 * Stances are managed separately via combat configuration.
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
 * Get all active non-stance conditions from an actor.
 * Filters out disabled effects and stance effects.
 *
 * @param {Actor} actor - The actor to check for conditions
 * @returns {Set<string>} Set of active condition IDs
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

export default class ConditionManager extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "condition-manager-{id}",
    classes: ["l5r4", "condition-manager"],
    window: {
      title: "l5r4.apps.conditionManager.title",
      icon: "fa-solid fa-heart-pulse",
      resizable: true
    },
    position: {
      width: 500,
      height: 280
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/condition-manager.hbs`
    }
  };

  /**
   * Create a new ConditionManager instance.
   *
   * @param {Actor} actor - The actor whose conditions are being managed
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("ConditionManager requires an actor");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `condition-manager-${actor.id}`
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
    const baseTitle = T("l5r4.apps.conditionManager.title");
    return `${baseTitle}: ${this.actor?.name ?? "Unknown"}`;
  }

  /**
   * Prepare context data for rendering the condition manager.
   * Retrieves all non-stance conditions and marks which are currently active.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with actor and condition list
   * @private
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "ConditionManager: No actor reference");
      return this._getFallbackContext();
    }

    try {
      const context = await super._prepareContext(_options);

      const activeConditions = getActiveConditions(this.actor);

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
    } catch (err) {
      logError("Failed to prepare condition manager context", err, {
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
      actorName: this.actor?.name ?? "Unknown",
      conditionList: []
    };
  }

  /**
   * Foundry lifecycle hook called after rendering.
   * Attaches change event listener to multi-checkbox component.
   *
   * @param {object} context - Render context
   * @param {object} options - Render options
   * @private
   */
  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.element) {
      console.warn(`${SYS_ID}`, "ConditionManager _onRender: No element");
      return;
    }

    const multiCheckbox = this.element.querySelector("multi-checkbox");

    if (multiCheckbox) {
      multiCheckbox.addEventListener("change", this._onCheckboxChange.bind(this));
    }
  }

  /**
   * Refresh all active tokens for an actor to display updated condition icons.
   *
   * @param {Actor} actor - The actor whose tokens should be refreshed
   * @private
   */
  _refreshTokens(actor) {
    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      token.object?.refresh();
    }
  }

  /**
   * Handle multi-checkbox change events to add or remove conditions.
   * Compares selected conditions with currently active conditions,
   * creates ActiveEffect documents for new conditions,
   * and deletes ActiveEffect documents for removed conditions.
   *
   * @param {Event} event - The change event from multi-checkbox component
   * @private
   */
  async _onCheckboxChange(event) {
    const multiCheckbox = event.target;

    // Convert multi-checkbox value to Set for efficient lookup
    // Value can be array, single value, or empty
    let selectedValues = new Set();
    if (Array.isArray(multiCheckbox.value)) {
      selectedValues = new Set(multiCheckbox.value);
    } else if (multiCheckbox.value) {
      selectedValues = new Set([multiCheckbox.value]);
    }

    const previouslyActive = getActiveConditions(this.actor);

    // Determine which conditions need to be added (selected but not currently active)
    const toAdd = Array.from(selectedValues).filter(id => !previouslyActive.has(id));

    // Determine which conditions need to be removed (currently active but not selected)
    const toRemove = Array.from(previouslyActive).filter(id => !selectedValues.has(id));

    try {
      // Create ActiveEffect documents for newly selected conditions
      for (const conditionId of toAdd) {
        const statusDef = STATUS_EFFECTS.find(s => s.id === conditionId);

        if (statusDef) {
          await this.actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: T(statusDef.name),
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

      // Delete ActiveEffect documents for deselected conditions
      for (const conditionId of toRemove) {
        const effectToRemove = this.actor.effects.find(
          e => !e.disabled && e.statuses?.has(conditionId)
        );

        if (effectToRemove) {
          await effectToRemove.delete();
        }
      }

      // Refresh token displays if any conditions changed
      if (toAdd.length > 0 || toRemove.length > 0) {
        this._refreshTokens(this.actor);
      }
    } catch (err) {
      logError("Failed to update conditions", err, {
        actorId: this.actor?.id,
        toAdd,
        toRemove
      });
      ui.notifications?.error(T("l5r4.apps.conditionManager.errors.updateFailed"));
    }
  }
}
