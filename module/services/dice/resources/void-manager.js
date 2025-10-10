/**
 * @fileoverview L5R4 Void Point Manager - Centralized Void Point Logic
 * 
 * Provides centralized void point validation, spending, and actor resolution.
 * Consolidates duplicated void point logic from multiple roll functions into
 * a single source of truth. Handles actor resolution from multiple sources
 * (controlled token, user character, chat speaker).
 * 
 * **DESIGN DECISION**: Void points are deducted BEFORE rolling per L5R4 tabletop
 * rules. Players must declare void point usage before knowing the roll outcome,
 * matching the tabletop experience. No rollback is implemented to maintain rules
 * accuracy and UX responsiveness.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { T } from "../../../utils/localization.js";

/**
 * Resolve actor for void point spending from multiple sources.
 * Tries controlled token, user character, and chat speaker in order.
 * 
 * @param {Actor|null} providedActor - Explicitly provided actor (takes precedence)
 * @returns {Actor|null} Resolved actor or null if none found
 * 
 * @example
 * const actor = resolveActor(null); // Tries controlled token → user character → speaker
 */
export function resolveActor(providedActor) {
  return providedActor
    ?? canvas?.tokens?.controlled?.[0]?.actor
    ?? game.user?.character
    ?? (ChatMessage.getSpeaker()?.actor ? game.actors?.get(ChatMessage.getSpeaker().actor) : null);
}

/**
 * Validate that actor has available void points.
 * 
 * @param {Actor} actor - Actor to check
 * @returns {{valid: boolean, current: number, message: string|null}} Validation result
 * 
 * @example
 * const check = validateVoidPoints(actor);
 * if (!check.valid) {
 *   ui.notifications.warn(check.message);
 *   return false;
 * }
 */
export function validateVoidPoints(actor) {
  if (!actor) {
    return {
      valid: false,
      current: 0,
      message: T("l5r4.ui.notifications.noActorForVoid")
    };
  }

  const curVoid = Number(actor.system?.rings?.void?.value ?? 0) || 0;
  if (curVoid <= 0) {
    const labelVP = game.i18n?.localize?.("l5r4.ui.mechanics.rings.voidPoints") || "Void Points";
    return {
      valid: false,
      current: 0,
      message: `${labelVP}: 0`
    };
  }

  return {
    valid: true,
    current: curVoid,
    message: null
  };
}

/**
 * Spend a void point for the given actor with validation.
 * Deducts 1 void point and returns success status with updated bonuses.
 * 
 * **CRITICAL:** Void point is deducted BEFORE roll per L5R4 rules.
 * This prevents "ghost void points" in UI and matches tabletop experience.
 * 
 * @param {Actor|null} actor - Actor to spend void point for
 * @returns {Promise<{success: boolean, rollBonus: number, keepBonus: number, message: string|null}>} Spend result
 * 
 * @example
 * const result = await spendVoidPoint(actor);
 * if (result.success) {
 *   rollMod += result.rollBonus; // +1
 *   keepMod += result.keepBonus; // +1
 *   label += " (Void)";
 * } else {
 *   ui.notifications.warn(result.message);
 *   return;
 * }
 */
export async function spendVoidPoint(actor) {
  const resolvedActor = resolveActor(actor);
  const validation = validateVoidPoints(resolvedActor);

  if (!validation.valid) {
    return {
      success: false,
      rollBonus: 0,
      keepBonus: 0,
      message: validation.message
    };
  }

  /**
   * DESIGN DECISION: Void points are deducted BEFORE rolling per L5R4 tabletop rules.
   * Players must declare void point usage before knowing the roll outcome, matching
   * the tabletop experience. This provides immediate visual feedback and prevents
   * "ghost void points" in the UI. Modal dialogs prevent multiple simultaneous
   * invocations in normal gameplay.
   * 
   * No rollback is implemented to maintain rules accuracy and UX responsiveness.
   */
  await resolvedActor.update({ "system.rings.void.value": validation.current - 1 }, { diff: true });

  return {
    success: true,
    rollBonus: 1,
    keepBonus: 1,
    message: null
  };
}
