/**
 * @module apps/emphasis-manager
 * @description A form window that picks a skill item's available Emphases from the official list and the world's
 * custom Emphases, and adds, renames, and deletes the custom ones in a world setting. It uses no DebouncedFieldMixin:
 * the checkboxes save together on submit, and the window closes then. The constructor takes `options.item` rather
 * than a positional actor, because it works on a skill Item.
 */
import { SYS_ID } from "../config/constants.js";
import { OFFICIAL_EMPHASES } from "../config/reference-data.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { T } from "../utils/localization.js";
import { validateEmphasisName } from "../utils/validators.js";
import { logError } from "../utils/error-logging.js";

/**
 * The Emphasis manager window for one skill item.
 */
export default class EmphasisManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "emphasis-manager-{id}",
    classes: ["l5r4", "l5r4-emphasis-manager"],
    tag: "form",
    window: {
      title: "l5r4.apps.emphasisManager.title",
      icon: "fa-solid fa-list-check",
      resizable: true
    },
    position: {
      width: 500,
      height: 600
    },
    actions: {
      "add-emphasis": EmphasisManagerApplication.#onAddEmphasis,
      "delete-emphasis": EmphasisManagerApplication.#onDeleteEmphasis,
      "edit-emphasis": EmphasisManagerApplication.#onEditEmphasis
    },
    form: {
      handler: EmphasisManagerApplication.prototype._onSubmit,
      closeOnSubmit: true // One-time configuration, closes after saving selections
    }
  };

  static PARTS = {
    form: {
      template: `systems/${SYS_ID}/templates/apps/emphasis-manager.hbs`
    }
  };

  /**
   * Create a new EmphasisManager instance.
   *
   * NOTE: Unlike other apps, this uses options-based constructor because it operates
   * on an Item (skill) rather than an Actor. This is the appropriate pattern for
   * item-specific configuration dialogs.
   *
   * @param {object} [options={}] - Application options including item reference
   * @param {Item} options.item - The skill item whose emphases are being managed
   * @throws {Error} If item is not provided or is not a skill type
   */
  constructor(options = {}) {
    super(options);

    if (!options.item || options.item.type !== "skill") {
      throw new Error("EmphasisManagerApplication requires a skill item");
    }

    this.item = options.item;
  }

  /**
   * Dynamic window title including skill name.
   *
   * @returns {string} Localized title with skill name
   */
  get title() {
    const baseTitle = T("l5r4.apps.emphasisManager.title");
    return `${baseTitle}: ${this.item?.name ?? T("l5r4.ui.common.unknown")}`;
  }

  /**
   * Prepare context data for rendering the emphasis manager.
   * Combines official and custom emphases, marks which are available for the skill.
   *
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Context object with item and emphasis list
   * @override
   */
  async _prepareContext(_options) {
    if (!this.item) {
      console.warn(`${SYS_ID}`, "EmphasisManager: No item reference");
      return this._getFallbackContext();
    }

    try {
      const context = await super._prepareContext(_options);

      const availableEmphases = this.item.system?.availableEmphases ?? [];
      const availableSet = new Set(availableEmphases);

      const worldCustom = getWorldCustomEmphases();
      const allEmphases = [...Array.from(OFFICIAL_EMPHASES), ...worldCustom].sort();

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
    } catch (err) {
      logError("Failed to prepare emphasis manager context", err, {
        itemId: this.item?.id
      });
      return this._getFallbackContext();
    }
  }

  /**
   * Provide fallback context when item data is unavailable or errors occur.
   * Returns safe default values to prevent rendering failures.
   *
   * @returns {object} Fallback context with default values
   */
  _getFallbackContext() {
    return {
      item: this.item,
      skillName: this.item?.name ?? "Unknown Skill",
      emphasisList: []
    };
  }

  /**
   * Handle form submission to update skill's available emphases.
   * Extracts checked emphasis checkboxes and updates item.
   *
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The form data
   */
  async _onSubmit(event, form, formData) {
    const item = this.item;

    // Extract checked emphases from form data
    const formObject = formData.object;
    const checkedEmphases = [];

    // Process form entries - checkboxes are prefixed with "emphasis."
    for (const [key, value] of Object.entries(formObject)) {
      // Handle various checkbox value formats (boolean, string, "on")
      const isChecked = value === true || value === "true" || value === "on";

      // Extract emphasis name from form field key (e.g., "emphasis.Archery" -> "Archery")
      if (key.startsWith("emphasis.") && isChecked) {
        const emphasisName = key.substring("emphasis.".length);
        checkedEmphases.push(emphasisName);
      }
    }

    try {
      await item.update({ "system.availableEmphases": checkedEmphases });
    } catch (err) {
      logError("Failed to update emphases", err, {
        itemId: this.item?.id,
        checkedEmphases
      });
      ui.notifications?.error(T("l5r4.apps.emphasisManager.errors.updateFailed"));
    }
  }

  /**
   * Handle add custom emphasis action.
   * Displays dialog for entering new emphasis name, validates, and saves to world settings.
   *
   * @this {EmphasisManagerApplication}
   * @param {Event} _event - The click event (unused)
   * @param {HTMLElement} _element - The clicked element (unused)
   */
  static async #onAddEmphasis(_event, _element) {
    const name = await askEmphasisName({
      title: "l5r4.apps.emphasisManager.addCustom",
      label: "l5r4.ui.common.add"
    });

    if (!name || !name.trim()) {
      return;
    }

    const trimmedName = name.trim();

    try {
      await createWorldCustomEmphasis(trimmedName);
    } catch {
      ui.notifications?.error(T("l5r4.apps.emphasisManager.errors.saveFailed"));
      return;
    }

    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Handle delete custom emphasis action.
   * Displays confirmation dialog and removes emphasis from world settings.
   *
   * @this {EmphasisManagerApplication}
   * @param {Event} _event - The click event (unused)
   * @param {HTMLElement} element - The clicked element with data-emphasis-name attribute
   */
  static async #onDeleteEmphasis(_event, element) {
    const emphasisName = element.dataset.emphasisName;

    if (!emphasisName) {
      console.warn(`${SYS_ID}`, "No emphasis name provided for deletion");
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: T("l5r4.ui.common.delete") },
      content: await foundry.applications.handlebars.renderTemplate(
        DIALOG_TEMPLATES.removeEmphasis,
        { name: emphasisName }
      ),
      yes: { label: T("l5r4.ui.common.delete") },
      no: { label: T("l5r4.ui.common.cancel") },
      rejectClose: false
    });

    if (!confirmed) {
      return;
    }

    await deleteWorldCustomEmphasis(emphasisName);

    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Handle edit custom emphasis action.
   * Displays dialog for entering new name, validates, and updates in world settings.
   *
   * @this {EmphasisManagerApplication}
   * @param {Event} _event - The click event (unused)
   * @param {HTMLElement} element - The clicked element with data-emphasis-name attribute
   */
  static async #onEditEmphasis(_event, element) {
    const oldName = element.dataset.emphasisName;

    if (!oldName) {
      console.warn(`${SYS_ID}`, "No emphasis name provided for editing");
      return;
    }

    const newName = await askEmphasisName({
      title: "l5r4.ui.common.edit",
      label: "l5r4.ui.common.save",
      data: { currentName: oldName }
    });

    if (!newName || !newName.trim() || newName.trim() === oldName) {
      return;
    }

    const trimmedNewName = newName.trim();

    try {
      await updateWorldCustomEmphasis(oldName, trimmedNewName);
    } catch {
      ui.notifications?.error(T("l5r4.apps.emphasisManager.errors.saveFailed"));
      return;
    }

    if (this.rendered) {
      this.render();
    }
  }
}

