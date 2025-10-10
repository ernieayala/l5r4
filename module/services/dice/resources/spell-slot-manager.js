/**
 * @fileoverview L5R4 Spell Slot Manager - Centralized Spell Slot Logic
 * 
 * Provides centralized spell slot validation and spending for shugenja casting.
 * Handles both elemental spell slots (water, air, fire, earth) and void spell
 * slots with comprehensive validation and error messaging.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { T } from "../../../utils/localization.js";
import { resolveActor } from "./void-manager.js";

/**
 * Valid ring keys for spell slot spending.
 * @const {string[]}
 */
const VALID_RINGS = ["water", "air", "fire", "earth", "void"];

/**
 * Validate spell slot availability for given ring.
 * 
 * @param {Actor} actor - Actor to check
 * @param {string} ringKey - Ring key to check ("water"|"air"|"fire"|"earth"|"void")
 * @param {boolean} isVoidSlot - Whether checking void spell slot vs elemental
 * @returns {{valid: boolean, current: number, message: string|null, path: string}} Validation result
 */
export function validateSpellSlot(actor, ringKey, isVoidSlot = false) {
  if (!actor) {
    return {
      valid: false,
      current: 0,
      message: T("l5r4.ui.notifications.noActorForVoid"),
      path: null
    };
  }

  // Normalize and validate ring key
  const normalizedRing = String(ringKey).toLowerCase();
  if (!VALID_RINGS.includes(normalizedRing)) {
    return {
      valid: false,
      current: 0,
      message: game.i18n.format("l5r4.ui.notifications.invalidRingForSpell", { ring: ringKey }),
      path: null
    };
  }

  const path = isVoidSlot ? "system.spellSlots.void" : `system.spellSlots.${normalizedRing}`;
  const current = Number(foundry.utils.getProperty(actor, path) ?? 0) || 0;

  if (current <= 0) {
    const ringLabel = isVoidSlot
      ? `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${game.i18n.localize("l5r4.magic.spells.voidSlot")}`
      : game.i18n.localize(`l5r4.ui.mechanics.rings.${normalizedRing}`) || normalizedRing;
    
    return {
      valid: false,
      current: 0,
      message: `${ringLabel}: 0`,
      path
    };
  }

  return {
    valid: true,
    current,
    message: null,
    path
  };
}

/**
 * Spend an elemental spell slot for the given ring.
 * 
 * @param {Actor|null} actor - Actor to spend spell slot for
 * @param {string} ringKey - Ring key for elemental slot ("water"|"air"|"fire"|"earth")
 * @returns {Promise<{success: boolean, label: string, message: string|null}>} Spend result
 * 
 * @example
 * const result = await spendElementalSlot(actor, "fire");
 * if (result.success) {
 *   label += result.label; // " [Fire Slot]"
 * } else {
 *   ui.notifications.warn(result.message);
 *   return false;
 * }
 */
export async function spendElementalSlot(actor, ringKey) {
  const resolvedActor = resolveActor(actor);
  const validation = validateSpellSlot(resolvedActor, ringKey, false);

  if (!validation.valid) {
    return {
      success: false,
      label: "",
      message: validation.message
    };
  }

  await resolvedActor.update({ [validation.path]: validation.current - 1 }, { diff: true });

  const ringDisplay = game.i18n.localize(`l5r4.ui.mechanics.rings.${String(ringKey).toLowerCase()}`) || ringKey;
  return {
    success: true,
    label: ` [${ringDisplay} Slot]`,
    message: null
  };
}

/**
 * Spend a void spell slot.
 * 
 * @param {Actor|null} actor - Actor to spend void spell slot for
 * @returns {Promise<{success: boolean, label: string, message: string|null}>} Spend result
 * 
 * @example
 * const result = await spendVoidSlot(actor);
 * if (result.success) {
 *   label += result.label; // " [Void Slot]"
 * } else {
 *   ui.notifications.warn(result.message);
 *   return false;
 * }
 */
export async function spendVoidSlot(actor) {
  const resolvedActor = resolveActor(actor);
  const validation = validateSpellSlot(resolvedActor, "void", true);

  if (!validation.valid) {
    return {
      success: false,
      label: "",
      message: validation.message
    };
  }

  await resolvedActor.update({ [validation.path]: validation.current - 1 }, { diff: true });

  const voidLabel = game.i18n.localize("l5r4.ui.mechanics.rings.void");
  const slotLabel = game.i18n.localize("l5r4.magic.spells.voidSlot") || "Slot";
  return {
    success: true,
    label: ` [${voidLabel} ${slotLabel}]`,
    message: null
  };
}
