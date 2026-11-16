/**
 * @module utils/type-coercion
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
 * So "42" gives 42, " 5 " gives 5, "invalid" gives 0, and null with a fallback of 10 gives 10.
 * @param {*} v - Value to convert
 * @param {number} [fallback=0] - Value to return if conversion fails
 * @returns {number} Parsed integer or fallback
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
 * So "42.5" gives 42.5, " 3.14 " gives 3.14, "invalid" gives 0, and null with a fallback of 10 gives 10.
 * @param {*} v - Value to convert
 * @param {number} [fallback=0] - Value to return if conversion fails
 * @returns {number} Parsed number or fallback
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
 * So 42 gives "42", null and a symbol give "", and undefined with a fallback of "N/A" gives "N/A".
 * @param {*} value - Value to convert
 * @param {string} [fallback=""] - Value to return if conversion fails
 * @returns {string} String value or fallback
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
 * Returns 0 if any parameter is NaN. Within 0-10, 5 stays 5, 15 becomes 10, -5 becomes 0, and "invalid"
 * gives 0.
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value or 0 if any parameter is NaN
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
