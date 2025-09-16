/**
 * L5R4 — One-off migration helpers
 * -----------------------------------------------------------------------------
 * Rewrites stored document image paths (actor.img, item.img) if icons were
 * reorganized into semantic subfolders (e.g., rings/, status/).
 *
 * This module is side-effect free until called from the system entrypoint.
 *
 * Foundry v13 API: https://foundryvtt.com/api/
 */

import { SYS_ID, PATHS } from "../config.js";

/**
 * Helpers to safely remap schema keys during migrations.
 * Foundry v13: Documents are updated via Document.update(); ensure awaits.
 */

import { SCHEMA_MAP } from "./schema-map.js";

/**
 * Read a value from an object using a dot-path.
 * @param {object} obj
 * @param {string} path
 * @returns {any}
 */
function getByPath(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Set a value on an object using a dot-path. Creates missing objects along the path.
 * @param {object} obj
 * @param {string} path
 * @param {any} value
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
 * Delete a key at a dot-path if present.
 * @param {object} obj
 * @param {string} path
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
 * Apply schema remaps to a single Document based on SCHEMA_MAP.
 * @param {Actor|Item} doc
 * @returns {object|null} minimal update object or null if no changes
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

    // Skip if source missing or already migrated (destination exists)
    if (fromVal === undefined || toVal !== undefined) continue;

    setByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) return null;

  // Return minimal update object
  return { system: patch.system };
}

/**
 * Run schema remaps over a collection of Documents.
 * @param {Array<Actor|Item>} docs
 * @param {string} label
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
 * Map of flat filenames -> new relative subpaths under PATHS.icons.
 * Keep this minimal and focused on known, moved files.
 * NOTE: Duplicates the intent of config icon aliases to avoid a hard dependency.
 * De-duplicate later if we promote iconPath() centrally.
 * @type {Readonly<Record<string, string>>}
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

/** Browse a directory once and memoize its file list. */
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
 * If `img` lives under PATHS.icons and maps to a known moved filename,
 * and the target exists, return the new absolute path. Else null.
 * @param {string} img
 * @returns {Promise<string|null>}
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
 * Migrate img fields for world Actors and Items.
 * Only GM runs; only minimal updates are applied.
 * @returns {Promise<void>}
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
 * Iterate unlocked Actor/Item compendium packs and migrate their img fields
 * using the same icon path logic as world documents.
 * Skips locked packs and ignores failures per document.
 * @returns {Promise<void>}
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
 * Orchestrator for one-off migrations.
 * Call from system ready hook with previous and current versions.
 * Delegates to idempotent steps.
 *
 * Foundry v13 API: https://foundryvtt.com/api/
 *
 * @param {string} fromVersion
 * @param {string} toVersion
 * @returns {Promise<void>}
 */
export async function runMigrations(fromVersion, toVersion) {
  if (!game.user?.isGM) return;

  // 1) World Actors & Items
  await applySchemaMapToDocs(game.actors.contents, "world-actors");
  await applySchemaMapToDocs(game.items.contents, "world-items");

  // 2) Compendium packs (Actor/Item only)
  for (const pack of game.packs) {
    const meta = pack.metadata || pack.documentName ? pack : null;
    const docType = meta?.documentName ?? meta?.type; // v13 uses metadata.documentName
    if (docType !== "Actor" && docType !== "Item") continue;

    try {
      const docs = await pack.getDocuments();
      await applySchemaMapToDocs(docs, `pack:${pack.collection}`);
    } catch (e) {
      console.warn("L5R4", "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  try {
    await runIconPathMigration();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn("L5R4", "runMigrations failed", { fromVersion, toVersion, err });
  }
}
