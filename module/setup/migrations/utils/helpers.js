/**
 * @module setup/migrations/utils/helpers
 * @description Shared helpers for the data migration steps: dot-path reads and writes, Wound Rank data
 * normalization, and the migration schema a document is at.
 */
import {
  SYS_ID,
  LEGACY_MIGRATION_FLAG,
  MIGRATION_FLAG,
  MIGRATION_SCHEMA
} from "../../../config/constants.js";

/** The first system version whose migration brought documents to schema 1. */
const SCHEMA_1_VERSION = "4.0.0";

/**
 * Retrieves a nested property value from an object using dot notation path.
 *
 * Walks the nested object structure and returns undefined, without throwing, when an
 * intermediate property is missing. Used by schema migration
 * functions to read legacy field locations before transformation.
 *
 * @param {object} obj - Source object to traverse
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armor_tn")
 * @returns {*} The value at the specified path, or undefined if path doesn't exist
 */
export function getByPath(obj, path) {
  try {
    return path
      .split(".")
      .reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch {
    return undefined;
  }
}

/**
 * Sets a nested property value on an object using dot notation path.
 *
 * Creates intermediate objects as needed when traversing the path, and mutates the
 * original object. Used by schema migrations to write transformed values to new field
 * locations while building update payloads.
 *
 * @param {object} obj - Target object to modify (mutated in place)
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armorTn")
 * @param {*} value - Value to assign at the target path
 * @returns {void}
 */
export function updateByPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") {
      cur[k] = {};
    }
    cur = cur[k];
  }
  cur[last] = value;
}

/**
 * Deletes a nested property from an object using dot notation path.
 *
 * Safely removes a property at any nesting level. Handles missing intermediate paths
 * gracefully without throwing errors. Used by schema migrations to clean up legacy
 * field names after copying their values to new locations.
 *
 * @param {object} obj - Target object to modify (mutated in place)
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armor_tn")
 * @returns {void}
 */
export function deleteByPath(obj, path) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur?.[k] === undefined) {
      return;
    }
    cur = cur[k];
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
  }
}

/**
 * Normalizes wound level data types and ensures penalties are positive values.
 *
 * Converts legacy string types to numbers and ensures wound penalties are stored as
 * positive absolute values (L5R4 represents penalties as positive TN increases, not
 * negative modifiers). Mutates the wound data object in place.
 *
 * L5R4 Wound Penalties:
 * - Nicked: +3 TN, Grazed: +5 TN, Hurt: +10 TN, Injured: +15 TN
 * - Crippled: +20 TN, Down: +40 TN
 * - Penalties increase the TN of all rolls, making actions harder.
 *
 * @param {object} woundData - Wound level data object with penalty/value properties (mutated)
 * @returns {boolean} True if any normalization changes were made, false otherwise
 */
export function migrateWoundLevelData(woundData) {
  let changed = false;

  for (const [_key, level] of Object.entries(woundData)) {
    if (typeof level.penalty === "string") {
      level.penalty = Math.abs(parseInt(level.penalty) || 0);
      changed = true;
    } else if (typeof level.penalty === "number" && level.penalty < 0) {
      level.penalty = Math.abs(level.penalty);
      changed = true;
    }

    if (typeof level.value === "string") {
      level.value = parseInt(level.value) || 0;
      changed = true;
    }
  }

  return changed;
}

/**
 * The migration schema a document's source is at (#181). Its MIGRATION_FLAG when set. Otherwise the version it was
 * migrated or saved with decides: 4.0.0 or later is schema 1, the steps 4.0.0 ran; earlier, or another system's,
 * is 0. A source with no version, or one saved by the running version, was made now and is current.
 * @param {object} source - A document's source, or its creation data
 * @param {string|null} [legacyVersion] - The version to read when the source has no LEGACY_MIGRATION_FLAG: for a
 *   Scene, which no runner marked, the version the world last migrated to (the `lastMigratedVersion` setting)
 * @returns {number}
 */
export function getMigrationSchema(source, legacyVersion = null) {
  const flags = source.flags?.[SYS_ID] ?? {};
  if (Number.isInteger(flags[MIGRATION_FLAG])) {
    return flags[MIGRATION_FLAG];
  }
  const version = flags[LEGACY_MIGRATION_FLAG] ?? legacyVersion ?? getSavedVersion(source._stats);
  if (!version || !foundry.utils.isNewerVersion(game.system.version, version)) {
    return MIGRATION_SCHEMA;
  }
  return foundry.utils.isNewerVersion(SCHEMA_1_VERSION, version) ? 0 : 1;
}

/**
 * The system version a document was saved with: its export's when it was exported, "0.0.0" when another system
 * saved it, null when none is recorded.
 * @param {object|undefined} stats - The source's `_stats`
 * @returns {string|null}
 */
function getSavedVersion(stats) {
  const saved = stats?.exportSource ?? stats;
  if (!saved?.systemVersion) {
    return null;
  }
  return !saved.systemId || saved.systemId === SYS_ID ? saved.systemVersion : "0.0.0";
}
