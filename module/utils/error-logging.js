/**
 * @module error-logging
 * @description Centralized error logging utilities for L5R4 system.
 *
 * Provides consistent error logging with system ID prefix and structured metadata.
 * Uses console.warn instead of console.error to avoid triggering Foundry's
 * error notification UI for recoverable errors.
 *
 * All errors are logged with:
 * - System ID prefix for easy filtering in console
 * - Error object with message and stack trace
 * - Optional metadata for debugging context
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Logs error with system ID prefix and structured metadata.
 *
 * Uses console.warn to log errors without triggering Foundry's error UI.
 * Includes error message, stack trace, and optional metadata for debugging.
 *
 * @param {string} message - Human-readable error description
 * @param {Error|unknown} error - Error object or value that was thrown
 * @param {Object} [metadata={}] - Additional context for debugging
 * @returns {void}
 *
 * @example
 * // Log error with basic context
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   logError("Failed to perform risky operation", err);
 * }
 *
 * @example
 * // Log error with additional metadata
 * try {
 *   await actor.update(data);
 * } catch (err) {
 *   logError("Actor update failed", err, {
 *     actorId: actor.id,
 *     actorName: actor.name,
 *     data
 *   });
 * }
 */
export function logError(message, error, metadata = {}) {
  // Use console.warn to avoid triggering Foundry's error notification UI
  console.warn(`${SYS_ID}`, message, {
    err: error,
    errorMessage: error?.message,
    errorStack: error?.stack,
    ...metadata // Spread additional context for debugging
  });
}
