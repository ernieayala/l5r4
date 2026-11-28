/**
 * @module sheets/handlers/void-points-handler
 * @description Adjusts a character's current Void Points from the sheet's void dots and repaints the dots. A
 * character has Void Points equal to the Void Ring rank, spent to improve rolls and regained with rest.
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import { getClamped } from "../../utils/type-coercion.js";
import { warnAtLimit } from "./trait-handler.js";

/**
 * Handles Void Point adjustments and visual representation updates.
 *
 * Provides methods to increment/decrement a character's current Void Points
 * and synchronize the UI dot display. Void Points are stored in the actor's
 * system data at `system.rings.void.value` and are clamped between 0 and 9.
 *
 * Usage pattern:
 * - Called from sheet event handlers when void dot is clicked
 * - Provides both state management (updateVoidPoints) and rendering (updateVoidDots)
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
   * @param {object} context - Sheet context containing actor and element references
   * @param {L5R4Actor} context.actor - The actor document to update
   * @param {HTMLElement} context.element - Root sheet element for UI updates
   * @param {Event} [event] - Optional DOM event to prevent default behavior
   * @param {number} delta - Amount to adjust (+1 to spend, -1 to regain)
   * @returns {Promise<void>}
   */
  static async updateVoidPoints(context, event, delta) {
    event?.preventDefault?.();

    // The stored value, not the prepared one, so an Active Effect on Void Points is never written into
    // storage (B6)
    const cur = context.actor._source.system.rings.void.value;
    const next = getClamped(cur + delta, 0, 9); // Max 9 Void Points (system constraint)
    if (next === cur) {
      warnAtLimit(T("l5r4.ui.mechanics.rings.voidPoints"), delta);
      return;
    }

    try {
      // diff:true minimizes update payload, render:false prevents automatic sheet redraw
      // since we manually update the UI via updateVoidDots() below
      await context.actor.update(
        { "system.rings.void.value": next },
        { diff: true, render: false }
      );

      // CRITICAL: After update, actor.system has been refreshed by prepareDerivedData
      // Now paint the UI with the updated actor data
      this.updateVoidDots(context.element, context.actor);
    } catch (err) {
      console.warn(`${SYS_ID} VoidPointsHandler: failed to update void points`, { err });
    }
  }

  /**
   * Repaints the Void Point dots after a change saved without a render, as the template paints them
   * (templates/actor/_partials/_void-points.hbs): dots up to the count filled, and the count in the button's
   * tooltip and name.
   *
   * @param {HTMLElement} root - Root element to query for void point dots
   * @param {L5R4Actor} actor - Actor document containing current Void Point data
   * @returns {void}
   */
  static updateVoidDots(root, actor) {
    const node = root?.querySelector?.("[data-action='adjust-void-points']");
    if (!node) {
      return;
    }

    const cur = this.#getVoidPoints(actor);
    node.querySelectorAll("[data-idx]").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("is-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
    // The prepared maximum, which Taint Level 4 lowers below the Void Ring
    // game-rules/89_shadowlands_taint.md, p.278
    const label = game.i18n.localize("l5r4.ui.mechanics.rings.voidPointsValue", {
      current: cur,
      max: actor.system.rings.void.max
    });
    node.dataset.tooltip = label;
    node.setAttribute("aria-label", label);
  }

  /**
   * Safely retrieves the current Void Point value from an actor.
   *
   * Defensive accessor that handles missing or malformed data by returning 0.
   * Uses optional chaining to safely traverse the actor's system data structure.
   *
   * @param {L5R4Actor} actor - Actor document to read Void Points from
   * @returns {number} Current Void Point value (0 if data is missing/invalid)
   */
  static #getVoidPoints(actor) {
    return Number(actor.system?.rings?.void?.value ?? 0) || 0;
  }
}
