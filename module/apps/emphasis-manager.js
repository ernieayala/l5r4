/**
 * @module apps/emphasis-manager
 * @description A form window that picks a skill item's available Emphases from the official list and the world's
 * custom Emphases, and adds, renames, and deletes the custom ones in a world setting, through the GM for a player
 * (module/services/custom-emphases.js, #188). It uses no FieldSaveMixin:
 * the checkboxes save together on submit, and the window closes then. The constructor takes `options.item` rather
 * than a positional actor, because it works on a skill Item.
 */
import { SYS_ID } from "../config/constants.js";
import { OFFICIAL_EMPHASES } from "../config/reference-data.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { F, T } from "../utils/localization.js";
import { buildEmphasisList } from "../utils/emphases.js";
import { validateEmphasisName } from "../utils/validators.js";
import { logError } from "../utils/error-logging.js";
import { askConfirm, askPrompt } from "../services/dialog.js";
import { updateCustomEmphases, getCustomEmphases } from "../services/custom-emphases.js";

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
   * The names ticked in the window before a custom Emphasis change re-rendered it, which its rows show again so
   * unsaved ticks survive (#141); null before any.
   * @type {Set<string>|null}
   */
  #ticked = null;

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
    return F("l5r4.apps.emphasisManager.titleFor", {
      item: this.item?.name ?? T("l5r4.ui.common.unknown")
    });
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

      // Every Emphasis the Skill holds is listed, so saving keeps one outside the official and custom lists (#187)
      const emphasisList = buildEmphasisList({
        official: OFFICIAL_EMPHASES,
        custom: getCustomEmphases(),
        skill: this.item.system
      });

      const ticked = this.#ticked;
      return {
        ...context,
        item: this.item,
        skillName: this.item.name,
        emphasisList: ticked
          ? emphasisList.map(row => ({ ...row, available: ticked.has(row.name) }))
          : emphasisList
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
   * Handle form submission: the Skill's available Emphases become the ones ticked. A failed update throws, so core
   * shows the reason and keeps the window open with the ticks as they were (#141).
   *
   * @param {Event} _event - The submit event (unused)
   * @param {HTMLFormElement} form - The form element
   */
  async _onSubmit(_event, form) {
    try {
      await this.item.update({ "system.availableEmphases": [...tickedOf(form)] });
    } catch (err) {
      throw new Error(T("l5r4.apps.emphasisManager.errors.updateFailed"), { cause: err });
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
      label: "l5r4.ui.common.add",
      existing: getCustomEmphases()
    });
    if (!name) {
      return;
    }

    const ticked = tickedOf(this.form);
    if (await updateCustomEmphases({ kind: "add", name })) {
      this.#renderWithTicks(ticked);
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

    const confirmed = await askConfirm({
      window: { title: T("l5r4.ui.common.delete") },
      content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.confirm, {
        question: F("l5r4.ui.dialogs.deleteEmphasis.content", { emphasis: emphasisName }),
        consequence: T("l5r4.ui.dialogs.deleteEmphasis.consequence")
      }),
      yes: { label: T("l5r4.ui.common.delete") },
      no: { label: T("l5r4.ui.common.cancel") },
      rejectClose: false
    });

    if (!confirmed) {
      return;
    }

    const ticked = tickedOf(this.form);
    if (await updateCustomEmphases({ kind: "delete", name: emphasisName })) {
      this.#renderWithTicks(ticked);
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
      currentName: oldName,
      existing: getCustomEmphases().filter(name => name !== oldName)
    });
    if (!newName || newName === oldName) {
      return;
    }

    const ticked = tickedOf(this.form, { [oldName]: newName });
    if (await updateCustomEmphases({ kind: "rename", name: oldName, newName })) {
      this.#renderWithTicks(ticked);
    }
  }

  /**
   * Draw the window again after the custom Emphases changed, with the ticks the user had made.
   * @param {Set<string>} ticked - The names ticked before the change, a renamed one under its new name
   */
  #renderWithTicks(ticked) {
    this.#ticked = ticked;
    if (this.rendered) {
      this.render();
    }
  }
}

/**
 * The Emphases ticked in the window's form now, a renamed one under its new name.
 * @param {HTMLFormElement} form - The Emphasis manager's form
 * @param {Record<string, string>} [renamed={}] - New name by old name
 * @returns {Set<string>}
 */
function tickedOf(form, renamed = {}) {
  const ticked = [...form.querySelectorAll("input[name^='emphasis.']")]
    .filter(box => box.checked)
    .map(box => box.name.slice("emphasis.".length));
  return new Set(ticked.map(name => renamed[name] ?? name));
}

/**
 * Ask for a custom Emphasis name in the custom Emphasis dialog. The name is checked as it is typed: while it cannot
 * be saved, the reason shows under the field and the button waits, so nothing typed is lost (#141).
 * @param {object} prompt
 * @param {string} prompt.title - The window title's i18n key
 * @param {string} prompt.label - The confirm button's i18n key
 * @param {string} [prompt.currentName=""] - The name being renamed
 * @param {string[]} prompt.existing - The names it may not repeat
 * @returns {Promise<string|null>} The trimmed name, or null when the dialog is dismissed
 */
async function askEmphasisName({ title, label, currentName = "", existing }) {
  const content = await foundry.applications.handlebars.renderTemplate(
    DIALOG_TEMPLATES.customEmphasis,
    { currentName, formId: foundry.utils.randomID() }
  );

  return askPrompt({
    window: { title: T(title) },
    content,
    ok: {
      label: T(label),
      callback: (_event, button) =>
        validateEmphasisName(button.form.elements.emphasisName.value, existing).sanitized ?? null
    },
    render: (_event, dialog) =>
      bindEmphasisNameCheck(dialog.element.querySelector("form"), existing),
    rejectClose: false
  });
}

/**
 * Check the custom Emphasis dialog's name as it is typed: the button waits while the name is invalid, and once the
 * user has typed, the reason shows under the field, which is marked invalid (foundations/states.md, Invalid).
 * @param {HTMLFormElement} form - The dialog's form
 * @param {string[]} existing - The names it may not repeat
 */
function bindEmphasisNameCheck(form, existing) {
  const field = form.elements.emphasisName;
  const message = form.querySelector("[data-emphasis-name-error]");
  const button = form.querySelector("[data-action='ok']");
  const update = typed => {
    const { valid, error, data } = validateEmphasisName(field.value, existing);
    const shown = typed && !valid;
    button.disabled = !valid;
    message.hidden = !shown;
    message.querySelector("[data-emphasis-name-error-text]").textContent = valid
      ? ""
      : F(error, data);
    if (shown) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }
  };
  field.addEventListener("input", () => update(true));
  update(false);
}
