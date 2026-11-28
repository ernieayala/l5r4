/**
 * @module utils/mechanics
 * @description Core L5R4 game mechanics calculations.
 *
 * Handles:
 * - Trait and skill resolution for rolls
 * - Skill, Trait, and Ring bonuses shown in sheet formulas
 * - Weapon skill resolution
 * - Roll parameter extraction from DOM elements
 *
 * L5R4 uses traits (physical/mental attributes) and skills (trained abilities).
 * Rolls are usually Skill Rank + Trait, using roll-and-keep dice (XkY).
 */

import { toInt, toString } from "./type-coercion.js";
import { getSelectorBonus } from "./rule-bag.js";

/**
 * The roll, keep, and total bonus a sheet formula shows for a Skill, Trait, or Ring: Active Effect values in
 * `system.bonuses` plus the RollModifier rules whose predicates hold for the actor. The roll dialog lists the same
 * sources one by one, with the situational ones (a target, a stance) as well.
 * @param {object} actor - Prepared actor document
 * @param {object} keys - The Skill, Trait, and Ring the formula names
 * @param {string} [keys.skill] - Skill name in lower case
 * @param {string} [keys.trait] - Trait key
 * @param {string} [keys.ring] - Ring key
 * @returns {{roll: number, keep: number, total: number}}
 */
export function getFormulaBonus(actor, { skill, trait, ring }) {
  const sum = { roll: 0, keep: 0, total: 0 };
  const selectors = [];
  for (const [category, name] of [
    ["skill", skill],
    ["trait", trait],
    ["ring", ring]
  ]) {
    if (!name) {
      continue;
    }
    selectors.push(`${category}:${name}`);
    const effect = actor.system.bonuses[category][name] ?? {};
    sum.roll += toInt(effect.roll);
    sum.keep += toInt(effect.keep);
    sum.total += toInt(effect.total);
  }
  const rules = getSelectorBonus(actor.ruleBag, selectors, { options: actor.rollOptions });
  return {
    roll: sum.roll + rules.roll,
    keep: sum.keep + rules.keep,
    total: sum.total + rules.total
  };
}

/**
 * Gets effective trait value for actor.
 *
 * Checks derived traits (with modifiers applied) first, then base traits.
 * Void is stored on its own in rings.void.rank.
 * @param {object} actor - Foundry actor document
 * @param {string} traitKey - Trait abbreviation ("agi", "str", "void", etc.)
 * @returns {number} Effective trait value
 */
export function getEffectiveTrait(actor, traitKey) {
  if (!actor?.system) {
    return 0;
  }

  // Void is stored on its own in rings
  if (traitKey === "void") {
    return toInt(actor.system?.rings?.void?.rank, 0);
  }

  // Check derived traits (includes modifiers from effects)
  const derived = actor.system?._derived?.traitsEff?.[traitKey];
  if (derived != null) {
    return toInt(derived, 0);
  }

  // Fall back to base trait value
  return toInt(actor.system?.traits?.[traitKey], 0);
}

/**
 * A Ring's value: the Void Ring's rank, or an Elemental Ring.
 * game-rules/25_rings_and_traits.md, p.76
 * @param {object} actor
 * @param {string} ring - "air", "earth", "fire", "water", or "void"
 * @returns {number}
 */
export function ringRankOf(actor, ring) {
  return ring === "void" ? toInt(actor.system.rings.void.rank) : toInt(actor.system.rings[ring]);
}

/**
 * The highest rank among the actor's Schools, 0 with none: the School Rank a Technique scales with. The
 * `school-rank` roll option and `@school.rank` in rule formulas both read it.
 * game-rules/49_improving_your_character.md, p.104
 * @param {object} actor
 * @returns {number}
 */
export function getHighestSchoolRank(actor) {
  const ranks = actor.items
    .filter(item => item.type === "school")
    .map(item => item.system.schoolRank);
  return ranks.length ? Math.max(...ranks) : 0;
}

/**
 * Extracts roll parameters from DOM element data attributes.
 *
 * Reads data-roll, data-keep, data-trait, data-label, data-description.
 * If trait is present, looks up trait value from actor. A button with roll 5, keep 3, trait "agi", and label
 * "Attack" gives 5 dice rolled, 3 kept, the actor's Agility as the trait bonus, and that label.
 * @param {Element} el - DOM element with data attributes
 * @param {object} actor - Foundry actor document
 * @returns {{roll: number, keep: number, traitBonus: number, label: string, description: string}} The
 *   dice to roll and keep, the Trait value when a trait is named, and the roll's label and description
 */
export function getRollParams(el, actor) {
  const roll = toInt(el.dataset.roll, 0);
  const keep = toInt(el.dataset.keep, 0);
  const label = toString(el.dataset.label);
  const description = toString(el.dataset.description);

  const hasTrait = Object.prototype.hasOwnProperty.call(el.dataset, "trait");
  const traitKey = hasTrait ? toString(el.dataset.trait).toLowerCase() : "";
  const traitBonus = hasTrait ? getEffectiveTrait(actor, traitKey) : 0;

  return {
    roll,
    keep,
    traitBonus,
    label,
    description
  };
}

