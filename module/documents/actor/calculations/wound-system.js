/**
 * @fileoverview L5R4 Wound System - Complete Wound Calculation Logic
 * 
 * Centralized wound system calculations for both PC and NPC actors.
 * Handles wound level progression, penalties, thresholds, and UI visibility.
 * Supports both formula-based (Earth Ring) and manual entry wound modes.
 * 
 * **Core Responsibilities:**
 * - **Wound Level Configuration**: Determine active wound levels based on count
 * - **Penalty Calculation**: Compute effective wound penalties with modifiers
 * - **State Initialization**: Set max wounds and remaining capacity
 * - **Current Level Detection**: Find which wound level character is at
 * - **Manual Mode**: Direct threshold/penalty entry for stat block NPCs
 * - **Formula Mode**: Earth-based calculations for standard NPCs
 * - **Visibility Management**: Prepare wound level data for template display
 * 
 * **Wound Modes:**
 * - **Formula Mode**: Uses Earth Ring × multiplier for threshold calculation
 * - **Manual Mode**: Direct entry of thresholds and penalties from stat blocks
 * 
 * **Usage:**
 * ```javascript
 * import { getWoundLevelsForCount, calculateWoundPenalties } from "./wound-system.js";
 * 
 * const activeOrder = getWoundLevelsForCount(3); // ["healthy", "nicked", "out"]
 * calculateWoundPenalties(sys); // Computes sys.woundLevels[*].penaltyEff
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link ../constants/wound-constants.js|Wound Constants} - WOUND_LEVEL_ORDER, defaults
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../constants/wound-constants.js";

/**
 * Get wound levels for specified count, always ending with "out".
 * 
 * **Count Mapping:**
 * - 1 level: ["healthy", "out"]
 * - 2 levels: ["healthy", "nicked", "out"]
 * - 3+ levels: First N levels, always ending with "out"
 * 
 * @param {number|undefined} nrWoundLvls - Number of wound levels (1-8), defaults to 3 if undefined
 * @returns {string[]} Array of wound level keys
 * 
 * @example
 * getWoundLevelsForCount(3); // ["healthy", "nicked", "out"]
 * getWoundLevelsForCount(5); // ["healthy", "nicked", "grazed", "hurt", "out"]
 */
export function getWoundLevelsForCount(nrWoundLvls) {
  const count = Math.max(1, Math.min(8, nrWoundLvls || 3));
  
  if (count === 1) {
    return ["healthy", "out"];
  } else if (count === 2) {
    return ["healthy", "nicked", "out"];
  } else {
    // For 3+ levels, show first N levels, but always include "out" as the final level
    const levels = WOUND_LEVEL_ORDER.slice(0, count);
    if (!levels.includes("out")) {
      levels[levels.length - 1] = "out"; // Replace last with "out"
    }
    return levels;
  }
}

/**
 * Calculate effective penalties for all wound levels.
 * Computes penaltyEff for UI display (always positive) while preserving
 * original penalty values for roll calculations (applied as negative).
 * 
 * **Penalty Calculation:**
 * - penaltyEff = abs(basePenalty + woundsPenaltyMod)
 * - Stored as positive for display
 * - Applied as negative in dice rolls
 * 
 * @param {object} sys - Actor system data containing woundLevels and woundsPenaltyMod
 * @param {Record<string, {penalty: number}>} sys.woundLevels - Wound level data
 * @param {number} [sys.woundsPenaltyMod] - Global penalty modifier
 * @returns {void} - Modifies sys.woundLevels[*].penaltyEff in place
 * 
 * @example
 * calculateWoundPenalties(sys);
 * console.log(sys.woundLevels.hurt.penaltyEff); // 10 (displayed to user as +10)
 * // In dice rolls, apply as: baseRoll - sys.woundLevels.hurt.penaltyEff
 */
