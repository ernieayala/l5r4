/**
 * @module utils/example
 * @description A conforming utility for the convention checks' ESLint fixtures.
 */

import { TN_PER_RAISE } from "../config/game-mechanics.js";

/**
 * The TN a roll needs after its Raises.
 * game-rules/28_raises.md, p.79
 * @param {number} tn - The base TN
 * @param {number} raises - The declared Raises
 * @returns {number} The raised TN
 */
export function getRaisedTn(tn, raises) {
  return tn + raises * TN_PER_RAISE;
}
