/**
 * L5R4 chat utilities (Foundry VTT v13)
 *
 * Responsibilities
 * - Prompt for new item options using DialogV2 and chat templates.
 * - Return a structured result the caller can use to create the item.
 *
 * Dependencies
 * - Foundry VTT v13 client API: https://foundryvtt.com/api/
 * - ./config.js: CHAT_TEMPLATES mapping for dialog templates.
 * - ./utils.js: R (renderTemplate wrapper), T (localize helper)
 *
 * Exports
 * - getItemOptions(elementType): Promise<ItemOptionsResult>
 * - GetItemOptions: alias kept for backward compatibility
 *
 * Form contract (templates/chat/create-*.hbs)
 * - <input name="itemName" />
 * - <select name="itemType">...</select>
 */

import { CHAT_TEMPLATES } from "../config.js";
import { R, T } from "../utils.js";

/**
 * @typedef {{name: string, type: string} | { cancelled: true }} ItemOptionsResult
 */

const DIALOG = foundry.applications.api.DialogV2;

/**
 * Open the appropriate create-item dialog and return the chosen name/type.
 * @param {"spell"|"advantage"|string} elementType - Decides which dialog template to use.
 * @returns {Promise<ItemOptionsResult>}
 */
export async function getItemOptions(elementType) {
  const mapping = {
    spell:    { template: CHAT_TEMPLATES.createSpell, title: T("l5r4.ui.sheets.addTechSpell") },
    advantage:{ template: CHAT_TEMPLATES.createAdv,   title: T("l5r4.ui.sheets.addAdv/Dis") },
    default:  { template: CHAT_TEMPLATES.createEquip, title: T("l5r4.ui.sheets.addEquipment") }
  };

  const { template, title } = mapping[elementType] ?? mapping.default;
  const content = await R(template, {});

  try {
    const result = await DIALOG.prompt({
      window: { title },
      content,
      ok: {
        label: T("l5r4.ui.common.ok"),
        callback: (_ev, button, dialog) => {
          const form = button.form ?? dialog.form;
          if (!form) return { cancelled: true };
          const name = String(form.elements.itemName?.value ?? "").trim();
          const type = String(form.elements.itemType?.value ?? "").trim() || "item";
          if (!name) return { cancelled: true };
          return { name, type };
        }
      },
      cancel: { label: T("l5r4.ui.common.cancel") },
      rejectClose: true,
      modal: true
    });

    return result ?? { cancelled: true };
  } catch {
    return { cancelled: true };
  }
}

/** Backward-compatible export for existing callers. */
export const GetItemOptions = getItemOptions;
