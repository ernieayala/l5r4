/**
 * @module documents/actor/calculations/wound-system
 * @description Prepares an actor's Wound Ranks during actor data preparation: each rank's threshold and penalty,
 * the current rank from the Wounds suffered, the Wounds left, the healing rate, and the ranks the sheet shows. An NPC's
 * thresholds come from its Earth Ring (formula mode) or from the GM's entries (manual mode), with one to eight ranks
 * in use and Out always last. Modifies `sys.woundLevels`, `sys.wounds`, and `sys.visibleWoundLevels` in place.
 */

import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../../../config/game-mechanics.js";
import { toInt, getClamped } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";

/**
 * The Wound Rank keys in use for a count of ranks: Healthy and Out for 1, Healthy, Nicked, and Out for 2, otherwise
 * the first ranks of WOUND_LEVEL_ORDER with the last one replaced by Out, so Out always ends the list.
 * @param {number} nrWoundLvls - Number of wound levels (1-8)
 * @returns {string[]} Array of wound level keys to use
 */
export function getWoundLevelsForCount(nrWoundLvls) {
  const count = getClamped(nrWoundLvls ?? 3, 1, 8);

  // Two levels tracked: Healthy and Out
  if (count === 1) {
    return ["healthy", "out"];
  }
  if (count === 2) {
    return ["healthy", "nicked", "out"];
  }
  // Use first N levels from standard order
  const levels = WOUND_LEVEL_ORDER.slice(0, count);
  // Ensure last level is always "out"
  if (!levels.includes("out")) {
    levels[levels.length - 1] = "out";
  }
  return levels;
}

/**
 * Set each Wound Rank's `penaltyEff`: its penalty plus the actor's `woundsPenaltyMod`, never below 0, and 0 for
 * Healthy.
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
 * Prepare an NPC's Wound Ranks in manual mode: the GM's thresholds and penalties from `sys.manualWoundLevels`
 * (Healthy, Nicked, and Out active by default), each rank in use above the one before it.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
export function prepareNpcManualWounds(sys, order) {
  try {
    // Initialize manual wound levels with defaults
    if (!sys.manualWoundLevels) {
      sys.manualWoundLevels = {};
    }

    for (const key of order) {
      if (!sys.manualWoundLevels[key]) {
        sys.manualWoundLevels[key] = {
          value: DEFAULT_WOUND_THRESHOLDS[key] || 0,
          penalty: DEFAULT_WOUND_PENALTIES[key] || 0,
          active: key === "healthy" || key === "nicked" || key === "out"
        };
      }
    }

    // Copy manual values to active wound levels
    for (const key of order) {
      const manual = sys.manualWoundLevels[key];
      const lvl =
        sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });

      lvl.value = Math.max(0, toInt(manual.value));
      lvl.penalty = Math.max(0, toInt(manual.penalty));

      lvl.isActive = manual.active === true;
      lvl.isVisible = true;
    }

    // Ensure the levels in use have strictly increasing thresholds; an unused level holds no Wounds, so its value
    // never pushes the next one up (a creature's "124: Dead" stays 124)
    // game-rules/99_creatures.md, p.318
    let prevValue = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      if (!lvl.isActive) {
        continue;
      }
      if (lvl.value <= prevValue && key !== "healthy") {
        lvl.value = prevValue + 1; // Force increment
      }
      prevValue = lvl.value;
    }
  } catch (err) {
    logError("Failed to prepare NPC manual wounds", err);
    // Leave sys.woundLevels unchanged or provide minimal fallback
  }
}

/**
 * Prepare an NPC's Wound Ranks in formula mode, from its Earth Ring, Wounds multiplier, and Wounds modifier. Ranks
 * out of use are hidden and hold the previous threshold. When the GM sets a maximum other than the Out threshold,
 * every threshold scales by the same factor, rounded up and kept strictly increasing, so a GM can make an NPC
 * tougher or frailer without changing the spacing of its ranks.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
export function prepareNpcFormulaWounds(sys, order) {
  try {
    const earth = sys.rings.earth;
    const mult = toInt(sys.woundsMultiplier) || 2;
    const add = toInt(sys.woundsMod) || 0;

    const nrWoundLvls = toInt(sys.nrWoundLvls) || 3;
    const activeOrder = getWoundLevelsForCount(nrWoundLvls);

    // Calculate thresholds for active levels
    let prev = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = {});

      lvl.current = false;

      if (activeOrder.includes(key)) {
        // Active level: calculate threshold
        lvl.value = getWoundThreshold(key, earth, mult, add, prev);
        prev = lvl.value;
        lvl.isActive = true;
        lvl.isVisible = true;

        lvl.penalty = DEFAULT_WOUND_PENALTIES[key] || 0;
      } else {
        // Inactive level: hide and use previous threshold
        lvl.value = prev;
        lvl.penalty = 0;
        lvl.isActive = false;
        lvl.isVisible = false;
      }
    }

    // Optional scaling if custom max wounds set
    // This allows GMs to adjust NPC durability while maintaining relative wound level spacing
    const npcMax = toInt(sys.wounds?.max);
    const outDerived = toInt(sys.woundLevels.out?.value);
    if (npcMax > 0 && outDerived > 0 && npcMax !== outDerived) {
      // Scale all thresholds proportionally to match custom max
      // Example: If "Out" calculated as 40 but GM set max to 60, scale factor is 1.5
      const factor = npcMax / outDerived;
      let prevScaled = 0;
      for (const key of order) {
        const lvl = sys.woundLevels[key];
        const orig = toInt(lvl.value);
        let scaled = Math.ceil(orig * factor);
        // Ensure strictly increasing and minimum values
        // Healthy must be at least 1, others must exceed previous level
        scaled = key === "healthy" ? Math.max(1, scaled) : Math.max(prevScaled + 1, scaled);
        lvl.value = scaled;
        prevScaled = scaled;
      }
    }
  } catch (err) {
    logError("Failed to prepare NPC formula wounds", err);
    // Leave sys.woundLevels unchanged or provide minimal fallback
  }
}

/**
 * The Wound Rank the suffered Wounds fall in, checking only the active ranks in manual mode and every rank in
 * formula mode.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 * @param {number} sCapped - Suffered wounds (capped to max)
 * @param {string} woundMode - "manual" or "formula"
 * @returns {object} The current wound level object
 */
