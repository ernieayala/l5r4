/**
 * Item CRUD Handler
 *
 * Handles Create, Read, Update, and Delete operations for embedded Item documents
 * on Actor sheets. Uses Foundry v13 Application v2 event delegation pattern.
 *
 * All methods are static and designed to be called from actor sheet event handlers
 * with a context object containing { actor, element, sheetClassName }.
 *
 * Relevant Foundry APIs:
 * - Actor.createEmbeddedDocuments() - Creates embedded Items
 * - Actor.deleteEmbeddedDocuments() - Deletes embedded Items
 * - Actor.items.get() - Retrieves Item by ID
 * - Item.sheet.render() - Opens Item sheet
 * - Item.roll() - Posts Item to chat
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Actor.html}
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Item.html}
 */

import { SYS_ID } from "../../config/constants.js";
import { toInt } from "../../utils/type-coercion.js";
import * as Chat from "../../services/chat.js";

/**
 * Static utility class for handling item CRUD operations on actor sheets.
 * Provides methods for creating, editing, deleting, expanding, and posting items to chat.
 * Integrates with Foundry's embedded document system and sheet rendering.
 */
export class ItemCRUDHandler {
  /**
   * Resolves the target element from either an explicit element or event target.
   * Defensive helper for handlers that may receive element or event.
   *
   * @param {HTMLElement} element - Explicitly passed element
   * @param {Event} event - Event containing currentTarget
   * @returns {HTMLElement} The resolved element
   * @private
   */
  static _getElement(element, event) {
    return element || event.currentTarget;
  }

  /**
   * Finds the closest ancestor item row element.
   * Item rows are expected to have the CSS class "item".
   *
   * @param {HTMLElement} element - Starting element for traversal
   * @returns {HTMLElement|null} The item row element or null if not found
   * @private
   */
  static _getItemRow(element) {
    return element?.closest?.(".item");
  }

  /**
   * Extracts the item ID from a row element's dataset.
   * Checks multiple dataset properties for compatibility: itemId, documentId, id.
   *
   * @param {HTMLElement} row - Item row element
   * @returns {string|undefined} The item ID or undefined if not found
   * @private
   */
  static _getItemId(row) {
    return row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
  }

  /**
   * Creates a new embedded Item on the actor.
   * Prompts user for item type and name via unified dialog.
   * Auto-detects preferred item type based on the clicked section's data-scope attribute.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element (used to detect section)
   * @returns {Promise<Item[]>} Created item documents (empty if cancelled)
   *
   * @see detectSectionItemType
   */
  static async create(context, event, element) {
    event.preventDefault();

    const preferredType = this.detectSectionItemType(element);

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
  static detectSectionItemType(element) {
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
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element or event target
   */
  static edit(context, event, element) {
    event.preventDefault();
    const el = this._getElement(element, event);
    const row = this._getItemRow(el);
    const id = this._getItemId(row);
    context.actor.items.get(id)?.sheet?.render(true);
  }

  /**
   * Deletes an embedded Item from the actor.
   * Silently catches and logs errors to prevent sheet breakage on failed deletion.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element or event target
   * @returns {Promise<void>}
   */
  static async deleteItem(context, event, element) {
    event.preventDefault();
    const el = this._getElement(element, event);
    const row = this._getItemRow(el);
    const id = this._getItemId(row);
    if (id) {
      try {
        await context.actor.deleteEmbeddedDocuments("Item", [id]);
      } catch (err) {
        console.warn(`${SYS_ID} ItemCRUDHandler: deleteEmbeddedDocuments failed`, { err });
      }
    }
  }

  /**
   * Toggles the expanded/collapsed state of an item row.
   * Adds/removes "is-expanded" CSS class and rotates chevron icon between down/up.
   *
   * @param {Object} context - Handler context from actor sheet (unused)
   * @param {Event} event - Click event (prevented)
   * @param {HTMLElement} element - Clicked element containing the chevron icon
   */
  static expand(context, event, element) {
    event?.preventDefault?.();
    const row = this._getItemRow(element);
    if (!row) {
      return;
    }
    row.classList.toggle("is-expanded");
    // querySelector used here to find icon element within the clicked button (scoped query)
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }

  /**
   * Handles inline editing of item fields directly on the actor sheet.
   * Reads the field path and data type from element dataset attributes,
   * coerces the input value to the appropriate type, and updates the item.
   *
   * HTML elements should include data-action="inline-edit", data-field="path.to.field",
   * and data-dtype="TypeName" attributes. For example, to edit a skill rank:
   * <input data-action="inline-edit" data-field="system.rank" data-dtype="Integer" value="3">
   *
   * Supported data types (via data-dtype attribute):
   * - "Integer" → Converts to integer (default 0)
   * - "Number" → Converts to float (default 0)
   * - "Boolean" → Converts to boolean (accepts "true", "1", "on", "yes")
   * - Default → Converts to string
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Change event (prevented)
   * @param {HTMLElement} element - Input element with data-field and data-dtype attributes
   * @returns {Promise<Item|undefined>} Updated item document or undefined if validation fails
   */
  static async inlineEdit(context, event, element) {
    event.preventDefault();
    const el = this._getElement(element, event);
    const row = this._getItemRow(el);
    const id = this._getItemId(row);
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
        const s = String(value).toLowerCase();
        value = s === "true" || s === "1" || s === "on" || s === "yes";
        break;
      }
      default:
        value = String(value ?? "");
    }

    return context.actor.items.get(id)?.update({ [field]: value }, { render: false });
  }

  /**
   * Posts an item to chat by calling its roll() method.
   * **Requires Shift+Click** - ignored if shift key not held to prevent accidental posts.
   * Silently catches and logs errors to prevent sheet breakage on failed rolls.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (prevented, must have shiftKey=true)
   * @param {HTMLElement} element - Clicked element or event target
   * @returns {Promise<void>}
   */
  static async toChat(context, event, element) {
    event.preventDefault();

    if (!event.shiftKey) {
      return;
    }

    const row = this._getItemRow(element);
    const id = this._getItemId(row);
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
      console.warn(`${SYS_ID} ItemCRUDHandler: item.roll() failed`, { err, id });
    }
  }
}