/**
 * Ask for a custom Emphasis name in the custom Emphasis dialog.
 * @param {object} prompt
 * @param {string} prompt.title - The window title's i18n key
 * @param {string} prompt.label - The confirm button's i18n key
 * @param {object} [prompt.data] - The dialog's template data: the current name when renaming
 * @returns {Promise<string|null>} The name entered, or null when the dialog is dismissed
 */
async function askEmphasisName({ title, label, data }) {
  const content = await foundry.applications.handlebars.renderTemplate(
    `systems/${SYS_ID}/templates/dialogs/custom-emphasis-dialog.hbs`,
    data
  );

  return foundry.applications.api.DialogV2.prompt({
    window: { title: T(title) },
    content,
    ok: {
      label: T(label),
      callback: (_event, button, _dialog) => button.form.elements.emphasisName.value
    },
    rejectClose: false
  });
}

/**
 * Retrieve custom emphases from world settings.
 * Returns empty array if setting is not found or invalid.
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
 * Save a new custom emphasis to world settings.
 * Validates name and checks for duplicates before saving.
 *
 * @param {string} emphasisName - The emphasis name to save
 * @throws {Error} If validation fails or emphasis already exists
 */
async function createWorldCustomEmphasis(emphasisName) {
  const validation = validateEmphasisName(emphasisName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = emphasisName.trim();
  const current = getWorldCustomEmphases();

  if (current.includes(trimmed)) {
    throw new Error("Emphasis already exists");
  }

  current.push(trimmed);
  await game.settings.set("l5r4-enhanced", "customEmphases", current);
}

/**
 * Delete a custom emphasis from world settings.
 *
 * @param {string} emphasisName - The emphasis name to delete
 */
async function deleteWorldCustomEmphasis(emphasisName) {
  const current = getWorldCustomEmphases();
  const filtered = current.filter(name => name !== emphasisName);
  await game.settings.set("l5r4-enhanced", "customEmphases", filtered);
}

/**
 * Update an existing custom emphasis name in world settings.
 * Validates new name and checks for duplicates before updating.
 *
 * @param {string} oldName - The current emphasis name
 * @param {string} newName - The new emphasis name
 * @throws {Error} If validation fails or new name already exists
 */
async function updateWorldCustomEmphasis(oldName, newName) {
  const validation = validateEmphasisName(newName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = newName.trim();
  const current = getWorldCustomEmphases();
  const index = current.indexOf(oldName);

  if (index !== -1) {
    const otherEmphases = current.filter((_, i) => i !== index);
    if (otherEmphases.includes(trimmed)) {
      throw new Error("Emphasis already exists");
    }

    current[index] = trimmed;
    await game.settings.set("l5r4-enhanced", "customEmphases", current);
  }
}
