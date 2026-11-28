/**
 * @module services/animations/status-animations
 * @description Keeps the stance and condition auras each client shows in line with the statuses of the tokens on its
 * canvas. Every client plays its own, locally and without storing them on the token (Sequencer `play({ local: true })`
 * and `temporary()`), so each viewer's canvas and reduced-motion setting decide what it sees, and a scene change or a
 * reload rebuilds them from the statuses (#198). An aura attaches to its token, so a hidden token's aura shows only to
 * those who see the token. Auras an earlier version stored on tokens are ended by the GM. asset-library.js supplies
 * the animation settings; nothing plays without Sequencer and JB2A, and no game mechanic depends on it.
 */

import { SYS_ID } from "../../config/constants.js";
import {
  getStanceAnimation,
  getConditionAnimation,
  isJb2aAvailable,
  isMotionReduced,
  isSequencerAvailable
} from "./asset-library.js";

/**
 * Each token's refresh under way, by token id: a token's refreshes run one after another, so two in a row never start
 * the same aura twice or end one that is still starting.
 * @type {Map<string, Promise<void>>}
 */
const refreshing = new Map();

/** Longest wait for an aura to finish loading before it is ended anyway. */
const LOAD_WAIT_MS = 5000;

/**
 * Bring the auras of every token on this client's canvas in line with their statuses.
 * @returns {Promise<void>}
 */
export async function refreshSceneAnimations() {
  await Promise.all(canvas.tokens.placeables.map(refreshTokenAnimations));
}

/**
 * Bring the auras of an actor's tokens on this client's canvas in line with the actor's statuses.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function refreshActorAnimations(actor) {
  await Promise.all(actor.getActiveTokens().map(refreshTokenAnimations));
}

/**
 * Bring one token's auras on this client in line with its actor's statuses: start each missing one, end each one
 * whose status is gone. A token with no actor, or a user who asked for less motion, wants none (motion.md rule 5).
 * @param {Token} token - The token on this client's canvas
 * @returns {Promise<void>}
 */
export function refreshTokenAnimations(token) {
  const next = (refreshing.get(token.id) ?? Promise.resolve())
    .then(() => refreshTokenAnimationsNow(token))
    .catch(error =>
      console.warn(`L5R4 | Failed to update the animations of ${token.name}:`, error)
    );
  refreshing.set(token.id, next);
  // Left running: it only clears the queue entry once this refresh is the last
  next.then(() => {
    if (refreshing.get(token.id) === next) {
      refreshing.delete(token.id);
    }
  });
  return next;
}

/**
 * End the auras an earlier version of the system stored on the tokens of this client's scene: Sequencer played those
 * for everyone and kept them after their status ended elsewhere. Ending one removes it for every client, so the GM
 * does it.
 * @returns {Promise<void>}
 */
export async function endStoredAnimations() {
  const stored = Sequencer.EffectManager.getEffects({ name: `${SYS_ID}.*` }).filter(
    effect => !effect.data.temporary
  );
  if (stored.length) {
    await Sequencer.EffectManager.endEffects({ effects: stored });
  }
}

/**
 * Start and end one token's auras so they match what it wants.
 * @param {Token} token
 * @returns {Promise<void>}
 */
async function refreshTokenAnimationsNow(token) {
  if (token.destroyed || !isSequencerAvailable() || !isJb2aAvailable()) {
    return;
  }
  const wanted = wantedAnimationsOf(token);
  const playing = Sequencer.EffectManager.getEffects({ object: token }).filter(
    effect => effect.data.temporary && effect.data.name?.startsWith(`${SYS_ID}.`)
  );
  const ended = playing.filter(effect => !wanted.has(effect.data.name));
  if (ended.length) {
    await settleLoads(ended);
    await Sequencer.EffectManager.endEffects({ effects: ended }, false);
  }
  const playingNames = new Set(playing.map(effect => effect.data.name));
  for (const [name, config] of wanted) {
    if (!playingNames.has(name) && !token.destroyed) {
      await buildAnimationSequence(config, token, name).play({ local: true });
    }
  }
}

/**
 * The auras a token wants on this client, as settings by effect name: one for each status of its actor that has an
 * animation, none without an actor or for a user who asked for less motion.
 * @param {Token} token
 * @returns {Map<string, object>}
 */
function wantedAnimationsOf(token) {
  const wanted = new Map();
  if (!token.actor || isMotionReduced()) {
    return wanted;
  }
  for (const statusId of token.actor.statuses) {
    const config = getStanceAnimation(statusId) ?? getConditionAnimation(statusId);
    if (config) {
      wanted.set(`${SYS_ID}.${statusId}.${token.id}`, config);
    }
  }
  return wanted;
}

/**
 * Build the Sequencer sequence of one token's aura: the effect file attached to the token, configured by the
 * animation's settings, named so a later sync finds it, and kept off the token's stored effects.
 * @param {object} animConfig - The animation settings from asset-library.js
 * @param {Token} token - The token the effect attaches to
 * @param {string} effectName - The effect's name
 * @returns {Sequence} The sequence, ready to play
 */
function buildAnimationSequence(animConfig, token, effectName) {
  const sequence = new Sequence();
  let effectSection = sequence.effect().file(animConfig.file).attachTo(token).temporary();
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
  effectSection.name(effectName);
  return sequence;
}

/**
 * Wait until Sequencer has finished loading the given effects. Sequencer 4.2.3 loads an effect's video after `play()`
 * resolves, then sets the sprite's volume without checking whether the effect was ended meanwhile, so ending one that
 * is still loading throws inside Sequencer (`PersistentCanvasEffect._createSprite`).
 * @param {object[]} effects - Sequencer's effects
 * @returns {Promise<void>}
 */
async function settleLoads(effects) {
  const end = Date.now() + LOAD_WAIT_MS;
  while (effects.some(effect => !effect.ready) && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
