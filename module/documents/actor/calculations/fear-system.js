/**
 * @module documents/actor/calculations/fear-system
 * @description Prepares an actor's Fear data during actor data preparation: the normalized Fear Rank, whether Fear is
 * active, and the TN of the Fear check against it. Modifies `sys.fear` in place.
 */

import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import { fearTN } from "../../../utils/fear.js";

/**
 * Prepare an actor's Fear data: `sys.fear.rank` as an integer, `sys.fear.active` when the rank is above 0, and
 * `sys.fear.tn`, the TN to resist it (0 when the actor has no Fear).
 * @param {object} sys - Actor's system data object to modify
 * @throws {TypeError} If sys is not a valid object
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

  // Fear TN: 5 + 5 × Rank
  // game-rules/42_fear.md, p.90
  sys.fear.tn = rank > 0 ? fearTN(rank) : 0;
}
