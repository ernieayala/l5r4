/**
 * Emphasis Manager Application
 *
 * ApplicationV2 dialog for managing which emphases are AVAILABLE for a skill.
 * This builds the pool of emphases that can later be trained on the character sheet.
 *
 * Key Features:
 * - Browse official emphases from OFFICIAL_EMPHASES constant
 * - Add custom emphases (stored in world settings)
 * - Select which emphases should be available for this skill
 * - NO rank limits here (those apply on character sheet when training)
 * - NO XP tracking here (happens on character sheet)
 *
 * Foundry VTT Integration:
 * - Extends ApplicationV2 (Foundry v13+)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Updates skill item.system.availableEmphases on save
 *
 * Workflow:
 * 1. ITEM SHEET: Add emphases to available pool (this dialog)
 * 2. CHARACTER SHEET: Check trained emphases from available pool (with rank limits & XP)
 *
 * @module apps/emphasis-manager
 * @see module:config/game-data.OFFICIAL_EMPHASES - Official emphasis list
 */

import { OFFICIAL_EMPHASES } from "../config/game-data.js";
import { validateEmphasisName } from "../utils/validators.js";

/**
 * Get world-level custom emphases from settings.
 *
 * @returns {string[]} Array of custom emphasis names
 */
function getWorldCustomEmphases() {
  try {
    const setting = game.settings.get("l5r4-enhanced", "customEmphases");
    return Array.isArray(setting) ? setting : [];
  } catch {
    return [];
  }
}

/**
 * Save world-level custom emphasis to settings.
 *
 * Validates emphasis name before saving to prevent:
 * - XSS attacks (script injection)
 * - Data corruption (invalid characters)
 * - Storage issues (excessive length)
 *
 * @param {string} emphasisName - Name of custom emphasis to add
 * @returns {Promise<void>}
 * @throws {Error} If emphasis name fails validation
 */
