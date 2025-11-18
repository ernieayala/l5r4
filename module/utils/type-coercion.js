/**
 * @module type-coercion
 * @description Defensive type coercion utilities.
 *
 * Provides safe conversion functions that handle edge cases (null, undefined,
 * symbols, NaN, invalid strings) with sensible fallbacks instead of throwing errors.
 *
 * Used throughout the system to safely coerce user input and data from Foundry.
 */

/**
 * Safely converts value to integer with fallback.
 *
 * Handles edge cases:
 * - Symbols: returns fallback
 * - Strings: trims whitespace before parsing
 * - Invalid numbers: returns fallback
 * - null/undefined: returns fallback
 *
 * @param {*} v - Value to convert
 * @param {number} [fallback=0] - Value to return if conversion fails
 * @returns {number} Parsed integer or fallback
 *
 * @example
 * toInt("42") // 42
 * toInt(" 5 ") // 5 (trimmed)
 * toInt("invalid") // 0 (fallback)
 * toInt(null, 10) // 10 (custom fallback)
 */
export function toInt(v, fallback = 0) {
  // Symbols cannot be converted to numbers
  if (typeof v === "symbol") {
    return fallback;
  }
  // Handle null/undefined explicitly (parseInt(null) returns NaN, but be consistent)
  if (v == null) {
    return fallback;
  }
  // Trim whitespace from strings before parsing
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number.parseInt(s, 10);
  // Return fallback if parsing failed
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Safely converts value to number with fallback.
 *
 * More permissive than toInt - allows decimals.
 * Handles edge cases:
 * - Symbols: returns fallback
 * - Strings: trims whitespace before parsing
 * - Invalid numbers: returns fallback
 * - null/undefined: returns fallback
 *
 * @param {*} v - Value to convert
 * @param {number} [fallback=0] - Value to return if conversion fails
 * @returns {number} Parsed number or fallback
 *
 * @example
 * toNumber("42.5") // 42.5
 * toNumber(" 3.14 ") // 3.14 (trimmed)
 * toNumber("invalid") // 0 (fallback)
 * toNumber(null, 10) // 10 (custom fallback)
 */
export function toNumber(v, fallback = 0) {
  // Symbols cannot be converted to numbers
  if (typeof v === "symbol") {
    return fallback;
  }
  // Handle null/undefined explicitly (Number(null) returns 0, not NaN)
  if (v == null) {
    return fallback;
  }
  // Trim whitespace from strings before parsing
  const s = typeof v === "string" ? v.trim() : v;
  const n = Number(s);
  // Return fallback if parsing failed
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Safely converts value to string with fallback.
 *
 * Handles edge cases:
 * - Symbols: returns fallback (cannot be converted to string)
 * - null/undefined: returns fallback
 * - All other values: converted to string
 *
 * @param {*} value - Value to convert
 * @param {string} [fallback=""] - Value to return if conversion fails
 * @returns {string} String value or fallback
 *
 * @example
 * toString(42) // "42"
 * toString(null) // "" (fallback)
 * toString(Symbol("test")) // "" (fallback)
 * toString(undefined, "N/A") // "N/A" (custom fallback)
 */
export function toString(value, fallback = "") {
  // Symbols and null/undefined cannot be safely converted
  if (value == null || typeof value === "symbol") {
    return fallback;
  }
  return String(value);
}

/**
 * Clamps value to range [min, max].
 *
 * Ensures value is between min and max (inclusive).
 * Returns 0 if any parameter is NaN.
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value or 0 if any parameter is NaN
 *
 * @example
 * clamp(5, 0, 10) // 5 (within range)
 * clamp(15, 0, 10) // 10 (clamped to max)
 * clamp(-5, 0, 10) // 0 (clamped to min)
 * clamp("invalid", 0, 10) // 0 (NaN fallback)
 */
export function clamp(value, min, max) {
  const n = Number(value);
  const minVal = Number(min);
  const maxVal = Number(max);
  // Return 0 if any parameter is invalid
  if (Number.isNaN(n) || Number.isNaN(minVal) || Number.isNaN(maxVal)) {
    return 0;
  }
  // Clamp to [min, max] range
  return Math.max(minVal, Math.min(maxVal, n));
}
