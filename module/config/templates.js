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
 * @see {@link https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.renderTemplate.html|Foundry renderTemplate}
 */

import { PATHS } from "./constants.js";

const freeze = Object.freeze;

/**
 * Resolves a relative template path to a full system template path.
 * Includes defensive validation to ensure path is valid before use.
 *
 * @param {string} relPath - Relative path from templates directory (e.g., "chat/check-card.hbs")
 * @returns {string} Full template path suitable for Foundry's renderTemplate
 * @throws {TypeError} If relPath is not a string
 * @throws {Error} If relPath is empty
 *
 * @example
 * // Basic usage:
 * const path = TEMPLATE("chat/check-card.hbs");
 * // Returns: "systems/l5r4-enhanced/templates/chat/check-card.hbs"
 *
 * @example
 * // Use with Foundry's renderTemplate:
 * const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE("chat/weapon-chat.hbs"), data);
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
 * @property {string} checkCard - A roll from the roll pipeline (`roll` ChatMessage subtype)
 * @property {string} weaponCard - Weapon attack roll display
 * @property {string} effectPrompt - A save, Full Defense roll, or Concentration check an effect asks for
 * @property {string} damageResult - Wounds a damage roll dealt, with Void reduction and Undo
 * @property {string} flowCard - A guided combat flow (iaijutsu duel, grapple)
 * @property {string} healing - Healing action results
 *
 * @example
 * const html = await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.healing, data);
 * ChatMessage.create({ content: html });
 */
export const CHAT_TEMPLATES = freeze({
  checkCard: TEMPLATE("chat/check-card.hbs"),
  weaponCard: TEMPLATE("chat/weapon-chat.hbs"),
  effectPrompt: TEMPLATE("chat/effect-prompt.hbs"),
  damageResult: TEMPLATE("chat/damage-result.hbs"),
  flowCard: TEMPLATE("chat/flow-card.hbs"),
  healing: TEMPLATE("chat/healing.hbs")
});

/**
 * Pre-configured template paths for dialog rendering.
 * Used by dialog handlers to display user input forms.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} check - The roll pipeline's dialog
 * @property {string} checkRing - Its Ring Roll extras (casting a spell)
 * @property {string} checkSpell - Its spell extras (the slot)
 * @property {string} checkMaho - Its maho extras (blood)
 * @property {string} unifiedItemCreate - Universal item creation dialog
 */
export const DIALOG_TEMPLATES = freeze({
  check: TEMPLATE("dialogs/check-dialog.hbs"),
  checkRing: TEMPLATE("dialogs/check-extras/ring.hbs"),
  checkSpell: TEMPLATE("dialogs/check-extras/spell.hbs"),
  checkMaho: TEMPLATE("dialogs/check-extras/maho.hbs"),
  checkSlot: TEMPLATE("dialogs/check-extras/slot.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs")
});
