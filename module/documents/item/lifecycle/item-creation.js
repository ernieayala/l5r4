/**
 * @fileoverview Item Creation Lifecycle Logic
 * 
 * Handler functions for item creation lifecycle (preCreate/onCreate) including
 * icon assignment, cost validation, and initial XP logging for embedded items.
 * 
 * **Responsibilities:**
 * - Assign type-appropriate default icons on creation
 * - Validate and clamp advantage/disadvantage costs
 * - Log initial XP expenditures for skills, advantages, disadvantages
 * - Handle item creation defaults and initialization
 * 
 * **Architecture:**
 * Lifecycle logic called during Foundry document creation hooks.
 * Delegates to xp-tracking.js for XP logging operations.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { DEFAULT_ICONS } from "../constants/item-types.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  logSkillCreationXp,
  logAdvantageXp,
  logDisadvantageXp
} from "./xp-tracking.js";

/**
 * @typedef {object} ItemCreationData
 * @property {object} [system] - System-specific data
 * @property {number} [system.cost] - Cost for advantages/disadvantages
 */

/**
 * Handle item pre-creation setup and validation.
 * 
 * Assigns default icons and enforces cost constraints for advantages/disadvantages.
 * Called by Foundry before item document is created.
 * 
 * **Icon Assignment:**
 * - If no icon or generic bag icon: assign type-specific default
 * - Ensures items have appropriate visual representation
 * 
 * **Cost Validation:**
 * - Advantages: Cost must be non-negative (≥0)
 * - Disadvantages: Cost must be non-negative (≥0, grants XP in calculations)
 * 
 * @param {L5R4Item} item - The item being created
 * @param {ItemCreationData} data - Initial data object for creation
 * @returns {void} Mutates item via updateSource()
 */
export function handleItemPreCreate(item, data) {
  // Assign default icon if none provided or using generic bag icon
  const isUnsetOrBag = !item.img || item.img === "icons/svg/item-bag.svg";
  if (isUnsetOrBag) {
    // Special case: bows are weapon type but need bow icon
    const isBow = item.type === "weapon" && (item.system?.isBow || data?.system?.isBow);
    const iconType = isBow ? "bow" : item.type;
    const icon = DEFAULT_ICONS[iconType] ?? "icons/svg/item-bag.svg";
    item.updateSource({ img: icon });
  }

  // Enforce cost constraints (must be non-negative for both types)
  // Disadvantages store positive costs but grant XP in actor total calculations
  if (item.type === "advantage" || item.type === "disadvantage") {
    const raw = data?.system?.cost ?? item.system?.cost;
    const clamped = Math.max(0, toInt(raw, 0));
    item.updateSource({ "system.cost": clamped });
  }
}

/**
 * Handle item post-creation XP tracking.
 * 
 * Logs XP expenditures for skills, advantages, and disadvantages when
 * items are added to actors. Delegates to xp-tracking.js for L5R4 cost
 * formula calculations including school bonuses.
 * 
 * **XP Tracking:**
 * - Skills: Calculates rank-based progression with school bonuses
 * - Advantages: Logs direct cost value
 * - Disadvantages: Logs direct cost value (grants XP in totals)
 * 
 * **Note:** Only tracks XP for items embedded on actors, not standalone items.
 * 
 * @param {L5R4Item} item - The item that was created
 * @param {ItemCreationData} data - The data object of the created document (unused, provided by Foundry)
 * @returns {Promise<void>} Async XP logging (non-blocking)
 */
export async function handleItemOnCreate(item, data) {
  // Only track XP when embedded on an Actor and for trackable types
  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  const sys = item.system ?? {};

  // Log skill creation XP
  if (item.type === "skill") {
    await logSkillCreationXp(item, sys);
  }
  
  // Log advantage creation XP
  else if (item.type === "advantage") {
    const cost = toInt(sys.cost, 0);
    await logAdvantageXp(item, cost);
  }
  
  // Log disadvantage creation XP
  else if (item.type === "disadvantage") {
    const cost = toInt(sys.cost, 0);
    await logDisadvantageXp(item, cost);
  }
}
