/**
 * Debounced Field Mixin
 *
 * Provides debounced field change handling for ApplicationV2 forms with real-time updates.
 * Prevents excessive actor updates during rapid user input by debouncing field changes.
 *
 * Key Features:
 * - Automatic debounced update setup in constructor
 * - Field change listener attachment in _onRender
 * - Type coercion for checkbox and number fields
 * - Flush pending updates on close
 * - Optional field validation hook
 *
 * Usage:
 * ```javascript
 * import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";
 *
 * export default class MyApp extends DebouncedFieldMixin(
 *   foundry.applications.api.HandlebarsApplicationMixin(
 *     foundry.applications.api.ApplicationV2
 *   )
 * ) {
 *   // Implement required method
 *   async _updateActor(field, value) {
 *     await this.actor.update({ [`system.${field}`]: value });
 *   }
 *
 *   // Optional: Add validation
 *   _validateFieldValue(field, value) {
 *     if (field === "myField" && value < 0) return null;
 *     return value;
 *   }
 * }
 * ```
 *
 * @module mixins/debounced-field-mixin
 */

// Config imports
import { SYS_ID } from "../config/constants.js";

// Utils imports
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
 * - `_updateActor(field, value)` - Method to update the actor with new field value
 *
 * Classes can optionally implement:
 * - `_validateFieldValue(field, value)` - Method to validate field values before update
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
     * @private
     */
    _updateDebounced;

    /**
     * Initialize debounced update function.
     * Must be called in subclass constructor after super().
     *
     * @protected
     */
    _initializeDebouncing() {
      this._updateDebounced = foundry.utils.debounce(
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
     * @protected
     */
    _onRender(context, options) {
      super._onRender?.(context, options);

      if (!this.element) {
        console.warn(`${SYS_ID}`, `${this.constructor.name} _onRender: No element`);
        return;
      }

      // Attach change listeners to all fields with data-action="field-change"
      const fields = this.element.querySelectorAll('[data-action="field-change"]');
      fields.forEach(field => {
        field.addEventListener("change", event => {
          this._onFieldChange(event, event.target);
        });
      });
    }

    /**
     * Handle field change events with type coercion.
     * Converts checkbox values to boolean, number fields to integers, and triggers debounced update.
     *
     * @param {Event} event - The change event
     * @param {HTMLElement} element - The form field element that changed
     * @private
     */
    async _onFieldChange(event, element) {
      const field = element.name;

      // Type coercion based on field type
      const value =
        element.type === "checkbox"
          ? element.checked
          : element.type === "number" || element.dataset.type === "Number"
            ? toInt(element.value, 0)
            : element.value;

      if (!field) {
        console.warn(`${SYS_ID}`, "Field change with no field name");
        return;
      }

      // Optional validation hook - subclasses can implement this
      if (typeof this._validateFieldValue === "function") {
        const validatedValue = this._validateFieldValue(field, value);
        if (validatedValue === null) {
          // Validation failed - subclass should handle notification
          return;
        }
        this._updateDebounced(field, validatedValue);
      } else {
        this._updateDebounced(field, value);
      }
    }

    /**
     * Update actor with new field value.
     * MUST be implemented by subclass.
     *
     * @param {string} _field - The field name to update
     * @param {*} _value - The new value for the field
     * @abstract
     * @protected
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
     * @protected
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
      if (this._updateDebounced && typeof this._updateDebounced.flush === "function") {
        await this._updateDebounced.flush();
      }
      return super.close(options);
    }
  };
}