export function calculateWoundPenalties(sys) {
  const penaltyMod = toInt(sys.woundsPenaltyMod);
  for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
    const eff = toInt(lvl.penalty) + penaltyMod;
    lvl.penaltyEff = Math.abs(eff);
  }
}

/**
 * Initialize wound state data for both PC and NPC actors.
 * Sets wounds.max to the "Out" threshold and calculates remaining wound capacity.
 * 
 * **Mode Behavior:**
 * - **Manual mode for NPCs**: If wounds.max is set (user configured), it acts as the ceiling
 * - **Manual mode without max**: Defaults to "Out" threshold value
 * - **Formula mode**: Always uses "Out" threshold value (computed from Earth Ring)
 * 
 * @param {object} sys - Actor system data containing woundLevels
 * @param {object} sys.woundLevels - Wound level data with out.value threshold
 * @param {object} [sys.wounds] - Existing wounds data
 * @param {number} [sys.wounds.max] - User-configured max wounds (manual mode only)
 * @param {string} [sys.woundMode] - Wound mode ("manual" or "formula")
 * @param {number} suffered - Current wounds suffered by the actor
 * @returns {void} - Modifies sys.wounds.max and sys.wounds.value in place
 * 
 * @example
 * initializeWoundState(sys, 15); // suffered = 15 damage
 * console.log(sys.wounds.max); // 45 (Out threshold)
 * console.log(sys.wounds.value); // 30 (remaining = 45 - 15)
 */
export function initializeWoundState(sys, suffered) {
  sys.wounds = sys.wounds || {};
  const outMax = toInt(sys.woundLevels.out?.value) || 0;
  
  // In Manual mode, respect user-configured max wounds if set; otherwise use Out threshold
  // In Formula mode, always use computed Out threshold
  const isManualMode = sys.woundMode === "manual";
  const userMaxWounds = toInt(sys.wounds.max);
  
  if (isManualMode && userMaxWounds > 0) {
    // Manual mode with user-configured max wounds - use as ceiling
    sys.wounds.max = userMaxWounds;
  } else {
    // Formula mode or Manual mode without configured max - use Out threshold
    sys.wounds.max = outMax;
  }
  
  sys.wounds.value = Math.max(0, sys.wounds.max - toInt(suffered));
}

/**
 * Find current wound level based on suffered damage.
 * 
 * **Algorithm:**
 * 1. Reset all wound levels to current=false
 * 2. Iterate through levelsToCheck in order
 * 3. Find level where: prevThreshold < suffered <= currentThreshold
 * 4. Mark that level as current=true
 * 5. Return the current level object
 * 
 * @param {object} sys - Actor system data
 * @param {Record<string, {value: number, current: boolean}>} sys.woundLevels - Wound level data
 * @param {string[]} levelsToCheck - Wound levels to check (in order)
 * @param {number} sCapped - Capped suffered damage
 * @returns {{value: number, penalty: number, current: boolean, penaltyEff?: number}} Current wound level object
 * 
 * @example
 * const current = findCurrentWoundLevel(sys, ["healthy", "nicked", "out"], 18);
 * console.log(current.penalty); // Penalty for nicked level
 * 
 * @see determineCurrentWoundLevel - Higher-level function that calls this with mode-specific logic
 */
