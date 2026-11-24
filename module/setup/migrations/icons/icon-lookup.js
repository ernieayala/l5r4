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
 * The image a document moves to in the icon migration, changing only images the migration knows (#180): a legacy
 * system path in ICON_MIGRATION_MAP moves to its WebP replacement; an Item with no image or Foundry's placeholder
 * (the item bag, the mystery man) gets its type's default icon; a bow showing a system default icon of another type
 * gets the bow icon. Any other image, art a user chose included, stays, so the pass changes nothing on a second run.
 * @param {Document} doc - Document to evaluate for icon update
 * @param {string} docType - Document type ("Actor" or "Item")
 * @returns {Promise<string|null>} New icon path if update needed, null otherwise
 */
export async function getUpdatedIconPath(doc, docType) {
  const mapped = await getMappedIconPath(doc.img);
  if (mapped || docType !== "Item") {
    return mapped;
  }
  const isBow = doc.type === "weapon" && Boolean(doc.system?.isBow);
  const defaultIcon = DEFAULT_ICONS[isBow ? "bow" : doc.type];
  const replaceable =
    isPlaceholderIcon(doc.img) || (isBow && Object.values(DEFAULT_ICONS).includes(doc.img));
  return defaultIcon && replaceable && doc.img !== defaultIcon ? defaultIcon : null;
}

/**
 * The update entry for an actor's prototype token image when it maps to a new path.
 * @param {Actor} actor
 * @returns {Promise<object>} `{ "prototypeToken.texture.src": path }`, or empty when the image stays
 */
export async function buildTokenIconUpdate(actor) {
  const tokenImg = actor.prototypeToken?.texture?.src;
  if (!tokenImg) {
    return {};
  }
  const nextToken = await getMappedIconPath(tokenImg);
  if (nextToken && nextToken !== tokenImg) {
    return { "prototypeToken.texture.src": nextToken };
  }
  return {};
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

/**
 * Whether an image is no image at all or one of Foundry's placeholders, which an item shows until art is chosen.
 * @param {string|null|undefined} img
 * @returns {boolean}
 */
function isPlaceholderIcon(img) {
  return !img || img === "icons/svg/item-bag.svg" || img.includes("mystery");
}
