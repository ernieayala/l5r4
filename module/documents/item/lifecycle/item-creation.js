/**
 * Item Creation Lifecycle - Default Icons & XP Tracking
 *
 * Handles item initialization during Foundry's Document creation lifecycle:
 * 1. Pre-creation: Assigns default icons and validates advantage/disadvantage costs
 * 2. Post-creation: Logs XP expenditures for skills, advantages, and disadvantages
 *
 * Game Mechanics Integration:
 * - Advantages cost XP during character creation (Character Creation rules)
 * - Disadvantages grant XP up to a maximum of 10 points total (Advantages & Disadvantages rules)
 * - Skills cost XP equal to the rank purchased (1 XP for rank 1, cumulative thereafter)
 * - Cost clamping prevents negative values to avoid XP exploits
 *
 * Architecture:
 * - Called by L5R4Item Document class via _preCreate() and _onCreate() overrides
 * - Uses updateSource() to modify data before validation (Foundry v10+ pattern)
 * - Integrates with xp-tracking.js for XP journal entries
 * - Coordinates with constants/item-types.js for default icon resolution
 *
 * Foundry VTT Integration:
 * - Implements Document lifecycle hooks (preCreate, onCreate)
 * - Uses updateSource() for mutation during preCreate phase
 * - Requires Foundry v13+ for Item DataModel lifecycle
 * - Asynchronous onCreate for XP flag updates on Actor
 *
 * Special Cases:
 * - Bow weapons: type='weapon' + system.isBow=true uses 'bow' icon (legacy migration support)
 * - XP tracking: Only applies to items owned by actors (orphan items ignored)
 * - Cost validation: advantage/disadvantage costs clamped to non-negative values
 *
 * Consumers:
 * - item.js: Registers these functions as L5R4Item lifecycle hook handlers
 * - xp-tracking.js: Receives calls to log XP expenditures
 *
 * @module documents/item/lifecycle/item-creation
 * @requires Foundry VTT v13+
 */

// Utils
import { toInt } from "../../../utils/type-coercion.js";

// Feature modules
import { DEFAULT_ICONS } from "../constants/item-types.js";

// Local helpers
import { logSkillCreationXp, logAdvantageXp, logDisadvantageXp } from "./xp-tracking.js";

/**
 * Pre-creation lifecycle handler for L5R4 items.
 *
 * Executes during Foundry's _preCreate hook before item validation and database insertion.
 * Performs two initialization tasks:
 *
 * 1. **Default Icon Assignment**: Replaces Foundry's default "item-bag.svg" with L5R4-specific icons
 *    - Maps item types to themed icons from DEFAULT_ICONS constant
 *    - Special handling: weapon.isBow=true resolves to 'bow' icon (legacy migration support)
 *    - Fallback: Returns to "item-bag.svg" if item type not found in mapping
 *
 * 2. **Advantage/Disadvantage Cost Validation**: Clamps cost values to non-negative range
 *    - Implements character creation rule: advantages cost XP, disadvantages grant XP (max 10 total)
 *    - Prevents negative costs that could exploit XP system
 *    - Uses updateSource() to modify data before validation (Foundry v10+ pattern)
 *
 * Game Rules:
 * - Advantages: Cost XP points as listed (e.g., 3-point advantage costs 3 XP)
 * - Disadvantages: Grant XP points up to 10 total maximum during character creation
 * - Cost validation ensures data integrity before database persistence
 *
 * Foundry Integration:
 * - Called by L5R4Item._preCreate() override in item.js
 * - Uses updateSource() to mutate document data during creation phase
 * - Executes before Foundry's data validation and schema enforcement
 * - Synchronous operation (no await needed for updateSource)
 *
 * @param {L5R4Item} item - The item document being created (mutable during preCreate)
 * @param {object} data - The raw creation data object passed to Item.create()
 * @param {object} [data.system] - Item system data containing type-specific properties
 * @param {boolean} [data.system.isBow] - Flag indicating weapon is a bow (for icon resolution)
 * @param {number} [data.system.cost] - XP cost for advantages/disadvantages
 *
 * @returns {void} Modifies item in-place via updateSource()
 */
export function handleItemPreCreate(item, data) {
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
 * Post-creation lifecycle handler for L5R4 items.
 *
 * Executes during Foundry's _onCreate hook after item is persisted to database.
 * Logs XP expenditures to the owning actor's XP journal for character advancement tracking.
 *
 * XP Tracking Rules (from Character Creation & Advancement):
 * - **Skills**: Cost = rank purchased (1 XP for rank 1, cumulative for higher ranks)
 *   - Example: Creating a rank 3 skill costs 1+2+3 = 6 XP total
 * - **Advantages**: Cost = listed XP value (deducted from available XP)
 * - **Disadvantages**: Cost = listed XP value (added to available XP, max 10 total)
 *
 * Filtered Tracking:
 * - Only applies to items owned by actors (orphan items ignored)
 * - Only tracks XP for: 'skill', 'advantage', 'disadvantage' types
 * - Other item types (weapons, armor, etc.) do not consume XP
 *
 * XP Journal Integration:
 * - Delegates to xp-tracking.js functions for standardized journal entries
 * - Creates timestamped entries with delta, note, and type metadata
 * - Entries displayed in XP Manager application for audit trail
 *
 * Foundry Integration:
 * - Called by L5R4Item._onCreate() override in item.js
 * - Asynchronous: awaits XP flag updates on Actor document
 * - Executes after item is committed to database (safe to read item.id)
 * - Uses Actor.setFlag() to persist XP journal to actor flags
 *
 * @param {L5R4Item} item - The newly created item document (immutable, persisted to DB)
 * @param {object} data - The creation data object passed to Item.create()
 * @param {object} [data.system] - Item system data containing type-specific properties
 * @param {number} [data.system.rank] - Skill rank purchased (for skill XP calculation)
 * @param {number} [data.system.cost] - XP cost for advantages/disadvantages
 *
 * @returns {Promise<void>} Resolves when XP tracking is complete
 */
export async function handleItemOnCreate(item, _data) {
  // Only track XP for actor-owned skills, advantages, and disadvantages
  // Orphan items (no actor) and non-XP item types are ignored
  if (!item.actor || !["skill", "advantage", "disadvantage"].includes(item.type)) {
    return;
  }

  const sys = item.system ?? {};

  if (item.type === "skill") {
    await logSkillCreationXp(item, sys);
  } else {
    const cost = toInt(sys.cost, 0);
    if (item.type === "advantage") {
      await logAdvantageXp(item, cost);
    } else {
      await logDisadvantageXp(item, cost);
    }
  }
}
