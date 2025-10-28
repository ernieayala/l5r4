/**
 * Input validation utilities
 *
 * Pure validation functions for user input sanitization and security.
 * Prevents XSS, injection attacks, and data corruption.
 *
 * @module utils/validators
 */

/**
 * Maximum allowed length for emphasis names
 * @type {number}
 */
const MAX_EMPHASIS_LENGTH = 100;

/**
 * Minimum allowed length for emphasis names
 * @type {number}
 */
const MIN_EMPHASIS_LENGTH = 1;

/**
 * Allowed characters for emphasis names: alphanumeric, spaces, hyphens, apostrophes
 * @type {RegExp}
 */
const EMPHASIS_NAME_PATTERN = /^[a-zA-Z0-9\s\-']+$/;

/**
 * Validate emphasis name for security and data integrity.
 *
 * Prevents XSS attacks and data corruption by enforcing:
 * - Length limits (1-100 characters)
 * - Character restrictions (alphanumeric, spaces, hyphens, apostrophes only)
 * - No HTML/script tags
 * - No special characters that could cause issues
 *
 * @param {string} emphasisName - Name to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 *
 * @example
 * validateEmphasisName("Courtier")
 * // Returns: { valid: true }
 *
 * @example
 * validateEmphasisName("<script>alert('xss')</script>")
 * // Returns: { valid: false, error: "Invalid characters in emphasis name" }
 *
 * @example
 * validateEmphasisName("A".repeat(200))
 * // Returns: { valid: false, error: "Emphasis name must be 1-100 characters" }
 */
export function validateEmphasisName(emphasisName) {
  // Type check
  if (typeof emphasisName !== "string") {
    return {
      valid: false,
      error: "Emphasis name must be a string"
    };
  }

  // Trim whitespace
  const trimmed = emphasisName.trim();

  // Length validation
  if (trimmed.length < MIN_EMPHASIS_LENGTH || trimmed.length > MAX_EMPHASIS_LENGTH) {
    return {
      valid: false,
      error: `Emphasis name must be ${MIN_EMPHASIS_LENGTH}-${MAX_EMPHASIS_LENGTH} characters`
    };
  }

  // Character validation - prevent XSS and injection
  if (!EMPHASIS_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid characters in emphasis name"
    };
  }

  // Valid
  return {
    valid: true
  };
}

/**
 * Validate attack raises against original roll data to prevent HTML injection exploits.
 *
 * Security: Prevents attackers from manually editing chat card HTML to inject
 * arbitrary raise values. Validates that raises claimed in damage roll match
 * the raises stored in the original attack roll's chat message flags.
 *
 * L5R4 Rules: Maximum raises per roll equals Void Ring (typically 1-5).
 * System enforces max 20 raises as safety cap for edge cases.
 *
 * @param {number} claimedRaises - Raises value from chat card HTML (untrusted)
 * @param {number} storedRaises - Raises value from message flags (trusted)
 * @returns {{valid: boolean, error?: string, sanitized?: number}} Validation result
 *
 * @example
 * validateAttackRaises(2, 2)
 * // Returns: { valid: true, sanitized: 2 }
 *
 * @example
 * validateAttackRaises(10, 2)
 * // Returns: { valid: false, error: "Attack raises mismatch: claimed 10 but original roll had 2" }
 *
 * @example
 * validateAttackRaises("2", 2)
 * // Returns: { valid: true, sanitized: 2 } (coerces valid string to number)
 */
export function validateAttackRaises(claimedRaises, storedRaises) {
  // Coerce to numbers
  const claimed = Number(claimedRaises);
  const stored = Number(storedRaises);

  // Type validation
  if (!Number.isFinite(claimed) || !Number.isFinite(stored)) {
    return {
      valid: false,
      error: "Attack raises must be valid numbers"
    };
  }

  // Range validation (0-20 per system limits)
  if (claimed < 0 || claimed > 20 || stored < 0 || stored > 20) {
    return {
      valid: false,
      error: "Attack raises out of valid range (0-20)"
    };
  }

  // Security validation: claimed must match stored
  if (claimed !== stored) {
    return {
      valid: false,
      error: `Attack raises mismatch: claimed ${claimed} but original roll had ${stored}`
    };
  }

  // Valid
  return {
    valid: true,
    sanitized: stored
  };
}
