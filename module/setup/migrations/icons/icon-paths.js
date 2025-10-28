/**
 * Icon Path Migration
 * Updates legacy PNG icon paths to new WebP assets.
 *
 * @module setup/migrations/icons/icon-paths
 */

import { SYS_ID, PATHS } from "../../../config/constants.js";
import { ICON_MIGRATION_MAP } from "./icon-map.js";

/**
 * Directory listing cache to avoid repeated FilePicker API calls.
 *
 * Caches directory contents during icon migration to improve performance when checking
 * for file existence. Populated lazily as directories are accessed.
 *
 * @type {Map<string, Set<string>>}
 */
const dirCache = new Map();

/**
 * Lists files in a directory with caching for performance.
 *
 * Uses Foundry's FilePicker API to browse directory contents, extracting just the
 * filenames. Results are cached to avoid redundant API calls during bulk migrations.
 * Handles API differences between Foundry versions via optional chaining.
 *
 * Foundry VTT Integration:
 * - foundry.applications?.apps?.FilePicker?.implementation handles v13+ structure
 * - Falls back to global FilePicker for earlier versions
 * - browse("data", path) reads from Foundry's Data directory
 *
 * @param {string} dirPath - Directory path to list (relative to Foundry Data)
 * @returns {Promise<Set<string>>} Set of filenames in the directory
 */
async function listDir(dirPath) {
  if (dirCache.has(dirPath)) {
    return dirCache.get(dirPath);
  }
  try {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    const res = await FP.browse("data", dirPath);
    const files = new Set(
      (res.files ?? []).map(f => {
        const i = f.lastIndexOf("/");
        return i >= 0 ? f.slice(i + 1) : f;
      })
    );
    dirCache.set(dirPath, files);
    return files;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to browse directory", { dirPath, err });
    const empty = new Set();
    dirCache.set(dirPath, empty);
    return empty;
  }
}

/**
 * Computes new icon path from legacy path using migration map.
 *
 * Checks if an image path references a legacy icon and returns the new path if the
 * target file exists. Only returns a path if the new icon file actually exists on disk,
 * preventing broken image references.
 *
 * @param {string} img - Current image path to evaluate
 * @returns {Promise<string|null>} New icon path if migration needed and file exists, null otherwise
 */
async function computeNewIconPath(img) {
  if (typeof img !== "string" || !img.startsWith(PATHS.icons + "/")) {
    return null;
  }
  const prefix = PATHS.icons + "/";
  const file = img.slice(prefix.length);
  const rel = ICON_MIGRATION_MAP[file];
  if (!rel) {
    return null;
  }
  const targetPath = prefix + rel;
  const lastSlash = targetPath.lastIndexOf("/");
  const dir = targetPath.slice(0, lastSlash);
  const base = targetPath.slice(lastSlash + 1);
  const files = await listDir(dir);
  return files.has(base) ? targetPath : null;
}

/**
 * Determines updated icon path for a document, with special bow handling.
 *
 * Checks standard icon migration map and applies special logic for weapon items with
 * isBow flag to ensure they use the bow icon. Returns null if no migration needed.
 *
 * @param {Document} doc - Document to evaluate for icon update
 * @param {string} docType - Document type ("Actor" or "Item")
 * @returns {Promise<string|null>} New icon path if update needed, null otherwise
 */
async function getUpdatedIconPath(doc, docType) {
  let nextImg = await computeNewIconPath(doc.img);

  if (docType === "Item" && doc.type === "weapon" && doc.system?.isBow) {
    const bowIcon = await computeNewIconPath("bow.png");
    if (bowIcon && doc.img !== bowIcon) {
      nextImg = bowIcon;
    }
  }

  return nextImg;
}

/**
 * Migrates legacy PNG icon paths to new WebP assets for world documents.
 *
 * Updates actor and item icons from old .png format to new .webp assets. Also updates
 * prototype token images for actors. Only runs if GM and migration setting enabled.
 * Displays notification with count of updated documents when complete.
 *
 * Idempotency: Icon migration is called from runMigrations() which filters out already-migrated
 * documents, so this function only processes documents that haven't been migrated yet. This
 * prevents overwriting custom icons when forceMigration is triggered.
 *
 * This is a world-only migration (compendiums handled separately by migrateCompendiumIconPaths).
 *
 * @returns {Promise<void>}
 * @async
 * @export
 */
