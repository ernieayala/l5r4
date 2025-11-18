/**
 * @module validators
 * @description Input validation utilities for L5R4 system.
 *
 * Provides validation functions that return structured results:
 * { valid: boolean, error?: string, sanitized?: any }
 *
 * Used to validate user input before processing or storing.
 */

import { toNumber } from "./type-coercion.js";
import { MAX_EMPHASIS_LENGTH, MIN_EMPHASIS_LENGTH } from "../config/reference-data.js";
import { MAX_RAISES } from "../config/game-mechanics.js";

/**
 * Allowed characters for emphasis names.
 * Permits: letters, numbers, spaces, hyphens, apostrophes.
 * @constant {RegExp}
 */
const EMPHASIS_NAME_PATTERN = /^[a-zA-Z0-9\s\-']+$/;

/**
 * Validates skill emphasis name.
 *
 * In L5R4, skills can have emphases (specializations) that provide bonuses
 * in specific situations. Example: Kenjutsu (Katana), Investigation (Notice).
 *
 * Validation rules:
 * - Must be string
 * - Length: 1-100 characters (after trimming)
 * - Characters: letters, numbers, spaces, hyphens, apostrophes only
 *
 * @param {string} emphasisName - Emphasis name to validate
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - True if valid
 * @returns {string} [return.error] - Error message if invalid
 *
 * @example
 * validateEmphasisName("Katana") // { valid: true }
 * validateEmphasisName("Notice") // { valid: true }
 * validateEmphasisName("") // { valid: false, error: "..." }
 * validateEmphasisName("Invalid@Name") // { valid: false, error: "Invalid characters..." }
 */
export function validateEmphasisName(emphasisName) {
  // Type check
  if (typeof emphasisName !== "string") {
    return {
      valid: false,
      error: "Emphasis name must be a string"
    };
  }
  const trimmed = emphasisName.trim();
  // Length check
  if (trimmed.length < MIN_EMPHASIS_LENGTH || trimmed.length > MAX_EMPHASIS_LENGTH) {
    return {
      valid: false,
      error: `Emphasis name must be ${MIN_EMPHASIS_LENGTH}-${MAX_EMPHASIS_LENGTH} characters`
    };
  }
  // Character validation
  if (!EMPHASIS_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid characters in emphasis name"
    };
  }
  return {
    valid: true
  };
}

/**
 * Validates attack Raises match between claim and stored value.
 *
 * In L5R4, players declare Raises before rolling. This validator ensures
 * the Raises claimed in chat/damage application match what was actually
 * declared during the attack roll.
 *
 * Validation rules:
 * - Both values must be finite numbers
 * - Range: 0-20 (reasonable maximum)
 * - Values must match exactly (prevents cheating)
 *
 * @param {number} claimedRaises - Raises claimed for damage/effect
 * @param {number} storedRaises - Raises from original attack roll
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - True if valid
 * @returns {string} [return.error] - Error message if invalid
 * @returns {number} [return.sanitized] - Validated Raises value if valid
 *
 * @example
 * validateAttackRaises(2, 2) // { valid: true, sanitized: 2 }
 * validateAttackRaises(3, 2) // { valid: false, error: "...mismatch..." }
 * validateAttackRaises(25, 25) // { valid: false, error: "...out of valid range..." }
 */
export function validateAttackRaises(claimedRaises, storedRaises) {
  const claimed = toNumber(claimedRaises);
  const stored = toNumber(storedRaises);
  // Ensure both are valid numbers
  if (!Number.isFinite(claimed) || !Number.isFinite(stored)) {
    return {
      valid: false,
      error: "Attack raises must be valid numbers"
    };
  }
  // Range check (0-MAX_RAISES is reasonable maximum)
  if (claimed < 0 || claimed > MAX_RAISES || stored < 0 || stored > MAX_RAISES) {
    return {
      valid: false,
      error: "Attack raises out of valid range (0-20)"
    };
  }
  // Verify claimed Raises match stored value (anti-cheat)
  if (claimed !== stored) {
    return {
      valid: false,
      error: `Attack raises mismatch: claimed ${claimed} but original roll had ${stored}`
    };
  }
  return {
    valid: true,
    sanitized: stored
  };
}
