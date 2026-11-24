/**
 * @module services/dice/check/dialog
 * @description The check dialog of the roll pipeline (module/services/dice/check/roll-check.js): every choice the
 * rules leave to the roller, in one dialog (templates/dialogs/check-dialog.hbs), read back as the form's values.
 * docs/design-system/components/check-dialog.md
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { askPrompt } from "../../dialog.js";
import { bindManeuverCost } from "./maneuver-cost.js";
import { buildDialogContext } from "./terms.js";

/**
 * Show the check dialog with the check's terms.
 * @param {object} check - From buildCheck
 * @returns {Promise<object|null>} The form's values, or null when the roller closes the dialog
 */
export function askCheckChoices(check) {
  const bind = check.kind === "attack" ? form => bindManeuverCost(form, check, formDataOf) : null;
  return askChoices(check.request, buildDialogContext(check), bind);
}

/**
 * Read the dialog's form into choices.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
function formDataOf(form) {
  return foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
}

/**
 * Show the check dialog.
 * @param {CheckRequest} request
 * @param {object} context - Dialog template context
 * @param {function(HTMLFormElement): void|null} bind - Wires the rendered form's live parts (an attack's maneuvers)
 * @returns {Promise<object|null>} The form's values, or null when the roller closes the dialog
 */
async function askChoices(request, context, bind) {
  // Each field's label points at its control by id; the ids are unique to this dialog
  const formId = foundry.utils.randomID();
  const extras = request.extras
    ? await foundry.applications.handlebars.renderTemplate(request.extras.template, {
        ...request.extras.data,
        formId
      })
    : "";
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.check, {
    ...context,
    formId,
    extras
  });
  return askPrompt({
    window: { title: request.label },
    position: { width: 420 },
    content,
    ok: { label: T("l5r4.ui.common.roll"), callback: (_event, button) => formDataOf(button.form) },
    render: (_event, dialog) => {
      bindVoidUses(dialog.element, context.voidPoints);
      bind?.(dialog.element.querySelector("form"));
    },
    rejectClose: false,
    modal: true
  });
}

/**
 * Keep the dialog's Void Point uses within the Void Points the roller has: each use takes its own point, so once
 * every point is chosen, the other use is disabled and says why.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {HTMLElement} element - The dialog
 * @param {number} voidPoints - The roller's Void Points
 */
function bindVoidUses(element, voidPoints) {
  const uses = [...element.querySelectorAll('[name="void"], [name="voidSkill"]')];
  const reason = F("l5r4.ui.check.voidPointsChosen", { points: voidPoints });
  // With no Void Points the template has disabled both uses already, so no change reaches this
  const update = () => {
    const full = uses.filter(use => use.checked).length >= voidPoints;
    for (const use of uses.filter(use => !use.checked)) {
      use.disabled = full;
      if (full) {
        use.dataset.tooltip = reason;
      } else {
        delete use.dataset.tooltip;
      }
    }
  };
  for (const use of uses) {
    use.addEventListener("change", update);
  }
}
