/**
 * Armor Penalty Utilities
 *
 * Provides utility functions to calculate TN penalties imposed by wearing armor
 * per L5R4 Equipment rules. Different armor types penalize different skill/trait
 * combinations when performing rolls.
 *
 * L5R4 Armor Penalty Rules:
 * - **Ashigaru Armor**: No penalties
 * - **Light Armor**: +5 TN to Athletics and Stealth skill rolls
 * - **Heavy Armor**: +5 TN to all skill rolls using Agility or Reflexes traits
 * - **Riding Armor**: Treated as Heavy Armor (+5 TN Agility/Reflexes) unless mounted
 *
 * Architecture Context:
 * - **Utils Layer**: Pure functions with no side effects
 * - **Documents Layer**: Tracks equipped armor in actor.items
 * - **Services Layer**: Applies penalties during roll TN calculation
 *
 * This module provides read-only calculation of armor penalties without
 * circular dependencies or direct actor manipulation.
 *
 * @module utils/armor-penalties
 * @requires module:utils/type-coercion~toInt
 */

/**
 * Armor type identifiers matching L5R4 Equipment rules.
 * @constant {Object.<string, string>}
 * @readonly
 */
export const ARMOR_TYPES = Object.freeze({
  ASHIGARU: "ashigaru",
  LIGHT: "light",
  HEAVY: "heavy",
  RIDING: "riding"
});

/**
 * Skills that receive TN penalties when wearing light armor.
 * Light armor increases TN for Athletics and Stealth by +5.
 * @constant {Set<string>}
 * @readonly
 */
const LIGHT_ARMOR_PENALIZED_SKILLS = Object.freeze(new Set(["athletics", "stealth"]));

/**
 * Calculates the TN penalty imposed by equipped armor for a specific skill/trait roll.
 *
 * Implements L5R4 armor penalty rules where different armor types penalize different
 * skill/trait combinations. Returns the TN penalty value (positive number that increases
 * effective TN, making the roll harder).
 *
 * Penalty Rules:
 * - **Ashigaru**: No penalty
 * - **Light**: +5 TN if skill is Athletics or Stealth
 * - **Heavy**: +5 TN if trait is Agility (agi) or Reflexes (ref)
 * - **Riding**: Same as Heavy (+5 TN for agi/ref) unless character has Mounted condition
 *
 * Multiple Armor Handling:
 * - Uses the highest penalty from all equipped armor pieces
 * - Does not stack penalties from multiple armor
 *
 * @param {Actor} actor - The actor performing the roll
 * @param {string|null} skillName - Lowercase skill identifier (e.g., "athletics", "stealth")
 * @param {string|null} traitName - Lowercase trait identifier (e.g., "agi", "ref", "str")
 * @returns {number} TN penalty value (0 or 5), positive values increase difficulty
 *
 * @example
 * // Light armor worn, Athletics roll
 * const penalty = getArmorTNPenalty(actor, "athletics", "str");
 * // Returns: 5 (+5 TN for Athletics with light armor)
 *
 * @example
 * // Heavy armor worn, Kenjutsu roll (uses Agility)
 * const penalty = getArmorTNPenalty(actor, "kenjutsu", "agi");
 * // Returns: 5 (+5 TN for Agility with heavy armor)
 *
 * @example
 * // Light armor worn, Investigation roll (uses Perception)
 * const penalty = getArmorTNPenalty(actor, "investigation", "per");
 * // Returns: 0 (light armor doesn't penalize Investigation)
 */
export function getArmorTNPenalty(actor, skillName = null, traitName = null) {
  if (!actor?.items) {
    return 0;
  }

  // Check if character is mounted (riding armor has no penalty when mounted)
  const isMounted = _isCharacterMounted(actor);

  // Normalize inputs to lowercase for case-insensitive comparison
  const skill = skillName ? String(skillName).toLowerCase() : null;
  const trait = traitName ? String(traitName).toLowerCase() : null;

  let maxPenalty = 0;

  for (const item of actor.items) {
    if (!item || item.type !== "armor") {
      continue;
    }

    const armorData = item.system ?? {};
    if (!armorData.equipped) {
      continue;
    }

    const armorType = String(armorData.armorType ?? "light").toLowerCase();
    const penalty = _calculateSingleArmorPenalty(armorType, skill, trait, isMounted);

    // Track the highest penalty (penalties don't stack)
    maxPenalty = Math.max(maxPenalty, penalty);
  }

  return maxPenalty;
}

