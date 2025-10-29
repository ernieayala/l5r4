/**
 * Raise Manager Service
 *
 * Calculates Free Raises from all sources (items, effects, advantages, techniques).
 * Free Raises are displayed in roll dialogs and chat output.
 *
 * L5R4 Game Mechanics:
 * - Free Raises: Available raise effects from equipment and abilities
 * - Don't count toward Void Ring maximum
 * - Sources: Advantages, school techniques, items, temporary effects
 * - Displayed in roll dialogs and chat messages
 *
 * Used by: Roll services to calculate total Free Raises
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
