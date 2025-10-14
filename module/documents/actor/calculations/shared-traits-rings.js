/**
 * Shared Traits and Rings Calculations
 * 
 * Core trait and ring computation module for L5R4 character sheets. Calculates
 * effective trait values and derives ring ranks per Legend of the Five Rings 4th
 * Edition core rules. Used during Actor Document data preparation lifecycle.
 * 
 * Key Responsibilities:
 * - **Effective Trait Calculation**: Extract and coerce trait rank values to integers
 * - **Ring Derivation**: Compute ring ranks as minimum of component traits per L5R4 rules
 * - **Void Ring Handling**: Preserve void ring structure (rank/value/max)
 * - **Defensive Parsing**: Handle missing/malformed trait data gracefully
 * 
 * L5R4 Game Rules Context:
 * Each of the four elemental rings (Air, Earth, Fire, Water) is composed of two traits:
 * - **Air**: Reflexes (Physical) + Awareness (Mental)
 * - **Earth**: Stamina (Physical) + Willpower (Mental)
 * - **Fire**: Agility (Physical) + Intelligence (Mental)
 * - **Water**: Strength (Physical) + Perception (Mental)
 * 
 * Ring rank always equals the LOWER of its two component traits. For example, if a
 * character has Agility 4 and Intelligence 2, their Fire ring is 2. This encourages
 * balanced character development across physical and mental attributes.
 * 
 * Void is special - it has no component traits and instead provides Void Points equal
 * to its rank. Characters spend Void Points for powerful effects like +1k1 to rolls.
 * 
 * Foundry VTT Integration:
 * - Called from Actor.prepareDerivedData() lifecycle hook (Foundry v13+)
 * - Mutates actor.system object in place per Foundry data preparation pattern
 * - Stores intermediate values in sys._derived for use by other calculation modules
 * - Safe to call multiple times (idempotent) during data preparation
 * 
 * @module documents/actor/calculations/shared-traits-rings
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#prepareDerivedData|Foundry prepareDerivedData}
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Prepare effective traits and derive ring ranks per L5R4 core rules.
 * 
 * Calculates effective trait values from actor.system.traits and derives elemental ring
 * ranks using the core L5R4 mechanic: Ring = min(trait1, trait2). Mutates the provided
 * system object in place, populating sys._derived.traitsEff and sys.rings.
 * 
 * **L5R4 Ring Calculation Rules:**
 * - Air Ring = min(Reflexes, Awareness)
 * - Earth Ring = min(Stamina, Willpower)
 * - Fire Ring = min(Agility, Intelligence)
 * - Water Ring = min(Strength, Perception)
 * - Void Ring = special structure with rank/value/max properties
 * 
 * **Trait Data Handling:**
 * Supports two trait data formats for backward compatibility:
 * - Object format: `sys.traits.ref = { rank: 3 }` (preferred)
 * - Direct format: `sys.traits.ref = 3` (legacy)
 * 
 * Both formats are coerced to integers defensively using toInt(), so missing traits
 * default to 0 and malformed values are handled gracefully.
 * 
 * **Void Ring Structure:**
 * Unlike elemental rings (which are simple integers), void ring maintains:
 * - `rank`: Character's void ring rank (determines max void points)
 * - `value`: Current void points available (spent/recovered during play)
 * - `max`: Maximum void points (typically equals rank)
 * 
 * This function preserves the existing void ring structure from sys.rings.void,
 * coercing each property to ensure numeric safety.
 * 
 * **Mutation Pattern:**
 * This function directly mutates the `sys` parameter per Foundry's data preparation
 * pattern. It creates/updates:
 * - `sys._derived.traitsEff` - Effective trait values (used by other calculations)
 * - `sys.rings.air/earth/fire/water` - Derived elemental ring ranks
 * - `sys.rings.void` - Normalized void ring structure
 * 
 * **Usage Context:**
 * Called during Actor.prepareDerivedData() for both PC and NPC actor types.
 * Must execute before other calculations that depend on ring values (wounds,
 * initiative, armor TN, insight rank, etc.).
 * 
 * Requires Foundry v13+ Actor Document data preparation lifecycle.
 * 
 * @param {Object} sys - Actor system data object (actor.system) to mutate
 * @param {Object} [sys.traits] - Character traits object with 8 trait properties
 * @param {number|Object} [sys.traits.sta] - Stamina (Earth/Physical)
 * @param {number|Object} [sys.traits.wil] - Willpower (Earth/Mental)
 * @param {number|Object} [sys.traits.str] - Strength (Water/Physical)
 * @param {number|Object} [sys.traits.per] - Perception (Water/Mental)
 * @param {number|Object} [sys.traits.ref] - Reflexes (Air/Physical)
 * @param {number|Object} [sys.traits.awa] - Awareness (Air/Mental)
 * @param {number|Object} [sys.traits.agi] - Agility (Fire/Physical)
 * @param {number|Object} [sys.traits.int] - Intelligence (Fire/Mental)
 * @param {Object} [sys.rings] - Existing rings object (void ring structure preserved)
 * @param {Object} [sys.rings.void] - Void ring with rank/value/max properties
 * @param {Object} [sys._derived] - Derived data container (created if missing)
 * @returns {void} Mutates sys in place, does not return a value
 */
export function prepareTraitsAndRings(sys) {

  // L5R4 trait abbreviations: sta=Stamina, wil=Willpower, str=Strength, per=Perception,
  // ref=Reflexes, awa=Awareness, agi=Agility, int=Intelligence (8 traits total)
  const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];

  // Initialize derived data container and effective traits object
  sys._derived = sys._derived || {};
  sys._derived.traitsEff = {};
  
  // Extract effective trait values, supporting both object format (v.rank) and direct format (v)
  // for backward compatibility. Missing traits default to 0 via toInt() defensive coercion.
  for (const k of TRAIT_KEYS) {
    const v = sys.traits?.[k];
    sys._derived.traitsEff[k] = toInt(v?.rank ?? v);
  }

  // Calculate elemental ring ranks per L5R4 core rules: Ring = min(physical_trait, mental_trait)
  // This encourages balanced development - improving a ring requires raising BOTH component traits
  const t = sys._derived.traitsEff;
  sys.rings = {
    ...sys.rings,
    air:   Math.min(t.ref, t.awa),
    earth: Math.min(t.sta, t.wil),
    fire:  Math.min(t.agi, t.int),
    water: Math.min(t.str, t.per)
  };

  // Void ring is special: unlike elemental rings, it maintains a structure with rank (permanent),
  // value (current points), and max (typically equals rank). Preserve existing structure while
  // ensuring numeric safety for all properties.
  sys.rings.void = {
    rank: toInt(sys.rings?.void?.rank ?? 0),
    value: toInt(sys.rings?.void?.value ?? 0),
    max: toInt(sys.rings?.void?.max ?? 0)
  };
}
