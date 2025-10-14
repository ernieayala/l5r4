/**
 * Stance Automation Service
 *
 * Manages automated effects and cleanup for L5R4 combat stances.
 * Handles persisted stance data (e.g., Full Defense roll results) and
 * ensures flags are properly cleared when stances are removed.
 *
 * Related modules:
 * - stance-effects.js: Applies stance bonuses/penalties to character stats
 * - effect-templates.js: Defines Active Effect configurations for each stance
 *
 * Game Mechanics:
 * Full Defense Stance requires a Defense/Reflexes roll at declaration.
 * Half the roll total (rounded up) is added to Armor TN until next turn.
 * This result must be stored in actor flags and cleared when stance ends.
 *
 * API: Foundry Actor document, Actor.getFlag/unsetFlag
 * Requires: Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { applyStanceEffects } from "../../../documents/actor/calculations/stance-effects.js";

/**
 * Alias for applyStanceEffects function.
 * Maintains backward compatibility and provides a descriptive name
 * for external modules that apply automated stance effects.
 *
 * @see {applyStanceEffects} in stance-effects.js for implementation
 */
export const applyStanceAutomation = applyStanceEffects;

/**
 * Removes persisted flag data when a stance is removed from an actor.
 *
 * Some stances (e.g., Full Defense) store roll results or state in actor flags.
 * When these stances are removed, the associated flags must be cleared to
 * prevent stale data from affecting future calculations.
 *
 * Full Defense Stance: Stores the Defense/Reflexes roll result in the
 * "fullDefenseRoll" flag. This value determines the Armor TN bonus per
 * core rules (half of roll total, rounded up). The flag must be cleared
 * when the stance ends to ensure accurate calculations on re-activation.
 *
 * @param {Actor} actor - The actor whose stance flags should be cleared
 * @param {string} removedStanceId - The ID of the removed stance (e.g., "fullDefenseStance")
 * @returns {Promise<void>} Resolves when flags are cleared, or immediately if actor lacks permissions
 *
 * @async
 */
export async function clearStanceFlags(actor, removedStanceId) {
  if (!actor?.isOwner) return;

  try {
    switch (removedStanceId) {
      case "fullDefenseStance":
        await actor.unsetFlag(SYS_ID, "fullDefenseRoll");
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("L5R4 | Failed to clear stance flags:", error);
  }
}
