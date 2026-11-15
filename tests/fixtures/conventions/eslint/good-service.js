/**
 * @module services/example
 * @description A conforming service for the convention checks' ESLint fixtures.
 */

import { SYS_ID } from "../config/constants.js";
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
