/**
 * @fileoverview L5R4 Game Mechanics Utilities
 * 
 * Provides L5R4-specific game mechanics calculations and data processing.
 * Handles wound penalties, trait normalization, roll parameter extraction,
 * and weapon skill resolution following L5R4 4th Edition rules.
 * 
 * **Core Responsibilities:**
 * - **Wound Penalties**: Extract current wound penalty from actors
 * - **Trait Normalization**: Convert various trait identifiers to system keys
 * - **Effective Traits**: Get trait values accounting for PC/NPC differences
 * - **Roll Parameters**: Extract roll data from DOM elements
 * - **Weapon Skills**: Resolve skill+trait for weapon attacks
 * 
 * **Design Principles:**
 * - **Rules Accuracy**: Faithful implementation of L5R4 mechanics
 * - **PC/NPC Compatibility**: Handle both character types gracefully
 * - **Legacy Support**: Work with older data shapes
 * - **Defensive Programming**: Safe fallbacks for missing data
 * 
 * **L5R4 Rules Context:**
 * - **Traits**: sta, wil, str, per, ref, awa, agi, int (+ void)
 * - **Wound Penalties**: Applied to all rolls when wounded
 * - **Attack Rolls**: (Skill + Trait)k(Trait) or (Trait)k(Trait) if unskilled
 * - **Effective Traits**: May differ from base traits due to wounds, spells, etc.
 * 
 * **Usage Examples:**
 * ```javascript
 * // Get wound penalty
 * const penalty = readWoundPenalty(actor); // -10, -5, 0, etc.
 * 
 * // Normalize trait identifiers
 * const trait = normalizeTraitKey("Reflexes");        // "ref"
 * const trait2 = normalizeTraitKey("l5r4.ui.mechanics.traits.agi"); // "agi"
 * 
 * // Get effective trait value
 * const reflex = getEffectiveTrait(actor, "ref"); // 4
 * 
 * // Extract roll parameters from DOM
 * const params = extractRollParams(buttonElement, actor);
 * 
 * // Resolve weapon attack
 * const attack = resolveWeaponSkillTrait(actor, weapon);
 * // { skillRank: 5, traitValue: 4, rollBonus: 9, keepBonus: 4, description: "..." }
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseActor.html|Actor}
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseItem.html|Item}
 */

import { toInt } from "./type-coercion.js";

/**
 * Compute the current wound penalty from an actor, handling legacy data shapes.
 * Works for both PC and NPC actors with different wound tracking systems.
 * @param {Actor} actor - The actor to read wound penalty from
 * @returns {number} Current wound penalty (0 or negative number)
 * @example
 * const penalty = readWoundPenalty(actor); // -10 (Crippled)
 * const bonus = readWoundPenalty(actor);   // 0 (Healthy)
 */
export function readWoundPenalty(actor) {
  // Newer shape
  if (actor.system?.wounds?.penalty != null) return toInt(actor.system.wounds.penalty, 0);
  // Fallback to woundLvlsUsed shape if present
  const levels = Object.values(actor.system?.woundLvlsUsed || {});
  const current = levels
    .filter((w) => w?.current)
    .reduce((a, b) => (toInt(a?.penalty, -999) > toInt(b?.penalty, -999) ? a : b), null);
  return toInt(current?.penalty, 0);
}

/**
 * Normalize a trait label/key into a system trait key ("ref", "awa", etc.).
 * Accepts multiple input formats:
 * - Short keys ("ref")
 * - English labels ("Reflexes")
 * - i18n keys ("l5r4.ui.mechanics.traits.ref")
 * - Localized labels in any language (via game.i18n.localize)
 * @param {string|null|undefined} raw - Raw trait identifier to normalize
 * @returns {string} Normalized trait key or empty string if not found
 * @example
 * normalizeTraitKey("ref");                           // "ref"
 * normalizeTraitKey("Reflexes");                      // "ref"
 * normalizeTraitKey("l5r4.ui.mechanics.traits.ref");  // "ref"
 * normalizeTraitKey("Réflexes");                      // "ref" (French)
 * normalizeTraitKey("invalid");                       // ""
 */
export function normalizeTraitKey(raw) {
  const known = ["sta","wil","str","per","ref","awa","agi","int","void"];
  if (raw == null) return "";
  // Guard against Symbol values which throw when coerced to string
  if (typeof raw === "symbol") return "";
  let k = String(raw).trim();

  // If given an i18n key like "l5r4.ui.mechanics.traits.ref"
  const m = /^l5r4\.ui\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && known.includes(m[1].toLowerCase())) return m[1].toLowerCase();

  // If given the rings.void i18n key
  if (/^l5r4\.ui\.mechanics\.rings\.void$/i.test(k)) return "void";

  // Plain short key?
  if (known.includes(k.toLowerCase())) return k.toLowerCase();

  // English labels -> keys
  const english = {
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
  if (english[k.toLowerCase()]) return english[k.toLowerCase()];

  // Localized labels (any language): compare against localized names
  try {
    for (const key of known) {
      // Void is a ring, not a trait, so use different i18n key
      const labelKey = key === "void" 
        ? "l5r4.ui.mechanics.rings.void" 
        : `l5r4.ui.mechanics.traits.${key}`;
      const label = game.i18n?.localize?.(labelKey) ?? "";
      if (label && label.toLowerCase() === k.toLowerCase()) return key;
    }
  } catch (_) { /* ignore if i18n not ready here */ }

  return "";
}

