/**
 * @module utils/dom
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
 * when the event target or its ancestors match the selector, such as clicks on `[data-action="roll"]` buttons
 * or changes on `select[data-field]` elements.
 * @param {Element|Document} root - Parent element to attach listener to
 * @param {string} type - Event type (e.g., "click", "change", "submit")
 * @param {object} listener
 * @param {string} listener.selector - CSS selector for target elements (use data attributes)
 * @param {Function} listener.handler - Event handler function (ev, el) => void
 * @param {boolean} [listener.capture=false] - Use capture phase
 * @returns {void}
 */
export function on(root, type, { selector, handler, capture = false }) {
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

  root.addEventListener(type, ev => onDelegatedEvent(ev, { root, selector, handler }), capture);
}

/**
 * Handle one event on the root: call the handler with the closest element matching the selector, when the event
 * came from an Element and that element is within the root.
 * @param {Event} ev - The event the root received
 * @param {object} listener
 * @param {Element|Document} listener.root - The element the listener is attached to
 * @param {string} listener.selector - CSS selector for target elements
 * @param {Function} listener.handler - Event handler function (ev, el) => void
 */
function onDelegatedEvent(ev, { root, selector, handler }) {
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
}
