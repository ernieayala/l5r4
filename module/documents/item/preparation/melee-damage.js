/**
 * Melee Weapon Damage Calculator
 *
 * Calculates melee weapon damage formulas for L5R4 weapons based on Combat rules
 * from Combat_and_Wounds.md. Implements the core melee damage mechanic: character
 * Strength adds to weapon's rolled dice.
 *
 * Core L5R4 Melee Rules (Combat_and_Wounds.md line 27):
 * - "For melee attacks, characters add their Strength to the first number of a weapon's DR."
 * - Example: Katana (3k2) + Strength 3 = 6k2 damage
 * - Final formula: weaponRoll + actorStrength, k = weaponKeep
 *
 * Foundry VTT Integration:
 * - Called during Item.prepareDerivedData for melee weapons
 * - Optional actor parameter enables character-specific damage calculation
 * - Returns structured data for roll formula construction
 *
 * @module documents/item/preparation/melee-damage
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * @typedef {Object} MeleeDamageResult
 * @property {number} derivedDamageRoll - Total rolled dice including Strength (XkY formula X value)
 * @property {number} derivedDamageKeep - Total kept dice (XkY formula Y value)
 * @property {string} derivedDamageFormula - Complete damage formula string (e.g., "6k2")
 */

/**
 * Calculate melee weapon damage formula based on L5R4 combat rules.
 *
 * Implements Combat rules: "For melee attacks, characters add their Strength
 * to the first number of a weapon's DR."
 *
 * Calculation Steps:
 * 1. Get weapon's base damage roll and keep values
 * 2. Add actor's Strength to rolled dice
 * 3. Keep value remains unchanged
 * 4. Return calculated (weapon DR + Strength)k(Keep) formula
 *
 * Example:
 * - Weapon: Katana 3k2
 * - Actor Strength: 3
 * - Result: 6k2 (3 + 3 = 6 rolled dice, 2 kept dice)
 *
 * @param {Object} sys - Item system data for the weapon
 * @param {number} sys.damageRoll - Weapon's base rolled dice (e.g., 3 for katana)
 * @param {number} sys.damageKeep - Weapon's kept dice (e.g., 2 for katana)
 * @param {L5R4Actor|null} [actor=null] - Optional actor wielding the weapon (for Strength)
 * @returns {MeleeDamageResult} Damage roll components for formula construction
 */
export function calculateMeleeDamage(sys, actor = null) {
  const weaponRoll = toInt(sys.damageRoll);
  const weaponKeep = toInt(sys.damageKeep);
  const actorStr = actor ? toInt(actor.system?.traits?.str) : 0;

  // Add actor Strength to rolled dice per Combat_and_Wounds.md
  // Store in separate 'derived' properties to preserve original field values
  const derivedDamageRoll = weaponRoll + actorStr;
  const derivedDamageKeep = weaponKeep;
  const derivedDamageFormula = `${derivedDamageRoll}k${derivedDamageKeep}`;

  return { derivedDamageRoll, derivedDamageKeep, derivedDamageFormula };
}
