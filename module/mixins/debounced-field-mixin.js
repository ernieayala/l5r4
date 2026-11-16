/**
 * @module mixins/debounced-field-mixin
 * @description Debounced field saving for ApplicationV2 forms that update an actor while the user types, so rapid
 * input makes one update instead of many. The class calls `_initializeDebouncing()` in its constructor after
 * `super()` and implements `_updateActor(field, value)`; it may override `_validateFieldValue(field, value)`, which
 * returns null to reject a value. The mixin listens for `change` on every `[data-action="update-field"]` field in
 * `_onRender`, coerces checkbox and number values, and flushes a pending update on close.
 */
import { SYS_ID } from "../config/constants.js";
import { toInt } from "../utils/type-coercion.js";

/**
 * Debounce delay in milliseconds for field change updates.
 * Prevents excessive actor updates during rapid user input.
 * @constant {number}
 */
export const DEBOUNCE_DELAY_MS = 300;

/**
 * Mixin that adds debounced field change handling to ApplicationV2 classes.
 *
 * Classes using this mixin must implement:
 * - `_updateActor(field, value)` - Method to update the actor with new field value.
 *
 * Classes can optionally implement:
 * - `_validateFieldValue(field, value)` - Method to validate field values before update.
 *
 * @param {class} Base - The base class to extend
 * @returns {class} Extended class with debounced field functionality
 */
export function DebouncedFieldMixin(Base) {
  return class extends Base {
    /**
     * Debounced update function to prevent excessive actor updates during rapid field changes.
     * Waits DEBOUNCE_DELAY_MS after last change before executing update.
     *
     * @type {Function}
     */
    updateDebounced;

    /**
     * Initialize debounced update function.
     * Must be called in subclass constructor after super().
     */
    _initializeDebouncing() {
      this.updateDebounced = foundry.utils.debounce(
        this._updateActor.bind(this),
        DEBOUNCE_DELAY_MS
      );
    }

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
     * Converts checkbox values to boolean, number fields to integers, and triggers debounced update.
     *
     * @param {Event} event - The change event
     * @param {HTMLElement} element - The form field element that changed
     */
    async _onFieldChange(event, element) {
      updateFieldValue(this, element);
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

    /**
     * Close the application and flush any pending debounced updates.
     * Ensures all field changes are saved before window closes.
     *
     * @param {object} [options={}] - Close options
     * @returns {Promise<void>}
     */
    async close(options = {}) {
      if (this.updateDebounced && typeof this.updateDebounced.flush === "function") {
        await this.updateDebounced.flush();
      }
      return super.close(options);
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
 * Queue the debounced update of a changed field with its coerced value, once the window's validation accepts it.
 * @param {ApplicationV2} app - A window with the mixin
 * @param {HTMLElement} element - The form field element that changed
 */
function updateFieldValue(app, element) {
  const field = element.name;
  const value = toFieldValue(element);

  if (!field) {
    console.warn(`${SYS_ID}`, "Field change with no field name");
    return;
  }

  // Optional validation hook - subclasses can implement this
  if (typeof app._validateFieldValue === "function") {
    const validatedValue = app._validateFieldValue(field, value);
    if (validatedValue === null) {
      // Validation failed - subclass should handle notification
      return;
    }
    app.updateDebounced(field, validatedValue);
  } else {
    app.updateDebounced(field, value);
  }
}
