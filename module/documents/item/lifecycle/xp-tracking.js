/**
 * XP Tracking System - Item Lifecycle Integration
 *
 * Logs Experience Point expenditures when items are created or updated on actor documents.
 * Creates detailed audit trail entries stored in actor flags for display in the XP Manager UI.
 *
 * Key Responsibilities:
 * - **Skill Creation Tracking**: Log XP spent when new skills are added to character
 * - **Skill Advancement Tracking**: Log XP spent when skill ranks increase
 * - **Emphasis Tracking**: Log XP spent when skill emphases are added
 * - **Advantage/Disadvantage Tracking**: Log XP spent or gained from character options
 * - **Cost Change Tracking**: Log additional XP when item costs are adjusted post-creation
 * - **XP Reset**: Clear all calculated XP tracking data
 *
 * **L5R4 Rules Context:**
 * This module implements the Experience Point tracking system from Character Creation and Advancement:
 * - Skills cost XP equal to next rank (rank 1→2 costs 2 XP, rank 2→3 costs 3 XP, etc.)
 * - Emphases cost 2 XP each
 * - Advantages cost variable XP as listed in their descriptions
 * - Disadvantages grant XP (up to max 10 points total)
 * - School skills receive rank 1 for free (tracked via freeRanks parameter)
 *
 * **Foundry Integration:**
 * - Stores XP log as array in `actor.flags[SYS_ID].xpSpent`
 * - Each entry has unique ID (via `foundry.utils.randomID()`)
 * - Uses `game.i18n.format()` for localized log messages
 * - Integrates with XP Manager UI for detailed XP breakdown display
 * - Called automatically by item lifecycle hooks (pre-create, pre-update)
 *
 * **Data Structure:**
 * XP entries stored with different schemas per type:
 * - Skill entries: { id, delta, note, ts, type: "skill", skillName, fromValue, toValue }
 * - Emphasis entries: { id, delta, note, ts, type: "emphasis", skillName, fromValue, toValue, addedEmphases }
 * - Advantage entries: { id, delta, note, ts, type: "advantage", itemName, fromValue, toValue }
 * - Disadvantage entries: { id, delta, note, ts, type: "disadvantage", itemName, fromValue, toValue }
 *
 * @module documents/item/lifecycle/xp-tracking
 * @requires Foundry v13+ (uses foundry.utils, flag system, optional chaining)
 * @see module:documents/item/constants/xp-costs - XP cost calculation utilities
 * @see module:apps/xp-manager - XP Manager UI that displays these log entries
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  calculateSkillCost,
  calculateSkillRankDelta,
  calculateEmphasisCost
} from "../constants/xp-costs.js";

/**
 * Retrieve the XP spent log array from an actor's flags.
 *
 * Safely extracts the XP tracking array from actor flags with defensive null checks.
 * Returns a shallow copy to prevent accidental mutations of the flag data.
 *
 * Uses Foundry's flag system for persistent data storage:
 * - Flags are stored under `actor.flags[SYS_ID].xpSpent`
 * - Returns empty array if flag doesn't exist or isn't an array
 * - Shallow copy prevents direct flag mutation (use setFlag to update)
 *
 * @param {L5R4Actor} actor - The actor document to retrieve XP log from
 * @returns {Array<Object>} Shallow copy of XP entries array, or empty array if not found
 * @private
 */
function getXpSpentArray(actor) {
  const ns = actor.flags?.[SYS_ID] ?? {};
  return Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
}

/**
 * Add a new XP entry to an actor's XP tracking log.
 *
 * Appends a new entry to the actor's XP spent array and persists it via Foundry's flag system.
 * This is the core mutation operation for all XP tracking. Uses `actor.setFlag()` to ensure
 * proper Foundry document updates and database persistence.
 *
 * **Foundry API Note:**
 * - Uses `actor.setFlag(SYS_ID, "xpSpent", array)` for atomic updates
 * - Triggers document update hooks and database write
 * - Returns a promise that resolves when database write completes
 *
 * @param {L5R4Actor} actor - The actor document to add the entry to
 * @param {Object} entry - The XP entry object to append (must include id, delta, note, ts, type)
 * @returns {Promise<void>} Resolves when flag is successfully persisted to database
 * @private
 */
async function addXpEntry(actor, entry) {
  const spent = getXpSpentArray(actor);
  spent.push(entry);
  await actor.setFlag(SYS_ID, "xpSpent", spent);
}

