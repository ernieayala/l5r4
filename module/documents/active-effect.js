/**
 * @module documents/active-effect
 * @description The system's ActiveEffect: status data, exclusive groups, and condition immunity, settled before an
 * effect is created on an actor.
 *
 * - An effect made with only a status id gets the status's rules, group, level, and ending event
 *   (module/utils/status-data.js).
 * - Gaining an effect with a `system.group` ends the actor's other effects of that group: one stance at a time,
 *   one Kata at a time. Creations started together settle on the newest.
 * - A status the actor is immune to (ConditionImmunity rules) is not created; the `l5r4-enhanced.immuneStatus` hook
 *   fires for it.
 *
 * game-rules/36_stances.md, p.84
 * game-rules/86_kata.md, p.259
 */

import { IMMUNE_STATUS_HOOK } from "../config/constants.js";
import { buildStatusEffectUpdate } from "../utils/status-data.js";

/**
 * The ActiveEffect document class the system sets as `CONFIG.ActiveEffect.documentClass`.
 */
export default class L5R4ActiveEffect extends foundry.documents.ActiveEffect {
  /**
   * An effect created with a status but none of its data (a macro, another module, `{statuses: ["prone"]}`) takes
   * the status's rules, group, level, and ending event, so a status means the same however its effect is made.
   * @override
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) {
      return false;
    }
    const update = buildStatusEffectUpdate(this._source);
    if (update) {
      this.updateSource(update);
    }
  }

  /**
   * Drop effects the actor is immune to, then end the actor's effects that share a group with a new one. Runs once
   * for the requesting client and is awaited before the creation, so two stances never apply together. Each dropped
   * effect fires the `l5r4-enhanced.immuneStatus` hook with the actor and the effect; documents show no UI
   * (CLAUDE.md Layers), so module/hooks/register-all.js wires the notice to it.
   * @override
   */
  static async _preCreateOperation(documents, operation, user) {
    const allowed = await super._preCreateOperation(documents, operation, user);
    if (allowed === false) {
      return false;
    }
    const actor = operation.parent;
    if (actor?.documentName !== "Actor") {
      return;
    }

    const immune = actor.conditionImmunities ?? new Set();
    for (let i = documents.length - 1; i >= 0; i--) {
      const blocked = [...documents[i].statuses].find(status => immune.has(status));
      if (blocked) {
        Hooks.callAll(IMMUNE_STATUS_HOOK, actor, documents[i]);
        documents.splice(i, 1);
      }
    }
    if (documents.length === 0) {
      return false;
    }

    const groups = new Set(documents.map(doc => doc.system.group).filter(Boolean));
    const ending = actor.effects
      .filter(effect => groups.has(effect.system.group))
      .map(effect => effect.id);
    if (ending.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", ending);
    }
  }

  /**
   * Group clean-ups waiting to run, by actor UUID, so this client runs them one after another.
   * @type {Map<string, Promise<void>>}
   */
  static #groupQueues = new Map();

  /**
   * Creations started together (a select firing a change per arrow key) each pass `_preCreateOperation` before
   * the others exist. After an effect in a group is created, the client that created it keeps the newest member of
   * the group and ends the rest; every client agrees which is newest, and this client's clean-ups run in turn.
   * @override
   */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    const actor = this.parent;
    const group = this.system.group;
    if (userId !== game.user.id || !group || actor?.documentName !== "Actor") {
      return;
    }
    const queues = L5R4ActiveEffect.#groupQueues;
    const previous = queues.get(actor.uuid) ?? Promise.resolve();
    const next = previous.then(() => L5R4ActiveEffect.#deleteOlderGroupEffects(actor, group));
    queues.set(actor.uuid, next);
    next.finally(() => {
      if (queues.get(actor.uuid) === next) {
        queues.delete(actor.uuid);
      }
    });
  }

  /**
   * End every effect of a group on the actor except the newest.
   * @param {Actor} actor
   * @param {string} group
   * @returns {Promise<void>}
   */
  static async #deleteOlderGroupEffects(actor, group) {
    const members = actor.effects.filter(effect => effect.system.group === group);
    const ageOf = effect => [effect._stats.createdTime ?? 0, effect.id];
    const newest = members.reduce((best, effect) => {
      const [time, id] = ageOf(effect);
      const [bestTime, bestId] = ageOf(best);
      return time > bestTime || (time === bestTime && id > bestId) ? effect : best;
    }, members[0]);
    const stale = members.filter(effect => effect !== newest).map(effect => effect.id);
    if (stale.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", stale);
    }
  }
}
