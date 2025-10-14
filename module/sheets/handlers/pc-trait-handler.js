/**
 * PC Trait Adjustment Handler
 *
 * Handles trait adjustments for PC characters with family bonus integration.
 * Implements special logic for PC traits that differ from the base sheet's trait handling.
 *
 * **Responsibilities:**
 * - Adjust trait values via shift+click sheet interactions (safety mechanism)
 * - Calculate effective trait values (base + family bonus)
 * - Enforce trait bounds while preserving family bonuses
 * - Convert form submission data to account for family bonuses
 *
 * **Why Separate from BaseActorSheet:**
 * PCs have family bonuses that modify traits, requiring special calculation logic:
 * - Effective Trait = Base Trait + Family Bonus
 * - Minimum effective trait = Family Bonus (base cannot go negative)
 * - Sheet displays effective values, but stores base values in system data
 * - Form submissions contain effective values that must be converted to base values
 *
 * **Game Rules Context:**
 * Per character creation rules (Rings_and_Traits.md):
 * - All traits begin at rank 2
 * - Family selection grants +1 to one trait (making it 3 at start)
 * - Traits can increase to rank 10 ("out of a possible 10")
 * - Trait advancement costs 4 × new rank in XP
 *
 * **User Interaction:**
 * - Shift+Click required on trait +/- buttons (prevents accidental changes)
 * - Adjusts effective trait value by ±1
 * - Automatically calculates base trait value by subtracting family bonus
 * - Enforces minimum (family bonus) and maximum (9 effective) bounds
 *
 * **Implementation Notes:**
 * ⚠️ Current max effective trait is 9, but game rules state traits go to 10.
 * This differs from BaseActorSheet which allows up to 10. Consider if this is
 * intentional (UI safety) or a bug that needs correction.
 *
 * **Foundry API:**
 * - Actor.update() with diff option for efficient updates (Foundry v13+)
 * - Uses _source for pending changes before system property fallback
 * - Application v2 event delegation via dataset attributes
 *
 * @module sheets/handlers/pc-trait-handler
 */

import { SYS_ID } from "../../config/constants.js";
import { FamilyBonusService } from "../../services/family-bonus-service.js";
import { clamp } from "../../utils/type-coercion.js";

/**
 * Handler class for PC-specific trait adjustments.
 *
 * Manages trait value changes that must account for family bonuses,
 * ensuring the effective trait value (base + family) stays within valid bounds
 * while preserving the family bonus contribution.
 *
 * All methods follow Application v2 event delegation pattern:
 * - Receive (context, event, element, delta) parameters from sheet dispatcher
 * - Extract data from element.dataset attributes
 * - Perform defensive validation and bounds checking
 * - Update actor document via async Actor.update()
 * - Log warnings on failure (non-blocking)
 */
