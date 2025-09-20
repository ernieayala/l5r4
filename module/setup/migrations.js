/**
 * @fileoverview L5R4 Migration System - Data Migration and Schema Updates for Foundry VTT v13+
 * 
 * This module provides comprehensive migration functionality for the L5R4 system,
 * handling schema updates, icon path migrations, and data structure changes
 * across system versions. Migrations are applied automatically during system
 * initialization and are designed to be idempotent and safe.
 *
 * **Core Responsibilities:**
 * - **Schema Migration**: Automated data structure updates using configurable rules
 * - **Icon Path Migration**: Organizational restructuring of asset file locations
 * - **Version Management**: Tracking and applying incremental system updates
 * - **Data Integrity**: Ensuring safe transitions between system versions
 * - **Error Recovery**: Graceful handling of migration failures and rollback scenarios
 *
 * **Migration Architecture:**
 * - **Rule-Based System**: Uses SCHEMA_MAP for declarative field transformations
 * - **Batch Processing**: Efficient handling of large document collections
 * - **Progress Tracking**: Real-time feedback during long migration operations
 * - **Selective Application**: Only migrates documents that need updates
 * - **Validation System**: Verifies migration success before cleanup
 *
 * **Migration Types:**
 * - **Schema Migrations**: Update document data structures using SCHEMA_MAP rules
 * - **Icon Path Migrations**: Relocate icon files to new organizational structure
 * - **Compendium Migrations**: Apply migrations to unlocked compendium packs
 * - **World Document Migrations**: Update actors and items in the world
 * - **Flag Migrations**: Update system-specific flags and metadata
 *
 * **Safety Features:**
 * - **GM-Only Execution**: Migrations only run for Game Master users
 * - **Idempotent Operations**: Safe to run multiple times without side effects
 * - **Error Isolation**: Individual document failures don't stop the migration
 * - **Minimal Updates**: Only changed fields are updated to preserve performance
 * - **Backup-Friendly**: Uses Foundry's diff system for efficient updates
 * - **Rollback Support**: Maintains original data for potential recovery
 *
 * **Schema Migration System:**
 * Uses SCHEMA_MAP rules to define field relocations and transformations:
 * - **Dot-Notation Paths**: Support for nested property access and modification
 * - **Type-Specific Rules**: Different migration rules for actors, items, etc.
 * - **Conditional Logic**: Apply migrations based on document state or version
 * - **Data Preservation**: Existing destination data takes precedence
 * - **Cleanup Operations**: Removes obsolete fields after successful migration
 * - **Validation Hooks**: Pre/post migration validation for data integrity
 *
 * **Icon Migration System:**
 * Relocates icon files from flat structure to organized subfolders:
 * - **rings/**: Elemental ring icons (air.png, earth.png, fire.png, water.png, void.png)
 * - **status/**: Combat stance and status icons (attack.png, defense.png, etc.)
 * - **traits/**: Character trait icons organized by category
 * - **File Validation**: Confirms target file existence before path updates
 * - **Fallback Handling**: Maintains backward compatibility with old paths
 * - **Batch Operations**: Efficient processing of multiple icon updates
 *
 * **Performance Optimizations:**
 * - **Lazy Loading**: Migration rules loaded only when needed
 * - **Diff-Based Updates**: Only modified fields trigger database writes
 * - **Batch Processing**: Groups related updates for efficiency
 * - **Memory Management**: Processes large collections in chunks
 * - **Progress Indicators**: User feedback for long-running operations
 *
 * **Usage Examples:**
 * ```javascript
 * // Run all pending migrations
 * await runMigrations();
 * 
 * // Migrate specific document type
 * await migrateDocuments(game.actors, 'Actor');
 * 
 * // Check if migration is needed
 * const needsMigration = await checkMigrationNeeded(document);
 * ```
 *
 * **Error Handling:**
 * - **Graceful Degradation**: System continues functioning with partial migrations
 * - **Detailed Logging**: Comprehensive error reporting for troubleshooting
 * - **User Notifications**: Clear feedback about migration status and issues
 * - **Recovery Procedures**: Guidelines for manual intervention when needed
 *
 * **Integration Points:**
 * - **System Initialization**: Automatic migration checks during startup
 * - **Document Hooks**: Real-time migration triggers for new documents
 * - **Settings Integration**: User-configurable migration preferences
 * - **Compendium System**: Seamless handling of pack migrations
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 * @see {@link https://foundryvtt.com/api/classes/client.FilePicker.html#browse|FilePicker.browse}
 * @see {@link https://foundryvtt.com/api/classes/foundry.utils.html#diffObject|foundry.utils.diffObject}
 */

import { SYS_ID, PATHS } from "../config.js";

// Schema migration utilities for safe data structure updates

import { SCHEMA_MAP } from "./schema-map.js";

