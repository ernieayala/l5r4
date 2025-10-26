/**
 * Migration Helper Utilities
 * Provides shared utility functions for data migration operations including path manipulation
 * and wound level data normalization.
 *
 * @module setup/migrations/utils/helpers
 */

/**
 * Retrieves a nested property value from an object using dot notation path.
 *
 * Safely traverses nested object structure to retrieve deeply nested values without
 * throwing errors if intermediate properties are missing. Used by schema migration
 * functions to read legacy field locations before transformation.
 *
 * @param {Object} obj - Source object to traverse
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armor_tn")
 * @returns {*} The value at the specified path, or undefined if path doesn't exist
 */
export function getByPath(obj, path) {
  try {
    return path
      .split(".")
      .reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Sets a nested property value on an object using dot notation path.
 *
 * Creates intermediate objects as needed when traversing the path. Mutates the original
 * object directly. Used by schema migrations to write transformed values to new field
 * locations while building update payloads.
 *
 * @param {Object} obj - Target object to modify (mutated in place)
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armorTn")
 * @param {*} value - Value to assign at the target path
 * @returns {void}
 */
export function setByPath(obj, path, value) {
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
 * @param {Object} obj - Target object to modify (mutated in place)
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
 * - Penalties increase the TN of all rolls, making actions harder
 *
 * @param {Object} woundData - Wound level data object with penalty/value properties (mutated)
 * @returns {boolean} True if any normalization changes were made, false otherwise
 */
export function normalizeWoundLevelData(woundData) {
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
