/**
 * Attack Bonuses Service
 *
 * Aggregates attack and damage roll bonuses from combat stances and mounted status.
 * Implements the Full Attack Stance (+2k1 attack) and integrates with mounted combat bonuses.
 *
 * This module extracts roll bonuses from Foundry ActiveEffects that store L5R4 mechanics
 * in effect flags, then combines them into unified bonus structures for the dice service.
 *
 * Game Mechanics:
 * - Full Attack Stance: +2k1 to attack rolls per core rules
 * - Mounted vs Unmounted: +1k0 attack bonus when mounted attacking unmounted targets
 * - Stance damage bonuses: Extracted from effect flags when present
 *
 * Foundry Integration:
 * - Uses ActiveEffect.getFlag(SYS_ID, flagName) to read stance bonuses
 * - Requires Foundry v13+ for effect.statuses Set API
 * - Uses optional chaining for defensive property access
 *
 * @module services/stance/rolls/attack-bonuses
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../../config/constants.js";
import { getMountedAttackBonus } from "../../mounted-combat.js";

/**
 * Roll bonus structure used throughout L5R4 dice system.
 * Represents XkY notation where X = dice rolled, Y = dice kept.
 *
 * @typedef {Object} RollBonus
 * @property {number} roll - Number of dice to add to the rolled pool (X in XkY)
 * @property {number} keep - Number of dice to add to the kept pool (Y in XkY)
 */

/**
 * Extracts roll bonuses from an actor's active effects by reading flag data.
 *
 * Iterates through actor's effects looking for flags matching the specified flagName.
 * Effects store bonuses as { roll: number, keep: number } in flags[SYS_ID][flagName].
 *
 * Special handling for Full Attack Stance: if an effect doesn't have the expected
 * flag structure but is identified as the fullAttackStance status, applies the
 * fallback bonus instead. This supports legacy effects or effects created without
 * full flag data while still applying the core +2k1 Full Attack mechanic.
 *
 * @param {Actor} actor - The L5R4 actor document to scan for effects
 * @param {string} flagName - The flag key to read from effect.flags[SYS_ID] (e.g., "attackBonus")
 * @param {RollBonus|null} fallback - Optional fallback bonus for fullAttackStance if flag missing
 * @returns {RollBonus} Aggregated bonuses from all matching effects
 * @private
 */
function extractBonusesFromEffects(actor, flagName, fallback = null) {
  let rollBonus = 0;
  let keepBonus = 0;

  if (!actor) return { roll: rollBonus, keep: keepBonus };

  for (const effect of actor.effects) {
    if (effect.disabled) continue;

    const bonus = effect.getFlag?.(SYS_ID, flagName);
    if (bonus && typeof bonus === "object") {
      rollBonus += bonus.roll || 0;
      keepBonus += bonus.keep || 0;
    } else if (fallback) {
      // Fallback: Check if this is Full Attack Stance without proper flag data
      // Supports both v13 effect.statuses Set and legacy core.statusId flag
      const isFullAttack =
        effect.statuses?.has?.("fullAttackStance") ||
        effect.getFlag?.("core", "statusId") === "fullAttackStance";
      if (isFullAttack) {
        rollBonus += fallback.roll || 0;
        keepBonus += fallback.keep || 0;
      }
    }
  }

  return { roll: rollBonus, keep: keepBonus };
}

/**
 * Retrieves attack roll bonuses from an actor's active stance effects.
 *
 * Extracts bonuses from effects with flags[SYS_ID].attackBonus, with special
 * fallback handling for Full Attack Stance. If an effect is identified as
 * Full Attack but lacks explicit attackBonus flag data, applies the core
 * +2k1 attack bonus per game rules.
 *
 * Game Mechanic: Full Attack Stance grants +2k1 to attack rolls but reduces
 * Armor TN by 10 (TN reduction handled elsewhere in stance system). When an
 * actor is in Full Attack Stance, returns { roll: 2, keep: 1 }.
 *
 * @param {Actor} actor - The L5R4 actor document to check for stance effects
 * @returns {RollBonus} Total attack bonuses from all stance effects
 */
export function getStanceAttackBonuses(actor) {
  // Fallback { roll: 2, keep: 1 } applies Full Attack +2k1 mechanic if flag missing
  return extractBonusesFromEffects(actor, "attackBonus", { roll: 2, keep: 1 });
}

/**
 * Aggregates all attack roll bonuses from stance and mounted combat.
 *
 * Combines bonuses from:
 * 1. Stance effects (e.g., Full Attack Stance +2k1)
 * 2. Mounted combat advantages (e.g., mounted vs unmounted +1k0)
 *
 * This is the primary function used by the dice service to calculate total
 * attack roll modifications before constructing the roll formula.
 *
 * @param {Actor} attacker - The attacking actor
 * @param {Actor|null} target - Optional target actor for mounted combat bonus calculation
 * @returns {RollBonus} Combined attack bonuses from all sources
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
 * Retrieves damage roll bonuses from an actor's active stance effects.
 *
 * Extracts bonuses from effects with flags[SYS_ID].damageBonus. Unlike attack
 * bonuses, damage bonuses do not have a fallback mechanism since no core stances
 * grant automatic damage bonuses (those require techniques or specific effects).
 *
 * @param {Actor} actor - The L5R4 actor document to check for stance effects
 * @returns {RollBonus} Total damage bonuses from all stance effects
 */
export function getStanceDamageBonuses(actor) {
  return extractBonusesFromEffects(actor, "damageBonus");
}

/**
 * Applies bonus dice to roll parameters for the dice service.
 *
 * Merges bonus.roll and bonus.keep into the rollParams object's diceRoll and
 * diceKeep properties, preserving all other rollParams fields. Also attaches
 * the original bonuses object for potential display in chat cards.
 *
 * @param {RollBonus} bonuses - The bonuses to apply to the roll
 * @param {Object} rollParams - Existing roll parameters from dice service
 * @param {number} [rollParams.diceRoll=0] - Base dice to roll
 * @param {number} [rollParams.diceKeep=0] - Base dice to keep
 * @returns {Object} Updated rollParams with bonuses applied
 * @private
 */
function applyBonusesToParams(bonuses, rollParams) {
  return {
    ...rollParams,
    diceRoll: (rollParams.diceRoll || 0) + bonuses.roll,
    diceKeep: (rollParams.diceKeep || 0) + bonuses.keep,
    stanceBonuses: bonuses
  };
}

/**
 * Convenience function to extract and apply stance attack bonuses to roll parameters.
 *
 * Retrieves stance attack bonuses for the actor and merges them into the provided
 * rollParams object. Used by dice service when constructing attack rolls.
 *
 * @param {Actor} actor - The actor making the attack roll
 * @param {Object} rollParams - Roll parameters to augment with attack bonuses
 * @returns {Object} Updated rollParams with stance attack bonuses applied
 */
export function applyStanceAttackBonuses(actor, rollParams) {
  return applyBonusesToParams(getStanceAttackBonuses(actor), rollParams);
}

/**
 * Convenience function to extract and apply stance damage bonuses to roll parameters.
 *
 * Retrieves stance damage bonuses for the actor and merges them into the provided
 * rollParams object. Used by dice service when constructing damage rolls.
 *
 * @param {Actor} actor - The actor making the damage roll
 * @param {Object} rollParams - Roll parameters to augment with damage bonuses
 * @returns {Object} Updated rollParams with stance damage bonuses applied
 */
export function applyStanceDamageBonuses(actor, rollParams) {
  return applyBonusesToParams(getStanceDamageBonuses(actor), rollParams);
}
