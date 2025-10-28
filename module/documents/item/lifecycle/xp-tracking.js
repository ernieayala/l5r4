/**
 * XP Tracking System - Item Lifecycle Integration
 *
 * Invalidates XP cache when character advancement occurs (skills, emphases, advantages, disadvantages).
 * XP history is recalculated on-demand by buildXpHistory() in services/xp/xp-calculator.js.
 *
 * **L5R4 Rules Context:**
 * - Skills cost XP equal to next rank (rank 1→2 costs 2 XP, rank 2→3 costs 3 XP, etc.)
 * - Emphases cost 2 XP each
 * - Advantages cost variable XP as listed in their descriptions
 * - Disadvantages grant XP (up to max 10 points total)
 * - School skills receive rank 1 for free (tracked via freeRanks parameter)
 *
 * **Foundry Integration:**
 * - XP history stored in `actor.flags[SYS_ID].xpSpentCache` (calculated on-demand)
 * - Version hash in `actor.flags[SYS_ID].xpRetroactiveVersion` triggers recalculation
 * - Manual XP entries in `actor.flags[SYS_ID].xpManual` are preserved
 *
 * @module documents/item/lifecycle/xp-tracking
 * @requires Foundry v13+ (uses foundry.utils, flag system, optional chaining)
 * @see module:services/xp/xp-calculator - Retroactive XP calculation (single source of truth)
 * @see module:apps/xp-manager - XP Manager UI that displays XP history
 */

import { SYS_ID } from "../../../config/constants.js";
// Unused imports removed - XP calculation now handled by services/xp/xp-calculator.js

/**
 * Invalidate XP cache to trigger recalculation.
 *
 * Sets the version hash to 0, which forces buildXpHistory() to recalculate
 * the complete XP history from the character's current state when the XP Manager
 * is next opened.
 *
 * @param {L5R4Actor} actor - The actor document to invalidate cache for
 * @returns {Promise<void>} Resolves when flag is updated
 * @private
 */
async function invalidateXpCache(actor) {
  if (!actor) {
    return;
  }
  try {
    await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to invalidate XP cache", { err });
  }
}

/**
 * Invalidate XP cache when a new skill is created.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being created
 * @param {Object} sys - The item's system data object (unused, kept for compatibility)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function logSkillCreationXp(item, _sys) {
  if (!item.actor) {
    return;
  }
  await invalidateXpCache(item.actor);
}

/**
 * Invalidate XP cache when a skill's rank is increased.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {number} oldRank - The skill rank before the update (unused, kept for compatibility)
 * @param {number} newRank - The skill rank after the update (unused, kept for compatibility)
 * @param {number} [freeRanks=0] - Number of free ranks (unused, kept for compatibility)
 * @returns {Promise<boolean>} Always returns true for compatibility
 */
export async function logSkillRankXp(item, _oldRank, _newRank, _freeRanks) {
  if (!item.actor) {
    return false;
  }
  await invalidateXpCache(item.actor);
  return true;
}

/**
 * Invalidate XP cache when emphases are added to a skill.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {string[]} oldEmphases - Array of emphasis strings before update (unused)
 * @param {string[]} newEmphases - Array of emphasis strings after update (unused)
 * @param {number} [freeEmphasis=0] - Number of free emphases (unused)
 * @returns {Promise<boolean>} Always returns true for compatibility
 */
export async function logEmphasisXp(item, _oldEmphases, _newEmphases, _freeEmphasis) {
  if (!item.actor) {
    return false;
  }
  await invalidateXpCache(item.actor);
  return true;
}

/**
 * Invalidate XP cache when an advantage is purchased.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The advantage item being created
 * @param {number} cost - The XP cost of the advantage (unused, kept for compatibility)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function logAdvantageXp(item, _cost) {
  if (!item.actor) {
    return;
  }
  await invalidateXpCache(item.actor);
}

/**
 * Invalidate XP cache when a disadvantage is taken.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The disadvantage item being created
 * @param {number} cost - The XP value of the disadvantage (unused, kept for compatibility)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function logDisadvantageXp(item, _cost) {
  if (!item.actor) {
    return;
  }
  await invalidateXpCache(item.actor);
}

/**
 * Invalidate XP cache when an advantage/disadvantage cost changes.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The advantage/disadvantage item being updated
 * @param {number} oldCost - The XP cost before the update (unused)
 * @param {number} newCost - The XP cost after the update (unused)
 * @returns {Promise<boolean>} Always returns true for compatibility
 */
export async function logCostChangeXp(item, _oldCost, _newCost) {
  if (!item.actor) {
    return false;
  }
  await invalidateXpCache(item.actor);
  return true;
}

/**
 * Clear XP cache to force recalculation.
 *
 * Invalidates the XP version hash, which forces buildXpHistory() to recalculate
 * the complete XP history from the character's current state when the XP Manager
 * is next opened.
 *
 * @param {L5R4Actor} actor - The actor document to reset XP cache for
 * @returns {Promise<void>} Resolves when cache is invalidated and sheet is re-rendered
 */
export async function resetCalculatedXp(actor) {
  if (!actor) {
    return;
  }

  try {
    await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);

    if (actor.sheet?.rendered) {
      actor.sheet.render();
    }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to reset XP cache", err);
  }
}
