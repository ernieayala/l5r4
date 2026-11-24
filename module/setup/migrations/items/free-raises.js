/**
 * @module setup/migrations/items/free-raises
 * @description Ensures every item with the itemDescription template has the freeRaises field.
 */

/**
 * Backfills an item's freeRaises field at 0 for items created before the Raise/Free Raise system was implemented.
 * All items using the itemDescription template (advantages, disadvantages, spells, techniques, skills, etc.) should
 * have it.
 *
 * L5R4 Free Raises Mechanic:
 * Free Raises grant Raise benefits without +5 TN increase and don't count toward
 * Void Ring maximum. Items like advantages or school techniques can grant Free Raises.
 *
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function migrateFreeRaisesDefault(item) {
  const freeRaises = item.system?.freeRaises;
  if (freeRaises === undefined || freeRaises === null) {
    await item.update({ "system.freeRaises": 0 }, { diff: true, render: false });
  }
}
