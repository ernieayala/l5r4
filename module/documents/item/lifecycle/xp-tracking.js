/**
 * @fileoverview XP Tracking Shared Utilities
 * 
 * Shared functions for logging experience point expenditures to actor flags.
 * Used by both item creation and update lifecycle hooks to maintain XP audit trail.
 * 
 * **Responsibilities:**
 * - Log XP expenditures to actor.flags[SYS_ID].xpSpent array
 * - Generate XP log entries with proper metadata
 * - Handle skill, advantage, and disadvantage XP logging
 * - Provide safe async flag updates without blocking
 * 
 * **Architecture:**
 * Shared utility functions called by:
 * - {@link module/documents/item/lifecycle/item-creation.js}
 * - {@link module/documents/item/lifecycle/item-updates.js}
 * 
 * XP costs calculated via {@link module/documents/item/constants/xp-costs.js}
 * 
 * Operates on actor flags to maintain persistent XP audit trail.
 * All functions handle errors gracefully without throwing.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  calculateSkillCost,
  calculateSkillRankDelta,
  calculateEmphasisCost,
  EMPHASIS_COST
} from "../constants/xp-costs.js";

/**
 * @typedef {Object} XpLogEntry
 * @property {string} id - Unique identifier for this log entry (generated via randomID)
 * @property {number} delta - XP cost (positive number)
 * @property {string} note - Human-readable description of expenditure
 * @property {number} ts - Timestamp (Date.now())
 * @property {string} type - Entry type: "skill", "emphasis", "advantage", or "disadvantage"
 * @property {string} [skillName] - Skill name (for skill and emphasis types)
 * @property {string} [itemName] - Item name (for advantage and disadvantage types)
 * @property {number} fromValue - Previous value
 * @property {number} toValue - New value
 * @property {string[]} [addedEmphases] - Array of emphasis names added (emphasis type only)
 */

