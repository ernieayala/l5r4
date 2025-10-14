/**
 * Item Derived Data Preparation
 *
 * Computes roll formulas and derived statistics for L5R4 items during Foundry's
 * data preparation lifecycle. Called from Item.prepareDerivedData() hook.
 *
 * Handles:
 * - Skill roll formulas: Computes (Skill Rank)k0 for standalone skill items
 * - Bow damage formulas: Calculates bow Strength + arrow DR per L5R4 equipment rules
 *
 * Game Mechanics:
 * - Skill rolls use only rank until paired with traits during actual rolls
 * - Bow damage = min(bow Str, actor Str) + arrow modifiers (Willow Leaf 2k2, etc.)
 * - Arrow types modify damage (Willow Leaf 2k2, Armor Piercing 1k1, Flesh Cutter 2k3)
 *
 * Foundry Integration:
 * - Called during prepareDerivedData phase of Foundry v13 DataModel lifecycle
 * - Modifies item.system properties in-place
 * - Safe error handling prevents data preparation failures
 *
 * API: Item (Foundry v13), DataModel.prepareDerivedData
 */

import { SYS_ID } from "../../../config/constants.js";
import { calculateSkillFormula } from "./skill-formulas.js";
import { calculateBowDamage } from "./bow-damage.js";

/**
 * Safely applies a dice formula calculation to an item's system data.
 *
 * Wraps calculator functions in error handling to prevent data preparation failures.
 * On success, merges calculated properties into system data. On failure, applies
 * safe fallback values and logs a warning.
 *
 * @param {Object} sys - The item's system data object (item.system)
 * @param {Function} calculator - Function that computes dice formula properties
 * @param {Object} fallback - Safe default values if calculation fails
 * @param {string} errorMsg - Error message for console warning
 * @param {Item} item - The item being prepared (for error logging context)
 */
function applyDiceFormula(sys, calculator, fallback, errorMsg, item) {
  try {
    const result = calculator();
    Object.assign(sys, result);
  } catch (err) {
    Object.assign(sys, fallback);
    console.warn(`${SYS_ID}`, errorMsg, { err, item });
  }
}

/**
 * Prepares derived data for L5R4 items during Foundry's data preparation lifecycle.
 *
 * Called from Item.prepareDerivedData() hook. Computes roll formulas and statistics
 * that depend on item properties or actor state. Modifies item.system in-place.
 *
 * Item Type Handling:
 * - **Skills:** Computes roll formula as (Skill Rank)k0. When combined with traits
 *   during actual rolls, this becomes (Skill + Trait)k(Trait) per core rules.
 * - **Weapons (Bows):** Calculates damage as min(bow Str, actor Str) + arrow DR.
 *   Uses arrow modifiers from game data (e.g., Willow Leaf +2r/+2k).
 *
 * Game Rules:
 * - Skill rolls: Standalone skills show only their rank contribution until paired
 *   with traits at roll time per Skills and Rolls rules
 * - Bow damage: Follows Equipment rules where bow Strength is added to arrow DR,
 *   limited by actor's Strength (weaker archers can't fully draw strong bows)
 * - Arrow types modify damage: Willow Leaf 2k2, Armor Piercing 1k1, Flesh Cutter 2k3
 *
 * Foundry Integration:
 * - Runs during prepareDerivedData phase of Foundry v13 DataModel lifecycle
 * - Called after prepareBaseData but before sheets render
 * - Safe error handling with fallbacks prevents data preparation failures
 * - Results stored in item.system for sheet rendering and dice rolls
 *
 * @param {Item} item - The L5R4 item being prepared (requires item.system and item.type)
 */
export function prepareItemDerivedData(item) {
  const sys = item.system ?? {};
  const type = item.type;

  if (type === "skill") {
    // Ensure rank is non-negative integer for formula calculation
    const rank = Math.max(0, parseInt(sys.rank) || 0);
    applyDiceFormula(
      sys,
      () => calculateSkillFormula(sys),
      // Fallback: Safe {rank}k0 formula if calculation fails
      { rollDice: rank, rollKeep: 0, rollFormula: `${rank}k0` },
      "Failed to compute skill roll formula",
      item
    );
  }

  if (type === "weapon" && sys.isBow) {
    applyDiceFormula(
      sys,
      // Actor reference needed to get actor's Strength for bow damage limit
      () => calculateBowDamage(sys, item.actor),
      // Fallback: Default 0k0 prevents undefined values in damage rolls
      { damageRoll: 0, damageKeep: 0, damageFormula: "0k0" },
      "Failed to compute bow damage formula",
      item
    );
  }
}
