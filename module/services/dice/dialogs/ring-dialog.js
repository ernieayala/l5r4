/**
 * @fileoverview L5R4 Ring/Spell Roll Dialog - Ring and Spell Casting Options UI
 * 
 * Provides interactive dialog for ring roll and spell casting customization
 * using Foundry's DialogV2 API. Handles modifiers, void point spending,
 * spell slot spending (elemental and void), target numbers, and raises.
 * 
 * When rendered with `{ spell: true }`, the dialog includes spell-specific
 * options for elemental and void spell slot spending.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";

/** Foundry's DialogV2 API for creating modal roll option dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display ring/spell roll options dialog and return user selections.
 * Shows fields for modifiers, void point spending, spell slot spending
 * (when spell: true), target number, and raises. Dialog has two action
 * buttons: "Ring Roll" and "Spell Casting".
 * 
 * @param {string} ringName - Ring name for dialog title
 * @returns {Promise<object|{cancelled: true}>} Form data or cancellation object
 * 
 * @example
 * const opts = await GetSpellOptions("Fire");
 * if (opts.cancelled) return false;
 * // opts: { applyWoundPenalty, rollMod, keepMod, totalMod, void, tn, raises, spellSlot, voidSlot, normalRoll }
 */
// COVERAGE IGNORE: DialogV2 integration requires DOM and async dialog lifecycle
// Cannot unit test: Requires actual Foundry DialogV2 rendering and user interaction
// Integration test: Covered in ring-roll-basic.test.js, ring-roll-advanced.test.js,
//                   ring-roll-resources.test.js (20+ scenarios mock GetSpellOptions)
/* c8 ignore start */
export async function GetSpellOptions(ringName) {
  const content = await R(DIALOG_TEMPLATES.rollModifiers, { spell: true, ring: ringName });
  return await new Promise((resolve) => {
    new DIALOG({
      window: { title: game.i18n.format("l5r4.ui.chat.ringRoll", { ring: ringName }) },
      position: { width: 460 },
      content,
      buttons: [
        {
          action: "normal",
          label: game.i18n.localize("l5r4.ui.mechanics.rolls.ringRoll"),
          callback: (_e, b, d) => resolve(_processRingRollOptions(b.form ?? d.form, false))
        },
        {
          label: game.i18n.localize("l5r4.ui.mechanics.rolls.spellCasting"),
          callback: (_e, b, d) => resolve(_processRingRollOptions(b.form ?? d.form, true))
        },
        { action: "cancel", label: game.i18n.localize("l5r4.ui.common.cancel") }
      ],
      submit: (result) => {
        if (result === "cancel" || result == null) resolve({ cancelled: true });
        else resolve(result);
      }
    }).render({ force: true });
  });
}
/* c8 ignore stop */

/**
 * Process ring/spell roll dialog form into normalized options object.
 * Always returns base ring fields; when dialog rendered with `{ spell: true }`,
 * returned object also includes `spellSlot` and `voidSlot`.
 * 
 * @param {HTMLFormElement} form - Dialog form element
 * @param {boolean} isSpellCasting - Whether "Spell Casting" button was clicked
 * @returns {object} Parsed form values
 * @internal Exported for testing
 */
export function _processRingRollOptions(form, isSpellCasting = false) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    tn: form.tn?.value,
    raises: form.raises?.value,
    // These fields exist when the dialog is rendered with { spell: true }
    spellSlot: form.spellSlot?.checked ?? false,
    voidSlot: form.voidSlot?.checked ?? false,
    normalRoll: true
  };
}
