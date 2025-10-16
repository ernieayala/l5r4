/**
 * Wound System Calculations
 *
 * Implements the Legend of the Five Rings 4th Edition wound tracking system,
 * calculating wound thresholds, penalties, and current wound state for characters.
 * Supports both formula-based (Earth Ring multipliers) and manual wound configurations.
 *
 * Key Responsibilities:
 * - **Wound Threshold Calculation**: Compute damage thresholds per L5R4 wound ranks
 * - **Wound Penalty Application**: Apply TN penalties based on current wound level
 * - **Wound State Management**: Track current wound level and remaining hit points
 * - **Lethality Scaling**: Support variable Earth multipliers (×2/×3/×4/×5)
 * - **Manual Configuration**: Allow GMs to override wound thresholds and penalties
 *
 * L5R4 Wound Mechanics:
 * - Eight wound ranks: Healthy, Nicked, Grazed, Hurt, Injured, Crippled, Down, Out
 * - Healthy rank capacity = Earth × 5 (buffer for normal activity)
 * - Other ranks capacity = Earth × multiplier (default ×2 for standard lethality)
 * - Each rank imposes increasing TN penalties (+3 to +40) when filled
 * - Out rank = unconscious/dying; filling Out rank = instant death
 *
 * Foundry VTT Integration:
 * - Pure calculation module, no direct Foundry API dependencies
 * - Operates on actor.system data structure (DataModel pattern)
 * - Called during Actor.prepareDerivedData() lifecycle
 *
 * @module documents/actor/calculations/wound-system
 */

import { toInt, clamp } from "../../../utils/type-coercion.js";
import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../constants/wound-constants.js";

/**
 * Get the active wound level keys for a given count.
 *
 * Determines which wound ranks are active based on the number of wound levels
 * configured for the campaign. Supports simplified wound tracking for faster
 * or less lethal games (1-3 levels) or full standard tracking (8 levels).
 *
 * L5R4 Rules Context:
 * GMs can reduce wound levels for simpler tracking or adjust lethality.
 * Standard game uses all 8 levels. Simplified variants use 1-3 levels.
 *
 * @param {number} nrWoundLvls - Number of wound levels (1-8, clamped internally)
 * @returns {string[]} Array of active wound level keys in order, always ending with "out"
 */
export function getWoundLevelsForCount(nrWoundLvls) {
  const count = clamp(nrWoundLvls || 3, 1, 8);

  if (count === 1) {
    return ["healthy", "out"];
  } else if (count === 2) {
    return ["healthy", "nicked", "out"];
  } else {
    const levels = WOUND_LEVEL_ORDER.slice(0, count);
    if (!levels.includes("out")) {
      levels[levels.length - 1] = "out";
    }
    return levels;
  }
}

/**
 * Calculate effective wound penalties for all wound levels.
 *
 * Applies the global wound penalty modifier to each wound level's base penalty
 * and stores the absolute effective penalty value. This allows GMs to adjust
 * wound severity globally (e.g., "gritty" campaigns with +5 to all penalties).
 *
 * **Side Effects:** Mutates sys.woundLevels[*].penaltyEff for each level.
 *
 * L5R4 Rules Context:
 * Base wound penalties are: Nicked +3, Grazed +5, Hurt +10, Injured +15,
 * Crippled +20, Down +40. These increase the TN of all rolls made.
 *
 * @param {Object} sys - Actor system data containing wound configuration
 * @param {Object} sys.woundLevels - Map of wound level keys to level data
 * @param {number} sys.woundsPenaltyMod - Global modifier to all wound penalties
 * @returns {void}
 */
export function calculateWoundPenalties(sys) {
  const penaltyMod = toInt(sys.woundsPenaltyMod);
  for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
    const eff = toInt(lvl.penalty) + penaltyMod;
    lvl.penaltyEff = Math.abs(eff);
  }
}

