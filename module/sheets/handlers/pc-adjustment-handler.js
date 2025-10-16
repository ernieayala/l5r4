/**
 * PC Character Sheet Adjustment Handler
 *
 * Handles user-driven adjustments to PC character attributes via sheet UI interactions.
 * Implements Application v2 event delegation pattern for Foundry VTT v13+.
 *
 * **Responsibilities:**
 * - Void Ring rank adjustments (0-9 per core rules)
 * - Spell slot adjustments per element (0-9, equal to Ring rank)
 * - Rank/points advancement system (skills, traits, honor, glory, status)
 * - Section collapse/expand UI toggles
 *
 * **User Interaction Patterns:**
 * - **Shift+Click**: Required for Void Ring and rank/points adjustments (safety mechanism)
 * - **Ctrl+Shift+Click**: Single point adjustment for rank/points (±1 point vs ±1 rank)
 * - **Click**: Direct adjustment for spell slots and UI toggles
 *
 * **Game Rules Integration:**
 * - Void Ring produces Void Points equal to rank (Rings_and_Traits.md)
 * - Spell slots per element equal Ring rank (Spells.md, line 11)
 * - Rank/points system per advancement rules (Character_Creation_and_Advancement.md)
 *
 * **Foundry API:**
 * - Actor.update() with diff option for efficient updates
 * - foundry.utils.getProperty() for safe nested property access
 * - Application v2 event delegation via dataset attributes
 *
 * @module sheets/handlers/pc-adjustment-handler
 */

import { SYS_ID } from "../../config/constants.js";
import { applyRankPointsDelta } from "../../utils/advancement.js";
import { clamp } from "../../utils/type-coercion.js";

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
   * Per core rules (Rings_and_Traits.md), Void Ring is unique:
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
   * @param {Object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (must have shiftKey = true)
   * @param {HTMLElement} element - Target element from event delegation
   * @param {number} delta - Direction of adjustment (+1 or -1)
   * @returns {Promise<void>}
   */
  static async adjustVoidRing(context, event, element, delta) {
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
    const next = clamp(cur + (delta > 0 ? 1 : -1), min, max);
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
   * Per Spells.md (line 11):
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
   * @param {Object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (not required for this adjustment)
   * @param {HTMLElement} element - Target element with dataset.path attribute
   * @param {number} delta - Amount to adjust (+1 or -1 typically)
   * @returns {Promise<void>}
   */
  static async adjustSpellSlot(context, event, element, delta) {
    try {
      const path = element?.dataset?.path || "";

      // Validate path format to prevent invalid property updates
      if (!/^system\.spellSlots\.(water|air|fire|earth|void)$/.test(path)) {
        console.warn(`${SYS_ID} PcAdjustmentHandler: Invalid spell slot path`, { path });
        return;
      }

      // Safe property access via Foundry utility
      const current = Number(foundry.utils.getProperty(context.actor, path) ?? 0) || 0;

      // Apply delta with bounds [0, 9] matching Ring rank maximum
      const next = clamp(current + (delta || 0), 0, 9);
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
   * Per Character_Creation_and_Advancement.md:
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
   * @param {Object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (requires shiftKey; ctrlKey changes step size)
   * @param {HTMLElement} element - Target element with dataset.key attribute
   * @param {number} baseDelta - Base adjustment amount (typically ±1.0 or ±0.1)
   * @returns {Promise<void>}
   */
  static async adjustRankPoints(context, event, element, baseDelta) {
    try {
      // Safety: require Shift key to prevent accidental adjustment
      if (!event?.shiftKey) {
        return;
      }

      const key = String(element?.dataset?.key || "");
      if (!key) {
        return;
      }

      // Read current rank/points from actor system data
      const sys = context.actor.system ?? {};
      const cur = {
        rank: Number(sys?.[key]?.rank ?? 0) || 0,
        points: Number(sys?.[key]?.points ?? 0) || 0
      };

      // Ctrl key switches between point adjustment (±1) and rank adjustment (±10)
      const step = event?.ctrlKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;

      // Apply delta with automatic overflow/underflow handling [0, 10]
      const next = applyRankPointsDelta(cur, step, 0, 10);

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

  /**
   * Toggles collapse/expand state of a sheet section with persistence.
   *
   * **UI Pattern:**
   * Toggles section visibility and persists state to user flags so collapsed
   * sections remain collapsed across sheet re-renders and browser sessions.
   *
   * **Implementation:**
   * - Finds parent .section-title element
   * - Toggles "is-collapsed" class for immediate CSS-driven visibility
   * - Swaps chevron icon direction (fa-chevron-down ↔ fa-chevron-up)
   * - Persists state to user flags via setSectionCollapsed()
   *
   * **Persistence:**
   * State is stored per-user, per-actor, per-section in user flags. This allows
   * each user to have their own preferred collapsed/expanded sections for each actor.
   *
   * **No Game Rules:** This is purely a UI convenience feature.
   *
   * @param {Object} context - Sheet render context with actor reference
   * @param {Event} event - DOM click event
   * @param {HTMLElement} element - Clicked element (searches up for .section-title)
   * @returns {Promise<void>}
   * @async
   */
  static async toggleSection(context, event, element) {
    event?.preventDefault?.();

    const { setSectionCollapsed } = await import("../../utils/section-state.js");

    // Find parent section title container
    const sectionTitle = element.closest(".section-title");
    if (!sectionTitle) {
      return;
    }

    // Get section scope from data attribute (e.g., "skills", "weapons", "spells")
    const scope =
      sectionTitle.dataset.scope || sectionTitle.closest("[data-scope]")?.dataset?.scope;

    // Toggle collapsed state (CSS-driven visibility)
    const isNowCollapsed = sectionTitle.classList.toggle("is-collapsed");

    // Swap chevron icon direction for visual feedback
    // querySelector used here to find icon element within the clicked button (scoped query)
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }

    // Persist state to user flags if we have a valid scope
    if (scope && context.actor) {
      await setSectionCollapsed(context.actor.id, scope, isNowCollapsed);
    }
  }
}
