/**
 * Attack Bonuses Service
 *
 * Attack and damage bonuses that stance effects carry in their flags, for the roll pipeline to list
 * (module/services/dice/check/collect.js):
 * - Full Attack Stance: +2k1 to attack rolls (Core Rulebook p.84), from the effect's `attackBonus` flag or, for an
 *   effect without it, from its status
 * - Damage bonuses from an effect's `damageBonus` flag
 *
 * Stance rules move to rule data in roadmap Stage 9.
 *
 * @module services/stance/rolls/attack-bonuses
 */

import { SYS_ID } from "../../../config/constants.js";

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
 * Effects store bonuses as { roll: number, keep: number } in flags[SYS_ID][flagName]. A Full Attack Stance effect
 * without the flag gets the fallback bonus.
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

  if (!actor) {
    return { roll: rollBonus, keep: keepBonus };
  }

  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

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
 * Attack roll bonuses from the actor's stance effects: Full Attack Stance gives { roll: 2, keep: 1 }.
 *
 * @param {Actor} actor - The L5R4 actor document to check for stance effects
 * @returns {RollBonus} Total attack bonuses from all stance effects
 */
export function getStanceAttackBonuses(actor) {
  // Fallback { roll: 2, keep: 1 } applies Full Attack +2k1 mechanic if flag missing
  return extractBonusesFromEffects(actor, "attackBonus", { roll: 2, keep: 1 });
}

/**
 * Damage roll bonuses from effects' `damageBonus` flags. No stance in the book gives one.
 *
 * @param {Actor} actor - The L5R4 actor document to check for stance effects
 * @returns {RollBonus} Total damage bonuses from all stance effects
 */
export function getStanceDamageBonuses(actor) {
  return extractBonusesFromEffects(actor, "damageBonus");
}