export function findCurrentWoundLevel(sys, levelsToCheck, sCapped) {
  let current = sys.woundLevels.healthy;
  let lastVal = -1;

  for (const key of levelsToCheck) {
    const lvl = sys.woundLevels[key];
    if (!lvl) continue;
    
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
 * Prepare manual wound system for NPCs using direct threshold/penalty entry.
 * Allows GMs to enter wound thresholds and penalties directly from stat blocks.
 * 
 * **Manual Wound Features:**
 * - Direct entry of wound thresholds (e.g., 15, 30, 45)
 * - Direct entry of wound penalties (e.g., -3, -10, Dead)
 * - Active/inactive toggle for each wound level
 * - Validation ensures thresholds increase and penalties worsen
 * 
 * **Visibility Control:**
 * - ONLY the Active checkbox controls visibility in Manual mode
 * - nrWoundLvls dropdown does NOT affect Manual mode visibility
 * - This allows GMs to configure any combination of wound levels
 * 
 * @param {object} sys - The actor's system data object
 * @param {object} sys.woundLevels - Main wound levels for calculation
 * @param {object} sys.manualWoundLevels - Manual wound level configuration
 * @param {string[]} order - Ordered array of wound level keys
 * @returns {void} - Modifies sys.woundLevels and sys.manualWoundLevels in place
 * 
 * @example
 * prepareNpcManualWounds(sys, WOUND_LEVEL_ORDER);
 * console.log(sys.woundLevels.nicked.value); // Threshold from manual entry
 */
export function prepareNpcManualWounds(sys, order) {
  // Initialize manual wound levels if missing
  if (!sys.manualWoundLevels) {
    sys.manualWoundLevels = {};
  }

  // Ensure all wound levels exist with defaults
  for (const key of order) {
    if (!sys.manualWoundLevels[key]) {
      sys.manualWoundLevels[key] = {
        value: DEFAULT_WOUND_THRESHOLDS[key] || 0,
        penalty: DEFAULT_WOUND_PENALTIES[key] || 0,
        active: key === "healthy" || key === "nicked" || key === "out" // Default 3-level system
      };
    }
  }

  // Copy manual values to main woundLevels for display and calculation
  // In Manual mode, ONLY the Active checkbox controls visibility, not nrWoundLvls
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const manual = sys.manualWoundLevels[key];
    const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
    
    // Always copy manual values to main table for display
    lvl.value = Math.max(0, toInt(manual.value));
    lvl.penalty = Math.max(0, toInt(manual.penalty)); // Penalties stored as positive values
    
    lvl.isActive = manual.active === true;
    lvl.isVisible = true; // All levels are visible in manual mode for configuration
    
    if (!lvl.isActive && i > 0) {
      const prevKey = order[i - 1];
      const prevValue = sys.woundLevels[prevKey]?.value || 0;
      // Keep display value but use previous for progression
      lvl.calculatedValue = prevValue;
    } else {
      lvl.calculatedValue = lvl.value;
    }
  }

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
 * Prepare formula-based wound system for NPCs using Earth-based calculations.
 * Maintains compatibility with existing Earth-based wound calculations while
 * allowing optional manual max wounds override for scaling.
 * 
 * **Formula Wound Features:**
 * - Earth-based threshold calculation (same as PCs)
 * - Optional manual max wounds override with proportional scaling
 * - Customizable wound level count (1-8 levels)
 * - Wound multiplier and modifier support
 * 
 * **Calculation:**
 * - Healthy: 5 × Earth + modifier
 * - Other levels: Earth × multiplier + previous + modifier
 * - Levels not in activeOrder are set to previous value (disabled)
 * 
 * @param {object} sys - The actor's system data object
 * @param {object} sys.rings - Ring values
 * @param {number} sys.rings.earth - Earth ring value
 * @param {number} [sys.woundsMultiplier] - Multiplier for wound thresholds (default 2)
 * @param {number} [sys.woundsMod] - Additive modifier for thresholds
 * @param {number} [sys.nrWoundLvls] - Number of wound levels to use (1-8)
 * @param {object} sys.woundLevels - Wound level data to populate
 * @param {object} [sys.wounds] - Existing wounds data
 * @param {number} [sys.wounds.max] - Optional max wounds override for proportional scaling
 * @param {string[]} order - Ordered array of wound level keys
 * @returns {void} - Modifies sys.woundLevels in place
 * 
 * @example
 * prepareNpcFormulaWounds(sys, WOUND_LEVEL_ORDER);
 * console.log(sys.woundLevels.healthy.value); // 5 × Earth + mod
 */
export function prepareNpcFormulaWounds(sys, order) {
  const earth = sys.rings.earth;
  const mult = toInt(sys.woundsMultiplier) || 2; // Default multiplier for NPCs
  const add = toInt(sys.woundsMod) || 0;

  // Handle customizable wound levels for nonhuman NPCs
  const nrWoundLvls = toInt(sys.nrWoundLvls) || 3;
  const activeOrder = getWoundLevelsForCount(nrWoundLvls);
  
  let prev = 0;
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    
    // Modify existing object properties instead of replacing to avoid Foundry data model conflicts
    const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = {});
    
    lvl.current = false;
    lvl.isActive = false;
    lvl.isVisible = false;
    
    // Check if this wound level key is in the active order (not based on index)
    if (activeOrder.includes(key)) {
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      prev = lvl.value;
      lvl.isActive = true;
      lvl.isVisible = true;
      
      // Always set penalty from defaults for active levels in formula mode
      lvl.penalty = DEFAULT_WOUND_PENALTIES[key] || 0;
    } else {
      lvl.value = prev;
      lvl.penalty = 0;
      lvl.isActive = false;
      lvl.isVisible = false;
    }
  }

  // Scale wound thresholds if NPC has manual max wounds override
  const npcMax = toInt(sys.wounds?.max);
  const outDerived = toInt(sys.woundLevels.out?.value);
  if (npcMax > 0 && outDerived > 0 && npcMax !== outDerived) {
    const factor = npcMax / outDerived;
    let prevScaled = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      const orig = toInt(lvl.value);
      let scaled = Math.ceil(orig * factor);
      // Ensure thresholds remain strictly increasing and positive
      scaled = key === "healthy" ? Math.max(1, scaled) : Math.max(prevScaled + 1, scaled);
      lvl.value = scaled;
      prevScaled = scaled;
    }
  }
}

