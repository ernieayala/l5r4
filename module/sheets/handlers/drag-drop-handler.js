/**
 * Drag and Drop Handler
 *
 * Centralized handler for drag-drop operations on L5R4 actor sheets.
 * Routes dropped documents to appropriate handlers and manages item embedding.
 *
 * Responsibilities:
 * - Parse Foundry drag events using TextEditor.getDragEventData
 * - Route Item and Actor drops to specialized handlers
 * - Resolve document UUIDs and embed items on actors
 * - Provide defensive error handling for failed drops
 *
 * Integration:
 * - Used by BaseActorSheet via _onDrop, _onDropItem, _onDropActor hooks
 * - Receives context object with actor and element references
 * - Returns created documents or false on failure/unsupported drops
 *
 * Foundry APIs:
 * - foundry.applications.ux.TextEditor.getDragEventData() (v13+)
 * - fromUuid() for document resolution
 * - Actor.createEmbeddedDocuments() for item embedding
 *
 * @module DragDropHandler
 * @requires Foundry VTT v13+
 */
import { SYS_ID } from "../../config/constants.js";

/**
 * Handler context object provided by actor sheets
 *
 * @typedef {Object} HandlerContext
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
   *
   * @see https://foundryvtt.com/api/foundry.applications.ux.TextEditor.html#getDragEventData
   */
  static async handleDrop(context, event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (!data) return false;

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
   * Resolves the item by UUID, converts to plain object data, and embeds it
   * on the target actor using createEmbeddedDocuments. This creates a copy
   * of the source item owned by the actor.
   *
   * Permission check ensures only owners can modify the actor. UUID resolution
   * and embedding are wrapped in try-catch for defensive error handling.
   *
   * @param {HandlerContext} context - Sheet context with actor reference
   * @param {DragEvent} event - Browser drag event (unused but required by signature)
   * @param {Object} data - Parsed drag data from getDragEventData
   * @param {string} data.uuid - Universal unique identifier for the source item
   * @returns {Promise<Item[]|false>} Array containing created item, or false on failure
   *
   * @see https://foundryvtt.com/api/classes/client.Actor.html#createEmbeddedDocuments
   */
  static async handleItemDrop(context, event, data) {
    if (!context.actor.isOwner) return false;

    try {
      // Resolve source item by UUID
      const item = await fromUuid(data.uuid);
      if (!item) {
        console.warn(`${SYS_ID} DragDropHandler: Could not resolve item UUID`, data.uuid);
        return false;
      }

      // Convert to plain object for embedding (creates copy, not reference)
      const itemData = item.toObject();
      return await context.actor.createEmbeddedDocuments("Item", [itemData]);
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
   * @param {HandlerContext} context - Sheet context (unused)
   * @param {DragEvent} event - Browser drag event (unused)
   * @param {Object} data - Parsed drag data (unused)
   * @returns {Promise<false>} Always returns false (not implemented)
   */
  static async handleActorDrop(context, event, data) {
    // Stub: Actor drops not currently supported
    return false;
  }
}
