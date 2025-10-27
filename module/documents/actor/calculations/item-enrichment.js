/**
 * Item Enrichment Module
 *
 * Calculates and enriches actor items with roll formulas during prepareDerivedData.
 * All calculations follow L5R4 game rules and are stored on item.system for sheet display.
 *
 * This module runs in the Documents layer (Actor.prepareDerivedData), ensuring all
 * formula calculations happen in the correct architectural layer
 *
 * @module documents/actor/calculations/item-enrichment
 */

import { toInt } from "../../../utils/type-coercion.js";
import { getEffectiveTrait, resolveWeaponSkillTrait } from "../../../utils/mechanics.js";

/**
 * Enrich all actor items with calculated roll formulas.
 *
 * Iterates through actor's embedded items and calculates roll formulas based on
 * item type. Formulas are stored on item.system for direct access by sheets.
 *
 * **Item Types Enriched:**
 * - Skills: rollDice, rollKeep, rollFormula
 * - Spells: castRoll, castKeep, castFormula, castTN
 * - Weapons: attackFormula, attackFormulaWithStance, damageFormula, damageFormulaWithStance
 * - Bows: Same as weapons
 *
 * **Architecture Note:**
 * This function is called from Actor.prepareDerivedData() (Documents layer).
 * Sheets MUST NOT recalculate these formulas - they only read and display them.
 *
 * @param {L5R4Actor} actor - The actor whose items to enrich
 * @returns {void} Mutates actor.items in place
 */
export function enrichActorItems(actor) {
  if (!actor?.items) {
    return;
  }

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
        // Other item types don't need formula enrichment
        break;
    }
  }
}

/**
 * Enrich skill with roll formulas.
 *
 * Calculates L5R4 skill check formulas: (Skill Rank + Trait Value)k(Trait Value)
 *
 * **Calculation Process:**
 * 1. Get effective trait value (includes wound penalties via getEffectiveTrait())
 * 2. Get skill rank from skill.system.rank
 * 3. Apply bonuses from actor.system.bonuses.skill and bonuses.trait
 * 4. Calculate rollDice = trait + rank + roll bonuses
 * 5. Calculate rollKeep = trait + keep bonuses
 * 6. Prevent negative values with Math.max(0, ...)
 *
 * **Bonuses Structure:**
 * - `actor.system.bonuses.skill[skillName.toLowerCase()].roll` - Extra rolled dice
 * - `actor.system.bonuses.skill[skillName.toLowerCase()].keep` - Extra kept dice
 * - `actor.system.bonuses.trait[traitKey].roll` - Extra rolled dice from trait bonuses
 * - `actor.system.bonuses.trait[traitKey].keep` - Extra kept dice from trait bonuses
 *
 * @param {L5R4Actor} actor - The actor owning the skill
 * @param {Item} skill - The skill item to enrich
 * @returns {void} Mutates skill.system in place
 * @private
 */
function enrichSkillFormulas(actor, skill) {
  const traitKey = String(skill.system?.trait ?? "").toLowerCase();
  const traitEff = getEffectiveTrait(actor, traitKey); // Includes wound penalties
  const rank = toInt(skill.system?.rank);

  // Extract bonuses from actor.system.bonuses (can come from advantages, techniques, etc.)
  const bb = actor.system?.bonuses;
  const kSkill = String(skill.name).toLowerCase?.();
  const bSkill = (bb?.skill && bb.skill[kSkill]) || {};
  const bTrait = (bb?.trait && bb.trait[traitKey]) || {};
  const rollBonus = toInt(bSkill.roll) + toInt(bTrait.roll); // Extra rolled dice
  const keepBonus = toInt(bSkill.keep) + toInt(bTrait.keep); // Extra kept dice

  // L5R4 Skill Roll: (Skill + Trait)k(Trait), with bonuses applied
  skill.system.rollDice = Math.max(0, traitEff + rank + rollBonus);
  skill.system.rollKeep = Math.max(0, traitEff + keepBonus);
  skill.system.rollFormula = `${skill.system.rollDice}k${skill.system.rollKeep}`;
}

