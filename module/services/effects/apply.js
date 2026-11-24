/**
 * @module services/effects/apply
 * @description Create stances, conditions, and the system's own effects from one source of data
 * (module/config/status-effects.js), so the token HUD, the sheets, the Condition Manager, and every service make
 * the same effect. Applying an effect to an actor the user does not own goes to the active GM as a query.
 */

import { SYS_ID } from "../../config/constants.js";
import { PER_ORIGIN_STATUSES, SYSTEM_EFFECTS } from "../../config/status-effects.js";
import { F, T } from "../../utils/localization.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";
import { getProvenEffectOptions } from "./effect-proofs.js";
import { startedCombatOf } from "./uses.js";

/** Name of the GM query that applies an effect for a player (registered in registerEffectQueries). */
export const APPLY_EFFECT_QUERY = `${SYS_ID}.applyEffect`;

/**
 * @typedef {object} EffectOptions
 * @property {number|null} [level]   The effect's level (a Fear Rank)
 * @property {string} [name]         A name in place of the status's
 * @property {object[]} [rules]      Rules in place of the status's
 * @property {string} [origin]       UUID of what caused the effect
 * @property {object} [start]        Duration start fields (core fills the rest)
 * @property {string} [turnOf]       UUID of the actor whose Turn the duration counts from (ownTurnStartOf)
 * @property {object} [flags]        Extra `flags.l5r4-enhanced` data
 * @property {import("./effect-proofs.js").EffectProof} [proof] What lets the user put the effect on an actor they
 *   do not own; the GM's client checks it and takes the level and timing from it
 */

/**
 * Active Effect data for a status (CONFIG.statusEffects) or a system effect (SYSTEM_EFFECTS), with options.
 * @param {Actor} actor
 * @param {string} id
 * @param {EffectOptions} [options]
 * @returns {Promise<object>}
 */
export async function buildEffectData(
  actor,
  id,
  { level, name, rules, origin, start, flags } = {}
) {
  const data = await buildBaseEffectData(actor, id);
  data.system ??= {};
  data.flags = foundry.utils.mergeObject(data.flags ?? {}, {
    [SYS_ID]: { effectId: id, ...(flags ?? {}) }
  });
  if (level !== undefined) {
    data.system.level = level;
  }
  if (name) {
    data.name = name;
  }
  if (rules) {
    data.system.rules = rules;
  }
  if (origin) {
    data.origin = origin;
  }
  if (start) {
    data.start = start;
  }
  return data;
}

/**
 * Create an effect on an actor the user owns. A status the actor already holds is not created twice, since a
 * condition is a state the character is in, not a penalty that adds up (two Dazed are one -3k0): the one held
 * starts its duration again, and takes the new level when it is higher (#177).
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} actor
 * @param {string} id
 * @param {EffectOptions} [options]
 * @returns {Promise<ActiveEffect|undefined>}
 */
export async function applyEffect(actor, id, { turnOf, ...options } = {}) {
  const start = turnOf ? ownTurnStartOf(await fromUuid(turnOf)) : options.start;
  const data = await buildEffectData(actor, id, { ...options, start });
  const held = heldStatusOf(actor, id, data.origin);
  if (held) {
    return updateHeldStatus(held, data);
  }
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  return effect;
}

/**
 * Create an effect on any actor: by the user when they own it, otherwise through the active GM. The GM's client says
 * whether it made the effect, so this user hears that it was applied, or that the actor is immune (#139).
 * @param {Actor} actor
 * @param {string} id
 * @param {EffectOptions} [options]
 * @returns {Promise<void>}
 */
export async function applyEffectAnywhere(actor, id, options = {}) {
  if (actor.isOwner) {
    await applyEffect(actor, id, options);
    return;
  }
  const answer = await requestGmQuery(APPLY_EFFECT_QUERY, { actorUuid: actor.uuid, id, options });
  if (!answer) {
    return;
  }
  const effect = options.name ?? T(CONFIG.statusEffects[id]?.name ?? SYSTEM_EFFECTS[id].name);
  const key = answer.applied ? "l5r4.ui.requests.effectApplied" : "l5r4.ui.effects.immune";
  ui.notifications?.info(F(key, { name: actor.name, effect }));
}

/**
 * The effects on an actor made from one status or system effect.
 * @param {Actor} actor
 * @param {string} id
 * @returns {ActiveEffect[]}
 */
export function effectsOf(actor, id) {
  return actor.effects.filter(e => e.getFlag(SYS_ID, "effectId") === id || e.statuses.has(id));
}

