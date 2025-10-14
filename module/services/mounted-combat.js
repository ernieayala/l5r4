/**
 * Mounted Combat Service
 * 
 * Handles mounted combat mechanics per L5R4 core rules.
 * Determines mounted status via Active Effects and Horsemanship skill rank.
 * Implements Rank 3 Horsemanship Mastery: Full Attack Stance while mounted.
 * 
 * Key mechanics:
 * - Mounted status tracked via "mounted" status effect
 * - Horsemanship Rank 3+ allows Full Attack Stance on horseback
 * - Mounted attackers receive +1k0 bonus vs unmounted targets
 * 
 * Foundry APIs: Active Effects (v10+ statuses and legacy statusId flags)
 * Game Rules: Bugei Skills - Horsemanship (Agility)
 * 
 * @module services/mounted-combat
 */

import { toInt } from "../utils/type-coercion.js";

/**
 * Determines if an actor is currently mounted.
 * 
 * Checks for "mounted" status effect using both modern (v10+) status effects
 * via effect.statuses Set and legacy core.statusId flags for backwards compatibility.
 * 
 * @param {Actor|null} actor - The actor to check for mounted status
 * @returns {boolean} True if actor has active "mounted" status effect
 */
export function isMounted(actor) {
  if (!actor?.effects) return false;

  for (const effect of actor.effects) {
    if (effect.disabled) continue;

    if (effect.statuses?.has?.("mounted")) return true;

    // Defensive: effect.getFlag may not exist on all effect types
    const legacyId = effect.getFlag?.("core", "statusId");
    if (legacyId === "mounted") return true;
  }

  return false;
}

/**
 * Retrieves an actor's Horsemanship skill rank.
 * 
 * Searches actor's skill items for Horsemanship using internationalized skill names:
 * - English: "horsemanship"
 * - French: "équitation"  
 * - German: "reiten"
 * 
 * This multi-language support matches the system's localization strategy without
 * requiring localized lookups, enabling skill detection regardless of compendium language.
 * 
 * @param {Actor|null} actor - The actor to check for Horsemanship skill
 * @returns {number} Horsemanship skill rank (0 if not found or actor invalid)
 */
export function getHorsemanshipRank(actor) {
  if (!actor?.items) return 0;

  for (const item of actor.items) {
    if (item.type === "skill") {
      const name = item.name?.toLowerCase() || "";

      if (name.includes("horsemanship") || name.includes("équitation") || name.includes("reiten")) {
        return toInt(item.system?.rank ?? 0);
      }
    }
  }

  return 0;
}

/**
 * Determines if an actor can use Full Attack Stance while mounted.
 * 
 * Implements Horsemanship Mastery Ability (Rank 3):
 * "The character may utilize the Full Attack Stance when on horseback."
 * 
 * Unmounted characters can always use Full Attack Stance.
 * Mounted characters require Horsemanship Rank 3 or higher.
 * 
 * @param {Actor|null} actor - The actor to check
 * @returns {boolean} True if actor can use Full Attack Stance (either unmounted or has Horsemanship 3+)
 */
export function canUseFullAttackMounted(actor) {

  if (!isMounted(actor)) return true;

  const horsemanshipRank = getHorsemanshipRank(actor);
  return horsemanshipRank >= 3;
}

/**
 * Retrieves complete mounted combat status for an actor.
 * 
 * Aggregates mounted status, Horsemanship rank, and Full Attack eligibility
 * into a single data structure for UI rendering and rules evaluation.
 * 
 * @param {Actor|null} actor - The actor to evaluate
 * @returns {{isMounted: boolean, horsemanshipRank: number, canFullAttack: boolean}} 
 *   Mounted combat status object containing:
 *   - isMounted: Whether actor has "mounted" status effect
 *   - horsemanshipRank: Current Horsemanship skill rank (0 if none)
 *   - canFullAttack: Whether Full Attack Stance is available
 */
export function getMountedStatus(actor) {
  const mounted = isMounted(actor);
  const horsemanshipRank = getHorsemanshipRank(actor);
  const canFullAttack = !mounted || horsemanshipRank >= 3;

  return {
    isMounted: mounted,
    horsemanshipRank,
    canFullAttack
  };
}

/**
 * Calculates attack roll bonus for mounted combat.
 * 
 * Mounted attacker vs unmounted target: +1k0 (roll one extra die, keep same)
 * All other scenarios: No bonus
 * 
 * Bonus structure uses L5R4 roll/keep notation:
 * - roll: Additional dice to roll (explode on 10)
 * - keep: Additional dice to keep in final total
 * 
 * Note: This implements a mounted combat advantage rule. The specific
 * +1k0 bonus vs unmounted targets represents tactical positioning superiority.
 * 
 * @param {Actor|null} attacker - The attacking actor
 * @param {Actor|null} target - The target being attacked (optional)
 * @returns {{roll: number, keep: number}} Dice bonus to add to attack roll
 */
export function getMountedAttackBonus(attacker, target = null) {

  if (!isMounted(attacker)) {
    return { roll: 0, keep: 0 };
  }

  if (!target) {
    return { roll: 0, keep: 0 };
  }

  if (isMounted(target)) {
    return { roll: 0, keep: 0 };
  }

  return { roll: 1, keep: 0 };
}
