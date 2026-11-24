/**
 * @module setup/migrations/items/emphasis
 * @description Converts the legacy Emphasis string to the split availableEmphases and trainedEmphases structure.
 */
import { OFFICIAL_EMPHASES } from "../../../config/reference-data.js";

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
 * - Old "emphasis" field kept in the skill data model (module/data/item/skill-data.js) to prevent data loss
 * - Migration merges old and new data if both exist
 * - Can run multiple times safely (idempotent with deduplication)
 *
 * Examples:
 * Old: system.emphasis = "Dog, Katana, horse, Boogie Woogie"
 * New: system.availableEmphases = ["Dogs", "Katana", "Horses", "Boogie Woogie"]
 *      system.trainedEmphases = ["Dogs", "Katana", "Horses", "Boogie Woogie"]
 *      (Dogs, Katana, Horses matched official; Boogie Woogie created as custom)
 *
 * It runs once per skill (#181), so an Emphasis the player untrains afterwards stays untrained.
 *
 * @param {Item} item - An item; anything but a skill is left alone
 * @returns {Promise<void>}
 */
export async function migrateEmphasisStringToArray(item) {
  if (item.type !== "skill") {
    return;
  }
  const system = item.system || {};

  // Parse old emphasis string
  const oldEmphasis = system.emphasis ?? "";
  const trimmed = String(oldEmphasis).trim();

  // Skip if no old emphasis data AND already has new format
  if (!trimmed && Array.isArray(system.availableEmphases) && system.availableEmphases.length > 0) {
    return;
  }

  // If already has availableEmphases but also has old emphasis string, merge them
  const existingAvailable = Array.isArray(system.availableEmphases) ? system.availableEmphases : [];
  const existingTrained = Array.isArray(system.trainedEmphases) ? system.trainedEmphases : [];

  const parsedNames = parseEmphasisString(trimmed);
  const lists = { available: [...existingAvailable], trained: [...existingTrained] };
  await migrateEmphasisNames(parsedNames, lists);

  // Update only when something was processed
  if (parsedNames.length === 0 && existingAvailable.length > 0) {
    return;
  }
  await item.update(
    {
      "system.availableEmphases": lists.available,
      "system.trainedEmphases": lists.trained
    },
    { diff: true, render: false }
  );
}

/**
 * Add each parsed Emphasis to the available and trained lists once, as its official name when one matches; one with
 * no official match becomes a custom Emphasis in the world settings.
 * @param {string[]} parsedNames - The names the old string held
 * @param {{available: string[], trained: string[]}} lists - Extended in place
 * @returns {Promise<void>}
 */
async function migrateEmphasisNames(parsedNames, lists) {
  for (const parsedName of parsedNames) {
    // Try to find official match
    const officialMatch = getOfficialEmphasis(parsedName);

    const emphasisName = officialMatch || parsedName.trim();

    // Add to available emphases (avoid duplicates)
    if (!lists.available.includes(emphasisName)) {
      lists.available.push(emphasisName);
    }

    // Add to trained emphases (these were already trained in old system)
    if (!lists.trained.includes(emphasisName)) {
      lists.trained.push(emphasisName);
    }

    // If no official match, create as custom emphasis
    if (!officialMatch) {
      await updateWorldCustomEmphases(emphasisName);
    }
  }
}

/**
 * The Emphasis names an old comma- or semicolon-separated string holds, trimmed; none for an empty string.
 * @param {string} text
 * @returns {string[]}
 */
function parseEmphasisString(text) {
  return text
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Find best matching official emphasis for a given name.
 * Tries exact match (case-insensitive), then close matches.
 *
 * @param {string} name - Emphasis name to match
 * @returns {string|null} Matched official emphasis name or null
 */
function getOfficialEmphasis(name) {
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
 */
async function updateWorldCustomEmphases(emphasisName) {
  const current = getWorldCustomEmphases();
  if (!current.includes(emphasisName)) {
    current.push(emphasisName);
    await game.settings.set("l5r4-enhanced", "customEmphases", current);
  }
}
