/**
 * Template Preloader Module
 * Preloads all Handlebars templates used by the L5R4 Enhanced system for improved performance.
 * Must be called during Foundry's "init" hook after document classes are configured
 * but before sheets are rendered.
 *
 * This module uses Foundry VTT's template caching system to load all HBS templates
 * into memory at system initialization, preventing template loading delays during gameplay.
 *
 * Foundry VTT Integration:
 * - Uses foundry.applications.handlebars.loadTemplates API (Foundry v13+)
 * - Called during "init" hook Phase 6 (after document registration, before services)
 * - Validates Foundry template system availability before loading
 *
 * @module setup/preload-templates
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Preloads all Handlebars templates for the L5R4 Enhanced system.
 *
 * Loads templates for actor sheets, item sheets, chat cards, dialogs, and partials
 * into Foundry's template cache. This improves rendering performance by eliminating
 * template loading delays during gameplay.
 *
 * Must be called during Foundry's "init" hook after document classes are registered.
 * The function validates Foundry's template system availability before attempting
 * to load templates.
 *
 * Side Effects:
 * - Logs success message with template count to console
 * - Logs warning to console if template loading fails
 *
 * @async
 * @function preloadTemplates
 * @returns {Promise<void>} Resolves when all templates are loaded
 * @throws {Error} If Foundry template system is not available (called too early)
 * @throws {Error} If template loading fails (invalid paths, missing files)
 */
export async function preloadTemplates() {
  const templatePaths = [
    // Item Sheet Templates
    `systems/${SYS_ID}/templates/item/advantage.hbs`,
    `systems/${SYS_ID}/templates/item/armor.hbs`,
    `systems/${SYS_ID}/templates/item/clan.hbs`,
    `systems/${SYS_ID}/templates/item/disadvantage.hbs`,
    `systems/${SYS_ID}/templates/item/family.hbs`,
    `systems/${SYS_ID}/templates/item/commonItem.hbs`,
    `systems/${SYS_ID}/templates/item/kata.hbs`,
    `systems/${SYS_ID}/templates/item/kiho.hbs`,
    `systems/${SYS_ID}/templates/item/school.hbs`,
    `systems/${SYS_ID}/templates/item/skill.hbs`,
    `systems/${SYS_ID}/templates/item/spell.hbs`,
    `systems/${SYS_ID}/templates/item/tattoo.hbs`,
    `systems/${SYS_ID}/templates/item/technique.hbs`,
    `systems/${SYS_ID}/templates/item/weapon.hbs`,

    // Item Partials
    `systems/${SYS_ID}/templates/item/_partials/_rules-summary.hbs`,
    `systems/${SYS_ID}/templates/item/_partials/_scaffold.hbs`,

    // Actor Sheet Templates
    `systems/${SYS_ID}/templates/actor/pc.hbs`,
    `systems/${SYS_ID}/templates/actor/npc.hbs`,

    // Actor Sheet Templates - Limited Views
    `systems/${SYS_ID}/templates/actor/pc-limited.hbs`,
    `systems/${SYS_ID}/templates/actor/npc-limited.hbs`,

    // Actor Partials - Core Components
    `systems/${SYS_ID}/templates/actor/_partials/_expand.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stats.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stats-npc.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_ranks.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_initiative.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stances.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_armor.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_wounds.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_fear.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_bio.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_unified-item-create.hbs`,

    // Actor Partials - Item Sections
    `systems/${SYS_ID}/templates/actor/_partials/_skills-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_weapon-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_armor-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_item-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_spell-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_technique-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_kiho-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_kata-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_tattoo-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_advantage-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_disadvantage-section.hbs`,

    // Chat Cards
    `systems/${SYS_ID}/templates/cards/advantage-disadvantage.hbs`,
    `systems/${SYS_ID}/templates/cards/armor.hbs`,
    `systems/${SYS_ID}/templates/cards/clan.hbs`,
    `systems/${SYS_ID}/templates/cards/family.hbs`,
    `systems/${SYS_ID}/templates/cards/commonItem.hbs`,
    `systems/${SYS_ID}/templates/cards/kata.hbs`,
    `systems/${SYS_ID}/templates/cards/kiho.hbs`,
    `systems/${SYS_ID}/templates/cards/school.hbs`,
    `systems/${SYS_ID}/templates/cards/skill.hbs`,
    `systems/${SYS_ID}/templates/cards/spell.hbs`,
    `systems/${SYS_ID}/templates/cards/tattoo.hbs`,
    `systems/${SYS_ID}/templates/cards/technique.hbs`,
    `systems/${SYS_ID}/templates/cards/weapon.hbs`,

    // Card Partials
    `systems/${SYS_ID}/templates/cards/_partials/_expand.hbs`,

    // Chat Message Templates
    `systems/${SYS_ID}/templates/chat/full-defense-roll.hbs`,
    `systems/${SYS_ID}/templates/chat/healing.hbs`,
    `systems/${SYS_ID}/templates/chat/simple-roll.hbs`,
    `systems/${SYS_ID}/templates/chat/weapon-chat.hbs`,

    // Dialog Templates
    `systems/${SYS_ID}/templates/dialogs/disadvantage-cap-dialog.hbs`,
    `systems/${SYS_ID}/templates/dialogs/roll-modifiers-dialog.hbs`,
    `systems/${SYS_ID}/templates/dialogs/unified-item-create-dialog.hbs`,

    // Application Templates
    `systems/${SYS_ID}/templates/apps/xp-manager.hbs`,
    `systems/${SYS_ID}/templates/apps/wound-config.hbs`
  ];

  if (!globalThis.foundry?.applications?.handlebars?.loadTemplates) {
    const error = new Error(
      "Foundry VTT template system not available. " +
        "Ensure preloadTemplates() is called after Foundry initialization."
    );
    console.warn("L5R4 | Template preloading failed", { error, templatePaths });
    throw error;
  }

  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
  } catch (err) {
    const errorMessage = err?.message ?? err?.toString?.() ?? String(err);
    console.warn("L5R4 | Template preloading failed", { error: err, templatePaths });
    throw new Error(`Failed to preload L5R4 templates: ${errorMessage}`);
  }
}
