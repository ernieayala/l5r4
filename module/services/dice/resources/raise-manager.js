/**
 * Raise Manager Service
 *
 * Calculates Free Raises from all sources (items, effects, advantages, techniques).
 * Free Raises provide Raise benefits without increasing TN and don't count toward
 * the Void Ring limit.
 *
 * L5R4 Game Mechanics:
 * - Free Raises: Grant Raise benefits without +5 TN increase
 * - Don't count toward Void Ring maximum
 * - Can be used to reduce TN by 5 instead of adding benefits
 * - Sources: Advantages, school techniques, items, temporary effects
 * - Per rules: "Some mechanical effects grant a character Free Raises. These give
 *   the benefit of having made a Raise without actually increasing the TN of the
 *   roll in question, and do not count toward the maximum number of Raises that
 *   may be made per roll."
 *
 * Used by: Roll services to calculate total Free Raises before rolling
 *
 * @module services/dice/resources/raise-manager
 */

/**
 * Calculates total Free Raises available from actor's items and effects.
 *
 * Aggregates Free Raises from:
 * - Advantages with freeRaises property
 * - School techniques with freeRaises property
 * - Equipment with freeRaises property
 * - Active effects with freeRaises flag
 *
 * Future enhancement: Filter by skill/trait/context when items specify conditions
 *
 * @param {Actor} actor - The actor to calculate Free Raises for
 * @param {Object} [options={}] - Optional filters for context-specific Free Raises
 * @param {string} [options.skillName] - Skill being rolled (for skill-specific Free Raises)
 * @param {string} [options.rollType] - Type of roll (for type-specific Free Raises)
 * @returns {number} Total Free Raises available for this roll
 */
export function calculateFreeRaises(actor, _options = {}) {
  if (!actor?.items) {
    return 0;
  }

  let totalFreeRaises = 0;

  // Aggregate Free Raises from items with freeRaises property
  for (const item of actor.items) {
    const freeRaises = Number(item?.system?.freeRaises) || 0;
    if (freeRaises > 0) {
      // Future: Check if item's Free Raises apply to this specific roll context
      // For now, add all Free Raises unconditionally
      totalFreeRaises += freeRaises;
    }
  }

  // Future: Check active effects for temporary Free Raises
  // Effects would use flags.l5r4.freeRaises or similar

  return totalFreeRaises;
}
