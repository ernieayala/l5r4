/**
 * @module documents/item/preparation/bow-damage
 * @description A bow's damage formula: the arrow's rolled dice plus the bow's Strength, or the archer's Strength
 * when that is lower, keeping the arrow's kept dice. The arrow modifiers are ARROW_MODS in config/game-mechanics.js.
 * game-rules/74_weapons.md, p.199
 */

import { ARROW_MODS } from "../../../config/game-mechanics.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * @typedef {object} BowDamageResult
 * @property {number} derivedDamageRoll - Total rolled dice including bow/actor Strength (XkY formula X value)
 * @property {number} derivedDamageKeep - Total kept dice from arrow type (XkY formula Y value)
 * @property {string} derivedDamageFormula - Complete damage formula string (e.g., "5k2")
 */

/**
 * A bow's damage: (the lower of the bow's and the archer's Strength + the arrow's rolled dice)k(the arrow's kept
 * dice). The arrow defaults to the Willow Leaf; with no actor, the bow's own Strength stands for the archer's.
 * game-rules/74_weapons.md, p.199
 * @param {object} sys - Item system data for the bow weapon
 * @param {number} sys.str - Bow Strength rating (1-5 typical)
 * @param {string} [sys.arrow="willow"] - Arrow type key from ARROW_MODS
 * @param {L5R4Actor|null} [actor=null] - Optional actor wielding the bow (for character Strength)
 * @returns {BowDamageResult} Damage roll components for formula construction
 */
export function calculateBowDamage(sys, actor = null) {
  const actorStr = actor ? toInt(actor.system?.traits?.str) : toInt(sys.str);
  const bowStr = toInt(sys.str);

  const arrowKey = String(sys.arrow || "willow");
  const arrowMod = ARROW_MODS[arrowKey] ?? { r: 0, k: 0 };

  // Use lower of character Strength or bow Strength per rules
  // Store in separate 'derived' properties to preserve original field values
  const derivedDamageRoll = Math.min(bowStr, actorStr) + arrowMod.r;
  const derivedDamageKeep = arrowMod.k;
  const derivedDamageFormula = `${derivedDamageRoll}k${derivedDamageKeep}`;

  return { derivedDamageRoll, derivedDamageKeep, derivedDamageFormula };
}
