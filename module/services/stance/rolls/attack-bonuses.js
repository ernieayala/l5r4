/**
 * @fileoverview L5R4 Stance Roll Bonuses - Roll Modifier Calculation
 * 
 * This module calculates and applies stance-based bonuses to attack and damage rolls.
 * Provides the single source of truth for stance roll bonuses, eliminating
 * code duplication across the system. Used by both the dice service roll hooks
 * and sheet roll handlers.
 * 
 * **Core Responsibilities:**
 * - **Bonus Extraction**: Read stance bonuses from actor Active Effects
 * - **Roll Modification**: Apply bonuses to roll parameter objects
 * - **Full Attack Detection**: Identify Full Attack Stance effects
 * - **Bonus Calculation**: Compute roll and keep dice modifications
 * 
 * **L5R4 Full Attack Stance:**
 * - Grants +2k1 to all attack rolls
 * - Grants +1k1 to all damage rolls
 * - Reduces Armor TN by 10
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link ../hooks/roll-integration.js|Roll Integration Hooks}
 * @see {@link ../../sheets/base-actor-sheet.js|Base Actor Sheet}
 */

import { SYS_ID } from "../../../config/constants.js";
import { getMountedAttackBonus } from "../../mounted-combat.js";

/* -------------------------------------------- */
/* Roll Hooks and Bonuses                      */
/* -------------------------------------------- */

/**
 * Get stance bonuses for attack rolls from an actor's active effects.
 * 
 * @param {Actor} actor - The actor making the attack roll
 * @returns {{roll: number, keep: number}} Attack roll bonuses from stances
 */
export function getStanceAttackBonuses(actor) {
  let rollBonus = 0;
  let keepBonus = 0;

  if (!actor) return { roll: rollBonus, keep: keepBonus };

  // Check for Full Attack Stance
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check if this is a Full Attack Stance effect
    const isFullAttack = effect.statuses?.has?.("fullAttackStance") || 
                        effect.getFlag?.("core", "statusId") === "fullAttackStance";
    
    if (isFullAttack) {
      const attackBonus = effect.getFlag?.(SYS_ID, "attackBonus");
      if (attackBonus && typeof attackBonus === "object") {
        rollBonus += attackBonus.roll || 0;
        keepBonus += attackBonus.keep || 0;
      } else {
        // Default Full Attack Stance bonus if flag not set
        rollBonus += 2;
        keepBonus += 1;
      }
    }
  }

  return { roll: rollBonus, keep: keepBonus };
}

/**
 * Get all attack bonuses for an attacker against a target.
 * Combines stance bonuses and mounted/higher ground bonuses.
 * 
 * @param {Actor} attacker - The actor making the attack roll
 * @param {Actor} [target] - The target of the attack (optional, for mounted bonus)
 * @returns {{roll: number, keep: number}} Combined attack roll bonuses
 */
export function getAllAttackBonuses(attacker, target = null) {
  const stanceBonuses = getStanceAttackBonuses(attacker);
  const mountedBonuses = getMountedAttackBonus(attacker, target);
  
  return {
    roll: stanceBonuses.roll + mountedBonuses.roll,
    keep: stanceBonuses.keep + mountedBonuses.keep
  };
}

/**
 * Get stance bonuses for damage rolls from an actor's active effects.
 * Checks for custom damage bonus flags from school techniques or other effects.
 * 
 * @param {Actor} actor - The actor making the damage roll
 * @returns {{roll: number, keep: number}} Damage roll bonuses from stances
 */
export function getStanceDamageBonuses(actor) {
  let rollBonus = 0;
  let keepBonus = 0;

  if (!actor) return { roll: rollBonus, keep: keepBonus };

  // Check for stance effects with custom damage bonuses (e.g., school techniques)
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check if this effect has a damage bonus flag
    const damageBonus = effect.getFlag?.(SYS_ID, "damageBonus");
    if (damageBonus && typeof damageBonus === "object") {
      rollBonus += damageBonus.roll || 0;
      keepBonus += damageBonus.keep || 0;
    }
  }

  return { roll: rollBonus, keep: keepBonus };
}

/**
 * Apply stance bonuses to attack roll parameters.
 * This function should be called before making attack rolls.
 * 
 * @param {Actor} actor - The actor making the attack
 * @param {object} rollParams - Roll parameters object
 * @param {number} rollParams.diceRoll - Base roll dice
 * @param {number} rollParams.diceKeep - Base keep dice
 * @returns {object} Modified roll parameters with stance bonuses applied
 */
export function applyStanceAttackBonuses(actor, rollParams) {
  const bonuses = getStanceAttackBonuses(actor);
  
  return {
    ...rollParams,
    diceRoll: (rollParams.diceRoll || 0) + bonuses.roll,
    diceKeep: (rollParams.diceKeep || 0) + bonuses.keep,
    stanceBonuses: bonuses
  };
}

/**
 * Apply stance bonuses to damage roll parameters.
 * This function should be called before making damage rolls.
 * 
 * @param {Actor} actor - The actor making the damage roll
 * @param {object} rollParams - Roll parameters object
 * @param {number} rollParams.diceRoll - Base roll dice
 * @param {number} rollParams.diceKeep - Base keep dice
 * @returns {object} Modified roll parameters with stance bonuses applied
 */
export function applyStanceDamageBonuses(actor, rollParams) {
  const bonuses = getStanceDamageBonuses(actor);
  
  return {
    ...rollParams,
    diceRoll: (rollParams.diceRoll || 0) + bonuses.roll,
    diceKeep: (rollParams.diceKeep || 0) + bonuses.keep,
    stanceBonuses: bonuses
  };
}
