/**
 * Image Editor UI Utility
 *
 * Provides image selection functionality for actor documents using Foundry's
 * FilePicker API. Handles file selection, validation, and actor document updates.
 *
 * Responsibilities:
 * - Opens Foundry FilePicker for image selection
 * - Manages FilePicker positioning relative to trigger element
 * - Handles async actor.img updates with error recovery
 *
 * Foundry APIs:
 * - foundry.applications.apps.FilePicker - File browser and selector
 * - Actor#update() - Document update method
 *
 * @module sheets/ui/image-editor
 * @requires Foundry v13+
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Opens the Foundry FilePicker for selecting a new actor image.
 *
 * Creates and displays a FilePicker configured for image selection. When the user
 * selects a file, automatically updates the actor's image property. The FilePicker
 * is positioned relative to the provided position (typically the triggering element).
 *
 * Position Offset Strategy:
 * - Adds 40px vertical offset to avoid covering the trigger element
 * - Adds 10px horizontal offset for visual separation
 *
 * Error Handling:
 * - Actor update failures are logged but do not throw
 * - FilePicker errors bubble to caller
 * - Non-blocking: UI remains functional after update failures
 *
 * @param {L5R4Actor} actor - The actor document whose image will be updated
 * @param {Object} position - Positioning data for the FilePicker dialog
 * @param {number} position.top - Top coordinate in pixels
 * @param {number} position.left - Left coordinate in pixels
 * @returns {Promise<string|false>} Promise resolving to selected file path,
 *   or false if user cancels. Rejects on FilePicker initialization errors.
 */
export async function openImageEditor(actor, position) {
  const current = actor.img;

  // Configure FilePicker: image-only selection with callback-based update
  const fp = new foundry.applications.apps.FilePicker.implementation({
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
