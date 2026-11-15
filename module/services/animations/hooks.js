/**
 * Animation System Hooks
 *
 * Integrates visual animations with L5R4 stance and condition lifecycle.
 * Listens for ActiveEffect changes and triggers appropriate animations.
 *
 * Key Responsibilities:
 * - Detect when stances/conditions are applied (play animation)
 * - Detect when stances/conditions are removed (cleanup animation)
 * - Detect when stances/conditions are enabled/disabled (toggle animation)
 * - Integrate with existing effect-lifecycle.js hooks
 *
 * Integration Strategy:
 * - Hooks into same ActiveEffect events as effect-lifecycle.js
 * - Runs after effect-lifecycle.js completes (deferred via queueMicrotask)
 * - Does not modify game mechanics (a visual layer only)
 * - Gracefully degrades if Sequencer/JB2A not available
 *
 * Hook Execution Order:
 * 1. The effect's rules and services/effects/ handle game mechanics (one stance at a time, Full Defense roll)
 * 2. Actor.prepareDerivedData() recalculates stats
 * 3. Animation hooks trigger visual effects (this module)
 *
 * @module services/animations/hooks
 * @requires Foundry VTT v13+
 */

import { STANCE_IDS } from "../../utils/stances.js";
import { playAnimation, removeAnimation, removeAllAnimations } from "./animation-manager.js";
import { getConditionAnimation, getStanceAnimation } from "./asset-library.js";
import { handleAttackRoll } from "./attack-animations.js";

/**
 * The statuses of an effect that have an animation (module/services/animations/asset-library.js), each marked
 * stance or not.
 *
 * @param {ActiveEffect} effect
 * @returns {Array<{statusId: string, isStance: boolean}>}
 * @private
 */
function animatedStatuses(effect) {
  return [...effect.statuses]
    .filter(statusId => getStanceAnimation(statusId) || getConditionAnimation(statusId))
    .map(statusId => ({ statusId, isStance: STANCE_IDS.has(statusId) }));
}

/**
 * Whether this client plays the animation for a change: only the user who made it. Every client runs these hooks,
 * and Sequencer sends each effect to every connected client, so playing it everywhere would show it once per
 * client.
 *
 * @param {string} userId - The user who made the change
 * @returns {boolean}
 * @private
 */
function playsHere(userId) {
  return userId === game.user.id;
}

/**
 * Hook handler for ActiveEffect create event.
 *
 * Triggers animations when stances or conditions are applied to an actor.
 * Deferred via queueMicrotask to ensure effect is fully applied before animation.
 *
 * @param {ActiveEffect} effect - The newly created effect
 * @param {object} options - Creation options
 * @param {string} userId - User who created the effect
 * @returns {void}
 */
export function onCreateActiveEffectAnimation(effect, _options, userId) {
  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor" || !playsHere(userId)) {
    return;
  }

  // Defer animation to ensure effect is fully applied
  queueMicrotask(async () => {
    for (const { statusId, isStance } of animatedStatuses(effect)) {
      await playAnimation(actor, statusId, isStance);
    }
  });
}

/**
 * Hook handler for ActiveEffect update event.
 *
 * Handles animation toggling when effects are enabled/disabled.
 * - Disabled → Enabled: Play animation
 * - Enabled → Disabled: Remove animation
 *
 * @param {ActiveEffect} effect - The updated effect
 * @param {object} changes - Changed fields
 * @param {object} options - Update options
 * @param {string} userId - User who updated the effect
 * @returns {void}
 */
export function onUpdateActiveEffectAnimation(effect, changes, _options, userId) {
  // Early return: Only handle disabled state changes
  if (changes?.disabled === undefined) {
    return;
  }

  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor" || !playsHere(userId)) {
    return;
  }

  // Defer animation to ensure effect state is updated
  queueMicrotask(async () => {
    for (const { statusId, isStance } of animatedStatuses(effect)) {
      if (changes.disabled === true) {
        // Effect disabled: Remove animation
        await removeAnimation(actor, statusId);
      } else if (changes.disabled === false) {
        // Effect enabled: Play animation
        await playAnimation(actor, statusId, isStance);
      }
    }
  });
}

/**
 * Hook handler for ActiveEffect delete event.
 *
 * Cleans up animations when stances or conditions are removed from an actor.
 *
 * @param {ActiveEffect} effect - The deleted effect
 * @param {object} options - Deletion options
 * @param {string} userId - User who deleted the effect
 * @returns {void}
 */
export function onDeleteActiveEffectAnimation(effect, _options, userId) {
  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor" || !playsHere(userId)) {
    return;
  }

  // Defer animation cleanup
  queueMicrotask(async () => {
    for (const { statusId } of animatedStatuses(effect)) {
      await removeAnimation(actor, statusId);
    }
  });
}

/**
 * Hook handler for Actor delete event.
 *
 * Cleans up all animations when an actor is deleted.
 * Prevents orphaned Sequencer effects.
 *
 * @param {Actor} actor - The deleted actor
 * @param {object} options - Deletion options
 * @param {string} userId - User who deleted the actor
 * @returns {void}
 */
export function onDeleteActorAnimation(actor, _options, userId) {
  if (!playsHere(userId)) {
    return;
  }
  // Defer animation cleanup
  queueMicrotask(async () => {
    await removeAllAnimations(actor);
  });
}

/**
 * Hook handler for chat message creation: a hit with a weapon against a target plays the attack animation.
 *
 * Reads the attacker, weapon, and target the `roll` message stored (module/data/chat/roll-message-data.js). The
 * client that posted it plays the animation, and Sequencer shows it to everyone.
 *
 * @param {ChatMessage} message - The newly created chat message
 * @param {object} _options - Creation options
 * @param {string} userId - User who created the message
 * @returns {void}
 */
export function onCreateChatMessageAnimation(message, _options, userId) {
  if (message.type !== "roll" || !playsHere(userId)) {
    return;
  }
  const { kind, outcome, actorUuid, weaponUuid, target } = message.system;
  if (kind !== "attack" || outcome.success !== true || !weaponUuid || !target.uuid) {
    return;
  }
  // Defer to next tick to ensure message is fully created
  queueMicrotask(async () => {
    const actor = fromUuidSync(actorUuid);
    const weapon = fromUuidSync(weaponUuid);
    const targetActor = fromUuidSync(target.uuid);
    if (!actor || !weapon || !targetActor) {
      return;
    }
    await handleAttackRoll(actor, targetActor, weapon);
  });
}

/**
 * Register all animation hooks.
 *
 * Called by initialize.js during system init.
 * Registers hooks for ActiveEffect and Actor lifecycle events.
 *
 * @returns {void}
 */
export function registerAnimationHooks() {
  Hooks.on("createActiveEffect", onCreateActiveEffectAnimation);
  Hooks.on("updateActiveEffect", onUpdateActiveEffectAnimation);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffectAnimation);
  Hooks.on("deleteActor", onDeleteActorAnimation);
  Hooks.on("createChatMessage", onCreateChatMessageAnimation);
}
