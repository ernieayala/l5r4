/**
 * @fileoverview PC Adjustment Handler - PC-Specific UI Controls
 * 
 * Handles PC-specific adjustment controls for void ring rank, spell slots,
 * rank points, and section expand/collapse. These are features unique to the
 * PC sheet that don't apply to NPCs.
 * 
 * **Responsibilities:**
 * - Void Ring rank adjustment (shift+click, separate from void points)
 * - Spell slot adjustments by element (water, air, fire, earth, void)
 * - Rank points stepping for Honor/Glory/Status/Shadow (±0.1 or ±1.0)
 * - Section expand/collapse toggle for UI organization
 * 
 * **PC vs NPC Differences:**
 * These controls are PC-specific because:
 * - Void Ring: PCs track ring rank separately for XP calculations
 * - Spell Slots: PCs have spell slot management, NPCs cast freely
 * - Rank Points: PCs track Honor/Glory/Status with decimal precision
 * - Sections: PC sheets are complex enough to need collapsible sections
 * 
 * **Integration:**
 * Used by PC sheet via composition pattern. All methods receive handler context
 * with actor, element, and sheet class name.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 */

import { SYS_ID } from "../../config/constants.js";
import { applyRankPointsDelta } from "../../utils/advancement.js";

/**
 * PC Adjustment Handler Class
 * Manages PC-specific adjustment controls and UI interactions.
 */
