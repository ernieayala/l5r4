/**
 * Game Mechanics Utility Module
 *
 * Implements core L5R4 TTRPG mechanics for character traits, wound penalties,
 * and skill roll calculations. Provides utilities for trait key normalization,
 * effective trait resolution (with wound penalties), and weapon skill lookups.
 *
 * L5R4 Game Rules Implemented:
 * - **Wound Penalty System**: Characters suffer TN increases based on wound rank
 *   (Nicked +3, Grazed +5, Hurt +10, Injured +15, Crippled +20, Down +40)
 * - **Skill Roll Formula**: (Skill Rank + Trait Value)k(Trait Value) for attack rolls
 * - **Trait System**: Eight traits (STA, WIL, STR, PER, REF, AWA, AGI, INT) plus Void Ring
 * - **Roll & Keep Dice**: XkY notation where X=rolled dice, Y=kept dice
 *
 * Foundry VTT Integration:
 * - Reads actor.system for trait values and wound data (Actor DataModel)
 * - Searches actor.items collection for skill lookups (EmbeddedCollection)
 * - Supports _derived data pattern for pre-calculated effective traits
 * - Parses DOM dataset attributes for roll parameter extraction
 *
 * Requires Foundry VTT v10+ for:
 * - Actor and Item DataModel APIs
 * - game.i18n localization for trait label resolution
 *
 * @module utils/mechanics
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.DataModel.html|Foundry DataModel}
 */

import { toInt } from "./type-coercion.js";

/**
 * Safely coerce a value to string with fallback.
 *
 * Defensive utility that handles null, undefined, and symbol types which
 * cannot be safely converted to strings. Used throughout this module to
 * safely access weapon.system and skill.system properties.
 *
 * @param {*} value - Value to coerce to string
 * @param {string} [fallback=""] - Fallback string if value is null/undefined/symbol
 * @returns {string} String representation or fallback
 * @private
 */
function safeString(value, fallback = "") {
  if (value == null || typeof value === "symbol") {
    return fallback;
  }
  return String(value);
}

/**
 * List of all valid trait abbreviations in L5R4.
 * Eight traits (sta, wil, str, per, ref, awa, agi, int) plus void ring.
 * Used for validation and normalization throughout the system.
 * @constant {string[]}
 * @private
 */
const KNOWN_TRAITS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int", "void"];

/**
 * Mapping of English trait names to their three-letter abbreviations.
 * Supports trait key normalization from full names (e.g., "stamina" → "sta").
 * @constant {Object.<string, string>}
 * @private
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
 * Read the current wound penalty for an actor.
 *
 * Implements the L5R4 Wound Penalty system where characters suffer TN increases
 * based on their wound rank:
 * - Healthy: No penalty
 * - Nicked: +3 TN
 * - Grazed: +5 TN
 * - Hurt: +10 TN
 * - Injured: +15 TN
 * - Crippled: +20 TN
 * - Down: +40 TN
 *
 * The function checks two possible data structures:
 * 1. Direct penalty at actor.system.wounds.penalty (preferred)
 * 2. Legacy woundLvlsUsed structure (fallback)
 *
 * For legacy structure, finds the worst (highest) penalty among current wound levels.
 *
 * @param {Actor} actor - Foundry Actor document with wound data
 * @returns {number} Current wound penalty (0 if healthy or no wound data)
 */
export function readWoundPenalty(actor) {
  // Defensive guard: handle null/undefined actor
  if (!actor?.system) {
    return 0;
  }

  if (actor.system?.wounds?.penalty != null) {
    return toInt(actor.system.wounds.penalty, 0);
  }

  // Legacy wound system: Find worst penalty among current wound levels
  // Sentinel value -999 ensures highest penalty wins comparison
  const levels = Object.values(actor.system?.woundLvlsUsed || {});
  const current = levels
    .filter(w => w?.current)
    .reduce((a, b) => (toInt(a?.penalty, -999) > toInt(b?.penalty, -999) ? a : b), null);
  return toInt(current?.penalty, 0);
}

