/**
 * @fileoverview L5R4 DOM Manipulation Utilities
 * 
 * Provides helper functions for DOM queries and event delegation in sheets.
 * These utilities simplify common patterns and reduce boilerplate in sheet classes,
 * particularly for ApplicationV2/ActorSheetV2 event handling.
 * 
 * **Core Responsibilities:**
 * - **Event Delegation**: Efficient event handling without per-element listeners
 * - **DOM Queries**: Simplified element selection with type safety
 * 
 * **Design Principles:**
 * - **Event Delegation Pattern**: Attach listeners to root, filter by selector
 * - **Performance**: Minimal listeners, maximum efficiency
 * - **Type Safety**: Clear element type handling
 * - **Sheet Integration**: Designed for FoundryVTT v13 sheet architecture
 * 
 * **Usage Examples:**
 * ```javascript
 * // Event delegation (in sheet's _onRender)
 * on(this.element, "[data-action='roll']", "click", (event, element) => {
 *   const action = element.dataset.action;
 *   this._handleRoll(action);
 * });
 * 
 * // Query selector helpers
 * const input = qs(this.element, "input[name='character-name']");
 * const allSkills = qsa(this.element, ".skill-item");
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener|addEventListener}
 */

/**
 * Delegate an event to a selector within a root element.
 * Useful in ActorSheetV2._onRender to avoid binding per-row handlers.
 * Implements the event delegation pattern for efficient event handling.
 * @param {HTMLElement} root - Root element to attach the listener to
 * @param {string} selector - CSS selector to match target elements
 * @param {string} type - Event type like "click", "change", "input", etc.
 * @param {(ev:Event, el:Element)=>void} handler - Event handler function
 * @param {Object} [options] - Optional event listener options
 * @param {boolean} [options.capture=false] - Use capture phase (required for Firefox contextmenu)
 * @example
 * // Delegate all button clicks to a single handler
 * on(this.element, "button[data-action]", "click", (event, button) => {
 *   const action = button.dataset.action;
 *   this._handleAction(action, button);
 * });
 * 
 * // Delegate input changes
 * on(this.element, "input.skill-rank", "change", (event, input) => {
 *   this._updateSkillRank(input);
 * });
 * 
 * // Use capture phase for contextmenu (Firefox compatibility)
 * on(this.element, "[data-action]", "contextmenu", (event, el) => {
 *   event.preventDefault();
 * }, { capture: true });
 */
export function on(root, selector, type, handler, options = {}) {
  // Defensive: Validate root has addEventListener (EventTarget interface)
  if (!root?.addEventListener) {
    console.warn("L5R4", "on() requires valid EventTarget root", { root });
    return;
  }
  // Defensive: Validate handler is callable
  if (typeof handler !== "function") {
    console.warn("L5R4", "on() requires function handler", { handler });
    return;
  }
  // Defensive: Validate selector is a string to avoid closest() errors
  if (typeof selector !== "string" || !selector) {
    console.warn("L5R4", "on() requires non-empty string selector", { selector });
    return;
  }
  
  // Extract capture option for Firefox contextmenu compatibility
  const useCapture = options.capture ?? false;
  
  root.addEventListener(type, (ev) => {
    // Defensive: Wrap closest() in try/catch for invalid selectors
    let el = null;
    if (ev.target instanceof Element) {
      try {
        el = ev.target.closest(selector);
      } catch (e) {
        console.warn("L5R4", "on() invalid selector caused closest() error", { selector, error: e.message });
        return;
      }
    }
    if (el && root.contains(el)) handler(ev, el);
  }, useCapture);
}

/**
 * Query selector helper - find first matching element.
 * Wrapper around querySelector for consistent usage across the system.
 * @param {Element|Document} root - Root element to search within
 * @param {string} sel - CSS selector
 * @returns {Element|null} First matching element or null
 * @example
 * const nameInput = qs(this.element, "input[name='name']");
 * if (nameInput) nameInput.focus();
 */
export const qs = (root, sel) => {
  // Defensive: Validate root has querySelector
  if (!root?.querySelector) {
    console.warn("L5R4", "qs() requires valid Element or Document root", { root });
    return null;
  }
  return root.querySelector(sel);
};

/**
 * Query selector all helper - find all matching elements.
 * Wrapper around querySelectorAll that returns a proper array for easier manipulation.
 * @param {Element|Document} root - Root element to search within
 * @param {string} sel - CSS selector
 * @returns {Element[]} Array of matching elements
 * @example
 * const skillItems = qsa(this.element, ".skill-item");
 * skillItems.forEach(item => {
 *   // Process each skill item
 * });
 */
export const qsa = (root, sel) => {
  // Defensive: Validate root has querySelectorAll
  if (!root?.querySelectorAll) {
    console.warn("L5R4", "qsa() requires valid Element or Document root", { root });
    return [];
  }
  return Array.from(root.querySelectorAll(sel));
};
