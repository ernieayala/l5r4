/**
 * Stance Handler
 *
 * UI event handler for L5R4 combat stance transitions in character sheets.
 * Manages the application and removal of stance Active Effects when players
 * change their character's combat stance via the sheet dropdown.
 *
 * Key Responsibilities:
 * - **Stance Transitions**: Apply new stance effects, remove conflicting stances
 * - **Permission Validation**: Ensure user has ownership before stance changes
 * - **Error Recovery**: Handle failed effect operations with user notifications
 *
 * L5R4 Game Rules Context:
 * Implements the L5R4 stance system where characters may adopt one of five combat
 * stances (Attack, Full Attack, Defense, Full Defense, Center). Only one stance
 * may be active at a time per core rules. Stances affect available actions,
 * attack bonuses, and defensive capabilities.
 *
 * Foundry VTT Integration:
 * - A stance is its status effect (module/config/status-effects.js), created through the effects service
 * - The stances share the exclusive group "stance", so the new one ends the old (module/documents/active-effect.js)
 *
 * @module sheets/handlers/stance-handler
 */

import { STANCE_IDS, stanceConflicts } from "../../utils/stances.js";
import { applyEffect } from "../../services/effects/apply.js";
import { SYS_ID } from "../../config/constants.js";

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
   * - Delegates async error handling to _addStance and _removeAllStances
   *
   * @param {Object} context - Sheet render context containing actor reference
   * @param {Actor} context.actor - The L5R4 actor document being modified
   * @param {Event} [event] - The DOM event that triggered the change (optional)
   * @param {HTMLElement} element - The select element containing the chosen stance value
   * @param {string} element.value - The stance ID (e.g., "fullAttackStance") or empty string
   * @returns {Promise<void>}
   */
  static async changeStance(context, event, element) {
    event?.preventDefault?.();

    const actor = context.actor;
    if (!actor?.isOwner) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermission"));
      return;
    }

    // The select's value is user input: only the five stances, or "" for none
    const stanceId = STANCE_IDS.has(element?.value) ? element.value : "";
    if (!stanceId) {
      await this._removeAllStances(actor);
      return;
    }
    // A condition may rule the stance out (p.84, p.89): warn, and leave the choice to the player
    for (const status of stanceConflicts(stanceId, actor.statuses)) {
      ui.notifications?.warn(
        game.i18n.localize("l5r4.ui.effects.stanceNotAllowed", {
          condition: game.i18n.localize(CONFIG.statusEffects[status].name),
          stance: game.i18n.localize(CONFIG.statusEffects[stanceId].name)
        })
      );
    }
    // The new stance's group ends the old one (module/documents/active-effect.js)
    await this._addStance(actor, stanceId);
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
   * - Catches async errors from actor.update and shows user notification
   *
   * @param {Object} context - Sheet render context containing actor reference
   * @param {Actor} context.actor - The L5R4 actor document being modified
   * @param {Event} [event] - The DOM event that triggered the toggle (optional)
   * @returns {Promise<void>}
   */
  static async toggleMovementType(context, event) {
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
      ui.notifications?.error("Failed to toggle movement type");
    }
  }

  /**
   * Applies a stance effect to an actor: its status effect, with the stance's rules. Its group ends the actor's
   * other stance before it is created.
   *
   * @param {Actor} actor - The L5R4 actor document to apply the stance to
   * @param {string} stanceId - Stance identifier (e.g., "attackStance", "fullDefenseStance")
   * @returns {Promise<void>}
   * @private
   */
  static async _addStance(actor, stanceId) {
    try {
      await applyEffect(actor, stanceId);
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to add stance "${stanceId}"`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.stanceAddFailed"));
    }
  }

  /**
   * Removes every stance effect from an actor, for "no stance".
   *
   * @param {Actor} actor - The L5R4 actor document to remove stances from
   * @returns {Promise<void>}
   * @private
   */
  static async _removeAllStances(actor) {
    try {
      const effectsToRemove = actor.effects
        .filter(effect => [...effect.statuses].some(id => STANCE_IDS.has(id)))
        .map(effect => effect.id);

      if (effectsToRemove.length > 0) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
      }
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to remove stances`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.stanceRemoveFailed"));
    }
  }
}
