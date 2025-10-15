/**
 * Condition Penalty Utilities
 *
 * Provides utility functions to extract L5R4 condition penalties from actor system data
 * for application in roll services. Separates condition penalty data structure from
 * roll calculation logic per architecture guidelines.
 *
 * Architecture Context:
 * - **Utils Layer**: Pure functions with no side effects
 * - **Documents Layer**: Calculates condition penalties in prepareDerivedData
 * - **Services Layer**: Applies penalties during roll construction
 *
 * This module bridges Documents and Services by providing read-only access to
 * calculated condition penalties without circular dependencies.
 *
 * @module utils/condition-penalties
 * @requires module:utils/type-coercion~toInt
 */

import { toInt } from "./type-coercion.js";

/**
 * Extracts condition roll penalties for a specific roll type.
 *
 * Reads condition penalties from actor.system._conditionEffects and returns
 * the appropriate roll/keep penalty based on roll type (melee, ranged, defense).
 * Returns zero penalties if no conditions are active or condition data is missing.
 *
 * L5R4 Condition Penalties:
 * - **Blinded**: -3k3 ranged, -1k1 melee, -1k1 defense
 * - **Dazed**: -3k0 all roll types
 * - **Prone**: -2k0 melee and ranged
 *
 * Note: Penalties are negative values. The dice system handles negative dice
 * by reducing kept dice if rolled dice become less than kept dice.
 *
 * @param {Actor} actor - The actor performing the roll
 * @param {string} rollType - The type of roll: "attack", "defense", or null for general rolls
 * @param {string} attackType - For attack rolls: "melee" or "ranged"
 * @returns {{roll: number, keep: number}} Roll and keep dice penalties (negative values)
 *
 * @example
 * const penalties = getConditionRollPenalties(actor, "attack", "melee");
 * // Blinded character: { roll: -1, keep: -1 }
 * diceToRoll += penalties.roll;
 * diceToKeep += penalties.keep;
 */
export function getConditionRollPenalties(actor, rollType = null, attackType = "melee") {
  if (!actor?.system?._conditionEffects) {
    return { roll: 0, keep: 0 };
  }
  
  const conditionEffects = actor.system._conditionEffects;
  
  // For attack rolls, use melee or ranged penalties
  if (rollType === "attack") {
    const penalties = attackType === "ranged" 
      ? conditionEffects.rollPenalties?.ranged 
      : conditionEffects.rollPenalties?.melee;
    
    return {
      roll: toInt(penalties?.roll || 0),
      keep: toInt(penalties?.keep || 0)
    };
  }
  
  // For defense rolls, use defense penalties
  if (rollType === "defense") {
    const penalties = conditionEffects.rollPenalties?.defense;
    return {
      roll: toInt(penalties?.roll || 0),
      keep: toInt(penalties?.keep || 0)
    };
  }
  
  // For general skill rolls, apply the most severe penalty (typically from Dazed)
  // Dazed applies -3k0 to ALL actions
  const melee = conditionEffects.rollPenalties?.melee || { roll: 0, keep: 0 };
  const ranged = conditionEffects.rollPenalties?.ranged || { roll: 0, keep: 0 };
  const defense = conditionEffects.rollPenalties?.defense || { roll: 0, keep: 0 };
  
  // Take the most negative penalty from all categories
  const rollPenalty = Math.min(
    toInt(melee.roll),
    toInt(ranged.roll),
    toInt(defense.roll),
    0
  );
  
  const keepPenalty = Math.min(
    toInt(melee.keep),
    toInt(ranged.keep),
    toInt(defense.keep),
    0
  );
  
  return { roll: rollPenalty, keep: keepPenalty };
}

/**
 * Extracts condition TN penalty for skill/trait rolls.
 *
 * Reads the TN penalty from actor.system._conditionEffects. This penalty is applied
 * to the effective TN (increasing difficulty) rather than reducing dice rolled.
 *
 * L5R4 Condition TN Penalties:
 * - **Fatigued**: +5 TN to physical rolls, skills, and spellcasting (stacks per day)
 *
 * TN penalties make rolls harder by increasing the target number. Unlike roll
 * penalties (which reduce dice), TN penalties don't change the dice pool.
 *
 * @param {Actor} actor - The actor performing the roll
 * @returns {number} TN penalty value (positive value increases difficulty)
 *
 * @example
 * const tnPenalty = getConditionTNPenalty(actor);
 * // Fatigued character: 5 (or 10 if 2 days, 15 if 3 days, etc.)
 * const effectiveTN = baseTN + raiseTN + woundPenalty + tnPenalty;
 */
export function getConditionTNPenalty(actor) {
  if (!actor?.system?._conditionEffects) {
    return 0;
  }
  
  return toInt(actor.system._conditionEffects.tnPenalty || 0);
}

/**
 * Gets active condition restrictions for UI display.
 *
 * Returns array of localization keys describing action restrictions imposed
 * by active conditions. Used by character sheets and roll dialogs to inform
 * players what their character cannot do.
 *
 * L5R4 Condition Restrictions:
 * - **Entangled**: Cannot Move or take Complex Actions
 * - **Stunned**: Cannot take any actions
 * - **Dazed**: Only Defense/Full Defense stances, no Iaijutsu duels
 * - **Fatigued**: Cannot use Full Attack stance
 * - **Prone**: Cannot Move, only Attack/Defense stances
 *
 * @param {Actor} actor - The actor to check for restrictions
 * @returns {string[]} Array of localization keys for restriction messages
 *
 * @example
 * const restrictions = getConditionRestrictions(actor);
 * // Stunned character: ["l5r4.conditions.stunned.restrictions"]
 * restrictions.forEach(key => {
 *   ui.notifications.warn(game.i18n.localize(key));
 * });
 */
export function getConditionRestrictions(actor) {
  if (!actor?.system?._conditionEffects) {
    return [];
  }
  
  return actor.system._conditionEffects.restrictions || [];
}

/**
 * Checks if an actor has any active conditions with mechanical effects.
 *
 * Quick boolean check to determine if condition penalty calculations are needed.
 * Useful for early returns in roll functions to avoid unnecessary calculations.
 *
 * @param {Actor} actor - The actor to check
 * @returns {boolean} True if any conditions are active, false otherwise
 *
 * @example
 * if (!hasActiveConditions(actor)) {
 *   // Skip condition penalty calculations
 *   return normalRoll();
 * }
 */
export function hasActiveConditions(actor) {
  if (!actor?.system?._conditionEffects) {
    return false;
  }
  
  const active = actor.system._conditionEffects.active || [];
  return active.length > 0;
}
