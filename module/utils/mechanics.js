/**
 * @module utils/mechanics
 * @description Core L5R4 game mechanics calculations.
 *
 * Handles:
 * - Trait and skill resolution for rolls
 * - Skill, Trait, and Ring bonuses shown in sheet formulas
 * - Shugenja affinity/deficiency modifiers
 * - Weapon skill resolution
 * - Roll parameter extraction from DOM elements
 *
 * L5R4 uses traits (physical/mental attributes) and skills (trained abilities).
 * Rolls are usually Skill Rank + Trait, using roll-and-keep dice (XkY).
 */

import { toInt, toString } from "./type-coercion.js";
import { logError } from "./error-logging.js";
import { selectorBonus } from "./rule-engine.js";

/**
 * Valid L5R4 trait abbreviations.
 * Physical: sta (Stamina), str (Strength), ref (Reflexes), agi (Agility)
 * Mental: wil (Willpower), per (Perception), awa (Awareness), int (Intelligence)
 * Void: void (Void Ring)
 * @constant {string[]}
 */
const KNOWN_TRAITS = Object.freeze([
  "sta",
  "wil",
  "str",
  "per",
  "ref",
  "awa",
  "agi",
  "int",
  "void"
]);

/**
 * Maps English trait names to abbreviations.
 * Used for normalizing trait references from various sources.
 * @constant {Record<string, string>}
 */
const ENGLISH_TRAIT_LABELS = Object.freeze({
  stamina: "sta",
  willpower: "wil",
  strength: "str",
  perception: "per",
  reflexes: "ref",
  awareness: "awa",
  agility: "agi",
  intelligence: "int",
  void: "void"
});

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
export function displayRollBonus(actor, { skill, trait, ring }) {
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
  const rules = selectorBonus(actor.ruleBag, selectors, actor.rollOptions);
  return {
    roll: sum.roll + rules.roll,
    keep: sum.keep + rules.keep,
    total: sum.total + rules.total
  };
}

/**
 * Normalizes trait key to standard abbreviation.
 *
 * Handles multiple input formats:
 * - Abbreviations: "agi", "str", "void"
 * - English names: "agility", "strength"
 * - Localization keys: "l5r4.ui.mechanics.traits.agi"
 * - Localized labels: "Agilité" (French) -> "agi"
 *
 * So "agility" gives "agi", and "l5r4.ui.mechanics.traits.str" gives "str".
 * @param {*} raw - Raw trait identifier
 * @returns {string} Normalized trait key ("agi", "str", etc.) or empty string
 */