/**
 * Enrich spell with casting formulas.
 *
 * Calculates L5R4 spell casting formulas: (Ring + School Rank ± Affinity/Deficiency)k(Ring)
 * **TN**: 5 + (Mastery Level × 5)
 *
 * **Calculation Process:**
 * 1. Get Ring value from actor.system.rings[spell.system.ring]
 * 2. Get School Rank from actor.system.insight.rank
 * 3. Detect affinity/deficiency from actor's shugenja school
 * 4. Apply school rank modifier: +1 for affinity, -1 for deficiency
 * 5. Calculate rollDice = Ring + (School Rank ± modifier)
 * 6. Calculate rollKeep = Ring
 * 7. Calculate TN = 5 + (Mastery Level × 5)
 *
 * **Affinity/Deficiency Detection:**
 * - Searches for shugenja school technique in actor's items
 * - Compares spell's ring against school's affinity/deficiency
 * - Automatically applies +1 or -1 School Rank modifier to displayed formula
 *
 * @param {L5R4Actor} actor - The actor owning the spell
 * @param {Item} spell - The spell item to enrich
 * @returns {void} Mutates spell.system in place
 * @private
 */
function enrichSpellFormulas(actor, spell) {
  // Find shugenja school for affinity/deficiency detection
  const school = actor.items.find(i => i.type === "technique" && i.system?.shugenja);
  const schoolAffinity = school ? String(school.system?.affinity ?? "").toLowerCase() : "";
  const schoolDeficiency = school ? String(school.system?.deficiency ?? "").toLowerCase() : "";

  const ringKey = String(spell.system?.ring ?? "earth").toLowerCase();
  const ringValue = toInt(actor.system?.rings?.[ringKey]) || 2;
  const baseSchoolRank = toInt(actor.system?.insight?.rank) || 1;
  const masteryLevel = toInt(spell.system?.mastery) || 1;

  // Apply affinity/deficiency to school rank
  let schoolRankMod = 0;
  if (schoolAffinity === ringKey) {
    schoolRankMod = 1; // Affinity: +1 School Rank
  } else if (schoolDeficiency === ringKey) {
    schoolRankMod = -1; // Deficiency: -1 School Rank
  }
  const effectiveSchoolRank = baseSchoolRank + schoolRankMod;

  // L5R4 Spell Casting: (Ring + School Rank)k(Ring)
  // Affinity/Deficiency now applied to displayed formula
  spell.system.castRoll = Math.max(0, ringValue + effectiveSchoolRank);
  spell.system.castKeep = Math.max(0, ringValue);
  spell.system.castFormula = `${spell.system.castRoll}k${spell.system.castKeep}`;

  // Calculate Target Number: 5 + (Mastery Level × 5)
  spell.system.castTN = 5 + masteryLevel * 5;
}

/**
 * Enrich weapon with attack and damage formulas.
 *
 * Calculates attack and damage roll formulas for weapons and bows:
 * - **attackFormula**: Base attack roll (Skill + Trait)k(Trait)
 * - **attackFormulaWithStance**: Attack roll including Full Attack stance bonus
 * - **damageFormula**: Weapon base damage XkY from weapon.system
 * - **damageFormulaWithStance**: Currently same as damageFormula (reserved for future stance effects)
 *
 * **L5R4 Full Attack Stance:**
 * Characters in Full Attack stance gain +2k1 to attack rolls per core rules.
 * This is detected via `actor.system._stanceEffects.fullAttack` flag set by
 * the stance management system.
 *
 * @param {L5R4Actor} actor - The actor owning the weapon
 * @param {Item} weapon - The weapon item to enrich
 * @returns {void} Mutates weapon properties in place (not weapon.system)
 * @private
 */
function enrichWeaponFormulas(actor, weapon) {
  // Resolve skill and trait for attack roll (Skill + Trait)k(Trait)
  const weaponSkill = resolveWeaponSkillTrait(actor, weapon);
  weapon.attackFormula = `${weaponSkill.rollBonus}k${weaponSkill.keepBonus}`;

  // Apply Full Attack stance bonus: +2k1 to attack rolls (Fire Ring stance)
  if (actor.system._stanceEffects?.fullAttack) {
    const stanceRollBonus = weaponSkill.rollBonus + 2; // +2 rolled dice
    const stanceKeepBonus = weaponSkill.keepBonus + 1; // +1 kept die
    weapon.attackFormulaWithStance = `${stanceRollBonus}k${stanceKeepBonus}`;
  } else {
    weapon.attackFormulaWithStance = weapon.attackFormula;
  }

  const baseDamageRoll = toInt(weapon.system?.damageRoll) || 0;
  const baseDamageKeep = toInt(weapon.system?.damageKeep) || 0;
  weapon.damageFormula = `${baseDamageRoll}k${baseDamageKeep}`;
  weapon.damageFormulaWithStance = weapon.damageFormula;
}
