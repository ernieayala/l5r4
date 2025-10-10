/**
 * @fileoverview L5R4 Weapon Roll Dialog - Weapon Damage Options UI
 * 
 * Provides interactive dialog for weapon damage roll customization using
 * Foundry's DialogV2 API. Handles roll, keep, and total modifiers for
 * weapon damage rolls.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display weapon damage roll options dialog and return user selections.
 * Shows fields for roll, keep, and total modifiers.
 * 
 * @param {string} weaponName - Weapon name for dialog title
 * @param {number} [attackRaises=0] - Raises from attack roll (displayed as automatic bonus)
 * @returns {Promise<object|{cancelled: true}>} Form data or cancellation object
 * 
 * @example
 * const opts = await GetWeaponOptions("Katana", 2);
 * if (opts.cancelled) return;
 * // opts: { rollMod, keepMod, totalMod }
 */
export async function GetWeaponOptions(weaponName, attackRaises = 0) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { weapon: true, attackRaises });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.ui.chat.damageRoll", { weapon: weaponName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processWeaponRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

/**
 * Process weapon roll dialog form into normalized options object.
 * 
 * @param {HTMLFormElement} form - Dialog form element
 * @returns {object} Parsed form values
 * @internal Exported for testing
 */
export function _processWeaponRollOptions(form) {
  return { rollMod: form.rollMod.value, keepMod: form.keepMod.value, totalMod: form.totalMod.value };
}