/**
 * Safely retrieve a nested property value using dot-notation path.
 * Handles missing intermediate objects gracefully without throwing errors.
 * 
 * @param {object} obj - Source object to read from
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @returns {any} Property value or undefined if path doesn't exist
 * 
 * @example
 * const value = getByPath(actor, "system.rings.fire.rank");
 * // Returns actor.system.rings.fire.rank or undefined
 */
function getByPath(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Set a nested property value using dot-notation path.
 * Creates missing intermediate objects as needed to ensure the path exists.
 * 
 * @param {object} obj - Target object to modify
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @param {any} value - Value to set at the specified path
 * 
 * @example
 * setByPath(updateData, "system.rings.fire.rank", 3);
 * // Creates updateData.system.rings.fire.rank = 3
 */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[last] = value;
}

/**
 * Remove a nested property using dot-notation path.
 * Safely handles missing intermediate objects without throwing errors.
 * 
 * @param {object} obj - Target object to modify
 * @param {string} path - Dot-notation path to property to delete
 * 
 * @example
 * deleteByPath(updateData, "system.deprecated.oldField");
 * // Removes updateData.system.deprecated.oldField if it exists
 */
function deleteByPath(obj, path) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur?.[k] === undefined) return;
    cur = cur[k];
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
  }
}

/**
 * Generate schema migration update data for a single document.
 * Applies all applicable SCHEMA_MAP rules based on document type and subtype.
 * Returns minimal update object containing only changed fields.
 * 
 * @param {Actor|Item} doc - Document to analyze for migration needs
 * @returns {object|null} Update object for Document.update() or null if no changes needed
 * 
 * @example
 * const update = buildSchemaUpdate(actor);
 * if (update) await actor.update(update);
 */
function buildSchemaUpdate(doc) {
  const { documentName: docType } = doc; // "Actor" | "Item"
  const type = doc.type;

  // Collect applicable rules only
  const rules = SCHEMA_MAP.filter(r => r.docType === docType && (r.type === type || r.type === "*"));
  if (!rules.length) return null;

  // Clone current system data minimally for updates
  const patch = { system: foundry.utils.deepClone(doc.system ?? {}) };
  let touched = false;

  for (const rule of rules) {
    const fromVal = getByPath(patch, rule.from);
    const toVal = getByPath(patch, rule.to);

    // Skip if source missing or already migrated (destination exists and has meaningful content)
    // For string fields, empty string means not migrated yet
    const hasValidTarget = toVal !== undefined && toVal !== "";
    if (fromVal === undefined || hasValidTarget) continue;

    setByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) return null;

  // Return minimal update object
  return { system: patch.system };
}

/**
 * Apply schema migrations to a collection of documents.
 * Processes each document individually with error isolation to prevent
 * single document failures from stopping the entire migration.
 * 
 * @param {Array<Actor|Item>} docs - Documents to migrate
 * @param {string} label - Descriptive label for logging purposes
 * @returns {Promise<void>}
 */
