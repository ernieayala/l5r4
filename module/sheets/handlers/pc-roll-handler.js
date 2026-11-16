/**
 * @module sheets/handlers/pc-roll-handler
 * @description PC sheet actions for Ring rolls and weapon damage. Each reads what to roll from the sheet and hands
 * it to a roll service; the roll pipeline (module/services/dice/check/) gathers every modifier. A normal click shows
 * the roll dialog; Shift-click skips it.
 */

import { toInt } from "../../utils/type-coercion.js";
import { rollWeaponDamage } from "../../services/dice/rolls/weapon-roll.js";
import { RollHandler } from "./roll-handler.js";

/** Handler class for PC-specific roll actions. */
export class PcRollHandler {
  /**
   * Roll a Ring; the dialog can make it a Spell Casting Roll.
   * game-rules/29_types_of_rolls.md, p.80
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-ring-key and data-ring-rank
   * @returns {Promise<ChatMessage|null>}
   */
  static async rollClickedRing(context, event, element) {
    event?.preventDefault?.();
    const ringKey = String(element.dataset?.ringKey || "void").toLowerCase();
    return RollHandler.rollRing(context.actor, ringKey, !event.shiftKey);
  }

  /**
   * Roll damage for the clicked weapon: its DR with Strength included (item/preparation/derived-data.js).
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element inside the weapon row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollWeaponDamage(context, event, element) {
    event?.preventDefault?.();
    const weapon = RollHandler.rowItemOf(context.actor, element);
    if (!weapon) {
      return undefined;
    }
    return rollWeaponDamage({
      roll: toInt(weapon.system.derivedDamageRoll ?? weapon.system.damageRoll),
      keep: toInt(weapon.system.derivedDamageKeep ?? weapon.system.damageKeep),
      weaponName: weapon.name,
      weapon,
      askForOptions: !event.shiftKey,
      actor: context.actor
    });
  }
}
