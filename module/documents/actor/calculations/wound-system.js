/**
 * @module wound-system
 * @description Manages L5R4 wound tracking and wound level calculations.
 *
 * L5R4 Wound System:
 * - Characters track cumulative wounds (damage taken)
 * - Wound levels define thresholds and penalties
 * - Standard levels: Healthy, Nicked, Grazed, Hurt, Injured, Crippled, Down, Out
 * - Each level has a threshold (wounds needed) and penalty (TN increase)
 * - "Out" level = character is incapacitated/dead
 *
 * Two Calculation Modes:
 * - Formula Mode: Thresholds calculated from Earth Ring (standard L5R4)
 * - Manual Mode: Thresholds set manually (for custom NPCs)
 *
 * Architecture:
 * - Supports variable wound level counts (1-8 levels)
 * - Calculates effective penalties with modifiers
 * - Tracks current wound level based on suffered wounds
 * - Handles NPC wound scaling for balance
 *
 * Foundry Integration:
 * - Called during actor data preparation
 * - Modifies sys.woundLevels, sys.wounds, sys.visibleWoundLevels
 */

import { toInt, clamp } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../constants/wound-constants.js";

/**
 * Returns the active wound level keys for a given wound level count.
 *
 * @param {number} nrWoundLvls - Number of wound levels (1-8)
 * @returns {string[]} Array of wound level keys to use
 *
 * @description
 * Determines which wound levels are active based on count:
 * - 1 level: ["healthy", "out"] (minimal tracking)
 * - 2 levels: ["healthy", "nicked", "out"] (simple)
 * - 3+ levels: First N levels from WOUND_LEVEL_ORDER
 *
 * Always ensures "out" is the final level (incapacitation).
 *
 * @example
 * getWoundLevelsForCount(3);
 * // Returns: ["healthy", "nicked", "grazed"]
 * // But "grazed" becomes "out" to ensure proper end state
 */
export function getWoundLevelsForCount(nrWoundLvls) {
  const count = clamp(nrWoundLvls ?? 3, 1, 8);

  // Minimal tracking: just healthy and out
  if (count === 1) {
    return ["healthy", "out"];
  } else if (count === 2) {
    return ["healthy", "nicked", "out"];
  } else {
    // Use first N levels from standard order
    const levels = WOUND_LEVEL_ORDER.slice(0, count);
    // Ensure last level is always "out"
    if (!levels.includes("out")) {
      levels[levels.length - 1] = "out";
    }
    return levels;
  }
}

/**
 * Calculates effective wound penalties with modifiers applied.
 *
 * @param {Object} sys - Actor's system data
 *
 * @description
 * Applies wound penalty modifier to all wound levels:
 * - Base penalty from wound level (e.g., Hurt = -10)
 * - Plus woundsPenaltyMod (from advantages/disadvantages)
 * - Minimum effective penalty is 0
 *
 * Modifies each level's penaltyEff property.
 *
 * @example
 * // Hurt level: base penalty -10, modifier +5
 * // Effective penalty: max(0, -10 + 5) = 0 (no penalty)
 */
export function calculateWoundPenalties(sys) {
  const penaltyMod = toInt(sys.woundsPenaltyMod);

  // Apply modifier to each wound level's penalty
  for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
    const eff = toInt(lvl.penalty) + penaltyMod;
    lvl.penaltyEff = Math.max(0, eff); // Never negative
  }
}

/**
 * Initializes wound state tracking (current/max wounds).
 *
 * @param {Object} sys - Actor's system data
 * @param {number} suffered - Total wounds suffered
 *
 * @description
 * Sets up wound tracking:
 * - max: Maximum wounds before "Out" (incapacitation)
 * - value: Remaining wounds (max - suffered)
 *
 * Max Wounds Determination:
 * - Manual mode with user-set max: Use user value
 * - Otherwise: Use "Out" level threshold
 *
 * Modifies sys.wounds with current state.
 */
