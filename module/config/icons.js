/**
 * @file Icon path resolution utilities
 * @module config/icons
 *
 * Provides helper functions for resolving icon paths in the L5R4 system.
 * Handles both absolute and relative paths, ensuring consistent icon loading.
 *
 * Architectural Decision: Centralized path resolution prevents hardcoded paths
 * throughout the codebase and enables easy asset directory restructuring.
 */

import { PATHS } from "./constants.js";

/**
 * Resolves an icon name or path to a full system icon path.
 * Handles multiple input formats: filenames, relative paths, absolute paths, URLs, and data URIs.
 *
 * Path Resolution Logic:
 * 1. Empty/null input returns empty string
 * 2. Foundry core icons (icons/*), HTTP URLs, and data URIs pass through unchanged
 * 3. Already-prefixed system paths pass through unchanged
 * 4. Simple filenames get prefixed with system icons directory
 *
 * @param {string|null|undefined} nameOrPath - Icon filename, relative path, absolute path, URL, or data URI
 * @returns {string} Resolved icon path suitable for Foundry image sources
 *
 * @example
 * // Simple filename - gets system prefix
 * iconPath("katana.webp")
 * // Returns: "systems/l5r4-enhanced/assets/icons/katana.webp"
 *
 * @example
 * // Foundry core icon - passes through
 * iconPath("icons/svg/mystery-man.svg")
 * // Returns: "icons/svg/mystery-man.svg"
 *
 * @example
 * // HTTP URL - passes through
 * iconPath("https://example.com/icon.png")
 * // Returns: "https://example.com/icon.png"
 *
 * @example
 * // Data URI - passes through
 * iconPath("data:image/png;base64,...")
 * // Returns: "data:image/png;base64,..."
 *
 * @example
 * // Empty input - returns empty string
 * iconPath(null)
 * // Returns: ""
 */
export function iconPath(nameOrPath) {
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
