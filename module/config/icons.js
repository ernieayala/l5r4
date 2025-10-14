/**
 * Icon Path Utilities
 * Provides utility functions for normalizing and resolving icon resource paths.
 * Handles relative system paths, absolute Foundry paths, external URLs, and data URIs.
 * 
 * Foundry VTT Requirements:
 * - System icons must be located under PATHS.icons (assets/icons/)
 * - Supports Foundry's built-in icons/ directory for core icons
 * - Handles external resources (http/https) and inline data URIs
 * 
 * @module config/icons
 * @requires Foundry VTT v13+
 */

import { PATHS } from "./constants.js";

/**
 * Normalizes an icon path for Foundry VTT resource loading.
 * Converts relative icon names to full system paths while preserving
 * already-qualified paths (absolute, URLs, data URIs).
 * 
 * Supported input formats:
 * - Relative name: "weapon.webp" → "systems/l5r4-enhanced/assets/icons/weapon.webp"
 * - Already prefixed: "systems/l5r4-enhanced/assets/icons/weapon.webp" → unchanged
 * - Foundry core: "icons/svg/mystery-man.svg" → unchanged
 * - External URL: "https://example.com/icon.png" → unchanged
 * - Data URI: "data:image/png;base64,..." → unchanged
 * 
 * Usage: Pass any icon reference (filename, path, URL, or data URI), and the function
 * returns a properly formatted path for Foundry's resource loader. Falsy inputs return
 * an empty string for safe fallback handling.
 * 
 * @param {string} [nameOrPath] - Icon filename, relative path, absolute path, URL, or data URI
 * @returns {string} Normalized icon path suitable for Foundry resource loading, or empty string if input is falsy
 */
export function iconPath(nameOrPath) {
  const n = nameOrPath ?? "";
  if (!n) { return n; }

  // Already qualified: Foundry core icons, external URLs, or data URIs
  if (n.startsWith("icons/") || n.startsWith("http") || n.startsWith("data:")) {
    return n;
  }

  // Add system icon prefix if not already present
  const prefix = `${PATHS.icons}/`;
  return n.startsWith(prefix) ? n : `${prefix}${n}`;
}
