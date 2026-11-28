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
import { getWindowId } from "../utils/window-id.js";
import { applyEffect } from "../services/effects/apply.js";
import { queueActorWrite } from "../services/write-queue.js";

/**
 * The conditions the window offers: every status effect but the stances. It reads and changes only these, so a
 * status a module or another effect adds is left alone (#191).
 * @type {ReadonlySet<string>}
 */
const CONDITION_IDS = Object.freeze(
  new Set(STATUS_EFFECTS.filter(status => !STANCE_IDS.has(status.id)).map(status => status.id))
);

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
      id: ConditionManagerApplication.getWindowId(actor)
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

      const conditionList = STATUS_EFFECTS.filter(status => CONDITION_IDS.has(status.id)).map(
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
   * Handle multi-checkbox change events to add or remove conditions. Each change waits for the one before it, then
   * compares the ticked conditions with the actor's as that change left them, so ticking two quickly adds each once
   * (#191).
   *
   * @param {Event} event - The change event from multi-checkbox component
   * @returns {Promise<void>}
   */
  async _onCheckboxChange(event) {
    const selected = toConditionSet(event.target.value);
    await queueActorWrite(this.actor, () => this.#applySelection(selected));
  }

  /**
   * The id of the actor's window, from its UUID, so each token's actor has its own (#189).
   * @param {Actor} actor
   * @returns {string}
   */
  static getWindowId(actor) {
    return getWindowId("condition-manager", actor.uuid);
  }

  /**
   * Add each ticked condition the actor lacks and remove each one it holds that is no longer ticked.
   * @param {Set<string>} selected - The conditions ticked
   * @returns {Promise<void>}
   */
  async #applySelection(selected) {
    const active = getActiveConditions(this.actor);
    const toAdd = [...selected].filter(id => CONDITION_IDS.has(id) && !active.has(id));
    const toRemove = [...active].filter(id => !selected.has(id));

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
 * The conditions the window offers that the actor holds on an enabled effect.
 *
 * @param {Actor} actor - The actor to check for conditions
 * @returns {Set<string>} Set of active condition IDs
 */
function getActiveConditions(actor) {
  const conditions = new Set();
  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }
    for (const statusId of effect.statuses) {
      if (CONDITION_IDS.has(statusId)) {
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
 * Put on each newly ticked condition: an effect the actor holds disabled for it is enabled, so no second copy is
 * made (#191); otherwise its status effect is created, with its rules and duration.
 * @param {Actor} actor
 * @param {string[]} conditionIds - Offered condition ids the actor holds on no enabled effect
 * @returns {Promise<void>}
 */
async function applyConditions(actor, conditionIds) {
  for (const conditionId of conditionIds) {
    const disabled = actor.effects.find(e => e.disabled && e.statuses.has(conditionId));
    if (disabled) {
      await disabled.update({ disabled: false });
    } else {
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
