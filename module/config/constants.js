/**
 * @file System-wide constants for L5R4 Enhanced
 * @module config/constants
 *
 * Provides immutable configuration values used throughout the system.
 * All path constants are relative to Foundry's systems directory.
 *
 * @see {@link https://foundryvtt.com/api/modules/foundry.html#.CONST|Foundry Constants}
 */

const freeze = Object.freeze;

/**
 * System identifier used in Foundry VTT registration and paths.
 * Must match the system.json "id" field.
 * @type {string}
 * @constant
 */
export const SYS_ID = "l5r4-enhanced";

/**
 * Root path to system directory within Foundry's systems folder.
 * Used as base for all asset and template paths.
 * @type {string}
 * @constant
 * @example
 * // Resolves to: "systems/l5r4-enhanced"
 */
export const ROOT = `systems/${SYS_ID}`;

/**
 * Immutable path constants for system resources.
 * All paths are relative to Foundry's root directory.
 * @type {Object<string, string>}
 * @constant
 * @property {string} templates - Path to Handlebars templates directory
 * @property {string} assets - Path to general assets directory
 * @property {string} icons - Path to icon assets directory
 */
export const PATHS = freeze({
  templates: `${ROOT}/templates`,
  assets: `${ROOT}/assets`,
  icons: `${ROOT}/assets/icons`
});

/**
 * Flag key for tracking system migration version on actors and items.
 * Stored in document flags under the system namespace.
 * @type {string}
 * @constant
 * @example
 * // Access migration version:
 * // actor.getFlag(SYS_ID, MIGRATION_FLAG)
 */
export const MIGRATION_FLAG = "migratedVersion";
