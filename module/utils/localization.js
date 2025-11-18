/**
 * @module localization
 * @description Localization and template rendering utilities for L5R4 system.
 *
 * Provides short-named wrappers around Foundry's i18n and template APIs:
 * - T() - Translate a localization key
 * - F() - Format a translation with variable substitution
 * - R() - Render a Handlebars template
 *
 * All functions include defensive validation to prevent Foundry errors
 * from invalid inputs. Translation keys should be in format:
 * "L5R4.path.to.translation"
 */

import { SYS_ID } from "../config/constants.js";
import { logError } from "./error-logging.js";

/**
 * Validates and coerces translation key to string.
 *
 * @param {*} key - Translation key to validate
 * @param {string} fnName - Function name for error messages
 * @returns {string} Valid string key
 * @private
 */
const validateKey = (key, fnName) => {
  if (typeof key !== "string") {
    logError(`${fnName}() requires string key`, new TypeError("Invalid key type"), {
      keyType: typeof key,
      key
    });
    // Coerce to string to prevent Foundry errors
    return String(key ?? "");
  }
  return key;
};

/**
 * Translates a localization key.
 *
 * Wrapper around game.i18n.localize() with defensive validation.
 * Returns the translated string, or the key itself if translation not found.
 *
 * @param {string} key - Translation key (e.g., "L5R4.skills.athletics")
 * @returns {string} Translated string
 *
 * @example
 * T("L5R4.skills.athletics") // "Athletics"
 * T("L5R4.traits.strength") // "Strength"
 */
export const T = key => {
  const validKey = validateKey(key, "T");
  // Use Foundry's i18n API to get translated string
  return game.i18n.localize(validKey);
};

/**
 * Formats a translation with variable substitution.
 *
 * Wrapper around game.i18n.format() with defensive validation.
 * Replaces {variable} placeholders in translation with data values.
 *
 * @param {string} key - Translation key with placeholders (e.g., "L5R4.messages.rolled")
 * @param {Object} data - Object with values for placeholder substitution
 * @returns {string} Formatted translated string
 *
 * @example
 * // Translation: "L5R4.messages.rolled": "{name} rolled {result}"
 * F("L5R4.messages.rolled", { name: "Hida Bushi", result: 25 })
 * // Returns: "Hida Bushi rolled 25"
 *
 * @example
 * // With multiple variables
 * F("L5R4.messages.damage", { amount: 10, target: "Goblin" })
 * // Returns formatted string with substituted values
 */
export const F = (key, data) => {
  const validKey = validateKey(key, "F");

  // Data must be non-null object for format() variable substitution
  // Fall back to simple translation if invalid to prevent Foundry errors
  if (typeof data !== "object" || data === null) {
    logError("F() requires object data", new TypeError("Invalid data type"), {
      dataType: typeof data,
      data
    });
    return T(validKey);
  }

  // Use Foundry's i18n API to format translation with variable substitution
  return game.i18n.format(validKey, data);
};

/**
 * Renders a Handlebars template.
 *
 * Wrapper around Foundry's renderTemplate() with validation.
 * Throws TypeError if path is not a string.
 *
 * @param {string} path - Template path relative to system root (e.g., "templates/actor/pc.hbs")
 * @param {Object} [data] - Data context for template rendering
 * @returns {Promise<string>} Rendered HTML string
 * @throws {TypeError} If path is not a string
 *
 * @example
 * // Render actor sheet template
 * const html = await R("templates/actor/pc.hbs", { actor, editable: true });
 *
 * @example
 * // Render chat message template
 * const html = await R("templates/chat/damage-roll.hbs", {
 *   damage: 15,
 *   target: "Goblin"
 * });
 */
export const R = (path, data) => {
  // Strict validation - throw error for invalid path
  if (typeof path !== "string") {
    throw new TypeError(`${SYS_ID} | R() requires string path, got: ${typeof path}`);
  }

  // Use Foundry's Handlebars API to render template
  return foundry.applications.handlebars.renderTemplate(path, data);
};
