/**
 * DOM Utility Module
 *
 * Provides event delegation utilities for Foundry VTT v13 Application v2.
 * Implements defensive event handling with selector validation and proper
 * event target resolution using Element.closest().
 *
 * Primary use case: Delegated event listeners in ActorSheetV2 and ItemSheetV2
 * implementations following Foundry's recommended patterns.
 *
 * @module utils/dom
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 */

/**
 * Attach a delegated event listener to a root element.
 *
 * Implements event delegation pattern where a single listener on the root element
 * handles events for all matching child elements (current and future). Uses
 * Element.closest() to walk up the DOM tree from event.target to find the
 * nearest ancestor matching the selector.
 *
 * Defensive implementation includes:
 * - Root element validation (must be EventTarget)
 * - Handler function type check
 * - Selector string validation
 * - Try-catch for invalid CSS selectors
 * - Containment check to prevent handling events from detached elements
 *
 * Common usage in Foundry v13 sheets:
 * ```javascript
 * _onRender(context, options) {
 *   const root = this.element;
 *   on(root, "[data-action]", "click", (ev, el) => {
 *     const action = el.getAttribute("data-action");
 *     this._onAction(action, ev, el);
 *   });
 * }
 * ```
 *
 * @param {EventTarget} root - The root element to attach the listener to (typically sheet element)
 * @param {string} selector - CSS selector for child elements to match (e.g., "[data-action]")
 * @param {string} type - Event type to listen for (e.g., "click", "change", "contextmenu")
 * @param {Function} handler - Callback function receiving (event, matchedElement)
 * @param {Object} [options={}] - Event listener options
 * @param {boolean} [options.capture=false] - Use capture phase instead of bubble phase
 * @returns {void}
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/closest|Element.closest()}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 */
export function on(root, selector, type, handler, options = {}) {
  // Validate root is a valid EventTarget (Element, Document, Window, etc.)
  if (!root?.addEventListener) {
    console.warn("L5R4", "on() requires valid EventTarget root", { root });
    return;
  }

  // Ensure handler is callable
  if (typeof handler !== "function") {
    console.warn("L5R4", "on() requires function handler", { handler });
    return;
  }

  // Validate selector is non-empty string for closest() call
  if (typeof selector !== "string" || !selector) {
    console.warn("L5R4", "on() requires non-empty string selector", { selector });
    return;
  }

  const useCapture = options.capture ?? false;

  // Attach single delegated listener - walks DOM tree to find matching elements
  root.addEventListener(
    type,
    ev => {
      let el = null;
      // Only process events from Element nodes (not text nodes, comments, etc.)
      if (ev.target instanceof Element) {
        try {
          // Walk up DOM tree to find nearest ancestor matching selector
          el = ev.target.closest(selector);
        } catch (e) {
          // Invalid CSS selector - log warning and skip this event
          console.warn("L5R4", "on() invalid selector caused closest() error", {
            selector,
            error: e.message
          });
          return;
        }
      }
      // Only invoke handler if match found and element is still in root's tree
      // (prevents handling events from detached/moved elements)
      if (el && root.contains(el)) {
        handler(ev, el);
      }
    },
    useCapture
  );
}
