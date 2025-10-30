/**
 * Animation Manager for L5R4 Visual Effects
 *
 * Orchestrates visual animations for stances and status effects using Sequencer and JB2A.
 * Manages animation lifecycle (play, persist, cleanup) and provides graceful degradation
 * when required modules are not installed.
 *
 * Key Responsibilities:
 * - Play animations when stances/conditions are applied
 * - Clean up animations when stances/conditions are removed
 * - Manage persistent effects (auras that remain active)
 * - Handle module availability (Sequencer, JB2A)
 * - Provide defensive error handling
 *
 * Architecture Integration:
 * - Called by hooks.js when ActiveEffects change
 * - Uses asset-library.js for animation configuration
 * - Integrates with Sequencer module API
 * - Works with existing stance/condition system (no game mechanic changes)
 *
 * Sequencer Integration:
 * - Uses Sequence API for effect playback
 * - Stores effect IDs for cleanup via Sequencer.EffectManager
 * - Attaches effects to tokens for proper positioning
 *
 * @module services/animations/animation-manager
 * @requires Foundry VTT v13+
 * @requires Sequencer module (optional, graceful degradation)
 * @requires JB2A module (optional, graceful degradation)
 */

import { SYS_ID } from "../../config/constants.js";
import {
  getStanceAnimation,
  getConditionAnimation,
  isJB2AAvailable,
  isSequencerAvailable
} from "./asset-library.js";

/**
 * Play animation for a stance or condition.
 *
 * Creates a persistent visual effect attached to the actor's token(s).
 * Effect persists until explicitly removed via removeAnimation().
 *
 * Defensive Coding:
 * - Returns early if Sequencer or JB2A not available
 * - Returns early if no animation config found for ID
 * - Returns early if actor has no active tokens
 * - Wraps Sequencer API calls in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * Effect Storage:
 * Stores Sequencer effect ID in actor flags for later cleanup:
 * `actor.flags[SYS_ID].animations[statusId] = effectId`
 *
 * @param {Actor} actor - The actor to play animation on
 * @param {string} statusId - The stance or condition ID (e.g., "fullAttackStance", "blinded")
 * @param {boolean} [isStance=false] - True if this is a stance, false if condition
 * @returns {Promise<void>}
 *
 * @example
 * await playAnimation(actor, "fullAttackStance", true);
 * await playAnimation(actor, "blinded", false);
 */
export async function playAnimation(actor, statusId, isStance = false) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJB2AAvailable()) {
    return;
  }

  // Get animation configuration
  const animConfig = isStance ? getStanceAnimation(statusId) : getConditionAnimation(statusId);

  if (!animConfig) {
    return;
  }

  // Get actor's active tokens
  const tokens = actor.getActiveTokens();

  if (!tokens || tokens.length === 0) {
    return;
  }

  // Play animation on each token
  for (const token of tokens) {
    try {
      // Build Sequencer sequence
      const sequence = new Sequence();

      // Configure effect
      let effectSection = sequence.effect().file(animConfig.file).attachTo(token);

      // Apply configuration
      if (animConfig.scale !== undefined) {
        effectSection = effectSection.scale(animConfig.scale);
      }

      if (animConfig.opacity !== undefined) {
        effectSection = effectSection.opacity(animConfig.opacity);
      }

      if (animConfig.belowTokens) {
        effectSection = effectSection.belowTokens();
      }

      if (animConfig.persist) {
        effectSection = effectSection.persist();
      }

      if (animConfig.duration !== null && animConfig.duration !== undefined) {
        effectSection = effectSection.duration(animConfig.duration);
      }

      // Set effect name for later cleanup
      const effectName = `${SYS_ID}.${statusId}.${token.id}`;
      effectSection = effectSection.name(effectName);

      // Play the sequence
      await sequence.play();

      // Store effect ID in actor flags for cleanup
      const animations = actor.getFlag(SYS_ID, "animations") || {};
      animations[statusId] = effectName;
      await actor.setFlag(SYS_ID, "animations", animations);
    } catch (error) {
      console.warn(`L5R4 | Failed to play animation ${statusId} for ${actor.name}:`, error);
    }
  }
}

/**
 * Remove animation for a stance or condition.
 *
 * Ends the persistent visual effect created by playAnimation().
 * Cleans up effect from Sequencer and removes stored effect ID from actor flags.
 *
 * Defensive Coding:
 * - Returns early if Sequencer not available
 * - Returns early if no stored effect ID found
 * - Wraps Sequencer API calls in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * @param {Actor} actor - The actor to remove animation from
 * @param {string} statusId - The stance or condition ID
 * @returns {Promise<void>}
 *
 * @example
 * await removeAnimation(actor, "fullAttackStance");
 * await removeAnimation(actor, "blinded");
 */
export async function removeAnimation(actor, statusId) {
  // Early return: Check module availability
  if (!isSequencerAvailable()) {
    return;
  }

  // Get stored effect ID from actor flags
  const animations = actor.getFlag(SYS_ID, "animations") || {};
  const effectName = animations[statusId];

  if (!effectName) {
    return;
  }

  try {
    // End the effect via Sequencer
    await Sequencer.EffectManager.endEffects({ name: effectName });

    // Remove from actor flags
    delete animations[statusId];
    await actor.setFlag(SYS_ID, "animations", animations);
  } catch (error) {
    console.warn(`L5R4 | Failed to remove animation ${statusId} for ${actor.name}:`, error);
  }
}

/**
 * Remove all animations from an actor.
 *
 * Cleans up all persistent effects when actor is deleted or all effects are cleared.
 * Iterates through stored effect IDs and removes each one.
 *
 * @param {Actor} actor - The actor to remove all animations from
 * @returns {Promise<void>}
 *
 * @example
 * await removeAllAnimations(actor);
 */
export async function removeAllAnimations(actor) {
  // Early return: Check module availability
  if (!isSequencerAvailable()) {
    return;
  }

  const animations = actor.getFlag(SYS_ID, "animations") || {};
  const statusIds = Object.keys(animations);

  if (statusIds.length === 0) {
    return;
  }

  // Remove each animation
  for (const statusId of statusIds) {
    await removeAnimation(actor, statusId);
  }
}
