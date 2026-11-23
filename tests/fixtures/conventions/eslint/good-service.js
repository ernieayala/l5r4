/**
 * @module services/example
 * @description A conforming service for the convention checks' ESLint fixtures.
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";

/** The flag the example reads. */
const FLAG = "example";

/**
 * Read the example flag of an actor as a number.
 * game-rules/33_wounds.md, p.82
 * @param {Actor} actor - The actor to read
 * @param {object} [options] - How to read it
 * @param {number} [options.fallback] - The value when the flag is unset
 * @returns {number} The flag's value
 */
export function getExampleFlag(actor, { fallback = 0 } = {}) {
  const value = actor.getFlag(SYS_ID, FLAG);
  if (value === undefined) {
    return fallback;
  }
  return toInt(value);
}

/**
 * The label of an actor's Ring Roll: one key, with the Ring's localized name as a placeholder's value.
 * @param {Actor} actor - The roller
 * @param {string} ringKey - The Ring's key
 * @returns {string} The localized label
 */
export function getRingRollLabel(actor, ringKey) {
  const element = T(`l5r4.ui.mechanics.rings.${ringKey}`);
  return F("l5r4.ui.mechanics.rolls.ringRollLabel", { name: actor.name, element });
}
