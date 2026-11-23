/**
 * @module utils/localization
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
 * The key of a plural group's leaf for a count: the Intl plural category of the count in the user's language
 * (docs/design-system/content/localization.md, Plurals). A category no lang file defines reads `other`, because
 * `lang/en.json` defines only `one` and `other` and a translation holds no key `lang/en.json` lacks, so Russian's
 * `few` and `many` would otherwise show the raw key.
 * @param {{pluralRules: Intl.PluralRules, has: (key: string) => boolean}} i18n - The localization, `game.i18n`
 * @param {number} count - The count that picks the plural
 * @param {(category: string) => string} keyOf - The leaf key for a category
 * @returns {string} The key to localize
 */
export function pluralKeyOf(i18n, count, keyOf) {
  const key = keyOf(i18n.pluralRules.select(count));
  return i18n.has(key) ? key : keyOf("other");
}

/**
 * Translates a localization key.
 *
 * Wrapper around game.i18n.localize() with defensive validation.
 * Returns the translated string, or the key itself if translation not found: "L5R4.skills.athletics" reads
 * "Athletics".
 * @param {string} key - Translation key (e.g., "L5R4.skills.athletics")
 * @returns {string} Translated string
 */
export function T(key) {
  const validKey = validateKey(key, "T");
  // Use Foundry's i18n API to get translated string
  return game.i18n.localize(validKey);
}

/**
 * Formats a translation with variable substitution.
 *
 * Wrapper around game.i18n.localize() with defensive validation.
 * Replaces {variable} placeholders in translation with data values: "{name} rolled {result}" with a name of
 * "Hida Bushi" and a result of 25 reads "Hida Bushi rolled 25".
 * @param {string} key - Translation key with placeholders (e.g., "L5R4.messages.rolled")
 * @param {object} data - Object with values for placeholder substitution
 * @returns {string} Formatted translated string
 */
export function F(key, data) {
  const validKey = validateKey(key, "F");

  // Data must be a non-null object for localize() variable substitution
  // Fall back to simple translation if invalid to prevent Foundry errors
  if (typeof data !== "object" || data === null) {
    logError("F() requires object data", new TypeError("Invalid data type"), {
      dataType: typeof data,
      data
    });
    return T(validKey);
  }

  // Use Foundry's i18n API to format translation with variable substitution
  return game.i18n.localize(validKey, data);
}

/**
 * Localizes a phrase: a key and its data, where a data value may itself be a phrase, localized first
 * (module/utils/rule-summary.js). The TraitAdjust summary with an Agility phrase and "+1" reads "Agility +1".
 * @param {{key: string, data?: object}} phrase
 * @returns {string}
 */
export function formatPhrase(phrase) {
  const data = Object.fromEntries(
    Object.entries(phrase.data ?? {}).map(([name, value]) => [
      name,
      value && typeof value === "object" ? formatPhrase(value) : value
    ])
  );
  return F(phrase.key, data);
}

/**
 * Renders a Handlebars template.
 *
 * Wrapper around Foundry's renderTemplate() with validation.
 * Throws TypeError if path is not a string. A sheet renders "templates/actor/pc.hbs" with its actor; a chat card
 * renders its template with the card's data.
 * @param {string} path - Template path relative to system root (e.g., "templates/actor/pc.hbs")
 * @param {object} [data] - Data context for template rendering
 * @returns {Promise<string>} Rendered HTML string
 * @throws {TypeError} If path is not a string
 */
export function R(path, data) {
  // Strict validation - throw error for invalid path
  if (typeof path !== "string") {
    throw new TypeError(`${SYS_ID} | R() requires string path, got: ${typeof path}`);
  }

  // Use Foundry's Handlebars API to render template
  return foundry.applications.handlebars.renderTemplate(path, data);
}

/**
 * Validates and coerces translation key to string.
 * @param {*} key - Translation key to validate
 * @param {string} fnName - Function name for error messages
 * @returns {string} Valid string key
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
