/**
 * @fileoverview L5R4 Template Path Management
 * 
 * Provides centralized template path resolution for consistent file access
 * across the system. Handles chat templates and dialog templates.
 * 
 * **Responsibilities:**
 * - Define template path helper function
 * - Map chat template paths
 * - Map dialog template paths
 * 
 * **Foundry APIs:**
 * - Template rendering via Handlebars
 * - renderTemplate() global helper
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

import { PATHS } from "./constants.js";

// Optimize repeated Object.freeze calls throughout this module
const freeze = Object.freeze;

/**
 * Build a template path consistently from a relative path.
 * Automatically prepends the system templates directory for consistent
 * file access across the system.
 * 
 * @param {string} relPath - Relative path within the templates directory
 * @returns {string} Full template path ready for Foundry template loading
 * @throws {TypeError} If relPath is not a string
 * @throws {Error} If relPath is empty
 * @example
 * // Get path for actor sheet template
 * const actorTemplate = TEMPLATE("actor/pc-sheet.hbs");
 * // Returns: "systems/l5r4-enhanced/templates/actor/pc-sheet.hbs"
 */
export const TEMPLATE = (relPath) => {
  if (typeof relPath !== "string") {
    throw new TypeError(`TEMPLATE expects string, got ${typeof relPath}`);
  }
  if (!relPath) {
    throw new Error("TEMPLATE requires non-empty path");
  }
  return `${PATHS.templates}/${relPath}`;
};

/**
 * Chat template paths for messages displayed in the chat log.
 * 
 * Templates available:
 * - `simpleRoll`: Basic skill/trait roll results with TN comparison
 * - `weaponCard`: Weapon attack cards with damage and special properties
 * - `fullDefenseRoll`: Full Defense stance roll results
 * 
 * @constant {Readonly<{simpleRoll: string, weaponCard: string, fullDefenseRoll: string}>}
 */
export const CHAT_TEMPLATES = freeze({
  simpleRoll:     TEMPLATE("chat/simple-roll.hbs"),
  weaponCard:     TEMPLATE("chat/weapon-chat.hbs"),
  fullDefenseRoll: TEMPLATE("chat/full-defense-roll.hbs")
});

/**
 * Dialog template paths for modal forms and popups.
 * 
 * Templates available:
 * - `rollModifiers`: Dialog for entering raises, TNs, and other roll modifiers
 * - `unifiedItemCreate`: Universal item creation dialog for all item types
 * 
 * @constant {Readonly<{rollModifiers: string, unifiedItemCreate: string}>}
 */
export const DIALOG_TEMPLATES = freeze({
  rollModifiers:     TEMPLATE("dialogs/roll-modifiers-dialog.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs")
});
