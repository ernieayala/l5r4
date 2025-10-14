/**
 * Type Coercion Utilities
 *
 * Defensive type coercion functions for safely converting user input and DOM data
 * to numeric types. Core utilities for Foundry VTT v13+ ActorSheetV2 pattern,
 * particularly for parsing dataset attributes and sanitizing form inputs.
 *
 * Key Responsibilities:
 * - **Defensive Coercion**: Handle null, undefined, empty strings, symbols gracefully
 * - **DOM Dataset Parsing**: Convert string dataset attributes (data-roll="3") to integers
 * - **Form Data Sanitization**: Coerce user input with safe fallbacks
 * - **Bounds Enforcement**: Constrain numeric values to valid game ranges
 *
 * Foundry VTT Integration:
 * - Used extensively in ActorSheetV2._prepareContext for data preparation
 * - Powers DOM event delegation pattern (parsing data-action attributes)
 * - Handles _prepareSubmitData type coercion (case "Integer": toInt(value))
 * - Safe for reading actor.system and item.system properties with optional chaining
 *
 * @module utils/type-coercion
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html|Foundry ApplicationV2}
 */

/**
 * Safely coerce any value to an integer with fallback.
 *
 * Defensive utility that handles edge cases common in Foundry VTT sheets:
 * - Null/undefined from missing actor.system properties → fallback
 * - Empty/whitespace strings from DOM inputs → fallback
 * - Symbols (cannot be coerced) → fallback
 * - Invalid numeric strings ("abc") → fallback
 * - Valid numeric strings ("42", " 3 ") → integer
 *
 * Commonly used for:
 * - Parsing DOM dataset attributes: toInt(element.dataset.roll)
 * - Reading system properties: toInt(item.system?.rank)
 * - Form data coercion: toInt(formData.get("rank"), 0)
 *
 * **Why not Number() or Number.parseInt() directly?**
 * - Number() treats empty string as 0, not fallback
 * - Number.parseInt() doesn't trim whitespace automatically
 * - Neither handles symbols safely (would throw or return NaN)
 * - This utility provides consistent fallback behavior
 *
 * @param {*} v - Value to coerce (any type accepted)
 * @param {number} [fallback=0] - Value to return if coercion fails
 * @returns {number} Integer value or fallback
 */
export function toInt(v, fallback = 0) {
  if (typeof v === "symbol") {
    return fallback;
  }
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Clamp a numeric value within an inclusive [min, max] range.
 *
 * Defensive utility that constrains values to valid bounds, handling all edge cases:
 * - Invalid inputs (null, undefined, "", NaN) → 0
 * - Value below min → min
 * - Value above max → max
 * - Value within range → value
 *
 * All three parameters (value, min, max) are coerced to numbers. If any parameter
 * cannot be coerced (results in NaN), the function returns 0 as a safe default.
 *
 * Commonly used for:
 * - Void points constraints: clamp(current + delta, 0, 9)
 * - Trait rank bounds: clamp(newValue, minRank, maxRank)
 * - User input sanitization in ActorSheetV2 forms
 *
 * **L5R4 Game Rules:**
 * Most character attributes have bounds (traits 1-10, void points 0-9, etc.).
 * This utility enforces those constraints automatically.
 *
 * @param {*} value - Value to clamp (will be coerced to number)
 * @param {*} min - Minimum allowed value (will be coerced to number)
 * @param {*} max - Maximum allowed value (will be coerced to number)
 * @returns {number} Clamped value within [min, max], or 0 if any parameter is NaN
 */
export function clamp(value, min, max) {
  const n = Number(value);
  const minVal = Number(min);
  const maxVal = Number(max);
  if (Number.isNaN(n) || Number.isNaN(minVal) || Number.isNaN(maxVal)) {
    return 0;
  }
  return Math.max(minVal, Math.min(maxVal, n));
}
