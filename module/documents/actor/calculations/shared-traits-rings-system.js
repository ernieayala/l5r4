/**
 * @module documents/actor/calculations/shared-traits-rings-system
 * @description Prepares an actor's effective Traits, Rings, and movement during actor data preparation, for PCs and
 * NPCs alike. Each Elemental Ring is the lower of its two Traits; the Void Ring is bought on its own and keeps its
 * rank and its current and maximum Void Points. Modifies `sys.rings`, `sys._derived`, and `sys.movement` in place.
 * game-rules/25_rings_and_traits.md, p.76
 */

import { TRAIT_KEYS } from "../../../config/reference-data.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

/**
 * The four Elemental Rings from Traits: each the lower of its two Traits.
 * game-rules/25_rings_and_traits.md, p.76
 * @param {Record<string, number>} t - Trait ranks by key
 * @returns {{air: number, earth: number, fire: number, water: number}}
 */
export function ringsOf(t) {
  return {
    air: Math.min(t.ref, t.awa),
    earth: Math.min(t.sta, t.wil),
    fire: Math.min(t.agi, t.int),
    water: Math.min(t.str, t.per)
  };
}

/**
 * Prepare the effective Traits as integers in `sys._derived.traitsEff` (a Trait stored as `{rank}` or as a number)
 * and the Rings in `sys.rings`. The Void Ring keeps its rank, and its current and maximum Void Points fall back to
 * the rank when unset. A failure is logged and leaves every Trait and Ring at 2, so preparation goes on.
 * @param {object} sys - Actor's system data object to modify
 */
export function prepareTraitsAndRings(sys) {
  try {
    prepareEffectiveTraits(sys);
    prepareRings(sys);
  } catch (err) {
    logError("Failed to prepare traits and rings", err);
    prepareFallbackTraitsAndRings(sys);
  }
}

/**
 * Prepare `sys.movement`: the Free Action, Simple Action, and per-Round distances, 5, 10, and 20 feet per point of
 * Water, times the movement multiplier, plus the flat movement modifier. A Movement rule changes the Water used for
 * movement only, as Blinded's -2 does, through `sys.movementWater` (module/documents/actor/rules.js); that Water is
 * never below 1.
 * game-rules/41_conditional_effects.md, p.89
 * @param {object} sys - Actor's system data object to modify
 */
export function prepareMovement(sys) {
  const baseWater = toInt(sys.rings.water);
  const effectiveWater = Math.max(1, baseWater + sys.movementWater);

  sys.movement = sys.movement || {};
  const movementMultiplier = parseFloat(sys.movement.multiplier) || 1;
  const movementModifier = toInt(sys.movement.modifier) || 0;

  sys.movement.freeAction = effectiveWater * 5 * movementMultiplier + movementModifier;
  sys.movement.simpleAction = effectiveWater * 10 * movementMultiplier + movementModifier;
  sys.movement.maximum = effectiveWater * 20 * movementMultiplier + movementModifier;
}

/**
 * Prepare `sys._derived.traitsEff`: every Trait as an integer, whether stored as `{rank}` or as a number.
 * @param {object} sys - Actor's system data object to modify
 */
function prepareEffectiveTraits(sys) {
  sys._derived = sys._derived || {};
  sys._derived.traitsEff = {};

  for (const k of TRAIT_KEYS) {
    const v = sys.traits?.[k];
    sys._derived.traitsEff[k] = toInt(v?.rank ?? v);
  }
}

/**
 * Prepare `sys.rings` from the effective Traits. The Void Ring is bought on its own: it keeps its rank, and its
 * current and maximum Void Points fall back to the rank when unset.
 * game-rules/25_rings_and_traits.md, p.76
 * @param {object} sys - Actor's system data object to modify, after prepareEffectiveTraits
 */
function prepareRings(sys) {
  // Read the Void Ring before the Rings are replaced
  const existingVoidRank = toInt(sys.rings?.void?.rank ?? 0);
  const existingVoidValue = sys.rings?.void?.value;
  const existingVoidMax = sys.rings?.void?.max;

  sys.rings = {
    ...ringsOf(sys._derived.traitsEff),
    void: {
      rank: existingVoidRank,
      // Current Void Points (spent during play)
      value: existingVoidValue !== undefined ? toInt(existingVoidValue) : existingVoidRank,
      // Maximum Void Points (total available)
      max: existingVoidMax !== undefined ? toInt(existingVoidMax) : existingVoidRank
    }
  };
}

/**
 * Set every Trait and Ring to 2 after a failed preparation, so the rest of preparation goes on.
 * @param {object} sys - Actor's system data object to modify
 */
function prepareFallbackTraitsAndRings(sys) {
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