/**
 * Log XP spent when a new skill is created on a character.
 *
 * Called during skill item creation to track the XP cost of acquiring the skill at its starting rank.
 * Handles free ranks from school skills (school skills start at rank 1 for free per L5R4 rules).
 * If the calculated cost is 0 (e.g., school skill at rank 1), no entry is logged.
 *
 * **L5R4 Rules:**
 * - New skills cost 1 XP for rank 1
 * - School skills receive rank 1 for free (cost = 0 for rank 1, normal cost for higher ranks)
 * - Higher starting ranks cost cumulative XP: rank 3 = 1+2+3 = 6 XP (or 5 XP if school skill)
 *
 * **Usage:**
 * - Called by item-creation.js in handleItemPreCreate hook
 * - Only logs if skill has an owning actor (unlinked skills are ignored)
 * - Generates localized log message via i18n key "l5r4.character.experience.skillCreate"
 *
 * **Error Handling:**
 * - Wraps in try/catch to prevent creation failures from XP logging issues
 * - Logs warning to console if XP tracking fails, but doesn't block skill creation
 *
 * @param {L5R4Item} item - The skill item being created
 * @param {Object} sys - The item's system data object containing rank and school properties
 * @param {number} sys.rank - The starting skill rank (typically 1-4)
 * @param {boolean} [sys.school] - True if this is a school skill (grants free rank 1)
 * @returns {Promise<void>} Resolves when XP entry is logged or operation completes
 */
