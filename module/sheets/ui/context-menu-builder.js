/**
 * @fileoverview Context Menu Builder - Item Context Menu Factory
 * 
 * Provides a factory function for creating standardized context menus for item rows
 * in actor sheets. Generates edit and delete menu options with proper callbacks.
 * 
 * **Responsibilities:**
 * - Build Foundry ContextMenu instances for item rows
 * - Provide standard edit and delete options
 * - Handle menu lifecycle (creation, cleanup)
 * - Localize menu labels
 * 
 * **Usage:**
 * ```javascript
 * import { setupItemContextMenu } from "./ui/context-menu-builder.js";
 * await setupItemContextMenu(root, actor, existingMenu);
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.ContextMenu.html|ContextMenu}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Setup right-click context menu for item rows with edit and delete options.
 * Should be called during _onRender after DOM is ready.
 * Replaces any existing context menu to avoid duplicates.
 * 
 * @param {HTMLElement} root - The sheet root element
 * @param {Actor} actor - The actor document
 * @param {ContextMenu} [existingMenu] - Existing menu instance to cleanup
 * @returns {Promise<ContextMenu|null>} Created context menu instance or null if failed
 */
export async function setupItemContextMenu(root, actor, existingMenu = null) {
  try {
    // Avoid duplicate menus on re-render
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
          const el = target instanceof HTMLElement ? target : target?.[0];
          const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
          actor.items.get(id)?.sheet?.render(true);
        }
      },
      {
        name: game.i18n.localize("l5r4.ui.common.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: async (target) => {
          const el = target instanceof HTMLElement ? target : target?.[0];
          const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
          if (!id) return;
          try { 
            await actor.deleteEmbeddedDocuments("Item", [id]); 
          } catch (err) { 
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
