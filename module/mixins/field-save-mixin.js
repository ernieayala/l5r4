/**
 * @module mixins/field-save-mixin
 * @description Field-by-field saving for ApplicationV2 forms that update an actor as the user edits. The class
 * implements `_updateActor(field, value)` and may override `_validateFieldValue(field, value)`, which returns null to
 * reject a value. The mixin listens for `change` on every `[data-action="update-field"]` field in `_onRender`,
 * coerces checkbox and number values, and saves at once: a `change` fires once per edit, on Enter or when the field
 * loses focus, so nothing waits that closing the window or a second edit could lose (#137).
 */
import { SYS_ID } from "../config/constants.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Mixin that saves each changed form field of an ApplicationV2 window.
 *
 * Classes using this mixin must implement:
 * - `_updateActor(field, value)` - Method to update the actor with new field value.
 *
 * Classes can optionally implement:
 * - `_validateFieldValue(field, value)` - Method to validate field values before update.
 *
 * @param {class} Base - The base class to extend
 * @returns {class} Extended class that saves its fields as they change
 */
export function FieldSaveMixin(Base) {
  return class extends Base {
    /**
     * Foundry lifecycle hook called after rendering.
     * Attaches change event listeners to form fields for real-time updates.
     *
     * @param {object} context - Render context
     * @param {object} options - Render options
     * @override
     */
    _onRender(context, options) {
      super._onRender?.(context, options);
      bindFieldChanges(this);
    }

    /**
     * Handle field change events with type coercion.
     * Converts checkbox values to boolean and number fields to integers, then saves the field.
     *
     * @param {Event} event - The change event
     * @param {HTMLElement} element - The form field element that changed
     * @returns {Promise<void>}
     */
    async _onFieldChange(event, element) {
      await updateFieldValue(this, element);
    }

    /**
     * Update actor with new field value.
     * MUST be implemented by subclass.
     *
     * @param {string} _field - The field name to update
     * @param {*} _value - The new value for the field
     * @abstract
     */
    async _updateActor(_field, _value) {
      throw new Error(`${this.constructor.name} must implement _updateActor(field, value)`);
    }

    /**
     * Validate field value before applying update.
     * Optional hook for subclasses to implement validation logic.
     *
     * @param {string} field - The field name being validated
     * @param {*} value - The value to validate
     * @returns {*|null} Validated value or null if invalid
     */
    _validateFieldValue(field, value) {
      // Default: no validation, return value as-is
      return value;
    }
  };
}

/**
 * A form field's value by its type: a checkbox's checked state, a number field's integer, or the text. A field
 * reading "-0" (or "-0.5") saves 0, never -0.
 * @param {HTMLInputElement} element - The form field
 * @returns {boolean|number|string} The value to save
 */
export function toFieldValue(element) {
  if (element.type === "checkbox") {
    return element.checked;
  }
  if (element.type === "number" || element.dataset.type === "Number") {
    // -0 is falsy, so it becomes 0
    return toInt(element.value, 0) || 0;
  }
  return element.value;
}

/**
 * Listen for `change` on every `[data-action="update-field"]` field of the rendered window.
 * @param {ApplicationV2} app - A window with the mixin
 */
function bindFieldChanges(app) {
  if (!app.element) {
    console.warn(`${SYS_ID}`, `${app.constructor.name} _onRender: No element`);
    return;
  }

  // Attach change listeners to all fields with data-action="update-field"
  const fields = app.element.querySelectorAll('[data-action="update-field"]');
  fields.forEach(field => {
    field.addEventListener("change", event => {
      app._onFieldChange(event, event.target);
    });
  });
}

/**
 * Save a changed field with its coerced value, once the window's validation accepts it.
 * @param {ApplicationV2} app - A window with the mixin
 * @param {HTMLElement} element - The form field element that changed
 * @returns {Promise<void>}
 */
async function updateFieldValue(app, element) {
  const field = element.name;
  if (!field) {
    console.warn(`${SYS_ID}`, "Field change with no field name");
    return;
  }

  const value = app._validateFieldValue(field, toFieldValue(element));
  // Validation failed - the subclass says why
  if (value === null) {
    return;
  }
  await app._updateActor(field, value);
}
