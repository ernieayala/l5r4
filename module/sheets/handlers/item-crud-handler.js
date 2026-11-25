/**
 * @module sheets/handlers/item-crud-handler
 * @description Creates, opens, edits inline, deletes, expands, and posts to chat the embedded Item documents on actor
 * sheets, and toggles a sheet section's collapsed state. Every method is static and takes the sheet's handler
 * context ({ actor, element, sheetClassName }).
 */

import { SYS_ID } from "../../config/constants.js";
import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { F } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import * as Chat from "../../services/chat.js";
import { updateSectionCollapsed } from "../../services/section-state.js";
import { askConfirm } from "../../services/dialog.js";

/**
 * Static utility class for handling item CRUD operations on actor sheets.
 * Provides methods for creating, editing, deleting, expanding, and posting items to chat.
 * Integrates with Foundry's embedded document system and sheet rendering.
 */
export class ItemCrudHandler {
  /**
   * Resolves the target element from either an explicit element or event target.
   * Defensive helper for handlers that may receive element or event.
   *
   * @param {HTMLElement} element - Explicitly passed element
   * @param {Event} event - Event containing currentTarget
   * @returns {HTMLElement} The resolved element
   */
  static #getElement(element, event) {
    return element || event.currentTarget;
  }

  /**
   * Finds the closest ancestor item row element.
   * Item rows carry data-item-id (templates/cards/).
   *
   * @param {HTMLElement} element - Starting element for traversal
   * @returns {HTMLElement|null} The item row element or null if not found
   */
  static #getItemRow(element) {
    return element?.closest?.("[data-item-id]");
  }

  /**
   * Extracts the item ID from a row element's dataset.
   * Checks multiple dataset properties for compatibility: itemId, documentId, id.
   *
   * @param {HTMLElement} row - Item row element
   * @returns {string|undefined} The item ID or undefined if not found
   */
  static #getItemId(row) {
    return row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
  }

  /**
   * Asks whether to remove an item.
   *
   * @param {Item} item - The item to remove
   * @returns {Promise<boolean|null>} Whether the user chose Remove; null when the dialog is closed
   */
  static async #askItemRemoval(item) {
    // No is the default button [src: client/applications/api/dialog.mjs:346-354]; closing the dialog resolves null
    return askConfirm({
      window: { title: "l5r4.ui.dialogs.deleteItem.title" },
      content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.confirm, {
        question: game.i18n.localize("l5r4.ui.dialogs.deleteItem.content", { name: item.name }),
        consequence: game.i18n.localize("l5r4.ui.dialogs.deleteItem.consequence")
      }),
      yes: { label: "l5r4.ui.common.delete" },
      no: { label: "l5r4.ui.common.cancel" }
    });
  }

  /**
   * Creates a new embedded Item on the actor.
   * Prompts user for item type and name via unified dialog.
   * Auto-detects preferred item type based on the clicked section's data-scope attribute.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element (used to detect section)
   * @returns {Promise<Item[]>} Created item documents (empty if cancelled)
   *
   * @see getSectionItemType
   */
  static async create(context, event, element) {
    event.preventDefault();

    const preferredType = this.getSectionItemType(element);

    const result = await Chat.getUnifiedItemOptions(preferredType);

    if (!result) {
      return [];
    }

    const itemData = {
      name: result.name,
      type: result.type
    };

    return context.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Detects the preferred item type based on the section's data-scope attribute.
   * Maps sheet section names to L5R4 item types for context-aware item creation.
   *
   * Section mappings:
   * - skills → skill (Bugei, High, Low, Merchant skills)
   * - weapons → weapon (Melee and ranged weapons)
   * - armors → armor (Protective equipment)
   * - techniques → technique (School techniques)
   * - items → commonItem (General equipment)
   * - spells → spell (Shugenja magic)
   * - katas → kata (Combat techniques)
   * - kihos → kiho (Monk abilities)
   * - tattoos → tattoo (Togashi tattoos)
   * - advantages → advantage (Character creation benefits)
   * - disadvantages → disadvantage (Character creation drawbacks)
   *
   * @param {HTMLElement} element - Element within a sheet section
   * @returns {string|null} Item type string or null if section not recognized
   */
  static getSectionItemType(element) {
    const section = element?.closest?.("[data-scope]");
    const scope = section?.dataset?.scope;

    if (!scope) {
      return null;
    }

    const sectionToItemType = {
      skills: "skill",
      weapons: "weapon",
      armors: "armor",
      techniques: "technique",
      items: "commonItem",
      spells: "spell",
      katas: "kata",
      kihos: "kiho",
      tattoos: "tattoo",
      advantages: "advantage",
      disadvantages: "disadvantage"
    };

    return sectionToItemType[scope] || null;
  }

  /**
   * Opens the item sheet for editing.
   * Locates the item by traversing DOM to find item row and extract ID.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element or event target
   */
  static openItemSheet(context, event, element) {
    event.preventDefault();
    const el = this.#getElement(element, event);
    const row = this.#getItemRow(el);
    const id = this.#getItemId(row);
    context.actor.items.get(id)?.sheet?.render(true);
  }

  /**
   * Deletes an embedded Item from the actor.
   * Shows confirmation dialog unless Shift key is held.
   * Silently catches and logs errors to prevent sheet breakage on failed deletion.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element or event target
   * @returns {Promise<void>}
   */
  static async deleteItem(context, event, element) {
    event.preventDefault();
    const el = this.#getElement(element, event);
    const row = this.#getItemRow(el);
    const id = this.#getItemId(row);

    if (!id) {
      return;
    }

    const item = context.actor?.items?.get(id);
    if (!item) {
      return;
    }

    // Skip confirmation if Shift key is held
    if (!event.shiftKey && !(await this.#askItemRemoval(item))) {
      return;
    }

    try {
      await context.actor.deleteEmbeddedDocuments("Item", [id]);
    } catch (err) {
      console.error(`${SYS_ID} ItemCrudHandler: deleteEmbeddedDocuments failed`, { err });
      ui.notifications?.error(F("l5r4.ui.notifications.deleteFailed", { name: item.name }));
    }
  }

  /**
   * Toggles the expanded/collapsed state of an item row.
   * Adds/removes "is-expanded" CSS class and rotates chevron icon between down/up.
   *
   * @param {object} context -Handler context from actor sheet (unused)
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element containing the chevron icon
   */
  static updateItemExpanded(context, event, element) {
    event?.preventDefault?.();
    const row = this.#getItemRow(element);
    if (!row) {
      return;
    }
    element.setAttribute("aria-expanded", String(row.classList.toggle("is-expanded")));
    // querySelector used here to find icon element within the clicked button (scoped query)
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-angle-down");
      icon.classList.toggle("fa-angle-up");
    }
  }

  /**
   * Toggles collapse/expand state of a sheet section with persistence.
   *
   * **UI Pattern:**
   * Toggles section visibility and persists state to user flags so collapsed
   * sections remain collapsed across sheet re-renders and browser sessions.
   *
   * **Implementation:**
   * - Finds parent .section-title element
   * - Toggles "is-collapsed" class for immediate CSS-driven visibility
   * - Swaps chevron icon direction (fa-angle-down ↔ fa-angle-up)
   * - Persists state to user flags via updateSectionCollapsed()
   *
   * **Persistence:**
   * State is stored per-user, per-actor, per-section in user flags. This allows
   * each user to have their own preferred collapsed/expanded sections for each actor.
   *
   * **No Game Rules:** A UI convenience only.
   *
   * @param {object} context -Sheet render context with actor reference
   * @param {Event} event - DOM click event
   * @param {HTMLElement} element - Clicked element (searches up for .section-title)
   * @returns {Promise<void>}
   */
  static async updateSectionCollapsed(context, event, element) {
    event?.preventDefault?.();

    // Find parent section title container
    const sectionTitle = element.closest("[data-section-title]");
    if (!sectionTitle) {
      return;
    }

    // Get section scope from data attribute (e.g., "skills", "weapons", "spells")
    const scope =
      sectionTitle.dataset.scope || sectionTitle.closest("[data-scope]")?.dataset?.scope;

    // Toggle collapsed state (CSS-driven visibility)
    const isNowCollapsed = sectionTitle.classList.toggle("is-collapsed");
    element.setAttribute("aria-expanded", String(!isNowCollapsed));

    // Swap chevron icon direction for visual feedback
    // querySelector used here to find icon element within the clicked button (scoped query)
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-angle-down");
      icon.classList.toggle("fa-angle-up");
    }

    // Persist state to user flags if we have a valid scope
    if (scope && context.actor) {
      await updateSectionCollapsed(context.actor.id, scope, isNowCollapsed);
    }
  }

  /**
   * Handles inline editing of item fields on the actor sheet.
   * Reads the field path and data type from element dataset attributes,
   * coerces the input value to the appropriate type, and updates the item.
   *
   * HTML elements should include data-action="update-item-field", data-field="path.to.field",
   * and data-type="TypeName" attributes. For example, to edit a skill rank:
   * <input data-action="update-item-field" data-field="system.rank" data-type="Integer" value="3">
   *
   * Supported data types (via data-type attribute):
   * - "Integer" → Converts to integer (default 0)
   * - "Number" → Converts to float (default 0)
   * - "Boolean" → Converts to boolean (accepts "true", "1", "on", "yes")
   * - Default → Converts to string.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Change event (prevented)
   * @param {HTMLElement} element - Input element with data-field and data-type attributes
   * @returns {Promise<Item|undefined>} Updated item document or undefined if validation fails
   */
  static async updateItemField(context, event, element) {
    event.preventDefault();
    event.stopPropagation(); // Prevent Foundry's submitOnChange form handler from firing
    const el = this.#getElement(element, event);
    const row = this.#getItemRow(el);
    const id = this.#getItemId(row);
    const field = el.dataset.field;
    if (!id || !field) {
      return;
    }

    const value = this.#toFieldValue(el);

    const item = context.actor.items.get(id);
    if (!item) {
      return;
    }

    // The update re-renders the sheet on every client: a field can change values shown elsewhere on it (an
    // arrow's dice in the damage button, an armor's Armor TN, a Trait in the roll pool) (#101)
    return item.update({ [field]: value });
  }

  /**
   * An inline field's value coerced by its `data-type`: Integer, Number, Boolean (a checkbox's checked state, or a
   * truthy word), else text.
   * @param {HTMLInputElement} el - The edited input
   * @returns {number|boolean|string}
   */
  static #toFieldValue(el) {
    const value = el.value;
    switch (el.dataset.type) {
      case "Integer":
        return toInt(value, 0);
      case "Number":
        return Number.isFinite(+value) ? +value : 0;
      case "Boolean": {
        // For checkboxes, use checked property instead of value
        if (el.type === "checkbox") {
          return el.checked;
        }
        const s = String(value).toLowerCase();
        return s === "true" || s === "1" || s === "on" || s === "yes";
      }
      default:
        return String(value ?? "");
    }
  }

  /**
   * Posts an item to chat by calling its roll() method.
   * Silently catches and logs errors to prevent sheet breakage on failed rolls.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element or event target
   * @returns {Promise<void>}
   */
  static async toChat(context, event, element) {
    event.preventDefault();

    const row = this.#getItemRow(element);
    const id = this.#getItemId(row);
    if (!id) {
      return;
    }
    const item = context.actor?.items?.get(id);
    if (!item) {
      return;
    }
    try {
      await item.roll();
    } catch (err) {
      console.error(`${SYS_ID} ItemCrudHandler: item.roll() failed`, { err, id });
      ui.notifications?.error(F("l5r4.ui.notifications.postFailed", { name: item.name }));
    }
  }
}
