/**
 * @module mixins/keyboard-behavior-mixin
 * @description Cursor feedback while Shift is held, for the system's Shift+Click guard against accidental changes to
 * Traits, Skills, the Void Ring, and other character values (PcTraitHandler, PcAdjustmentHandler, and
 * ItemCRUDHandler's chat posts). A sheet class applies the mixin, calls `_setupConditionalCursor(root)` from
 * `_onRender`, and styles its guarded elements with `cursor: var(--conditional-cursor)`. The mixin needs the
 * Application's `element` and overrides `close` to remove its document-level listeners.
 */

/**
 * Mixin factory that adds keyboard behavior for conditional cursor changes.
 *
 * Adds document-level event listeners for Shift key state tracking and updates
 * a CSS custom property (`--conditional-cursor`) that sheets use to provide
 * visual feedback when Shift+Click actions are available.
 *
 * **Lifecycle Integration:**
 * - Call `_setupConditionalCursor(root)` from _onRender to initialize
 * - Automatically cleans up event listeners when sheet closes
 *
 * **CSS Integration:**
 * Sheet styles should use `cursor: var(--conditional-cursor)` on elements that
 * require Shift+Click. The variable changes from 'default' to 'pointer' when
 * Shift is held, providing visual affordance.
 *
 * @param {class} Base - The base class to extend (must have `element` property and `close` method)
 * @returns {class} Extended class with keyboard behavior methods
 */
export function KeyboardBehaviorMixin(Base) {
  return class extends Base {
    /**
     * Initializes keyboard event listeners for Shift key tracking.
     *
     * Sets up document-level keydown/keyup listeners that track Shift key state
     * and update the `--conditional-cursor` CSS custom property. Removes any
     * existing listeners before adding new ones to prevent duplicate handlers.
     *
     * **Lifecycle:**
     * Call this from the `_onRender` lifecycle method after the sheet element
     * is available in the DOM.
     *
     * **Implementation Notes:**
     * - Stores bound handlers in `this._keyboardHandlers` for cleanup.
     * - Uses document-level listeners to detect Shift even when cursor leaves sheet.
     * - Initializes cursor to 'default' state on setup.
     *
     * @param {HTMLElement} root - The root element of the sheet, as a rule this.element
     */
    _setupConditionalCursor(root) {
      // Create and store bound handlers for cleanup (must be same reference to remove)
      if (!this._keyboardHandlers) {
        this._keyboardHandlers = {
          keydown: this._onKeyDown.bind(this),
          keyup: this._onKeyUp.bind(this)
        };
      }

      // Remove any existing listeners to prevent duplicates (idempotent setup)
      document.removeEventListener("keydown", this._keyboardHandlers.keydown);
      document.removeEventListener("keyup", this._keyboardHandlers.keyup);

      // Add fresh listeners to document (not element) to track Shift globally
      document.addEventListener("keydown", this._keyboardHandlers.keydown);
      document.addEventListener("keyup", this._keyboardHandlers.keyup);

      // Initialize cursor to default state
      this._updateConditionalCursor(root, false);
    }

    /**
     * Handles keydown events to detect Shift key press.
     *
     * Updates the conditional cursor to 'pointer' when Shift is initially pressed,
     * providing visual feedback that Shift+Click actions are now available.
     *
     * **Implementation Notes:**
     * - Checks `event.repeat` to ignore held-down key repetition events.
     * - Only responds to 'Shift' key, ignoring all other keys.
     *
     * @param {KeyboardEvent} event - The keydown event from document listener
     */
    _onKeyDown(event) {
      // Ignore repeat events from holding Shift (only respond to initial press)
      if (event.key === "Shift" && !event.repeat) {
        this._updateConditionalCursor(this.element, true);
      }
    }

    /**
     * Handles keyup events to detect Shift key release.
     *
     * Resets the conditional cursor to 'default' when Shift is released,
     * removing the visual indication that Shift+Click actions are available.
     *
     * @param {KeyboardEvent} event - The keyup event from document listener
     */
    _onKeyUp(event) {
      if (event.key === "Shift") {
        this._updateConditionalCursor(this.element, false);
      }
    }

    /**
     * Updates the CSS custom property that controls conditional cursor style.
     *
     * Sets the `--conditional-cursor` CSS variable on the sheet root element,
     * which sheet styles can reference to provide visual feedback for
     * Shift+Click interactions.
     *
     * **CSS Integration:**
     * Sheet SCSS files use `cursor: var(--conditional-cursor)` on elements
     * requiring Shift+Click (e.g., trait adjustment buttons, item chat links).
     *
     * **Visual Feedback:**
     * - 'default' cursor: Shift not pressed, clicks will be ignored.
     * - 'pointer' cursor: Shift pressed, clicks will perform actions.
     *
     * @param {HTMLElement|null} root - The root element to update, as a rule this.element
     * @param {boolean} showPointer - True to show pointer cursor (Shift pressed), false for default
     */
    _updateConditionalCursor(root, showPointer) {
      // Guard: element may not be available during initialization or cleanup
      if (!root) {
        return;
      }

      const cursorValue = showPointer ? "pointer" : "default";
      root.style.setProperty("--conditional-cursor", cursorValue);
    }

    /**
     * Cleans up document-level event listeners before closing the sheet.
     *
     * Overrides the Application.close method to remove keydown/keyup event
     * listeners from the document, preventing memory leaks and ensuring handlers
     * don't fire after the sheet is closed.
     *
     * **Foundry Lifecycle:**
     * This method is part of the Foundry Application API lifecycle. Always
     * call `super.close(options)` to ensure proper cleanup chain.
     *
     * **Cleanup Strategy:**
     * - Removes both event listeners from document.
     * - Nullifies handler references to allow garbage collection.
     * - Then delegates to parent class close method.
     *
     * @param {object} [options={}] - Options passed to Application.close
     * @returns {Promise<void>} Resolves when the sheet is fully closed
     * @override
     */
    async close(options = {}) {
      if (this._keyboardHandlers) {
        document.removeEventListener("keydown", this._keyboardHandlers.keydown);
        document.removeEventListener("keyup", this._keyboardHandlers.keyup);
        this._keyboardHandlers = null;
      }

      return super.close(options);
    }
  };
}
