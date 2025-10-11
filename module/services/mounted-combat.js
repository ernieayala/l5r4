/**
 * @fileoverview L5R4 Mounted Combat Helper Functions
 * 
 * Provides utility functions for mounted combat mechanics per L5R4 rules.
 * Handles Horsemanship skill checks, stance restrictions, and attack bonuses.
 * 
 * **L5R4 Mounted Combat Rules (from game-rules/Dueling_Grappling_Conditions.md):**
 * - **Attack Bonus**: Mounted/higher ground characters gain +1k0 on attack rolls
 *   against unmounted/lower characters
 * - **Full Attack Restriction**: Mounted characters cannot adopt Full Attack stance
 *   unless the rider has Horsemanship 3 (Mastery Ability)
 * - Mount control requires Animal Handling rolls (left to GM discretion)
 * - Certain kata provide mounted bonuses (not implemented here)
 * 
 * **Responsibilities:**
 * - Check if actor is mounted/higher (via Active Effect status)
 * - Find Horsemanship skill rank
 * - Determine if Full Attack stance is available when mounted
 * - Calculate attack bonus when fighting from higher position
 * 
 * **Integration:**
 * Uses Foundry's built-in status effect system. The "mounted" status can be
 * toggled from the Token HUD alongside other status effects like dazed, prone, etc.
 * 
 * @author L5R4 System Team
 * @since 2.1.0
 * @see {@link https://l5r.fandom.com/wiki/Horsemanship|Horsemanship Skill}
 * @see {@link game-rules/Dueling_Grappling_Conditions.md|L5R4 Mounted/Higher Rules}
 */

import { toInt } from "../utils/type-coercion.js";

/**
 * Check if an actor has the "mounted" status effect active.
 * Checks both modern statuses Set (v11+) and legacy statusId flag.
 * 
 * @param {Actor} actor - The actor to check
 * @returns {boolean} True if actor has mounted status
 */
export function isMounted(actor) {
  if (!actor?.effects) return false;
  
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check modern statuses Set (v11+)
    if (effect.statuses?.has?.("mounted")) return true;
    
    // Check legacy statusId flag (pre-v11 compatibility)
    const legacyId = effect.getFlag?.("core", "statusId");
    if (legacyId === "mounted") return true;
  }
  
  return false;
}

/**
 * Get the Horsemanship skill rank for an actor.
 * Performs case-insensitive name matching to support localized skill names.
 * 
 * @param {Actor} actor - The actor to check
 * @returns {number} Horsemanship skill rank (0 if not found)
 */
export function getHorsemanshipRank(actor) {
  if (!actor?.items) return 0;
  
  for (const item of actor.items) {
    if (item.type === "skill") {
      const name = item.name?.toLowerCase() || "";
      // Match "horsemanship" in any language
      if (name.includes("horsemanship") || name.includes("équitation") || name.includes("reiten")) {
        return toInt(item.system?.rank ?? 0);
      }
    }
  }
  
  return 0;
}

/**
 * Check if Full Attack stance is available for a mounted character.
 * Per L5R4 rules, mounted characters need Horsemanship 3+ to use Full Attack.
 * 
 * @param {Actor} actor - The actor to check
 * @returns {boolean} True if Full Attack is available (not mounted OR has Horsemanship 3+)
 */
export function canUseFullAttackMounted(actor) {
  if (!isMounted(actor)) return true; // Not mounted = no restriction
  
  const horsemanshipRank = getHorsemanshipRank(actor);
  return horsemanshipRank >= 3; // Horsemanship 3 Mastery Ability
}

/**
 * Get mounted status information for an actor.
 * Provides complete mounted state for UI display and logic checks.
 * 
 * @param {Actor} actor - The actor to check
 * @returns {{isMounted: boolean, horsemanshipRank: number, canFullAttack: boolean}}
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
 * Calculate mounted/higher ground attack bonus against a target.
 * Per L5R4 rules, a character who is mounted or on higher ground gains +1k0
 * on attack rolls against unmounted/lower characters.
 * 
 * @param {Actor} attacker - The actor making the attack
 * @param {Actor} [target] - The target of the attack (optional)
 * @returns {{roll: number, keep: number}} Attack roll bonus from mounted/higher status
 * 
 * @example
 * const bonus = getMountedAttackBonus(samurai, opponent);
 * // If samurai is mounted and opponent is not: { roll: 1, keep: 0 }
 * // Otherwise: { roll: 0, keep: 0 }
 */
export function getMountedAttackBonus(attacker, target = null) {
  // No bonus if attacker is not mounted/higher
  if (!isMounted(attacker)) {
    return { roll: 0, keep: 0 };
  }
  
  // If no target specified, cannot determine bonus (assume no bonus)
  if (!target) {
    return { roll: 0, keep: 0 };
  }
  
  // If target is also mounted/higher, no advantage
  if (isMounted(target)) {
    return { roll: 0, keep: 0 };
  }
  
  // Attacker is mounted/higher, target is not → +1k0 bonus
  return { roll: 1, keep: 0 };
}
