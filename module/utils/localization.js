/**
 * Localization Utility Module
 *
 * Provides defensive wrappers around Foundry VTT's i18n system for safe
 * localization key lookups, string formatting, and template rendering.
 *
 * Implements defensive type checking and validation to prevent runtime errors
 * from invalid keys or data. All functions handle edge cases gracefully with
 * console warnings and fallback behavior.
 *
 * The terse function names (T, F, R) follow common i18n patterns:
 * - T = Translate: Simple key lookup
 * - F = Format: Variable substitution in translations
 * - R = Render: Handlebars template rendering
 *
 * Requires Foundry VTT v10+ for:
 * - game.i18n.localize() - Translation key resolution
 * - game.i18n.format() - String interpolation with data objects
 * - foundry.applications.handlebars.renderTemplate() - Template rendering
 *
 * @module utils/localization
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Localization.html|Foundry Localization API}
 */

/**
 * Validate and coerce a localization key to string.
 *
 * Implements defensive type checking to prevent Foundry API errors from
 * non-string keys. Handles edge cases:
 * - null/undefined: Coerced to empty string
 * - Symbols: Logged as warning, coerced to empty string
 * - Numbers/booleans: Coerced to string representation
 *
 * @param {*} key - Value to validate as localization key
 * @param {string} fnName - Calling function name for warning messages
 * @returns {string} Validated string key (may be empty string if invalid)
 * @private
 */
const validateKey = (key, fnName) => {
  if (typeof key !== "string") {
    console.warn(`L5R4 | ${fnName}() requires string key, got:`, typeof key, key);
    return String(key ?? "");
  }
  return key;
};

/**
 * Translate a localization key to its string value.
 *
 * Wrapper around game.i18n.localize() with defensive key validation.
 * Handles invalid keys gracefully by coercing to string and logging warnings.
 *
 * Use this for simple translation lookups without variable substitution.
 * For translations with placeholders, use F() instead.
 *
 * @param {string} key - Localization key (e.g., "L5R4.traits.stamina")
 * @returns {string} Translated string, or the key itself if translation not found
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Localization.html#localize|game.i18n.localize}
 */
export const T = key => {
  const validKey = validateKey(key, "T");
  return game.i18n.localize(validKey);
};

/**
 * Format a localization string with variable substitution.
 *
 * Wrapper around game.i18n.format() with defensive validation of both
 * key and data parameters. If data is invalid, falls back to T() for
 * simple translation without substitution.
 *
 * Use this for translations containing placeholders like {name}, {count}, etc.
 * For simple lookups without variables, use T() instead.
 *
 * Foundry's format() replaces {key} placeholders with values from data object.
 *
 * @param {string} key - Localization key with placeholders (e.g., "L5R4.messages.xpGained")
 * @param {Object} data - Object containing substitution values (e.g., {amount: 5, reason: "quest"})
 * @returns {string} Formatted string with substitutions, or fallback translation if data invalid
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Localization.html#format|game.i18n.format}
 */
export const F = (key, data) => {
  const validKey = validateKey(key, "F");
  // Data must be non-null object for format() variable substitution
  // Fall back to simple translation if invalid to prevent Foundry errors
  if (typeof data !== "object" || data === null) {
    console.warn("L5R4 | F() requires object data, got:", typeof data, data);
    return T(validKey);
  }
  return game.i18n.format(validKey, data);
};

/**
 * Render a Handlebars template with provided data.
 *
 * Wrapper around foundry.applications.handlebars.renderTemplate() with
 * strict path validation. Unlike T() and F(), this throws TypeError for
 * invalid paths since template rendering errors should fail fast.
 *
 * Use this for rendering complex UI fragments from .hbs template files.
 * For simple text translations, use T() or F() instead.
 *
 * @param {string} path - Template file path relative to system root (e.g., "systems/l5r4-enhanced/templates/chat/roll.hbs")
 * @param {Object} [data={}] - Context data object passed to template
 * @returns {Promise<string>} Rendered HTML string
 * @throws {TypeError} If path is not a string
 *
 * @see {@link https://foundryvtt.com/api/v13/namespaces/foundry.applications.handlebars.html#renderTemplate|renderTemplate}
 */
export const R = (path, data) => {
  if (typeof path !== "string") {
    throw new TypeError(`L5R4 | R() requires string path, got: ${typeof path}`);
  }
  return foundry.applications.handlebars.renderTemplate(path, data);
};
