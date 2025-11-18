/**
 * @module shared-traits-rings
 * @description Prepares trait and Ring values for L5R4 actors.
 *
 * L5R4 Ring System:
 * - Characters have 8 traits grouped into 4 elemental Rings + Void
 * - Each Ring = minimum of its two associated traits
 * - Air: Reflexes & Awareness
 * - Earth: Stamina & Willpower
 * - Fire: Agility & Intelligence
 * - Water: Strength & Perception
 * - Void: Special - purchased separately, tracks current/max values
 *
 * Architecture:
 * - Normalizes trait values to integers
 * - Calculates Ring values from trait pairs
 * - Preserves Void Ring state (current/max points)
 * - Stores effective trait values in sys._derived.traitsEff
 *
 * Foundry Integration:
 * - Called during actor data preparation
 * - Modifies sys.rings and sys._derived in place
 */

import { TRAIT_KEYS } from "../../../config/reference-data.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

/**
 * Prepares trait and Ring values for an actor using L5R4 rules.
 *
 * @param {Object} sys - Actor's system data object to modify
 *
 * @description
 * Calculates Ring values from traits using L5R4 core mechanics:
 *
 * Ring Calculation:
 * - Each Ring = minimum of its two associated traits
 * - Air = min(Reflexes, Awareness)
 * - Earth = min(Stamina, Willpower)
 * - Fire = min(Agility, Intelligence)
 * - Water = min(Strength, Perception)
 * - Void = special (purchased separately, not calculated)
 *
 * Trait Normalization:
 * - Handles both object format (v.rank) and direct values
 * - Converts all values to integers
 * - Stores in sys._derived.traitsEff for consistent access
 *
 * Void Ring Special Handling:
 * - Preserves existing rank (purchased with XP)
 * - Tracks current value (spent Void Points)
 * - Tracks max value (total available Void Points)
 * - Falls back to rank if value/max not set
 *
 * Modifies sys with:
 * - _derived.traitsEff: Normalized trait values
 * - rings: Calculated Ring values (Air/Earth/Fire/Water/Void)
 *
 * @example
 * // Actor with Reflexes 3, Awareness 4
 * prepareTraitsAndRings(actor.system);
 * // actor.system.rings.air = 3 (minimum of 3 and 4)
 */
export function prepareTraitsAndRings(sys) {
  try {
    // Initialize derived data structure
    sys._derived = sys._derived || {};
    sys._derived.traitsEff = {};

    // Normalize all trait values to integers
    // Handles both {rank: X} format and direct numeric values
    for (const k of TRAIT_KEYS) {
      const v = sys.traits?.[k];
      sys._derived.traitsEff[k] = toInt(v?.rank ?? v);
    }

    const t = sys._derived.traitsEff;

    // Preserve Void Ring state before recalculating rings
    // Void is purchased separately and tracks current/max points
    const existingVoidRank = toInt(sys.rings?.void?.rank ?? 0);
    const existingVoidValue = sys.rings?.void?.value;
    const existingVoidMax = sys.rings?.void?.max;

    // Calculate Ring values using L5R4 formula: min(trait1, trait2)
    // This ensures a character must balance both traits to increase a Ring
    sys.rings = {
      air: Math.min(t.ref, t.awa), // Reflexes & Awareness
      earth: Math.min(t.sta, t.wil), // Stamina & Willpower
      fire: Math.min(t.agi, t.int), // Agility & Intelligence
      water: Math.min(t.str, t.per), // Strength & Perception
      void: {
        rank: existingVoidRank,
        // Current Void Points (spent during play)
        value: existingVoidValue !== undefined ? toInt(existingVoidValue) : existingVoidRank,
        // Maximum Void Points (total available)
        max: existingVoidMax !== undefined ? toInt(existingVoidMax) : existingVoidRank
      }
    };
  } catch (err) {
    logError("Failed to prepare traits and rings", err);

    // Provide safe fallback - default Ring values
    sys._derived = sys._derived || {};
    sys._derived.traitsEff = {
      sta: 2,
      wil: 2,
      str: 2,
      per: 2,
      ref: 2,
      awa: 2,
      agi: 2,
      int: 2
    };
    sys.rings = {
      air: 2,
      earth: 2,
      fire: 2,
      water: 2,
      void: { rank: 2, value: 2, max: 2 }
    };
  }
}
