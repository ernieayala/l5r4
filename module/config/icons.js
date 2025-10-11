/**
 * @fileoverview L5R4 Icon Management System
 * 
 * Provides icon path resolution and aliasing for future-proof asset organization.
 * Allows reorganizing icons into semantic subfolders without breaking references.
 * 
 * **Responsibilities:**
 * - Define icon filename aliases
 * - Resolve icon paths with alias support
 * - Maintain backward compatibility during asset reorganization
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

import { PATHS } from "./constants.js";

const freeze = Object.freeze;

/**
 * Icon filename aliases mapping bare filenames to subfolder paths.
 * 
 * Maps a bare filename (e.g., "air.png") to a relative subpath under PATHS.icons.
 * Example structure: { "air.png": "rings/air.png", "katana.png": "weapons/katana.png" }
 * 
 * Currently empty as all icons reside in a flat directory structure.
 * 
 * @type {Readonly<Record<string, string>>}
 */
export const ICON_FILENAME_ALIASES = freeze({
  // Empty - all icons currently in flat assets/icons directory
});

/**
 * Resolve an icon filename or system path to the current canonical path.
 * - Leaves external/core Foundry icons like "icons/svg/..." unchanged
 * - Accepts bare filenames or full system paths
 * - Returns aliased path if mapping exists, otherwise returns normalized path
 * 
 * @example
 * // Bare filename
 * iconPath("air.png")  // => "systems/l5r4-enhanced/assets/icons/air.png"
 * 
 * @example
 * // Full system path (unchanged)
 * iconPath("systems/l5r4-enhanced/assets/icons/air.png")  // => "systems/l5r4-enhanced/assets/icons/air.png"
 * 
 * @example
 * // Core Foundry icons (unchanged)
 * iconPath("icons/svg/mystery-man.svg")  // => "icons/svg/mystery-man.svg"
 * 
 * @param {string} nameOrPath - Icon filename or path to resolve
 * @returns {string} Canonical icon path
 */
export function iconPath(nameOrPath) {
  const n = nameOrPath ?? "";
  if (!n) { return n; }

  // Do not touch Foundry core icons or external URLs / data URIs
  if (n.startsWith("icons/") || n.startsWith("http") || n.startsWith("data:")) {
    return n;
  }

  // PATHS.icons = "systems/l5r4-enhanced/assets/icons"
  const prefix = `${PATHS.icons}/`;
  // Normalize to filename within the icons directory
  const file = n.startsWith(prefix) ? n.slice(prefix.length) : n;
  const mapped = ICON_FILENAME_ALIASES[file];

  // If we have an alias, rewrite to subfolder; else keep original structure
  // COVERAGE IGNORE: Alias resolution branch (mapped ? ...) not testable in unit tests
  // Cannot unit test: iconPath function captures ICON_FILENAME_ALIASES via closure.
  //   Frozen empty object at module load = branch never executes. ES module mocking
  //   cannot intercept closure reference even when export is mocked.
  if (mapped) {
    // Defensive validation: ensure alias value is a valid string path
    if (typeof mapped !== "string" || !mapped) {
      console.warn(`L5R4: Invalid alias for "${file}" - expected non-empty string, got ${typeof mapped}`, mapped);
      return n.startsWith(prefix) ? n : `${prefix}${file}`;
    }
    
    // Security check: prevent directory traversal or absolute paths
    if (mapped.startsWith("/") || mapped.includes("..")) {
      console.warn(`L5R4: Suspicious alias path for "${file}": ${mapped}`);
      return n.startsWith(prefix) ? n : `${prefix}${file}`;
    }
    
    return `${prefix}${mapped}`;
  }
  
  return n.startsWith(prefix) ? n : `${prefix}${file}`;
}
