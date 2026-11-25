/**
 * @module sheets/handlers/pc-adjustment-handler
 * @description PC sheet adjustments: spell slots per element (0-9), and the rank and points tracks (Honor, Glory,
 * Status, and the like). Shift+Click is required for the rank tracks so a stray click changes nothing;
 * Ctrl+Shift+Click moves a track by one point instead of one rank; spell slots change on a plain click.
 */

import { SYS_ID } from "../../config/constants.js";
import { RANK_TRACK_RANGE } from "../../config/game-mechanics.js";
import { applyRankPointsDelta } from "../../utils/advancement.js";
import { F, T } from "../../utils/localization.js";
import { getClamped } from "../../utils/type-coercion.js";
import { warnAtLimit } from "./trait-handler.js";

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
  // eslint-disable-next-line max-params -- the sheet handler shape (context, event, element, delta) the sheet's _onAction switch passes (functions.md)
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
        const ring = T(`l5r4.ui.mechanics.rings.${path.split(".").pop()}`);
        warnAtLimit(F("l5r4.ui.sheets.spellSlotsName", { ring }), delta);
        return;
      }

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
  // eslint-disable-next-line max-params -- the sheet handler shape (context, event, element, delta) the sheet's _onAction switch passes (functions.md)
  static async updateRankPoints(context, event, element, baseDelta) {
    try {
      const key = String(element?.dataset?.key || "");
      if (!key) {
        return;
      }

      // Safety: require Shift key to prevent accidental adjustment; a plain click says how (#142)
      if (!event?.shiftKey) {
        ui.notifications?.info(
          F("l5r4.ui.notifications.shiftToChange", { name: element.dataset.label })
        );
        return;
      }

      // Ctrl key switches between point adjustment (±1) and rank adjustment (±10)
      const step = event?.ctrlKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;
      const next = this.#getNextRankPoints(context.actor, key, step);
      if (!next) {
        warnAtLimit(element.dataset.label, step);
        return;
      }
      await context.actor.update({
        [`system.${key}.rank`]: next.rank,
        [`system.${key}.points`]: next.points
      });
    } catch (err) {
      console.warn(`${SYS_ID} PcAdjustmentHandler: failed to update rank/points`, {
        err,
        event,
        element
      });
    }
  }

  /**
   * A track's rank and points after a step, within the track's range (Status reaches -10); null when the track is
   * already at the bound the step heads for. Reads the stored values, not the prepared ones, so an Active Effect on
   * them is never written into storage (B6).
   * game-rules/45_status.md, p.94-95
   * @param {Actor} actor
   * @param {string} key - The track's system field: honor, glory, status, or shadowTaint
   * @param {number} step - Points as a fraction of a rank: ±0.1 a point, ±1 a rank
   * @returns {{rank: number, points: number}|null}
   */
  static #getNextRankPoints(actor, key, step) {
    const stored = actor._source.system[key];
    const cur = { rank: Number(stored?.rank ?? 0) || 0, points: Number(stored?.points ?? 0) || 0 };
    const [minRank, maxRank] = RANK_TRACK_RANGE[key] ?? [0, 10];
    const next = applyRankPointsDelta(cur, step, { minRank, maxRank });
    return next.rank === cur.rank && next.points === cur.points ? null : next;
  }
}