/**
 * Calculates the TN penalty for a single piece of armor.
 *
 * Internal helper function that implements the per-armor-type penalty logic.
 * Exported for testing purposes but generally should not be called directly.
 *
 * @private
 * @param {string} armorType - Armor type identifier (ashigaru, light, heavy, riding)
 * @param {string|null} skillName - Lowercase skill identifier
 * @param {string|null} traitName - Lowercase trait identifier
 * @param {boolean} isMounted - Whether character has Mounted condition
 * @returns {number} TN penalty value (0 or 5)
 */
function _calculateSingleArmorPenalty(armorType, skillName, traitName, isMounted) {
  const PENALTY_VALUE = 5;

  switch (armorType) {
    case ARMOR_TYPES.ASHIGARU:
      // Ashigaru armor has no penalties
      return 0;

    case ARMOR_TYPES.LIGHT:
      // Light armor: +5 TN to Athletics and Stealth
      if (skillName && LIGHT_ARMOR_PENALIZED_SKILLS.has(skillName)) {
        return PENALTY_VALUE;
      }
      return 0;

    case ARMOR_TYPES.HEAVY:
      // Heavy armor: +5 TN to all rolls using Agility or Reflexes
      if (traitName === "agi" || traitName === "ref") {
        return PENALTY_VALUE;
      }
      return 0;

    case ARMOR_TYPES.RIDING:
      // Riding armor: Treated as heavy armor unless mounted
      if (isMounted) {
        return 0;
      }
      if (traitName === "agi" || traitName === "ref") {
        return PENALTY_VALUE;
      }
      return 0;

    default:
      // Unknown armor type: default to light armor behavior
      if (skillName && LIGHT_ARMOR_PENALIZED_SKILLS.has(skillName)) {
        return PENALTY_VALUE;
      }
      return 0;
  }
}

/**
 * Checks if a character has the Mounted status effect active.
 *
 * Internal helper to determine if riding armor penalties should be waived.
 * Checks both Active Effects and legacy status flags for compatibility.
 *
 * @private
 * @param {Actor} actor - The actor to check
 * @returns {boolean} True if character is mounted, false otherwise
 */
function _isCharacterMounted(actor) {
  if (!actor) {
    return false;
  }

  if (actor.effects) {
    for (const effect of actor.effects) {
      if (!effect || effect.disabled) {
        continue;
      }
      const statusId = effect.statuses?.values?.()?.next?.()?.value ?? effect.flags?.core?.statusId;
      if (statusId === "mounted") {
        return true;
      }
    }
  }

  // Check legacy status flags (for backward compatibility)
  if (actor.statuses?.has?.("mounted")) {
    return true;
  }

  return false;
}

/**
 * Gets a human-readable description of armor penalties for UI display.
 *
 * Returns a localized string describing which armor is imposing penalties
 * and what those penalties are. Returns null if no armor penalties apply.
 * Used for tooltips, roll dialog displays, and chat messages.
 *
 * @param {Actor} actor - The actor performing the roll
 * @param {string|null} skillName - Lowercase skill identifier
 * @param {string|null} traitName - Lowercase trait identifier
 * @returns {string|null} Localized description string or null if no penalty
 *
 * @example
 * const description = getArmorPenaltyDescription(actor, "athletics", "str");
 * // Returns: "Light Armor: +5 TN to Athletics"
 */
export function getArmorPenaltyDescription(actor, skillName = null, traitName = null) {
  const penalty = getArmorTNPenalty(actor, skillName, traitName);
  if (penalty === 0) {
    return null;
  }

  const isMounted = _isCharacterMounted(actor);
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
    const itemPenalty = _calculateSingleArmorPenalty(armorType, skill, trait, isMounted);

    if (itemPenalty > 0) {
      const armorName = item.name || "Armor";
      return `${armorName}: +${itemPenalty} TN`;
    }
  }

  return null;
}
