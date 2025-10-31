/**
 * Void Points Handler
 *
 * Manages adjustment and UI updates for character Void Points in the L5R4 system.
 * Void Points represent moments of enlightened insight that characters can spend to
 * enhance rolls or activate abilities. Each character has Void Points equal to their
 * Void Ring rank, which refresh daily after rest.
 *
 * Foundry APIs: Actor#update, querySelector, classList
 * Requires: Foundry v13+
 *
 * @module VoidPointsHandler
 */

import { SYS_ID } from "../../config/constants.js";
import { clamp } from "../../utils/type-coercion.js";

/**
 * Handles Void Point adjustments and visual representation updates.
 *
 * Provides methods to increment/decrement a character's current Void Points
 * and synchronize the UI dot display. Void Points are stored in the actor's
 * system data at `system.rings.void.value` and are clamped between 0 and 9.
 *
 * Usage pattern:
 * - Called from sheet event handlers when void dot is clicked
 * - Provides both state management (adjust) and rendering (paint)
 *
 * @class VoidPointsHandler
 */
export class VoidPointsHandler {
  /**
   * Adjusts an actor's Void Points by the specified delta amount.
   *
   * Increments or decrements the actor's current Void Points, clamping the result
   * between 0 (spent all points) and 9 (maximum). Updates the actor document via
   * Foundry's Actor#update API and triggers a UI repaint.
   *
   * Game Rules: Characters have Void Points equal to their Void Ring (max 10 in rules,
   * but clamped to 9 here). Void Points refresh daily after rest.
   *
   * @param {Object} context - Sheet context containing actor and element references
   * @param {L5R4Actor} context.actor - The actor document to update
   * @param {HTMLElement} context.element - Root sheet element for UI updates
   * @param {Event} [event] - Optional DOM event to prevent default behavior
   * @param {number} delta - Amount to adjust (+1 to spend, -1 to regain)
   * @returns {Promise<void>}
   * @async
   */
  static async adjust(context, event, delta) {
    event?.preventDefault?.();

    const cur = this._getVoidValue(context.actor);
    const next = clamp(cur + delta, 0, 9); // Max 9 Void Points (system constraint)
    if (next === cur) {
      return;
    }

    try {
      // diff:true minimizes update payload, render:false prevents automatic sheet redraw
      // since we manually update the UI via paint() below
      await context.actor.update(
        { "system.rings.void.value": next },
        { diff: true, render: false }
      );

      // CRITICAL: After update, actor.system has been refreshed by prepareDerivedData
      // Now paint the UI with the updated actor data
      this.paint(context.element, context.actor);
    } catch (err) {
      console.warn(`${SYS_ID} VoidPointsHandler: failed to update void points`, { err });
    }
  }

  /**
   * Updates the visual representation of Void Points in the character sheet.
   *
   * Finds all void dot elements and toggles their filled state based on the actor's
   * current Void Point value. Dots with index <= current value are marked as filled.
   *
   * Foundry Pattern: Uses standard DOM querySelector and classList manipulation.
   * Compatible with Foundry v13 Application v2 architecture.
   *
   * @param {HTMLElement} root - Root element to query for void point dots
   * @param {L5R4Actor} actor - Actor document containing current Void Point data
   * @returns {void}
   * @static
   */
  static paint(root, actor) {
    // querySelector used here to find specific UI component container by class
    // Alternative would require data-attribute on container, but class selector is
    // semantically correct for styling-related component queries
    // Additionally, using querySelector for void dots UI allows for easy styling
    // and layout changes without modifying the underlying JavaScript code.
    const node = root?.querySelector?.(".void-points-dots");
    if (!node) {
      return;
    }

    const cur = this._getVoidValue(actor);
    // querySelectorAll used to find all dot elements within the container
    // Data attributes used for dot index values (data-idx)
    node.querySelectorAll(".void-dot").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
  }

  /**
   * Safely retrieves the current Void Point value from an actor.
   *
   * Defensive accessor that handles missing or malformed data by returning 0.
   * Uses optional chaining to safely traverse the actor's system data structure.
   *
   * @param {L5R4Actor} actor - Actor document to read Void Points from
   * @returns {number} Current Void Point value (0 if data is missing/invalid)
   * @private
   * @static
   */
  static _getVoidValue(actor) {
    return Number(actor.system?.rings?.void?.value ?? 0) || 0;
  }
}
