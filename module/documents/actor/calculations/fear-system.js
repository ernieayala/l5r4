/**
 * @module fear-system
 * @description Prepares Fear-related derived data for L5R4 actors.
 *
 * Fear System Overview:
 * - Creatures can have a Fear rating (rank 1-10)
 * - Characters must make Fear checks when encountering fearsome creatures
 * - Fear TN = 5 + (5 × Fear Rank)
 * - Failed checks apply Feared condition with penalties
 *
 * Architecture:
 * - Calculates Fear TN from creature's Fear rank
 * - Sets active flag for UI display
 * - Defensive validation prevents invalid data
 *
 * Foundry Integration:
 * - Called during actor data preparation
 * - Modifies sys.fear object in place
 */

import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

/**
 * Prepares Fear-related derived data for an actor.
 *
 * @param {Object} sys - Actor's system data object to modify
 * @throws {TypeError} If sys is not a valid object
 *
 * @description
 * Calculates Fear system values:
 * - Normalizes Fear rank to integer (0-10 typical range)
 * - Sets active flag (true if rank > 0)
 * - Calculates Fear TN using formula: 5 + (5 × rank)
 *
 * Fear TN Examples:
 * - Rank 1: TN 10 (minor supernatural creature)
 * - Rank 3: TN 20 (terrifying monster)
 * - Rank 5: TN 30 (legendary horror)
 *
 * Modifies sys.fear with:
 * - rank: Normalized Fear rank (integer)
 * - active: Boolean flag for UI display
 * - tn: Target Number for Fear resistance checks
 *
 * @example
 * // Called during actor data preparation
 * prepareFear(actor.system);
 * // actor.system.fear = { rank: 3, active: true, tn: 20 }
 */
export function prepareFear(sys) {
  if (!sys || typeof sys !== "object" || Array.isArray(sys)) {
    throw new TypeError("prepareFear requires a valid system object");
  }

  // Initialize fear object if not present
  sys.fear = sys.fear || {};
  let rank = 0;

  // Safely parse Fear rank with fallback
  try {
    rank = toInt(sys.fear.rank ?? 0);
  } catch (err) {
    logError("Failed to prepare Fear derived data", err);
  }

  // Set normalized values
  sys.fear.rank = rank;
  sys.fear.active = rank > 0;

  // Calculate Fear TN: Base 5 + (5 per rank)
  // Examples: Rank 1=TN 10, Rank 3=TN 20, Rank 5=TN 30
  sys.fear.tn = rank > 0 ? 5 + 5 * rank : 0;
}