export async function logSkillCreationXp(item, sys) {
  if (!item.actor) {
    return;
  }

  try {
    const rank = toInt(sys.rank);
    const freeRanks = sys.school ? 1 : 0;
    const cost = calculateSkillCost(rank, freeRanks);

    if (cost > 0) {
      await addXpEntry(item.actor, {
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
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log skill creation XP", { err, item: item.name });
  }
}

/**
 * Log XP spent when a skill's rank is increased.
 *
 * Called during skill item updates to track incremental XP cost when rank changes.
 * Calculates only the additional XP needed for the rank increase, not the total cost.
 * Returns true if XP was logged, false otherwise (for caller to know if cost was incurred).
 *
 * **L5R4 Rules:**
 * - Advancing a skill costs XP equal to the new rank
 * - Rank 2→3 costs 3 XP, rank 3→4 costs 4 XP, etc.
 * - School skills have rank 1 free, so advancing from 1→2 still costs 2 XP
 * - Decreasing rank logs no XP (no refunds in L5R4)
 *
 * **Usage:**
 * - Called by item lifecycle hooks when sys.rank changes
 * - Only logs if skill has an owning actor
 * - Generates localized log message via i18n key "l5r4.character.experience.skillChange"
 *
 * **Error Handling:**
 * - Returns false on error to indicate no XP was logged
 * - Logs warning to console but doesn't throw to prevent update failures
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {number} oldRank - The skill rank before the update
 * @param {number} newRank - The skill rank after the update
 * @param {number} [freeRanks=0] - Number of free ranks (0 for non-school skills, 1 for school skills)
 * @returns {Promise<boolean>} True if XP entry was logged, false otherwise
 */
export async function logSkillRankXp(item, oldRank, newRank, freeRanks) {
  if (!item.actor) {
    return false;
  }

  try {
    const delta = calculateSkillRankDelta(oldRank, newRank, freeRanks);

    if (delta > 0) {
      await addXpEntry(item.actor, {
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
      return true;
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log skill rank XP", { err, item: item.name });
  }

  return false;
}

/**
 * Log XP spent when emphases are added to a skill.
 *
 * Called during skill item updates to track XP cost when emphasis string changes.
 * Calculates cost for newly added emphases only (2 XP each per L5R4 rules).
 * Returns true if XP was logged, false otherwise.
 *
 * **L5R4 Rules:**
 * - Each emphasis costs 2 XP per Character Creation and Advancement rules
 * - Emphases allow re-rolling 1s when the emphasis applies to the task
 * - Some Techniques or Advantages grant free emphases in specific skills
 * - Multiple emphases can exist on a single skill (each costs 2 XP)
 *
 * **Implementation Note:**
 * Assumes emphases are stored as an array. The function slices the new array at the old length
 * to get only the added emphases for the log note. Calculates cost based on count difference.
 *
 * **Usage:**
 * - Called by item lifecycle hooks when emphasis array changes
 * - Only logs if skill has an owning actor and cost > 0
 * - Creates manual note format: "SkillName - Emphasis: emphasis1, emphasis2"
 *
 * **Error Handling:**
 * - Returns false on error to indicate no XP was logged
 * - Logs warning to console but doesn't throw
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {string[]} oldEmphases - Array of emphasis strings before update
 * @param {string[]} newEmphases - Array of emphasis strings after update
 * @param {number} [freeEmphasis=0] - Number of free emphases granted (usually 0 or 1)
 * @returns {Promise<boolean>} True if XP entry was logged, false otherwise
 */
export async function logEmphasisXp(item, oldEmphases, newEmphases, freeEmphasis) {
  if (!item.actor) {
    return false;
  }
  try {
    const cost = calculateEmphasisCost(oldEmphases.length, newEmphases.length, freeEmphasis);

    if (cost > 0) {
      const addedEmphases = newEmphases.slice(oldEmphases.length);

      await addXpEntry(item.actor, {
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
      return true;
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log emphasis XP", { err, item: item.name });
  }

  return false;
}

/**
 * Log XP spent when an advantage is purchased.
 *
 * Called during advantage item creation to track the XP cost. Advantages cost variable
 * amounts of XP as listed in their individual descriptions. Some advantages have reduced
 * costs for specific clans or professions (handled by caller, this function just logs the cost).
 *
 * **L5R4 Rules:**
 * - Advantages cost XP as listed in their descriptions (typically 1-10 XP)
 * - Some advantages have reduced costs for certain clans/schools
 * - Maximum 15 points of advantages recommended for starting characters
 * - Can be purchased after character creation with GM approval (for Social/Material types)
 * - Physical/Mental advantages typically cannot be purchased after creation
 *
 * **Usage:**
 * - Called by item-creation.js when advantage item is created
 * - Cost parameter should be pre-calculated with any discounts applied
 * - Only logs if item has owning actor and cost > 0
 * - Uses item name directly as the log note
 *
 * **Error Handling:**
 * - Wraps in try/catch to prevent creation failures from XP logging issues
 * - Logs warning to console if XP tracking fails
 *
 * @param {L5R4Item} item - The advantage item being created
 * @param {number} cost - The XP cost of the advantage (after any discounts)
 * @returns {Promise<void>} Resolves when XP entry is logged or operation completes
 */
export async function logAdvantageXp(item, cost) {
  if (!item.actor || cost <= 0) {
    return;
  }

  try {
    await addXpEntry(item.actor, {
      id: foundry.utils.randomID(),
      delta: cost,
      note: item.name ?? "Advantage",
      ts: Date.now(),
      type: "advantage",
      itemName: item.name ?? "Advantage",
      fromValue: 0,
      toValue: cost
    });
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log advantage XP", { err, item: item.name });
  }
}

/**
 * Log XP gained when a disadvantage is taken.
 *
 * Called during disadvantage item creation to track the XP gained. Disadvantages grant
 * bonus XP that can be spent on other character improvements. The cost parameter represents
 * the XP gained (not spent), but is stored as a positive delta in the log for consistency.
 *
 * **L5R4 Rules:**
 * - Disadvantages grant bonus XP as listed in their descriptions
 * - Maximum 10 XP can be gained from disadvantages per Character Creation and Advancement rules
 * - Some disadvantages cost more (grant more XP) for certain clans/schools
 * - Physical/Mental disadvantages typically cannot be removed after character creation
 * - Social disadvantages may change during play with GM approval
 *
 * **Implementation Note:**
 * Although disadvantages grant XP rather than cost XP, the delta is stored as positive
 * for consistency with the XP Manager UI's expectation. The UI interprets disadvantage
 * type entries as XP gained rather than spent.
 *
 * **Usage:**
 * - Called by item-creation.js when disadvantage item is created
 * - Cost parameter should be pre-calculated with any modifiers applied
 * - Only logs if item has owning actor and cost > 0
 * - Uses item name directly as the log note
 *
 * **Error Handling:**
 * - Wraps in try/catch to prevent creation failures from XP logging issues
 * - Logs warning to console if XP tracking fails
 *
 * @param {L5R4Item} item - The disadvantage item being created
 * @param {number} cost - The XP value of the disadvantage (amount of XP gained)
 * @returns {Promise<void>} Resolves when XP entry is logged or operation completes
 */
export async function logDisadvantageXp(item, cost) {
  if (!item.actor || cost <= 0) {
    return;
  }

  try {
    await addXpEntry(item.actor, {
      id: foundry.utils.randomID(),
      delta: cost,
      note: item.name ?? "Disadvantage",
      ts: Date.now(),
      type: "disadvantage",
      itemName: item.name ?? "Disadvantage",
      fromValue: 0,
      toValue: cost
    });
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log disadvantage XP", { err, item: item.name });
  }
}

/**
 * Log additional XP spent when an advantage/disadvantage cost changes after creation.
 *
 * Called during advantage/disadvantage item updates to track XP cost adjustments.
 * Only logs if the cost increases (no XP refunds for cost decreases per L5R4 rules).
 * Returns true if XP was logged, false otherwise.
 *
 * **L5R4 Rules:**
 * - Advantages and disadvantages can have variable costs based on circumstances
 * - Some advantages/disadvantages have tiered costs (e.g., Allies 1-5 points)
 * - If cost increases post-creation, additional XP must be spent
 * - If cost decreases, no XP is refunded (character keeps the benefit)
 *
 * **Use Cases:**
 * - Player realizes advantage should cost more due to clan/school restrictions
 * - GM adjusts cost to reflect campaign-specific balance
 * - Tiered advantage increases in value (e.g., Allies rank increases)
 * - Cost correction after initial creation
 *
 * **Usage:**
 * - Called by item lifecycle hooks when cost field changes
 * - Only logs positive deltas (cost increases only)
 * - Creates note format: "ItemName (newCost)"
 * - Type determined from item.type (advantage or disadvantage)
 *
 * **Error Handling:**
 * - Returns false on error to indicate no XP was logged
 * - Logs warning to console but doesn't throw
 *
 * @param {L5R4Item} item - The advantage/disadvantage item being updated
 * @param {number} oldCost - The XP cost before the update
 * @param {number} newCost - The XP cost after the update
 * @returns {Promise<boolean>} True if XP entry was logged, false otherwise
 */
export async function logCostChangeXp(item, oldCost, newCost) {
  if (!item.actor) {
    return false;
  }

  const delta = Math.max(0, newCost - oldCost);
  if (delta <= 0) {
    return false;
  }

  try {
    const itemType = item.type === "advantage" ? "advantage" : "disadvantage";
    const itemLabel = item.type === "advantage" ? "Advantage" : "Disadvantage";

    await addXpEntry(item.actor, {
      id: foundry.utils.randomID(),
      delta,
      note: `${item.name ?? itemLabel} (${newCost})`,
      ts: Date.now(),
      type: itemType,
      itemName: item.name ?? itemLabel,
      fromValue: oldCost,
      toValue: newCost
    });
    return true;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to log cost change XP", { err, item: item.name });
  }

  return false;
}

/**
 * Clear all calculated XP tracking data from an actor.
 *
 * Resets the XP spent log to an empty array, effectively clearing all XP tracking history.
 * This is a destructive operation typically used when rebuilding a character or fixing
 * corrupted XP data. After clearing, triggers a sheet re-render to update the UI.
 *
 * **Use Cases:**
 * - GM resets character XP tracking to rebuild from scratch
 * - Player wants to recalculate XP after character modifications
 * - XP log becomes corrupted or inaccurate
 * - Character is being rebuilt with different advancement choices
 *
 * **Foundry Integration:**
 * - Uses `actor.setFlag()` to clear the xpSpent array atomically
 * - Triggers `actor.sheet.render()` if sheet is currently rendered
 * - Optional chaining (`?.`) prevents errors if sheet doesn't exist or isn't rendered
 *
 * **Warning:**
 * This is a destructive operation with no built-in undo. All XP tracking history
 * is permanently deleted. Consider warning users before calling this function.
 *
 * **Usage:**
 * - Called by XP Manager UI's reset button
 * - Can be called programmatically for bulk character updates
 * - Only operates if actor exists (defensive null check)
 *
 * **Error Handling:**
 * - Wraps in try/catch to prevent failures from breaking other operations
 * - Logs warning to console if reset fails
 *
 * @param {L5R4Actor} actor - The actor document to reset XP tracking for
 * @returns {Promise<void>} Resolves when flag is cleared and sheet is re-rendered (if applicable)
 */
export async function resetCalculatedXp(actor) {
  if (!actor) {
    return;
  }

  try {
    await actor.setFlag(SYS_ID, "xpSpent", []);

    if (actor.sheet?.rendered) {
      actor.sheet.render();
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to reset calculated XP data", err);
  }
}
