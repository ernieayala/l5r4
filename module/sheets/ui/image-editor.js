/**
 * @module sheets/ui/image-editor
 * @description Picks a new actor image with foundry.applications.apps.FilePicker, opened beside the element that
 * triggered it, and writes the chosen path to the actor's img; a failed update is logged, not thrown.
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Opens the Foundry FilePicker for selecting a new actor image.
 *
 * Creates and displays a FilePicker configured for image selection. When the user
 * selects a file, automatically updates the actor's image property. The FilePicker
 * opens at an offset from the given position, the triggering element's in practice.
 *
 * Position Offset Strategy:
 * - Adds 40px vertical offset to avoid covering the trigger element
 * - Adds 10px horizontal offset for visual separation
 *
 * Error Handling:
 * - Actor update failures are logged but do not throw
 * - FilePicker errors bubble to caller
 * - Non-blocking: UI remains functional after update failures.
 *
 * @param {L5R4Actor} actor - The actor document whose image will be updated
 * @param {object} position - Positioning data for the FilePicker dialog
 * @param {number} position.top - Top coordinate in pixels
 * @param {number} position.left - Left coordinate in pixels
 * @returns {Promise<string|false>} Promise resolving to selected file path,
 *   or false if user cancels. Rejects on FilePicker initialization errors.
 */
export async function openImageEditor(actor, position) {
  const current = actor.img;
  const FilePicker = foundry.applications.apps.FilePicker.implementation;

  // Configure FilePicker: image-only selection with callback-based update
  const fp = new FilePicker({
    type: "image",
    current: current,
    callback: async path => {
      try {
        await actor.update({ img: path });
      } catch (err) {
        // Non-blocking: log failure but don't disrupt UI
        console.warn(`${SYS_ID}`, "Failed to update actor image", { err });
      }
    },
    // Position below and slightly right of trigger to avoid occlusion
    top: position.top + 40,
    left: position.left + 10
  });

  return fp.browse();
}
