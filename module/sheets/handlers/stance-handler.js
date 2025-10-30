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
 * - Uses Actor.createEmbeddedDocuments/deleteEmbeddedDocuments (Foundry v13+)
 * - Leverages ActiveEffect.statuses Set pattern for stance identification
 * - Maintains compatibility with pre-v13 core.statusId flag pattern
 *
 * @module sheets/handlers/stance-handler
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html|Actor API}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActiveEffect.html|ActiveEffect API}
 */

import { STANCE_IDS } from "../../services/stance/core/helpers.js";
import { getStanceEffectCreator } from "../../services/stance/core/effect-templates.js";
import { SYS_ID } from "../../config/constants.js";

/**
 * Handles combat stance changes triggered from actor sheets.
 *
 * This handler responds to stance dropdown selections in the character sheet UI
 * and coordinates the Active Effect operations needed to transition between stances.
 *
 * Per L5R4 rules, characters may only have one stance active at a time. This handler
 * enforces that constraint by removing all existing stance effects before applying
 * the newly selected stance.
 *
 * Foundry v13 Pattern:
 * Uses event delegation pattern where sheet roots delegate to this handler.
 * Expects context.actor to be a valid L5R4Actor document with ownership verified.
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
   * 3. If stanceId provided, add new stance effect (removes conflicting stances first)
   *
   * Game Rules Implementation:
   * Per L5R4 core rules, only one stance may be active at a time. The handler
   * enforces this by removing all existing stances before applying a new one.
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
   *
   * @see module:services/stance/core/effect-templates for stance effect definitions
   */
  static async changeStance(context, event, element) {
    event?.preventDefault?.();

    const actor = context.actor;
    if (!actor?.isOwner) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermission"));
      return;
    }

    const stanceId = element?.value;

    // Empty value indicates "no stance" selected - remove all active stances
    if (!stanceId) {
      await this._removeAllStances(actor);
    } else {
      // Remove conflicting stances FIRST, then apply new stance
      await this._removeAllStances(actor);
      await this._addStance(actor, stanceId);
    }
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
   * Applies a stance effect to an actor.
   *
   * Creates and applies an Active Effect representing the selected stance's mechanical
   * bonuses/penalties and action restrictions. The effect is generated using the stance
   * service's effect creator functions, which define the game rules for each stance type.
   *
   * Foundry v13 API:
   * Uses Actor.createEmbeddedDocuments to add the effect to the actor's effects collection.
   * The operation is async and may fail if the actor document is not available or locked.
   *
   * Pre-Condition:
   * The caller (changeStance) should remove conflicting stance effects before calling this
   * method to enforce the single-stance rule. This method does NOT check for existing stances.
   *
   * Error Handling:
   * - Logs warnings if stance ID has no registered effect creator
   * - Catches async errors from createEmbeddedDocuments and shows user notification
   * - Silently returns on failure to prevent UI disruption
   *
   * @param {Actor} actor - The L5R4 actor document to apply the stance to
   * @param {string} stanceId - Stance identifier (e.g., "attackStance", "fullDefenseStance")
   * @returns {Promise<void>}
   * @private
   *
   * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#createEmbeddedDocuments|Actor.createEmbeddedDocuments}
   */
  static async _addStance(actor, stanceId) {
    try {
      const creator = getStanceEffectCreator(stanceId);
      if (!creator) {
        console.warn(`${SYS_ID} StanceHandler: No effect creator found for stance "${stanceId}"`);
        return;
      }

      const effectData = creator(actor);
      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to add stance "${stanceId}"`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.stanceAddFailed"));
    }
  }

  /**
   * Removes all active stance effects from an actor.
   *
   * Scans the actor's effects collection for any stance-related Active Effects and
   * batch-deletes them. Used when transitioning to a new stance (to enforce single-stance
   * rule) or when resetting to neutral/no stance.
   *
   * Stance Detection Logic:
   * - Checks ActiveEffect.statuses Set for stance IDs (Foundry v13+)
   * - Falls back to checking flags.core.statusId for pre-v13 compatibility
   * - Ignores disabled effects (already inactive)
   * - Uses STANCE_IDS Set to identify valid stance status IDs
   *
   * This dual-path detection ensures stance effects created before the Foundry v13
   * migration continue to be recognized and removed correctly.
   *
   * Foundry v13 API:
   * Uses Actor.deleteEmbeddedDocuments to batch-remove effects efficiently.
   * Only initiates deletion if at least one stance effect is found to avoid
   * unnecessary async operations.
   *
   * Error Handling:
   * - Catches async errors from deleteEmbeddedDocuments and shows user notification
   * - Logs detailed error context for debugging
   * - Silently returns on failure to prevent UI disruption
   *
   * @param {Actor} actor - The L5R4 actor document to remove stances from
   * @returns {Promise<void>}
   * @private
   *
   * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#deleteEmbeddedDocuments|Actor.deleteEmbeddedDocuments}
   * @see module:services/stance/core/helpers~STANCE_IDS for valid stance identifiers
   */
  static async _removeAllStances(actor) {
    try {
      const effectsToRemove = [];

      // Identify stance effects using dual-path status ID detection for v13 compatibility
      for (const effect of actor.effects) {
        if (effect.disabled) {
          continue;
        }

        let isStance = false;

        // Check v13+ statuses Set first (modern pattern)
        if (effect.statuses?.size) {
          for (const statusId of effect.statuses) {
            if (STANCE_IDS.has(statusId)) {
              isStance = true;
              break;
            }
          }
        }

        // Fall back to legacy core.statusId flag for pre-v13 effects
        if (!isStance) {
          const legacyId = effect.getFlag?.("core", "statusId");
          if (legacyId && STANCE_IDS.has(legacyId)) {
            isStance = true;
          }
        }

        if (isStance) {
          effectsToRemove.push(effect.id);
        }
      }

      if (effectsToRemove.length > 0) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
      }
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to remove stances`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.stanceRemoveFailed"));
    }
  }
}
