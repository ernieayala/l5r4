/**
 * @module services/effects/uses
 * @description Use counters per turn, round, skirmish, or day (Resource rules; module/utils/effects.js). The one
 * built in is the Void Point: normally one per Round. Spending past the limit warns and is never blocked (STAGE-09
 * decision 6); Resource rules with the slug "void" raise the limit.
 *
 * A counter lives in the actor's `flags.l5r4-enhanced.uses.<slug>` as `{key, count}`, the key naming its period,
 * so it resets when the period changes with nothing to clear.
 * game-rules/25_rings_and_traits.md, p.78
 */

import { SYS_ID } from "../../config/constants.js";
import { getPeriodKey, getUsesSpent } from "../../utils/effects.js";

/**
 * Void Points a character may normally spend per Round.
 * game-rules/25_rings_and_traits.md, p.78
 */
const VOID_PER_ROUND = 1;

/**
 * The started combat an actor is in, which need not be the viewed scene's active combat (#110).
 * @param {Actor} actor
 * @returns {Combat|null}
 */
export function startedCombatOf(actor) {
  return game.combats.find(c => c.started && c.getCombatantsByActor(actor).length > 0) ?? null;
}

/**
 * The key of the current period for an actor: its combat gives turn, round, and skirmish keys, a started one before
 * one not yet begun. A combat not yet begun is Round 1: Initiative is rolled in the first Round's Stage 1, before
 * the GM begins the combat in the tracker (#104).
 * game-rules/31_combat_round.md, p.81
 * @param {Actor} actor
 * @param {string} per
 * @returns {string|null}
 */
export function currentPeriodOf(actor, per) {
  const combat =
    startedCombatOf(actor) ??
    game.combats.find(c => c.getCombatantsByActor(actor).length > 0) ??
    null;
  const { secondsPerMinute, minutesPerHour, hoursPerDay } = game.time.calendar.days;
  return getPeriodKey(per, {
    combatId: combat?.id ?? null,
    round: combat ? Math.max(combat.round, 1) : 0,
    turn: combat?.turn ?? null,
    worldTime: game.time.worldTime,
    secondsPerDay: secondsPerMinute * minutesPerHour * hoursPerDay
  });
}

/**
 * Void Points the actor may spend this Round: one, plus Resource rules for "void".
 * @param {Actor} actor
 * @returns {number}
 */
export function voidLimitOf(actor) {
  return VOID_PER_ROUND + (actor.resources?.void?.max ?? 0);
}

/**
 * Void Points the actor has spent this Round, counted only in combat.
 * @param {Actor} actor
 * @returns {number}
 */
export function voidSpentOf(actor) {
  return getUsesSpent(actor.getFlag(SYS_ID, "uses")?.void, currentPeriodOf(actor, "round"));
}

/**
 * Whether spending more Void Points this Round passes the limit, for the warning.
 * @param {Actor} actor
 * @param {number} [count=1] - Void Points about to be spent
 * @returns {boolean}
 */
export function isVoidOverLimit(actor, count = 1) {
  return voidSpentOf(actor) + count > voidLimitOf(actor);
}

/**
 * The actor update that records Void Points spent, merged into the update that spends them, so both land in one
 * write. Outside combat nothing is counted.
 * @param {Actor} actor
 * @param {number} [count=1] - Void Points spent in this update
 * @returns {object}
 */
export function buildVoidUseUpdate(actor, count = 1) {
  const key = currentPeriodOf(actor, "round");
  if (key === null) {
    return {};
  }
  return { [`flags.${SYS_ID}.uses.void`]: { key, count: voidSpentOf(actor) + count } };
}

/**
 * Warn that a spend passed the Round's Void Point limit; the spend is never blocked. The client that writes the spend
 * checks the limit (isVoidOverLimit) before writing, and the warning shows on the spender's client.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {Actor} actor
 */
export function warnVoidLimit(actor) {
  ui.notifications?.warn(game.i18n.localize("l5r4.ui.effects.voidLimit", { name: actor.name }));
}
