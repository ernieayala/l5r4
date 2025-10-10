/**
 * @fileoverview L5R4 Trait Roll Dialog - Trait Roll Options UI
 * 
 * Provides interactive dialog for trait roll customization using Foundry's
 * DialogV2 API. Handles unskilled rolls, void point spending, modifiers,
 * target numbers, and raises for trait rolls.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display trait roll options dialog and return user selections.
 * Shows fields for unskilled rolls, wound penalty, modifiers, void point
 * spending, target number, and raises.
 * 
 * @param {string} traitName - Trait name for dialog title
 * @returns {Promise<object|{cancelled: true}>} Form data or cancellation object
 * 
 * @example
 * const opts = await GetTraitRollOptions("agi");
 * if (opts.cancelled) return;
 * // opts: { unskilled, applyWoundPenalty, rollMod, keepMod, totalMod, void, tn, raises }
 */
export async function GetTraitRollOptions(traitName) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { trait: true });
  try {
    // Localize trait label for dialog title
    const traitKey = String(traitName).toLowerCase() === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${String(traitName).toLowerCase()}`;
    const traitLabel = game.i18n.localize(traitKey);
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.ui.chat.traitRoll", { trait: traitLabel }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processTraitRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
}

/**
 * Process trait roll dialog form into normalized options object.
 * 
 * @param {HTMLFormElement} form - Dialog form element
 * @returns {object} Parsed form values
 * @private
 */
function _processTraitRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    unskilled: form.unskilled.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value
  };
}
