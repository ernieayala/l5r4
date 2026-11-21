/**
 * @module utils/icons
 * @description Icon path resolution for the L5R4 system: one place turns an icon name into a full path, so no code
 * hardcodes the asset directory and it can move without touching the callers.
 */

import { PATHS } from "../config/constants.js";

/**
 * Resolve an icon name or path to a full system icon path.
 * Empty or null input returns "". Foundry core icons (`icons/...`), HTTP URLs, data URIs, and paths that already
 * carry the system icons prefix pass through unchanged; a simple filename such as "katana.webp" gets the system icons
 * directory, "systems/l5r4-enhanced/assets/icons/katana.webp".
 * @param {string|null|undefined} nameOrPath - Icon filename, relative path, absolute path, URL, or data URI
 * @returns {string} Resolved icon path suitable for Foundry image sources
 */
export function getIconPath(nameOrPath) {
  const n = nameOrPath ?? "";

  // Early return for empty input
  if (!n) {
    return n;
  }

  // Pass through Foundry core icons, HTTP URLs, and data URIs unchanged
  if (n.startsWith("icons/") || n.startsWith("http") || n.startsWith("data:")) {
    return n;
  }

  // Add system icon prefix if not already present
  const prefix = `${PATHS.icons}/`;
  return n.startsWith(prefix) ? n : `${prefix}${n}`;
}
