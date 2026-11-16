/**
 * @module documents/item/preparation/melee-damage
 * @description A melee weapon's damage formula: the weapon's rolled dice plus the wielder's Strength, keeping the
 * weapon's kept dice (a Katana 3k2 with Strength 3 is 6k2). A thrown weapon that adds no Strength keeps its own
 * dice.
 * game-rules/32_attack_and_defense.md, p.82
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * @typedef {object} MeleeDamageResult
 * @property {number} derivedDamageRoll - Total rolled dice including Strength (XkY formula X value)
 * @property {number} derivedDamageKeep - Total kept dice (XkY formula Y value)
 * @property {string} derivedDamageFormula - Complete damage formula string (e.g., "6k2")
 */

/**
 * A melee weapon's damage: (the weapon's rolled dice + the wielder's Strength)k(the weapon's kept dice). Strength
 * adds only with an actor and when the weapon's `addsStrength` is set.
 * game-rules/32_attack_and_defense.md, p.82
 * @param {object} sys - Item system data for the weapon
 * @param {number} sys.damageRoll - Weapon's base rolled dice (e.g., 3 for katana)
 * @param {number} sys.damageKeep - Weapon's kept dice (e.g., 2 for katana)
 * @param {L5R4Actor|null} [actor=null] - Optional actor wielding the weapon (for Strength)
 * @returns {MeleeDamageResult} Damage roll components for formula construction
 */
export function getMeleeDamage(sys, actor = null) {
  const weaponRoll = toInt(sys.damageRoll);
  const weaponKeep = toInt(sys.damageKeep);
  // Thrown weapons such as shuriken and tsubute add no Strength
  // game-rules/74_weapons.md, p.200, 202
  const actorStr = actor && sys.addsStrength ? toInt(actor.system?.traits?.str) : 0;

  // Add actor Strength to rolled dice
  // Store in separate 'derived' properties to preserve original field values
  const derivedDamageRoll = weaponRoll + actorStr;
  const derivedDamageKeep = weaponKeep;
  const derivedDamageFormula = `${derivedDamageRoll}k${derivedDamageKeep}`;

  return { derivedDamageRoll, derivedDamageKeep, derivedDamageFormula };
}
