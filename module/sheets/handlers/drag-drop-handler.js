/**
 * @module sheets/handlers/drag-drop-handler
 * @description Handles documents dropped on L5R4 actor sheets: parses the drag event with
 * foundry.applications.ux.TextEditor.getDragEventData, routes Item and Actor drops, resolves the dropped UUID, and
 * adds items through the purchase service. BaseActorSheet calls it from its drop overrides; a failed or unsupported
 * drop returns false.
 */
import { SYS_ID } from "../../config/constants.js";
import { addItem } from "../../services/purchase.js";

/**
 * Handler context object provided by actor sheets.
 *
 * @typedef {object} HandlerContext
 * @property {L5R4Actor} actor - The actor document being modified
 * @property {HTMLElement} element - The sheet's root DOM element
 */

/**
 * Centralized drag-drop handler for L5R4 actor sheets
 *
 * All methods are static and expect a HandlerContext from BaseActorSheet.
 * Uses Foundry v13 Application v2 patterns for event handling.
 */
export class DragDropHandler {
  /**
   * Main entry point for drop events on actor sheets
   *
   * Parses the drag event data and routes to specialized handlers based on
   * the document type. Currently supports Item and Actor drops.
   *
   * Uses Foundry's TextEditor.getDragEventData to extract standardized drop
   * payload containing type and uuid properties.
   *
   * @param {HandlerContext} context - Sheet context with actor and element
   * @param {DragEvent} event - Browser drag event from Foundry
   * @returns {Promise<Document|Document[]|false>} Created documents or false if unsupported/failed
   */
  static async handleDrop(context, event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (!data) {
      return false;
    }

    if (data.type === "Item") {
      return this.handleItemDrop(context, event, data);
    }

    if (data.type === "Actor") {
      return this.handleActorDrop(context, event, data);
    }

    return false;
  }

  /**
   * Handles dropping an Item document onto an actor sheet
   *
   * Resolves the item by UUID and adds a copy of it to the actor through the purchase service, which checks its
   * prerequisites, asks its choices, and replaces a character's Clan, Family, or School
   * (module/services/purchase.js, addItem).
   *
   * UUID resolution and adding are wrapped in try-catch for defensive error handling.
   *
   * @param {HandlerContext} context - Sheet context with actor reference
   * @param {DragEvent} event - Browser drag event (unused but required by signature)
   * @param {object} data - Parsed drag data from getDragEventData
   * @param {string} data.uuid - Universal unique identifier for the source item
   * @returns {Promise<Item|false>} The created item, or false when nothing was added
   */
  static async handleItemDrop(context, event, data) {
    if (!context.actor.isOwner) {
      return false;
    }

    try {
      // Resolve source item by UUID
      const item = await fromUuid(data.uuid);
      if (!item) {
        console.warn(`${SYS_ID} DragDropHandler: Could not resolve item UUID`, data.uuid);
        return false;
      }
      // A row dragged from this sheet (for a hotbar macro) and let go on it again adds nothing
      if (item.parent === context.actor) {
        return false;
      }

      return (await addItem(context.actor, item.toObject())) ?? false;
    } catch (err) {
      console.warn(`${SYS_ID} DragDropHandler: Failed to drop item`, { err, data });
      return false;
    }
  }

  /**
   * Handles dropping an Actor document onto an actor sheet
   *
   * Currently a stub that rejects all actor drops. This may be expanded
   * in the future to support features like followers, mounts, or contacts.
   *
   * @param {HandlerContext} _context - Sheet context (unused)
   * @param {DragEvent} _event - Browser drag event (unused)
   * @param {object} _data - Parsed drag data (unused)
   * @returns {Promise<false>} Always returns false (not implemented)
   */
  static async handleActorDrop(_context, _event, _data) {
    // Stub: Actor drops not currently supported
    return false;
  }
}
