/**
 * @fileoverview Item CRUD Handler - Actor Sheet Item Operations
 * 
 * Manages all Create, Read, Update, Delete operations for embedded items on actor sheets.
 * Provides unified item creation dialogs, inline editing, expansion controls, and chat integration.
 * 
 * **Responsibilities:**
 * - Create new items with type-specific dialogs
 * - Edit items by opening their sheets
 * - Delete items with confirmation
 * - Toggle item detail expansion
 * - Handle inline field editing with dtype coercion
 * - Post item cards to chat
 * - Auto-detect item types from sheet section context
 * 
 * **Integration:**
 * Used by BaseActorSheet via composition. All methods receive explicit context
 * for accessing actor document and performing operations.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#createEmbeddedDocuments|Document.createEmbeddedDocuments}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#deleteEmbeddedDocuments|Document.deleteEmbeddedDocuments}
 */

import { SYS_ID } from "../../config/constants.js";
import { toInt } from "../../utils/type-coercion.js";
import * as Chat from "../../services/chat.js";

/**
 * Item CRUD Handler Class
 * Provides comprehensive item management for actor sheets.
 */
export class ItemCRUDHandler {
  /**
   * Create a new embedded Item using the unified item creation dialog.
   * Shows a dialog with all relevant item types for the current actor type.
   * Auto-selects item type based on the sheet section context when available.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The originating click event
   * @param {HTMLElement} element - The clicked element (may have data-type for fallback)
   * @returns {Promise<Document[]>} Array of created item documents
   */
  static async create(context, event, element) {
    event.preventDefault();
    
    // Detect section context to auto-select appropriate item type
    const preferredType = this.detectSectionItemType(element);
    
    // Use unified dialog for item creation with preferred type
    const result = await Chat.getUnifiedItemOptions(context.actor.type, preferredType);
    
    // Handle cancellation
    if (result.cancelled) return [];
    
    // Create the item with user-specified name and type
    const itemData = {
      name: result.name,
      type: result.type
    };
    
    return context.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Detect the appropriate item type based on the sheet section context.
   * Maps section data-scope attributes to their corresponding item types.
   * 
   * @param {HTMLElement} element - The clicked Add Item button element
   * @returns {string|null} The preferred item type or null if not detectable
   */
  static detectSectionItemType(element) {
    // Find the closest parent with a data-scope attribute
    const section = element?.closest?.('[data-scope]');
    const scope = section?.dataset?.scope;
    
    if (!scope) return null;
    
    // Map section scopes to item types
    const sectionToItemType = {
      'skills': 'skill',
      'weapons': 'weapon',
      'armors': 'armor',
      'techniques': 'technique',
      'items': 'commonItem',
      'spells': 'spell',
      'katas': 'kata',
      'kihos': 'kiho',
      'tattoos': 'tattoo',
      'advantages': 'advantage',
      'disadvantages': 'disadvantage'
    };
    
    return sectionToItemType[scope] || null;
  }

  /**
   * Open an item's sheet for editing by finding the item ID from the row.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {void}
   */
  static edit(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    context.actor.items.get(id)?.sheet?.render(true);
  }

  /**
   * Delete an embedded item by finding the item ID from the row.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {Promise<void>}
   */
  static async deleteItem(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    if (id) {
      try {
        await context.actor.deleteEmbeddedDocuments("Item", [id]);
      } catch (err) {
        console.warn(`${SYS_ID} ItemCRUDHandler: deleteEmbeddedDocuments failed`, { err });
      }
    }
  }

  /**
   * Toggle inline expansion of an item row to reveal/hide its details.
   * Updates the chevron icon and applies the "is-expanded" class.
   * 
   * @param {object} context - Handler context (unused, for consistency)
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The expand/collapse button element
   * @returns {void}
   */
  static expand(context, event, element) {
    event?.preventDefault?.();
    const row = /** @type {HTMLElement|null} */ (element.closest(".item"));
    if (!row) return;
    row.classList.toggle("is-expanded");
    const icon = /** @type {HTMLElement|null} */ (element.querySelector("i"));
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }

  /**
   * Handle inline editing of item fields with proper dtype coercion.
   * Supports Integer, Number, Boolean, and String data types.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The input change event
   * @param {HTMLElement} element - The input element with data-field and data-dtype
   * @returns {Promise<Document|undefined>} Updated item document or undefined
   */
  static async inlineEdit(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // dtype coercion if provided
    let value = /** @type {HTMLInputElement|HTMLSelectElement} */ (el).value;
    switch (el.dataset.dtype) {
      case "Integer": value = toInt(value, 0); break;
      case "Number":  value = Number.isFinite(+value) ? +value : 0; break;
      case "Boolean": {
        const s = String(value).toLowerCase();
        value = s === "true" || s === "1" || s === "on" || s === "yes";
        break;
      }
      default: value = String(value ?? "");
    }

    return context.actor.items.get(id)?.update({ [field]: value });
  }

  /**
   * Post an item's card to chat when its title is clicked.
   * Calls the item's roll() method to display in chat.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {MouseEvent} event - The click event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {Promise<void>}
   */
  static async toChat(context, event, element) {
    event.preventDefault();
    const row = element?.closest?.(".item");
    const id = row?.dataset?.documentId || row?.dataset?.itemId || row?.dataset?.id;
    if (!id) return;
    const item = context.actor?.items?.get(id);
    if (!item) return;
    try { 
      await item.roll(); 
    } catch (err) { 
      console.warn(`${SYS_ID} ItemCRUDHandler: item.roll() failed`, { err, id }); 
    }
  }
}
