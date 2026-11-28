/**
 * @module documents/actor/calculations/npc-wound-system
 * @description Prepares an NPC's Wound Ranks during actor data preparation: thresholds and penalties from its Earth
 * Ring (formula mode) or from the GM's entries (manual mode), with two to eight ranks in use and Out always last; the
 * current rank among the ranks its mode uses; and the ranks the NPC sheet shows. Modifies `sys.woundLevels`,
 * `sys.manualWoundLevels`, and the sheet's visible ranks in place.
 */

import {
  WOUND_LEVEL_ORDER,
  DEFAULT_WOUND_PENALTIES,
  DEFAULT_WOUND_THRESHOLDS
} from "../../../config/game-mechanics.js";
import { toInt, getClamped } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import {
  getEffectiveWoundPenalty,
  getWoundThreshold,
  prepareCurrentWoundLevel
} from "./wound-system.js";

/**
 * The Wound Rank keys in use for a count of ranks, Out included (Ernie's ruling, #155): the first ranks of
 * WOUND_LEVEL_ORDER, then Out. 2 is Healthy and Out, 3 adds Nicked, 8 is every rank.
 * @param {number} nrWoundLvls - Number of Wound Ranks, Out included (2-8)
 * @returns {string[]} Array of wound level keys to use
 */
export function getWoundLevelsForCount(nrWoundLvls) {
  const count = getClamped(nrWoundLvls ?? 3, 2, WOUND_LEVEL_ORDER.length);
  return [...WOUND_LEVEL_ORDER.slice(0, count - 1), "out"];
}

/**
 * Prepare an NPC's Wound Ranks in manual mode: the GM's thresholds and penalties from `sys.manualWoundLevels`
 * (Healthy, Nicked, and Out active by default), each rank in use above the one before it.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
export function prepareNpcManualWounds(sys, order) {
  try {
    prepareManualWoundDefaults(sys, order);
    prepareManualWoundLevels(sys, order);
    prepareIncreasingManualThresholds(sys, order);
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
    prepareFormulaWoundLevels(sys, order);
    prepareScaledWoundLevels(sys, order);
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
 * @param {object} wounds
 * @param {number} wounds.sCapped - Suffered wounds (capped to max)
 * @param {string} wounds.woundMode - "manual" or "formula"
 * @returns {object} The current wound level object
 */
export function prepareCurrentWoundLevelByMode(sys, order, { sCapped, woundMode }) {
  // Filter levels based on mode
  const levelsToCheck =
    woundMode === "manual"
      ? order.filter(key => sys.manualWoundLevels?.[key]?.active === true)
      : order;

  return prepareCurrentWoundLevel(sys, levelsToCheck, sCapped);
}

/**
 * Prepare the Wound Ranks the sheet shows, `sys.visibleWoundLevels`: the active manual ranks in manual mode or, in
 * formula mode, the ranks computed again from the current Earth Ring and modifiers with the current rank marked. The
 * wound settings table edits the stored manual ranks (module/apps/wound-config.js), and the prepared wound levels
 * stay as the wound mode made them: formula thresholds in formula mode (#38).
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
export function prepareVisibleWoundLevels(sys, order) {
  const isManualMode = sys.woundMode === "manual";

  const baseVisibleOrder = getWoundLevelsForCount(toInt(sys.nrWoundLvls) || 3);

  sys.visibleWoundLevels = {};

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
    prepareVisibleFormulaWoundLevels(sys, baseVisibleOrder);
  }
}

/**
 * Fill each Wound Rank the manual table lacks with its default threshold and penalty, Healthy, Nicked, Out active.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
function prepareManualWoundDefaults(sys, order) {
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
}

/**
 * Copy the GM's manual thresholds, penalties, and use onto the prepared Wound Ranks; every manual rank is visible.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
function prepareManualWoundLevels(sys, order) {
  for (const key of order) {
    const manual = sys.manualWoundLevels[key];
    const lvl =
      sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });

    lvl.value = Math.max(0, toInt(manual.value));
    lvl.penalty = Math.max(0, toInt(manual.penalty));

    lvl.isActive = manual.active === true;
    lvl.isVisible = true;
  }
}

/**
 * Keep the thresholds of the manual ranks in use strictly increasing; an unused rank holds no Wounds, so its value
 * never pushes the next one up (a creature's "124: Dead" stays 124).
 * game-rules/99_creatures.md, p.318
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
function prepareIncreasingManualThresholds(sys, order) {
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
}

/**
 * Compute each Wound Rank's threshold and penalty from the Earth Ring, Wounds multiplier, and Wounds modifier for the
 * ranks in use; a rank out of use is hidden and holds the previous threshold.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
function prepareFormulaWoundLevels(sys, order) {
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
      // Active level: calculate threshold
      lvl.value = getWoundThreshold(key, { earth, mult, add, prev });
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
}

/**
 * Scale every threshold by the GM's custom maximum over the Out threshold, when they differ, rounded up and kept
 * strictly increasing, so a GM adjusts an NPC's durability and keeps the spacing of its ranks.
 * @param {object} sys - Actor's system data
 * @param {string[]} order - Ordered array of wound level keys
 */
function prepareScaledWoundLevels(sys, order) {
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
}

/**
 * The visible Wound Ranks in formula mode: computed again from the current Earth Ring and modifiers, each with its
 * effective penalty, and the rank the suffered Wounds fall in marked current.
 * @param {object} sys - Actor's system data
 * @param {string[]} baseVisibleOrder - The Wound Rank keys in use
 */
function prepareVisibleFormulaWoundLevels(sys, baseVisibleOrder) {
  const earth = toInt(sys.rings?.earth);
  const mult = toInt(sys.woundsMultiplier) || 2;
  const add = toInt(sys.woundsMod) || 0;
  const penaltyMod = toInt(sys.woundsPenaltyMod) || 0;

  let prev = 0;
  for (const key of baseVisibleOrder) {
    const value = getWoundThreshold(key, { earth, mult, add, prev });
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