export class PcAdjustmentHandler {
  /**
   * Adjust the Void Ring rank via click.
   * Shift+Left click adds 1. Shift+Right click subtracts 1.
   * Min 0. Max 9.
   * Requires Shift+Click to prevent accidental changes.
   * 
   * **Void Ring vs Void Points:**
   * - Void Ring RANK: Maximum void points, increases with XP (this method)
   * - Void Points VALUE: Current spent/available points (VoidPointsHandler)
   * 
   * **Active Effects:**
   * Uses _source to get base value before Active Effects are applied.
   * This ensures family bonuses or other effects don't interfere with the
   * stored base rank value.
   *
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {HTMLElement} context.element - The sheet root element
   * @param {MouseEvent} event - originating event
   * @param {HTMLElement} element - clicked .ring-rank-void element
   * @param {number} delta - +1 or -1
   * @returns {Promise<void>}
   * 
   * @example
   * // In pc-sheet.js _onAction():
   * case "ring-rank-void": 
   *   return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, +1);
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_source|Document._source}
   */
  static async adjustVoidRing(context, event, element, delta) {
    event?.preventDefault?.();

    // Require Shift+Click to prevent accidental void rank changes
    if (!event?.shiftKey) return;

    // Use _source to get base value before Active Effects are applied
    const cur = Number(context.actor._source?.system?.rings?.void?.rank
                ?? context.actor.system?.rings?.void?.rank ?? 0) || 0;
    const min = 0;
    const max = 9;

    const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;

    try {
      await context.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: failed to update void ring rank`, { err });
    }
  }

  /**
   * Adjust a spell slot value by +1/-1 within [0..9].
   * 
   * **L5R4 Spell Slots:**
   * Shugenja can prepare spells into spell slots. The number of slots per ring
   * is determined by the character's school and rank. This method adjusts the
   * current slot values stored in system.spellSlots.{element}.
   * 
   * **Security:**
   * - Path validation: Only allows system.spellSlots.* paths
   * - Element validation: Only water, air, fire, earth, void
   * - Range clamping: Values constrained to [0..9]
   *
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {MouseEvent} event - The triggering event
   * @param {HTMLElement} element - The clicked button with data-path
   * @param {number} delta - +1 or -1
   * @returns {Promise<void>}
   * 
   * @example
   * // Template markup:
   * <button data-action="spell-slot" data-path="system.spellSlots.fire">+</button>
   * 
   * // In pc-sheet.js _onAction():
   * case "spell-slot": 
   *   return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, +1);
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
   * @see {@link https://foundryvtt.com/api/functions/utilities.html#getProperty|foundry.utils.getProperty}
   */
  static async adjustSpellSlot(context, event, element, delta) {
    try {
      const path = element?.dataset?.path || "";
      
      // Defensive guard: only allow system.spellSlots.* for valid elements
      if (!/^system\.spellSlots\.(water|air|fire|earth|void)$/.test(path)) {
        console.warn(`${SYS_ID} PcAdjustmentHandler: Invalid spell slot path`, { path });
        return;
      }

      // Read current value safely, default 0
      const current = Number(foundry.utils.getProperty(context.actor, path) ?? 0) || 0;

      // Clamp to 0..9
      const next = Math.min(9, Math.max(0, current + (delta || 0)));
      if (next === current) return;

      await context.actor.update({ [path]: next });

      // Optional immediate visual feedback (sheet will re-render anyway)
      element.textContent = String(next);
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: Spell slot adjust failed`, { err, element, delta });
    }
  }

  /**
   * Adjust Honor/Glory/Status/Shadow rank.points by ±0.1 (or ±1.0 with Ctrl).
   * 
   * **L5R4 Rank System:**
   * Honor, Glory, Status, and Shadow use a decimal system where:
   * - Rank: The whole number (1, 2, 3, etc.)
   * - Points: Decimal progress toward next rank (0.0 to 0.9)
   * - Full representation: "2.7" means Rank 2, 0.7 points
   * 
   * **Interaction:**
   * - Shift+Left-click: +0.1 (or +1.0 with Ctrl held)
   * - Shift+Right-click: -0.1 (or -1.0 with Ctrl held)
   * - Rolls over at 1.0 → next rank with 0.0 points
   * - Rolls under at 0.0 → previous rank with 0.9 points
   * 
   * **Requires Shift+Click** to prevent accidental changes during normal interaction.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {MouseEvent|WheelEvent} event - The triggering event
   * @param {HTMLElement} element - the clicked chip element with data-key
   * @param {number} baseDelta - default delta in decimal units (0.1 or -0.1)
   * @returns {Promise<void>}
   * 
   * @example
   * // Template markup:
   * <div data-action="rp-step" data-key="honor">Honor: 3.5</div>
   * 
   * // In pc-sheet.js _onAction():
   * case "rp-step": 
   *   return PcAdjustmentHandler.adjustRankPoints(this._getHandlerContext(), event, element, +0.1);
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.documents.BaseActor.html#update|Actor.update}
   * @see {@link ../../utils.js#applyRankPointsDelta|applyRankPointsDelta}
   */
  static async adjustRankPoints(context, event, element, baseDelta) {
    try {
      // Require Shift+Click to prevent accidental rank/points changes
      if (!event?.shiftKey) return;
      
      const key = String(element?.dataset?.key || "");
      if (!key) return;

      const sys = context.actor.system ?? {};
      const cur = {
        rank: Number(sys?.[key]?.rank ?? 0) || 0,
        points: Number(sys?.[key]?.points ?? 0) || 0
      };

      // Ctrl/Cmd increases step size to whole ranks (±1.0)
      const step = event?.ctrlKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;
      
      // Apply delta with rollover logic (provided by utils)
      const next = applyRankPointsDelta(cur, step, 0, 10);

      const update = {};
      update[`system.${key}.rank`] = next.rank;
      update[`system.${key}.points`] = next.points;

      await context.actor.update(update);
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: failed to update rank/points`, { err, event, element });
    }
  }

  /**
   * Toggle section collapse/expand by toggling is-collapsed class on section-title.
   * 
   * **PC Sheet Organization:**
   * The PC sheet has many sections (Skills, Spells, Techniques, Equipment, etc.).
   * Users can collapse sections they're not currently using to reduce visual clutter.
   * State is purely visual (CSS class) and doesn't persist across renders.
   * 
   * **Visual Feedback:**
   * - Toggles `.is-collapsed` class on the section-title element
   * - Rotates chevron icon from down (▼) to up (▲)
   * - CSS handles actual show/hide of content
   * 
   * @param {object} context - Handler context (unused for this method)
   * @param {MouseEvent} event - The originating click event
   * @param {HTMLElement} element - The clicked expand button
   * @returns {void}
   * 
   * @example
   * // Template markup:
   * <div class="section-title">
   *   <button data-action="section-expand">
   *     <i class="fas fa-chevron-down"></i>
   *   </button>
   *   <h3>Skills</h3>
   * </div>
   * <div class="section-content">...</div>
   * 
   * // In pc-sheet.js _onAction():
   * case "section-expand": 
   *   return PcAdjustmentHandler.toggleSection(this._getHandlerContext(), event, element);
   */
  static toggleSection(context, event, element) {
    event?.preventDefault?.();
    
    const sectionTitle = element.closest(".section-title");
    if (!sectionTitle) return;
    
    sectionTitle.classList.toggle("is-collapsed");
    
    // Toggle the chevron icon direction for visual feedback
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }
}
