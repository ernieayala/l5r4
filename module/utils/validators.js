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
 * Allowed characters for emphasis names: letters and numbers in any script with their accents, so a table names one
 * in its own language, and spaces, hyphens, apostrophes, and colons, which Lore Skills use (#188).
 * @constant {RegExp}
 */
const EMPHASIS_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s\-':]+$/u;

/**
 * Validates skill emphasis name.
 *
 * In L5R4, skills can have emphases (specializations) that provide bonuses
 * in specific situations. Example: Kenjutsu (Katana), Investigation (Notice).
 *
 * Validation rules, on the trimmed name:
 * - Length: 1-100 characters
 * - Characters: letters and numbers in any script, spaces, hyphens, apostrophes, colons only
 * - Not already among the given names
 *
 * So "Katana" and "Notice" are valid; "", "Invalid@Name", and a name already listed are not, each with its error.
 * @param {string} emphasisName - The name typed (the custom Emphasis dialog's field)
 * @param {string[]} [existing=[]] - The names it may not repeat: the world's other custom Emphases
 * @returns {{valid: boolean, error?: string, data?: object, sanitized?: string}} Validation result: whether it is
 *   valid, the error's i18n key and its placeholder data if not, and the trimmed name if it is
 */
export function validateEmphasisName(emphasisName, existing = []) {
  const trimmed = emphasisName.trim();
  if (trimmed.length < MIN_EMPHASIS_LENGTH || trimmed.length > MAX_EMPHASIS_LENGTH) {
    return {
      valid: false,
      error: "l5r4.apps.emphasisManager.errors.nameLength",
      data: { min: MIN_EMPHASIS_LENGTH, max: MAX_EMPHASIS_LENGTH }
    };
  }
  if (!EMPHASIS_NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: "l5r4.apps.emphasisManager.errors.nameCharacters", data: {} };
  }
  if (existing.includes(trimmed)) {
    return {
      valid: false,
      error: "l5r4.apps.emphasisManager.errors.nameTaken",
      data: { name: trimmed }
    };
  }
  return { valid: true, sanitized: trimmed };
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
 * @returns {{valid: boolean, error?: string, data?: object, sanitized?: number}} Validation result: whether it is
 *   valid, the error's i18n key and its placeholder data if not, and the validated Raises value if it is
 */
export function validateAttackRaises(claimedRaises, storedRaises) {
  const claimed = toNumber(claimedRaises);
  const stored = toNumber(storedRaises);
  // Ensure both are valid numbers
  if (!Number.isFinite(claimed) || !Number.isFinite(stored)) {
    return {
      valid: false,
      error: "l5r4.ui.combat.errors.raisesInvalid",
      data: {}
    };
  }
  // Range check (0-MAX_RAISES is reasonable maximum)
  if (claimed < 0 || claimed > MAX_RAISES || stored < 0 || stored > MAX_RAISES) {
    return {
      valid: false,
      error: "l5r4.ui.combat.errors.raisesOutOfRange",
      data: { max: MAX_RAISES }
    };
  }
  // Verify claimed Raises match stored value (anti-cheat)
  if (claimed !== stored) {
    return {
      valid: false,
      error: "l5r4.ui.combat.errors.raisesMismatch",
      data: { claimed, stored }
    };
  }
  return {
    valid: true,
    sanitized: stored
  };
}
