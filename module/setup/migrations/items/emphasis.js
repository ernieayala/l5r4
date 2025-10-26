/**
 * Emphasis String to Array Migration
 * Converts legacy emphasis string format to split availableEmphases/trainedEmphases structure.
 *
 * @module setup/migrations/items/emphasis
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Migrates legacy emphasis string format to new split structure.
 *
 * Converts old comma/semicolon-separated emphasis strings into two fields:
 * - availableEmphases: Array of emphasis names available for skill
 * - trainedEmphases: Empty array (training happens on character sheet)
 *
 * Migration Strategy:
 * - Parse old emphasis string (comma/semicolon delimited)
 * - Put all parsed names into availableEmphases array
 * - Initialize trainedEmphases as empty (user will select on character sheet)
 * - Skip if already migrated (has availableEmphases field)
 *
 * Example:
 * Old: system.emphasis = "Katana, Wakizashi"
 * New: system.availableEmphases = ["Katana", "Wakizashi"]
 *      system.trainedEmphases = []
 *
 * @param {Document[]} docs - Array of Item documents to scan for skills
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateEmphasisStringToArray(docs, label) {
  const skillItems = docs.filter(doc => doc.type === "skill");
  if (skillItems.length === 0) {
    return;
  }

  let migratedCount = 0;

  for (const item of skillItems) {
    try {
      const system = item.system || {};

      // Skip if already migrated (has availableEmphases array)
      if (Array.isArray(system.availableEmphases)) {
        continue;
      }

      // Parse old emphasis string
      const oldEmphasis = system.emphasis ?? "";
      const trimmed = String(oldEmphasis).trim();

      const emphasisNames = trimmed
        ? trimmed
            .split(/[,;]+/)
            .map(s => s.trim())
            .filter(Boolean)
        : [];

      await item.update(
        {
          "system.availableEmphases": emphasisNames,
          "system.trainedEmphases": []
        },
        { diff: true, render: false }
      );
      migratedCount++;
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate skill emphasis", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Migrated ${migratedCount} skill items from emphasis string to split fields (${label})`
    );
  }
}
