/**
 * @fileoverview Item Derived Data Preparation
 * 
 * Computes derived data for items based on type and context. Calculates base roll
 * formulas for skills and damage formulas for bows using actor traits when available.
 * 
 * **Responsibilities:**
 * - Coordinate type-specific derived calculations
 * - Store base skill roll values (trait values added during actual roll)
 * - Calculate bow damage formulas with arrow modifiers
 * - Delegate to specialized calculation modules
 * 
 * **Architecture:**
 * Preparation logic called during item.prepareDerivedData() lifecycle hook.
 * Delegates to specialized modules (skill-formulas, bow-damage) for type-specific logic.
 * 
 * **Preparation Lifecycle:**
 * This runs BEFORE actor.prepareDerivedData(), so Active Effects aren't applied yet.
 * Skill formulas store base rank values; trait bonuses are applied during actual rolls.
 * Sheet getData() methods may recalculate with full actor context for accurate display.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { calculateSkillFormula } from "./skill-formulas.js";
import { calculateBowDamage } from "./bow-damage.js";

/**
 * Prepare derived data for all item types.
 * 
 * Calculates computed values based on item type:
 * - Skills: Base roll values (rank only; trait added during actual roll)
 *   - Sets: rollDice, rollKeep, rollFormula
 * - Bows: Damage formulas with actor strength and arrow modifiers
 *   - Sets: damageRoll, damageKeep, damageFormula
 * 
 * Error handling: Falls back to safe defaults (0k0 formulas) if calculation fails.
 * Logs warnings to console for debugging.
 * 
 * @param {L5R4Item} item - The item document being prepared (extends Foundry Item class)
 * @returns {void} Mutates item.system in place with derived properties
 * @see {calculateSkillFormula} For skill roll formula calculation details
 * @see {calculateBowDamage} For bow damage formula calculation details
 */
export function prepareItemDerivedData(item) {
  const sys = item.system ?? {};
  const type = item.type;

  // Store base skill roll formula (skill rank only; trait added during actual roll)
  if (type === "skill") {
    try {
      const { rollDice, keepDice, rollFormula } = calculateSkillFormula(sys);
      sys.rollDice = rollDice;
      sys.rollKeep = keepDice;
      sys.rollFormula = rollFormula;
    } catch (err) {
      // Fallback to safe defaults on error
      sys.rollDice = Math.max(0, parseInt(sys.rank) || 0);
      sys.rollKeep = 0;
      sys.rollFormula = `${sys.rollDice}k${sys.rollKeep}`;
      console.warn(`${SYS_ID}`, "Failed to compute skill roll formula", { err, item });
    }
  }

  // Calculate bow damage formula based on strength and arrow type
  if (type === "weapon" && sys.isBow) {
    try {
      const { damageRoll, damageKeep, damageFormula } = calculateBowDamage(sys, item.actor);
      sys.damageRoll = damageRoll;
      sys.damageKeep = damageKeep;
      sys.damageFormula = damageFormula;
    } catch (err) {
      // Fallback to safe defaults on error
      sys.damageRoll = 0;
      sys.damageKeep = 0;
      sys.damageFormula = "0k0";
      console.warn(`${SYS_ID}`, "Failed to compute bow damage formula", { err, item });
    }
  }
}
