/**
 * @fileoverview Void Points Handler - L5R4 Void Point Management
 * 
 * Encapsulates void point adjustment and visual rendering logic for actor sheets.
 * Provides interactive dot interface for tracking void point expenditure and recovery.
 * 
 * **Responsibilities:**
 * - Adjust void points by ±1 within [0..9] range
 * - Persist changes to actor document
 * - Render visual dot interface with filled/empty states
 * - Handle click interactions (left=spend, right=regain)
 * 
 * **Integration:**
 * Used by BaseActorSheet via composition pattern. Methods are called with
 * explicit `this` context binding to access actor and element.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Void Points Handler Class
 * Manages void point state and UI for actor sheets.
 */
export class VoidPointsHandler {
  /**
   * Adjust Void Points by ±1 within the range [0..9].
   * Uses Document.update to persist the value and triggers UI repaint.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {HTMLElement} context.element - The sheet root element
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} targetElement - The void points dots container element
   * @param {number} delta - +1 (left click) or -1 (right-click)
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   */
  static async adjust(context, event, targetElement, delta) {
    event?.preventDefault?.();
    
    const cur = Number(context.actor.system?.rings?.void?.value ?? 0) || 0;
    const next = Math.min(9, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    
    try {
      await context.actor.update({ "system.rings.void.value": next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} VoidPointsHandler: failed to update void points`, { err });
    }
    
    // Repaint from authoritative actor state to avoid stale DOM edge-cases
    this.paint(context.element, context.actor);
  }

  /**
   * Render the 9-dot Void Points control by toggling "-filled" class on dots.
   * Updates visual state to match current void points value. Safe to call after every render.
   * 
   * @param {HTMLElement} root - The sheet root element containing .void-points-dots
   * @param {Actor} actor - The actor document with void point data
   * @returns {void}
   */
  static paint(root, actor) {
    const node = root?.querySelector?.(".void-points-dots");
    if (!node) return;
    
    const cur = Number(actor.system?.rings?.void?.value ?? 0) || 0;
    node.querySelectorAll(".void-dot").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
  }
}
