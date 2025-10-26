/**
 * Skill Default Values Migration
 * Ensures skill items have required default values for advancement tracking.
 *
 * @module setup/migrations/items/skill-defaults
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Ensures skill items have required default values for advancement tracking.
 *
 * Backfills freeRanks and freeEmphasis fields which may be missing in skills created
 * before these properties were added. These fields track ranks/emphasis granted by
 * advantages, disadvantages, or school bonuses that don't cost XP.
 *
 * @param {Document[]} docs - Array of Item documents to scan for skills
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateSkillDefaults(docs, label) {
  const skillItems = docs.filter(doc => doc.type === "skill");
  if (skillItems.length === 0) {
    return;
  }

  console.warn(
    `${SYS_ID} | Migrating ${skillItems.length} skill items to ensure proper defaults (${label})`
  );

  let migratedCount = 0;

  for (const item of skillItems) {
    try {
      const updates = {};
      let needsUpdate = false;

      const currentFreeRanks = item.system?.freeRanks;
      if (currentFreeRanks === undefined || currentFreeRanks === null) {
        updates["system.freeRanks"] = 0;
        needsUpdate = true;
      }

      const currentFreeEmphasis = item.system?.freeEmphasis;
      if (currentFreeEmphasis === undefined || currentFreeEmphasis === null) {
        updates["system.freeEmphasis"] = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await item.update(updates, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate skill defaults", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} skill items with default values (${label})`
    );
  }
}
