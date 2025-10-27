/**
 * Bow Damage Calculator
 *
 * Calculates archery damage formulas for L5R4 bow weapons based on Equipment rules.
 * Implements the core bow damage mechanic: bow Strength adds to
 * arrow rolled dice, but character uses their own Strength if lower than bow rating.
 *
 * Core L5R4 Archery Rules:
 * - Bow adds its Strength to arrow's rolled dice (e.g., Yumi STR 3 + Willow 2k2 = 5k2)
 * - If character Strength < bow Strength, use character Strength instead
 * - Arrow type determines both rolled and kept dice modifiers (see ARROW_MODS)
 * - Final formula: Math.min(bowStr, actorStr) + arrow.r, k = arrow.k
 *
 * Foundry VTT Integration:
 * - Called during Item.prepareDerivedData for bow weapons
 * - Optional actor parameter enables character-specific damage calculation
 * - Returns structured data for roll formula construction
 *
 * @module documents/item/preparation/bow-damage
 * @see ARROW_MODS in config/game-data.js for arrow type modifiers
 */

import { ARROW_MODS } from "../../../config/game-data.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * @typedef {Object} BowDamageResult
 * @property {number} derivedDamageRoll - Total rolled dice including bow/actor Strength (XkY formula X value)
 * @property {number} derivedDamageKeep - Total kept dice from arrow type (XkY formula Y value)
 * @property {string} derivedDamageFormula - Complete damage formula string (e.g., "5k2")
 */

/**
 * Calculate bow damage formula based on L5R4 archery rules.
 *
 * Implements the Equipment rules: "A bow adds its strength rating
 * to the first number of the DR of the arrow being fired. However, a character whose
 * Strength is less than that of the bow he is wielding uses his Strength instead."
 *
 * Calculation Steps:
 * 1. Determine effective Strength: min(character Strength, bow Strength)
 * 2. Look up arrow type modifiers from ARROW_MODS (default: willow)
 * 3. Calculate damage: (effective Strength + arrow.r)k(arrow.k)
 *
 * Arrow Type System:
 * - armor (1k1): Armor-Piercing arrows
 * - flesh (2k3): Flesh Cutter arrows (devastating, ½ range)
 * - humming (0k1): Humming Bulb signaling arrows (minimal damage)
 * - rope (1k1): Rope Cutter arrows (vs objects, ½ range)
 * - willow (2k2): Willow Leaf (Ya) standard arrows (DEFAULT)
 *
 * @param {Object} sys - Item system data for the bow weapon
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
