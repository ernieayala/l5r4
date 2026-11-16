/**
 * @module documents/item/preparation/derived-data
 * @description What L5R4Item's `prepareDerivedData` does: a Skill's rank as its share of a roll ((rank)k0, the
 * Trait joins at roll time) and a weapon's damage formula with its owner's Strength. A calculation that throws
 * leaves safe fallback values and a warning, so preparation goes on.
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { calculateSkillFormula } from "./skill-formulas.js";
import { calculateBowDamage } from "./bow-damage.js";
import { calculateMeleeDamage } from "./melee-damage.js";

/**
 * Prepare an item's derived data: a Skill's `rollDice`, `rollKeep`, and `rollFormula` from its rank, then a
 * weapon's damage (prepareWeaponDamage). Changes `item.system` in place.
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

  prepareWeaponDamage(item);
}

/**
 * Computes a weapon's damage formula with its owner's Strength (bows: the lower of bow and owner Strength).
 *
 * Item preparation runs inside Actor#prepareEmbeddedDocuments, before the owner's "initial" Active Effect phase
 * [src: client/documents/actor.mjs:471-474], so the Strength read here leaves out effect bonuses. The owner's derived
 * preparation calls this again once effects apply (module/documents/actor/calculations/item-enrichment-system.js), so a
 * Strength raised by an Active Effect reaches weapon damage (issue #29).
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/74_weapons.md, p.199
 * @param {Item} item - A weapon Item; any other type is left unchanged
 */
export function prepareWeaponDamage(item) {
  const sys = item.system ?? {};
  const type = item.type;

  if (type === "weapon" && sys.isBow) {
    applyDiceFormula(
      sys,
      // Actor reference needed to get actor's Strength for bow damage limit
      () => calculateBowDamage(sys, item.actor),
      // Fallback: Default 0k0 prevents undefined values in damage rolls
      { derivedDamageRoll: 0, derivedDamageKeep: 0, derivedDamageFormula: "0k0" },
      "Failed to compute bow damage formula",
      item
    );
  }

  if (type === "weapon" && !sys.isBow) {
    applyDiceFormula(
      sys,
      // Actor reference needed to get actor's Strength for melee damage
      () => calculateMeleeDamage(sys, item.actor),
      // Fallback: Use base weapon DR without Strength if calculation fails
      {
        derivedDamageRoll: toInt(sys.damageRoll),
        derivedDamageKeep: toInt(sys.damageKeep),
        derivedDamageFormula: `${toInt(sys.damageRoll)}k${toInt(sys.damageKeep)}`
      },
      "Failed to compute melee damage formula",
      item
    );
  }
}

/**
 * Merge a dice formula calculation into an item's system data, or the fallback values with a warning when the
 * calculation throws, so one bad item never stops data preparation.
 * @param {object} sys - The item's system data object (item.system)
 * @param {Function} calculator - Function that computes dice formula properties
 * @param {object} fallback - Safe default values if calculation fails
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
