/**
 * Error Logging Utilities
 *
 * Provides standardized error logging functions for consistent error reporting
 * across the application. All error logs include error message, stack trace,
 * and relevant context metadata.
 *
 * @module utils/error-logging
 */

// Config imports
import { SYS_ID } from "../config/constants.js";

/**
 * Log an error with standardized format including error details and context.
 *
 * Logs to console.warn with system ID prefix, descriptive message, and metadata
 * including error message, stack trace, and any additional context fields.
 *
 * @param {string} message - Descriptive error message
 * @param {Error} error - The error object to log
 * @param {object} [metadata={}] - Additional context metadata (actorId, itemId, etc.)
 *
 * @example
 * try {
 *   await actor.update(data);
 * } catch (err) {
 *   logError("Failed to update actor", err, {
 *     actorId: this.actor?.id,
 *     field: "wounds",
 *     value: 10
 *   });
 * }
 */
export function logError(message, error, metadata = {}) {
  console.warn(`${SYS_ID}`, message, {
    err: error,
    errorMessage: error?.message,
    errorStack: error?.stack,
    ...metadata
  });
}
