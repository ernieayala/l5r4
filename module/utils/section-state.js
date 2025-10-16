/**
 * Section Collapse State Management
 *
 * Utilities for persisting actor sheet section collapsed/expanded states across
 * sheet re-renders and browser sessions. Uses Foundry's user flag system to store
 * per-actor, per-section UI preferences.
 *
 * **Storage Pattern:**
 * Flags are stored at: `game.user.flags.l5r4-enhanced.collapsedSections`
 * Structure: `{ [actorId]: { [scope]: boolean } }`
 * Example: `{ "Actor.abc123": { "skills": true, "weapons": false } }`
 *
 * **Integration Points:**
 * - Sheet _prepareContext: Read state to inject into template context
 * - Toggle handler: Write state when user clicks expand/collapse button
 * - Templates: Apply "is-collapsed" class based on context data
 *
 * @module utils/section-state
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Retrieves the collapsed state for a specific section on an actor sheet.
 *
 * Looks up the user's preference for whether a given section (identified by scope)
 * should be collapsed. Returns false (expanded) by default if no preference exists.
 *
 * **Scope Examples:**
 * - "skills" - Skills section
 * - "weapons" - Weapons section
 * - "spells" - Spells section
 * - "advantages" - Advantages section
 * - "disadvantages" - Disadvantages section
 * - "bio" - Biography section
 *
 * @param {string} actorId - The actor's UUID or ID for preference lookup
 * @param {string} scope - The section identifier (matches data-scope in templates)
 * @returns {boolean} True if section should be collapsed, false if expanded
 *
 * @example
 * const isCollapsed = getSectionCollapsed("Actor.abc123", "skills");
 * // Returns: true (if user previously collapsed skills section)
 */
export function getSectionCollapsed(actorId, scope) {
  try {
    const map = game.user?.getFlag(SYS_ID, "collapsedSections") ?? {};
    return map?.[actorId]?.[scope] ?? false; // Default: expanded
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to get section collapsed state", { err, actorId, scope });
    return false;
  }
}

/**
 * Persists the collapsed state for a specific section on an actor sheet.
 *
 * Stores the user's preference for whether a given section should be collapsed.
 * Updates are atomic and merged with existing preferences, so setting one section's
 * state doesn't affect other sections or other actors.
 *
 * **Persistence:**
 * - Stored in user flags (per-user preferences)
 * - Survives sheet re-renders
 * - Survives browser sessions
 * - Survives world reload
 *
 * @param {string} actorId - The actor's UUID or ID
 * @param {string} scope - The section identifier (matches data-scope in templates)
 * @param {boolean} isCollapsed - True to collapse, false to expand
 * @returns {Promise<void>} Resolves when flag is updated
 *
 * @async
 * @example
 * await setSectionCollapsed("Actor.abc123", "skills", true);
 * // Skills section will now render collapsed on all future opens
 */
export async function setSectionCollapsed(actorId, scope, isCollapsed) {
  try {
    const map = (await game.user?.getFlag(SYS_ID, "collapsedSections")) ?? {};
    const out = { ...map };
    out[actorId] = { ...(out[actorId] ?? {}), [scope]: isCollapsed };
    await game.user?.setFlag(SYS_ID, "collapsedSections", out);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to set section collapsed state", {
      err,
      actorId,
      scope,
      isCollapsed
    });
  }
}

/**
 * Builds a map of all section collapse states for an actor sheet.
 *
 * Retrieves collapsed states for all provided section scopes at once, returning
 * a convenient map object suitable for passing into template context.
 *
 * **Usage Pattern:**
 * This is typically called during sheet _prepareContext() to inject collapse states
 * into the template rendering data.
 *
 * @param {string} actorId - The actor's UUID or ID
 * @param {string[]} scopes - Array of section identifiers to check
 * @returns {Object.<string, boolean>} Map of scope to collapsed state
 *
 * @example
 * const collapsed = getSectionCollapsedMap("Actor.abc123",
 *   ["skills", "weapons", "spells", "advantages"]
 * );
 * // Returns: { skills: true, weapons: false, spells: false, advantages: true }
 */
export function getSectionCollapsedMap(actorId, scopes) {
  const result = {};
  for (const scope of scopes) {
    result[scope] = getSectionCollapsed(actorId, scope);
  }
  return result;
}