export async function runIconPathMigration() {
  if (!game.user?.isGM) {
    return;
  }
  const shouldRun = game.settings.get(SYS_ID, "runMigration");
  if (!shouldRun) {
    return;
  }

  let changed = 0;

  for (const a of game.actors.contents) {
    const updates = {};

    const nextImg = await computeNewIconPath(a.img);
    if (nextImg && nextImg !== a.img) {
      updates.img = nextImg;
    }

    const tokenImg = a.prototypeToken?.texture?.src;
    if (tokenImg) {
      const nextToken = await computeNewIconPath(tokenImg);
      if (nextToken && nextToken !== tokenImg) {
        updates["prototypeToken.texture.src"] = nextToken;
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        await a.update(updates, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update actor img", { id: a.id, err });
      }
    }
  }

  for (const i of game.items.contents) {
    const nextImg = await getUpdatedIconPath(i, "Item");

    if (nextImg && nextImg !== i.img) {
      try {
        await i.update({ img: nextImg }, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update item img", { id: i.id, err });
      }
    }
  }

  ui.notifications?.info(
    game.i18n.format("l5r4.system.migration.iconsUpdated", { count: changed })
  );
}

/**
 * Migrates legacy PNG icon paths to new WebP assets for embedded items.
 *
 * Updates item icons for items embedded within actors. This handles items on actor sheets
 * that retain old icon paths even after world items have been migrated.
 *
 * @param {Document[]} docs - Array of Item documents (embedded items from actor.items.contents)
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 * @async
 * @export
 */
export async function migrateEmbeddedItemIcons(docs, label) {
  const itemDocs = docs.filter(doc => doc.documentName === "Item");
  if (itemDocs.length === 0) {
    return;
  }

  let migratedCount = 0;

  for (const item of itemDocs) {
    try {
      const nextImg = await getUpdatedIconPath(item, "Item");

      if (nextImg && nextImg !== item.img) {
        await item.update({ img: nextImg }, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate embedded item icon", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(`${SYS_ID} | Migrated ${migratedCount} embedded item icons (${label})`);
  }
}

/**
 * Migrates legacy PNG icon paths to new WebP assets in compendium packs.
 *
 * Updates actor and item icons within unlocked compendium packs. Skips locked packs to
 * avoid permission errors. Displays notification with count of updated documents when
 * complete. Runs separately from world migration to handle compendium-specific loading.
 *
 * Foundry VTT Integration:
 * - Respects pack.metadata.locked status (skips locked compendia)
 * - Loads compendium documents via pack.getDocuments()
 * - Updates both document icons and actor prototype token images
 *
 * @returns {Promise<void>}
 * @async
 */
export async function migrateCompendiumIconPaths() {
  let changed = 0;
  const packs = game.packs?.contents ?? [];
  for (const pack of packs) {
    const docName = pack.documentName ?? pack.metadata?.type ?? pack.metadata?.documentName;
    if (docName !== "Actor" && docName !== "Item") {
      continue;
    }

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      continue;
    }

    let docs = [];
    try {
      docs = await pack.getDocuments();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to load compendium documents", {
        collection: pack.collection,
        err
      });
      continue;
    }

    for (const doc of docs) {
      const nextImg = await getUpdatedIconPath(doc, docName);
      const updates = {};

      if (nextImg && nextImg !== doc.img) {
        updates.img = nextImg;
      }

      if (docName === "Actor") {
        const tokenImg = doc.prototypeToken?.texture?.src;
        if (tokenImg) {
          const nextToken = await computeNewIconPath(tokenImg);
          if (nextToken && nextToken !== tokenImg) {
            updates["prototypeToken.texture.src"] = nextToken;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        try {
          await doc.update(updates, { diff: true, render: false });
          changed++;
        } catch (err) {
          console.warn(`${SYS_ID}`, "Failed to update compendium doc img", {
            id: doc.id,
            collection: pack.collection,
            err
          });
        }
      }
    }
  }

  if (changed > 0) {
    ui.notifications?.info(
      game.i18n.format("l5r4.system.migration.compendiumIconsUpdated", { count: changed })
    );
  }
}
