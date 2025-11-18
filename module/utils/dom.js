/**
 * @module dom
 * @description DOM manipulation utilities for event delegation.
 *
 * Provides event delegation helpers that attach listeners to parent elements
 * and handle events from matching child elements. This improves performance
 * by reducing the number of event listeners and handles dynamically added elements.
 *
 * Uses data attributes for element selection to maintain separation of concerns.
 */

import { logError } from "./error-logging.js";

/**
 * Attaches delegated event listener to root element.
 *
 * Uses event delegation pattern: attaches listener to parent (root) element
 * and handles events from matching child elements. The handler is called only
 * when the event target or its ancestors match the selector.
 *
 * @param {Element|Document} root - Parent element to attach listener to
 * @param {string} selector - CSS selector for target elements (use data attributes)
 * @param {string} type - Event type (e.g., "click", "change", "submit")
 * @param {Function} handler - Event handler function (ev, el) => void
 * @param {Object} [options={}] - Event listener options
 * @param {boolean} [options.capture=false] - Use capture phase
 * @returns {void}
 *
 * @example
 * // Listen for clicks on buttons with data-action attribute
 * on(document, '[data-action="roll"]', 'click', (ev, el) => {
 *   console.log('Roll button clicked', el);
 * });
 *
 * @example
 * // Listen for changes on select elements
 * on(form, 'select[data-field]', 'change', (ev, el) => {
 *   const field = el.dataset.field;
 *   console.log(`Field ${field} changed to ${el.value}`);
 * });
 */
export function on(root, selector, type, handler, options = {}) {
  // Defensive validation: ensure root is valid EventTarget
  if (!root?.addEventListener) {
    logError("on() requires valid EventTarget root", new TypeError("Invalid root"), { root });
    return;
  }

  // Defensive validation: ensure handler is callable
  if (typeof handler !== "function") {
    logError("on() requires function handler", new TypeError("Invalid handler"), { handler });
    return;
  }

  // Defensive validation: ensure selector is valid string
  if (typeof selector !== "string" || !selector) {
    logError("on() requires non-empty string selector", new TypeError("Invalid selector"), {
      selector
    });
    return;
  }

  const useCapture = options.capture ?? false;

  root.addEventListener(
    type,
    ev => {
      let el = null;
      // Only process events from Element nodes (not text nodes, etc.)
      if (ev.target instanceof Element) {
        try {
          // Find closest ancestor (including target) matching selector
          el = ev.target.closest(selector);
        } catch (e) {
          // Invalid selector syntax - log and skip
          logError("on() invalid selector caused closest() error", e, { selector });
          return;
        }
      }
      // Only call handler if matching element found and is within root
      if (el && root.contains(el)) {
        handler(ev, el);
      }
    },
    useCapture
  );
}