/**
 * Initialize wound state from wound levels and suffered damage.
 *
 * Sets up the wounds.max (maximum hit points) and wounds.value (current hit points)
 * based on the "Out" wound threshold. In manual mode, allows GM override of max wounds.
 * Current hit points = max - suffered damage (minimum 0).
 *
 * **Side Effects:** Mutates sys.wounds.max and sys.wounds.value.
 *
 * L5R4 Rules Context:
 * When the Out rank is filled, the character is unconscious/dying.
 * The Out threshold represents total damage capacity before death.
 *
 * @param {Object} sys - Actor system data
 * @param {string} sys.woundMode - "manual" or "formula" mode
 * @param {Object} sys.wounds - Wound tracking state
 * @param {number} sys.wounds.max - User-defined max wounds (manual mode only)
 * @param {Object} sys.woundLevels - Computed wound level thresholds
 * @param {number} sys.woundLevels.out.value - Out rank threshold (total HP)
 * @param {number} suffered - Total damage suffered by the character
 * @returns {void}
 */
export function initializeWoundState(sys, suffered) {
  sys.wounds = sys.wounds || {};
  const outMax = toInt(sys.woundLevels.out?.value) || 0;

  const isManualMode = sys.woundMode === "manual";
  const userMaxWounds = toInt(sys.wounds.max);

  if (isManualMode && userMaxWounds > 0) {
    sys.wounds.max = userMaxWounds;
  } else {
    sys.wounds.max = outMax;
  }

  sys.wounds.value = Math.max(0, sys.wounds.max - toInt(suffered));
}

/**
 * Find and mark the current wound level based on suffered damage.
 *
 * Iterates through wound levels to determine which rank the character is currently
 * in based on suffered damage. Marks the matching level as current and returns it.
 * Damage is compared against cumulative thresholds (if suffered ≤ threshold).
 *
 * **Side Effects:** Sets lvl.current = true for the active level, false for others.
 *
 * L5R4 Rules Context:
 * Characters are "in" a wound rank when their suffered damage fills that rank
 * but hasn't yet filled the next rank. Being in a rank applies its TN penalty.
 *
 * @param {Object} sys - Actor system data
 * @param {Object} sys.woundLevels - Map of wound level keys to level data
 * @param {string[]} levelsToCheck - Ordered array of wound level keys to check
 * @param {number} sCapped - Suffered damage (capped to Out threshold)
 * @returns {Object} The current wound level object with .penalty, .value, .current properties
 */
export function findCurrentWoundLevel(sys, levelsToCheck, sCapped) {
  let current = sys.woundLevels.healthy;
  let lastVal = -1;

  for (const key of levelsToCheck) {
    const lvl = sys.woundLevels[key];
    if (!lvl) {
      continue;
    }

    const upper = toInt(lvl.value);
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
 * Prepare wound levels in manual configuration mode.
 *
 * In manual mode, the GM explicitly sets wound thresholds and penalties for each level.
 * This function initializes missing manual configurations with defaults, applies them
 * to woundLevels, and enforces monotonic ordering (each threshold > previous).
 *
 * **Side Effects:**
 * - Populates sys.manualWoundLevels with defaults if missing
 * - Copies manual configuration to sys.woundLevels
 * - Enforces threshold ordering (see inline comments below)
 *
 * L5R4 Rules Context:
 * Manual mode allows GMs to customize wound thresholds for special NPCs
 * (e.g., bosses with unusual damage resistance, minions with low HP).
 *
 * @param {Object} sys - Actor system data
 * @param {Object} sys.manualWoundLevels - GM-configured wound level overrides
 * @param {Object} sys.woundLevels - Output wound level data
 * @param {string[]} order - Ordered array of wound level keys (WOUND_LEVEL_ORDER)
 * @returns {void}
 */
export function prepareNpcManualWounds(sys, order) {
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

  for (const key of order) {
    const manual = sys.manualWoundLevels[key];
    const lvl =
      sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });

    lvl.value = Math.max(0, toInt(manual.value));
    lvl.penalty = Math.max(0, toInt(manual.penalty));

    lvl.isActive = manual.active === true;
    lvl.isVisible = true;
  }

  // Enforce monotonic threshold ordering: each rank must have higher threshold than previous
  // This prevents invalid configurations like Hurt: 20, Injured: 15 (backwards)
  let prevValue = 0;
  for (const key of order) {
    const lvl = sys.woundLevels[key];
    if (lvl.value <= prevValue && key !== "healthy") {
      lvl.value = prevValue + 1;
    }
    prevValue = lvl.value;
  }
}

