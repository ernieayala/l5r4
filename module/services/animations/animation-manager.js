/**
 * @module services/animations/animation-manager
 * @description Plays, persists, and ends the Sequencer and JB2A animations for stances and conditions, and does
 * nothing when either module is missing. hooks.js calls it when Active Effects change; asset-library.js supplies the
 * animation settings. Each effect is attached to a token and named so Sequencer.EffectManager can end it later. No
 * game mechanic depends on it.
 */

import { SYS_ID } from "../../config/constants.js";
import {
  getStanceAnimation,
  getConditionAnimation,
  isJb2aAvailable,
  isSequencerAvailable
} from "./asset-library.js";

/**
 * Animations still starting, by effect name, so a removal that comes first does not miss the effect and leave it
 * playing.
 * @type {Map<string, Promise<unknown>>}
 */
const starting = new Map();

/** Longest wait for a started effect to finish loading before it is ended anyway. */
const LOAD_WAIT_MS = 5000;

/**
 * Play animation for a stance or condition.
 *
 * Creates a persistent visual effect attached to the actor's token(s).
 * Effect persists until explicitly removed via deleteAnimation().
 *
 * Defensive Coding:
 * - Returns early if Sequencer or JB2A not available
 * - Returns early if no animation config found for ID
 * - Returns early if actor has no active tokens
 * - Wraps Sequencer API calls in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * Effect Storage:
 * Effects are named using the pattern: `${SYS_ID}.${statusId}.${token.id}`
 * Sequencer manages cleanup via effect name pattern matching.
 *
 * @param {Actor} actor - The actor to play animation on
 * @param {string} statusId - The stance or condition ID (e.g., "fullAttackStance", "blinded")
 * @param {boolean} [isStance=false] - True if this is a stance, false if condition
 * @returns {Promise<void>}
 */
export async function startAnimation(actor, statusId, isStance = false) {
  // Early return: Check module availability
  if (!isSequencerAvailable() || !isJb2aAvailable()) {
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

      // Play the sequence; a removal of this effect waits for it (see `starting`)
      const start = sequence.play();
      starting.set(effectName, start);
      try {
        await start;
      } finally {
        if (starting.get(effectName) === start) {
          starting.delete(effectName);
        }
      }
    } catch (error) {
      console.warn(`L5R4 | Failed to play animation ${statusId} for ${actor.name}:`, error);
    }
  }
}

/**
 * Remove animation for a stance or condition.
 *
 * Ends the persistent visual effect created by startAnimation().
 * Uses Sequencer's effect name pattern matching to find and end effects.
 *
 * Defensive Coding:
 * - Returns early if Sequencer not available
 * - Returns early if actor has no active tokens
 * - Wraps Sequencer API calls in try/catch
 * - Logs warnings on failure (non-fatal)
 *
 * @param {Actor} actor - The actor to remove animation from
 * @param {string} statusId - The stance or condition ID
 * @returns {Promise<void>}
 */
export async function deleteAnimation(actor, statusId) {
  // Early return: Check module availability
  if (!isSequencerAvailable()) {
    return;
  }

  // Get actor's active tokens
  const tokens = actor.getActiveTokens();

  if (!tokens || tokens.length === 0) {
    return;
  }

  // Remove animation from each token
  for (const token of tokens) {
    try {
      // Build effect name pattern
      const effectName = `${SYS_ID}.${statusId}.${token.id}`;

      // End the effect via Sequencer, once it has finished starting
      await settleStarts(name => name === effectName, effectName);
      await Sequencer.EffectManager.endEffects({ name: effectName });
    } catch (error) {
      console.warn(`L5R4 | Failed to remove animation ${statusId} for ${actor.name}:`, error);
    }
  }
}

/**
 * Remove all animations from an actor.
 *
 * Cleans up all persistent effects when actor is deleted or all effects are cleared.
 * Uses Sequencer's effect name pattern matching to find and end all system effects.
 *
 * @param {Actor} actor - The actor to remove all animations from
 * @returns {Promise<void>}
 */
export async function deleteAllAnimations(actor) {
  // Early return: Check module availability
  if (!isSequencerAvailable()) {
    return;
  }

  // Get actor's active tokens
  const tokens = actor.getActiveTokens();

  if (!tokens || tokens.length === 0) {
    return;
  }

  // Remove all animations from each token
  for (const token of tokens) {
    try {
      // End all effects for this system and token using name pattern, once they have finished starting
      await settleStarts(
        name => name.startsWith(`${SYS_ID}.`) && name.endsWith(`.${token.id}`),
        `${SYS_ID}.*${token.id}`
      );
      await Sequencer.EffectManager.endEffects({ name: `${SYS_ID}.*${token.id}` });
    } catch (error) {
      console.warn(`L5R4 | Failed to remove all animations for ${actor.name}:`, error);
    }
  }
}

/**
 * Wait until the named animations have started and Sequencer has finished loading them. Sequencer 4.2.3 loads an
 * effect's video after `play()` resolves, then sets the sprite's volume without checking whether the effect was ended
 * meanwhile, so ending one that is still loading throws inside Sequencer (`PersistentCanvasEffect._createSprite`).
 * @param {function(string): boolean} matches - Which effect names to wait for
 * @param {string} pattern - The Sequencer name pattern for the same effects
 * @returns {Promise<void>}
 */
async function settleStarts(matches, pattern) {
  await Promise.allSettled(
    [...starting].filter(([name]) => matches(name)).map(([, start]) => start)
  );
  const end = Date.now() + LOAD_WAIT_MS;
  const isLoading = () =>
    Sequencer.EffectManager.getEffects({ name: pattern }).some(effect => !effect.ready);
  while (isLoading() && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
