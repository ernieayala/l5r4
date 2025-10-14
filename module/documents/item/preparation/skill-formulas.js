/**
 * Skill Formula Calculator
 *
 * Calculates the dice contribution of a skill item for L5R4 roll formulas.
 * Skills in L5R4 add rolled dice to trait-based rolls following the pattern:
 * (Skill + Trait)k(Trait). This function computes the skill's contribution only.
 *
 * For example, a character with Kenjutsu 4 and Agility 3 rolls 7k3:
 * - Skill contributes: 4 rolled dice (from this function)
 * - Trait contributes: 3 rolled dice AND 3 kept dice (added during actual roll)
 * - Final formula: (4 + 3)k3 = 7k3
 *
 * API: Uses Foundry item.system structure for skill-type items
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Calculates the dice formula contribution for a skill item.
 *
 * In L5R4, skills contribute additional rolled dice to trait-based rolls.
 * The skill rank determines how many rolled dice are added, while the
 * associated trait determines kept dice. This function returns only the
 * skill's contribution (rolled dice), with keepDice always 0 since skills
 * alone cannot make complete rolls.
 *
 * Per L5R4 core rules: "When a Skill Roll is called for, it lists the Skill
 * first, then the Trait being used for the particular roll. A call for an
 * Athletics/Agility roll, for instance, would require a player to roll a
 * total number of dice equal to his character's ranks in the Athletics Skill
 * and Agility Trait, and to keep a number of dice equal to the character's
 * Agility Trait."
 *
 * @param {Object} sys - The skill item's system data from item.system
 * @param {number} sys.rank - The character's rank in this skill (0-10)
 * @returns {Object} Dice formula components for the skill
 * @returns {number} .rollDice - Number of dice the skill contributes to rolls (equals rank)
 * @returns {number} .keepDice - Always 0 (skills don't determine kept dice)
 * @returns {string} .rollFormula - String representation "Xk0" for display purposes
 *
 * @throws {Error} If sys.rank cannot be coerced to an integer
 */
export function calculateSkillFormula(sys) {
  try {
    const rank = toInt(sys.rank);
    const rollDice = Math.max(0, rank);
    const keepDice = 0; // Skills contribute rolled dice only; traits determine kept dice
    const rollFormula = `${rollDice}k${keepDice}`;

    return { rollDice, keepDice, rollFormula };
  } catch (err) {
    // Return safe defaults if rank parsing fails
    console.warn("L5R4", "Failed to parse skill rank, defaulting to 0k0", { sys, err });
    return { rollDice: 0, keepDice: 0, rollFormula: "0k0" };
  }
}
