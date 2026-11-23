/**
 * @module sheets/handlers/stance-handler
 * @description Changes a character's combat stance from the sheet's stance dropdown, for an owner only. A character
 * holds one of five stances (Attack, Full Attack, Defense, Full Defense, Center) at a time. A stance is its status
 * effect (module/config/status-effects.js), created through the effects service; the stances share the exclusive
 * group "stance", so the new one ends the old (module/documents/active-effect.js). A failed change shows the user a
 * notification.
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import { STANCE_IDS, getStanceConflicts } from "../../utils/stances.js";
import { applyEffect } from "../../services/effects/apply.js";

/**
 * Handles combat stance changes triggered from actor sheets.
 *
 * This handler responds to stance dropdown selections in the character sheet UI
 * and coordinates the Active Effect operations needed to transition between stances.
 *
 * Per L5R4 rules, characters may only have one stance active at a time; the stance
 * group of the new effect ends the old one.
 *
 * Sheet roots delegate to this handler; context.actor is the sheet's actor.
 *
 * @class
 */
export class StanceHandler {
  /**
   * Handles stance change events from actor sheet UI.
   *
   * Responds to stance dropdown selections by applying the selected stance effect
   * or removing all stance effects if no stance is selected (neutral/no stance).
   *
   * Workflow:
   * 1. Validate user has owner permission on actor
   * 2. If stanceId is empty, remove all stance effects (neutral stance)
   * 3. Warn about any condition that rules the stance out, then add it
   *
   * Error Handling:
   * - Warns users without ownership permission
   * - Delegates async error handling to #applyStanceEffect and #deleteStances.
   *
   * @param {object} context - Sheet render context containing actor reference
   * @param {Actor} context.actor - The L5R4 actor document being modified
   * @param {Event} [event] - The DOM event that triggered the change (optional)
   * @param {HTMLElement} element - The select element containing the chosen stance value
   * @param {string} element.value - The stance ID (e.g., "fullAttackStance") or empty string
   * @returns {Promise<void>}
   */
  static async applyStance(context, event, element) {
    event?.preventDefault?.();

    const actor = context.actor;
    if (!actor?.isOwner) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermission"));
      return;
    }

    // The select's value is user input: only the five stances, or "" for none
    const stanceId = STANCE_IDS.has(element?.value) ? element.value : "";
    if (!stanceId) {
      await this.#deleteStances(actor);
      return;
    }
    // A condition may rule the stance out: warn, and leave the choice to the player
    // game-rules/36_stances.md, p.84
    // game-rules/41_conditional_effects.md, p.89
    // game-rules/60_bugei_skills.md, p.140
    for (const status of getStanceConflicts(stanceId, actor.statuses, actor.rollOptions)) {
      ui.notifications?.warn(
        game.i18n.localize("l5r4.ui.effects.stanceNotAllowed", {
          condition: game.i18n.localize(CONFIG.statusEffects[status].name),
          stance: game.i18n.localize(CONFIG.statusEffects[stanceId].name)
        })
      );
    }
    // The new stance's group ends the old one (module/documents/active-effect.js)
    await this.#applyStanceEffect(actor, stanceId);
  }

  /**
   * Toggles movement type display between Free Action and Simple Action.
   *
   * Responds to the movement toggle button in the character sheet stances section.
   * Toggles the `system.movement.showSimple` flag which controls whether Free Action
   * (Water × 5) or Simple Action (Water × 10) movement is displayed.
   *
   * This is a UI-only toggle for display convenience - it does not affect the actual
   * character stats, only which movement value is shown in the sidebar. Both values
   * are always calculated and available.
   *
   * Workflow:
   * 1. Validate user has owner permission on actor
   * 2. Toggle system.movement.showSimple flag
   * 3. Update actor document (triggers automatic re-render)
   *
   * Error Handling:
   * - Warns users without ownership permission
   * - Catches async errors from actor.update and shows user notification.
   *
   * @param {object} context - Sheet render context containing actor reference
   * @param {Actor} context.actor - The L5R4 actor document being modified
   * @param {Event} [event] - The DOM event that triggered the toggle (optional)
   * @returns {Promise<void>}
   */
  static async updateMovementType(context, event) {
    event?.preventDefault?.();

    const actor = context.actor;
    if (!actor?.isOwner) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermission"));
      return;
    }

    try {
      const currentValue = actor.system.movement?.showSimple ?? false;
      await actor.update({
        "system.movement.showSimple": !currentValue
      });
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to toggle movement type`, err);
      ui.notifications?.error(T("l5r4.character.movement.errors.toggleFailed"));
    }
  }

  /**
   * Applies a stance effect to an actor: its status effect, with the stance's rules. Its group ends the actor's
   * other stance before it is created.
   *
   * @param {Actor} actor - The L5R4 actor document to apply the stance to
   * @param {string} stanceId - Stance identifier (e.g., "attackStance", "fullDefenseStance")
   * @returns {Promise<void>}
   */
  static async #applyStanceEffect(actor, stanceId) {
    try {
      await applyEffect(actor, stanceId);
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to add stance "${stanceId}"`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.mechanics.stances.addFailed"));
    }
  }

  /**
   * Removes every stance effect from an actor, for "no stance".
   *
   * @param {Actor} actor - The L5R4 actor document to remove stances from
   * @returns {Promise<void>}
   */
  static async #deleteStances(actor) {
    try {
      const effectsToRemove = actor.effects
        .filter(effect => [...effect.statuses].some(id => STANCE_IDS.has(id)))
        .map(effect => effect.id);

      if (effectsToRemove.length > 0) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
      }
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to remove stances`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.mechanics.stances.removeFailed"));
    }
  }
}
