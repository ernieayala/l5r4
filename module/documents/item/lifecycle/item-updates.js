/**
 * @fileoverview Item Update Lifecycle Logic
 * 
 * Handles item update lifecycle hook (_preUpdate) including XP tracking for skill
 * rank increases, emphasis additions, and advantage/disadvantage cost changes.
 * 
 * **Responsibilities:**
 * - Track skill rank increases and log XP costs
 * - Track emphasis additions and log XP costs
 * - Handle freeRanks/freeEmphasis changes with XP recalculation
 * - Validate advantage costs during updates
 * - Log advantage/disadvantage cost changes
 * 
 * **Architecture:**
 * Lifecycle logic called during Foundry document update hooks.
 * Delegates to xp-tracking.js for XP logging and reset operations.
 * 
 * **XP Tracking Rules:**
 * - Skills: Log XP only when rank increases (not decreases)
 * - Emphasis: Log XP when emphasis count increases
 * - freeRanks/freeEmphasis changes: Reset all calculated XP for recalculation
 * - Advantages/Disadvantages: Log XP delta when cost increases
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  logSkillRankXp,
  logEmphasisXp,
  logCostChangeXp,
  resetCalculatedXp
} from "./xp-tracking.js";

/**
 * Handle item pre-update validation and XP tracking.
 * 
 * Performs several operations based on item type and what's being changed:
 * 1. Validates advantage costs (must be non-negative)
 * 2. Resets XP when freeRanks/freeEmphasis change (triggers recalculation)
 * 3. Tracks skill rank increases with XP logging
 * 4. Tracks emphasis additions with XP logging
 * 5. Tracks advantage/disadvantage cost increases with XP logging
 * 
 * @param {L5R4Item} item - The item being updated
 * @param {object} changes - Differential data being updated
 * @returns {Promise<void>} Async XP tracking operations
 */
export async function handleItemPreUpdate(item, changes) {
  // Validate advantage costs (must be non-negative)
  if (item.type === "advantage" && changes?.system?.cost !== undefined) {
    changes.system.cost = Math.max(0, toInt(changes.system.cost, 0));
  }

  // Allow disadvantages to have any cost value for flexibility during updates
  // (creation enforces ≥0). XP calculations in actor.js interpret positive
  // costs as granted XP (see _preparePcExperience).

  // Handle freeRanks/freeEmphasis changes (triggers XP recalculation)
  if (item.actor && item.type === "skill") {
    const freeRanksChanged = changes?.system?.freeRanks !== undefined && 
                              changes.system.freeRanks !== item.system?.freeRanks;
    const freeEmphasisChanged = changes?.system?.freeEmphasis !== undefined && 
                                 changes.system.freeEmphasis !== item.system?.freeEmphasis;
    
    if (freeRanksChanged || freeEmphasisChanged) {
      await resetCalculatedXp(item.actor);
      return; // Skip normal XP tracking logic below
    }
  }

  // Track XP expenditures for embedded items
  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  // Track skill rank increases
  if (item.type === "skill") {
    await trackSkillRankIncrease(item, changes);
    await trackEmphasisAdditions(item, changes);
  }
  
  // Track advantage/disadvantage cost changes
  else if (item.type === "advantage" || item.type === "disadvantage") {
    await trackCostChange(item, changes);
  }
}

/**
 * Track skill rank increases and log XP expenditure.
 * 
 * Only logs XP when rank increases (not decreases). Uses school flag and
 * freeRanks to determine baseline for cost calculation.
 * 
 * @param {L5R4Item} item - The skill item being updated
 * @param {object} changes - Update changes object
 * @returns {Promise<void>} Async XP logging
 * @private
 */
async function trackSkillRankIncrease(item, changes) {
  const oldRank = toInt(item.system?.rank);
  const newRank = toInt(changes?.system?.rank ?? oldRank);
  const rankIncreased = Number.isFinite(newRank) && newRank > oldRank;

  if (rankIncreased) {
    // School skills get free ranks; check if this skill has school flag set
    const newSchool = (changes?.system?.school ?? item.system?.school) ? true : false;
    const newFreeRanks = changes?.system?.freeRanks ?? item.system?.freeRanks;
    const freeRanks = newSchool ? Math.max(0, parseInt(newFreeRanks) || 0) : 0;
    
    await logSkillRankXp(item, oldRank, newRank, freeRanks);
  }
}

/**
 * Track emphasis additions and log XP expenditure.
 * 
 * Parses emphasis strings (comma/semicolon separated), counts additions,
 * and logs XP cost accounting for free emphases.
 * 
 * @param {L5R4Item} item - The skill item being updated
 * @param {object} changes - Update changes object
 * @returns {Promise<void>} Async XP logging
 * @private
 */
async function trackEmphasisAdditions(item, changes) {
  const oldEmphasis = String(item.system?.emphasis ?? "").trim();
  const newEmphasis = String(changes?.system?.emphasis ?? oldEmphasis).trim();
  
  if (oldEmphasis === newEmphasis) return;

  // Parse comma/semicolon-separated emphasis list into array
  const oldEmphases = oldEmphasis ? 
    oldEmphasis.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
  const newEmphases = newEmphasis ? 
    newEmphasis.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
  
  if (newEmphases.length > oldEmphases.length) {
    // School skills get free emphases; check if this skill has school flag set
    const newSchool = (changes?.system?.school ?? item.system?.school) ? true : false;
    const freeEmphasis = newSchool ? 
      (parseInt(changes?.system?.freeEmphasis ?? item.system?.freeEmphasis) || 0) : 0;
    
    await logEmphasisXp(item, oldEmphases, newEmphases, freeEmphasis);
  }
}

/**
 * Track advantage/disadvantage cost changes and log XP expenditure.
 * 
 * Delegates to logCostChangeXp which logs XP only when cost increases
 * (not decreases), recording positive delta to XP spent array.
 * 
 * @param {L5R4Item} item - The advantage/disadvantage item being updated
 * @param {object} changes - Update changes object
 * @returns {Promise<void>} Async XP logging
 * @private
 */
async function trackCostChange(item, changes) {
  const oldCost = toInt(item.system?.cost, 0);
  const newCost = toInt(changes?.system?.cost ?? oldCost, 0);
  
  await logCostChangeXp(item, oldCost, newCost);
}
