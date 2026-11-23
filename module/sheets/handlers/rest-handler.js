/**
 * @module sheets/handlers/rest-handler
 * @description The rest action on both actor sheets: a night's natural healing, (Stamina × 2) + Insight Rank
 * Wounds, applied through the rest service.
 */
import { applyLongRest } from "../../services/rest.js";

/**
 * Handler class for the rest action both actor sheets share.
 */
export class RestHandler {
  /**
   * Applies natural healing to the character.
   *
   * **Game Rules Context:**
   * Characters heal (Stamina × 2) + Insight Rank wounds per night of rest.
   * Healing cannot reduce suffered wounds below 0 (no over-healing).
   *
   * **Implementation:**
   * Delegates to healing service which:
   * - Calculates healing amount from actor.system.wounds.healRate
   * - Reduces suffered wounds by healing amount
   * - Posts chat message with healing summary
   * - Handles edge cases (already at full health, invalid heal rate)
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event on healing button
   * @param {HTMLElement} _element - Button element (unused)
   * @returns {Promise<void>}
   */
  static async applyHealing(context, event, _element) {
    event?.preventDefault?.();
    return applyLongRest(context.actor);
  }
}
