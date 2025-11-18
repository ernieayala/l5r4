/**
 * @module condition-penalties
 * @description Calculates penalties from status conditions for L5R4 rolls.
 *
 * L5R4 uses a roll-and-keep dice system (e.g., "5k3" = roll 5 dice, keep 3 highest).
 * Conditions can penalize both rolled dice and kept dice.
 *
 * Conditions are stored in actor.system._conditionEffects with separate penalties for:
 * - Melee attacks
 * - Ranged attacks
 * - Defense rolls
 * - TN penalties (target number increases)
 *
 * Penalties are negative numbers that reduce roll/keep values.
 */

import { toInt } from "./type-coercion.js";

/**
 * Gets roll and keep penalties from active conditions.
 *
 * Returns specific penalties for the roll type, or the worst penalty across all types.
 * Penalties are negative numbers that reduce rolled/kept dice.
 *
 * @param {Object} actor - Foundry actor document
 * @param {string|null} [rollType=null] - Type of roll: "attack", "defense", or null for worst
 * @param {string} [attackType="melee"] - Attack type: "melee" or "ranged" (only used if rollType is "attack")
 * @returns {Object} Penalty object
 * @returns {number} return.roll - Penalty to rolled dice (negative or 0)
 * @returns {number} return.keep - Penalty to kept dice (negative or 0)
 *
 * @example
 * getConditionRollPenalties(actor, "attack", "melee") // { roll: -1, keep: 0 }
 * getConditionRollPenalties(actor, "defense") // { roll: -2, keep: -1 }
 * getConditionRollPenalties(actor) // Returns worst penalty across all types
 */
export function getConditionRollPenalties(actor, rollType = null, attackType = "melee") {
  if (!actor?.system?._conditionEffects) {
    return { roll: 0, keep: 0 };
  }

  const conditionEffects = actor.system._conditionEffects;

  // Return specific penalties for attack rolls
  if (rollType === "attack") {
    const penalties =
      attackType === "ranged"
        ? conditionEffects.rollPenalties?.ranged
        : conditionEffects.rollPenalties?.melee;

    return {
      roll: toInt(penalties?.roll ?? 0),
      keep: toInt(penalties?.keep ?? 0)
    };
  }

  // Return specific penalties for defense rolls
  if (rollType === "defense") {
    const penalties = conditionEffects.rollPenalties?.defense;
    return {
      roll: toInt(penalties?.roll ?? 0),
      keep: toInt(penalties?.keep ?? 0)
    };
  }

  // No specific roll type requested - return worst penalty across all types
  const melee = conditionEffects.rollPenalties?.melee ?? { roll: 0, keep: 0 };
  const ranged = conditionEffects.rollPenalties?.ranged ?? { roll: 0, keep: 0 };
  const defense = conditionEffects.rollPenalties?.defense ?? { roll: 0, keep: 0 };

  // Use Math.min to find most negative (worst) penalty, clamped to 0 or below
  const rollPenalty = Math.min(toInt(melee.roll), toInt(ranged.roll), toInt(defense.roll), 0);

  const keepPenalty = Math.min(toInt(melee.keep), toInt(ranged.keep), toInt(defense.keep), 0);

  return { roll: rollPenalty, keep: keepPenalty };
}

/**
 * Gets TN (Target Number) penalty from active conditions.
 *
 * TN penalties increase the difficulty of rolls against the actor.
 * Used for defense calculations and opposed rolls.
 *
 * @param {Object} actor - Foundry actor document
 * @returns {number} TN penalty (positive number increases difficulty)
 *
 * @example
 * getConditionTNPenalty(actor) // Returns 5 if conditions add +5 TN
 */
export function getConditionTNPenalty(actor) {
  if (!actor?.system?._conditionEffects) {
    return 0;
  }

  return toInt(actor.system._conditionEffects.tnPenalty ?? 0);
}

/**
 * Gets list of restrictions imposed by active conditions.
 *
 * Restrictions are strings describing what the character cannot do.
 * Examples: "Cannot move", "Cannot take Simple Actions", etc.
 *
 * @param {Object} actor - Foundry actor document
 * @returns {string[]} Array of restriction descriptions
 *
 * @example
 * getConditionRestrictions(actor) // ["Cannot move", "Cannot take Complex Actions"]
 */
export function getConditionRestrictions(actor) {
  if (!actor?.system?._conditionEffects) {
    return [];
  }

  return actor.system._conditionEffects.restrictions ?? [];
}

/**
 * Checks if actor has any active conditions.
 *
 * @param {Object} actor - Foundry actor document
 * @returns {boolean} True if actor has active conditions
 *
 * @example
 * hasActiveConditions(actor) // true if any conditions active
 */
export function hasActiveConditions(actor) {
  if (!actor?.system?._conditionEffects) {
    return false;
  }

  const active = actor.system._conditionEffects.active ?? [];
  return active.length > 0;
}
