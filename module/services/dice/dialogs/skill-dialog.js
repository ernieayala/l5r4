/**
 * @fileoverview L5R4 Skill Roll Dialog - Skill Roll Options UI
 * 
 * Provides interactive dialog for skill roll customization using Foundry's
 * DialogV2 API. Handles emphasis, void point spending, modifiers, target
 * numbers, and raises for skill rolls.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display skill roll options dialog and return user selections.
 * Shows fields for emphasis, wound penalty, modifiers, void point spending,
 * target number, and raises.
 * 
 * @param {string} skillName - Skill name for dialog title
 * @param {boolean} noVoid - Whether to hide void point option (NPC restriction)
 * @param {number} [rollBonus=0] - Pre-applied roll bonus (from Active Effects)
 * @param {number} [keepBonus=0] - Pre-applied keep bonus (from Active Effects)
 * @param {number} [totalBonus=0] - Pre-applied total bonus (from Active Effects)
 * @returns {Promise<object|{cancelled: true}>} Form data or cancellation object
 * 
 * @example
 * const opts = await GetSkillOptions("Kenjutsu", false, 0, 0, 0);
 * if (opts.cancelled) return;
 * // opts: { emphasis, applyWoundPenalty, rollMod, keepMod, totalMod, void, tn, raises }
 */
export async function GetSkillOptions(skillName, noVoid, rollBonus = 0, keepBonus = 0, totalBonus = 0) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { skill: true, noVoid, rollBonus, keepBonus, totalBonus });
  /* c8 ignore start - error handling tested in integration (skill-roll-*.test.js) */
  try {
    const result = await DIALOG.prompt({
      window: { title: game.i18n.format("l5r4.ui.chat.rollName", { roll: skillName }) },
      content,
      ok: { label: game.i18n.localize("l5r4.ui.common.roll"), callback: (_e, b, d) => _processSkillRollOptions(b.form ?? d.form) },
      cancel: { label: game.i18n.localize("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });
    return result ?? { cancelled: true };
  } catch { return { cancelled: true }; }
  /* c8 ignore stop */
}

/**
 * Process skill roll dialog form into normalized options object.
 * 
 * COVERAGE IGNORE: DialogV2 callback architecture
 * Cannot unit test: Module-level constant capture and async dialog timing
 * Integration test: skill-roll-*.test.js (50+ scenarios with mocked return values)
 * 
 * @param {HTMLFormElement} form - Dialog form element
 * @returns {object} Parsed form values
 * @private
 */
/* c8 ignore start */
function _processSkillRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    emphasis: form.emphasis.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false,
    tn: form.tn?.value,
    raises: form.raises?.value
  };
}
/* c8 ignore stop */