/**
 * Determine which wound level is currently active based on wounds suffered.
 * In Manual mode, only considers Active (checked) wound levels for calculation.
 * In Formula mode, considers all wound levels based on nrWoundLvls setting.
 * 
 * **Manual Mode Logic:**
 * - Only Active wound levels participate in current level calculation
 * - Finds highest Active threshold that is <= wounds suffered
 * - Prevents "current" being set to hidden/inactive wound levels
 * 
 * **Formula Mode Logic:**
 * - Uses standard progression through all wound levels
 * - Same as PC wound level calculation
 * 
 * @param {object} sys - The actor's system data object
 * @param {object} sys.woundLevels - Wound level data
 * @param {object} [sys.manualWoundLevels] - Manual wound level data (manual mode only)
 * @param {string[]} order - Ordered array of wound level keys
 * @param {number} sCapped - Capped wounds suffered value
 * @param {string} woundMode - Current wound mode ("manual" or "formula")
 * @returns {{value: number, penalty: number, current: boolean, penaltyEff?: number}} The current wound level object
 * 
 * @example
 * const current = determineCurrentWoundLevel(sys, WOUND_LEVEL_ORDER, 18, "formula");
 * console.log(current.penalty); // Current wound penalty
 * 
 * @throws {Error} Never throws - returns healthy level with 0 penalty on error
 */
export function determineCurrentWoundLevel(sys, order, sCapped, woundMode) {
  try {
    // Defensive: validate inputs before processing
    if (!sys || typeof sys !== "object" || !sys.woundLevels) {
      throw new TypeError("Invalid sys parameter");
    }
    if (!Array.isArray(order)) {
      throw new TypeError("Invalid order parameter - must be an array");
    }
    
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      if (lvl) {
        lvl.current = false;
      }
    }

    let levelsToCheck;
    if (woundMode === "manual") {
      levelsToCheck = order.filter(key => {
        const manual = sys.manualWoundLevels?.[key];
        return manual?.active === true;
      });
    } else {
      levelsToCheck = order;
    }

    const current = findCurrentWoundLevel(sys, levelsToCheck, sCapped);

    return current;
    
  } catch (err) {
    return sys?.woundLevels?.healthy || { penalty: 0 };
  }
}

