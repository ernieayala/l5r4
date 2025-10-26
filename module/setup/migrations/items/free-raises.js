/**
 * Free Raises Field Migration
 * Ensures all items with itemDescription template have freeRaises field.
 *
 * @module setup/migrations/items/free-raises
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Ensures all items with itemDescription template have freeRaises field.
 *
 * Backfills freeRaises field for items created before the Raise/Free Raise system
 * was implemented. All items using the itemDescription template (advantages, disadvantages,
 * spells, techniques, skills, etc.) should have freeRaises: 0 as default.
 *
 * L5R4 Free Raises Mechanic (game-rules/Skills_and_Rolls.md):
 * Free Raises grant Raise benefits without +5 TN increase and don't count toward
 * Void Ring maximum. Items like advantages or school techniques can grant Free Raises.
 *
 * @param {Document[]} docs - Array of Item documents to scan
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateFreeRaisesDefaults(docs, label) {
  const itemDocs = docs.filter(doc => doc.documentName === "Item");
  if (itemDocs.length === 0) {
    return;
  }

  console.warn(
    `${SYS_ID} | Migrating ${itemDocs.length} items to ensure freeRaises field exists (${label})`
  );

  let migratedCount = 0;

  for (const item of itemDocs) {
    try {
      const currentFreeRaises = item.system?.freeRaises;
      if (currentFreeRaises === undefined || currentFreeRaises === null) {
        await item.update({ "system.freeRaises": 0 }, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate freeRaises default", {
        id: item.id,
        name: item.name,
        type: item.type,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} items with freeRaises field (${label})`
    );
  }
}
