/**
 * @module documents/item/lifecycle/item-updates
 * @description What L5R4Item's `_preUpdate` does for an owned item: an Advantage's cost clamped to 0 or more, and
 * the owner's XP history marked for rebuilding (xp-tracking.js) when a Skill's rank, Emphases, or free ranks, or an
 * Advantage's or Disadvantage's cost, change. The change is the update delta, holding only the changed fields.
 */

import { toInt } from "../../../utils/type-coercion.js";
import {
  updateXpAfterSkillRank,
  updateXpAfterEmphasis,
  updateXpAfterCostChange,
  updateXpHistoryReset
} from "./xp-tracking.js";

/**
 * Handle an item update before it applies. A change to a Skill's free ranks or free Emphasis resets the owner's
 * whole XP history, since free ranks change what every earlier rank cost (rank 3 costs 6 XP with no free rank and 5
 * with one); the history is rebuilt from the items as they stand. Otherwise a Skill's rank and Emphases, and an
 * Advantage's or Disadvantage's cost, are tracked for owned items; compendium and unowned items are skipped.
 * @param {Item} item - The item document being updated
 * @param {object} changes - Delta object containing only changed fields (Foundry format)
 * @param {object} [changes.system] - System data changes (undefined if no system changes)
 * @param {number} [changes.system.cost] - New advantage/disadvantage cost
 * @param {number} [changes.system.rank] - New skill rank
 * @param {string[]} [changes.system.trainedEmphases] - New trained emphases array
 * @param {number} [changes.system.freeRanks] - New free ranks count
 * @param {number} [changes.system.freeEmphasis] - New free emphasis count
 * @param {boolean} [changes.system.school] - Whether skill is a school skill
 * @returns {Promise<void>} Resolves when validation and XP tracking complete
 */
export async function onItemPreUpdate(item, changes) {
  if (item.type === "advantage" && changes?.system?.cost !== undefined) {
    changes.system.cost = Math.max(0, toInt(changes.system.cost, 0));
  }

  // Free rank changes invalidate all XP history because free ranks affect
  // retroactive XP calculations. Reset all calculated XP to force recalculation
  // based on current item state. This handles:
  // - Character creation adjustments (adding school skills post-creation)
  // - Technique changes that grant/remove free ranks or emphases
  // - GM corrections to free rank values
  if (item.actor && item.type === "skill") {
    const freeRanksChanged =
      changes?.system?.freeRanks !== undefined &&
      changes.system.freeRanks !== item.system?.freeRanks;
    const freeEmphasisChanged =
      changes?.system?.freeEmphasis !== undefined &&
      changes.system.freeEmphasis !== item.system?.freeEmphasis;

    if (freeRanksChanged || freeEmphasisChanged) {
      await updateXpHistoryReset(item.actor);
      return;
    }
  }

  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  if (item.type === "skill") {
    await updateSkillRankXp(item, changes);
    await updateEmphasisXp(item, changes);
  } else if (item.type === "advantage" || item.type === "disadvantage") {
    await updateCostXp(item, changes);
  }
}

/**
 * Whether a Skill is, or is becoming, a School Skill: the pending `changes.system.school` when the update sets it,
 * otherwise the item's own. A School Skill's free ranks count toward its XP cost.
 * @param {Item} item - The skill item being checked
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {boolean} [changes.system.school] - New school skill flag (if being changed)
 * @returns {boolean} True if skill is or will be a school skill, false otherwise
 */
function isSchoolSkill(item, changes) {
  return (changes?.system?.school ?? item.system?.school) ? true : false;
}

/**
 * Track a Skill rank increase: when the new rank is a finite number above the old one, log it with the free ranks
 * of a School Skill, so only bought ranks are priced.
 * @param {Item} item - The skill item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {number} [changes.system.rank] - New skill rank (if being changed)
 * @returns {Promise<void>} Resolves when XP logging completes
 * @see {@link module:documents/item/lifecycle/xp-tracking.updateXpAfterSkillRank}
 */
async function updateSkillRankXp(item, changes) {
  const oldRank = toInt(item.system?.rank);
  const newRank = toInt(changes?.system?.rank ?? oldRank);
  const rankIncreased = Number.isFinite(newRank) && newRank > oldRank;

  if (rankIncreased) {
    const newFreeRanks = changes?.system?.freeRanks ?? item.system?.freeRanks;
    const freeRanks = isSchoolSkill(item, changes) ? Math.max(0, parseInt(newFreeRanks) || 0) : 0;

    await updateXpAfterSkillRank(item, { oldRank, newRank, freeRanks });
  }
}

/**
 * Track a change to a Skill's trained Emphases, with the Skill's free Emphasis, when the update sends the
 * `trainedEmphases` array.
 * @param {Item} item - The skill item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @returns {Promise<void>}
 */
async function updateEmphasisXp(item, changes) {
  if (!item.actor) {
    return;
  }

  const oldEmphases = item.system?.trainedEmphases ?? [];
  const newEmphases = changes?.system?.trainedEmphases;

  // Track only an update that sends trainedEmphases
  if (!Array.isArray(newEmphases)) {
    return;
  }

  const freeEmphasis = toInt(item.system?.freeEmphasis, 0);
  await updateXpAfterEmphasis(item, { oldEmphases, newEmphases, freeEmphasis });
}

/**
 * Track a change to an Advantage's or Disadvantage's cost, such as a ranked Advantage bought up. The cost is the
 * one `onItemPreUpdate` clamped.
 * @param {Item} item - The advantage or disadvantage item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {number} [changes.system.cost] - New cost value (if being changed)
 * @returns {Promise<void>} Resolves when XP logging completes
 * @see {@link module:documents/item/lifecycle/xp-tracking.updateXpAfterCostChange}
 */
async function updateCostXp(item, changes) {
  const oldCost = toInt(item.system?.cost, 0);
  const newCost = toInt(changes?.system?.cost ?? oldCost, 0);

  await updateXpAfterCostChange(item, oldCost, newCost);
}
