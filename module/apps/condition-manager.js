/**
 * @module apps/condition-manager
 * @description A window that toggles an actor's status conditions, every status effect except the stances, as
 * ActiveEffect documents, and refreshes the actor's tokens when one changes. It uses no FieldSaveMixin and no
 * form submission: the multi-checkbox element reports its own change events, and one change adds or removes every
 * condition that differs.
 */
import { SYS_ID } from "../config/constants.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";
import { F, T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";
import { STANCE_IDS } from "../utils/stances.js";
import { applyEffect } from "../services/effects/apply.js";

/**
 * The condition manager window for one actor.
 */
export default class ConditionManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "condition-manager-{id}",
    classes: ["l5r4", "l5r4-condition-manager"],
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
   * Create a new ConditionManagerApplication instance.
   *
   * @param {Actor} actor - The actor whose conditions are being managed
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor is not provided
   */
  constructor(actor, options = {}) {
    if (!actor) {
      throw new Error("ConditionManagerApplication requires an actor");
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
    return F("l5r4.apps.conditionManager.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /**
   * Prepare context data for rendering the condition manager.
   * Retrieves all non-stance conditions and marks which are currently active.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with actor and condition list
   * @override
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "ConditionManagerApplication: No actor reference");
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
   */
  _getFallbackContext() {
    return {
      actor: this.actor,
      actorName: this.actor?.name ?? "Unknown",
      conditionList: []
    };
  }

  /**
   * Registers the window with its actor, as core's document sheets do
   * [src: client/applications/api/document-sheet.mjs:243-246], so a condition added or removed anywhere re-renders it.
   *
   * @param {object} context - Render context
   * @param {object} options - Render options
   * @returns {Promise<void>}
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.actor.apps[this.id] = this;
  }

  /**
   * Foundry lifecycle hook called after rendering.
   * Attaches change event listener to multi-checkbox component.
   *
   * @param {object} context - Render context
   * @param {object} options - Render options
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.element) {
      console.warn(`${SYS_ID}`, "ConditionManagerApplication _onRender: No element");
      return;
    }

    const multiCheckbox = this.element.querySelector("multi-checkbox");

    if (multiCheckbox) {
      multiCheckbox.addEventListener("change", this._onCheckboxChange.bind(this));
    }
  }

  /**
   * Removes the window from its actor's registered apps
   * [src: client/applications/api/document-sheet.mjs:259-262].
   *
   * @param {object} options - Close options
   */
  _onClose(options) {
    super._onClose(options);
    delete this.actor.apps[this.id];
  }

  /**
   * Refresh all active tokens for an actor to display updated condition icons.
   *
   * @param {Actor} actor - The actor whose tokens should be refreshed
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
   */
  async _onCheckboxChange(event) {
    const selectedValues = toConditionSet(event.target.value);

    const previouslyActive = getActiveConditions(this.actor);

    // Determine which conditions need to be added (selected but not currently active)
    const toAdd = Array.from(selectedValues).filter(id => !previouslyActive.has(id));

    // Determine which conditions need to be removed (currently active but not selected)
    const toRemove = Array.from(previouslyActive).filter(id => !selectedValues.has(id));

    try {
      await applyConditions(this.actor, toAdd);
      await deleteConditions(this.actor, toRemove);

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

/**
 * The multi-checkbox's value as a set of condition ids: an array, a single value, or empty.
 * @param {string[]|string|null} value
 * @returns {Set<string>}
 */
function toConditionSet(value) {
  if (Array.isArray(value)) {
    return new Set(value);
  }
  if (value) {
    return new Set([value]);
  }
  return new Set();
}

/**
 * Create the status effect for each newly selected condition, with its rules and duration.
 * @param {Actor} actor
 * @param {string[]} conditionIds - Ids not yet active; one that is not a status effect is skipped
 * @returns {Promise<void>}
 */
async function applyConditions(actor, conditionIds) {
  for (const conditionId of conditionIds) {
    if (STATUS_EFFECTS.some(s => s.id === conditionId)) {
      await applyEffect(actor, conditionId);
    }
  }
}

/**
 * Delete the enabled ActiveEffect that carries each deselected condition.
 * @param {Actor} actor
 * @param {string[]} conditionIds - Ids active before the change
 * @returns {Promise<void>}
 */
async function deleteConditions(actor, conditionIds) {
  for (const conditionId of conditionIds) {
    const effectToRemove = actor.effects.find(e => !e.disabled && e.statuses?.has(conditionId));

    if (effectToRemove) {
      await effectToRemove.delete();
    }
  }
}
