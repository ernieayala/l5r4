/**
 * @fileoverview Keyboard Behavior Mixin - Conditional Cursor and Keyboard Handling
 * 
 * Provides keyboard event handling and conditional cursor behavior for actor sheets.
 * Implements Shift-key detection to show pointer cursor on interactive elements,
 * providing visual feedback for increment/decrement controls.
 * 
 * **Responsibilities:**
 * - Global keyboard event handling (Shift key detection)
 * - Conditional cursor CSS custom property management
 * - Proper cleanup of keyboard listeners on close
 * - Visual feedback for Shift-click interactions
 * 
 * **Usage:**
 * ```javascript
 * import { KeyboardBehaviorMixin } from "./mixins/keyboard-behavior.js";
 * 
 * class MySheet extends KeyboardBehaviorMixin(BaseClass) {
 *   // Mixin provides: setupConditionalCursor(), cleanup on close()
 * }
 * ```
 * 
 * **Mixin Pattern:**
 * Uses functional mixin pattern for composable behavior without inheritance limitations.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties|CSS Custom Properties}
 */

/**
 * Keyboard Behavior Mixin
 * Adds keyboard handling and conditional cursor behavior to a sheet class.
 * 
 * @param {Class} Base - The base class to extend
 * @returns {Class} Extended class with keyboard behavior
 */
export function KeyboardBehaviorMixin(Base) {
  return class extends Base {
    /**
     * Setup conditional cursor behavior for increment/decrement controls.
     * Shows pointer cursor only when Shift key is held, default cursor otherwise.
     * Applies to trait ranks, void points, honor/glory/status ranks, and other interactive elements.
     * 
     * @param {HTMLElement} root - The sheet root element
     * @protected
     */
    _setupConditionalCursor(root) {
      // Store bound event handlers for cleanup
      if (!this._keyboardHandlers) {
        this._keyboardHandlers = {
          keydown: this._onKeyDown.bind(this),
          keyup: this._onKeyUp.bind(this)
        };
      }

      // Remove existing listeners to prevent duplicates
      document.removeEventListener('keydown', this._keyboardHandlers.keydown);
      document.removeEventListener('keyup', this._keyboardHandlers.keyup);

      // Add global keyboard listeners
      document.addEventListener('keydown', this._keyboardHandlers.keydown);
      document.addEventListener('keyup', this._keyboardHandlers.keyup);

      // Initialize cursor state
      this._updateConditionalCursor(root, false);
    }

    /**
     * Handle keydown events to detect Shift key press.
     * Updates cursor to pointer when Shift is pressed.
     * 
     * @param {KeyboardEvent} event - The keyboard event
     * @protected
     */
    _onKeyDown(event) {
      if (event.key === 'Shift' && !event.repeat) {
        this._updateConditionalCursor(this.element, true);
      }
    }

    /**
     * Handle keyup events to detect Shift key release.
     * Updates cursor back to default when Shift is released.
     * 
     * @param {KeyboardEvent} event - The keyboard event
     * @protected
     */
    _onKeyUp(event) {
      if (event.key === 'Shift') {
        this._updateConditionalCursor(this.element, false);
      }
    }

    /**
     * Update the conditional cursor CSS custom property.
     * 
     * @param {HTMLElement} root - The sheet root element
     * @param {boolean} showPointer - Whether to show pointer cursor
     * @protected
     */
    _updateConditionalCursor(root, showPointer) {
      if (!root) return;
      
      const cursorValue = showPointer ? 'pointer' : 'default';
      root.style.setProperty('--conditional-cursor', cursorValue);
    }

    /**
     * Cleanup keyboard event listeners when sheet is closed.
     * @override
     */
    async close(options = {}) {
      // Remove global keyboard listeners
      if (this._keyboardHandlers) {
        document.removeEventListener('keydown', this._keyboardHandlers.keydown);
        document.removeEventListener('keyup', this._keyboardHandlers.keyup);
        this._keyboardHandlers = null;
      }
      
      return super.close(options);
    }
  };
}