/**
 * Normalize a trait key to its standard three-letter abbreviation.
 *
 * Converts various trait key formats to standard abbreviations (sta, wil, str, etc.).
 * Handles multiple input formats through a fallback chain:
 * 1. i18n keys (e.g., "l5r4.ui.mechanics.traits.sta")
 * 2. Void ring special case ("l5r4.ui.mechanics.rings.void")
 * 3. Direct abbreviations (e.g., "sta", "ref")
 * 4. English full names (e.g., "stamina", "reflexes")
 * 5. Reverse i18n lookup (localized trait names)
 *
 * Returns empty string for unrecognized inputs rather than throwing errors.
 *
 * @param {*} raw - Raw trait key in any supported format
 * @returns {string} Normalized three-letter abbreviation, or "" if unrecognized
 */
export function normalizeTraitKey(raw) {
  if (raw == null) {
    return "";
  }
  if (typeof raw === "symbol") {
    return "";
  }
  const k = String(raw).trim();

  // Strategy 1: Parse i18n key format (e.g., "l5r4.ui.mechanics.traits.sta")
  const m = /^l5r4\.ui\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && KNOWN_TRAITS.includes(m[1].toLowerCase())) {
    return m[1].toLowerCase();
  }

  // Strategy 2: Handle void ring i18n key specially
  if (/^l5r4\.ui\.mechanics\.rings\.void$/i.test(k)) {
    return "void";
  }

  // Strategy 3: Direct abbreviation match (case-insensitive)
  if (KNOWN_TRAITS.includes(k.toLowerCase())) {
    return k.toLowerCase();
  }

  // Strategy 4: Lookup English full name (e.g., "stamina" → "sta")
  if (ENGLISH_TRAIT_LABELS[k.toLowerCase()]) {
    return ENGLISH_TRAIT_LABELS[k.toLowerCase()];
  }

  // Strategy 5: Reverse i18n lookup - match localized trait names
  // Handles user input in non-English languages
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
    // Ignore localization errors
  }

  return "";
}

/**
 * Get the effective trait value for an actor, including wound penalties.
 *
 * Resolves trait values in priority order:
 * 1. Void ring: Read from actor.system.rings.void.rank
 * 2. Derived effective traits: Pre-calculated values in actor.system._derived.traitsEff
 * 3. Base traits: Raw values from actor.system.traits
 *
 * The _derived.traitsEff pattern is populated by Actor.prepareDerivedData() and
 * includes wound penalties, advantages, and other modifiers. Always prefer this
 * over raw trait values when calculating rolls.
 *
 * @param {Actor} actor - Foundry Actor document
 * @param {string} traitKey - Normalized trait abbreviation (sta, wil, str, per, ref, awa, agi, int, void)
 * @returns {number} Effective trait value (0 if trait not found)
 */
export function getEffectiveTrait(actor, traitKey) {
  // Defensive guard: handle null/undefined actor
  if (!actor?.system) {
    return 0;
  }

  // Special case: void ring
  if (traitKey === "void") {
    return toInt(actor.system?.rings?.void?.rank, 0);
  }

  // Prefer pre-calculated effective traits (includes wound penalties)
  const derived = actor.system?._derived?.traitsEff?.[traitKey];
  if (derived != null) {
    return toInt(derived, 0);
  }

  return toInt(actor.system?.traits?.[traitKey], 0);
}

/**
 * Roll parameters extracted from DOM element dataset attributes.
 *
 * @typedef {Object} RollParams
 * @property {number} diceRoll - Number of dice to roll (kept + unkept)
 * @property {number} diceKeep - Number of dice to keep from roll
 * @property {number} traitBonus - Bonus from trait value (if trait specified)
 * @property {string} label - Display label for the roll
 * @property {string} description - Detailed description of the roll
 */

