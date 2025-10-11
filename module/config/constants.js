/**
 * @fileoverview L5R4 System Constants
 * 
 * Core system identifiers and path constants used throughout the L5R4 system.
 * These values form the foundation of the system's file structure and naming.
 * 
 * **Responsibilities:**
 * - Define system identifier (SYS_ID)
 * - Provide root path constants
 * - Define common directory paths
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

/**
 * Helper alias for Object.freeze to improve readability.
 * @type {typeof Object.freeze}
 * @private
 */
const freeze = Object.freeze;

/**
 * System identifier constant for L5R4 system.
 * Used for settings registration, flag namespacing, and module identification.
 * @constant {string}
 * @example
 * // Register a system setting
 * game.settings.register(SYS_ID, "myKey", { ... });
 * 
 * @example
 * // Store actor flag
 * actor.setFlag(SYS_ID, "customData", value);
 */
export const SYS_ID = "l5r4-enhanced";

/**
 * Root path for the L5R4 system directory.
 * Used for constructing absolute paths to system resources.
 * @constant {string}
 * @example
 * import { ROOT } from './config/constants.js';
 * const langPath = `${ROOT}/lang/en.json`;
 */
export const ROOT = `systems/${SYS_ID}`;

/**
 * @typedef {Object} SystemPaths
 * @property {string} templates - Path to Handlebars templates directory
 * @property {string} assets - Path to system assets directory
 * @property {string} icons - Path to icon assets directory
 */

/**
 * Common path constants for system directories.
 * Used throughout the system for consistent path resolution.
 * @constant {Readonly<SystemPaths>}
 * @example
 * import { PATHS } from './config/constants.js';
 * const templatePath = `${PATHS.templates}/actor/character.hbs`;
 */
export const PATHS = freeze({
  templates: `${ROOT}/templates`,
  assets: `${ROOT}/assets`,
  icons: `${ROOT}/assets/icons`
});
