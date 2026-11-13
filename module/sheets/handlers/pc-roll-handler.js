/**
 * PC Roll Handler
 *
 * PC sheet actions for Ring rolls, spell casting, and weapon damage. Each reads what to roll from the sheet and
 * hands it to a roll service; the roll pipeline (module/services/dice/check/) gathers every modifier. A normal
 * click shows the roll dialog; Shift-click skips it.
 *
 * @module sheets/handlers/pc-roll-handler
 */

import { T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { RingRoll } from "../../services/dice/rolls/ring-roll.js";
import { WeaponRoll } from "../../services/dice/rolls/weapon-roll.js";
import { SpellCastRoll } from "../../services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../../services/dice/rolls/maho-cast-roll.js";

/**
 * The item of the row the element sits in.
 * @param {Actor} actor
 * @param {HTMLElement} element
 * @returns {Item|null}
 */
function rowItem(actor, element) {
  const row = element.closest(".item");
  const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
  return id ? actor.items.get(id) : null;
}

/** Handler class for PC-specific roll actions. */
export class PcRollHandler {
  /**
   * Roll a Ring (p.80); the dialog can make it a Spell Casting Roll.
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-system-ring and data-ring-rank
   * @returns {Promise<ChatMessage|null>}
   */
  static async handleRingRoll(context, event, element) {
    event?.preventDefault?.();
    const systemRing = String(element.dataset?.systemRing || "void").toLowerCase();
    return RingRoll({
      ringRank: toInt(element.dataset?.ringRank),
      ringName: element.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${systemRing}`),
      systemRing,
      askForOptions: !event.shiftKey,
      actor: context.actor
    });
  }

  /**
   * Cast the spell of the clicked row: a maho spell through the maho roll, any other through the Spell Casting
   * Roll.
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element inside the spell row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async handleCastSpell(context, event, element) {
    event?.preventDefault?.();
    const spell = rowItem(context.actor, element);
    if (!spell || spell.type !== "spell") {
      return undefined;
    }
    const cast = spell.system.maho ? MahoCastRoll : SpellCastRoll;
    return cast({ actor: context.actor, spell, showDialog: !event?.shiftKey });
  }

  /**
   * Roll damage for the clicked weapon: its DR with Strength included (item/preparation/derived-data.js).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element inside the weapon row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async handleWeaponRoll(context, event, element) {
    event?.preventDefault?.();
    const weapon = rowItem(context.actor, element);
    if (!weapon) {
      return undefined;
    }
    return WeaponRoll({
      diceRoll: toInt(weapon.system.derivedDamageRoll ?? weapon.system.damageRoll),
      diceKeep: toInt(weapon.system.derivedDamageKeep ?? weapon.system.damageKeep),
      weaponName: weapon.name,
      weapon,
      askForOptions: !event.shiftKey,
      actor: context.actor
    });
  }
}
