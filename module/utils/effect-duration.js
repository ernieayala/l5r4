/**
 * @module utils/effect-duration
 * @description How long an effect lasts, in words for the effect panel (roadmap/STAGE-14): rounds or turns left, a
 * span of world time left, the event that ends it, or no set end; and the uses left of its Resource rules. Core works
 * out what is left [src: client/documents/active-effect.mjs:325-469]; this picks the phrase.
 */

import { EXPIRY_EVENTS } from "../config/expiry-events.js";

/**
 * @typedef {object} DurationPhrase
 * @property {string} key   Localization key
 * @property {object} data  Its data
 */

/**
 * The label key of an expiry event: the system's own (EXPIRY_EVENTS), else core's.
 * @param {string} event
 * @returns {string}
 */
export function getExpiryEventKey(event) {
  return EXPIRY_EVENTS[event] ?? `EFFECT.DURATION.EXPIRY_EVENTS.${event}`;
}

/**
 * The phrase for an effect's end. Three rounds with two left give the "rounds" phrase with a count of 2; no set
 * length with an "encounterEnd" expiry gives the "until" phrase naming that event.
 * @param {object} duration - The effect's prepared duration
 * @param {number|null} duration.value - How long it lasts, in `units`; null or not finite for no set length
 * @param {string} duration.units - rounds, turns, or a unit of world time
 * @param {number} [duration.remaining] - What core worked out is left, in `units`
 * @param {string} [duration.label] - Core's label for the time left, for world-time units
 * @param {string|null} [duration.expiry] - The event that ends it
 * @returns {DurationPhrase}
 */
export function getEffectEnd({ value, units, remaining, label, expiry }) {
  // Core prepares an effect with no set length as an infinite one, so only a finite length counts
  if (Number.isFinite(value)) {
    const count = Math.max(0, remaining ?? value);
    if (units === "rounds" || units === "turns") {
      return { key: `l5r4.apps.effectPanel.${units}`, data: { count } };
    }
    return { key: "l5r4.apps.effectPanel.time", data: { time: label ?? String(count) } };
  }
  if (expiry) {
    return { key: "l5r4.apps.effectPanel.until", data: { event: getExpiryEventKey(expiry) } };
  }
  return { key: "l5r4.apps.effectPanel.noEnd", data: {} };
}

/**
 * The phrase for a Resource rule's uses left this period: two per period with one spent gives
 * `{ key: "l5r4.apps.effectPanel.uses", data: { left: 1, max: 2 } }`.
 * @param {number} max - Uses per period
 * @param {number} spent - Uses spent this period
 * @returns {DurationPhrase}
 */
export function getUsesLeft(max, spent) {
  return { key: "l5r4.apps.effectPanel.uses", data: { left: Math.max(0, max - spent), max } };
}
