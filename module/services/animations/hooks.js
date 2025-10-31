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
 * - Does not modify game mechanics (purely visual layer)
 * - Gracefully degrades if Sequencer/JB2A not available
 *
 * Hook Execution Order:
 * 1. effect-lifecycle.js handles game mechanics (stance conflicts, Full Defense roll)
 * 2. Actor.prepareDerivedData() recalculates stats
 * 3. Animation hooks trigger visual effects (this module)
 *
 * @module services/animations/hooks
 * @requires Foundry VTT v13+
 */

import { playAnimation, removeAnimation, removeAllAnimations } from "./animation-manager.js";
import { handleAttackRoll } from "./attack-animations.js";

/**
 * Stance IDs that should trigger stance animations.
 *
 * @constant {Set<string>}
 * @private
 */
const STANCE_IDS = new Set([
  "fullAttackStance",
  "defenseStance",
  "fullDefenseStance",
  "centerStance"
]);

/**
 * Condition IDs that should trigger condition animations.
 *
 * @constant {Set<string>}
 * @private
 */
const CONDITION_IDS = new Set([
  "concentration",
  "dazed",
  "entangled",
  "fatigued",
  "feared",
  "grappled",
  "guarded",
  "guarding",
  "stunned"
]);

/**
 * Extract status IDs from an ActiveEffect.
 *
 * @param {ActiveEffect} effect - The effect to extract status IDs from
 * @returns {string[]} Array of status IDs
 * @private
 */
function getEffectStatusIds(effect) {
  const statuses = effect.statuses || new Set();
  return Array.from(statuses);
}

/**
 * Determine if a status ID is a stance.
 *
 * @param {string} statusId - The status ID to check
 * @returns {boolean} True if stance
 * @private
 */
function isStance(statusId) {
  return STANCE_IDS.has(statusId);
}

/**
 * Determine if a status ID is a condition.
 *
 * @param {string} statusId - The status ID to check
 * @returns {boolean} True if condition
 * @private
 */
function isCondition(statusId) {
  return CONDITION_IDS.has(statusId);
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
export function onCreateActiveEffectAnimation(effect, _options, _userId) {
  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  // Defer animation to ensure effect is fully applied
  queueMicrotask(async () => {
    const statusIds = getEffectStatusIds(effect);

    for (const statusId of statusIds) {
      if (isStance(statusId)) {
        await playAnimation(actor, statusId, true);
      } else if (isCondition(statusId)) {
        await playAnimation(actor, statusId, false);
      }
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
export function onUpdateActiveEffectAnimation(effect, changes, _options, _userId) {
  // Early return: Only handle disabled state changes
  if (changes?.disabled === undefined) {
    return;
  }

  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  // Defer animation to ensure effect state is updated
  queueMicrotask(async () => {
    const statusIds = getEffectStatusIds(effect);

    for (const statusId of statusIds) {
      const isStanceEffect = isStance(statusId);
      const isConditionEffect = isCondition(statusId);

      if (!isStanceEffect && !isConditionEffect) {
        continue;
      }

      if (changes.disabled === true) {
        // Effect disabled: Remove animation
        await removeAnimation(actor, statusId);
      } else if (changes.disabled === false) {
        // Effect enabled: Play animation
        await playAnimation(actor, statusId, isStanceEffect);
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
export function onDeleteActiveEffectAnimation(effect, _options, _userId) {
  const actor = effect?.parent;

  // Early return: Only handle Actor effects
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  // Defer animation cleanup
  queueMicrotask(async () => {
    const statusIds = getEffectStatusIds(effect);

    for (const statusId of statusIds) {
      if (isStance(statusId) || isCondition(statusId)) {
        await removeAnimation(actor, statusId);
      }
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
export function onDeleteActorAnimation(actor, _options, _userId) {
  // Defer animation cleanup
  queueMicrotask(async () => {
    await removeAllAnimations(actor);
  });
}

/**
 * Hook handler for chat message creation to detect attack rolls.
 *
 * Detects when an attack roll chat message is created and triggers
 * arrow animations for bow attacks if a target is selected.
 *
 * Uses target actor ID stored in message flags to ensure animations
 * play to the correct target across all clients, not just the current
 * user's selected targets.
 *
 * @param {ChatMessage} message - The newly created chat message
 * @returns {void}
 */
export function onCreateChatMessageAnimation(message) {
  // Defer to next tick to ensure message is fully created
  queueMicrotask(async () => {
    // Check if this is an attack roll with a weapon
    // Attack rolls have weaponId in flags (only set for successful attacks)
    const flags = message.flags?.["l5r4-enhanced"] ?? {};
    const weaponId = flags.weaponId;
    const targetActorId = flags.targetActorId;

    if (!weaponId) {
      return;
    }

    // Get the actor who made the roll
    const speaker = message.speaker;
    const actor = ChatMessage.getSpeakerActor(speaker);

    if (!actor) {
      console.warn("L5R4 | Could not find actor from speaker");
      return;
    }

    // Get the weapon
    const weapon = actor.items.get(weaponId);

    if (!weapon) {
      console.warn("L5R4 | Could not find weapon with ID:", weaponId);
      return;
    }

    // Check if weapon is valid for animations (weapon or bow type)
    if (weapon.type !== "weapon" && weapon.type !== "bow") {
      return;
    }

    // Get target actor from stored ID instead of game.user.targets
    // This ensures animations play to the correct target across all clients
    if (!targetActorId) {
      return;
    }

    const targetActor = game.actors.get(targetActorId);

    if (!targetActor) {
      console.warn("L5R4 | Could not find target actor with ID:", targetActorId);
      return;
    }

    // Play attack animation
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
