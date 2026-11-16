/**
 * @module services/xp/disadvantage-cap
 * @description The question the XP manager asks before it changes a character's Disadvantage XP cap: a number prompt
 * whose content is templates/dialogs/disadvantage-cap-dialog.hbs (docs/design-system/patterns/dialogs.md, rule 1).
 */

import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { R, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";

/**
 * Ask for a character's new Disadvantage XP cap.
 * @param {number} currentCap - The cap the character has, the field's starting value
 * @returns {Promise<number|null>} The new cap, a whole number of 0 or more; null when the dialog is closed, or the
 * field holds no number or a negative one
 */
export async function askDisadvantageCap(currentCap) {
  const answer = await foundry.applications.api.DialogV2.prompt({
    window: { title: T("l5r4.apps.xpManager.disadvantageCapTitle") },
    content: await R(DIALOG_TEMPLATES.disadvantageCap, { currentCap }),
    ok: {
      label: T("l5r4.ui.common.ok"),
      callback: (_event, button) => toInt(button.form.elements.disadvantageCap.value, null)
    },
    rejectClose: false,
    modal: true
  });
  return Number.isFinite(answer) && answer >= 0 ? answer : null;
}
