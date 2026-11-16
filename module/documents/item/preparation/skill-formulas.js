/**
 * @module documents/item/preparation/skill-formulas
 * @description A Skill item's share of a Skill Roll: its rank in rolled dice. The Trait the roll pairs it with adds
 * its own rank to the rolled dice and sets the kept dice when the roll is made, so Kenjutsu 4 with Agility 3 rolls
 * (4 + 3)k3 = 7k3.
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * A Skill's share of a roll: as many rolled dice as its rank (at least 0) and no kept dice, since the Trait sets
 * those. A rank that cannot be read gives 0k0 with a warning.
 * @param {object} sys - The skill item's system data from item.system
 * @param {number} sys.rank - The character's rank in this skill (0-10)
 * @returns {{rollDice: number, keepDice: number, rollFormula: string}} The rolled dice (the rank), the kept dice
 *   (always 0), and the "Xk0" formula for display
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
