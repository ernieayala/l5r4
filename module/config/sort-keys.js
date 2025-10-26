/**
 * Sort key configurations for actor sheets
 *
 * Defines allowed sort columns for each item list scope in actor sheets.
 * Used by sheet classes to validate sort preferences and provide column options.
 *
 * @module config/sort-keys
 */

/**
 * PC sheet allowed sort keys by item type
 *
 * Maps item list scopes to arrays of sortable column keys. Each key corresponds
 * to a property in the item's sheet data context.
 *
 * **Sort Columns by Type:**
 * - **armors**: name, bonus, reduction, equipped
 * - **weapons**: name, damage, size
 * - **items**: name only
 * - **skills**: name, rank, trait, roll, emphasis
 * - **spells**: name, ring, mastery, range, aoe, duration
 * - **techniques**: name only
 * - **katas**: name, ring, mastery
 * - **kihos**: name, ring, mastery, type
 * - **tattoos**: name only
 * - **advantages/disadvantages**: name, type, cost
 * - **advDis** (combined): name, type, cost, item
 *
 * @constant
 * @type {Object.<string, string[]>}
 */
export const PC_SORT_KEYS = {
  armors: ["name", "bonus", "reduction", "equipped"],
  weapons: ["name", "damage", "size"],
  items: ["name"],
  skills: ["name", "rank", "trait", "roll", "emphasis"],
  spells: ["name", "ring", "mastery", "range", "aoe", "duration"],
  techniques: ["name"],
  technique: ["name"],
  katas: ["name", "ring", "mastery"],
  kihos: ["name", "ring", "mastery", "type"],
  tattoos: ["name"],
  advantages: ["name", "type", "cost"],
  disadvantages: ["name", "type", "cost"],
  advDis: ["name", "type", "cost", "item"]
};

/**
 * NPC sheet allowed sort keys by item type
 *
 * Simplified sort options for NPC sheets with fewer item types.
 *
 * @constant
 * @type {Object.<string, string[]>}
 */
export const NPC_SORT_KEYS = {
  weapons: ["name", "damage", "size"],
  items: ["name"],
  skills: ["name", "rank", "trait"],
  spells: ["name", "ring", "mastery"]
};
