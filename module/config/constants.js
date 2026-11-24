/**
 * @module config/constants
 * @description System-wide constants for L5R4 Enhanced: the system id and the paths of its resources. All path
 * constants are relative to Foundry's systems directory.
 */

/**
 * System identifier used in Foundry VTT registration and paths.
 * Must match the system.json "id" field.
 * @type {string}
 * @constant
 */
export const SYS_ID = "l5r4-enhanced";

/**
 * The item types that are weapons: `weapon`, and the legacy `bow` type a world migration turns into one, still valid
 * in `system.json`.
 * @type {ReadonlyArray<string>}
 */
export const WEAPON_TYPES = Object.freeze(["weapon", "bow"]);

/**
 * Root path to system directory within Foundry's systems folder, `systems/l5r4-enhanced`.
 * Used as base for all asset and template paths.
 * @type {string}
 * @constant
 */
export const ROOT = `systems/${SYS_ID}`;

/**
 * Immutable path constants for system resources.
 * All paths are relative to Foundry's root directory.
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} templates - Path to Handlebars templates directory
 * @property {string} assets - Path to general assets directory
 * @property {string} icons - Path to icon assets directory
 */
export const PATHS = Object.freeze({
  templates: `${ROOT}/templates`,
  assets: `${ROOT}/assets`,
  icons: `${ROOT}/assets/icons`
});

/**
 * Flag key for tracking system migration version on actors and items, read as
 * `actor.getFlag(SYS_ID, MIGRATION_FLAG)`.
 * Stored in document flags under the system namespace.
 * @type {string}
 * @constant
 */
export const MIGRATION_FLAG = "migratedVersion";

/**
 * The system hook L5R4ActiveEffect fires with `(actor, effect)` for each effect it drops because the actor is immune
 * to the effect's status; module/hooks/register-all.js wires the notice to it.
 * @type {string}
 * @constant
 */
export const IMMUNE_STATUS_HOOK = `${SYS_ID}.immuneStatus`;

/**
 * The option a document change carries the socket id of the client that sent it under
 * (module/services/change-origin.js), read back by `isOwnChange` (module/utils/change-origin.js).
 * @type {string}
 * @constant
 */
export const CHANGE_ORIGIN_OPTION = `${SYS_ID}Origin`;
