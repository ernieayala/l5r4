/**
 * @module sheets/handlers/trait-handler
 * @description Trait rank adjustments and Trait rolls on actor sheets. A Shift+Click on a Trait's rank moves it by
 * one, clamped to 0-10; a plain click rolls the Trait through RollHandler. The increase and decrease buttons adjust
 * without Shift. Traits rank 1-10, a human starts at 2, and a rank costs 4 × the new rank in XP.
 */

import { SYS_ID } from "../../config/constants.js";
import { clamp } from "../../utils/type-coercion.js";
import { RollHandler } from "./roll-handler.js";

/**
 * Trait rank adjustments and Trait rolls for actor sheets.
 */
export class TraitHandler {
  /**
   * Handles trait rank click - rolls trait or adjusts rank based on Shift key.
   *
   * **Without Shift Key:**
   * Performs a trait roll (XkX where X = trait rank) via RollHandler.traitRoll().
   * A click on the trait rank rolls the trait.
   *
   * **With Shift Key:**
   * Increments or decrements the specified trait rank, clamping to valid
   * range (0-10). Shift key acts as a safety mechanism against accidental adjustments.
   *
   * **Game Rules:**
   * Traits have ranks from 1-10. Normal humans start at rank 2.
   * Advancement cost = 4 × new rank XP (e.g., 2→3 costs 12 XP).
   *
   * **Safety Mechanism:**
   * Rank adjustment only executes if Shift key is held. Works in conjunction with
   * KeyboardBehaviorMixin which provides visual cursor feedback.
   *
   * @param {object} context - Handler context from sheet
   * @param {L5R4Actor} context.actor - The actor document
   * @param {HTMLElement} context.element - The sheet's root element
   * @param {string} context.sheetClassName - Class name for logging
   * @param {Event} event - DOM event (shiftKey determines roll vs adjust behavior)
   * @param {HTMLElement} element - Element with data-trait attribute
   * @param {number} delta - Direction to adjust (+1 to increase, -1 to decrease)
   * @returns {Promise<void>}
   */
  static async adjust(context, event, element, delta) {
    event?.preventDefault?.();

    const { actor, sheetClassName } = context;
    const key = String(element?.dataset?.trait || "").toLowerCase();

    if (!key) {
      return;
    }

    // If shift key NOT pressed, perform trait roll instead of adjustment
    if (!event?.shiftKey) {
      return RollHandler.traitRoll(context, event, element);
    }

    const cur = Number(actor.system?.traits?.[key] ?? 0) || 0;
    // Clamp to 0-10 per L5R4 rules (traits ranked 1-10, but 0 allowed for flexibility)
    const next = clamp(cur + (delta > 0 ? 1 : -1), 0, 10);

    if (next === cur) {
      return;
    }

    try {
      await actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} ${sheetClassName}: failed to update trait`, {
        err,
        key,
        cur,
        next
      });
    }
  }

  /**
   * Increases a trait value by 1 without requiring Shift key.
   *
   * Provides direct trait increment functionality for trait-increase buttons.
   * Unlike adjust(), this does NOT require Shift key to be pressed.
   *
   * **User Interaction:**
   * - Click trait-increase button (up chevron): Increases trait by 1
   * - No Shift key required (direct action)
   *
   * **Implementation:**
   * Creates a modified event with shiftKey=true to bypass the shift check in
   * adjust(), then delegates to adjust() with delta=+1.
   *
   * @param {object} context - Handler context from sheet
   * @param {Event} event - DOM event from button click
   * @param {HTMLElement} element - Element with data-trait attribute
   * @returns {Promise<void>}
   */
  static async increase(context, event, element) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Create modified event that appears to have shift key pressed
    const modifiedEvent = event ? { ...event, shiftKey: true } : { shiftKey: true };
    return this.adjust(context, modifiedEvent, element, +1);
  }

  /**
   * Decreases a trait value by 1 without requiring Shift key.
   *
   * Provides direct trait decrement functionality for trait-decrease buttons.
   * Unlike adjust(), this does NOT require Shift key to be pressed.
   *
   * **User Interaction:**
   * - Click trait-decrease button (down chevron): Decreases trait by 1
   * - No Shift key required (direct action)
   *
   * **Implementation:**
   * Creates a modified event with shiftKey=true to bypass the shift check in
   * adjust(), then delegates to adjust() with delta=-1.
   *
   * @param {object} context - Handler context from sheet
   * @param {Event} event - DOM event from button click
   * @param {HTMLElement} element - Element with data-trait attribute
   * @returns {Promise<void>}
   */
  static async decrease(context, event, element) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Create modified event that appears to have shift key pressed
    const modifiedEvent = event ? { ...event, shiftKey: true } : { shiftKey: true };
    return this.adjust(context, modifiedEvent, element, -1);
  }
}
