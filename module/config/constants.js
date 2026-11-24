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
 * Flag key for the migration schema a document is at, read as `doc.getFlag(SYS_ID, MIGRATION_FLAG)`: an integer
 * that each migration step raises a document past once (module/setup/migrations.js).
 * @type {string}
 * @constant
 */
export const MIGRATION_FLAG = "migrationSchema";

/**
 * Flag key of the system version 3.x and 4.0.0 marked a migrated document with; read only, to find the schema of a
 * document that has no MIGRATION_FLAG.
 * @type {string}
 * @constant
 */
export const LEGACY_MIGRATION_FLAG = "migratedVersion";

/**
 * The migration schema the current steps bring a document to. A new step takes the next number and raises this.
 * @type {number}
 * @constant
 */
export const MIGRATION_SCHEMA = 1;

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