export function prepareCurrentWoundLevelByMode(sys, order, sCapped, woundMode) {
  // Filter levels based on mode
  const levelsToCheck =
    woundMode === "manual"
      ? order.filter(key => sys.manualWoundLevels?.[key]?.active === true)
      : order;

  return prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);
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
 * Prepare the Wound Ranks the sheet shows: `sys.visibleManualWoundLevels`, the manual entries for the wound
 * settings table, and `sys.visibleWoundLevels`, the active manual ranks in manual mode or, in formula mode, the
 * ranks computed again from the current Earth Ring and modifiers with the current rank marked.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
export function prepareVisibleWoundLevels(sys, order) {
  const nrWoundLvls = getClamped(toInt(sys.nrWoundLvls) || 3, 1, 8);
  const isManualMode = sys.woundMode === "manual";

  const baseVisibleOrder = getWoundLevelsForCount(nrWoundLvls);

  sys.visibleWoundLevels = {};
  sys.visibleManualWoundLevels = {};

  // The manual levels for the wound settings table (templates/apps/wound-config.hbs). The prepared wound levels
  // stay as the wound mode made them: formula thresholds in formula mode (#38)
  for (const key of order) {
    if (sys.manualWoundLevels && sys.manualWoundLevels[key]) {
      sys.visibleManualWoundLevels[key] = sys.manualWoundLevels[key];
    }
  }

  if (isManualMode) {
    // Manual mode: show only active levels
    for (const key of order) {
      const manual = sys.manualWoundLevels?.[key];
      const woundLevel = sys.woundLevels?.[key];

      if (manual?.active === true && woundLevel) {
        sys.visibleWoundLevels[key] = woundLevel;
      }
    }
  } else {
    // Formula mode: recalculate for current stats
    const earth = toInt(sys.rings?.earth);
    const mult = toInt(sys.woundsMultiplier) || 2;
    const add = toInt(sys.woundsMod) || 0;
    const penaltyMod = toInt(sys.woundsPenaltyMod) || 0;

    let prev = 0;
    for (const key of baseVisibleOrder) {
      const value = getWoundThreshold(key, earth, mult, add, prev);
      prev = value;

      const basePenalty = toInt(DEFAULT_WOUND_PENALTIES?.[key]) || 0;
      const penaltyEff = getEffectiveWoundPenalty(key, basePenalty, penaltyMod);

      sys.visibleWoundLevels[key] = {
        value,
        penalty: basePenalty,
        penaltyEff,
        current: false
      };
    }

    // Mark current wound level
    const outMax = toInt(sys.visibleWoundLevels.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    prepareCurrentWoundLevel({ woundLevels: sys.visibleWoundLevels }, baseVisibleOrder, sCapped);
  }
}

/**
 * A Wound Rank's penalty with the penalty modifier, never below 0. Healthy carries no penalty, so a modifier never
 * gives it one.
 * game-rules/33_wounds.md, p.82
 * @param {string} key - Wound level key
 * @param {number} penalty - The level's own penalty
 * @param {number} mod - The actor's wound penalty modifier
 * @returns {number}
 */
function getEffectiveWoundPenalty(key, penalty, mod) {
  return key === "healthy" ? 0 : Math.max(0, toInt(penalty) + mod);
}

/**
 * One Wound Rank's threshold: Healthy holds 5 × Earth, each later rank Earth × the multiplier more than the one
 * before it, each plus the flat modifier.
 * @param {string} key - Wound level key
 * @param {number} earth - Earth Ring value
 * @param {number} mult - Multiplier for subsequent levels
 * @param {number} add - Flat modifier to add
 * @param {number} prev - Previous level's threshold
 * @returns {number} Calculated wound threshold
 */
function getWoundThreshold(key, earth, mult, add, prev) {
  return key === "healthy" ? 5 * earth + add : earth * mult + prev + add;
}