export function initializeWoundState(sys, suffered) {
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
 * Finds the current wound level based on suffered wounds.
 *
 * @param {Object} sys - Actor's system data
 * @param {string[]} levelsToCheck - Ordered array of wound level keys
 * @param {number} sCapped - Suffered wounds (capped to max)
 * @returns {Object} The current wound level object
 *
 * @description
 * Determines which wound level the character is at:
 * - Iterates through levels in order
 * - Finds level where: lastThreshold < suffered <= currentThreshold
 * - Marks that level as current
 * - Returns the current level object
 *
 * @example
 * // Suffered 15 wounds, thresholds: Healthy=10, Nicked=20
 * // Current level: Nicked (15 is between 10 and 20)
 */
export function findCurrentWoundLevel(sys, levelsToCheck, sCapped) {
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
 * Prepares NPC wound levels using manual mode (custom thresholds).
 *
 * @param {Object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 *
 * @description
 * Manual mode allows custom wound thresholds for NPCs:
 * - Initializes manualWoundLevels with defaults if not present
 * - Copies manual values to active woundLevels
 * - Ensures thresholds are strictly increasing
 * - Marks levels as active/visible based on manual settings
 *
 * Default active levels: healthy, nicked, out (minimal tracking).
 *
 * Threshold Validation:
 * - Each level must have higher threshold than previous
 * - If not, sets to previous + 1
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

    // Ensure thresholds are strictly increasing
    let prevValue = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
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
 * Calculates a single wound threshold using L5R4 formula.
 *
 * @param {string} key - Wound level key
 * @param {number} earth - Earth Ring value
 * @param {number} mult - Multiplier for subsequent levels
 * @param {number} add - Flat modifier to add
 * @param {number} prev - Previous level's threshold
 * @returns {number} Calculated wound threshold
 *
 * @description
 * L5R4 Wound Threshold Formula:
 * - Healthy: (5 × Earth) + modifier
 * - Other levels: (Earth × multiplier) + previous + modifier
 *
 * Standard multiplier is 2, giving progression:
 * - Healthy: 5×Earth, Nicked: +2×Earth, Grazed: +2×Earth, etc.
 */
function calculateWoundThreshold(key, earth, mult, add, prev) {
  return key === "healthy" ? 5 * earth + add : earth * mult + prev + add;
}

/**
 * Prepares NPC wound levels using formula mode (Earth Ring calculation).
 *
 * @param {Object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 *
 * @description
 * Formula mode calculates thresholds from Earth Ring (standard L5R4):
 * - Uses Earth Ring, multiplier, and modifier
 * - Only active levels get calculated thresholds
 * - Inactive levels are hidden and use previous threshold
 *
 * Optional Scaling:
 * - If sys.wounds.max differs from calculated "Out" threshold
 * - Scales all thresholds proportionally
 * - Maintains relative spacing between levels
 * - Ensures strictly increasing values
 *
 * @example
 * // Earth 3, multiplier 2, modifier 0
 * // Healthy: 5×3=15, Nicked: 15+2×3=21, Grazed: 21+2×3=27
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
        lvl.value = calculateWoundThreshold(key, earth, mult, add, prev);
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
 * Determines the current wound level based on suffered wounds.
 *
 * @param {Object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 * @param {number} sCapped - Suffered wounds (capped to max)
 * @param {string} woundMode - "manual" or "formula"
 * @returns {Object} The current wound level object
 *
 * @description
 * Wrapper that filters levels based on mode:
 * - Manual mode: Only check active manual levels
 * - Formula mode: Check all levels in order
 *
 * Then finds which level the suffered wounds fall into.
 */
export function determineCurrentWoundLevel(sys, order, sCapped, woundMode) {
  // Filter levels based on mode
  const levelsToCheck =
    woundMode === "manual"
      ? order.filter(key => sys.manualWoundLevels?.[key]?.active === true)
      : order;

  return findCurrentWoundLevel(sys, levelsToCheck, sCapped);
}

/**
 * Prepares visible wound levels for UI display.
 *
 * @param {Object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 *
 * @description
 * Creates display-friendly wound level data:
 * - Manual mode: Shows active manual levels only
 * - Formula mode: Recalculates levels for current stats
 *
 * Formula mode recalculation ensures UI shows current values
 * even if Earth Ring or modifiers changed.
 *
 * Sets sys.visibleWoundLevels and sys.visibleManualWoundLevels
 * for template rendering.
 */
export function prepareVisibleWoundLevels(sys, order) {
  const nrWoundLvls = clamp(toInt(sys.nrWoundLvls) || 3, 1, 8);
  const isManualMode = sys.woundMode === "manual";

  const baseVisibleOrder = getWoundLevelsForCount(nrWoundLvls);

  sys.visibleWoundLevels = {};
  sys.visibleManualWoundLevels = {};

  // Copy manual wound levels for UI
  for (const key of order) {
    if (sys.manualWoundLevels && sys.manualWoundLevels[key]) {
      sys.woundLevels[key] = { ...sys.manualWoundLevels[key], key };
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
      const value = calculateWoundThreshold(key, earth, mult, add, prev);
      prev = value;

      const basePenalty = toInt(DEFAULT_WOUND_PENALTIES?.[key]) || 0;
      const penaltyEff = Math.max(0, basePenalty + penaltyMod);

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

    findCurrentWoundLevel({ woundLevels: sys.visibleWoundLevels }, baseVisibleOrder, sCapped);
  }
}
