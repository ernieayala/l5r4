/**
 * @module services/effects/apply
 * @description Create stances, conditions, and the system's own effects from one source of data
 * (module/config/status-effects.js), so the token HUD, the sheets, the Condition Manager, and every service make
 * the same effect. Applying an effect to an actor the user does not own goes to the active GM as a query.
 */

import { SYS_ID } from "../../config/constants.js";
import { SYSTEM_EFFECTS } from "../../config/status-effects.js";
import { F, T } from "../../utils/localization.js";
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
 * Create an effect on an actor the user owns.
 * @param {Actor} actor
 * @param {string} id
 * @param {EffectOptions} [options]
 * @returns {Promise<ActiveEffect|undefined>}
 */
export async function applyEffect(actor, id, { turnOf, ...options } = {}) {
  const start = turnOf ? ownTurnStartOf(await fromUuid(turnOf)) : options.start;
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
    await buildEffectData(actor, id, { ...options, start })
  ]);
  return effect;
}

/**
 * Create an effect on any actor: by the user when they own it, otherwise through the active GM.
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
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications?.warn(T("l5r4.ui.effects.noGM"));
    return;
  }
  await gm.query(APPLY_EFFECT_QUERY, { actorUuid: actor.uuid, id, options });
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
 * Register the GM side of applyEffectAnywhere. The query carries a player's request: the actor and effect id are
 * checked, and only statuses and the system's own effects can be applied this way.
 */
export function registerEffectQueries() {
  CONFIG.queries[APPLY_EFFECT_QUERY] = async ({ actorUuid, id, options }) => {
    const actor = await fromUuid(String(actorUuid));
    if (actor?.documentName !== "Actor" || !(CONFIG.statusEffects[id] || SYSTEM_EFFECTS[id])) {
      throw new Error(`Cannot apply "${id}" to ${actorUuid}`);
    }
    const level = Number.isInteger(options?.level) ? options.level : undefined;
    const turnOf = (await fromUuid(String(options?.turnOf ?? "")))?.documentName === "Actor";
    await applyEffect(actor, id, {
      level,
      origin: options?.origin,
      ...(turnOf ? { turnOf: options.turnOf } : {})
    });
  };
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
