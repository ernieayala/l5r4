/**
 * @fileoverview Skill Roll Formula Calculation
 * 
 * Calculates skill roll formulas (XkY notation) for L5R4 skill items.
 * Provides pure computation of roll dice, keep dice, and formula strings.
 * 
 * **Responsibilities:**
 * - Calculate skill roll formulas based on rank and trait
 * - Generate XkY notation for display
 * - Handle edge cases (missing traits, zero ranks)
 * 
 * **Architecture:**
 * Pure calculation functions that operate on item system data without side effects.
 * Called during item.prepareDerivedData() to compute display formulas.
 * 
 * @see {@link module/documents/item.js} for item preparation lifecycle
 * @see {@link module/services/dice/roll-skill.js} for actual roll execution with traits
 * 
 * **L5R4 Skill Roll Formula:**
 * - Roll Dice: Skill Rank + Trait Value
 * - Keep Dice: Trait Value
 * - Formula: (Skill + Trait)k(Trait)
 * 
 * NOTE: This calculation runs BEFORE actor.prepareDerivedData(), so Active Effects
 * aren't applied yet. Basic formulas are stored here and may be recalculated with
 * bonuses in sheet getData() methods for accurate display.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * @typedef {Object} SkillFormulaResult
 * @property {number} rollDice - Number of dice to roll (skill rank, minimum 0)
 * @property {number} keepDice - Number of dice to keep (always 0 at this stage)
 * @property {string} rollFormula - XkY notation string for display
 */

/**
 * Calculate skill roll formula for display.
 * 
 * Computes roll dice, keep dice, and XkY formula string based on skill rank.
 * Does NOT include trait values or Active Effects bonuses (those are applied
 * during actor preparation).
 * 
 * **Formula Structure:**
 * - rollDice = skill rank (minimum 0)
 * - keepDice = 0 (trait value added during actual roll)
 * - formula = "XkY" notation for display
 * 
 * **Error Handling:**
 * If calculation fails, returns safe defaults with rollDice=0, keepDice=0.
 * 
 * @param {Object} sys - Item system data
 * @param {number} sys.rank - Skill rank value
 * @returns {SkillFormulaResult} Formula data with rollDice, keepDice, rollFormula properties
 * 
 * @example
 * const formula = calculateSkillFormula({ rank: 3 });
 * // Returns: { rollDice: 3, keepDice: 0, rollFormula: "3k0" }
 */
export function calculateSkillFormula(sys) {
  try {
    const rank = toInt(sys.rank);
    
    // Store basic formula without trait bonuses - will be recalculated with
    // actor context in actor sheet getData() methods for accurate display
    const rollDice = Math.max(0, rank);
    const keepDice = 0;
    const rollFormula = `${rollDice}k${keepDice}`;
    
    return { rollDice, keepDice, rollFormula };
  } catch (err) {
    // Fallback to safe defaults on error - cannot safely access sys.rank
    const rollDice = 0;
    const keepDice = 0;
    const rollFormula = '0k0';
    
    return { rollDice, keepDice, rollFormula };
  }
}
