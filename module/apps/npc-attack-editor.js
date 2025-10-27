/**
 * NPC Attack Editor Application
 *
 * Dialog for editing NPC attack and damage values.
 * Provides form interface for modifying attack roll, damage roll, action type, and damage type.
 *
 * @extends {foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)}
 */

import { SYS_ID } from "../config/constants.js";
import { ACTION_TYPES } from "../config/localization.js";

export default class NpcAttackEditor extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /**
   * @param {Object} options - Application options
   * @param {L5R4Actor} options.actor - The NPC actor
   * @param {string} options.attackKey - The attack key (attack1, attack2, attack3)
   */
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.attackKey = options.attackKey;
    this.damageKey = this.attackKey.replace("attack", "damage");
  }

  static DEFAULT_OPTIONS = {
    id: "npc-attack-editor-{id}",
    classes: [SYS_ID, "npc-attack-editor"],
    tag: "form",
    window: {
      title: "l5r4.ui.mechanics.combat.editAttack",
      icon: "fas fa-swords",
      resizable: false
    },
    position: {
      width: 400,
      height: "auto"
    },
    actions: {
      save: this._onSave
    },
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/npc-attack-editor.hbs`
    }
  };

  get title() {
    const attackNum = this.attackKey.replace("attack", "");
    return `${game.i18n.localize("l5r4.ui.mechanics.combat.attack")} ${attackNum}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const attackData = this.actor.system[this.attackKey] ?? {};
    const damageData = this.actor.system[this.damageKey] ?? {};

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
  }

  static async _onSubmit(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    await this.actor.update({
      [`system.${this.attackKey}`]: data[this.attackKey],
      [`system.${this.damageKey}`]: data[this.damageKey]
    });

    this.close();
  }

  static async _onSave(_event, _target) {
    this.element.requestSubmit();
  }
}
