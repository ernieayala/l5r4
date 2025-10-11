/**
 * @fileoverview L5R4 Localization & Template Utilities
 * 
 * Provides wrapper functions for Foundry VTT's internationalization (i18n) and
 * Handlebars template rendering systems. These utilities simplify common operations
 * and provide consistent patterns across the L5R4 system.
 * 
 * **Core Responsibilities:**
 * - **Translation**: Simple and formatted string localization
 * - **Template Rendering**: Handlebars template compilation and rendering
 * 
 * **Design Principles:**
 * - **Minimal Wrappers**: Thin abstraction over Foundry APIs
 * - **Consistency**: Uniform naming (T/F/R) across the system
 * - **Type Safety**: Clear JSDoc parameter and return types
 * 
 * **Usage Examples:**
 * ```javascript
 * // Simple translation
 * const cancelText = T("l5r4.ui.common.cancel");
 * 
 * // Formatted translation with parameters
 * const message = F("l5r4.messages.xp-gained", { amount: 5 });
 * 
 * // Render a template
 * const html = await R("templates/chat/simple-roll.hbs", { roll: rollData });
 * ```
 * 
 * **When to Use Each Function:**
 * - **T()**: Static translations without variables (labels, buttons, headers)
 * - **F()**: Dynamic translations with variables (messages, formatted text)
 * - **R()**: Complex HTML rendering with logic (sheets, chat cards, dialogs)
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @see {@link https://foundryvtt.com/api/classes/game.Game.html#i18n|Foundry i18n}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 * @see {@link https://handlebarsjs.com/|Handlebars Template Engine}
 */

/**
 * Localize a translation key.
 * Wrapper around game.i18n.localize for consistent system-wide usage.
 * 
 * **Behavior Notes:**
 * - Returns the key itself if translation is not found
 * - Never throws errors; safe for all contexts
 * - Coerces non-string keys to empty string with warning
 * 
 * @param {string} key - The i18n key to localize (e.g., "l5r4.ui.common.cancel")
 * @returns {string} The localized string
 * @example
 * const label = T("l5r4.ui.mechanics.traits.sta"); // "Stamina"
 * 
 * @integration-test Scenario: Verify Foundry i18n.localize behavior
 * @integration-test Reason: Unit tests mock game.i18n.localize completely
 * @integration-test Validates: Key fallback behavior, special character handling, actual translation lookup
 */
export const T = (key) => {
  if (typeof key !== 'string') {
    console.warn('L5R4 | T() requires string key, got:', typeof key, key);
    return String(key ?? '');
  }
  return game.i18n.localize(key);
};

/**
 * Localize a translation key with formatting data.
 * Wrapper around game.i18n.format for parameterized translations.
 * 
 * **Behavior Notes:**
 * - Returns the key itself if translation is not found
 * - Data properties are interpolated into {placeholders} in the translation string
 * - Never throws errors; safe for all contexts
 * - Falls back to unformatted localization if data is invalid
 * 
 * @param {string} key - The i18n key to localize
 * @param {Record<string, any>} data - Data object for string interpolation (key-value pairs)
 * @returns {string} The formatted localized string
 * @example
 * const msg = F("l5r4.messages.xp-gained", { amount: 5 });
 * // "You gained 5 XP"
 * @example
 * // Translation string: "Roll {skill} + {trait}"
 * const text = F("l5r4.roll.formula", { skill: "Kenjutsu", trait: "Agility" });
 * // "Roll Kenjutsu + Agility"
 * 
 * @integration-test Scenario: Verify Foundry i18n.format placeholder interpolation
 * @integration-test Reason: Unit tests mock game.i18n.format completely
 * @integration-test Validates: Actual {placeholder} substitution, nested data handling, type coercion
 */
export const F = (key, data) => {
  if (typeof key !== 'string') {
    console.warn('L5R4 | F() requires string key, got:', typeof key, key);
    return String(key ?? '');
  }
  if (typeof data !== 'object' || data === null) {
    console.warn('L5R4 | F() requires object data, got:', typeof data, data);
    return game.i18n.localize(key);
  }
  return game.i18n.format(key, data);
};

/**
 * Render a Handlebars template using Foundry's v13+ namespaced API.
 * Asynchronous wrapper around Foundry's template rendering system.
 * 
 * **Path Resolution:**
 * - Path should be relative to the Foundry root directory
 * - System templates typically start with "systems/l5r4-enhanced/templates/"
 * - Use full extension (.hbs) in path
 * 
 * **Error Handling:**
 * - Throws error if template file is not found
 * - Throws error if template compilation fails
 * - Throws error if path is not a string
 * - Always await and handle potential rejections
 * 
 * @param {string} path - Template path relative to the system
 * @param {Record<string, any>} data - Template context data (variables accessible in template)
 * @returns {Promise<string>} Rendered HTML string
 * @throws {Error} If template not found or compilation fails
 * @throws {TypeError} If path is not a string
 * @see https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html
 * @example
 * const html = await R("templates/chat/weapon-chat.hbs", {
 *   weapon: weaponData,
 *   roll: rollResult
 * });
 * @example
 * // With error handling
 * try {
 *   const html = await R("templates/actor/_partials/skills.hbs", { skills });
 * } catch (err) {
 *   console.error("L5R4 | Template render failed:", err);
 * }
 * 
 * @integration-test Scenario: Verify Foundry template rendering with real .hbs files
 * @integration-test Reason: Unit tests mock renderTemplate completely
 * @integration-test Validates: Path resolution, Handlebars compilation, helper registration, error types
 */
export const R = (path, data) => {
  if (typeof path !== 'string') {
    throw new TypeError(`L5R4 | R() requires string path, got: ${typeof path}`);
  }
  return foundry.applications.handlebars.renderTemplate(path, data);
};
