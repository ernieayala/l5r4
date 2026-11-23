/**
 * @module tools/release-files
 * @description The files the release zip ships (roadmap/STAGE-19 decision 1): an allowlist, so a file stays out
 * until it is listed here. Licensed material (`content/`, `game-rules/`), the plan, tests, sources the build compiles
 * (`scss/`, `src/`), tooling, and Claude Code files are never listed. `node tools/release-files.mjs` prints the
 * files one per line, for `zip -@`; it fails when a listed path is missing, so a release without its compiled packs
 * stops instead of shipping without them.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** What the zip ships: a file by its path, a directory by its path with a trailing slash. */
export const RELEASE_PATHS = Object.freeze([
  "system.json",
  "LICENSE",
  "README.md",
  "CHANGELOG.MD",
  "ACTIVE_EFFECTS.md",
  "dist/",
  "module/",
  "templates/",
  "lang/",
  "assets/",
  "packs/"
]);

/**
 * Whether the zip ships a file.
 * @param {string} file - A path relative to the repo root, with forward slashes
 * @returns {boolean}
 */
export function isReleasePath(file) {
  return RELEASE_PATHS.some(entry =>
    entry.endsWith("/") ? file.startsWith(entry) : file === entry
  );
}

/**
 * Every file the zip ships, found on disk under `root`, sorted.
 * @param {string} root - The repo root
 * @returns {string[]} Paths relative to `root`, with forward slashes
 * @throws {Error} When a listed path does not exist
 */
export function listReleaseFiles(root) {
  const files = [];
  for (const entry of RELEASE_PATHS) {
    const full = path.join(root, entry);
    if (!existsSync(full)) {
      throw new Error(`Release path missing: ${entry}`);
    }
    files.push(...(statSync(full).isDirectory() ? filesUnder(root, full) : [entry]));
  }
  return files.sort();
}

/**
 * Every file under a directory, at any depth.
 * @param {string} root - The repo root the paths are relative to
 * @param {string} dir - The directory
 * @returns {string[]}
 */
function filesUnder(root, dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent =>
      path.relative(root, path.join(dirent.parentPath, dirent.name)).split(path.sep).join("/")
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log(listReleaseFiles(process.cwd()).join("\n"));
}