/**
 * Prepare visible wound levels for template display based on wound mode and settings.
 * Creates filtered arrays for both main wound display and manual configuration.
 * 
 * **Visibility Logic:**
 * - **Formula mode**: Shows levels based on nrWoundLvls dropdown setting
 * - **Manual mode**: Main table shows ONLY Active (checked) wound levels
 * - **Manual configuration**: ALWAYS shows ALL 8 wound levels for editing
 * 
 * **Manual Mode Filtering:**
 * In Manual mode, the main wound table dynamically shows/hides rows based on
 * Active checkbox state. Only wound levels marked as Active=true appear in the
 * main display, providing clean UI that matches user configuration.
 * 
 * **Configuration Display:**
 * The wound configuration always shows all 8 wound levels regardless of dropdown
 * settings, allowing users to toggle Active checkboxes for any level.
 * 
 * @param {object} sys - The actor's system data object
 * @param {object} sys.woundLevels - Main wound level data
 * @param {object} [sys.manualWoundLevels] - Manual wound level data
 * @param {object} sys.rings - Ring values for formula mode
 * @param {number} sys.rings.earth - Earth ring value
 * @param {number} [sys.nrWoundLvls] - Number of wound levels (1-8)
 * @param {string} [sys.woundMode] - Wound mode ("manual" or "formula")
 * @param {number} [sys.woundsMultiplier] - Wound threshold multiplier
 * @param {number} [sys.woundsMod] - Wound threshold modifier
 * @param {number} [sys.woundsPenaltyMod] - Penalty modifier
 * @param {number} [sys.suffered] - Current wounds suffered
 * @param {string[]} order - Ordered array of wound level keys
 * @returns {void} - Modifies sys.visibleWoundLevels and sys.visibleManualWoundLevels
 * 
 * @example
 * prepareVisibleWoundLevels(sys, WOUND_LEVEL_ORDER);
 * console.log(Object.keys(sys.visibleWoundLevels)); // ["healthy", "nicked", "out"]
 * 
 * @throws {Error} Never throws - falls back to existing woundLevels on error
 */
export function prepareVisibleWoundLevels(sys, order) {
  try {
    const nrWoundLvls = Math.max(1, Math.min(8, toInt(sys.nrWoundLvls) || 3));
    const isManualMode = sys.woundMode === "manual";
    
    const baseVisibleOrder = getWoundLevelsForCount(nrWoundLvls);

    // Create filtered wound levels for template display
    sys.visibleWoundLevels = {};
    sys.visibleManualWoundLevels = {};
    
    // Manual configuration ALWAYS shows ALL 8 wound levels for editing
    // This allows users to toggle Active checkboxes for any wound level
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
      // Formula mode: compute thresholds directly for display to avoid stale persisted values
      const earth = toInt(sys.rings?.earth);
      const mult = toInt(sys.woundsMultiplier) || 2;
      const add  = toInt(sys.woundsMod) || 0;
      const penaltyMod = toInt(sys.woundsPenaltyMod) || 0;

      let prev = 0;
      for (const key of baseVisibleOrder) {
        const value = key === "healthy" ? (5 * earth + add) : (earth * mult + prev + add);
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

      let lastVal = -1;
      for (const key of baseVisibleOrder) {
        const lvl = sys.visibleWoundLevels[key];
        if (!lvl) continue;
        const upper = toInt(lvl.value);
        const within = sCapped <= upper && sCapped > lastVal;
        lvl.current = within;
        lastVal = upper;
      }
    }
    
  } catch (err) {
    sys.visibleWoundLevels = sys.woundLevels || {};
    sys.visibleManualWoundLevels = sys.manualWoundLevels || {};
  }
}
