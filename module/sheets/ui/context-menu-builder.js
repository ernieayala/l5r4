/**
 * Context Menu Builder
 * 
 * Constructs and manages right-click context menus for actor item lists.
 * Provides standard Edit and Delete operations for embedded items.
 * 
 * Foundry Requirements:
 * - Requires Foundry VTT v13+ (uses foundry.applications.ux.ContextMenu)
 * - Uses Application v2 event delegation patterns
 * - jQuery-free implementation (jQuery: false option)
 * 
 * API: ContextMenu, Actor.deleteEmbeddedDocuments
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Extracts item ID from a DOM element or jQuery-like array.
 * 
 * Checks multiple dataset properties in order:
 * 1. itemId - Primary item identifier
 * 2. documentId - Alternative document identifier
 * 3. id - Generic fallback identifier
 * 
 * @param {HTMLElement|Array<HTMLElement>} target - Element or element array
 * @returns {string|undefined} Item UUID or undefined if not found
 * @private
 */
function getItemId(target) {
  const el = target instanceof HTMLElement ? target : target?.[0];
  return el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
}

/**
 * Sets up a context menu for actor item operations.
 * 
 * Creates a Foundry v13 ContextMenu instance with Edit and Delete operations.
 * Handles menu lifecycle by closing any existing menu before creating a new one
 * to prevent multiple menus from rendering simultaneously.
 * 
 * Menu Operations:
 * - **Edit**: Opens the item sheet for modification
 * - **Delete**: Removes the item from the actor with confirmation
 * 
 * Error Handling:
 * - Gracefully handles menu close failures (menu may already be destroyed)
 * - Logs deleteEmbeddedDocuments failures without throwing
 * - Returns null if menu initialization fails
 * 
 * @param {HTMLElement} root - Root element to attach context menu to
 * @param {L5R4Actor} actor - Actor document containing the items
 * @param {ContextMenu|null} [existingMenu=null] - Previous menu instance to clean up
 * @returns {Promise<ContextMenu|null>} New context menu instance or null on failure
 */
export async function setupItemContextMenu(root, actor, existingMenu = null) {
  try {
    // Close any existing menu to prevent multiple menus rendering simultaneously.
    // Animation disabled for instant cleanup. Ignore errors if menu already destroyed.
    if (existingMenu?.element) {
      try { 
        await existingMenu.close({ animate: false }); 
      } catch (_) {}
    }
    
    const Menu = foundry.applications.ux.ContextMenu;
    return new Menu(root, ".item", [
      {
        name: game.i18n.localize("l5r4.ui.common.edit"),
        icon: '<i class="fas fa-edit"></i>',
        callback: (target) => {
          const id = getItemId(target);
          actor.items.get(id)?.sheet?.render(true);
        }
      },
      {
        name: game.i18n.localize("l5r4.ui.common.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: async (target) => {
          const id = getItemId(target);
          if (!id) return;
          try { 
            await actor.deleteEmbeddedDocuments("Item", [id]); 
          } catch (err) {
            // Log but don't throw - allows sheet to remain functional after delete failures
            console.warn(`${SYS_ID} ContextMenuBuilder: deleteEmbeddedDocuments failed`, { err }); 
          }
        }
      }
    ], { jQuery: false });
  } catch (e) {
    console.warn(`${SYS_ID} ContextMenuBuilder: context menu init failed`, e);
    return null;
  }
}
