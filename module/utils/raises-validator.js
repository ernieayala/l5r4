/**
 * Raises Validation Utilities
 *
 * Validates Raises declarations against L5R4 game rules.
 * Core rule: Maximum Raises per roll = Void Ring value
 *
 * Game Mechanics:
 * - Regular Raises: Limited to Void Ring (each adds +5 TN)
 * - Free Raises: No limit, don't count toward Void Ring maximum
 * - Free Raises can reduce TN instead of adding benefits
 *
 * Used by: Dialog services to enforce Void Ring limit on Raises input
 *
 * @module utils/raises-validator
 */

/**
 * Calculates maximum Raises a character can declare based on Void Ring.
 *
 * Returns the character's Void Ring value, which determines the maximum
 * number of voluntary TN increases (+5 each) they can make on a single roll.
 *
 * @param {number} voidRing - Character's Void Ring value (1-10)
 * @returns {number} Maximum Raises allowed (equals Void Ring)
 */
export function getMaxRaises(voidRing) {
  const _voidRing = Number(voidRing) || 0;
  return Math.max(0, _voidRing);
}

/**
 * Clamps Raises value to valid range [0, maxRaises].
 *
 * Ensures user input doesn't exceed Void Ring limit. Used for defensive
 * validation when accepting Raises from dialog forms or external sources.
 *
 * @param {number} raises - Desired number of Raises
 * @param {number} maxRaises - Maximum allowed (from getMaxRaises)
 * @returns {number} Clamped Raises value within valid range
 */
export function clampRaises(raises, maxRaises) {
  const _raises = Number(raises) || 0;
  const _max = Number(maxRaises) || 0;

  return Math.max(0, Math.min(_raises, _max));
}