export class PcTraitHandler {
  /**
   * Valid L5R4 trait keys.
   *
   * Maps to the eight Traits organized into four Rings per core rules:
   * - **Earth Ring:** sta (Stamina), wil (Willpower)
   * - **Air Ring:** ref (Reflexes), awa (Awareness)
   * - **Fire Ring:** agi (Agility), int (Intelligence)
   * - **Water Ring:** str (Strength), per (Perception)
   *
   * Note: Void Ring has no Traits, only Void Points.
   *
   * @type {string[]}
   * @readonly
   */
  static TRAIT_KEYS = Object.freeze(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]);

  /**
   * Adjusts a PC's trait value, accounting for family bonuses.
   *
   * **Game Rules Context:**
   * Per character creation and advancement rules:
   * - Traits range from 2 (starting) to 10 (maximum)
   * - Family bonuses add +1 to one trait (cannot be removed)
   * - Effective Trait = Base Trait + Family Bonus (displayed to user)
   * - System stores only Base Trait; family bonus applied via Active Effects
   *
   * **Calculation Flow:**
   * 1. Read current base trait value from actor data
   * 2. Get family bonus for this trait from FamilyBonusService
   * 3. Calculate current effective trait (base + family)
   * 4. Apply delta to effective trait (+1 or -1)
   * 5. Clamp effective trait to valid range [family bonus, 9]
   * 6. Calculate new base trait (effective - family bonus)
   * 7. Update actor with new base trait value
   *
   * **Example:**
   * - Character has Hida family (+1 Strength)
   * - Current: base STR = 2, family bonus = 1, effective STR = 3
   * - User clicks + button (delta = +1)
   * - New: effective STR = 4, base STR = 3
   * - System stores base STR = 3, sheet displays effective STR = 4
   *
   * **User Interaction:**
   * Requires Shift+Click to prevent accidental adjustments (safety mechanism).
   * This matches the pattern used in PcAdjustmentHandler for other sheet adjustments.
   *
   * **Bounds Enforcement:**
   * - Minimum effective trait = family bonus (prevents base from going negative)
   * - Maximum effective trait = 9 (⚠️ game rules state 10, consider if intentional)
   * - Silently ignores adjustment if already at boundary
   *
   * **Implementation Notes:**
   * - Reads from _source first (pending changes) before system data fallback
   * - Uses diff:true for efficient Foundry update (only changed properties sent)
   * - Non-blocking error handling (logs warning, doesn't throw)
   *
   * @param {Object} context - Sheet render context with actor reference
   * @param {Event} event - DOM event (must have shiftKey = true to execute)
   * @param {HTMLElement} element - Target element with data-trait attribute
   * @param {number} delta - Direction of adjustment: positive = increase, negative = decrease
   * @returns {Promise<void>}
   */
  static async adjust(context, event, element, delta) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Safety mechanism: require Shift key to prevent accidental trait changes
    if (!event?.shiftKey) return;

    // Validate trait key from element dataset
    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!this.TRAIT_KEYS.includes(key)) {
      console.warn(`${SYS_ID} PcTraitHandler: Invalid trait key`, { key });
      return;
    }

    // Read current base trait value (pending changes in _source take precedence)
    const base =
      Number(
        context.actor._source?.system?.traits?.[key] ?? context.actor.system?.traits?.[key] ?? 0
      ) || 0;

    // Get family bonus for this trait (+1 for family's bonus trait, 0 otherwise)
    const fam = FamilyBonusService.getBonus(context.actor, key);

    // Calculate current effective trait (what user sees on sheet)
    const effNow = base + fam;

    // Define effective trait bounds
    // Min: Cannot go below family bonus (base trait can't be negative)
    // Max: 9 (⚠️ Note: game rules state traits go to 10, but this caps at 9)
    const effMin = Math.max(0, fam);
    const effMax = 9;

    // Calculate desired and clamped effective trait values
    const wantEff = effNow + (delta > 0 ? 1 : -1);
    const nextEff = clamp(wantEff, effMin, effMax);

    // No-op if already at boundary
    if (nextEff === effNow) return;

    // Convert effective trait back to base trait for storage
    const nextBase = nextEff - fam;

    try {
      // Update actor with new base trait value (diff:true = efficient update)
      await context.actor.update({ [`system.traits.${key}`]: nextBase }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} PcTraitHandler: failed to update trait`, {
        err,
        key,
        base,
        nextBase
      });
    }
  }

  /**
   * Converts form submission data from effective traits to base traits.
   *
   * **Purpose:**
   * Called by the sheet's form submission handler (ActorSheetV2 lifecycle) to
   * convert user-entered effective trait values into base trait values for storage.
   * This is necessary because:
   * - Sheet displays effective traits (base + family bonus)
   * - System stores only base traits
   * - Family bonuses applied via Active Effects system
   *
   * **Process:**
   * 1. Extract trait data from form submission
   * 2. For each trait, treat submitted value as effective trait
   * 3. Subtract family bonus to get base trait
   * 4. Ensure base trait is non-negative (floor at 0)
   * 5. Update submission data with base trait values
   *
   * **Example:**
   * - Character has Bayushi family (+1 Agility)
   * - User edits trait field to "5" (effective Agility)
   * - Form submission contains: { system: { traits: { agi: 5 } } }
   * - This method converts: agi: 5 → base: 5 - 1 = 4
   * - Actor update receives: { system: { traits: { agi: 4 } } }
   * - Sheet re-renders showing: 4 (base) + 1 (family) = 5 (effective)
   *
   * **Implementation Notes:**
   * - Defensive: returns original submitData if traits object missing/invalid
   * - Skips null/undefined values (partial form submissions)
   * - Non-blocking: processes all traits even if one fails
   * - Floor at 0: prevents negative base traits from family bonus subtraction
   *
   * **Integration:**
   * Called from ActorSheetV2's _prepareSubmitData() lifecycle hook.
   * Works in conjunction with prepareDerivedData() which applies family bonuses.
   *
   * @param {L5R4Actor} actor - The actor being updated (needed for family bonus lookup)
   * @param {Object} submitData - Form data from ActorSheetV2 submission
   * @param {Object} [submitData.system.traits] - Trait values from form (effective values)
   * @returns {Object} Modified submitData with base trait values for storage
   */
  static convertSubmitData(actor, submitData) {
    // Extract traits object from submission data
    const t = submitData?.system?.traits;
    if (!t || typeof t !== "object") return submitData;

    // Convert each effective trait to base trait
    for (const [k, v] of Object.entries(t)) {
      // Skip null/undefined (partial submissions or unchanged fields)
      if (v === undefined || v === null) continue;

      // Treat submitted value as effective trait
      const eff = Number(v) || 0;

      // Get family bonus for this trait
      const bonus = FamilyBonusService.getBonus(actor, k);

      // Calculate base trait (effective - family bonus)
      const base = eff - bonus;

      // Store base trait (floor at 0 to prevent negative values)
      t[k] = Math.max(0, base);
    }

    return submitData;
  }
}
