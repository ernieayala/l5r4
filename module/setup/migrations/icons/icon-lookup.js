/**
 * @module setup/migrations/icons/icon-lookup
 * @description The icon a document moves to in the icon migration: its legacy PNG's WebP replacement when that file
 * exists, or the system's default icon for its type. Directory listings are read once and cached for the run.
 */
import { SYS_ID, PATHS } from "../../../config/constants.js";
import { DEFAULT_ICONS } from "../../../config/item-types.js";
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
 * Computes new icon path from legacy path using migration map.
 *
 * Checks if an image path references a legacy icon and returns the new path if the
 * target file exists. Only returns a path if the new icon file exists on disk,
 * preventing broken image references.
 *
 * @param {string} img - Current image path to evaluate
 * @returns {Promise<string|null>} New icon path if migration needed and file exists, null otherwise
 */
export async function getMappedIconPath(img) {
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
  const files = await getDirFiles(dir);
  return files.has(base) ? targetPath : null;
}

/**
 * Determines updated icon path for a document, with special bow handling.
 *
 * Checks standard icon migration map and applies special logic for weapon items with
 * isBow flag to ensure they use the bow icon. Also assigns type-appropriate default
 * icons to items that don't have proper system icons (e.g., Foundry defaults or
 * unmapped legacy icons).
 *
 * Migration Strategy:
 * 1. Try to migrate via ICON_MIGRATION_MAP (old PNG → new WebP).
 * 2. For items without system icons, assign type-appropriate default icon.
 * 3. Special case: weapon.isBow=true gets bow icon.
 *
 * @param {Document} doc - Document to evaluate for icon update
 * @param {string} docType - Document type ("Actor" or "Item")
 * @returns {Promise<string|null>} New icon path if update needed, null otherwise
 */
export async function getUpdatedIconPath(doc, docType) {
  let nextImg = await getMappedIconPath(doc.img);

  // Special handling for Items: assign type-appropriate default icons
  if (docType === "Item") {
    // Check if item is using bow weapon type
    const isBow = doc.type === "weapon" && doc.system?.isBow;
    const iconType = isBow ? "bow" : doc.type;

    // If no migration found via map, check if item needs default icon assignment
    if (!nextImg) {
      const currentImg = doc.img;
      const hasSystemIcon =
        typeof currentImg === "string" && currentImg.startsWith(PATHS.icons + "/");
      const isFoundryDefault =
        !currentImg || currentImg === "icons/svg/item-bag.svg" || currentImg.includes("mystery");

      // Assign type-appropriate default icon if:
      // - Using Foundry default icon, OR
      // - Not using a system icon (might be old path or external icon)
      if (isFoundryDefault || !hasSystemIcon) {
        const defaultIcon = DEFAULT_ICONS[iconType];
        if (defaultIcon && currentImg !== defaultIcon) {
          nextImg = defaultIcon;
        }
      }
    }

    // Ensure bow weapons use bow icon
    if (isBow) {
      const bowIcon = DEFAULT_ICONS.bow;
      if (bowIcon && doc.img !== bowIcon && nextImg !== bowIcon) {
        nextImg = bowIcon;
      }
    }
  }

  return nextImg;
}

/**
 * Lists files in a directory with caching for performance.
 *
 * Uses Foundry's FilePicker API to browse directory contents, extracting only the
 * filenames. Results are cached to avoid redundant API calls during bulk migrations.
 *
 * Foundry VTT Integration:
 * - foundry.applications.apps.FilePicker.implementation is the configured FilePicker class.
 * - browse("data", path) reads from Foundry's Data directory.
 *
 * @param {string} dirPath - Directory path to list (relative to Foundry Data)
 * @returns {Promise<Set<string>>} Set of filenames in the directory
 */
async function getDirFiles(dirPath) {
  if (dirCache.has(dirPath)) {
    return dirCache.get(dirPath);
  }
  try {
    const res = await foundry.applications.apps.FilePicker.implementation.browse("data", dirPath);
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
