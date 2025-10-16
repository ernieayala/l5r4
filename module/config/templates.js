/**
 * Template Path Configuration
 * Provides utilities and constants for building Handlebars template paths
 * used throughout the L5R4 Enhanced system for rendering sheets, chat cards, and dialogs.
 *
 * Architecture:
 * - TEMPLATE() function: Validated path builder for dynamic template references
 * - CHAT_TEMPLATES: Pre-built paths for roll results and combat chat cards
 * - DIALOG_TEMPLATES: Pre-built paths for user input dialogs
 *
 * All paths are validated at runtime and frozen to prevent accidental modification.
 * Templates are rendered using Foundry's Handlebars engine via renderTemplate() API.
 *
 * Foundry VTT Requirements:
 * - Requires Foundry v13+ for Handlebars template rendering
 * - Paths follow Foundry's systems directory structure (systems/[sysId]/templates/)
 * - Templates consumed by foundry.utils.renderTemplate() and Application rendering
 *
 * @module config/templates
 * @requires Foundry VTT v13+
 */

import { PATHS } from "./constants.js";

// Alias for Object.freeze - used to make template path objects immutable
// Prevents accidental runtime modification of template references
const freeze = Object.freeze;

/**
 * Constructs a validated absolute template path for Foundry's renderTemplate() API.
 * Builds paths relative to the system's templates directory with runtime validation.
 *
 * Validation:
 * - Ensures relPath is a string (prevents accidental object/array passing)
 * - Rejects empty strings (prevents malformed paths)
 *
 * @param {string} relPath - Template path relative to templates directory (e.g., "chat/simple-roll.hbs")
 * @returns {string} Absolute path in format "systems/l5r4-enhanced/templates/{relPath}"
 * @throws {TypeError} If relPath is not a string
 * @throws {Error} If relPath is empty string
 */
export const TEMPLATE = relPath => {
  // Type guard: Prevent accidental object/array passing from callers
  if (typeof relPath !== "string") {
    throw new TypeError(`TEMPLATE expects string, got ${typeof relPath}`);
  }
  // Validation: Prevent empty paths that would create malformed template references
  if (!relPath) {
    throw new Error("TEMPLATE requires non-empty path");
  }
  return `${PATHS.templates}/${relPath}`;
};

/**
 * Frozen object containing pre-built paths for chat card templates.
 * Used by roll services and combat systems to render chat messages with formatted results.
 *
 * Templates implement L5R4 game mechanics display:
 * - simpleRoll: Standard trait/skill/ring roll results with keep/roll dice display
 * - weaponCard: Weapon attack results with damage, raises, and modifiers
 * - fullDefenseRoll: Full Defense stance roll results per combat rules
 * - healing: Natural healing results with wounds healed and status
 *
 * Frozen to prevent runtime modification and ensure consistent chat rendering.
 * Consumed by foundry.utils.renderTemplate() in chat message creation.
 *
 * @constant {Object}
 * @property {string} simpleRoll - Template path for standard roll results
 * @property {string} weaponCard - Template path for weapon attack chat cards
 * @property {string} fullDefenseRoll - Template path for Full Defense stance rolls
 * @property {string} healing - Template path for natural healing chat cards
 * @readonly
 */
export const CHAT_TEMPLATES = freeze({
  simpleRoll: TEMPLATE("chat/simple-roll.hbs"),
  weaponCard: TEMPLATE("chat/weapon-chat.hbs"),
  fullDefenseRoll: TEMPLATE("chat/full-defense-roll.hbs"),
  healing: TEMPLATE("chat/healing.hbs")
});

/**
 * Frozen object containing pre-built paths for dialog templates.
 * Used by dice services to render user input dialogs for roll modifiers and item creation.
 *
 * Dialogs implement user interaction patterns:
 * - rollModifiers: Raises, Void points, and situational modifiers input for rolls
 * - spellCast: Simplified spell casting dialog with auto affinity/deficiency/TN/slots
 * - unifiedItemCreate: Single dialog for creating any item type (advantages, skills, equipment, etc.)
 *
 * Frozen to prevent runtime modification and ensure consistent dialog rendering.
 * Consumed by DialogV2.prompt() with rendered HTML content.
 *
 * @constant {Object}
 * @property {string} rollModifiers - Template path for roll modifier input dialog
 * @property {string} spellCast - Template path for simplified spell casting dialog
 * @property {string} unifiedItemCreate - Template path for unified item creation dialog
 * @readonly
 */
export const DIALOG_TEMPLATES = freeze({
  rollModifiers: TEMPLATE("dialogs/roll-modifiers-dialog.hbs"),
  spellCast: TEMPLATE("dialogs/spell-cast-dialog.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs")
});
