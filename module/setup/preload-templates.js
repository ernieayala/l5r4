/**
 * @module setup/preload-templates
 * @description Loads every Handlebars template and partial the system renders (PRELOAD_TEMPLATES,
 * module/config/templates.js) into core's template cache with `foundry.applications.handlebars.loadTemplates`,
 * during `init` after the document classes and sheets register, so no template loads mid-game.
 */
import { PRELOAD_TEMPLATES } from "../config/templates.js";

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
 * - Logs warning to console if template loading fails.
 *
 * @returns {Promise<void>} Resolves when all templates are loaded
 * @throws {Error} If Foundry template system is not available (called too early)
 * @throws {Error} If template loading fails (invalid paths, missing files)
 */
export async function registerTemplates() {
  const templatePaths = [...PRELOAD_TEMPLATES];

  if (!globalThis.foundry?.applications?.handlebars?.loadTemplates) {
    const error = new Error(
      "Foundry VTT template system not available. " +
        "Ensure registerTemplates() is called after Foundry initialization."
    );
    console.warn("L5R4 | Template preloading failed", { error, templatePaths });
    throw error;
  }

  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
  } catch (err) {
    const errorMessage = err?.message ?? err?.toString?.() ?? String(err);
    console.warn("L5R4 | Template preloading failed", { error: err, templatePaths });
    throw new Error(`Failed to preload L5R4 templates: ${errorMessage}`, { cause: err });
  }
}
