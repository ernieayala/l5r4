/**
 * @module documents/item/lifecycle/xp-tracking
 * @description Marks an actor's XP history for rebuilding when an item changes what the character spent: Skills,
 * Emphases, Advantages, and Disadvantages. Setting `flags.l5r4-enhanced.xpRetroactiveVersion` to 0 makes
 * buildXpHistory() (module/services/xp/calculator.js) rebuild the history from the actor's current state; the
 * manual entries in `xpManual` are kept. The `updateXpAfter*` functions keep the parameters their callers pass.
 * @see module:services/xp/calculator - Retroactive XP calculation (single source of truth)
 * @see module:apps/xp-manager - XP Manager UI that displays XP history
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Invalidate XP cache when a new skill is created.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being created
 * @param {object} _sys - The item's system data object (unused)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function updateXpAfterSkillCreate(item, _sys) {
  if (!item.actor) {
    return;
  }
  await updateXpHistoryStale(item.actor);
}

/**
 * Invalidate XP cache when a skill's rank is increased.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {number} _oldRank - The skill rank before the update (unused)
 * @param {number} _newRank - The skill rank after the update (unused)
 * @param {number} _freeRanks - Number of free ranks (unused)
 * @returns {Promise<boolean>} False for an unowned item, otherwise true
 */
export async function updateXpAfterSkillRank(item, _oldRank, _newRank, _freeRanks) {
  if (!item.actor) {
    return false;
  }
  await updateXpHistoryStale(item.actor);
  return true;
}

/**
 * Invalidate XP cache when emphases are added to a skill.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The skill item being updated
 * @param {string[]} _oldEmphases - Array of emphasis strings before update (unused)
 * @param {string[]} _newEmphases - Array of emphasis strings after update (unused)
 * @param {number} _freeEmphasis - Number of free emphases (unused)
 * @returns {Promise<boolean>} False for an unowned item, otherwise true
 */
export async function updateXpAfterEmphasis(item, _oldEmphases, _newEmphases, _freeEmphasis) {
  if (!item.actor) {
    return false;
  }
  await updateXpHistoryStale(item.actor);
  return true;
}

/**
 * Invalidate XP cache when an advantage is purchased.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The advantage item being created
 * @param {number} _cost - The XP cost of the advantage (unused)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function updateXpAfterAdvantage(item, _cost) {
  if (!item.actor) {
    return;
  }
  await updateXpHistoryStale(item.actor);
}

/**
 * Invalidate XP cache when a disadvantage is taken.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The disadvantage item being created
 * @param {number} _cost - The XP value of the disadvantage (unused)
 * @returns {Promise<void>} Resolves when cache is invalidated
 */
export async function updateXpAfterDisadvantage(item, _cost) {
  if (!item.actor) {
    return;
  }
  await updateXpHistoryStale(item.actor);
}

/**
 * Invalidate XP cache when an advantage/disadvantage cost changes.
 *
 * Triggers XP history recalculation by buildXpHistory() when the XP Manager is next opened.
 *
 * @param {L5R4Item} item - The advantage/disadvantage item being updated
 * @param {number} _oldCost - The XP cost before the update (unused)
 * @param {number} _newCost - The XP cost after the update (unused)
 * @returns {Promise<boolean>} False for an unowned item, otherwise true
 */
export async function updateXpAfterCostChange(item, _oldCost, _newCost) {
  if (!item.actor) {
    return false;
  }
  await updateXpHistoryStale(item.actor);
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
export async function updateXpHistoryReset(actor) {
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

/**
 * Invalidate XP cache to trigger recalculation.
 *
 * Sets the version hash to 0, which forces buildXpHistory() to recalculate
 * the complete XP history from the character's current state when the XP Manager
 * is next opened.
 *
 * @param {L5R4Actor} actor - The actor document to invalidate cache for
 * @returns {Promise<void>} Resolves when flag is updated
 */
async function updateXpHistoryStale(actor) {
  if (!actor) {
    return;
  }
  try {
    await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to invalidate XP cache", { err });
  }
}
