/**
 * Bonus Applicator Service
 * 
 * Retrieves and combines roll bonuses from actor data for L5R4 dice rolls.
 * Bonuses modify rolled dice (+Xk0), kept dice (+0kX), or final totals (+X)
 * per Legend of the Five Rings 4th Edition roll mechanics.
 * 
 * Key Responsibilities:
 * - **Bonus Retrieval**: Read bonuses from actor.system.bonuses.{category}.{name}
 * - **Type Safety**: Return standardized bonus objects with defensive fallbacks
 * - **Combination Logic**: Additively combine skill and trait bonuses
 * - **Case-Insensitive Matching**: Handle bonus keys regardless of case
 * 
 * L5R4 Game Mechanics:
 * - Bonuses apply to skill rolls (Skill+Trait)k(Trait), trait rolls (Trait)k(Trait),
 *   and ring rolls (Ring)k(Ring)
 * - Sources include advantages, disadvantages, techniques, spells, stances, equipment
 * - Bonuses stack additively (e.g., +1k0 from advantage + +1k0 from spell = +2k0)
 * 
 * Foundry VTT Integration:
 * - Reads from Actor Data Model (actor.system.bonuses)
 * - Used by SkillRoll, TraitRoll, RingRoll services
 * - Defensive against missing/malformed data (returns zero bonuses)
 * 
 * @module services/dice/effects/bonus-applicator
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.DataModel.html|Foundry DataModel}
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Standard bonus object structure for L5R4 dice rolls.
 * 
 * Bonuses modify three aspects of a roll:
 * - **roll**: Additional rolled dice (e.g., +2k0 adds 2 rolled dice)
 * - **keep**: Additional kept dice (e.g., +0k1 adds 1 kept die)
 * - **total**: Flat modifier to final total (e.g., +5 adds 5 to result)
 * 
 * All values are integers. Zero indicates no bonus for that aspect.
 * Negative values are permitted for penalties.
 * 
 * **L5R4 Mechanics:**
 * Roll bonuses increase chance of high results (more dice to choose from).
 * Keep bonuses directly increase average result (more dice summed).
 * Total bonuses provide guaranteed flat increases/decreases.
 * 
 * @typedef {Object} BonusObject
 * @property {number} roll - Additional rolled dice (XkY: modifies X)
 * @property {number} keep - Additional kept dice (XkY: modifies Y)
 * @property {number} total - Flat modifier to final total
 */

/**
 * Retrieve bonuses from actor data for a specific category and name.
 * 
 * Searches actor.system.bonuses[category][name] for bonus data, applying
 * defensive fallbacks for missing or malformed data. Returns a standardized
 * BonusObject with zero values if no bonuses exist.
 * 
 * **Case-Insensitive Matching:**
 * Converts name to lowercase before lookup to handle inconsistent casing
 * from user input, item names, and DOM dataset attributes. Uses optional
 * chaining on toLowerCase() to safely handle non-string values.
 * 
 * **Defensive Programming:**
 * - Returns zero bonuses if actor, system, or bonuses structure is missing
 * - Falls back to empty object if specific bonus entry doesn't exist
 * - Coerces all bonus values to integers via toInt() utility
 * 
 * **L5R4 Context:**
 * Bonuses are stored per-category (skill, trait, ring) with keys matching
 * the skill/trait/ring name (e.g., bonuses.skill.iaijutsu or bonuses.trait.reflexes).
 * 
 * @param {L5R4Actor} actor - The actor to retrieve bonuses from
 * @param {string} category - Bonus category ("skill", "trait", or "ring")
 * @param {string} name - Specific skill/trait/ring name to look up
 * @returns {BonusObject} Bonus object with roll, keep, total properties (zero if none)
 * @private
 */
function applyBonuses(actor, category, name) {
  // Early return with zero bonuses if actor data structure is missing
  if (!actor?.system?.bonuses?.[category]) {
    return { roll: 0, keep: 0, total: 0 };
  }

  // Convert name to lowercase for case-insensitive matching
  // Optional chaining handles cases where name is not a string
  const key = String(name).toLowerCase?.();
  const bonus = actor.system.bonuses[category][key] || {};

  // Coerce all bonus values to integers with zero fallback
  return {
    roll: toInt(bonus.roll),
    keep: toInt(bonus.keep),
    total: toInt(bonus.total)
  };
}

