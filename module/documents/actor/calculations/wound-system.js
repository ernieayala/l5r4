/**
 * @module documents/actor/calculations/wound-system
 * @description Prepares the Wound state every actor shares during actor data preparation: each Wound Rank's
 * threshold from the Earth Ring, and once the thresholds are set, each rank's effective penalty, the current rank from the Wounds suffered, the Wounds left, and
 * the healing rate. An NPC's thresholds come from npc-wound-system.js. Modifies `sys.woundLevels` and `sys.wounds` in
 * place.
 */

import { toInt } from "../../../utils/type-coercion.js";

/**
 * Set each Wound Rank's `penaltyEff`: its penalty plus the actor's `woundsPenaltyMod`, never below 0, and 0 for
 * Healthy and Out.
 * @param {object} sys - Actor's system data
 */
export function prepareWoundPenalties(sys) {
  const penaltyMod = toInt(sys.woundsPenaltyMod);
  for (const [key, lvl] of Object.entries(sys.woundLevels ?? {})) {
    lvl.penaltyEff = getEffectiveWoundPenalty(key, lvl.penalty, penaltyMod);
  }
}

/**
 * Set `sys.wounds.max` and `sys.wounds.value`, the Wounds left. The maximum is the GM's entry in manual mode when it
 * is above 0, otherwise the Out threshold.
 * @param {object} sys - Actor's system data
 * @param {number} suffered - Total wounds suffered
 */
export function prepareWoundState(sys, suffered) {
  sys.wounds = sys.wounds || {};
  const outMax = toInt(sys.woundLevels.out?.value) || 0;

  const isManualMode = sys.woundMode === "manual";
  const userMaxWounds = toInt(sys.wounds.max);

  // Determine maximum wounds
  if (isManualMode && userMaxWounds > 0) {
    sys.wounds.max = userMaxWounds; // User-defined max
  } else {
    sys.wounds.max = outMax; // "Out" threshold
  }

  // Calculate remaining wounds
  sys.wounds.value = Math.max(0, sys.wounds.max - toInt(suffered));
}

/**
 * The Wound Rank the suffered Wounds fall in: the first rank, in order, whose threshold they reach above the
 * previous rank's threshold. Each checked rank's `current` is set; Healthy when none matches.
 * @param {object} sys - Actor's system data
 * @param {string[]} levelsToCheck - Ordered array of wound level keys
 * @param {number} sCapped - Suffered wounds (capped to max)
 * @returns {object} The current wound level object
 */
export function prepareCurrentWoundLevel(sys, levelsToCheck, sCapped) {
  let current = sys.woundLevels.healthy;
  let lastVal = -1;

  // Check each wound level threshold
  for (const key of levelsToCheck) {
    const lvl = sys.woundLevels[key];
    if (!lvl) {
      continue;
    }

    const upper = toInt(lvl.value);
    // Check if suffered wounds fall in this level's range
    const within = sCapped <= upper && sCapped > lastVal;
    lvl.current = within;
    if (within) {
      current = lvl;
    }
    lastVal = upper;
  }

  return current;
}

/**
 * Healing per night's rest: twice Stamina plus Insight Rank, plus the healing modifiers. Sets `wounds.healRate` and
 * `_derived.healingStamina`.
 * game-rules/35_healing_wounds.md, p.84
 * @param {object} sys - Prepared system data, after the effective Traits are known
 * @param {number} insightRank - The PC's Insight Rank; an NPC counts as Rank 1 (NPC_INSIGHT_RANK)
 */
export function prepareHealRate(sys, insightRank) {
  const healingStamina = toInt(sys._derived.traitsEff.sta) + toInt(sys.wounds.healingStaminaMod);
  sys._derived.healingStamina = healingStamina;
  sys.wounds.healRate = healingStamina * 2 + insightRank + toInt(sys.wounds.mod);
}

/**
 * A Wound Rank's penalty with the penalty modifier, never below 0. Healthy and Out carry no penalty, so a modifier or
 * a stored penalty never gives them one: Out's character is unconscious and acts no more (roadmap/STAGE-18
 * decision 14, #102).
 * game-rules/33_wounds.md, p.82
 * @param {string} key - Wound level key
 * @param {number} penalty - The level's own penalty
 * @param {number} mod - The actor's wound penalty modifier
 * @returns {number}
 */
export function getEffectiveWoundPenalty(key, penalty, mod) {
  return key === "healthy" || key === "out" ? 0 : Math.max(0, toInt(penalty) + mod);
}

/**
 * One Wound Rank's threshold, the Wounds suffered that fill it: Healthy holds Earth × 5 whatever the campaign's
 * multiplier, each later rank Earth × the multiplier more than the one before it, each plus the flat Wounds
 * modifier. PC and NPC preparation both read their thresholds here.
 * game-rules/33_wounds.md, p.82
 * game-rules/34_ambush_falling_drowning.md, p.84
 * @param {string} key - Wound level key
 * @param {object} terms
 * @param {number} terms.earth - Earth Ring value
 * @param {number} terms.mult - The campaign's Earth multiplier for the ranks after Healthy
 * @param {number} terms.add - Flat Wounds modifier added to each rank
 * @param {number} terms.prev - The previous rank's threshold (0 for Healthy)
 * @returns {number}
 */
export function getWoundThreshold(key, { earth, mult, add, prev }) {
  return key === "healthy" ? 5 * earth + add : earth * mult + prev + add;
}
