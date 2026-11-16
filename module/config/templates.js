/**
 * @module config/templates
 * @description Template path resolution and the pre-configured paths of the Handlebars (.hbs) templates the system
 * renders. One place for the paths keeps literal template strings out of the code, and TEMPLATE rejects a bad path
 * where it is built instead of where it is rendered.
 */

import { PATHS } from "./constants.js";

/**
 * Resolve a relative template path to a full system template path: "chat/check.hbs" becomes
 * "systems/l5r4-enhanced/templates/chat/check.hbs".
 * Validates the path before use: a non-string throws a TypeError, an empty string an Error.
 * @param {string} relPath - Relative path from templates directory (e.g., "chat/check.hbs")
 * @returns {string} Full template path suitable for Foundry's renderTemplate
 * @throws {TypeError} If relPath is not a string
 * @throws {Error} If relPath is empty
 */
export function TEMPLATE(relPath) {
  // Validate parameter type
  if (typeof relPath !== "string") {
    throw new TypeError(`TEMPLATE expects string, got ${typeof relPath}`);
  }

  // Validate parameter is not empty
  if (!relPath) {
    throw new Error("TEMPLATE requires non-empty path");
  }

  return `${PATHS.templates}/${relPath}`;
}

/**
 * Pre-configured template paths for chat message rendering, passed to
 * `foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.healing, data)`.
 * Used by chat message handlers to display roll results and actions.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} checkCard - A roll from the roll pipeline (`roll` ChatMessage subtype)
 * @property {string} weaponCard - Weapon attack roll display
 * @property {string} effectPrompt - A save, Full Defense roll, or Concentration check an effect asks for
 * @property {string} damageResult - Wounds a damage roll dealt, with Void reduction and Undo
 * @property {string} flowCard - A guided combat flow (iaijutsu duel, grapple)
 * @property {string} healing - Healing action results
 * @property {string} checkRequest - A GM's request for a roll (module/services/check-request.js)
 * @property {string} itemSummary - An item card's rule lines and book citation (module/utils/rule-summary.js)
 */
export const CHAT_TEMPLATES = Object.freeze({
  checkCard: TEMPLATE("chat/check.hbs"),
  weaponCard: TEMPLATE("chat/weapon-chat.hbs"),
  effectPrompt: TEMPLATE("chat/effect-prompt.hbs"),
  damageResult: TEMPLATE("chat/damage-result.hbs"),
  flowCard: TEMPLATE("chat/flow.hbs"),
  healing: TEMPLATE("chat/healing.hbs"),
  checkRequest: TEMPLATE("chat/check-request.hbs"),
  itemSummary: TEMPLATE("chat/item-summary.hbs")
});

/**
 * Template paths for text links (module/setup/enrichers.js).
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} inlineLink - A Check, Damage, Condition, or Fear link, or a broken one
 */
export const LINK_TEMPLATES = Object.freeze({
  inlineLink: TEMPLATE("links/inline-link.hbs")
});

/**
 * Pre-configured template paths for dialog rendering.
 * Used by dialog handlers to display user input forms.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} check - The roll pipeline's dialog
 * @property {string} checkRing - Its Ring Roll extras (casting a spell)
 * @property {string} checkSpell - Its spell extras (the slot)
 * @property {string} checkMaho - Its maho extras (blood)
 * @property {string} unifiedItemCreate - Universal item creation dialog
 * @property {string} ledger - A change to Honor, Glory, Status, or Taint, with the actor's ledger
 */
export const DIALOG_TEMPLATES = Object.freeze({
  check: TEMPLATE("dialogs/check-dialog.hbs"),
  checkRing: TEMPLATE("dialogs/check-extras/ring.hbs"),
  checkSpell: TEMPLATE("dialogs/check-extras/spell.hbs"),
  checkMaho: TEMPLATE("dialogs/check-extras/maho.hbs"),
  checkSlot: TEMPLATE("dialogs/check-extras/slot.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs"),
  ledger: TEMPLATE("dialogs/ledger-dialog.hbs")
});
