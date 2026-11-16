/**
 * @module utils/validators
 * @description Input validation utilities for L5R4 system.
 *
 * Provides validation functions that return structured results:
 * { valid: boolean, error?: string, sanitized?: any }
 *
 * Used to validate user input before processing or storing.
 */

import { MAX_EMPHASIS_LENGTH, MIN_EMPHASIS_LENGTH } from "../config/reference-data.js";
import { MAX_RAISES } from "../config/game-mechanics.js";
import { toNumber } from "./type-coercion.js";

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
 * So "Katana" and "Notice" are valid; "" and "Invalid@Name" are not, each with its error.
 * @param {string} emphasisName - Emphasis name to validate
 * @returns {{valid: boolean, error?: string}} Validation result: whether it is valid, and the error message if not
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
 * the Raises claimed in chat/damage application match the Raises
 * declared during the attack roll.
 *
 * Validation rules:
 * - Both values must be finite numbers
 * - Range: 0-20 (reasonable maximum)
 * - Values must match exactly (prevents cheating)
 *
 * So 2 claimed against 2 stored is valid with 2 sanitized; 3 against 2 is a mismatch; 25 against 25 is out of
 * range.
 * @param {number} claimedRaises - Raises claimed for damage/effect
 * @param {number} storedRaises - Raises from original attack roll
 * @returns {{valid: boolean, error?: string, sanitized?: number}} Validation result: whether it is valid, the
 *   error message if not, and the validated Raises value if it is
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