/**
 * Calculate wound threshold for a single rank using L5R4 formulas.
 *
 * Implements official L5R4 wound threshold calculation:
 * - Healthy: Earth × 5 + modifier (buffer for normal activity)
 * - Other ranks: Earth × multiplier + previous threshold + modifier
 *
 * This creates cumulative thresholds where each rank adds Earth × multiplier
 * damage capacity on top of the previous rank's threshold.
 *
 * @param {string} key - Wound level key (e.g., "healthy", "nicked")
 * @param {number} earth - Character's Earth Ring value
 * @param {number} mult - Wound multiplier (2=standard, 3/4/5=less lethal)
 * @param {number} add - Global modifier to all thresholds
 * @param {number} prev - Previous rank's threshold (for cumulative calculation)
 * @returns {number} Computed threshold value for this rank
 */
function calculateWoundThreshold(key, earth, mult, add, prev) {
  return key === "healthy" ? 5 * earth + add : earth * mult + prev + add;
}

/**
 * Prepare wound levels using Earth Ring formula calculations.
 *
 * Calculates wound thresholds using the character's Earth Ring and configured
 * multiplier. Supports variable lethality (Earth ×2/×3/×4/×5) and scaling when
 * GM overrides the total max wounds. Handles cases where fewer than 8 wound
 * levels are active for simplified tracking.
 *
 * **Scaling Algorithm (lines 261-274):**
 * If wounds.max is manually set and differs from the calculated Out threshold,
 * all wound thresholds are proportionally scaled to maintain relative spacing.
 * Example: If calculated Out = 40 but wounds.max = 60, all thresholds × 1.5.
 *
 * **Side Effects:** Fully populates sys.woundLevels with calculated values.
 *
 * L5R4 Rules Context:
 * Standard lethality uses Earth ×2 multiplier (very deadly, 1-3 round combats).
 * Higher multipliers (×3/×4/×5) create longer, more survivable combats.
 *
 * @param {Object} sys - Actor system data
 * @param {Object} sys.rings - Character's Ring values
 * @param {number} sys.rings.earth - Earth Ring value
 * @param {number} sys.woundsMultiplier - Earth multiplier (default 2)
 * @param {number} sys.woundsMod - Global threshold modifier
 * @param {number} sys.nrWoundLvls - Number of active wound levels (1-8)
 * @param {Object} sys.wounds - Wound tracking state
 * @param {number} sys.wounds.max - Optional manual max wounds override
 * @param {Object} sys.woundLevels - Output wound level data
 * @param {string[]} order - Ordered array of wound level keys
 * @returns {void}
 */
export function prepareNpcFormulaWounds(sys, order) {
  const earth = sys.rings.earth;
  const mult = toInt(sys.woundsMultiplier) || 2;
  const add = toInt(sys.woundsMod) || 0;

  const nrWoundLvls = toInt(sys.nrWoundLvls) || 3;
  const activeOrder = getWoundLevelsForCount(nrWoundLvls);

  let prev = 0;
  for (const key of order) {
    const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = {});

    lvl.current = false;

    if (activeOrder.includes(key)) {
      lvl.value = calculateWoundThreshold(key, earth, mult, add, prev);
      prev = lvl.value;
      lvl.isActive = true;
      lvl.isVisible = true;

      lvl.penalty = DEFAULT_WOUND_PENALTIES[key] || 0;
    } else {
      lvl.value = prev;
      lvl.penalty = 0;
      lvl.isActive = false;
      lvl.isVisible = false;
    }
  }

  // Apply proportional scaling when GM overrides max wounds
  // Example: If formula gives Out: 40 but GM sets max: 60, scale all thresholds by 1.5×
  // This maintains relative spacing between wound ranks while respecting manual max
  const npcMax = toInt(sys.wounds?.max);
  const outDerived = toInt(sys.woundLevels.out?.value);
  if (npcMax > 0 && outDerived > 0 && npcMax !== outDerived) {
    const factor = npcMax / outDerived;
    let prevScaled = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      const orig = toInt(lvl.value);
      let scaled = Math.ceil(orig * factor);
      // Ensure healthy ≥ 1 and each rank > previous after scaling
      scaled = key === "healthy" ? Math.max(1, scaled) : Math.max(prevScaled + 1, scaled);
      lvl.value = scaled;
      prevScaled = scaled;
    }
  }
}

