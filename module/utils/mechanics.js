/**
 * @module mechanics
 * @description Core L5R4 game mechanics calculations.
 *
 * Handles:
 * - Trait and skill resolution for rolls
 * - Wound penalties
 * - Shugenja affinity/deficiency modifiers
 * - Weapon skill resolution
 * - Roll parameter extraction from DOM elements
 *
 * L5R4 uses traits (physical/mental attributes) and skills (trained abilities).
 * Rolls are typically Skill Rank + Trait, using roll-and-keep dice (XkY).
 */

import { toInt, toString } from "./type-coercion.js";
import { logError } from "./error-logging.js";

/**
 * Valid L5R4 trait abbreviations.
 * Physical: sta (Stamina), str (Strength), ref (Reflexes), agi (Agility)
 * Mental: wil (Willpower), per (Perception), awa (Awareness), int (Intelligence)
 * Void: void (Void Ring)
 * @constant {string[]}
 */
const KNOWN_TRAITS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int", "void"];

/**
 * Maps English trait names to abbreviations.
 * Used for normalizing trait references from various sources.
 * @constant {Object.<string, string>}
 */
const ENGLISH_TRAIT_LABELS = {
  stamina: "sta",
  willpower: "wil",
  strength: "str",
  perception: "per",
  reflexes: "ref",
  awareness: "awa",
  agility: "agi",
  intelligence: "int",
  void: "void"
};

/**
 * Gets current wound penalty for actor.
 *
 * Wound penalties reduce dice rolled/kept based on damage taken.
 * Checks actor.system.wounds.penalty first, then calculates from wound levels.
 *
 * @param {Object} actor - Foundry actor document
 * @returns {number} Wound penalty (negative number or 0)
 *
 * @example
 * readWoundPenalty(actor) // -10 if in "Down" wound level
 */
export function readWoundPenalty(actor) {
  if (!actor?.system) {
    return 0;
  }

  // Check for pre-calculated wound penalty
  if (actor.system?.wounds?.penalty != null) {
    return toInt(actor.system.wounds.penalty, 0);
  }

  // Calculate from wound levels - find current level with worst penalty
  const levels = Object.values(actor.system?.woundLvlsUsed ?? {});
  const current = levels
    .filter(w => w?.current)
    .reduce((a, b) => (toInt(a?.penalty, -999) > toInt(b?.penalty, -999) ? a : b), null);
  return toInt(current?.penalty, 0);
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
 * @param {*} raw - Raw trait identifier
 * @returns {string} Normalized trait key ("agi", "str", etc.) or empty string
 *
 * @example
 * normalizeTraitKey("agility") // "agi"
 * normalizeTraitKey("l5r4.ui.mechanics.traits.str") // "str"
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
  } catch (_) {
    // Ignore i18n errors
  }

  // No match found
  return "";
}

/**
 * Gets effective trait value for actor.
 *
 * Checks derived traits (with modifiers applied) first, then base traits.
 * Void is stored separately in rings.void.rank.
 *
 * @param {Object} actor - Foundry actor document
 * @param {string} traitKey - Trait abbreviation ("agi", "str", "void", etc.)
 * @returns {number} Effective trait value
 *
 * @example
 * getEffectiveTrait(actor, "agi") // 3
 * getEffectiveTrait(actor, "void") // 2
 */
export function getEffectiveTrait(actor, traitKey) {
  if (!actor?.system) {
    return 0;
  }

  // Void is stored separately in rings
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
 * Extracts roll parameters from DOM element data attributes.
 *
 * Reads data-roll, data-keep, data-trait, data-label, data-description.
 * If trait is present, looks up trait value from actor.
 *
 * @param {Element} el - DOM element with data attributes
 * @param {Object} actor - Foundry actor document
 * @returns {Object} Roll parameters
 * @returns {number} return.diceRoll - Number of dice to roll
 * @returns {number} return.diceKeep - Number of dice to keep
 * @returns {number} return.traitBonus - Trait value if trait specified
 * @returns {string} return.label - Roll label
 * @returns {string} return.description - Roll description
 *
 * @example
 * // Element: <button data-roll="5" data-keep="3" data-trait="agi" data-label="Attack">
 * extractRollParams(button, actor)
 * // { diceRoll: 5, diceKeep: 3, traitBonus: 3, label: "Attack", description: "" }
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
 *
 * @param {Object} actor - Foundry actor document
 * @param {string} ringKey - Ring element ("fire", "water", "air", "earth", "void")
 * @returns {number} Modifier: 1 (affinity), -1 (deficiency), or 0 (none/cancel)
 *
 * @example
 * getAffinityDeficiencyModifier(actor, "fire") // 1 if has Fire affinity
 * getAffinityDeficiencyModifier(actor, "water") // -1 if has Water deficiency
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
  let shugenjaItems = [];
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
 *
 * @param {Object} actor - Foundry actor document
 * @param {Object} weapon - Weapon item document
 * @returns {Object} Weapon roll parameters
 * @returns {number} return.skillRank - Skill rank (0 if unskilled)
 * @returns {number} return.traitValue - Trait value
 * @returns {number} return.rollBonus - Dice to roll
 * @returns {number} return.keepBonus - Dice to keep
 * @returns {string} return.description - Human-readable description
 *
 * @example
 * // Skilled: Kenjutsu 3, Agility 3
 * resolveWeaponSkillTrait(actor, katana)
 * // { skillRank: 3, traitValue: 3, rollBonus: 6, keepBonus: 3, description: "Kenjutsu (3) + AGI (3)" }
 *
 * @example
 * // Unskilled: No Kenjutsu, Agility 3
 * resolveWeaponSkillTrait(actor, katana)
 * // { skillRank: 0, traitValue: 3, rollBonus: 3, keepBonus: 3, description: "AGI (3) [Unskilled]" }
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

    // Pick up skill bonuses aggregated by item-enrichment.aggregateSkillItemBonuses
    // (issue #34): Active Effects on a skill item deposit into skill.system.rollBonus,
    // which item-enrichment then bridges to actor.system.bonuses.skill[name]. Reading
    // those bonuses here makes the displayed weapon attack formula match what
    // applySkillAndTraitBonuses will compute at roll time.
    const skillKey = skillName.toLowerCase();
    const skillBonusMap = actor.system?.bonuses?.skill?.[skillKey] || {};
    const skillBonusRoll = toInt(skillBonusMap.roll);
    const skillBonusKeep = toInt(skillBonusMap.keep);

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
  } else {
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
}
