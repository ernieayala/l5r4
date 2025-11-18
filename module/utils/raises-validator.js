/**
 * @module raises-validator
 * @description Validates and limits Raises for L5R4 rolls.
 *
 * In L5R4, characters can declare "Raises" to increase roll difficulty
 * in exchange for enhanced effects. Each Raise adds +5 to the Target Number.
 *
 * The maximum number of Raises a character can declare equals their Void Ring.
 * This represents their spiritual focus and ability to push beyond normal limits.
 */

import { toInt } from "./type-coercion.js";

/**
 * Gets maximum Raises allowed based on Void Ring.
 *
 * In L5R4, a character can declare Raises up to their Void Ring rank.
 * Each Raise increases TN by +5 but provides enhanced effects if successful.
 *
 * @param {number} voidRing - Character's Void Ring rank
 * @returns {number} Maximum Raises allowed (minimum 0)
 *
 * @example
 * getMaxRaises(3) // 3 (can declare up to 3 Raises)
 * getMaxRaises(0) // 0 (cannot declare Raises)
 */
export function getMaxRaises(voidRing) {
  const _voidRing = toInt(voidRing, 0);
  // Ensure non-negative result
  return Math.max(0, _voidRing);
}

/**
 * Clamps Raises to valid range [0, maxRaises].
 *
 * Ensures declared Raises don't exceed maximum allowed (Void Ring)
 * and aren't negative.
 *
 * @param {number} raises - Number of Raises declared
 * @param {number} maxRaises - Maximum Raises allowed (from Void Ring)
 * @returns {number} Clamped Raises value
 *
 * @example
 * clampRaises(5, 3) // 3 (clamped to max)
 * clampRaises(2, 3) // 2 (within range)
 * clampRaises(-1, 3) // 0 (clamped to minimum)
 */
export function clampRaises(raises, maxRaises) {
  const _raises = toInt(raises, 0);
  const _max = toInt(maxRaises, 0);

  // Clamp to range [0, maxRaises]
  return Math.max(0, Math.min(_raises, _max));
}
