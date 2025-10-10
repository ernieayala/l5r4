/**
 * @fileoverview L5R4 Shared Traits and Rings Calculation
 * 
 * Provides shared logic for computing effective traits and elemental rings
 * from base trait values. Used by both PC and NPC preparation to ensure
 * consistent calculation across actor types.
 * 
 * **Core Responsibilities:**
 * - **Trait Extraction**: Convert trait data to normalized effective values
 * - **Ring Calculation**: Compute elemental rings from trait pairs
 * - **Void Handling**: Initialize void ring structure with current/max tracking
 * 
 * **L5R4 Ring Rules:**
 * - **Air Ring**: min(Reflexes, Awareness)
 * - **Earth Ring**: min(Stamina, Willpower)
 * - **Fire Ring**: min(Agility, Intelligence)
 * - **Water Ring**: min(Strength, Perception)
 * - **Void Ring**: User-controlled, not derived from traits
 * 
 * **Active Effects Integration:**
 * Foundry applies Active Effects before calling prepareDerivedData, so
 * system.traits already contains final effective values including all bonuses
 * from Family, School, items, and temporary effects.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Actor.applyActiveEffects}
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Compute effective traits and elemental rings from base trait values.
 * Shared logic between PC and NPC preparation to ensure consistency.
 * 
 * **Trait Processing:**
 * - Extracts effective trait values after Active Effects are applied
 * - Stores normalized values in `sys._derived.traitsEff` for sheet access
 * - Handles both simple numeric values and `{rank: number}` objects
 * 
 * **Ring Calculation:**
 * - Air = min(Reflexes, Awareness)
 * - Earth = min(Stamina, Willpower) 
 * - Fire = min(Agility, Intelligence)
 * - Water = min(Strength, Perception)
 * - Void remains user-controlled (not derived)
 * 
 * @param {object} sys - The actor's system data object
 * @param {Record<string, number|{rank?: number}>} sys.traits - Character traits
 * @param {object} [sys.rings] - Existing rings data
 * @param {object} [sys._derived] - Derived data storage
 * @returns {void} - Modifies sys.rings and sys._derived.traitsEff in place
 * 
 * @example
 * // Called during PC/NPC preparation
 * prepareTraitsAndRings(sys);
 * 
 * // Access computed values
 * const earthRing = sys.rings.earth; // min(Stamina, Willpower)
 * const effectiveStamina = sys._derived.traitsEff.sta; // Post-AE value
 */
export function prepareTraitsAndRings(sys) {
  // L5R4's 8 core traits: 4 Physical (sta, str, ref, agi) and 4 Mental (wil, per, awa, int)
  const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
  
  /**
   * Extract effective trait value after Active Effects.
   * Handles both simple numbers and {rank: number} objects from template.json
   * @param {string} k - Trait key (e.g., "sta", "ref")
   * @returns {number} Normalized trait value
   */
  const TR = k => {
    const v = sys.traits?.[k];
    return toInt(v?.rank ?? v);
  };

  // Store normalized effective trait values in _derived for sheet access
  // This provides a clean numeric interface for templates after AE application
  sys._derived = sys._derived || {};
  const traitsEff = {};
  for (const k of TRAIT_KEYS) {
    const base = sys.traits?.[k];
    traitsEff[k] = toInt(base?.rank ?? base);
  }
  sys._derived.traitsEff = traitsEff;

  // Rings from traits
  sys.rings = {
    ...sys.rings,
    air:   Math.min(TR("ref"), TR("awa")),
    earth: Math.min(TR("sta"), TR("wil")),
    fire:  Math.min(TR("agi"), TR("int")),
    water: Math.min(TR("str"), TR("per"))
  };
  
  // Void ring requires special handling: tracks current/max/rank unlike other rings
  // Initialize structure if missing and normalize values to integers
  sys.rings.void = {
    rank: toInt(sys.rings?.void?.rank ?? 0),
    value: toInt(sys.rings?.void?.value ?? 0),
    max: toInt(sys.rings?.void?.max ?? 0)
  };
}