/**
 * Retrieve skill-specific bonuses for an actor.
 * 
 * Looks up bonuses stored in actor.system.bonuses.skill[skillName] and returns
 * a standardized BonusObject. Useful for skill rolls that need to apply passive
 * bonuses from advantages, techniques, or equipment.
 * 
 * **L5R4 Mechanics:**
 * Skill bonuses typically come from:
 * - Advantages (e.g., Prodigy grants +1k0 to a specific skill)
 * - Techniques (e.g., school techniques may grant skill bonuses)
 * - Equipment (e.g., Superior Craftsmanship weapons grant +1k0 to attack skills)
 * - Temporary effects from spells or conditions
 * 
 * **Usage:**
 * Called by SkillRoll service before constructing the roll formula.
 * Skill bonuses are combined with trait bonuses via applySkillAndTraitBonuses.
 * 
 * @param {L5R4Actor} actor - The actor to retrieve bonuses for
 * @param {string} skillName - Name of the skill (e.g., "kenjutsu", "investigation")
 * @returns {BonusObject} Skill bonuses with roll, keep, total properties
 */
export function applySkillBonuses(actor, skillName) {
  return applyBonuses(actor, "skill", skillName);
}

/**
 * Retrieve trait-specific bonuses for an actor.
 * 
 * Looks up bonuses stored in actor.system.bonuses.trait[traitName] and returns
 * a standardized BonusObject. Used for both trait rolls and as part of skill
 * roll calculations (since skill rolls use Trait for kept dice).
 * 
 * **L5R4 Mechanics:**
 * Trait bonuses typically come from:
 * - Advantages (e.g., Great Potential grants +1k0 to a specific trait)
 * - Spells (e.g., some Water spells grant Perception bonuses)
 * - Shadowlands Powers (e.g., Monstrous Strength grants Strength bonuses)
 * - Temporary conditions or stance effects
 * 
 * **Usage:**
 * Called by TraitRoll service for pure trait rolls and by SkillRoll service
 * as part of skill+trait combination rolls.
 * 
 * @param {L5R4Actor} actor - The actor to retrieve bonuses for
 * @param {string} traitName - Name of the trait (e.g., "reflexes", "willpower")
 * @returns {BonusObject} Trait bonuses with roll, keep, total properties
 */
export function applyTraitBonuses(actor, traitName) {
  return applyBonuses(actor, "trait", traitName);
}

/**
 * Retrieve ring-specific bonuses for an actor.
 * 
 * Looks up bonuses stored in actor.system.bonuses.ring[ringName] and returns
 * a standardized BonusObject. Used for ring rolls (less common than skill/trait)
 * and for spellcasting rolls which use (Ring + School Rank)k(Ring).
 * 
 * **L5R4 Mechanics:**
 * Ring bonuses typically come from:
 * - Kiho (mystical techniques that enhance elemental rings)
 * - Tattoos (Togashi monk tattoos grant ring bonuses)
 * - Spells (some spells temporarily boost elemental rings)
 * - Rare advantages or techniques affecting elemental balance
 * 
 * **Usage:**
 * Called by RingRoll service for pure ring rolls and potentially by
 * spellcasting systems for casting roll calculations.
 * 
 * @param {L5R4Actor} actor - The actor to retrieve bonuses for
 * @param {string} ringName - Name of the ring (e.g., "fire", "water", "void")
 * @returns {BonusObject} Ring bonuses with roll, keep, total properties
 */
export function applyRingBonuses(actor, ringName) {
  return applyBonuses(actor, "ring", ringName);
}

/**
 * Combine skill and trait bonuses for skill roll calculations.
 * 
 * Additively combines bonuses from both the skill and trait being used,
 * returning a unified BonusObject with summed values. This matches L5R4
 * mechanics where skill and trait bonuses stack.
 * 
 * **L5R4 Mechanics:**
 * Skill rolls use (Skill + Trait)k(Trait) formula. Both the skill and the
 * associated trait can have independent bonuses that stack:
 * - Skill bonus: +1k0 Kenjutsu (from Prodigy advantage)
 * - Trait bonus: +0k1 Agility (from Great Potential advantage)
 * - Combined: +1k1 total bonus to Kenjutsu/Agility roll
 * 
 * **Additive Stacking:**
 * All three bonus types (roll, keep, total) are summed independently.
 * This is intentional per L5R4 rules - bonuses from different sources stack.
 * 
 * **Usage:**
 * Called by SkillRoll service (line 43 in skill-roll.js) to get total bonuses
 * before constructing the final roll formula.
 * 
 * @param {L5R4Actor} actor - The actor to retrieve bonuses for
 * @param {string} skillName - Name of the skill (e.g., "kenjutsu", "investigation")
 * @param {string} traitName - Name of the trait (e.g., "agility", "intelligence")
 * @returns {BonusObject} Combined bonuses with summed roll, keep, total properties
 */
export function applySkillAndTraitBonuses(actor, skillName, traitName) {
  const skillBonuses = applySkillBonuses(actor, skillName);
  const traitBonuses = applyTraitBonuses(actor, traitName);

  // Additive combination per L5R4 stacking rules
  return {
    roll: skillBonuses.roll + traitBonuses.roll,
    keep: skillBonuses.keep + traitBonuses.keep,
    total: skillBonuses.total + traitBonuses.total
  };
}
