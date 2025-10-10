/**
 * @fileoverview Bow Damage Formula Calculation
 * 
 * Calculates bow damage formulas based on bow strength, actor strength, and arrow type.
 * Implements L5R4 bow damage mechanics with arrow modifier integration.
 * 
 * **Responsibilities:**
 * - Calculate bow damage roll and keep values
 * - Apply arrow type modifiers from ARROW_MODS
 * - Generate damage formula strings (XkY notation)
 * 
 * **Architecture:**
 * Pure calculation functions that operate on item and actor data without side effects.
 * Called during item.prepareDerivedData() to compute weapon damage formulas.
 * 
 * **L5R4 Bow Damage Rules:**
 * - Damage Roll: min(Bow Strength, Actor Strength) + Arrow Roll Modifier
 * - Damage Keep: Arrow Keep Modifier
 * - Formula: (min(BowStr, ActorStr) + ArrowR)k(ArrowK)
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { ARROW_MODS } from "../../../config/game-data.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Bow damage calculation result.
 * @typedef {Object} BowDamageResult
 * @property {number} damageRoll - Total number of dice to roll (XkY notation X value)
 * @property {number} damageKeep - Number of dice to keep (XkY notation Y value)
 * @property {string} damageFormula - Complete damage formula string in XkY format
 */

/**
 * Calculate bow damage formula based on strength and arrow type.
 * 
 * Applies L5R4 bow damage rules with arrow modifiers. Uses the lower of
 * bow strength and actor strength, then applies arrow type bonuses.
 * 
 * **Arrow Types:**
 * - willow: Standard hunting arrows (default)
 * - armor: Armor-piercing with reduced damage
 * - flesh: High damage against unarmored targets
 * - humming: Signaling arrows with reduced damage
 * - rope: Utility arrows with reduced damage
 * 
 * @example
 * // Calculate damage for a strength 3 bow with willow arrows
 * const result = calculateBowDamage({ str: 3, arrow: "willow" }, actor);
 * // Returns: { damageRoll: 5, damageKeep: 2, damageFormula: "5k2" }
 * 
 * @param {object} sys - Item system data
 * @param {number} sys.str - Bow strength rating
 * @param {string} sys.arrow - Arrow type key (matches ARROW_MODS keys)
 * @param {object|null} actor - Actor document if item is embedded
 * @returns {BowDamageResult} Calculated damage formula components
 * @since 1.1.0
 */
export function calculateBowDamage(sys, actor = null) {
  // Get actor strength if item is embedded on an actor
  const actorStr = actor ? toInt(actor.system?.traits?.str) : toInt(sys.str);
  const bowStr = toInt(sys.str);

  // Apply arrow type modifiers (stored as system keys, not localized labels)
  const arrowKey = String(sys.arrow || "willow");
  const arrowMod = ARROW_MODS[arrowKey] ?? { r: 0, k: 0 };

  // Calculate damage: min(bow strength, actor strength) + arrow modifiers
  const damageRoll = Math.min(bowStr, actorStr) + arrowMod.r;
  const damageKeep = arrowMod.k;
  const damageFormula = `${damageRoll}k${damageKeep}`;

  return { damageRoll, damageKeep, damageFormula };
}
