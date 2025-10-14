/**
 * System Constants
 * Defines core system identifiers and resource paths for L5R4 Enhanced system.
 * Used throughout the codebase for consistent resource references and Foundry integration.
 * 
 * Foundry VTT Requirements:
 * - SYS_ID must match the ID in system.json manifest
 * - Paths follow Foundry's standard systems directory structure
 * 
 * @module config/constants
 * @requires Foundry VTT v13+
 */

/**
 * System identifier matching the ID in system.json manifest.
 * Used for settings registration (game.settings.register), flags storage (actor.flags[SYS_ID]),
 * and all Foundry API calls requiring system identification.
 * 
 * @constant {string}
 */
export const SYS_ID = "l5r4-enhanced";

/**
 * Root path for all system resources.
 * Constructed from Foundry's standard systems directory structure.
 * Used as base for building template, asset, and icon paths.
 * 
 * @constant {string}
 */
export const ROOT = `systems/${SYS_ID}`;

/**
 * Frozen object containing standard resource paths for templates, assets, and icons.
 * All paths are relative to Foundry's data directory and used for resource loading.
 * Frozen to prevent runtime modification and ensure path consistency across the system.
 * 
 * @constant {Object}
 * @property {string} templates - Path to Handlebars templates directory for sheet rendering
 * @property {string} assets - Path to general assets directory for images and media
 * @property {string} icons - Path to status effect and UI icons directory
 * @readonly
 */
export const PATHS = Object.freeze({
  templates: `${ROOT}/templates`,
  assets: `${ROOT}/assets`,
  icons: `${ROOT}/assets/icons`
});
