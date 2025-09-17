/**
 * @fileoverview L5R4 Chat Service - Item Creation Dialogs for Foundry VTT v13+
 * 
 * This service module provides utilities for creating interactive dialogs that allow
 * users to specify item details before creation. Uses Foundry's DialogV2 API with
 * custom Handlebars templates for a consistent user experience.
 *
 * **Core Functionality:**
 * - **Dialog Management**: Creates modal dialogs using Foundry's DialogV2 API
 * - **Template Integration**: Renders custom Handlebars templates for different item types
 * - **Form Processing**: Extracts and validates user input from dialog forms
 * - **Type Mapping**: Routes different element types to appropriate dialog templates
 * - **Error Handling**: Graceful fallbacks for cancelled or failed dialog interactions
 *
 * **Supported Dialog Types:**
 * - **Spell Creation**: Technical spells and magical abilities
 * - **Advantage Creation**: Character advantages and disadvantages
 * - **Equipment Creation**: General items, weapons, armor, and gear
 *
 * **Template Contract:**
 * All dialog templates must implement the following form structure:
 * - `<input name="itemName" />` - Required text input for item name
 * - `<select name="itemType">...</select>` - Required dropdown for item type selection
 *
 * **Dependencies:**
 * - `CHAT_TEMPLATES` - Template path mappings from config.js
 * - `R()` - Template rendering utility from utils.js
 * - `T()` - Localization helper from utils.js
 * - `foundry.applications.api.DialogV2` - Foundry's dialog API
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html|DialogV2}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 */

import { CHAT_TEMPLATES } from "../config.js";
import { R, T } from "../utils.js";

/**
 * Result object returned by item creation dialogs.
 * Contains either the user's selections or cancellation status.
 * 
 * @typedef {object} ItemOptionsResult
 * @property {string} [name] - User-specified item name (present if not cancelled)
 * @property {string} [type] - Selected item type (present if not cancelled)
 * @property {boolean} [cancelled] - True if user cancelled the dialog (mutually exclusive with name/type)
 */

/** Foundry's DialogV2 API for creating modal dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Display an item creation dialog and collect user input.
 * Routes to the appropriate template based on element type and returns
 * the user's selections or cancellation status.
 * 
 * **Template Routing:**
 * - `"spell"`: Uses spell creation template with technical/magical options
 * - `"advantage"`: Uses advantage/disadvantage template with cost options
 * - Other values: Uses general equipment template with standard item types
 * 
 * **Dialog Behavior:**
 * - Modal dialog blocks interaction until resolved
 * - Validates that item name is not empty
 * - Defaults item type to "item" if not specified
 * - Returns cancellation object if user cancels or validation fails
 * 
 * @param {"spell"|"advantage"|string} elementType - Determines which dialog template to display
 * @returns {Promise<ItemOptionsResult>} User selections or cancellation status
 */
export async function getItemOptions(elementType) {
  // Map element types to their corresponding templates and localized titles
  const mapping = {
    spell:    { template: CHAT_TEMPLATES.createSpell, title: T("l5r4.ui.sheets.addTechSpell") },
    advantage:{ template: CHAT_TEMPLATES.createAdv,   title: T("l5r4.ui.sheets.addAdv/Dis") },
    default:  { template: CHAT_TEMPLATES.createEquip, title: T("l5r4.ui.sheets.addEquipment") }
  };

  // Select appropriate template and render dialog content
  const { template, title } = mapping[elementType] ?? mapping.default;
  const content = await R(template, {});

  try {
    // Display modal dialog with form validation
    const result = await DIALOG.prompt({
      window: { title },
      content,
      ok: {
        label: T("l5r4.ui.common.ok"),
        callback: (_ev, button, dialog) => {
          // Extract form data from dialog
          const form = button.form ?? dialog.form;
          if (!form) return { cancelled: true };
          
          // Validate and normalize user input
          const name = String(form.elements.itemName?.value ?? "").trim();
          const type = String(form.elements.itemType?.value ?? "").trim() || "item";
          
          // Require non-empty item name
          if (!name) return { cancelled: true };
          
          return { name, type };
        }
      },
      cancel: { label: T("l5r4.ui.common.cancel") },
      rejectClose: true, // Prevent closing without button interaction
      modal: true        // Block other UI interaction
    });

    return result ?? { cancelled: true };
  } catch {
    // Handle any dialog errors as cancellation
    return { cancelled: true };
  }
}

/**
 * Legacy export alias for backward compatibility.
 * @deprecated Use getItemOptions instead
 * @type {function}
 */
export const GetItemOptions = getItemOptions;
