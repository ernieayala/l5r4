/**
 * Fear System Calculations
 * 
 * Calculates Fear-related derived data for L5R4 actors. Fear represents the
 * psychological terror inflicted by supernatural creatures, horrifying enemies,
 * or traumatic situations. This module computes the Target Number required to
 * resist Fear effects based on the Fear Rank.
 * 
 * Game Mechanics:
 * - Fear has a Rank from 1 to 10 representing severity
 * - Resistance TN = 5 + (5 × Fear Rank)
 * - Characters roll Raw Willpower + Honor Rank to resist
 * - Failure inflicts -Xk0 penalty to all rolls (X = Fear Rank)
 * - Catastrophic failure (by 15+) causes fleeing or cowering
 * 
 * This module is called during Actor prepareDerivedData lifecycle.
 * 
 * API: None (pure calculation helpers)
 */
import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Prepares Fear-related derived data for an actor's system object.
 * 
 * Calculates the Target Number required to resist the Fear effect based on
 * the Fear Rank. The TN follows the core rule: 5 + (5 × Fear Rank). This
 * function also sets an `active` flag to indicate whether Fear is currently
 * affecting the actor.
 * 
 * Note: This calculates the TN that must be beaten, not the resistance roll
 * itself. The actual resistance roll is Raw Willpower + Honor Rank vs this TN.
 * 
 * @param {Object} sys - The actor's system data object
 * @param {Object} [sys.fear] - The fear data object
 * @param {number} [sys.fear.rank] - The Fear Rank (1-10), defaults to 0
 * @throws {TypeError} If sys is not a valid object
 * @returns {void} Modifies sys.fear in place with calculated values:
 *   - rank: The coerced Fear Rank (integer)
 *   - active: Boolean indicating if Fear is active (rank > 0)
 *   - tn: The Target Number to resist (5 + 5×rank, or 0 if inactive)
 */
export function prepareFear(sys) {
  if (!sys || typeof sys !== "object" || Array.isArray(sys)) {
    throw new TypeError("prepareFear requires a valid system object");
  }

  sys.fear = sys.fear || {};
  let rank = 0;

  // Safely coerce fear rank to integer with fallback to 0
  // Errors are logged but don't halt actor preparation
  try {
    rank = toInt(sys.fear.rank ?? 0);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to prepare Fear derived data", { err });
  }

  sys.fear.rank = rank;
  // Mark Fear as active if rank > 0 (any Fear effect present)
  sys.fear.active = rank > 0;
  // Calculate resistance TN per core rules: 5 + (5 × Fear Rank)
  // Characters roll Raw Willpower + Honor Rank against this TN
  sys.fear.tn = rank > 0 ? 5 + (5 * rank) : 0;
}
