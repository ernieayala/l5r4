/**
 * @file Handlebars template path configurations
 * @module config/templates
 *
 * Provides template path resolution utilities and pre-configured template paths.
 * All templates are Handlebars (.hbs) files used for rendering UI components.
 *
 * Architectural Decision: Centralized template paths prevent hardcoded strings
 * throughout the codebase and provide compile-time validation of template paths.
 * The TEMPLATE function includes defensive validation to catch errors early.
 *
 * @see {@link https://foundryvtt.com/api/functions/client.renderTemplate.html|Foundry renderTemplate}
 */

import { PATHS } from "./constants.js";

const freeze = Object.freeze;

/**
 * Resolves a relative template path to a full system template path.
 * Includes defensive validation to ensure path is valid before use.
 *
 * @param {string} relPath - Relative path from templates directory (e.g., "chat/simple-roll.hbs")
 * @returns {string} Full template path suitable for Foundry's renderTemplate
 * @throws {TypeError} If relPath is not a string
 * @throws {Error} If relPath is empty
 *
 * @example
 * // Basic usage:
 * const path = TEMPLATE("chat/simple-roll.hbs");
 * // Returns: "systems/l5r4-enhanced/templates/chat/simple-roll.hbs"
 *
 * @example
 * // Use with Foundry's renderTemplate:
 * const html = await renderTemplate(TEMPLATE("chat/weapon-chat.hbs"), data);
 *
 * @example
 * // Validation - throws TypeError:
 * TEMPLATE(123); // TypeError: TEMPLATE expects string, got number
 *
 * @example
 * // Validation - throws Error:
 * TEMPLATE(""); // Error: TEMPLATE requires non-empty path
 */
export const TEMPLATE = relPath => {
  // Validate parameter type
  if (typeof relPath !== "string") {
    throw new TypeError(`TEMPLATE expects string, got ${typeof relPath}`);
  }

  // Validate parameter is not empty
  if (!relPath) {
    throw new Error("TEMPLATE requires non-empty path");
  }

  return `${PATHS.templates}/${relPath}`;
};

/**
 * Pre-configured template paths for chat message rendering.
 * Used by chat message handlers to display roll results and actions.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} simpleRoll - Simple skill/trait roll results
 * @property {string} weaponCard - Weapon attack roll display
 * @property {string} fullDefenseRoll - Full defense action results
 * @property {string} healing - Healing action results
 *
 * @example
 * // Render simple roll to chat:
 * const html = await renderTemplate(CHAT_TEMPLATES.simpleRoll, {
 *   roll: rollResult,
 *   flavor: "Kenjutsu Roll"
 * });
 * ChatMessage.create({ content: html });
 */
export const CHAT_TEMPLATES = freeze({
  simpleRoll: TEMPLATE("chat/simple-roll.hbs"),
  weaponCard: TEMPLATE("chat/weapon-chat.hbs"),
  fullDefenseRoll: TEMPLATE("chat/full-defense-roll.hbs"),
  healing: TEMPLATE("chat/healing.hbs")
});

/**
 * Pre-configured template paths for dialog rendering.
 * Used by dialog handlers to display user input forms.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} rollModifiers - Roll modifier selection dialog
 * @property {string} spellCast - Spell casting configuration dialog
 * @property {string} mahoCast - Maho (blood magic) casting dialog
 * @property {string} unifiedItemCreate - Universal item creation dialog
 *
 * @example
 * // Render roll modifiers dialog:
 * const html = await renderTemplate(DIALOG_TEMPLATES.rollModifiers, {
 *   modifiers: availableModifiers
 * });
 * new Dialog({ content: html, ... }).render(true);
 */
export const DIALOG_TEMPLATES = freeze({
  rollModifiers: TEMPLATE("dialogs/roll-modifiers-dialog.hbs"),
  spellCast: TEMPLATE("dialogs/spell-cast-dialog.hbs"),
  mahoCast: TEMPLATE("dialogs/maho-cast-dialog.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs")
});