/**
 * The start of an effect timed from the actor's own Turn, so "until his next Turn" counts from his combatant
 * whoever is acting now: core's start data [src: client/documents/active-effect.mjs:960-971] with the actor's
 * combatant, in the started combat the actor is in, which need not be the viewed scene's (#110). Undefined outside
 * combat, leaving core's own start; a partial start makes core drop the effect.
 * @param {Actor} actor
 * @returns {object|undefined}
 */
export function ownTurnStartOf(actor) {
  const combat = startedCombatOf(actor);
  const combatant = combat?.getCombatantsByActor(actor)[0];
  if (!combatant) {
    return undefined;
  }
  return { ...foundry.documents.ActiveEffect.getEffectStart(combat), combatant: combatant.id };
}

/**
 * Tell the user an effect was not created because the actor is immune to its status (ConditionImmunity rules).
 * Handles the `l5r4-enhanced.immuneStatus` hook L5R4ActiveEffect fires from `_preCreateOperation`.
 * @param {Actor} actor
 * @param {ActiveEffect} effect - The effect that was dropped
 */
export function onImmuneStatus(actor, effect) {
  ui.notifications?.info(F("l5r4.ui.effects.immune", { name: actor.name, effect: effect.name }));
}

/**
 * Register the GM side of applyEffectAnywhere. The query carries a player's request for an actor the player does not
 * own: only statuses and the system's own effects can be applied this way, and only with a proof the GM's client
 * checks (module/services/effects/effect-proofs.js), which also sets the effect's level and timing (#162). It answers
 * whether the effect was made; the only effect dropped on creation is one the actor is immune to
 * (L5R4ActiveEffect._preCreateOperation).
 */
export function registerEffectQueries() {
  registerGmQuery(APPLY_EFFECT_QUERY, async ({ actorUuid, id, options }, { user }) => {
    const actor = await fromUuid(String(actorUuid));
    if (actor?.documentName !== "Actor" || !(CONFIG.statusEffects[id] || SYSTEM_EFFECTS[id])) {
      throw new Error("l5r4.ui.requests.cannotApplyEffect");
    }
    const proven = getProvenEffectOptions({ actor, id, proof: options?.proof, user });
    if (!proven) {
      throw new Error("l5r4.ui.requests.effectNotProven");
    }
    const effect = await applyEffect(actor, id, proven);
    return { applied: Boolean(effect) };
  });
}

/**
 * The status effect an actor already holds that applying `id` from `origin` would repeat: any effect with the status,
 * or for a status held once per origin (PER_ORIGIN_STATUSES), the one from the same origin. None for a system effect,
 * whose services replace their own.
 * @param {Actor} actor
 * @param {string} id - A status or system effect id
 * @param {string|undefined} origin - UUID of what causes the new effect
 * @returns {ActiveEffect|null}
 */
function heldStatusOf(actor, id, origin) {
  if (!CONFIG.statusEffects[id]) {
    return null;
  }
  const perOrigin = PER_ORIGIN_STATUSES.includes(id);
  return effectsOf(actor, id).find(e => !perOrigin || e.origin === (origin ?? null)) ?? null;
}

/**
 * Apply a status again to the effect that holds it: its duration starts again, as core starts a new effect's, and a
 * higher level replaces the lower with the new effect's name. A lower level leaves the level as it is. Fear 3 after
 * Fear 2 is -3k0, not -5k0: the book does not say whether Fear stacks, and Ernie's ruling (#177) is that the higher
 * replaces the lower.
 * game-rules/42_fear.md, p.90
 * @param {ActiveEffect} held - From heldStatusOf
 * @param {object} data - From buildEffectData
 * @returns {Promise<ActiveEffect>}
 */
async function updateHeldStatus(held, data) {
  const level = data.system.level;
  const higher = Number.isInteger(level) && level > (held.system.level ?? 0);
  await held.update({
    start: { ...foundry.documents.ActiveEffect.getEffectStart(), ...(data.start ?? {}) },
    duration: data.duration,
    ...(higher ? { name: data.name, "system.level": level } : {})
  });
  return held;
}

/**
 * Active Effect data for a status (CONFIG.statusEffects) or a system effect (SYSTEM_EFFECTS), before any option.
 * @param {Actor} actor - The actor the effect is for
 * @param {string} id - A status or system effect id
 * @returns {Promise<object>} The effect's data, with no `_id`
 */
async function buildBaseEffectData(actor, id) {
  if (CONFIG.statusEffects[id]) {
    const effect = await foundry.documents.ActiveEffect.implementation.fromStatusEffect(id, {
      parent: actor
    });
    const data = effect.toObject();
    delete data._id;
    return data;
  }
  const { name: key, ...rest } = foundry.utils.deepClone(SYSTEM_EFFECTS[id]);
  return { ...rest, name: T(key) };
}