/**
 * Extract roll parameters from DOM element dataset attributes.
 *
 * Parses data-* attributes on HTML elements to construct roll parameters
 * for L5R4 Roll & Keep dice system. Common in ActorSheetV2 event handlers.
 *
 * Expected dataset attributes:
 * - data-roll: Number of dice to roll (required)
 * - data-keep: Number of dice to keep (required)
 * - data-label: Display name for roll (optional)
 * - data-description: Roll description (optional)
 * - data-trait: Trait key for bonus (optional, triggers effective trait lookup)
 *
 * If data-trait is present, looks up effective trait value (including wound
 * penalties) and includes it as traitBonus.
 *
 * @param {HTMLElement} el - DOM element with dataset attributes
 * @param {Actor} actor - Foundry Actor for trait lookups
 * @returns {RollParams} Extracted roll parameters
 */
export function extractRollParams(el, actor) {
  const diceRoll = toInt(el.dataset.roll, 0);
  const diceKeep = toInt(el.dataset.keep, 0);
  const label = String(el.dataset.label ?? "");
  const description = String(el.dataset.description ?? "");

  // Use hasOwnProperty to distinguish between missing attribute and empty string
  // el.dataset.trait === undefined is true for both cases, but we need the distinction
  const hasTrait = Object.prototype.hasOwnProperty.call(el.dataset, "trait");
  const traitKey = hasTrait ? String(el.dataset.trait || "").toLowerCase() : "";
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
 * Weapon skill and trait resolution result for attack rolls.
 *
 * @typedef {Object} WeaponSkillResult
 * @property {number} skillRank - Skill rank value (0 if no skill)
 * @property {number} traitValue - Effective trait value (includes wound penalties)
 * @property {number} rollBonus - Total rolled dice (Skill + Trait)
 * @property {number} keepBonus - Total kept dice (Trait only)
 * @property {string} description - Human-readable roll formula description
 */

/**
 * Get affinity/deficiency school rank modifier for spell casting.
 *
 * Affinity/deficiency mechanics:
 * - **Affinity**: Shugenja casts spells of that element as if School Rank +1
 * - **Deficiency**: Shugenja casts spells of that element as if School Rank -1
 * - If deficiency reduces effective School Rank to 0, cannot cast spells of that element
 *
 * Searches actor's items for shugenja technique items and checks their affinity/deficiency
 * properties against the provided ring key. If multiple techniques have conflicting modifiers
 * for the same element, returns 0 (no auto-select, user must choose).
 *
 * Ring keys must be lowercase element names: "air", "earth", "fire", "water", "void"
 *
 * @param {Actor} actor - Foundry Actor casting the spell
 * @param {string} ringKey - Lowercase ring identifier ("air", "earth", "fire", "water", "void")
 * @returns {number} School rank modifier: +1 (affinity), -1 (deficiency), or 0 (no modifier/conflict)
 */
export function getAffinityDeficiencyModifier(actor, ringKey) {
  if (!actor || !ringKey) {
    return 0;
  }

  const normalizedRing = String(ringKey).toLowerCase().trim();
  if (!normalizedRing) {
    return 0;
  }

  // Find all shugenja technique items
  let shugenjaItems = [];
  try {
    const items = actor.items?.contents ?? actor.items ?? [];
    shugenjaItems = Array.from(items).filter(
      i => i.type === "technique" && i.system?.shugenja === true
    );
  } catch (err) {
    console.warn(
      "l5r4-enhanced",
      "Failed to find technique items in getAffinityDeficiencyModifier",
      {
        err
      }
    );
    return 0;
  }

  // Collect all modifiers for this ring from all shugenja techniques
  const modifiers = new Set();
  for (const item of shugenjaItems) {
    if (!item?.system) {
      continue;
    }

    // Check affinity (case-insensitive comparison)
    const affinity = String(item.system.affinity || "")
      .toLowerCase()
      .trim();
    if (affinity === normalizedRing) {
      modifiers.add(1);
    }

    // Check deficiency (case-insensitive comparison)
    const deficiency = String(item.system.deficiency || "")
      .toLowerCase()
      .trim();
    if (deficiency === normalizedRing) {
      modifiers.add(-1);
    }
  }

  // Handle conflicts: if both affinity and deficiency exist, return 0 (no auto-select)
  if (modifiers.size > 1) {
    return 0;
  }

  // Return single modifier if found, otherwise 0
  return modifiers.size === 1 ? modifiers.values().next().value : 0;
}

/**
 * Resolve weapon skill and trait for attack roll calculation.
 *
 * L5R4 Skill Roll formulas:
 * - Skilled (Rank > 0): (Skill Rank + Trait Value)k(Trait Value)
 * - Unskilled (Rank = 0): (Trait Value)k(Trait Value) with no exploding dice
 *
 * Resolution process:
 * 1. Extract weapon.system.associatedSkill name (e.g., "Kenjutsu")
 * 2. Search actor.items for matching skill by name (case-insensitive)
 * 3. If skill found with rank > 0: Calculate (Skill + Trait)k(Trait)
 * 4. If skill found with rank = 0: Calculate (Trait)k(Trait) [Unskilled]
 * 5. If no skill: Fall back to weapon.system.fallbackTrait, calculate (Trait)k(Trait) [Unskilled]
 *
 * Default fallback trait is "agi" (Agility) for weapons without skills.
 * All trait values include wound penalties via getEffectiveTrait().
 *
 * @param {Actor} actor - Foundry Actor making the attack
 * @param {Item} weapon - Foundry Item of type "weapon"
 * @returns {WeaponSkillResult} Resolved skill/trait values and roll formula
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

  const weaponSystem = weapon.system || {};
  const associatedSkill = safeString(weaponSystem.associatedSkill);
  const fallbackTrait = safeString(weaponSystem.fallbackTrait, "agi") || "agi";

  // Search actor's skill items for matching skill by name (case-insensitive)
  let skill = null;
  if (associatedSkill && associatedSkill.trim() && actor.items?.find) {
    const skillNameLower = associatedSkill.toLowerCase();
    skill = actor.items.find(i => {
      if (i.type !== "skill") {
        return false;
      }
      const itemName = safeString(i.name);
      return itemName.toLowerCase() === skillNameLower;
    });
  }

  if (skill) {
    const skillRank = toInt(skill.system?.rank || 0);
    const skillTrait = safeString(skill.system?.trait, fallbackTrait) || fallbackTrait;
    const traitValue = getEffectiveTrait(actor, skillTrait);
    const skillName = safeString(skill.name, "Unknown Skill") || "Unknown";

    // L5R4 Unskilled Roll Rule:
    // When skill rank = 0, "effectively making a Trait Roll" = (Trait)k(Trait) with no exploding dice
    // When skill rank > 0, roll (Skill + Trait)k(Trait) normally
    if (skillRank === 0) {
      return {
        skillRank: 0,
        traitValue,
        rollBonus: traitValue, // Trait Roll: (Trait)k(Trait)
        keepBonus: traitValue,
        description: `${skillName} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue}) [Unskilled]`
      };
    }

    // Skilled Roll formula: (Skill + Trait)k(Trait)
    // rollBonus = rolled dice, keepBonus = kept dice
    return {
      skillRank,
      traitValue,
      rollBonus: skillRank + traitValue, // Total rolled dice
      keepBonus: traitValue, // Total kept dice
      description: `${skillName} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue})`
    };
  } else {
    // No skill found: Unskilled roll with fallback trait
    // L5R4 Rule: "effectively making a Trait Roll" = (Trait)k(Trait) with no exploding dice
    const traitValue = getEffectiveTrait(actor, fallbackTrait);

    return {
      skillRank: 0,
      traitValue,
      rollBonus: traitValue, // Trait Roll: (Trait)k(Trait)
      keepBonus: traitValue,
      description: `${fallbackTrait.toUpperCase()} (${traitValue}) [Unskilled]`
    };
  }
}
