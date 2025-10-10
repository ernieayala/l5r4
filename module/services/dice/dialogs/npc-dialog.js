/**
 * @fileoverview L5R4 NPC Roll Dialog - NPC Roll Options UI
 * 
 * Provides interactive dialog for NPC roll customization using Foundry's
 * DialogV2 API. Handles unskilled rolls (for trait rolls), void point
 * spending (if allowed), modifiers, target numbers, and raises.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display NPC roll options dialog and return user selections.
 * Shows fields for modifiers, void point spending (if allowed), unskilled
 * option (for trait rolls), target number, and raises.
 * 
 * @param {string} rollName - Roll name for dialog title
 * @param {boolean} noVoid - Whether to hide void point option (system setting)
 * @param {boolean} [trait=false] - Whether this is a trait roll (shows unskilled option)
 * @returns {Promise<object|{cancelled: true}>} Form data or cancellation object
 * 
 * @example
 * const opts = await getNpcRollOptions("Attack", false, false);
 * if (opts.cancelled) return;
 * // opts: { rollMod, keepMod, totalMod, void, unskilled, tn, raises }
 */
export async function getNpcRollOptions(rollName, noVoid, trait = false) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { npcRoll: true, noVoid, trait });
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.ui.chat.rollName", { roll: rollName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processNpcRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

/**
 * Process NPC roll dialog form into normalized options object.
 * 
 * @param {HTMLFormElement} form - Dialog form element
 * @returns {object} Parsed form values
 * @private
 */
function _processNpcRollOptions(form) {
  return {
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    unskilled: form.unskilled?.checked ?? false,
    tn: form.tn?.value ?? 0,
    raises: form.raises?.value ?? 0
  };
}