/**
 * Determine the character's current wound level based on suffered damage.
 *
 * Wrapper function that filters active wound levels based on wound mode
 * (manual mode only checks levels marked active) then delegates to
 * findCurrentWoundLevel for actual determination logic.
 *
 * @param {Object} sys - Actor system data
 * @param {Object} sys.woundLevels - Computed wound level thresholds
 * @param {Object} sys.manualWoundLevels - Manual configuration (manual mode only)
 * @param {string[]} order - Ordered array of wound level keys
 * @param {number} sCapped - Suffered damage (capped to Out threshold)
 * @param {string} woundMode - "manual" or "formula"
 * @returns {Object} The current wound level object
 */
export function determineCurrentWoundLevel(sys, order, sCapped, woundMode) {
  const levelsToCheck =
    woundMode === "manual"
      ? order.filter(key => sys.manualWoundLevels?.[key]?.active === true)
      : order;

  return findCurrentWoundLevel(sys, levelsToCheck, sCapped);
}

/**
 * Prepare visible wound levels for UI display in the wound configuration sheet.
 *
 * Creates a display-friendly representation of wound levels showing current values,
 * penalties, and which level the character is in. Handles both manual mode (shows
 * active levels from manual configuration) and formula mode (recalculates from
 * Earth Ring for live preview).
 *
 * **Formula Mode:** Recalculates all thresholds from scratch using current Earth,
 * multiplier, and modifiers. Determines current wound level from suffered damage.
 * Useful for previewing formula changes before saving.
 *
 * **Manual Mode:** Displays only manually activated wound levels with their
 * configured values. Does not recalculate or determine current level.
 *
 * **Side Effects:** Populates sys.visibleWoundLevels and sys.visibleManualWoundLevels.
 *
 * @param {Object} sys - Actor system data
 * @param {Object} sys.woundLevels - Current wound level data
 * @param {Object} sys.manualWoundLevels - Manual configuration
 * @param {string} sys.woundMode - "manual" or "formula"
 * @param {number} sys.nrWoundLvls - Number of wound levels
 * @param {number} sys.rings.earth - Earth Ring (formula mode only)
 * @param {number} sys.woundsMultiplier - Earth multiplier (formula mode only)
 * @param {number} sys.woundsMod - Threshold modifier (formula mode only)
 * @param {number} sys.woundsPenaltyMod - Penalty modifier (formula mode only)
 * @param {number} sys.suffered - Suffered damage (formula mode only)
 * @param {string[]} order - Ordered array of wound level keys
 * @returns {void}
 */
export function prepareVisibleWoundLevels(sys, order) {
  const nrWoundLvls = clamp(toInt(sys.nrWoundLvls) || 3, 1, 8);
  const isManualMode = sys.woundMode === "manual";

  const baseVisibleOrder = getWoundLevelsForCount(nrWoundLvls);

  sys.visibleWoundLevels = {};
  sys.visibleManualWoundLevels = {};

  for (const key of order) {
    if (sys.manualWoundLevels && sys.manualWoundLevels[key]) {
      sys.visibleManualWoundLevels[key] = sys.manualWoundLevels[key];
    }
  }

  if (isManualMode) {
    for (const key of order) {
      const manual = sys.manualWoundLevels?.[key];
      const woundLevel = sys.woundLevels?.[key];

      if (manual?.active === true && woundLevel) {
        sys.visibleWoundLevels[key] = woundLevel;
      }
    }
  } else {
    const earth = toInt(sys.rings?.earth);
    const mult = toInt(sys.woundsMultiplier) || 2;
    const add = toInt(sys.woundsMod) || 0;
    const penaltyMod = toInt(sys.woundsPenaltyMod) || 0;

    let prev = 0;
    for (const key of baseVisibleOrder) {
      const value = calculateWoundThreshold(key, earth, mult, add, prev);
      prev = value;

      const basePenalty = toInt(DEFAULT_WOUND_PENALTIES?.[key]) || 0;
      const penaltyEff = Math.abs(basePenalty + penaltyMod);

      sys.visibleWoundLevels[key] = {
        value,
        penalty: basePenalty,
        penaltyEff,
        current: false
      };
    }

    const outMax = toInt(sys.visibleWoundLevels.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    findCurrentWoundLevel({ woundLevels: sys.visibleWoundLevels }, baseVisibleOrder, sCapped);
  }
}
