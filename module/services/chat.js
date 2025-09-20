/**
 * @fileoverview L5R4 Chat Service - Item Creation Dialogs for Foundry VTT v13+
 * 
 * This service module provides utilities for creating interactive dialogs that allow
 * users to specify item details before creation. Uses Foundry's DialogV2 API with
 * custom Handlebars templates for a consistent user experience across the L5R4 system.
 * Serves as the primary interface for item creation workflows in character sheets.
 *
 * **Core Functionality:**
 * - **Dialog Management**: Creates modal dialogs using Foundry's DialogV2 API
 * - **Template Integration**: Renders custom Handlebars templates for different item types
 * - **Form Processing**: Extracts and validates user input from dialog forms
 * - **Type Mapping**: Routes different element types to appropriate dialog templates
 * - **Error Handling**: Graceful fallbacks for cancelled or failed dialog interactions
 * - **Input Validation**: Ensures required fields are populated before proceeding
 *
 * **System Architecture:**
 * The chat service follows a template-driven approach:
 * - **Template Selection**: Maps element types to specific dialog templates
 * - **Form Rendering**: Uses Handlebars templates for consistent UI presentation
 * - **Data Extraction**: Processes form data into structured objects
 * - **Error Recovery**: Handles user cancellation and validation failures gracefully
 *
 * **Supported Dialog Types:**
 * - **Spell Creation**: Technical spells and magical abilities with casting requirements
 * - **Advantage Creation**: Character advantages and disadvantages with cost validation
 * - **Equipment Creation**: General items, weapons, armor, and gear with properties
 *
 * **Template Contract:**
 * All dialog templates must implement the following form structure:
 * - `<input name="itemName" />` - Required text input for item name
 * - `<select name="itemType">...</select>` - Required dropdown for item type selection
 * - Form elements must be accessible via `form.elements` API
 * - Templates should include appropriate validation and user feedback
 *
 * **Dialog Workflow:**
 * 1. **Template Selection**: Choose appropriate template based on element type
 * 2. **Content Rendering**: Render Handlebars template with context data
 * 3. **Dialog Display**: Show modal dialog with form content
 * 4. **User Interaction**: Wait for user input and button interaction
 * 5. **Data Validation**: Validate required fields and format data
 * 6. **Result Processing**: Return structured result or cancellation status
 *
 * **Integration Points:**
 * - **Character Sheets**: Called from sheet action handlers for item creation
 * - **Config Module**: Uses dialog template paths and constants
 * - **Utils Module**: Leverages rendering and localization utilities
 * - **Item System**: Results feed into Item.create() workflows
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Returns cancellation status for any errors
 * - **Validation Feedback**: Requires non-empty item names before proceeding
 * - **Exception Safety**: Catches and handles all dialog-related exceptions
 * - **User Experience**: Provides clear feedback for invalid inputs
 *
 * **Performance Considerations:**
 * - **Template Caching**: Templates are cached by Foundry for fast rendering
 * - **Minimal DOM**: Lightweight dialog structure for quick display
 * - **Async Operations**: Non-blocking dialog operations with proper awaiting
 * - **Memory Management**: Dialogs are properly disposed after use
 *
 * **Usage Examples:**
 * ```javascript
 * // Create a spell selection dialog
 * const result = await getItemOptions("spell");
 * if (!result.cancelled) {
 *   await Item.create({ name: result.name, type: result.type });
 * }
 * 
 * // Create an equipment dialog
 * const equipment = await getItemOptions("equipment");
 * if (!equipment.cancelled) {
 *   console.log(`Creating ${equipment.type}: ${equipment.name}`);
 * }
 * ```
 *
 * **Dependencies:**
 * - `DIALOG_TEMPLATES` - Template path mappings from config.js
 * - `R()` - Template rendering utility from utils.js
 * - `T()` - Localization helper from utils.js
 * - `foundry.applications.api.DialogV2` - Foundry's dialog API
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html|DialogV2}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 * @see {@link ../config.js|Config Module} - Dialog template paths and constants
 * @see {@link ../utils.js|Utils Module} - Rendering and localization utilities
 */

import { DIALOG_TEMPLATES } from "../config.js";
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
    spell:    { template: DIALOG_TEMPLATES.createSpell, title: T("l5r4.ui.sheets.addTechSpell") },
    advantage:{ template: DIALOG_TEMPLATES.createAdv,   title: T("l5r4.ui.sheets.addAdv/Dis") },
    default:  { template: DIALOG_TEMPLATES.createEquip, title: T("l5r4.ui.sheets.addEquipment") }
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
