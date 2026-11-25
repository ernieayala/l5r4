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
 * @property {string} disadvantageCap - The XP manager's Disadvantage XP cap prompt
 * @property {string} customEmphasis - The Emphasis manager's prompt for a custom Emphasis name
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
  disadvantageCap: `${PATHS.templates}/dialogs/disadvantage-cap-dialog.hbs`,
  customEmphasis: `${PATHS.templates}/dialogs/custom-emphasis-dialog.hbs`
});

/**
 * Every template and partial the system loads into core's template cache during `init`
 * (module/setup/preload-templates.js), so no template loads mid-game.
 * @type {ReadonlyArray<string>}
 */
export const PRELOAD_TEMPLATES = Object.freeze([
  // Item Sheet - Main Tab Partials
  `${PATHS.templates}/item/_partials/_header.hbs`,
  `${PATHS.templates}/item/_partials/_tabs.hbs`,
  `${PATHS.templates}/item/_partials/_tab-details.hbs`,
  `${PATHS.templates}/item/_partials/_tab-modifiers.hbs`,
  `${PATHS.templates}/item/_partials/_tab-description.hbs`,
  `${PATHS.templates}/item/_partials/_tab-effects.hbs`,
  `${PATHS.templates}/item/_partials/_tab-rules.hbs`,
  `${PATHS.templates}/item/_partials/_advantage-details.hbs`,
  `${PATHS.templates}/item/_partials/_mastery-details.hbs`,

  // Rules editor, on item and Active Effect sheets
  `${PATHS.templates}/rules/_partials/_editor.hbs`,
  `${PATHS.templates}/rules/effect-tab.hbs`,

  // Item Sheet - Type-Specific Details Templates
  `${PATHS.templates}/item/_type-details/advantage.hbs`,
  `${PATHS.templates}/item/_type-details/armor.hbs`,
  `${PATHS.templates}/item/_type-details/bow.hbs`,
  `${PATHS.templates}/item/_type-details/clan.hbs`,
  `${PATHS.templates}/item/_type-details/commonItem.hbs`,
  `${PATHS.templates}/item/_type-details/disadvantage.hbs`,
  `${PATHS.templates}/item/_type-details/family.hbs`,
  `${PATHS.templates}/item/_type-details/kata.hbs`,
  `${PATHS.templates}/item/_type-details/kiho.hbs`,
  `${PATHS.templates}/item/_type-details/school.hbs`,
  `${PATHS.templates}/item/_type-details/skill.hbs`,
  `${PATHS.templates}/item/_type-details/spell.hbs`,
  `${PATHS.templates}/item/_type-details/tattoo.hbs`,
  `${PATHS.templates}/item/_type-details/technique.hbs`,
  `${PATHS.templates}/item/_type-details/weapon.hbs`,

  // Item Sheet - Type-Specific Modifiers Templates
  `${PATHS.templates}/item/_type-modifiers/advantage.hbs`,
  `${PATHS.templates}/item/_type-modifiers/armor.hbs`,
  `${PATHS.templates}/item/_type-modifiers/bow.hbs`,
  `${PATHS.templates}/item/_type-modifiers/clan.hbs`,
  `${PATHS.templates}/item/_type-modifiers/commonItem.hbs`,
  `${PATHS.templates}/item/_type-modifiers/disadvantage.hbs`,
  `${PATHS.templates}/item/_type-modifiers/family.hbs`,
  `${PATHS.templates}/item/_type-modifiers/kata.hbs`,
  `${PATHS.templates}/item/_type-modifiers/kiho.hbs`,
  `${PATHS.templates}/item/_type-modifiers/school.hbs`,
  `${PATHS.templates}/item/_type-modifiers/skill.hbs`,
  `${PATHS.templates}/item/_type-modifiers/spell.hbs`,
  `${PATHS.templates}/item/_type-modifiers/tattoo.hbs`,
  `${PATHS.templates}/item/_type-modifiers/technique.hbs`,
  `${PATHS.templates}/item/_type-modifiers/weapon.hbs`,

  // Actor Sheet Templates
  `${PATHS.templates}/actor/pc.hbs`,
  `${PATHS.templates}/actor/npc.hbs`,

  // Actor Sheet Templates - Limited Views
  `${PATHS.templates}/actor/pc-limited.hbs`,
  `${PATHS.templates}/actor/npc-limited.hbs`,

  // Actor Partials - Core Components
  `${PATHS.templates}/actor/_partials/_expand.hbs`,
  `${PATHS.templates}/actor/_partials/_stats.hbs`,
  `${PATHS.templates}/actor/_partials/_stats-npc.hbs`,
  `${PATHS.templates}/actor/_partials/_ranks.hbs`,
  `${PATHS.templates}/actor/_partials/_combat.hbs`,
  `${PATHS.templates}/actor/_partials/_armor.hbs`,
  `${PATHS.templates}/actor/_partials/_wounds.hbs`,
  `${PATHS.templates}/actor/_partials/_fear.hbs`,
  `${PATHS.templates}/actor/_partials/_bio.hbs`,
  `${PATHS.templates}/actor/_partials/_unified-item-create.hbs`,
  `${PATHS.templates}/actor/_partials/_traits-rings.hbs`,
  `${PATHS.templates}/actor/_partials/_ring.hbs`,
  `${PATHS.templates}/actor/_partials/_trait.hbs`,
  `${PATHS.templates}/actor/_partials/_rank-control.hbs`,
  `${PATHS.templates}/actor/_partials/_void-points.hbs`,
  `${PATHS.templates}/actor/_partials/_rank-track.hbs`,
  `${PATHS.templates}/actor/_partials/_spell-slot.hbs`,
  `${PATHS.templates}/actor/_partials/_wound-track.hbs`,
  `${PATHS.templates}/actor/_partials/_note-section.hbs`,
  `${PATHS.templates}/actor/_partials/_limited.hbs`,
  `${PATHS.templates}/actor/_partials/_sort-header.hbs`,
  `${PATHS.templates}/actor/_partials/_section-title.hbs`,

  // Actor Partials - Item Sections
  `${PATHS.templates}/actor/_partials/_skill-section.hbs`,
  `${PATHS.templates}/actor/_partials/_weapon-section.hbs`,
  `${PATHS.templates}/actor/_partials/_armor-section.hbs`,
  `${PATHS.templates}/actor/_partials/_item-section.hbs`,
  `${PATHS.templates}/actor/_partials/_item-sections.hbs`,
  `${PATHS.templates}/actor/_partials/_spell-section.hbs`,
  `${PATHS.templates}/actor/_partials/_technique-section.hbs`,
  `${PATHS.templates}/actor/_partials/_kiho-section.hbs`,
  `${PATHS.templates}/actor/_partials/_kata-section.hbs`,
  `${PATHS.templates}/actor/_partials/_tattoo-section.hbs`,
  `${PATHS.templates}/actor/_partials/_advantage-section.hbs`,
  `${PATHS.templates}/actor/_partials/_disadvantage-section.hbs`,

  // Chat Cards
  `${PATHS.templates}/cards/advantage-disadvantage.hbs`,
  `${PATHS.templates}/cards/armor.hbs`,
  `${PATHS.templates}/cards/clan.hbs`,
  `${PATHS.templates}/cards/family.hbs`,
  `${PATHS.templates}/cards/commonItem.hbs`,
  `${PATHS.templates}/cards/kata.hbs`,
  `${PATHS.templates}/cards/kiho.hbs`,
  `${PATHS.templates}/cards/school.hbs`,
  `${PATHS.templates}/cards/skill.hbs`,
  `${PATHS.templates}/cards/spell.hbs`,
  `${PATHS.templates}/cards/tattoo.hbs`,
  `${PATHS.templates}/cards/technique.hbs`,
  `${PATHS.templates}/cards/weapon.hbs`,

  // Card Partials
  `${PATHS.templates}/cards/_partials/_controls.hbs`,
  `${PATHS.templates}/cards/_partials/_activate.hbs`,
  `${PATHS.templates}/cards/_partials/_details.hbs`,
  `${PATHS.templates}/cards/_partials/_detail-text.hbs`,
  `${PATHS.templates}/cards/_partials/_text-section.hbs`,
  `${PATHS.templates}/cards/_partials/_bio-row.hbs`,
  `${PATHS.templates}/cards/_partials/_roll-button.hbs`,

  // Chat Message Templates: every CHAT_TEMPLATES path
  `${PATHS.templates}/chat/check.hbs`,
  `${PATHS.templates}/chat/effect-prompt.hbs`,
  `${PATHS.templates}/chat/damage-result.hbs`,
  `${PATHS.templates}/chat/flow.hbs`,
  `${PATHS.templates}/chat/healing.hbs`,
  `${PATHS.templates}/chat/weapon.hbs`,
  `${PATHS.templates}/chat/check-request.hbs`,
  `${PATHS.templates}/chat/item-summary.hbs`,
  `${PATHS.templates}/chat/note.hbs`,
  `${PATHS.templates}/chat/contest.hbs`,

  // Text links (module/setup/enrichers.js)
  `${PATHS.templates}/links/inline-link.hbs`,

  // Dialog Templates
  `${PATHS.templates}/dialogs/check-dialog.hbs`,
  `${PATHS.templates}/dialogs/check-extras/maho.hbs`,
  `${PATHS.templates}/dialogs/check-extras/ring.hbs`,
  `${PATHS.templates}/dialogs/check-extras/slot.hbs`,
  `${PATHS.templates}/dialogs/check-extras/spell.hbs`,
  `${PATHS.templates}/dialogs/disadvantage-cap-dialog.hbs`,
  `${PATHS.templates}/dialogs/unified-item-create-dialog.hbs`,
  `${PATHS.templates}/dialogs/custom-emphasis-dialog.hbs`,
  `${PATHS.templates}/dialogs/ledger-dialog.hbs`,
  `${PATHS.templates}/dialogs/confirm-dialog.hbs`,
  `${PATHS.templates}/dialogs/choice-dialog.hbs`,

  // Application Templates
  `${PATHS.templates}/apps/armor-config.hbs`,
  `${PATHS.templates}/apps/xp-manager.hbs`,
  `${PATHS.templates}/apps/wound-config.hbs`,
  `${PATHS.templates}/apps/emphasis-manager.hbs`,
  `${PATHS.templates}/apps/combat-config.hbs`,
  `${PATHS.templates}/apps/effect-panel.hbs`,
  `${PATHS.templates}/apps/compendium-browser.hbs`,
  `${PATHS.templates}/apps/compendium-browser-results.hbs`,
  `${PATHS.templates}/apps/compendium-browser-open.hbs`,
  `${PATHS.templates}/apps/_partials/_wealth-change.hbs`,

  // Design gallery (module/apps/design-gallery.js): its parts include these partials
  `${PATHS.templates}/apps/design-gallery/_partials/_sample.hbs`,
  `${PATHS.templates}/apps/design-gallery/_partials/_token-head.hbs`,
  `${PATHS.templates}/apps/design-gallery/_partials/_token-row.hbs`
]);