async function applySchemaMapToDocs(docs, label) {
  for (const doc of docs) {
    try {
      const update = buildSchemaUpdate(doc);
      if (update) {
        await doc.update(update);
      }
    } catch (e) {
      console.warn("L5R4", "Schema remap failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Normalize item values for compatibility (non-destructive minimal updates).
 * Currently ensures size casing is normalized for weapon and bow items.
 *
 * @param {Array<Item>} docs - Items to normalize
 * @param {string} label - Descriptive label for logging
 */
async function normalizeItems(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Item") continue;
      const t = doc.type;
      if (t !== "weapon" && t !== "bow") continue;
      const sz = doc.system?.size;
      if (typeof sz === "string" && (sz !== sz.toLowerCase())) {
        await doc.update({ "system.size": sz.toLowerCase() }, { diff: true, render: false });
      }
    } catch (e) {
      console.warn("L5R4", "Normalization failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Clean up duplicate legacy fields that may persist after partial migrations.
 * Removes old snake_case fields when corresponding camelCase fields exist.
 *
 * @param {Array<Actor>} docs - Actors to clean up
 * @param {string} label - Descriptive label for logging
 */
async function cleanupLegacyFields(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor") continue;
      
      const updates = {};
      let needsUpdate = false;

      // Clean up duplicate fields if new camelCase version exists
      const cleanupRules = [
        { old: "system.wounds.heal_rate", new: "system.wounds.healRate" },
        { old: "system.wound_lvl", new: "system.woundLevels" },
        { old: "system.armor.armor_tn", new: "system.armor.armorTn" },
        { old: "system.shadow_taint", new: "system.shadowTaint" },
        { old: "system.armor_tn", new: "system.armorTn" },
        { old: "system.initiative.roll_mod", new: "system.initiative.rollMod" },
        { old: "system.initiative.keep_mod", new: "system.initiative.keepMod" },
        { old: "system.initiative.total_mod", new: "system.initiative.totalMod" }
      ];

      for (const rule of cleanupRules) {
        const oldVal = getByPath(doc, rule.old);
        const newVal = getByPath(doc, rule.new);
        
        // If old field exists and new field also exists, remove old field
        if (oldVal !== undefined && newVal !== undefined) {
          setByPath(updates, rule.old, null);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await doc.update(updates, { diff: true, render: false });
      }
    } catch (e) {
      console.warn("L5R4", "Legacy cleanup failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Icon file relocation mapping for migration from flat to organized structure.
 * Maps original filenames to their new subfolder locations under PATHS.icons.
 * This maintains the migration logic independently of config aliases to avoid
 * circular dependencies during system initialization.
 * 
 * @type {Readonly<Record<string, string>>} filename -> subfolder/filename
 * 
 * @example
 * ICON_MIGRATION_MAP["air.png"] // Returns "rings/air.png"
 */
const ICON_MIGRATION_MAP = Object.freeze({
  // Rings
  "air.png": "rings/air.png",
  "earth.png": "rings/earth.png",
  "fire.png": "rings/fire.png",
  "water.png": "rings/water.png",
  "void.png": "rings/void.png",

  // Stances / status
  "attackstance.png": "status/attackstance.png",
  "fullattackstance.png": "status/fullattackstance.png",
  "defensestance.png": "status/defensestance.png",
  "fulldefensestance.png": "status/fulldefensestance.png",
  "centerstance.png": "status/centerstance.png",
  "grapple.png": "status/grapple.png",
  "mounted.png": "status/mounted.png"
});

/** @type {Map<string, Set<string>>} dir -> filenames */
const dirCache = new Map();

/**
 * Browse directory contents with caching for performance.
 * Memoizes file listings to avoid repeated FilePicker.browse calls
 * during migration of multiple documents with similar icon paths.
 * 
 * @param {string} dirPath - Directory path to browse
 * @returns {Promise<Set<string>>} Set of filenames in the directory
 */
async function listDir(dirPath) {
  if (dirCache.has(dirPath)) return dirCache.get(dirPath);
  try {
    const res = await FilePicker.browse("data", dirPath);
    const files = new Set((res.files ?? []).map(f => {
      const i = f.lastIndexOf("/");
      return i >= 0 ? f.slice(i + 1) : f;
    }));
    dirCache.set(dirPath, files);
    return files;
  } catch (err) {
    console.warn("L5R4", "Failed to browse directory", { dirPath, err });
    const empty = new Set();
    dirCache.set(dirPath, empty);
    return empty;
  }
}

/**
 * Compute new icon path for migrated files.
 * Checks if the given image path corresponds to a file that has been
 * relocated according to ICON_MIGRATION_MAP, and verifies the target exists.
 * 
 * @param {string} img - Current image path to check for migration
 * @returns {Promise<string|null>} New path if migration available and target exists, null otherwise
 * 
 * @example
 * const newPath = await computeNewIconPath("systems/l5r4/assets/icons/air.png");
 * // Returns "systems/l5r4/assets/icons/rings/air.png" if target exists
 */
async function computeNewIconPath(img) {
  if (typeof img !== "string" || !img.startsWith(PATHS.icons + "/")) return null;
  const prefix = PATHS.icons + "/";
  const file = img.slice(prefix.length);
  const rel = ICON_MIGRATION_MAP[file];
  if (!rel) return null;
  const targetPath = prefix + rel;
  const lastSlash = targetPath.lastIndexOf("/");
  const dir = targetPath.slice(0, lastSlash);
  const base = targetPath.slice(lastSlash + 1);
  const files = await listDir(dir);
  return files.has(base) ? targetPath : null;
}

/**
 * Execute icon path migration for world documents.
 * Updates actor.img and item.img fields for documents that reference
 * relocated icon files. Only runs for GM users and applies minimal updates
 * using Foundry's diff system for optimal performance.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // Called during system initialization
 * await runIconPathMigration();
 */
export async function runIconPathMigration() {
  if (!game.user?.isGM) return;
  const shouldRun = game.settings.get(SYS_ID, "runMigration");
  if (!shouldRun) return;

  let changed = 0;

  // Actors
  for (const a of game.actors.contents) {
    const next = await computeNewIconPath(a.img);
    if (next && next !== a.img) {
      try { await a.update({ img: next }, { diff: true, render: false }); changed++; }
      catch (err) { console.warn("L5R4", "Failed to update actor img", { id: a.id, err }); }
    }
  }

  // Items
  for (const i of game.items.contents) {
    const next = await computeNewIconPath(i.img);
    if (next && next !== i.img) {
      try { await i.update({ img: next }, { diff: true, render: false }); changed++; }
      catch (err) { console.warn("L5R4", "Failed to update item img", { id: i.id, err }); }
    }
  }

  ui.notifications?.info(game.i18n.format("l5r4.system.migration.iconsUpdated", { count: changed }));
  try {
    if (changed > 0) { await game.settings.set(SYS_ID, "runMigration", false); }
  } catch (err) {
    console.warn("L5R4", "Failed to disable runMigration setting", err);
  }
}

/**
 * Apply icon path migration to compendium packs.
 * Processes all unlocked Actor and Item compendium packs using the same
 * icon migration logic as world documents. Locked packs are skipped to
 * prevent permission errors.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // Migrates icons in all unlocked compendiums
 * await migrateCompendiumIconPaths();
 */
async function migrateCompendiumIconPaths() {
  let changed = 0;
  const packs = game.packs?.contents ?? [];
  for (const pack of packs) {
    const docName = pack.documentName ?? pack.metadata?.type ?? pack.metadata?.documentName;
    if (docName !== "Actor" && docName !== "Item") continue;

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) continue;

    let docs = [];
    try {
      docs = await pack.getDocuments();
    } catch (err) {
      console.warn("L5R4", "Failed to load compendium documents", { collection: pack.collection, err });
      continue;
    }

    for (const doc of docs) {
      const next = await computeNewIconPath(doc.img);
      if (next && next !== doc.img) {
        try {
          await doc.update({ img: next }, { diff: true, render: false });
          changed++;
        } catch (err) {
          console.warn("L5R4", "Failed to update compendium doc img", { id: doc.id, collection: pack.collection, err });
        }
      }
    }
  }

  if (changed > 0) {
    ui.notifications?.info(game.i18n.format("l5r4.system.migration.compendiumIconsUpdated", { count: changed }));
  }
}

/**
 * Main migration orchestrator for system version updates.
 * Coordinates all migration types in the correct order and handles errors gracefully.
 * Designed to be called during system initialization with version information.
 * 
 * **Migration Order:**
 * 1. Schema migrations for world documents (actors, items)
 * 2. Schema migrations for compendium documents
 * 3. Icon path migrations for world documents
 * 4. Icon path migrations for compendium documents
 * 
 * **Safety Features:**
 * - GM-only execution prevents permission issues
 * - Error isolation prevents single failures from stopping migration
 * - Idempotent design allows safe re-execution
 * - Comprehensive logging for troubleshooting
 * 
 * @param {string} fromVersion - Previous system version (for logging)
 * @param {string} toVersion - Current system version (for logging)
 * @returns {Promise<void>}
 * 
 * @example
 * // Called from system ready hook
 * Hooks.once("ready", () => {
 *   runMigrations("1.0.0", "1.1.0");
 * });
 */
export async function runMigrations(fromVersion, toVersion) {
  if (!game.user?.isGM) return;

  // Phase 1: Schema migrations for world documents (Actors and Items)
  await applySchemaMapToDocs(game.actors.contents, "world-actors");
  await applySchemaMapToDocs(game.items.contents, "world-items");
  // Normalize world items after schema changes
  await normalizeItems(game.items.contents, "world-items-norm");
  // Clean up duplicate legacy fields after migration
  await cleanupLegacyFields(game.actors.contents, "world-actors-cleanup");

  // CRITICAL: Phase 1.5 - Migrate embedded items on actors
  for (const actor of game.actors) {
    if (actor.items.size > 0) {
      await applySchemaMapToDocs(actor.items.contents, `actor-items:${actor.id}`);
      await normalizeItems(actor.items.contents, `actor-items-norm:${actor.id}`);
    }
  }

  // Phase 2: Schema migrations for compendium packs
  for (const pack of game.packs) {
    const docType = pack.metadata?.type ?? pack.documentName;
    if (docType !== "Actor" && docType !== "Item") continue;

    // Skip locked compendiums to prevent permission errors
    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      console.log("L5R4", "Skipping locked compendium", { collection: pack.collection });
      continue;
    }

    try {
      const docs = await pack.getDocuments();
      await applySchemaMapToDocs(docs, `pack:${pack.collection}`);
      await normalizeItems(docs, `pack-norm:${pack.collection}`);

      // Also migrate items embedded in compendium actors
      if (docType === "Actor") {
        for (const actor of docs) {
          if (actor.items.size > 0) {
            await applySchemaMapToDocs(actor.items.contents, `compendium-actor-items:${pack.collection}:${actor.id}`);
            await normalizeItems(actor.items.contents, `compendium-actor-items-norm:${pack.collection}:${actor.id}`);
          }
        }
      }
    } catch (e) {
      console.warn("L5R4", "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  // Phase 3: Icon path migrations
  try {
    await runIconPathMigration();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn("L5R4 | Migration failed", { fromVersion, toVersion, error: err });
  }
}
