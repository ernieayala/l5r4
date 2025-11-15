/**
 * NPC Attack Configuration Application
 *
 * Provides a form interface for configuring NPC attack and damage data including
 * roll/keep values, modifiers, and action types.
 *
 * Key Responsibilities:
 * - **Attack Configuration**: Manage attack name, roll/keep dice, modifier, and type
 * - **Damage Configuration**: Manage damage roll/keep dice, modifier, and type
 * - **Form Submission**: Update actor system data with configured values
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 with HandlebarsApplicationMixin
 * - Uses data-action delegation for event handling
 * - Closes on successful form submission
 *
 * Architectural Notes:
 * - **No DebouncedFieldMixin**: Traditional form submission pattern, saves on button click
 * - **Multi-parameter constructor**: Requires both `actor` and `attackKey` (e.g., "attack1")
 *   to identify which of the NPC's multiple attacks is being configured
 * - **closeOnSubmit: true**: One-time configuration, closes after saving attack data
 *
 * @module apps/npc-attack-config
 */

// Config imports
import { SYS_ID } from "../config/constants.js";
import { ACTION_TYPES } from "../config/localization.js";

// Utils imports
import { T } from "../utils/localization.js";
import { logError } from "../utils/error-logging.js";

export default class NpcAttackConfigApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "npc-attack-config-{id}",
    classes: ["l5r4", "npc-attack-config"],
    tag: "form",
    window: {
      title: "l5r4.apps.npcAttackConfig.title",
      icon: "fas fa-swords",
      resizable: false
    },
    position: {
      width: 400,
      height: "auto"
    },
    actions: {
      save: NpcAttackConfigApplication.prototype._onSave
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
    const attackNum = this.attackKey?.replace("attack", "") ?? "";
    return `${T("l5r4.apps.npcAttackConfig.title")} ${attackNum}`;
  }

  /**
   * Prepare context data for rendering the NPC attack configuration form.
   * Retrieves attack and damage data from actor system, provides defaults.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with attack and damage data
   * @private
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
      context.attack = {
        name: attackData.name ?? "",
        roll: attackData.roll ?? 2,
        keep: attackData.keep ?? 2,
        modifier: attackData.modifier ?? 0,
        type: attackData.type ?? ""
      };
      context.damage = {
        roll: damageData.roll ?? 2,
        keep: damageData.keep ?? 2,
        modifier: damageData.modifier ?? 0,
        type: damageData.type ?? ""
      };
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
   * @private
   */
  _getFallbackContext() {
    return {
      actor: this.actor,
      attackKey: this.attackKey,
      damageKey: this.damageKey,
      attackNum: this.attackKey?.replace("attack", "") ?? "1",
      attack: { name: "", roll: 2, keep: 2, modifier: 0, type: "" },
      damage: { roll: 2, keep: 2, modifier: 0, type: "" },
      config: { actionTypes: ACTION_TYPES }
    };
  }

  /**
   * Handle form submission to update NPC attack and damage data.
   * Expands form data and updates both attack and damage keys on actor.
   *
   * @param {Event} _event - The submit event (unused)
   * @param {HTMLFormElement} _form - The form element (unused)
   * @param {FormDataExtended} formData - The form data
   * @private
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

      this.close();
    } catch (err) {
      logError("Failed to update NPC attack", err, {
        actorId: this.actor?.id,
        attackKey: this.attackKey,
        damageKey: this.damageKey
      });
      ui.notifications?.error(T("l5r4.apps.npcAttackConfig.errors.updateFailed"));
    }
  }

  /**
   * Handle save button action by triggering form submission.
   *
   * @param {Event} _event - The click event (unused)
   * @param {HTMLElement} _target - The clicked element (unused)
   * @private
   */
  async _onSave(_event, _target) {
    this.element.requestSubmit();
  }
}
