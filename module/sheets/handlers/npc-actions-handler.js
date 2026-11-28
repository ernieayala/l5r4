/**
 * @module sheets/handlers/npc-actions-handler
 * @description NPC sheet actions: the Fear test the NPC calls for from the selected tokens, and the NPC's three
 * attack slots, opening a slot's attack configuration and clearing a slot. Healing, the Void Ring, and spell casting
 * go through the same handlers as the PC sheet's.
 */

import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { onFearClick } from "../../services/fear-card.js";
import { askConfirm } from "../../services/dialog.js";
import NpcAttackConfigApplication from "../../apps/npc-attack-config.js";
import { openWindow } from "./app-launcher-handler.js";

/**
 * Handler class for NPC-specific sheet actions. Each method takes the sheet's handler context, the event, and the
 * element the sheet's action switch passes.
 */
export class NpcActionsHandler {
  /**
   * Initiates a Fear resistance test against this NPC.
   *
   * Posts one Fear card for all currently selected tokens (excluding the NPC itself), from which each owner rolls.
   * Selected characters make Raw Willpower rolls vs TN (5 + 5×Fear Rank), adding their
   * Honor Rank to the roll.
   *
   * **Game Rules:**
   * Creatures with Fear ability automatically inflict Fear at encounter start. Characters
   * who fail the test suffer -Xk0 penalty to all rolls (X = Fear Rank) for the encounter.
   * Catastrophic failure (fail by 15+) causes character to flee or cower.
   *
   * **Requirements:**
   * - NPC must have Fear ability (fear.rank > 0)
   * - At least one token must be selected on the canvas
   * - Selected tokens must be different from the NPC
   *
   * **Implementation:**
   * Delegates to Fear service which handles roll mechanics and chat output.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The NPC
   * @param {Event} event - DOM event triggering the Fear test
   * @param {HTMLElement} _element - Element that was clicked
   * @returns {Promise<void>}
   */
  static async testFear(context, event, _element) {
    event?.preventDefault?.();

    if (!context.actor.hasFear?.()) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noFear"));
      return;
    }

    await onFearClick({ npc: context.actor });
  }

  /**
   * Opens attack editor dialog for NPC attack configuration.
   *
   * Launches NpcAttackConfigApplication to edit attack and damage values
   * for the specified attack slot (attack1-3). "Add Attack" opens it on the first empty slot.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The NPC
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-attack-key attribute
   * @returns {Promise<void>}
   */
  static async openAttackConfig(context, event, element) {
    event?.preventDefault?.();

    const attackKey = element.dataset.attackKey;
    if (!attackKey) {
      console.warn("L5R4 | No attack key found on element", element);
      return;
    }

    // An editor already open for this slot comes to the front (#189)
    await openWindow(NpcAttackConfigApplication.getWindowId(context.actor, attackKey), () => {
      return new NpcAttackConfigApplication(context.actor, attackKey);
    });
  }

  /**
   * Removes an NPC attack by clearing its slot: the attack and its damage go back to empty, and the sheet hides
   * the row. Asks first unless Shift is held, as deleting an item does.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The NPC
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-attack-key attribute
   * @returns {Promise<void>}
   */
  static async deleteAttack(context, event, element) {
    event?.preventDefault?.();
    const attackKey = element.dataset.attackKey;
    const damageKey = attackKey.replace("attack", "damage");
    const attack = context.actor.system[attackKey];

    if (!event.shiftKey) {
      const name =
        attack.name ||
        game.i18n.localize("l5r4.ui.mechanics.combat.attackSlot", {
          slot: attackKey.replace("attack", "")
        });
      const confirmed = await askConfirm({
        window: { title: "l5r4.ui.dialogs.deleteAttack.title" },
        content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.confirm, {
          question: game.i18n.localize("l5r4.ui.dialogs.deleteAttack.content", { name }),
          consequence: game.i18n.localize("l5r4.ui.dialogs.deleteAttack.consequence")
        }),
        yes: { label: "l5r4.ui.common.delete" },
        no: { label: "l5r4.ui.common.cancel" }
      });
      if (!confirmed) {
        return;
      }
    }

    await context.actor.update({
      [`system.${attackKey}`]: { name: "", roll: 0, keep: 0, modifier: 0, type: "" },
      [`system.${damageKey}`]: { roll: 0, keep: 0, modifier: 0, type: "" }
    });
  }
}
