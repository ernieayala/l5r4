/**
 * @module item-enrichment
 * @description Enriches actor-owned items with calculated roll formulas and derived values.
 *
 * Enrichment Process:
 * - Adds roll/keep formulas to items for quick access in UI
 * - Calculates values based on actor traits, skills, and bonuses
 * - Applies L5R4 game mechanics (affinity, deficiency, attack rules such as stances)
 * - Runs during actor data preparation
 *
 * Architecture:
 * - Modifies item objects in place (non-destructive)
 * - Each item type has specialized enrichment logic
 * - Formulas stored as strings (e.g., "7k4") for display
 *
 * Foundry Integration:
 * - Called during actor.prepareData()
 * - Accesses actor.items collection
 * - Modifies item.system properties for template rendering
 */

import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import {
  displayRollBonus,
  getEffectiveTrait,
  resolveWeaponSkillTrait
} from "../../../utils/mechanics.js";
import { selectorBonus } from "../../../utils/rule-engine.js";
import { prepareWeaponDamage } from "../../item/preparation/derived-data.js";

/**
 * Enriches all actor-owned items with calculated formulas and derived values.
 *
 * @param {Actor} actor - The actor whose items to enrich
 *
 * @description
 * Main entry point for item enrichment during actor data preparation.
 * Iterates through actor's items and applies type-specific enrichment:
 * - Skills: Roll/keep formulas with trait + rank + bonuses
 * - Spells: Casting formulas with ring + school rank, TN calculation
 * - Weapons/Bows: Attack and damage formulas with stance modifiers
 *
 * Enrichment adds calculated properties to items without modifying
 * the underlying item documents. Changes are ephemeral and recalculated
 * each time actor data is prepared.
 *
 * @example
 * // Called during actor data preparation
 * enrichActorItems(actor);
 * // actor.items now have .rollFormula, .attackFormula, etc.
 */
export function enrichActorItems(actor) {
  if (!actor?.items) {
    return;
  }

  try {
    for (const item of actor.items) {
      if (!item?.type) {
        continue;
      }

      switch (item.type) {
        case "skill":
          enrichSkillFormulas(actor, item);
          break;
        case "spell":
          enrichSpellFormulas(actor, item);
          break;
        case "weapon":
        case "bow":
          enrichWeaponFormulas(actor, item);
          break;
        default:
          break;
      }
    }
  } catch (err) {
    logError("Failed to enrich actor items", err, {
      actorId: actor?.id,
      actorName: actor?.name
    });
    // Items remain unenriched - formulas won't display but won't break functionality
  }
}

/**
 * Enriches skill items with roll formulas based on L5R4 skill mechanics.
 *
 * @param {Actor} actor - The actor who owns the skill
 * @param {Item} skill - The skill item to enrich
 *
 * @description
 * Calculates skill roll formula using L5R4 rules:
 * - Roll dice: Trait + Rank + bonuses (from advantages, techniques, etc.)
 * - Keep dice: Trait + keep bonuses
 * - Minimum 0 for both values
 *
 * Bonuses can come from:
 * - Skill-specific bonuses (e.g., "kenjutsu" bonus)
 * - Trait-specific bonuses (e.g., "agility" bonus)
 * - Both roll and keep bonuses are cumulative
 *
 * Modifies skill.system with:
 * - rollDice: Number of dice to roll
 * - rollKeep: Number of dice to keep
 * - rollFormula: String formula (e.g., "7k4")
 */
function enrichSkillFormulas(actor, skill) {
  const traitKey = String(skill.system?.trait ?? "").toLowerCase();
  const traitEff = getEffectiveTrait(actor, traitKey);
  const rank = toInt(skill.system?.rank);

  // Skill and Trait bonuses from Active Effects and rules, as the roll pipeline starts from
  const { roll: rollBonus, keep: keepBonus } = displayRollBonus(actor, {
    skill: String(skill.name).toLowerCase(),
    trait: traitKey
  });

  // Calculate final roll/keep values (minimum 0)
  skill.system.rollDice = Math.max(0, traitEff + rank + rollBonus);
  skill.system.rollKeep = Math.max(0, traitEff + keepBonus);
  skill.system.rollFormula = `${skill.system.rollDice}k${skill.system.rollKeep}`;
}

