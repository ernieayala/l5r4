/**
 * @module services/effects/uses
 * @description Use counters per turn, round, skirmish, or day (Resource rules; module/utils/effects.js). The one
 * built in is the Void Point: normally one per Round (Core Rulebook p.78). Spending past the limit warns and is
 * never blocked (STAGE-09 decision 6); Resource rules with the slug "void" raise the limit.
 *
 * A counter lives in the actor's `flags.l5r4-enhanced.uses.<slug>` as `{key, count}`, the key naming its period,
 * so it resets when the period changes with nothing to clear.
 */

import { SYS_ID } from "../../config/constants.js";
import { periodKey, usesSpent } from "../../utils/effects.js";

/** Void Points a character may normally spend per Round (p.78). */
const VOID_PER_ROUND = 1;

/**
 * The key of the current period for an actor: its started combat gives turn, round, and skirmish keys.
 * @param {Actor} actor
 * @param {string} per
 * @returns {string|null}
 */
export function currentPeriod(actor, per) {
  const combat =
    game.combats.find(c => c.started && c.getCombatantsByActor(actor).length > 0) ?? null;
  const { secondsPerMinute, minutesPerHour, hoursPerDay } = game.time.calendar.days;
  return periodKey(per, {
    combatId: combat?.id ?? null,
    round: combat?.round ?? 0,
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
export function voidLimit(actor) {
  return VOID_PER_ROUND + (actor.resources?.void?.max ?? 0);
}

/**
 * Void Points the actor has spent this Round, counted only in combat.
 * @param {Actor} actor
 * @returns {number}
 */
export function voidSpent(actor) {
  return usesSpent(actor.getFlag(SYS_ID, "uses")?.void, currentPeriod(actor, "round"));
}

/**
 * Whether spending one more Void Point this Round passes the limit, for the warning.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function voidOverLimit(actor) {
  return voidSpent(actor) >= voidLimit(actor);
}

/**
 * The actor update that records one Void Point spent, merged into the update that spends it, so both land in
 * one write. Outside combat nothing is counted.
 * @param {Actor} actor
 * @returns {object}
 */
export function voidUseUpdate(actor) {
  const key = currentPeriod(actor, "round");
  if (key === null) {
    return {};
  }
  return { [`flags.${SYS_ID}.uses.void`]: { key, count: voidSpent(actor) + 1 } };
}

/**
 * Warn when a Void Point spent now passes the Round's limit (p.78); the spending goes ahead.
 * @param {Actor} actor
 */
export function warnVoidLimit(actor) {
  if (voidOverLimit(actor)) {
    ui.notifications?.warn(game.i18n.localize("l5r4.ui.effects.voidLimit", { name: actor.name }));
  }
}