/**
 * Get the effective trait value for an actor, handling both PC and NPC cases.
 * For PCs: uses derived effective traits if available, falls back to base traits.
 * For NPCs: uses base traits directly.
 * @param {Actor} actor - The actor to read traits from
 * @param {string} traitKey - Trait identifier ("sta","wil","str","per","ref","awa","agi","int","void")
 * @returns {number} Effective trait value
 * @example
 * const reflexes = getEffectiveTrait(actor, "ref");  // 4
 * const voidRing = getEffectiveTrait(actor, "void"); // 3
 */
export function getEffectiveTrait(actor, traitKey) {
  if (traitKey === "void") {
    return toInt(actor.system?.rings?.void?.rank, 0);
  }
  
  // Try derived effective traits first (PC sheets)
  const derived = actor.system?._derived?.traitsEff?.[traitKey];
  if (derived != null) return toInt(derived, 0);
  
  // Fall back to base traits (both PC and NPC)
  return toInt(actor.system?.traits?.[traitKey], 0);
}

/**
 * Extract roll parameters from a dataset element, handling trait bonuses.
 * Common pattern used in both PC and NPC attack/damage rolls.
 * @param {HTMLElement} el - Element with dataset properties (roll, keep, trait, label, description)
 * @param {Actor} actor - Actor for trait lookups and bonus calculations
 * @returns {{diceRoll: number, diceKeep: number, traitBonus: number, label: string, description: string}} Roll parameters object
 * @example
 * // Button with data-roll="3" data-keep="2" data-trait="str" data-label="Damage"
 * const params = extractRollParams(button, actor);
 * // { diceRoll: 3, diceKeep: 2, traitBonus: 4, label: "Damage", description: "" }
 */
export function extractRollParams(el, actor) {
  const diceRoll = toInt(el.dataset.roll, 0);
  const diceKeep = toInt(el.dataset.keep, 0);
  const label = String(el.dataset.label ?? "");
  const description = String(el.dataset.description ?? "");
  
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
 * Resolve weapon skill/trait association for attack rolls.
 * Checks if the weapon has an associated skill that the character possesses,
 * otherwise falls back to the weapon's fallback trait.
 * 
 * **L5R4 Rule (Skills_and_Rolls.md):**
 * - Skilled roll: (Skill + Trait)k(Trait)
 * - Unskilled roll: (Trait)k(Trait)
 * 
 * @param {Actor} actor - The actor making the attack
 * @param {Item} weapon - The weapon item (weapon or bow type)
 * @returns {{skillRank: number, traitValue: number, rollBonus: number, keepBonus: number, description: string}} Roll parameters
 * @example
 * const attack = resolveWeaponSkillTrait(actor, katana);
 * // {
 * //   skillRank: 5,
 * //   traitValue: 4,
 * //   rollBonus: 9,  // (Skill + Trait) = 5 + 4
 * //   keepBonus: 4,  // (Trait) = 4
 * //   description: "Kenjutsu (5) + AGI (4)"
 * // }
 */
export function resolveWeaponSkillTrait(actor, weapon) {
  if (!weapon || !actor) {
    return { skillRank: 0, traitValue: 0, rollBonus: 0, keepBonus: 0, description: "No weapon/actor" };
  }

  const weaponSystem = weapon.system || {};
  const associatedSkill = String(weaponSystem.associatedSkill ?? "");
  
  // Defensive: Guard against Symbol or non-string fallbackTrait
  let fallbackTrait = weaponSystem.fallbackTrait ?? "agi";
  if (typeof fallbackTrait === "symbol") fallbackTrait = "agi";
  fallbackTrait = String(fallbackTrait || "agi");

  // Try to find the associated skill on the character
  // Case-insensitive matching to handle data import/export inconsistencies
  let skill = null;
  if (associatedSkill && associatedSkill.trim() && actor.items?.find) {
    const skillNameLower = associatedSkill.toLowerCase();
    skill = actor.items.find(i => {
      // Defensive: Guard against Symbol or non-string skill names
      if (i.type !== "skill" || typeof i.name === "symbol") return false;
      const itemName = String(i.name ?? "");
      return itemName.toLowerCase() === skillNameLower;
    });
  }

  if (skill) {
    // Use the skill + its associated trait
    const skillRank = toInt(skill.system?.rank || 0);
    
    // Defensive: Guard against Symbol or non-string trait
    let skillTrait = skill.system?.trait ?? fallbackTrait;
    if (typeof skillTrait === "symbol") skillTrait = fallbackTrait;
    skillTrait = String(skillTrait || fallbackTrait);
    
    const traitValue = getEffectiveTrait(actor, skillTrait);
    
    // Defensive: Guard against Symbol skill.name
    const skillName = typeof skill.name === "symbol" ? "Unknown Skill" : String(skill.name ?? "Unknown");
    
    return {
      skillRank,
      traitValue,
      rollBonus: skillRank + traitValue,  // Roll: Skill + Trait
      keepBonus: traitValue,               // Keep: Trait
      description: `${skillName} (${skillRank}) + ${skillTrait.toUpperCase()} (${traitValue})`
    };
  } else {
    // L5R4 Rule: Unskilled attack is (Trait)k(Trait)
    const traitValue = getEffectiveTrait(actor, fallbackTrait);
    
    return {
      skillRank: 0,
      traitValue,
      rollBonus: traitValue,  // Roll: Trait only
      keepBonus: traitValue,  // Keep: Trait
      description: `${fallbackTrait.toUpperCase()} (${traitValue}) - No skill`
    };
  }
}
