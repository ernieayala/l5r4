/**
 * Item Update Lifecycle Handler
 *
 * Foundry VTT preUpdate hook handler for L5R4 item documents. Intercepts
 * item updates to validate data, track XP expenditures, and handle free
 * rank changes that require XP recalculation.
 *
 * Key Responsibilities:
 * - **Cost Validation**: Clamp advantage/disadvantage costs to non-negative
 * - **XP Tracking**: Log XP spent on skill ranks, emphases, and advantages
 * - **Free Rank Management**: Reset XP when school-granted ranks change
 * - **Conditional Updates**: Only track XP for actor-owned items
 *
 * Foundry VTT Integration:
 * - Called from Document.preUpdate hook (Foundry v13+ Document lifecycle)
 * - Receives item reference and changes delta (only modified fields)
 * - Must be async to support await actor.setFlag() calls
 * - Changes parameter follows Foundry's delta update pattern
 *
 * L5R4 Rules Context:
 * - Skills cost XP equal to next rank (rank 3 = 3 XP)
 * - Emphases cost 2 XP each
 * - School skills grant free rank 1 (some grant free emphasis)
 * - Advantages/disadvantages have point costs during creation/advancement
 * - Free ranks are immutable after creation, changes invalidate XP history
 *
 * Usage:
 * - Registered in system init via Hooks.on("preUpdateItem", handleItemPreUpdate)
 * - Only processes items embedded in actors (not compendium items)
 * - Filters by item type (skill, advantage, disadvantage)
 *
 * @module documents/item/lifecycle/item-updates
 * @see module:documents/item/lifecycle/xp-tracking - XP logging functions
 */

import { toInt } from "../../../utils/type-coercion.js";
import {
  logSkillRankXp,
  logEmphasisXp,
  logCostChangeXp,
  resetCalculatedXp
} from "./xp-tracking.js";

/**
 * Handle item preUpdate hook to validate data and track XP expenditures.
 *
 * Foundry VTT preUpdate hook handler called before any item document updates.
 * Performs three key functions:
 * 1. Validates advantage/disadvantage costs (enforce ≥0)
 * 2. Detects free rank changes and triggers XP reset
 * 3. Tracks XP spending for skill/advantage/disadvantage updates
 *
 * **Critical Free Rank Logic:**
 * When a skill's freeRanks or freeEmphasis changes, the entire XP history
 * becomes invalid and must be recalculated. This happens because:
 * - Free ranks affect XP cost retroactively (rank 3 with 0 free = 6 XP,
 *   but rank 3 with 1 free = 5 XP)
 * - Character creation can grant free ranks that weren't set initially
 * - Technique or advantage changes can add/remove free emphases
 *
 * The system resets all XP tracking and relies on the character's current
 * item state to recalculate spent XP on next sheet render.
 *
 * **Item Type Filtering:**
 * Only processes skills, advantages, and disadvantages because:
 * - Skills: Track rank and emphasis XP
 * - Advantages/Disadvantages: Track point cost changes
 * - Other types (weapons, armor, etc.): No XP mechanics
 *
 * **Actor Ownership Check:**
 * Only tracks XP for items embedded in actors (item.actor !== null).
 * Compendium items and unowned items skip XP tracking.
 *
 * Foundry VTT Context:
 * - Hook: preUpdate (called before document.update() applies changes)
 * - Changes parameter: Delta object with only modified fields
 * - Async required: XP logging calls await actor.setFlag()
 *
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
 *
 * @async
 */
export async function handleItemPreUpdate(item, changes) {
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
      await resetCalculatedXp(item.actor);
      return;
    }
  }

  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  if (item.type === "skill") {
    await trackSkillRankIncrease(item, changes);
    await trackEmphasisAdditions(item, changes);
  } else if (item.type === "advantage" || item.type === "disadvantage") {
    await trackCostChange(item, changes);
  }
}

/**
 * Determine if a skill is a school skill based on current or pending changes.
 *
 * School skills receive benefits like free rank 1 and potentially free emphasis.
 * This check looks at both the current state and pending changes because during
 * an update, we need to know if the skill IS or WILL BE a school skill.
 *
 * Logic: Returns true if either:
 * - changes.system.school is being set to truthy (changing to school skill)
 * - item.system.school is already truthy (currently a school skill)
 *
 * Used to determine free rank calculations when tracking skill XP.
 *
 * @param {Item} item - The skill item being checked
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {boolean} [changes.system.school] - New school skill flag (if being changed)
 * @returns {boolean} True if skill is or will be a school skill, false otherwise
 */
