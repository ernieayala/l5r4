/**
 * Emphasis String to Array Migration
 * Converts legacy emphasis string format to split availableEmphases/trainedEmphases structure.
 *
 * @module setup/migrations/items/emphasis
 */

import { SYS_ID } from "../../../config/constants.js";
import { OFFICIAL_EMPHASES } from "../../../config/game-data.js";

/**
 * Find best matching official emphasis for a given name.
 * Tries exact match (case-insensitive), then close matches.
 *
 * @param {string} name - Emphasis name to match
 * @returns {string|null} Matched official emphasis name or null
 * @private
 */
function findOfficialEmphasisMatch(name) {
  if (!name) {
    return null;
  }

  const normalized = name.trim();
  const lower = normalized.toLowerCase();

  // Try exact case-insensitive match
  for (const official of OFFICIAL_EMPHASES) {
    if (official.toLowerCase() === lower) {
      return official;
    }
  }

  // Try close matches (singular/plural, common variations)
  for (const official of OFFICIAL_EMPHASES) {
    const officialLower = official.toLowerCase();

    // Check if one is singular and other is plural
    // e.g., "Dog" matches "Dogs", "Horse" matches "Horses"
    if (officialLower === lower + "s" || officialLower + "s" === lower) {
      return official;
    }

    // Check if normalized name is contained in official (for compound names)
    // e.g., "Riding Horse" might match "Gaijin Riding Horse"
    if (officialLower.includes(lower) || lower.includes(officialLower)) {
      return official;
    }
  }

  return null;
}

/**
 * Get world-level custom emphases from settings.
 *
 * @returns {string[]} Array of custom emphasis names
 * @private
 */
function getWorldCustomEmphases() {
  try {
    const setting = game.settings.get("l5r4-enhanced", "customEmphases");
    return Array.isArray(setting) ? setting : [];
  } catch {
    return [];
  }
}

/**
 * Add custom emphasis to world settings if it doesn't exist.
 *
 * @param {string} emphasisName - Name of custom emphasis to add
 * @returns {Promise<void>}
 * @private
 */
async function addCustomEmphasisToWorld(emphasisName) {
  const current = getWorldCustomEmphases();
  if (!current.includes(emphasisName)) {
    current.push(emphasisName);
    await game.settings.set("l5r4-enhanced", "customEmphases", current);
  }
}

/**
 * Migrates legacy emphasis string format to new split structure.
 *
 * Converts old comma/semicolon-separated emphasis strings into two fields:
 * - availableEmphases: Array of emphasis names available for skill
 * - trainedEmphases: Array of emphasis names that are trained (selected)
 *
 * Migration Strategy:
 * - Parse old emphasis string (comma/semicolon delimited)
 * - Merge with existing availableEmphases/trainedEmphases if present (backward compatibility)
 * - For each parsed emphasis:
 *   1. Try to match with official emphases (case-insensitive, singular/plural)
 *   2. If match found, use official name
 *   3. If no match, create as custom emphasis in world settings
 * - Put matched/created emphasis names into BOTH arrays (deduplicated)
 *   - availableEmphases: Makes them available for selection
 *   - trainedEmphases: Marks them as already trained (they were in old system)
 * - Skip if no old emphasis data AND already has new format populated
 *
 * Backward Compatibility:
 * - Old "emphasis" field kept in template.json to prevent data loss
 * - Migration merges old and new data if both exist
 * - Can run multiple times safely (idempotent with deduplication)
 *
 * Examples:
 * Old: system.emphasis = "Dog, Katana, horse, Boogie Woogie"
 * New: system.availableEmphases = ["Dogs", "Katana", "Horses", "Boogie Woogie"]
 *      system.trainedEmphases = ["Dogs", "Katana", "Horses", "Boogie Woogie"]
 *      (Dogs, Katana, Horses matched official; Boogie Woogie created as custom)
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
  let customEmphasisCount = 0;
  const customEmphasisNames = [];

  for (const item of skillItems) {
    try {
      const system = item.system || {};

      // Parse old emphasis string
      const oldEmphasis = system.emphasis ?? "";
      const trimmed = String(oldEmphasis).trim();

      // Skip if no old emphasis data AND already has new format
      if (
        !trimmed &&
        Array.isArray(system.availableEmphases) &&
        system.availableEmphases.length > 0
      ) {
        continue;
      }

      // If already has availableEmphases but also has old emphasis string, merge them
      const existingAvailable = Array.isArray(system.availableEmphases)
        ? system.availableEmphases
        : [];
      const existingTrained = Array.isArray(system.trainedEmphases) ? system.trainedEmphases : [];

      const parsedNames = trimmed
        ? trimmed
            .split(/[,;]+/)
            .map(s => s.trim())
            .filter(Boolean)
        : [];

      // Match each parsed name to official emphases or create custom
      const finalAvailable = [...existingAvailable];
      const finalTrained = [...existingTrained];

      for (const parsedName of parsedNames) {
        // Try to find official match
        const officialMatch = findOfficialEmphasisMatch(parsedName);

        const emphasisName = officialMatch || parsedName.trim();

        // Add to available emphases (avoid duplicates)
        if (!finalAvailable.includes(emphasisName)) {
          finalAvailable.push(emphasisName);
        }

        // Add to trained emphases (these were already trained in old system)
        if (!finalTrained.includes(emphasisName)) {
          finalTrained.push(emphasisName);
        }

        // If no official match, create as custom emphasis
        if (!officialMatch) {
          await addCustomEmphasisToWorld(emphasisName);

          // Track for logging
          if (!customEmphasisNames.includes(emphasisName)) {
            customEmphasisNames.push(emphasisName);
            customEmphasisCount++;
          }
        }
      }

      // Only update if we actually processed something
      if (parsedNames.length > 0 || existingAvailable.length === 0) {
        await item.update(
          {
            "system.availableEmphases": finalAvailable,
            "system.trainedEmphases": finalTrained
          },
          { diff: true, render: false }
        );
        migratedCount++;
      }
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

    if (customEmphasisCount > 0) {
      console.warn(
        `${SYS_ID} | Created ${customEmphasisCount} custom emphases during migration: ${customEmphasisNames.join(
          ", "
        )}`
      );
    }
  }
}
