/**
 * @module sheets/handlers/item-crud-handler
 * @description Creates, opens, edits inline, deletes, expands, and posts to chat the embedded Item documents on actor
 * sheets, and toggles a sheet section's collapsed state. Every method is static and takes the sheet's handler
 * context ({ actor, element, sheetClassName }).
 */

import { SYS_ID } from "../../config/constants.js";
import { toInt } from "../../utils/type-coercion.js";
import { updateSectionCollapsed } from "../../utils/section-state.js";
import * as Chat from "../../services/chat.js";

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
   * Item rows are expected to have the CSS class "item".
   *
   * @param {HTMLElement} element - Starting element for traversal
   * @returns {HTMLElement|null} The item row element or null if not found
   */
  static #getItemRow(element) {
    return element?.closest?.(".item");
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

    const result = await Chat.getUnifiedItemOptions(context.actor.type, preferredType);

    if (result.cancelled) {
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
    if (!event.shiftKey) {
      // No is the default button [src: client/applications/api/dialog.mjs:346-354]; closing the dialog resolves null
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "l5r4.ui.dialogs.deleteItem.title" },
        content: `<p>${game.i18n.localize("l5r4.ui.dialogs.deleteItem.content", {
          name: item.name
        })}</p>`
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      await context.actor.deleteEmbeddedDocuments("Item", [id]);
    } catch (err) {
      console.warn(`${SYS_ID} ItemCrudHandler: deleteEmbeddedDocuments failed`, { err });
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
    const sectionTitle = element.closest(".l5r4-section-title");
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
   * and data-dtype="TypeName" attributes. For example, to edit a skill rank:
   * <input data-action="update-item-field" data-field="system.rank" data-dtype="Integer" value="3">
   *
   * Supported data types (via data-dtype attribute):
   * - "Integer" → Converts to integer (default 0)
   * - "Number" → Converts to float (default 0)
   * - "Boolean" → Converts to boolean (accepts "true", "1", "on", "yes")
   * - Default → Converts to string.
   *
   * @param {object} context -Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Change event (prevented)
   * @param {HTMLElement} element - Input element with data-field and data-dtype attributes
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

    let value = el.value;
    switch (el.dataset.dtype) {
      case "Integer":
        value = toInt(value, 0);
        break;
      case "Number":
        value = Number.isFinite(+value) ? +value : 0;
        break;
      case "Boolean": {
        // For checkboxes, use checked property instead of value
        if (el.type === "checkbox") {
          value = el.checked;
        } else {
          const s = String(value).toLowerCase();
          value = s === "true" || s === "1" || s === "on" || s === "yes";
        }
        break;
      }
      default:
        value = String(value ?? "");
    }

    // Update the item
    const item = context.actor.items.get(id);
    if (!item) {
      return;
    }

    await item.update({ [field]: value }, { render: false });

    // For checkboxes, manually update the visual state
    if (el.type === "checkbox" && el.dataset.dtype === "Boolean") {
      el.checked = value;
    }

    // Update affected DOM elements without re-rendering entire sheet
    if (field === "system.trait" && item.type === "skill") {
      // Trait change: update roll formula buttons for this skill
      // Item update triggers actor prepareDerivedData, which recalculates formulas
      // Wait a tick for prepareDerivedData to complete, then update DOM
      await new Promise(resolve => setTimeout(resolve, 0));

      const skillRow = row;
      const rollButtons = skillRow.querySelectorAll('[data-action="roll-skill"]');
      rollButtons.forEach(button => {
        const formula = `${item.system.roll}k${item.system.keep}`;
        button.textContent = formula;

        // Also update the mask span if it exists
        const mask = button.closest(".l5r4-button.-roll")?.querySelector(".l5r4-button-under");
        if (mask) {
          mask.textContent = formula;
        }
      });
    } else if (field === "system.equipped") {
      // Equipped change: update Armor TN in sheet
      // Re-render is still needed here because Armor TN appears in header
      if (context.actor.sheet?.rendered) {
        context.actor.sheet.render(false);
      }
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
      console.warn(`${SYS_ID} ItemCrudHandler: item.roll() failed`, { err, id });
    }
  }
}