function isSchoolSkill(item, changes) {
  return changes?.system?.school ?? item.system?.school ? true : false;
}

/**
 * Track XP expenditure when a skill rank increases.
 *
 * Detects skill rank increases and logs the XP cost according to L5R4
 * advancement rules. Only logs XP when:
 * - Rank actually increases (new > old)
 * - New rank is a valid finite number
 *
 * **Free Ranks Handling:**
 * School skills grant free rank 1, which affects XP cost calculations.
 * Free rank costs are subtracted from the total cost calculation.
 * This ensures characters only pay for ranks they purchased.
 *
 * Example: Advancing school skill from 2→3:
 * - No free rank: Pay 3 XP (cost of rank 3)
 * - 1 free rank: Pay 3 XP (cost of rank 3, rank 1 was free)
 *
 * L5R4 Rules:
 * - Skills cost XP equal to the next rank (rank 3 = 3 XP)
 * - Total cost from 0→3 is triangular sum: 1+2+3 = 6 XP
 * - School skills receive free rank 1, so 0→3 costs 2+3 = 5 XP
 *
 * @param {Item} item - The skill item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {number} [changes.system.rank] - New skill rank (if being changed)
 * @returns {Promise<void>} Resolves when XP logging completes
 *
 * @async
 * @see {@link module:documents/item/lifecycle/xp-tracking.logSkillRankXp}
 */
async function trackSkillRankIncrease(item, changes) {
  const oldRank = toInt(item.system?.rank);
  const newRank = toInt(changes?.system?.rank ?? oldRank);
  const rankIncreased = Number.isFinite(newRank) && newRank > oldRank;

  if (rankIncreased) {
    const newFreeRanks = changes?.system?.freeRanks ?? item.system?.freeRanks;
    const freeRanks = isSchoolSkill(item, changes) ? Math.max(0, parseInt(newFreeRanks) || 0) : 0;

    await logSkillRankXp(item, oldRank, newRank, freeRanks);
  }
}

/**
 * Track XP expenditure when skill emphases are added.
 *
 * Logs XP when trainedEmphases array changes on a skill item. Each emphasis
 * costs 2 XP, minus any free emphasis granted by the skill (freeEmphasis field).
 *
 * L5R4 Rules:
 * - Emphases cost 2 XP each
 * - School skills may grant 1 free emphasis
 * - Only new emphases (increased count) trigger XP logging
 *
 * @param {Item} item - The skill item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @returns {Promise<void>}
 */
async function trackEmphasisAdditions(item, changes) {
  if (!item.actor) {
    return;
  }

  const oldEmphases = item.system?.trainedEmphases ?? [];
  const newEmphases = changes?.system?.trainedEmphases;

  // Only track if trainedEmphases actually changed
  if (!Array.isArray(newEmphases)) {
    return;
  }

  const freeEmphasis = toInt(item.system?.freeEmphasis, 0);
  await logEmphasisXp(item, oldEmphases, newEmphases, freeEmphasis);
}

/**
 * Track XP expenditure when advantage/disadvantage cost changes.
 *
 * Logs XP spending when the point cost of an advantage or disadvantage
 * increases. This typically happens when:
 * - Advantage rank increases (e.g., Luck 2 → Luck 3)
 * - Variable cost advantages adjust (e.g., gaining additional Languages)
 *
 * **Cost Change Rules:**
 * - Only cost increases are logged (cost decreases don't refund XP)
 * - Disadvantages use cost as negative XP (gaining XP, not spending)
 * - Cost is clamped to ≥0 by preUpdate validation (line 96)
 *
 * L5R4 Rules:
 * - Advantages cost their listed XP value
 * - Some advantages can be purchased multiple times (ranks)
 * - Disadvantages grant XP during creation (max 10 XP total)
 * - Advantage/disadvantage changes during play are rare but possible
 *
 * @param {Item} item - The advantage or disadvantage item being updated
 * @param {object} changes - Delta changes object from preUpdate hook
 * @param {number} [changes.system.cost] - New cost value (if being changed)
 * @returns {Promise<void>} Resolves when XP logging completes
 *
 * @async
 * @see {@link module:documents/item/lifecycle/xp-tracking.logCostChangeXp}
 */
async function trackCostChange(item, changes) {
  const oldCost = toInt(item.system?.cost, 0);
  const newCost = toInt(changes?.system?.cost ?? oldCost, 0);

  await logCostChangeXp(item, oldCost, newCost);
}
