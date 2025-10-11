/**
 * @fileoverview Stance Change Handler for L5R4 Character Sheets
 * 
 * This module provides handler functions for changing combat stances via dropdown on character sheets.
 * Implements dropdown-based stance selection where changing the selection adds the new stance
 * (automatically removing any conflicting stances via the stance lifecycle hooks).
 * 
 * **Core Responsibilities:**
 * - **Stance Selection**: Handle user changes on stance dropdown
 * - **Effect Management**: Create or delete stance Active Effects
 * - **State Detection**: Display current active stance in dropdown
 * - **Mutual Exclusion**: Rely on stance lifecycle hooks for conflict resolution
 * 
 * **Integration:**
 * This handler works with the existing stance service infrastructure:
 * - Uses effect templates from `services/stance/core/effect-templates.js`
 * - Leverages stance helpers from `services/stance/core/helpers.js`
 * - Relies on `onPreCreateActiveEffect` hook for automatic mutual exclusion
 * 
 * **Usage Pattern:**
 * ```javascript
 * // In sheet _onActionChange method
 * case "change-stance": return StanceHandler.changeStance(this._getHandlerContext(), event, element);
 * ```
 * 
 * @author L5R4 System Team
 * @since 2.1.0
 * @see {@link ../services/stance/core/effect-templates.js|Effect Templates}
 * @see {@link ../services/stance/core/helpers.js|Stance Helpers}
 */

import { getActiveStances } from "../../services/stance/core/helpers.js";
import { getStanceEffectCreator } from "../../services/stance/core/effect-templates.js";
import { SYS_ID } from "../../config/constants.js";

export class StanceHandler {
  /**
   * Change the actor's combat stance based on dropdown selection.
   * 
   * **Behavior:**
   * - If empty value selected: Remove all stances
   * - If stance selected: Add it (other stances auto-removed by hook)
   * - If actor cannot be modified: Show notification and abort
   * 
   * **Process:**
   * 1. Extract stance ID from select element value
   * 2. If empty, remove all stances
   * 3. Otherwise, add the selected stance
   * 4. Let lifecycle hooks handle mutual exclusion
   * 
   * @param {object} context - Handler context from sheet
   * @param {Actor} context.actor - The actor to modify
   * @param {Event} event - The triggering change event
   * @param {HTMLElement} element - The select element
   * @returns {Promise<void>}
   * 
   * @example
   * // Called from sheet action handler
   * case "change-stance": return StanceHandler.changeStance(this._getHandlerContext(), event, element);
   */
  static async changeStance(context, event, element) {
    event?.preventDefault?.();
    
    const actor = context.actor;
    if (!actor?.isOwner) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermission"));
      return;
    }
    
    // Get stance ID from select value
    const stanceId = element?.value;
    
    if (!stanceId || stanceId === "") {
      // Remove all stances
      await this._removeAllStances(actor);
    } else {
      // Add the new stance (lifecycle hook will remove conflicting stances)
      await this._addStance(actor, stanceId);
    }
  }
  
  /**
   * Add a stance effect to an actor.
   * Creates a new Active Effect using the appropriate stance template.
   * The `onPreCreateActiveEffect` hook automatically removes conflicting stances.
   * 
   * @param {Actor} actor - The actor to add the stance to
   * @param {string} stanceId - The stance status ID to add
   * @returns {Promise<void>}
   * @private
   */
  static async _addStance(actor, stanceId) {
    try {
      // Get the stance effect creator function
      const creator = getStanceEffectCreator(stanceId);
      if (!creator) {
        console.warn(`${SYS_ID} StanceHandler: No effect creator found for stance "${stanceId}"`);
        return;
      }
      
      // Create effect data from template
      const effectData = creator(actor);
      
      // Create the Active Effect
      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      
    } catch (err) {
      console.error(`${SYS_ID} StanceHandler: Failed to add stance "${stanceId}"`, err);
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.stanceAddFailed"));
    }
  }
  
  /**
   * Remove all stance effects from an actor.
   * Finds and deletes all Active Effects with stance status IDs.
   * 
   * @param {Actor} actor - The actor to remove stances from
   * @returns {Promise<void>}
   * @private
   */
  static async _removeAllStances(actor) {
    try {
      const STANCE_IDS = new Set([
        "attackStance", "fullAttackStance", "defenseStance", 
        "fullDefenseStance", "centerStance"
      ]);
      
      const effectsToRemove = [];
      for (const effect of actor.effects) {
        if (effect.disabled) continue;
        
        // Check modern statuses Set
        if (effect.statuses?.size) {
          for (const statusId of effect.statuses) {
            if (STANCE_IDS.has(statusId)) {
              effectsToRemove.push(effect.id);
              break;
            }
          }
        }
        
        // Check legacy statusId flag
        const legacyId = effect.getFlag?.("core", "statusId");
        if (legacyId && STANCE_IDS.has(legacyId)) {
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
