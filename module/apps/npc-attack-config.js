/**
 * @module apps/npc-attack-config
 * @description A form window for one NPC attack slot and its damage: the attack's name, roll and keep dice, modifier,
 * and action type, and the damage's dice, modifier, and type. It uses no FieldSaveMixin: the values save
 * together when the user clicks save, and the window closes then. The constructor takes the actor and the attack key
 * (`attack1`), because an NPC has several attack slots.
 */
import { SYS_ID } from "../config/constants.js";
import { ACTION_TYPES } from "../config/localization.js";
import { F, T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";

/**
 * The attack configuration window for one NPC attack slot.
 */
export default class NpcAttackConfigApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "npc-attack-config-{id}",
    classes: ["l5r4", "l5r4-npc-attack-config"],
    tag: "form",
    window: {
      title: "l5r4.apps.npcAttackConfig.title",
      icon: "fa-solid fa-swords",
      resizable: false
    },
    position: {
      width: 400,
      height: "auto"
    },
    actions: {
      "save-attack": NpcAttackConfigApplication.#onSaveAttack
    },
    form: {
      handler: NpcAttackConfigApplication.prototype._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true // One-time configuration, closes after saving attack
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/npc-attack-config.hbs`
    }
  };

  /**
   * Create a new NpcAttackConfigApplication instance.
   *
   * NOTE: Uses multi-parameter constructor (actor + attackKey) because NPCs have
   * multiple attack slots (attack1, attack2, etc.) and we need to identify which
   * specific attack is being configured.
   *
   * @param {Actor} actor - The NPC actor whose attack is being configured
   * @param {string} attackKey - The attack key (e.g., "attack1", "attack2")
   * @param {object} [options={}] - Additional application options
   * @throws {Error} If actor or attackKey is not provided
   */
  constructor(actor, attackKey, options = {}) {
    if (!actor) {
      throw new Error("NpcAttackConfigApplication requires an actor");
    }
    if (!attackKey) {
      throw new Error("NpcAttackConfigApplication requires an attackKey");
    }

    const mergedOptions = foundry.utils.mergeObject(options, {
      id: `npc-attack-config-${actor.id}-${attackKey}`
    });
    super(mergedOptions);
    this.actor = actor;
    this.attackKey = attackKey;
    this.damageKey = this.attackKey.replace("attack", "damage");
  }

  /**
   * Dynamic window title showing attack number.
   *
   * @returns {string} Localized title with attack number
   */
  get title() {
    return F("l5r4.apps.npcAttackConfig.titleFor", {
      slot: this.attackKey?.replace("attack", "") ?? ""
    });
  }

  /**
   * Prepare context data for rendering the NPC attack configuration form.
   * Retrieves attack and damage data from actor system, provides defaults.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with attack and damage data
   * @override
   */
  async _prepareContext(_options) {
    if (!this.actor) {
      console.warn(`${SYS_ID}`, "NpcAttackConfig: No actor reference");
      return this._getFallbackContext();
    }

    try {
      const context = await super._prepareContext(_options);

      const attackData = this.actor?.system?.[this.attackKey] ?? {};
      const damageData = this.actor?.system?.[this.damageKey] ?? {};

      context.actor = this.actor;
      context.attackKey = this.attackKey;
      context.damageKey = this.damageKey;
      context.attackNum = this.attackKey.replace("attack", "");
      context.attack = buildAttackFields(attackData);
      context.damage = buildDamageFields(damageData);
      context.config = {
        actionTypes: ACTION_TYPES
      };

      return context;
    } catch (err) {
      logError("Failed to prepare NPC attack config context", err, {
        actorId: this.actor?.id,
        attackKey: this.attackKey
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
      attackKey: this.attackKey,
      damageKey: this.damageKey,
      attackNum: this.attackKey?.replace("attack", "") ?? "1",
      attack: buildAttackFields({}),
      damage: buildDamageFields({}),
      config: { actionTypes: ACTION_TYPES }
    };
  }

  /**
   * Handle form submission to update NPC attack and damage data.
   * Expands form data and updates both attack and damage keys on actor. A failed update throws, so core shows the
   * reason and keeps the window open with what was entered (#141); a successful one closes it (`closeOnSubmit`).
   *
   * @param {Event} _event - The submit event (unused)
   * @param {HTMLFormElement} _form - The form element (unused)
   * @param {FormDataExtended} formData - The form data
   */
  async _onSubmit(_event, _form, formData) {
    // Expand flat form data into nested object structure
    // e.g., "attack1.roll" becomes { attack1: { roll: value } }
    const data = foundry.utils.expandObject(formData.object);

    try {
      // Update both attack and damage data in a single actor update
      // This ensures atomic updates and triggers only one re-render
      await this.actor.update({
        [`system.${this.attackKey}`]: data[this.attackKey],
        [`system.${this.damageKey}`]: data[this.damageKey]
      });
    } catch (err) {
      throw new Error(T("l5r4.apps.npcAttackConfig.errors.updateFailed"), { cause: err });
    }
  }

  /**
   * Handle save button action by triggering form submission.
   *
   * @this {NpcAttackConfigApplication}
   * @param {Event} _event - The click event (unused)
   * @param {HTMLElement} _element - The clicked element (unused)
   */
  static async #onSaveAttack(_event, _element) {
    this.element.requestSubmit();
  }
}

/**
 * The attack form's values: the stored attack's, each defaulted when unset.
 * @param {object} attackData - The stored attack slot
 * @returns {{name: string, roll: number, keep: number, modifier: number, type: string}}
 */
function buildAttackFields(attackData) {
  return {
    name: attackData.name ?? "",
    roll: attackData.roll ?? 2,
    keep: attackData.keep ?? 2,
    modifier: attackData.modifier ?? 0,
    type: attackData.type ?? ""
  };
}

/**
 * The damage form's values: the stored damage's, each defaulted when unset.
 * @param {object} damageData - The stored damage slot
 * @returns {{roll: number, keep: number, modifier: number, type: string}}
 */
function buildDamageFields(damageData) {
  return {
    roll: damageData.roll ?? 2,
    keep: damageData.keep ?? 2,
    modifier: damageData.modifier ?? 0,
    type: damageData.type ?? ""
  };
}
