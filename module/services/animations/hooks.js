/**
 * @module services/animations/hooks
 * @description Hook handlers for the Sequencer and JB2A animations. Every client runs them and plays what it shows on
 * its own (#198): a token's stance and condition auras follow its actor's statuses whenever an Active Effect changes,
 * the canvas loads, or a token is drawn, and a hit plays the attack animation for each user who can read the roll.
 * Each defers with queueMicrotask until the change and the actor's derived data are in place, changes no game
 * mechanic, and is wired only when Sequencer and JB2A are active.
 */

import {
  endStoredAnimations,
  refreshActorAnimations,
  refreshSceneAnimations,
  refreshTokenAnimations
} from "./status-animations.js";
import { startAttackAnimation } from "./attack-animations.js";

/**
 * Hook handler for an Active Effect created, updated, or deleted: the auras of the actor it applies to follow the
 * actor's statuses, on the actor itself or through an item the actor holds.
 * @param {ActiveEffect} effect
 * @returns {void}
 */
export function onActiveEffectAnimation(effect) {
  const actor = effect.parent?.documentName === "Item" ? effect.parent.parent : effect.parent;
  if (actor?.documentName !== "Actor") {
    return;
  }
  queueMicrotask(() => refreshActorAnimations(actor));
}

/**
 * Hook handler for an Actor deleted: the tokens left on this client's canvas have no actor, so their auras end.
 * @param {Actor} actor - The deleted actor
 * @returns {void}
 */
export function onDeleteActorAnimation(actor) {
  queueMicrotask(async () => {
    const tokens = canvas.tokens?.placeables.filter(token => token.document.actorId === actor.id);
    await Promise.all((tokens ?? []).map(refreshTokenAnimations));
  });
}

/**
 * Hook handler for the canvas ready: the GM ends the auras an earlier version stored on this scene's tokens, then each
 * token's auras follow its statuses.
 * @returns {Promise<void>}
 */
export async function onCanvasReadyAnimation() {
  if (game.user.isGM) {
    await endStoredAnimations();
  }
  await refreshSceneAnimations();
}

/**
 * Hook handler for a token drawn on a ready canvas (one placed, or redrawn): its auras follow its statuses. The tokens
 * of a scene as it loads wait for the canvas ready.
 * @param {Token} token
 * @returns {void}
 */
export function onDrawTokenAnimation(token) {
  if (canvas.ready) {
    // Left running: core's draw hook does not wait for it, and the refresh reports its own failure
    refreshTokenAnimations(token);
  }
}

/**
 * Hook handler for chat message creation: a hit with a weapon against a target plays the attack animation for each
 * user who can read the roll (a whisper's recipients and the GM; not the roller of a blind roll).
 *
 * Reads the attacker, weapon, and target the `roll` message stored (module/data/chat/roll-message-data.js).
 *
 * @param {ChatMessage} message - The newly created chat message
 * @returns {void}
 */
export function onCreateChatMessageAnimation(message) {
  if (message.type !== "roll" || !message.isContentVisible) {
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
    await startAttackAnimation(actor, targetActor, weapon);
  });
}
