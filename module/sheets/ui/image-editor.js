/**
 * @fileoverview Image Editor Utility - Actor Image File Picker
 * 
 * Provides a reusable utility for opening Foundry's file picker to select
 * actor images. Handles the file picker configuration and update callback.
 * 
 * **Responsibilities:**
 * - Open Foundry file picker with image filter
 * - Position picker relative to sheet
 * - Handle image selection callback
 * - Update actor document with selected image
 * 
 * **Usage:**
 * ```javascript
 * import { openImageEditor } from "./ui/image-editor.js";
 * await openImageEditor(actor, sheetPosition);
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.apps.FilePicker.html|FilePicker}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Open the image editor file picker for an actor.
 * 
 * @param {Actor} actor - The actor document to edit
 * @param {object} position - The sheet position for picker placement
 * @param {number} position.top - Sheet top position
 * @param {number} position.left - Sheet left position
 * @returns {Promise<void>}
 */
export async function openImageEditor(actor, position) {
  const current = actor.img;
  const fp = new foundry.applications.apps.FilePicker.implementation({
    type: "image",
    current: current,
    callback: async (path) => {
      try {
        await actor.update({ img: path });
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update actor image", { err });
      }
    },
    top: position.top + 40,
    left: position.left + 10
  });
  
  return fp.browse();
}
