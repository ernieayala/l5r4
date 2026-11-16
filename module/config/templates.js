/**
 * @module config/templates
 * @description The paths of the Handlebars (.hbs) templates the system renders for chat cards, text links, markup an
 * app adds outside its window, and dialogs, each under the system's templates folder (`PATHS.templates`).
 */

import { PATHS } from "./constants.js";

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
 * @property {string} note - One or more sentences: a grant, a session, a Concentration upkeep, a contest's outcome
 * @property {string} contest - A Contested Roll between two roll messages
 */
export const CHAT_TEMPLATES = Object.freeze({
  checkCard: `${PATHS.templates}/chat/check.hbs`,
  weaponCard: `${PATHS.templates}/chat/weapon.hbs`,
  effectPrompt: `${PATHS.templates}/chat/effect-prompt.hbs`,
  damageResult: `${PATHS.templates}/chat/damage-result.hbs`,
  flowCard: `${PATHS.templates}/chat/flow.hbs`,
  healing: `${PATHS.templates}/chat/healing.hbs`,
  checkRequest: `${PATHS.templates}/chat/check-request.hbs`,
  itemSummary: `${PATHS.templates}/chat/item-summary.hbs`,
  note: `${PATHS.templates}/chat/note.hbs`,
  contest: `${PATHS.templates}/chat/contest.hbs`
});

/**
 * Template paths for text links (module/setup/enrichers.js).
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} inlineLink - A Check, Damage, Condition, or Fear link, or a broken one
 */
export const LINK_TEMPLATES = Object.freeze({
  inlineLink: `${PATHS.templates}/links/inline-link.hbs`
});

/**
 * Template paths for markup an app adds outside its own window.
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} browserOpen - The Compendium sidebar's Browse button (module/apps/compendium-browser.js)
 */
export const APP_TEMPLATES = Object.freeze({
  browserOpen: `${PATHS.templates}/apps/compendium-browser-open.hbs`
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
 * @property {string} confirm - A confirmation: its question and an optional consequence
 * @property {string} choice - A choice prompt: a label and a select
 * @property {string} removeEmphasis - The question before a custom Emphasis is removed
 */
export const DIALOG_TEMPLATES = Object.freeze({
  check: `${PATHS.templates}/dialogs/check-dialog.hbs`,
  checkRing: `${PATHS.templates}/dialogs/check-extras/ring.hbs`,
  checkSpell: `${PATHS.templates}/dialogs/check-extras/spell.hbs`,
  checkMaho: `${PATHS.templates}/dialogs/check-extras/maho.hbs`,
  checkSlot: `${PATHS.templates}/dialogs/check-extras/slot.hbs`,
  unifiedItemCreate: `${PATHS.templates}/dialogs/unified-item-create-dialog.hbs`,
  ledger: `${PATHS.templates}/dialogs/ledger-dialog.hbs`,
  confirm: `${PATHS.templates}/dialogs/confirm-dialog.hbs`,
  choice: `${PATHS.templates}/dialogs/choice-dialog.hbs`,
  removeEmphasis: `${PATHS.templates}/dialogs/remove-emphasis-dialog.hbs`
});
