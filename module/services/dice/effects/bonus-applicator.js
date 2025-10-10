/**
 * @fileoverview L5R4 Bonus Applicator - Active Effects Integration
 * 
 * Centralized logic for applying bonuses from Foundry Active Effects system.
 * Consolidates duplicated bonus lookup code from multiple roll functions into
 * single source of truth. Handles skill, trait, and ring-based bonuses with
 * safe fallbacks for missing data.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Apply skill-specific bonuses from actor's Active Effects.
 * 
 * @param {Actor|null} actor - Actor to get bonuses from
 * @param {string} skillName - Skill name to look up bonuses for
 * @returns {{roll: number, keep: number, total: number}} Bonus modifiers
 * 
 * @example
 * const bonuses = applySkillBonuses(actor, "kenjutsu");
 * rollMod += bonuses.roll;
 * keepMod += bonuses.keep;
 * totalMod += bonuses.total;
 */
export function applySkillBonuses(actor, skillName) {
  if (!actor?.system?.bonuses?.skill) {
    return { roll: 0, keep: 0, total: 0 };
  }

  const kSkill = String(skillName).toLowerCase?.();
  const bSkill = actor.system.bonuses.skill[kSkill] || {};

  return {
    roll: toInt(bSkill.roll),
    keep: toInt(bSkill.keep),
    total: toInt(bSkill.total)
  };
}

/**
 * Apply trait-specific bonuses from actor's Active Effects.
 * 
 * @param {Actor|null} actor - Actor to get bonuses from
 * @param {string} traitName - Trait name to look up bonuses for
 * @returns {{roll: number, keep: number, total: number}} Bonus modifiers
 * 
 * @example
 * const bonuses = applyTraitBonuses(actor, "agi");
 * rollMod += bonuses.roll;
 * keepMod += bonuses.keep;
 * totalMod += bonuses.total;
 */
export function applyTraitBonuses(actor, traitName) {
  if (!actor?.system?.bonuses?.trait) {
    return { roll: 0, keep: 0, total: 0 };
  }

  const kTrait = String(traitName).toLowerCase?.();
  const bTrait = actor.system.bonuses.trait[kTrait] || {};

  return {
    roll: toInt(bTrait.roll),
    keep: toInt(bTrait.keep),
    total: toInt(bTrait.total)
  };
}

/**
 * Apply ring-specific bonuses from actor's Active Effects.
 * 
 * @param {Actor|null} actor - Actor to get bonuses from
 * @param {string} ringName - Ring name to look up bonuses for
 * @returns {{roll: number, keep: number, total: number}} Bonus modifiers
 * 
 * @example
 * const bonuses = applyRingBonuses(actor, "fire");
 * rollMod += bonuses.roll;
 * keepMod += bonuses.keep;
 * totalMod += bonuses.total;
 */
export function applyRingBonuses(actor, ringName) {
  if (!actor?.system?.bonuses?.ring) {
    return { roll: 0, keep: 0, total: 0 };
  }

  const kRing = String(ringName).toLowerCase?.();
  const bRing = actor.system.bonuses.ring[kRing] || {};

  return {
    roll: toInt(bRing.roll),
    keep: toInt(bRing.keep),
    total: toInt(bRing.total)
  };
}

/**
 * Apply combined skill + trait bonuses for skill rolls.
 * Convenience function that combines both skill and trait bonuses.
 * 
 * @param {Actor|null} actor - Actor to get bonuses from
 * @param {string} skillName - Skill name to look up bonuses for
 * @param {string} traitName - Trait name to look up bonuses for
 * @returns {{roll: number, keep: number, total: number}} Combined bonus modifiers
 * 
 * @example
 * const bonuses = applySkillAndTraitBonuses(actor, "kenjutsu", "agi");
 * rollMod += bonuses.roll;
 * keepMod += bonuses.keep;
 * totalMod += bonuses.total;
 */
export function applySkillAndTraitBonuses(actor, skillName, traitName) {
  const skillBonuses = applySkillBonuses(actor, skillName);
  const traitBonuses = applyTraitBonuses(actor, traitName);

  return {
    roll: skillBonuses.roll + traitBonuses.roll,
    keep: skillBonuses.keep + traitBonuses.keep,
    total: skillBonuses.total + traitBonuses.total
  };
}
