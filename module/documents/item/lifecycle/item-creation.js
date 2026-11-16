/**
 * @module documents/item/lifecycle/item-creation
 * @description What L5R4Item's `_preCreate` and `_onCreate` do for an item: before creation, the item type's
 * default icon in place of core's bag icon and an Advantage or Disadvantage cost of at least 0; after creation of an
 * owned Skill, Advantage, or Disadvantage, the owner's XP history marked for rebuilding (xp-tracking.js).
 */

import { toInt } from "../../../utils/type-coercion.js";
import { DEFAULT_ICONS } from "../constants/item-types.js";
import {
  updateXpAfterSkillCreate,
  updateXpAfterAdvantage,
  updateXpAfterDisadvantage
} from "./xp-tracking.js";

/**
 * Prepare an item's source before creation: an item with no image or core's bag icon takes its type's default icon
 * (a weapon with `system.isBow` the bow icon), and an Advantage's or Disadvantage's cost is clamped to 0 or more, so
 * a negative cost never adds XP. Changes the item with `updateSource()`.
 * @param {L5R4Item} item - The item document being created (mutable during preCreate)
 * @param {object} data - The raw creation data object passed to Item.create()
 * @param {object} [data.system] - Item system data containing type-specific properties
 * @param {boolean} [data.system.isBow] - Flag indicating weapon is a bow (for icon resolution)
 * @param {number} [data.system.cost] - XP cost for advantages/disadvantages
 * @returns {void} Modifies item in-place via updateSource()
 */
export function onItemPreCreate(item, data) {
  // Assign L5R4-specific default icon if using Foundry's generic icon
  const isUnsetOrBag = !item.img || item.img === "icons/svg/item-bag.svg";
  if (isUnsetOrBag) {
    // Special case: Bow weapons (type='weapon' + isBow flag) use 'bow' icon
    // Supports legacy migration from pre-v1.0.0 where bows were separate type
    const isBow = item.type === "weapon" && (item.system?.isBow || data?.system?.isBow);
    const iconType = isBow ? "bow" : item.type;
    const icon = DEFAULT_ICONS[iconType] ?? "icons/svg/item-bag.svg";
    item.updateSource({ img: icon });
  }

  // Clamp advantage/disadvantage costs to non-negative values
  // Prevents XP exploits from negative costs (advantages always cost XP, disadvantages grant XP)
  if (item.type === "advantage" || item.type === "disadvantage") {
    const raw = data?.system?.cost ?? item.system?.cost;
    const clamped = Math.max(0, toInt(raw, 0));
    item.updateSource({ "system.cost": clamped });
  }
}

/**
 * After an owned Skill, Advantage, or Disadvantage is created, mark the owner's XP history for rebuilding
 * (xp-tracking.js). Other item types, and items with no owner, cost no XP and are left alone.
 * @param {L5R4Item} item - The newly created item document (immutable, persisted to DB)
 * @param {object} _data - The creation data object passed to Item.create()
 * @returns {Promise<void>} Resolves when XP tracking is complete
 */
export async function onItemCreate(item, _data) {
  // Only track XP for actor-owned skills, advantages, and disadvantages
  // Orphan items (no actor) and non-XP item types are ignored
  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  const sys = item.system ?? {};

  if (item.type === "skill") {
    await updateXpAfterSkillCreate(item, sys);
  } else {
    const cost = toInt(sys.cost, 0);
    if (item.type === "advantage") {
      await updateXpAfterAdvantage(item, cost);
    } else {
      await updateXpAfterDisadvantage(item, cost);
    }
  }
}