/**
 * Enriches spell items with casting formulas based on L5R4 magic rules.
 *
 * @param {Actor} actor - The actor who owns the spell
 * @param {Item} spell - The spell item to enrich
 *
 * @description
 * Calculates spell casting formula using L5R4 shugenja rules:
 * - Roll dice: Ring + School Rank (modified by affinity/deficiency)
 * - Keep dice: Ring value only
 * - Cast TN: 5 + (Mastery Level × 5)
 *
 * Affinity/Deficiency System:
 * - Affinity: +1 School Rank when casting spells of that element
 * - Deficiency: -1 School Rank when casting spells of that element
 * - Determined by shugenja school technique
 *
 * Modifies spell.system with:
 * - castRoll: Number of dice to roll for casting
 * - castKeep: Number of dice to keep (always Ring value)
 * - castFormula: String formula (e.g., "6k3")
 * - castTN: Target Number to successfully cast
 *
 * @example
 * // Fire shugenja (Affinity: Fire, Deficiency: Water) casting Fire spell
 * // Ring 3, School Rank 2, Mastery 3
 * // Roll: 3 + (2+1) = 6, Keep: 3, TN: 5 + 3*5 = 20
 * // Formula: "6k3", TN: 20
 */
function enrichSpellFormulas(actor, spell) {
  // Find shugenja school for affinity/deficiency
  const school = actor.items.find(i => i.type === "technique" && i.system?.shugenja);
  const schoolAffinity = school ? String(school.system?.affinity ?? "").toLowerCase() : "";
  const schoolDeficiency = school ? String(school.system?.deficiency ?? "").toLowerCase() : "";

  // Get spell's element and actor's ring value
  const ringKey = String(spell.system?.ring ?? "earth").toLowerCase();
  const ringValue = toInt(actor.system?.rings?.[ringKey]) || 2;
  const baseSchoolRank = toInt(actor.system?.insight?.rank) || 1;
  const masteryLevel = toInt(spell.system?.mastery) || 1;

  // Apply affinity/deficiency modifier to school rank
  // Shugenja schools have elemental affinity (bonus) and deficiency (penalty)
  // Example: Isawa (Phoenix) has Fire affinity, Water deficiency
  let schoolRankMod = 0;
  if (schoolAffinity === ringKey) {
    schoolRankMod = 1; // Affinity: +1 effective school rank (easier to cast)
  } else if (schoolDeficiency === ringKey) {
    schoolRankMod = -1; // Deficiency: -1 effective school rank (harder to cast)
  }
  const effectiveSchoolRank = baseSchoolRank + schoolRankMod;

  // Calculate casting formula: Ring + School Rank to roll, Ring to keep
  spell.system.castRoll = Math.max(0, ringValue + effectiveSchoolRank);
  spell.system.castKeep = Math.max(0, ringValue);
  spell.system.castFormula = `${spell.system.castRoll}k${spell.system.castKeep}`;

  // Calculate casting TN: Base 5 + (Mastery × 5)
  // Mastery 1 = TN 10, Mastery 3 = TN 20, Mastery 5 = TN 30
  spell.system.castTN = 5 + masteryLevel * 5;
}

/**
 * Enriches weapon/bow items with attack and damage formulas.
 *
 * @param {Actor} actor - The actor who owns the weapon
 * @param {Item} weapon - The weapon or bow item to enrich
 *
 * @description
 * Calculates weapon formulas using L5R4 combat rules:
 * - Attack formula: weapon skill + trait (from resolveWeaponSkillTrait), plus the RollModifier rules on every
 *   attack, such as the Full Attack Stance's +2k1 (p.84). Optional and range-limited rules wait for the roll dialog.
 * - Damage formula: From weapon's damage rating
 *
 * @example
 * // Weapon skill 5k3, Full Attack Stance
 * // attackFormula: "7k4"
 */
function enrichWeaponFormulas(actor, weapon) {
  const weaponSkill = resolveWeaponSkillTrait(actor, weapon);
  const attack = selectorBonus(actor.ruleBag, ["any", "attack"], actor.rollOptions, weapon.id);
  weapon.attackFormula = `${weaponSkill.rollBonus + attack.roll}k${weaponSkill.keepBonus + attack.keep}`;

  // Recompute damage now that the owner's Active Effects apply: item preparation ran before them (issue #29)
  prepareWeaponDamage(weapon);

  // Get damage values (prefer derived values if available)
  const damageRoll = toInt(weapon.system?.derivedDamageRoll ?? weapon.system?.damageRoll) || 0;
  const damageKeep = toInt(weapon.system?.derivedDamageKeep ?? weapon.system?.damageKeep) || 0;
  weapon.damageFormula = `${damageRoll}k${damageKeep}`;
}
