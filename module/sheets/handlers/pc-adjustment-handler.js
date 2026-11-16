/**
 * @module sheets/handlers/pc-adjustment-handler
 * @description PC sheet adjustments: the Void Ring rank (0-9), spell slots per element (0-9), and the rank and
 * points tracks (Honor, Glory, Status, and the like). Shift+Click is required for the Void Ring and the rank tracks
 * so a stray click changes nothing; Ctrl+Shift+Click moves a track by one point instead of one rank; spell slots
 * change on a plain click.
 */

import { SYS_ID } from "../../config/constants.js";
import { RANK_TRACK_RANGE } from "../../config/game-mechanics.js";
import { applyRankPointsDelta } from "../../utils/advancement.js";
import { getClamped } from "../../utils/type-coercion.js";

/**
 * Handler class for PC character sheet adjustments.
 *
 * All methods follow Application v2 event delegation pattern:
 * - Receive (context, event, element) parameters from sheet event dispatcher
 * - Extract data from element.dataset attributes
 * - Perform defensive validation and bounds checking
 * - Update actor document via async Actor.update()
 * - Log warnings on failure (non-blocking)
 */
export class PcAdjustmentHandler {
  /**
   * Adjusts the Void Ring rank for a PC character.
   *
   * **Game Rules Context:**
   * Per core rules, Void Ring is unique:
   * - No associated Traits (unlike other Rings)
   * - Produces Void Points equal to rank (used to enhance rolls +1k1)
   * - Valid range: 0-9 (matches all Ring/Trait maximum)
   * - Cannot exceed 10 per L5R4 rules
   *
   * **User Interaction:**
   * Requires Shift+Click to prevent accidental adjustments (safety mechanism).
   * Delta parameter determines direction: positive = increase, negative = decrease.
   *
   * **Implementation Notes:**
   * Reads from _source first (pending changes) before falling back to system data.
   * Uses diff:true option for efficient Foundry update.
   *
   * @param {object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (must have shiftKey = true)
   * @param {HTMLElement} element - Target element from event delegation
   * @param {number} delta - Direction of adjustment (+1 or -1)
   * @returns {Promise<void>}
   */
  static async updateVoidRing(context, event, element, delta) {
    event?.preventDefault?.();

    // Safety: require Shift key to prevent accidental adjustment
    if (!event?.shiftKey) {
      return;
    }

    // Read current value from _source (pending changes) or system data
    const cur =
      Number(
        context.actor._source?.system?.rings?.void?.rank ??
          context.actor.system?.rings?.void?.rank ??
          0
      ) || 0;
    const min = 0;
    const max = 9; // L5R4 maximum for all Rings/Traits

    // Calculate next value: delta sign determines direction
    const next = getClamped(cur + (delta > 0 ? 1 : -1), min, max);
    if (next === cur) {
      return;
    } // No-op if already at boundary

    try {
      await context.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: failed to update void ring rank`, { err });
    }
  }

  /**
   * Adjusts spell slots for a specific element (Air, Earth, Fire, Water, Void).
   *
   * **Game Rules Context:**
   * - Shugenja have spell slots equal to their Ring rank in each element
   * - Bonus spell slots equal to Void Ring (can cast any element)
   * - Valid range: 0-9 (matches Ring rank maximum)
   * - Failed spells consume slots; interrupted spells do not
   *
   * **Data Model:**
   * Expects element.dataset.path in format: "system.spellSlots.{element}"
   * Valid elements: water, air, fire, earth, void
   *
   * **Implementation Notes:**
   * Uses foundry.utils.getProperty for safe nested property access.
   * Path validation via regex to prevent invalid property updates.
   * No shift key required (direct adjustment pattern).
   *
   * @param {object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (not required for this adjustment)
   * @param {HTMLElement} element - Target element with dataset.path attribute
   * @param {number} delta - Amount to adjust (e.g. +1 or -1)
   * @returns {Promise<void>}
   */
  static async updateSpellSlot(context, event, element, delta) {
    try {
      const path = element?.dataset?.path || "";

      // Validate path format to prevent invalid property updates
      if (!/^system\.spellSlots\.(water|air|fire|earth|void)$/.test(path)) {
        console.warn(`${SYS_ID} PcAdjustmentHandler: Invalid spell slot path`, { path });
        return;
      }

      // The stored value, not the prepared one, so an Active Effect on spell slots is never written into
      // storage (B6)
      const current = foundry.utils.getProperty(context.actor._source, path);

      // Apply delta with bounds [0, 9] matching Ring rank maximum
      const next = getClamped(current + (delta || 0), 0, 9);
      if (next === current) {
        return;
      } // No-op if already at boundary

      await context.actor.update({ [path]: next });
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: Spell slot adjust failed`, {
        err,
        element,
        delta
      });
    }
  }

  /**
   * Adjusts rank/points values for character advancement attributes.
   *
   * **Game Rules Context:**
   * - Rank/points system tracks progression (rank 0-10, points 0-9)
   * - 10 points = 1 rank increase
   * - Used for: skills, traits, honor, glory, status, insight, shadowTaint
   * - XP costs scale with rank (skills = next rank, traits = 4×next rank, Void = 6×next rank)
   *
   * **Modifier Keys:**
   * - **Shift+Click**: Required to activate adjustment (safety)
   * - **Ctrl+Shift+Click**: Single point adjustment (±1 point)
   * - **Shift+Click alone**: Full rank adjustment (±1.0 = ±10 points)
   *
   * **Data Model:**
   * Expects element.dataset.key with property name (e.g., "honor", "glory").
   * Reads/writes system[key].rank and system[key].points.
   *
   * **Implementation Notes:**
   * Uses applyRankPointsDelta utility for overflow/underflow handling.
   * Supports fractional deltas: baseDelta=1.0 → ±10 points, baseDelta=0.1 → ±1 point.
   *
   * @param {object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (requires shiftKey; ctrlKey changes step size)
   * @param {HTMLElement} element - Target element with dataset.key attribute
   * @param {number} baseDelta - Base adjustment amount (e.g. ±1.0 or ±0.1)
   * @returns {Promise<void>}
   */
  static async updateRankPoints(context, event, element, baseDelta) {
    try {
      // Safety: require Shift key to prevent accidental adjustment
      if (!event?.shiftKey) {
        return;
      }

      const key = String(element?.dataset?.key || "");
      if (!key) {
        return;
      }

      // Read the stored rank/points, not the prepared ones, so an Active Effect on them is never written into
      // storage (B6)
      const sys = context.actor._source.system;
      const cur = {
        rank: Number(sys?.[key]?.rank ?? 0) || 0,
        points: Number(sys?.[key]?.points ?? 0) || 0
      };

      // Ctrl key switches between point adjustment (±1) and rank adjustment (±10)
      const step = event?.ctrlKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;

      // Apply delta with overflow/underflow handling, within the track's range (Status reaches -10)
      // game-rules/45_status.md, p.94-95
      const next = applyRankPointsDelta(cur, step, ...(RANK_TRACK_RANGE[key] ?? [0, 10]));

      const update = {};
      update[`system.${key}.rank`] = next.rank;
      update[`system.${key}.points`] = next.points;

      await context.actor.update(update);
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: failed to update rank/points`, {
        err,
        event,
        element
      });
    }
  }
}
