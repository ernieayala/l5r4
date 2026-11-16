/**
 * @module utils/armor-penalties
 * @description Calculates armor TN penalties for L5R4 combat and skill rolls.
 *
 * L5R4 armor types impose different penalties:
 * - Ashigaru: No penalties
 * - Light: Penalizes Athletics and Stealth skills
 * - Heavy: Penalizes Skill Rolls using Agility or Reflexes
 * - Riding: Penalizes every Agility and Reflexes roll, but none when mounted
 *
 * All penalties are +5 TN when applicable.
 * When wearing multiple armors, only the highest penalty applies.
 * game-rules/73_armor.md, p.198
 */

import { ARMOR_TN_PENALTY } from "../config/game-mechanics.js";

/**
 * Skills that receive TN penalties when wearing light armor.
 * @constant {Set<string>}
 */
const LIGHT_ARMOR_PENALIZED_SKILLS = Object.freeze(new Set(["athletics", "stealth"]));

/**
 * Armor type constants for L5R4 armor system.
 * @constant {object}
 * @property {string} ASHIGARU - Ashigaru armor (no penalties)
 * @property {string} LIGHT - Light armor (penalizes Athletics/Stealth)
 * @property {string} HEAVY - Heavy armor (penalizes Agility/Reflexes)
 * @property {string} RIDING - Riding armor (Heavy penalties unless mounted)
 */
export const ARMOR_TYPES = Object.freeze({
  ASHIGARU: "ashigaru",
  LIGHT: "light",
  HEAVY: "heavy",
  RIDING: "riding"
});

/**
 * Calculates total armor TN penalty for an actor.
 *
 * Checks all equipped armor and returns the highest applicable penalty.
 * Penalties depend on armor type, skill being used, trait being rolled,
 * and whether the character is mounted. Athletics in light armor gives 5, an Agility Skill Roll in heavy
 * armor gives 5, and an Agility roll in riding armor while mounted gives 0.
 * @param {object} actor - Foundry actor document
 * @param {string|null} [skillName=null] - Name of skill being rolled (e.g., "athletics")
 * @param {string|null} [traitName=null] - Name of trait being rolled (e.g., "agi", "ref")
 * @returns {number} TN penalty (0 or 5)
 */
export function getArmorTnPenalty(actor, skillName = null, traitName = null) {
  if (!actor?.items) {
    return 0;
  }

  const isMounted = isCharacterMounted(actor);
  const skill = skillName ? String(skillName).toLowerCase() : null;
  const trait = traitName ? String(traitName).toLowerCase() : null;

  // Track highest penalty from all equipped armor
  let maxPenalty = 0;

  for (const item of actor.items) {
    if (!item || item.type !== "armor") {
      continue;
    }

    const armorData = item.system ?? {};
    // Only equipped armor applies penalties
    if (!armorData.equipped) {
      continue;
    }

    const armorType = String(armorData.armorType ?? "light").toLowerCase();
    const penalty = getSingleArmorPenalty(armorType, skill, trait, isMounted);
    maxPenalty = Math.max(maxPenalty, penalty);
  }

  return maxPenalty;
}

/**
 * Gets human-readable description of armor penalty.
 *
 * Returns formatted string showing which armor is causing the penalty.
 * Returns null if no penalty applies: Athletics in light armor gives "Light Armor: +5 TN", and an actor
 * with no penalty gives null.
 * @param {object} actor - Foundry actor document
 * @param {string|null} [skillName=null] - Name of skill being rolled
 * @param {string|null} [traitName=null] - Name of trait being rolled
 * @returns {string|null} Description like "Heavy Armor: +5 TN" or null
 */
export function getArmorPenaltyDescription(actor, skillName = null, traitName = null) {
  const penalty = getArmorTnPenalty(actor, skillName, traitName);
  if (penalty === 0) {
    return null;
  }

  const isMounted = isCharacterMounted(actor);
  const skill = skillName ? String(skillName).toLowerCase() : null;
  const trait = traitName ? String(traitName).toLowerCase() : null;

  for (const item of actor.items) {
    if (!item || item.type !== "armor") {
      continue;
    }

    const armorData = item.system ?? {};
    if (!armorData.equipped) {
      continue;
    }

    const armorType = String(armorData.armorType ?? "light").toLowerCase();
    const itemPenalty = getSingleArmorPenalty(armorType, skill, trait, isMounted);

    // Return description for first armor that applies a penalty
    if (itemPenalty > 0) {
      const armorName = item.name ?? "Armor";
      return `${armorName}: +${itemPenalty} TN`;
    }
  }

  return null;
}

/**
 * Calculates TN penalty for a single piece of armor.
 * game-rules/73_armor.md, p.198
 * @param {string} armorType - Type of armor (from ARMOR_TYPES)
 * @param {string|null} skillName - Skill being rolled (lowercase)
 * @param {string|null} traitName - Trait being rolled (lowercase)
 * @param {boolean} isMounted - Whether character is mounted
 * @returns {number} TN penalty (0 or 5)
 */
function getSingleArmorPenalty(armorType, skillName, traitName, isMounted) {
  switch (armorType) {
    case ARMOR_TYPES.ASHIGARU:
      // Ashigaru armor has no penalties
      return 0;

    case ARMOR_TYPES.LIGHT:
      // Light armor penalizes Athletics and Stealth skills
      if (skillName && LIGHT_ARMOR_PENALIZED_SKILLS.has(skillName)) {
        return ARMOR_TN_PENALTY;
      }
      return 0;

    case ARMOR_TYPES.HEAVY:
      // Heavy armor penalizes Skill Rolls using Agility or Reflexes; a plain Trait roll is not one
      // game-rules/73_armor.md, p.198
      if (skillName && (traitName === "agi" || traitName === "ref")) {
        return ARMOR_TN_PENALTY;
      }
      return 0;

    case ARMOR_TYPES.RIDING:
      // Riding armor has no penalty when mounted
      if (isMounted) {
        return 0;
      }
      // On foot, every roll using Agility or Reflexes, Trait rolls included
      // game-rules/73_armor.md, p.198
      if (traitName === "agi" || traitName === "ref") {
        return ARMOR_TN_PENALTY;
      }
      return 0;

    default:
      // Unknown armor types default to light armor behavior
      if (skillName && LIGHT_ARMOR_PENALIZED_SKILLS.has(skillName)) {
        return ARMOR_TN_PENALTY;
      }
      return 0;
  }
}

/**
 * Checks if character has mounted status effect.
 *
 * Checks both Foundry v10+ statuses collection and legacy effect flags.
 * @param {object} actor - Foundry actor document
 * @returns {boolean} True if character is mounted
 */
function isCharacterMounted(actor) {
  if (!actor) {
    return false;
  }

  // Check active effects for mounted status (legacy method)
  if (actor.effects) {
    for (const effect of actor.effects) {
      if (!effect || effect.disabled) {
        continue;
      }
      // Check both v10+ statuses and legacy flags
      const statusId = effect.statuses?.values?.()?.next?.()?.value ?? effect.flags?.core?.statusId;
      if (statusId === "mounted") {
        return true;
      }
    }
  }

  // Check statuses collection (v10+ method)
  if (actor.statuses?.has?.("mounted")) {
    return true;
  }

  return false;
}