export function normalizeTraitKey(raw) {
  if (raw == null) {
    return "";
  }
  if (typeof raw === "symbol") {
    return "";
  }
  const k = toString(raw).trim();

  // Check for localization key format: "l5r4.ui.mechanics.traits.agi"
  const m = /^l5r4\.ui\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && KNOWN_TRAITS.includes(m[1].toLowerCase())) {
    return m[1].toLowerCase();
  }

  // Special case for void ring localization key
  if (/^l5r4\.ui\.mechanics\.rings\.void$/i.test(k)) {
    return "void";
  }

  // Check if already a valid abbreviation
  if (KNOWN_TRAITS.includes(k.toLowerCase())) {
    return k.toLowerCase();
  }

  // Check English trait names
  if (ENGLISH_TRAIT_LABELS[k.toLowerCase()]) {
    return ENGLISH_TRAIT_LABELS[k.toLowerCase()];
  }

  // Try matching against localized labels
  try {
    for (const key of KNOWN_TRAITS) {
      const labelKey =
        key === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${key}`;
      const label = game.i18n?.localize?.(labelKey) ?? "";
      if (label && label.toLowerCase() === k.toLowerCase()) {
        return key;
      }
    }
  } catch {
    // Ignore i18n errors
  }

  // No match found
  return "";
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
export function ringRank(actor, ring) {
  return ring === "void" ? toInt(actor.system.rings.void.rank) : toInt(actor.system.rings[ring]);
}

/**
 * The highest rank among the actor's Schools, 0 with none: the School Rank a Technique scales with. The
 * `school-rank` roll option and `@school.rank` in rule formulas both read it.
 * game-rules/49_improving_your_character.md, p.104
 * @param {object} actor
 * @returns {number}
 */
export function highestSchoolRank(actor) {
  const ranks = actor.items
    .filter(item => item.type === "school")
    .map(item => item.system.schoolRank);
  return ranks.length ? Math.max(...ranks) : 0;
}

/**
 * The School Rank a shugenja casts with: the rank of the School marked as the shugenja School, or the Insight
 * Rank, which is the School Rank of a character with one School.
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/49_improving_your_character.md, p.104
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {object} actor
 * @returns {number}
 */
export function castingSchoolRank(actor) {
  const school = actor.items.find(item => item.type === "school" && item.system.shugenja);
  return school ? school.system.schoolRank : actor.system.insightRank;
}

/**
 * Extracts roll parameters from DOM element data attributes.
 *
 * Reads data-roll, data-keep, data-trait, data-label, data-description.
 * If trait is present, looks up trait value from actor. A button with roll 5, keep 3, trait "agi", and label
 * "Attack" gives 5 dice rolled, 3 kept, the actor's Agility as the trait bonus, and that label.
 * @param {Element} el - DOM element with data attributes
 * @param {object} actor - Foundry actor document
 * @returns {{diceRoll: number, diceKeep: number, traitBonus: number, label: string, description: string}} The
 *   dice to roll and keep, the Trait value when a trait is named, and the roll's label and description
 */
export function extractRollParams(el, actor) {
  const diceRoll = toInt(el.dataset.roll, 0);
  const diceKeep = toInt(el.dataset.keep, 0);
  const label = toString(el.dataset.label);
  const description = toString(el.dataset.description);

  const hasTrait = Object.prototype.hasOwnProperty.call(el.dataset, "trait");
  const traitKey = hasTrait ? toString(el.dataset.trait).toLowerCase() : "";
  const traitBonus = hasTrait ? getEffectiveTrait(actor, traitKey) : 0;

  return {
    diceRoll,
    diceKeep,
    traitBonus,
    label,
    description
  };
}

/**
 * Gets shugenja affinity/deficiency modifier for spell casting.
 *
 * Shugenja have affinity (+1k0) or deficiency (-1k0) with specific rings.
 * If character has both affinity and deficiency for same ring, they cancel.
 * @param {object} actor - Foundry actor document
 * @param {string} ringKey - Ring element ("fire", "water", "air", "earth", "void")
 * @returns {number} Modifier: 1 (affinity), -1 (deficiency), or 0 (none/cancel)
 */
export function getAffinityDeficiencyModifier(actor, ringKey) {
  if (!actor || !ringKey) {
    return 0;
  }

  const normalizedRing = toString(ringKey).toLowerCase().trim();
  if (!normalizedRing) {
    return 0;
  }

  // Find all shugenja techniques (grant affinity/deficiency)
  let shugenjaItems;
  try {
    const items = actor.items?.contents ?? actor.items ?? [];
    shugenjaItems = Array.from(items).filter(
      i => i.type === "technique" && i.system?.shugenja === true
    );
  } catch (err) {
    logError("Failed to find technique items in getAffinityDeficiencyModifier", err);
    return 0;
  }

  // Collect all modifiers (use Set to track unique values)
  const modifiers = new Set();
  for (const item of shugenjaItems) {
    if (!item?.system) {
      continue;
    }

    const affinity = toString(item.system.affinity).toLowerCase().trim();
    if (affinity === normalizedRing) {
      modifiers.add(1);
    }

    const deficiency = toString(item.system.deficiency).toLowerCase().trim();
    if (deficiency === normalizedRing) {
      modifiers.add(-1);
    }
  }

  // If both affinity and deficiency present, they cancel out
  if (modifiers.size > 1) {
    return 0;
  }

  // Return single modifier if present, otherwise 0
  return modifiers.size === 1 ? modifiers.values().next().value : 0;
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
export function resolveWeaponSkillTrait(actor, weapon) {
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

  // Look up skill item on actor by name
  let skill = null;
  if (associatedSkill && associatedSkill.trim() && actor.items?.find) {
    const skillNameLower = associatedSkill.toLowerCase();
    skill = actor.items.find(i => {
      if (i.type !== "skill") {
        return false;
      }
      const itemName = toString(i.name);
      return itemName.toLowerCase() === skillNameLower;
    });
  }

  // Skill found on actor
  if (skill) {
    const skillRank = toInt(skill.system?.rank ?? 0);
    const skillTrait = toString(skill.system?.trait, fallbackTrait);
    const traitValue = getEffectiveTrait(actor, skillTrait);
    const skillName = toString(skill.name, "Unknown Skill");

    // The same Skill and Trait bonuses the roll pipeline starts from, so the shown formula matches the roll
    const bonus = displayRollBonus(actor, { skill: skillName.toLowerCase(), trait: skillTrait });
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
