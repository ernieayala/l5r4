/**
 * @module section-state
 * @description Manages collapsed/expanded state for actor sheet sections.
 *
 * Persists UI state in Foundry user flags so sections remember their
 * collapsed/expanded state across sessions. Each user has their own preferences.
 *
 * State is stored as: { [actorId]: { [scope]: boolean } }
 * Example: { "actor123": { "skills": true, "inventory": false } }
 */

import { SYS_ID } from "../config/constants.js";
import { logError } from "./error-logging.js";

/**
 * Gets collapsed state for a specific actor sheet section.
 *
 * Reads from Foundry user flags. Returns false if not set (expanded by default).
 *
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Section identifier (e.g., "skills", "inventory", "techniques")
 * @returns {boolean} True if section is collapsed, false if expanded
 *
 * @example
 * getSectionCollapsed("actor123", "skills") // true if skills section collapsed
 */
export function getSectionCollapsed(actorId, scope) {
  try {
    // Read collapsed sections map from user flags
    const map = game.user?.getFlag(SYS_ID, "collapsedSections") ?? {};
    // Default to false (expanded) if not set
    return map?.[actorId]?.[scope] ?? false;
  } catch (err) {
    logError("Failed to get section collapsed state", err, { actorId, scope });
    // Return expanded state on error
    return false;
  }
}

/**
 * Sets collapsed state for a specific actor sheet section.
 *
 * Persists to Foundry user flags. Updates are per-user, so each user
 * can have different collapsed sections.
 *
 * @param {string} actorId - Actor document ID
 * @param {string} scope - Section identifier (e.g., "skills", "inventory")
 * @param {boolean} isCollapsed - True to collapse, false to expand
 * @returns {Promise<void>}
 *
 * @example
 * await setSectionCollapsed("actor123", "skills", true) // Collapse skills section
 * await setSectionCollapsed("actor123", "inventory", false) // Expand inventory section
 */
export async function setSectionCollapsed(actorId, scope, isCollapsed) {
  try {
    // Read current state from user flags
    const map = (await game.user?.getFlag(SYS_ID, "collapsedSections")) ?? {};
    // Create new state preserving other actors and scopes
    const out = { ...map };
    out[actorId] = { ...(out[actorId] ?? {}), [scope]: isCollapsed };
    // Persist updated state to user flags
    await game.user?.setFlag(SYS_ID, "collapsedSections", out);
  } catch (err) {
    logError("Failed to set section collapsed state", err, {
      actorId,
      scope,
      isCollapsed
    });
  }
}

/**
 * Gets collapsed state for multiple sections at once.
 *
 * Convenience function to get state for all sections in one call.
 * Returns object mapping scope names to collapsed state.
 *
 * @param {string} actorId - Actor document ID
 * @param {string[]} scopes - Array of section identifiers
 * @returns {Object.<string, boolean>} Map of scope to collapsed state
 *
 * @example
 * getSectionCollapsedMap("actor123", ["skills", "inventory", "techniques"])
 * // { skills: true, inventory: false, techniques: false }
 */
export function getSectionCollapsedMap(actorId, scopes) {
  const result = {};
  // Build map of scope -> collapsed state
  for (const scope of scopes) {
    result[scope] = getSectionCollapsed(actorId, scope);
  }
  return result;
}