/**
 * Resolves skill and trait for weapon attack roll.
 *
 * Looks up weapon's associated skill on actor. If found, uses skill rank + trait.
 * If skill not found or rank is 0, uses trait only (unskilled).
 *
 * L5R4 unskilled rolls: Roll and Keep both equal trait value.
 * Skilled rolls: Roll = skill rank + trait, Keep = trait.
 * With Kenjutsu 3 and Agility 3 a katana rolls 6 and keeps 3, described "Kenjutsu (3) + AGI (3)"; without
 * Kenjutsu it rolls and keeps 3, described "AGI (3) [Unskilled]".
 * @param {object} actor - Foundry actor document
 * @param {object} weapon - Weapon item document
 * @returns {{skillRank: number, traitValue: number, rollBonus: number, keepBonus: number, description: string}}
 *   The Skill rank (0 if unskilled), the Trait value, the dice to roll and keep, and a description
 */
export function getWeaponSkillTrait(actor, weapon) {
  if (!weapon || !actor) {
    return {
      skillRank: 0,
      traitValue: 0,
      rollBonus: 0,
      keepBonus: 0,
      description: "No weapon/actor"
    };
  }

  const weaponSystem = weapon.system ?? {};
  const associatedSkill = toString(weaponSystem.associatedSkill);
  const fallbackTrait = toString(weaponSystem.fallbackTrait, "agi");

  const skill = getOwnedSkill(actor, associatedSkill);
  if (skill) {
    return getWeaponSkillPool(actor, { skill, fallbackTrait });
  }

  // No skill found - use fallback trait (unskilled)
  const traitValue = getEffectiveTrait(actor, fallbackTrait);

  return {
    skillRank: 0,
    traitValue,
    rollBonus: traitValue,
    keepBonus: traitValue,
    description: `${fallbackTrait.toUpperCase()} (${traitValue}) [Unskilled]`
  };
}

/**
 * The Skills a weapon's sheet offers to attack with, as label by stored value: each of the owner's Skill names, with
 * the one an attack would match to the stored Skill keyed by the stored text, and a stored Skill the owner lacks as
 * a choice of its own, so saving the sheet keeps the weapon's Skill either way.
 * @param {string[]} skillNames - The owner's Skill names
 * @param {string} storedSkill - The weapon's `system.associatedSkill`
 * @returns {Record<string, string>}
 */
export function getWeaponSkillChoices(skillNames, storedSkill) {
  const choices = {};
  for (const name of skillNames) {
    choices[isSameSkillName(name, storedSkill) ? storedSkill : name] = name;
  }
  if (storedSkill && !Object.hasOwn(choices, storedSkill)) {
    choices[storedSkill] = storedSkill;
  }
  return choices;
}

/**
 * The actor's Skill item of a name, matched without case; none for an empty name.
 * @param {object} actor - Foundry actor document
 * @param {string} skillName - The Skill's name
 * @returns {object|null|undefined} The Skill item; null or undefined when there is none
 */
function getOwnedSkill(actor, skillName) {
  if (!(skillName && skillName.trim() && actor.items?.find)) {
    return null;
  }
  return actor.items.find(i => i.type === "skill" && isSameSkillName(toString(i.name), skillName));
}

/**
 * Whether two names name the same Skill: an attack matches its weapon's Skill without case.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function isSameSkillName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * A weapon attack's pool from an owned Skill: rank + Trait, keep Trait, with the Skill and Trait bonuses the roll
 * pipeline starts from, so the shown formula matches the roll. Rank 0 counts as unskilled: roll and keep both the
 * Trait.
 * @param {object} actor - Foundry actor document
 * @param {object} weaponSkill
 * @param {object} weaponSkill.skill - The Skill item
 * @param {string} weaponSkill.fallbackTrait - The weapon's Trait, for a Skill with none
 * @returns {{skillRank: number, traitValue: number, rollBonus: number, keepBonus: number, description: string}}
 */
function getWeaponSkillPool(actor, { skill, fallbackTrait }) {
  const skillRank = toInt(skill.system?.rank ?? 0);
  const skillTrait = toString(skill.system?.trait, fallbackTrait);
  const traitValue = getEffectiveTrait(actor, skillTrait);
  const skillName = toString(skill.name, "Unknown Skill");

  const bonus = getFormulaBonus(actor, { skill: skillName.toLowerCase(), trait: skillTrait });
  const skillBonusRoll = bonus.roll;
  const skillBonusKeep = bonus.keep;

  // Rank 0 counts as unskilled (roll and keep both = trait)
  if (skillRank === 0) {
    return {
      skillRank: 0,
      traitValue,
      rollBonus: traitValue + skillBonusRoll,
      keepBonus: traitValue + skillBonusKeep,
      description: `${skillName} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue}) [Unskilled]`
    };
  }

  // Skilled roll: roll = skill + trait, keep = trait
  return {
    skillRank,
    traitValue,
    rollBonus: skillRank + traitValue + skillBonusRoll,
    keepBonus: traitValue + skillBonusKeep,
    description: `${skillName} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue})`
  };
}