async function saveWorldCustomEmphasis(emphasisName) {
  // Validate emphasis name
  const validation = validateEmphasisName(emphasisName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = emphasisName.trim();
  const current = getWorldCustomEmphases();

  // Check for duplicates
  if (current.includes(trimmed)) {
    throw new Error("Emphasis already exists");
  }

  // Save validated emphasis
  current.push(trimmed);
  await game.settings.set("l5r4-enhanced", "customEmphases", current);
}

/**
 * Delete world-level custom emphasis from settings.
 *
 * @param {string} emphasisName - Name of custom emphasis to delete
 * @returns {Promise<void>}
 */
async function deleteWorldCustomEmphasis(emphasisName) {
  const current = getWorldCustomEmphases();
  const filtered = current.filter(name => name !== emphasisName);
  await game.settings.set("l5r4-enhanced", "customEmphases", filtered);
}

/**
 * Update world-level custom emphasis name in settings.
 *
 * Validates new emphasis name before updating to prevent:
 * - XSS attacks (script injection)
 * - Data corruption (invalid characters)
 * - Storage issues (excessive length)
 *
 * @param {string} oldName - Current name of custom emphasis
 * @param {string} newName - New name for custom emphasis
 * @returns {Promise<void>}
 * @throws {Error} If new emphasis name fails validation
 */
async function updateWorldCustomEmphasis(oldName, newName) {
  // Validate new emphasis name
  const validation = validateEmphasisName(newName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = newName.trim();
  const current = getWorldCustomEmphases();
  const index = current.indexOf(oldName);

  if (index !== -1) {
    // Check for duplicates (excluding the one being updated)
    const otherEmphases = current.filter((_, i) => i !== index);
    if (otherEmphases.includes(trimmed)) {
      throw new Error("Emphasis already exists");
    }

    current[index] = trimmed;
    await game.settings.set("l5r4-enhanced", "customEmphases", current);
  }
}

/**
 * Emphasis Manager dialog for building available emphasis pool.
 *
 * Foundry ApplicationV2 that provides UI for selecting which emphases
 * should be available for a skill. No rank limits or training state here.
 *
 * @extends {foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)}
 */
export default class EmphasisManager extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /**
   * @typedef {Object} EmphasisManagerOptions
   * @property {Item} item - The skill item being edited
   */

  /**
   * Default application configuration options.
   * Defines window properties, CSS classes, and action handlers.
   *
   * @type {ApplicationConfiguration}
   */
  static DEFAULT_OPTIONS = {
    id: "emphasis-manager-{id}",
    classes: ["l5r4", "emphasis-manager"],
    tag: "form",
    window: {
      title: "l5r4.ui.emphasisManager.title",
      icon: "fa-solid fa-list-check",
      resizable: true
    },
    form: {
      handler: EmphasisManager.prototype._onSubmit,
      closeOnSubmit: true
    },
    actions: {
      addCustom: EmphasisManager.prototype._onAddCustom,
      deleteCustom: EmphasisManager.prototype._onDeleteCustom,
      editCustom: EmphasisManager.prototype._onEditCustom
    },
    position: {
      width: 500,
      height: 600
    }
  };

  /**
   * Template parts for the application.
   * Uses single template for entire form.
   *
   * @type {Record<string, TemplatePartConfiguration>}
   */
  static PARTS = {
    form: {
      template: "systems/l5r4-enhanced/templates/apps/emphasis-manager.hbs"
    }
  };

  /**
   * Create EmphasisManager instance.
   *
   * @param {EmphasisManagerOptions} options - Configuration options
   */
  constructor(options = {}) {
    super(options);

    if (!options.item || options.item.type !== "skill") {
      throw new Error("EmphasisManager requires a skill item");
    }

    this.item = options.item;
  }

  /**
   * Prepare context data for template rendering.
   * Combines official and custom emphases, marks which are available for this skill.
   *
   * @param {RenderOptions} options - Rendering options
   * @returns {Promise<ApplicationRenderContext>} Template context data
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get available emphases for this skill
    const availableEmphases = this.item.system?.availableEmphases ?? [];
    const availableSet = new Set(availableEmphases);

    // Combine official and custom emphases
    const worldCustom = getWorldCustomEmphases();
    const allEmphases = [...Array.from(OFFICIAL_EMPHASES), ...worldCustom].sort();

    // Map to template-friendly format
    const emphasisList = allEmphases.map(name => ({
      name,
      available: availableSet.has(name),
      custom: !OFFICIAL_EMPHASES.includes(name)
    }));

    return {
      ...context,
      item: this.item,
      skillName: this.item.name,
      emphasisList
    };
  }

  /**
   * Handle form submission - save available emphases to item.
   * Updates item.system.availableEmphases array (just names, no state).
   *
   * @param {SubmitEvent} event - Form submission event
   * @param {HTMLFormElement} form - The submitted form element
   * @param {FormDataExtended} formData - Processed form data
   * @returns {Promise<void>}
   * @private
   */
  async _onSubmit(event, form, formData) {
    const item = this.item;

    // Get checked emphases from form data
    const formObject = formData.object;
    const checkedEmphases = [];

    for (const [key, value] of Object.entries(formObject)) {
      const isChecked = value === true || value === "true" || value === "on";

      if (key.startsWith("emphasis.") && isChecked) {
        const emphasisName = key.substring("emphasis.".length);
        checkedEmphases.push(emphasisName);
      }
    }

    // Update item with just the array of names
    await item.update({ "system.availableEmphases": checkedEmphases });
  }

  /**
   * Handle adding custom emphasis.
   * Prompts for emphasis name, adds to world settings, and refreshes form.
   *
   * @param {PointerEvent} event - Click event
   * @param {HTMLElement} target - Button element
   * @returns {Promise<void>}
   * @private
   */
  async _onAddCustom(_event, _target) {
    const content = await renderTemplate(
      "systems/l5r4-enhanced/templates/dialogs/custom-emphasis-dialog.hbs"
    );

    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("l5r4.ui.emphasisManager.addCustom") },
      content,
      ok: {
        label: game.i18n.localize("l5r4.ui.common.add"),
        callback: (_event, button, _dialog) => button.form.elements.emphasisName.value
      },
      rejectClose: false
    });

    if (!name || !name.trim()) {
      return;
    }

    const trimmedName = name.trim();

    // Add to world settings with validation
    try {
      await saveWorldCustomEmphasis(trimmedName);
    } catch (error) {
      ui.notifications.error(error.message);
      return;
    }

    // Refresh the form to show new emphasis
    this.render();
  }

  /**
   * Handle deleting custom emphasis.
   * Prompts for confirmation, removes from world settings, and refreshes form.
   *
   * @param {PointerEvent} event - Click event
   * @param {HTMLElement} target - Button element with data-emphasis-name attribute
   * @returns {Promise<void>}
   * @private
   */
  async _onDeleteCustom(_event, target) {
    const emphasisName = target.dataset.emphasisName;

    if (!emphasisName) {
      console.warn("L5R4 | No emphasis name provided for deletion");
      return;
    }

    // Confirm deletion
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("l5r4.ui.common.delete") },
      content: `${game.i18n.localize("l5r4.ui.common.delete")} "${emphasisName}"?`,
      rejectClose: false
    });

    if (!confirmed) {
      return;
    }

    // Delete from world settings
    await deleteWorldCustomEmphasis(emphasisName);

    // Refresh the form
    this.render();
  }

  /**
   * Handle editing custom emphasis.
   * Prompts for new name, updates in world settings, and refreshes form.
   *
   * @param {PointerEvent} event - Click event
   * @param {HTMLElement} target - Button element with data-emphasis-name attribute
   * @returns {Promise<void>}
   * @private
   */
  async _onEditCustom(_event, target) {
    const oldName = target.dataset.emphasisName;

    if (!oldName) {
      console.warn("L5R4 | No emphasis name provided for editing");
      return;
    }

    const content = await renderTemplate(
      "systems/l5r4-enhanced/templates/dialogs/custom-emphasis-dialog.hbs",
      { currentName: oldName }
    );

    const newName = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("l5r4.ui.common.edit") },
      content,
      ok: {
        label: game.i18n.localize("l5r4.ui.common.save"),
        callback: (_event, button, _dialog) => button.form.elements.emphasisName.value
      },
      rejectClose: false
    });

    if (!newName || !newName.trim() || newName.trim() === oldName) {
      return;
    }

    const trimmedNewName = newName.trim();

    // Update in world settings with validation
    try {
      await updateWorldCustomEmphasis(oldName, trimmedNewName);
    } catch (error) {
      ui.notifications.error(error.message);
      return;
    }

    // Refresh the form
    this.render();
  }
}
