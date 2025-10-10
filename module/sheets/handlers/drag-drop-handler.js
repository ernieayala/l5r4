/**
 * @fileoverview Drag & Drop Handler - Actor Sheet Drop Processing
 * 
 * Handles drag and drop operations for actor sheets, processing item and actor
 * drops from various sources including compendiums and other sheets.
 * 
 * **Responsibilities:**
 * - Process drop events and extract drag data
 * - Handle Item drops (create embedded copies)
 * - Handle Actor drops (extensible for child sheets)
 * - Validate drop data and permissions
 * 
 * **Integration:**
 * Used by BaseActorSheet via composition. Child sheets can override
 * handleActorDrop for specialized actor drop behavior.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#getDragEventData|TextEditor.getDragEventData}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#createEmbeddedDocuments|Document.createEmbeddedDocuments}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Drag & Drop Handler Class
 * Processes drop events and creates embedded documents.
 */
export class DragDropHandler {
  /**
   * Handle drop events on the actor sheet.
   * Processes item drops from compendiums and other sources.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {DragEvent} event - The drop event
   * @returns {Promise<Document[]|false>} Created documents or false if not handled
   * @see https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#getDragEventData
   */
  static async handleDrop(context, event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (!data) return false;

    // Handle Item drops
    if (data.type === "Item") {
      return this.handleItemDrop(context, event, data);
    }

    // Handle Actor drops (for reference, not embedding)
    if (data.type === "Actor") {
      return this.handleActorDrop(context, event, data);
    }

    return false;
  }

  /**
   * Handle dropping an Item onto the actor sheet.
   * Creates an embedded copy of the item on this actor.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing item information
   * @returns {Promise<Document[]|false>} Created item documents or false if failed
   */
  static async handleItemDrop(context, event, data) {
    if (!context.actor.isOwner) return false;

    try {
      const item = await fromUuid(data.uuid);
      if (!item) {
        console.warn(`${SYS_ID} DragDropHandler: Could not resolve item UUID`, data.uuid);
        return false;
      }

      // Create embedded item on this actor
      const itemData = item.toObject();
      return await context.actor.createEmbeddedDocuments("Item", [itemData]);
    } catch (err) {
      console.warn(`${SYS_ID} DragDropHandler: Failed to drop item`, { err, data });
      return false;
    }
  }

  /**
   * Handle dropping an Actor onto the actor sheet.
   * Base implementation does nothing - child sheets can override for specific behavior.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing actor information
   * @returns {Promise<boolean>} Always returns false in base implementation
   */
  static async handleActorDrop(context, event, data) {
    // Base implementation - child sheets can override
    return false;
  }
}
