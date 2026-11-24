/**
 * @module services/effects/effect-proofs
 * @description What lets a player's client ask the GM's client to put an effect on an actor the player does not own
 * (#162). The request carries a proof, and the GM's client checks it against what it can see itself: a roll or action
 * of a character the requester owns, against that actor, that the rules let put that effect on it. The effect's level
 * and timing come from the proof, never from the request. Any player can write a chat message with any content, so a
 * proof can only bind a request to what the requester's own character could have done.
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/40_grappling.md, p.88-89
 */

import { toInt } from "../../utils/type-coercion.js";
import { getContestOutcome } from "../combat/contest-rolls.js";

/**
 * @typedef {object} EffectProof
 * @property {"roll"|"grapple"|"contest"|"guard"} kind  What allows the effect
 * @property {string} [messageId]     The roll whose offered condition, or grapple, it is
 * @property {number} [index]         Index into the roll's offered conditions
 * @property {string} [attackId]      The attack whose Contested Strength the requester's side won
 * @property {string} [protectorUuid] The guard the requester owns
 */

/**
 * @typedef {object} EffectRequest
 * @property {Actor} actor          The actor the effect goes on
 * @property {string} id            The status or system effect
 * @property {EffectProof} proof    From the request
 * @property {User} user            The requesting user, as the server names it
 */

/** One check per proof kind. */
const PROOFS = Object.freeze({
  roll: getRollProofOptions,
  grapple: getGrappleProofOptions,
  contest: getContestProofOptions,
  guard: getGuardProofOptions
});

/**
 * The options a proven effect is made with, from its proof; null when the proof does not hold.
 * @param {EffectRequest} request - The proof may be missing or of any shape: it came from another client
 * @returns {object|null} `level`, `origin`, and `turnOf` for applyEffect
 */
export function getProvenEffectOptions(request) {
  const kind = String(request.proof?.kind);
  return Object.hasOwn(PROOFS, kind) ? PROOFS[kind](request) : null;
}

/**
 * A roll message by a character the user owns, a success against this actor.
 * @param {string} messageId
 * @param {EffectRequest} request
 * @returns {ChatMessage|null}
 */
function getSuccessAgainst(messageId, { actor, user }) {
  const message = game.messages.get(String(messageId));
  if (message?.type !== "roll" || message.system.outcome.success !== true) {
    return null;
  }
  const roller = fromUuidSync(message.system.actorUuid);
  const owned = Boolean(roller?.testUserPermission(user, "OWNER"));
  return owned && message.system.target?.uuid === actor.uuid ? message : null;
}

/**
 * A condition a successful roll offers: the roll's own entry, which the roller's ApplyCondition rules must offer at
 * the same level.
 * @param {EffectRequest} request
 * @returns {object|null}
 */
function getRollProofOptions(request) {
  const { id, proof } = request;
  const message = getSuccessAgainst(proof.messageId, request);
  const entry = message?.system.conditions[toInt(proof.index)];
  if (entry?.condition !== id) {
    return null;
  }
  const roller = fromUuidSync(message.system.actorUuid);
  const offered = Object.values(roller.ruleBag?.applyConditions ?? {})
    .flat()
    .some(rule => rule.condition === id && (rule.level ?? null) === (entry.level ?? null));
  if (!offered) {
    return null;
  }
  return entry.level === null ? {} : { level: entry.level };
}

/**
 * Grappled on the target of a hit with the Grapple maneuver.
 * game-rules/40_grappling.md, p.88-89
 * @param {EffectRequest} request
 * @returns {object|null}
 */
function getGrappleProofOptions(request) {
  const message = getSuccessAgainst(request.proof.messageId, request);
  const grapple = message?.system.kind === "attack" && message.system.maneuvers?.grapple;
  return request.id === "grappled" && grapple ? {} : null;
}

/**
 * Prone on the target of a Knockdown whose Contested Strength the attacker won.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {EffectRequest} request
 * @returns {object|null}
 */
function getContestProofOptions(request) {
  const attack = getSuccessAgainst(request.proof.attackId, request);
  const knockdown = attack?.system.kind === "attack" && attack.system.maneuvers?.knockdown;
  if (request.id !== "prone" || !knockdown) {
    return null;
  }
  const outcome = getContestOutcome(attack.id);
  return outcome && !outcome.tie && outcome.winner === "attacker" ? {} : null;
}

/**
 * Guarded on the ward of a guard the user owns, timed from the guard's Turn.
 * game-rules/38_maneuvers.md, p.87
 * @param {EffectRequest} request
 * @returns {object|null}
 */
function getGuardProofOptions({ actor, id, proof, user }) {
  const protector = fromUuidSync(String(proof.protectorUuid));
  const owned = protector?.documentName === "Actor" && protector.testUserPermission(user, "OWNER");
  // Not in the Full Attack Stance, as guard() checks on the requester's client
  if (
    id !== "guarded" ||
    !owned ||
    protector === actor ||
    protector.statuses.has("fullAttackStance")
  ) {
    return null;
  }
  return { origin: protector.uuid, turnOf: protector.uuid };
}
