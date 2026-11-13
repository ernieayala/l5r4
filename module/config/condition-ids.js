/**
 * @module config/condition-ids
 * @description Condition IDs for L5R4 status effects.
 *
 * Defines the set of condition status effect IDs that can be applied to actors.
 * Excludes the stances (module/utils/stances.js).
 *
 * Conditions affect actor capabilities through penalties, restrictions, and
 * special rules as defined in the L5R4 core rulebook.
 *
 * @see module:config/status-effects for full status effect definitions
 * @see module:utils/stances for stance IDs
 */

const freeze = Object.freeze;

/**
 * Set of condition status effect IDs.
 *
 * These IDs correspond to status effects defined in STATUS_EFFECTS that represent
 * combat and environmental conditions. Stances are excluded as they use a separate
 * management system.
 *
 * Conditions included:
 * - blinded: Cannot see, severe attack penalties
 * - dazed: Reduced dice on all rolls
 * - entangled: Movement restricted
 * - fatigued: TN penalty on all rolls
 * - feared: Penalties based on Fear rank
 * - grappled: Immobilized, armor TN override
 * - guarded: Bonus to armor TN (being protected)
 * - guarding: Penalty to armor TN (protecting another)
 * - prone: Armor TN penalty, attack penalties
 * - stunned: Armor TN override, incapacitated
 *
 * @constant {Set<string>}
 * @see module:config/status-effects for each condition's rules
 */
export const CONDITION_IDS = freeze(
  new Set([
    "blinded",
    "dazed",
    "entangled",
    "fatigued",
    "feared",
    "grappled",
    "guarded",
    "guarding",
    "prone",
    "stunned"
  ])
);