/**
 * Log skill creation XP expenditure to actor flags.
 * 
 * Calculates XP cost for initial skill rank using triangular progression
 * with school skill bonuses (rank 1 free for school skills). Creates an
 * {@link XpLogEntry} and appends to actor.flags[SYS_ID].xpSpent array.
 * 
 * @param {L5R4Item} item - The skill item being created
 * @param {{rank: number, school: boolean}} sys - Item system data with rank and school flag
 * @returns {Promise<void>} Async flag update (non-blocking, failures logged but not thrown)
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logSkillCreationXp(item, sys) {
  if (!item.actor) return;
  
  try {
    const ns = item.actor.flags?.[SYS_ID] ?? {};
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
    
    const rank = toInt(sys.rank);
    const freeRanks = sys.school ? 1 : 0;
    const cost = calculateSkillCost(rank, freeRanks);
    
    if (cost > 0) {
      spent.push({
        id: foundry.utils.randomID(),
        delta: cost,
        note: game.i18n.format("l5r4.character.experience.skillCreate", { 
          name: item.name ?? "Skill", 
          rank 
        }),
        ts: Date.now(),
        type: "skill",
        skillName: item.name ?? "Skill",
        fromValue: 0,
        toValue: rank
      });
      
      // Async flag update - don't block creation if XP logging fails
      await item.actor.setFlag(SYS_ID, "xpSpent", spent);
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log skill creation XP", { err, item: item.name });
  }
}

/**
 * Log skill rank increase XP expenditure to actor flags.
 * 
 * Calculates XP delta between old and new ranks, accounting for school
 * bonuses and free ranks. Creates an {@link XpLogEntry} when delta > 0.
 * 
 * @param {L5R4Item} item - The skill item being updated
 * @param {number} oldRank - Previous skill rank
 * @param {number} newRank - New skill rank
 * @param {number} freeRanks - Number of free ranks from school bonuses
 * @returns {Promise<boolean>} True if XP was logged (delta > 0), false otherwise
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logSkillRankXp(item, oldRank, newRank, freeRanks) {
  if (!item.actor) return false;
  
  try {
    const delta = calculateSkillRankDelta(oldRank, newRank, freeRanks);
    
    if (delta > 0) {
      const ns = item.actor.flags?.[SYS_ID] ?? {};
      const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
      
      spent.push({
        id: foundry.utils.randomID(),
        delta,
        note: game.i18n.format("l5r4.character.experience.skillChange", { 
          name: item.name ?? "Skill", 
          from: oldRank, 
          to: newRank 
        }),
        ts: Date.now(),
        type: "skill",
        skillName: item.name ?? "Skill",
        fromValue: oldRank,
        toValue: newRank
      });
      
      await item.actor.setFlag(SYS_ID, "xpSpent", spent);
      return true;
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log skill rank XP", { err, item: item.name });
  }
  
  return false;
}

/**
 * Log emphasis addition XP expenditure to actor flags.
 * 
 * Calculates XP cost for new emphases (2 XP each) accounting for free
 * emphases from school bonuses. Only logs when new emphases are added.
 * 
 * @param {L5R4Item} item - The skill item being updated
 * @param {string[]} oldEmphases - Previous emphasis array
 * @param {string[]} newEmphases - New emphasis array
 * @param {number} freeEmphasis - Number of free emphases from school bonuses
 * @returns {Promise<boolean>} True if XP was logged (cost > 0), false otherwise
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logEmphasisXp(item, oldEmphases, newEmphases, freeEmphasis) {
  if (!item.actor) return false;
  try {
    const cost = calculateEmphasisCost(oldEmphases.length, newEmphases.length, freeEmphasis);
    
    if (cost > 0) {
      const ns = item.actor.flags?.[SYS_ID] ?? {};
      const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
      // Extract only the newly added emphases (assumes newEmphases contains all old + new)
      const addedEmphases = newEmphases.slice(oldEmphases.length);
      
      spent.push({
        id: foundry.utils.randomID(),
        delta: cost,
        note: `${item.name ?? "Skill"} - Emphasis: ${addedEmphases.join(", ")}`,
        ts: Date.now(),
        type: "emphasis",
        skillName: item.name ?? "Skill",
        fromValue: oldEmphases.length,
        toValue: newEmphases.length,
        addedEmphases
      });
      
      await item.actor.setFlag(SYS_ID, "xpSpent", spent);
      return true;
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log emphasis XP", { err, item: item.name });
  }
  
  return false;
}

/**
 * Log advantage creation XP expenditure to actor flags.
 * 
 * Records advantage purchase to XP audit trail. No-op if cost <= 0 or no actor.
 * 
 * @param {L5R4Item} item - The advantage item being created
 * @param {number} cost - XP cost of the advantage (must be positive)
 * @returns {Promise<void>} Async flag update (non-blocking, failures logged but not thrown)
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logAdvantageXp(item, cost) {
  if (!item.actor || cost <= 0) return;
  
  try {
    const ns = item.actor.flags?.[SYS_ID] ?? {};
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
    
    spent.push({
      id: foundry.utils.randomID(),
      delta: cost,
      note: item.name ?? "Advantage",
      ts: Date.now(),
      type: "advantage",
      itemName: item.name ?? "Advantage",
      fromValue: 0,
      toValue: cost
    });
    
    await item.actor.setFlag(SYS_ID, "xpSpent", spent);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log advantage XP", { err, item: item.name });
  }
}

/**
 * Log disadvantage creation XP expenditure to actor flags.
 * 
 * Records disadvantage purchase to XP audit trail. No-op if cost <= 0 or no actor.
 * 
 * @param {L5R4Item} item - The disadvantage item being created
 * @param {number} cost - XP cost of the disadvantage (must be positive)
 * @returns {Promise<void>} Async flag update (non-blocking, failures logged but not thrown)
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logDisadvantageXp(item, cost) {
  if (!item.actor || cost <= 0) return;
  
  try {
    const ns = item.actor.flags?.[SYS_ID] ?? {};
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
    
    spent.push({
      id: foundry.utils.randomID(),
      delta: cost,
      note: item.name ?? "Disadvantage",
      ts: Date.now(),
      type: "disadvantage",
      itemName: item.name ?? "Disadvantage",
      fromValue: 0,
      toValue: cost
    });
    
    await item.actor.setFlag(SYS_ID, "xpSpent", spent);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log disadvantage XP", { err, item: item.name });
  }
}

/**
 * Log advantage/disadvantage cost change XP expenditure to actor flags.
 * 
 * Records XP delta when advantage/disadvantage cost increases. Only logs
 * positive deltas (cost increases). Cost decreases are ignored.
 * 
 * @param {L5R4Item} item - The advantage/disadvantage item being updated
 * @param {number} oldCost - Previous cost value
 * @param {number} newCost - New cost value
 * @returns {Promise<boolean>} True if XP was logged (positive delta), false otherwise
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function logCostChangeXp(item, oldCost, newCost) {
  if (!item.actor) return false;
  
  const delta = Math.max(0, newCost - oldCost);
  if (delta <= 0) return false;
  
  try {
    const ns = item.actor.flags?.[SYS_ID] ?? {};
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
    const itemType = item.type === "advantage" ? "advantage" : "disadvantage";
    const itemLabel = item.type === "advantage" ? "Advantage" : "Disadvantage";
    
    spent.push({
      id: foundry.utils.randomID(),
      delta,
      note: `${item.name ?? itemLabel} (${newCost})`,
      ts: Date.now(),
      type: itemType,
      itemName: item.name ?? itemLabel,
      fromValue: oldCost,
      toValue: newCost
    });
    
    await item.actor.setFlag(SYS_ID, "xpSpent", spent);
    return true;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log cost change XP", { err, item: item.name });
  }
  
  return false;
}

/**
 * Reset calculated XP data when freeRanks or freeEmphasis change.
 * 
 * Clears the xpSpent array to allow recalculation with new free rank/emphasis
 * values. Forces actor sheet re-render if currently displayed.
 * 
 * **Note:** This only clears calculated XP entries. Manual XP adjustments
 * (stored elsewhere) are preserved.
 * 
 * @param {Actor} actor - The actor whose XP data should be reset
 * @returns {Promise<void>} Async flag update
 * @throws {Error} Never throws - errors are caught and logged to console
 */
export async function resetCalculatedXp(actor) {
  if (!actor) return;
  
  try {
    // Clear all calculated XP entries to allow fresh recalculation
    await actor.setFlag(SYS_ID, "xpSpent", []);
    
    // Force actor sheet to recalculate XP on next render
    if (actor.sheet?.rendered) {
      actor.sheet.render();
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to reset calculated XP data", err);
  }
}
