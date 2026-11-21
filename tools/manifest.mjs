/**
 * @module tools/manifest
 * @description The release's `system.json` (roadmap/STAGE-19 decision 2): its version, and the `manifest` and
 * `download` URLs Foundry installs and updates from. A stable release points at `releases/latest/download/`, so a
 * world on it is offered each later stable release; a pre-release points at its own tag, so no one is moved onto
 * it. `node tools/manifest.mjs <version> <release|prerelease>` rewrites those three values of `system.json` in place;
 * both release workflows call it.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

/** Where the releases are published. */
const RELEASES = "https://github.com/ernieayala/l5r4/releases";

/** X.Y.Z, or X.Y.Z-pre with dot-separated pre-release parts. */
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

/** The release types the create-release workflow offers. */
const RELEASE_TYPES = Object.freeze(["release", "prerelease"]);

/**
 * The manifest a release ships. A version with a pre-release part is a pre-release whatever the type says.
 * @param {object} manifest - The repo's `system.json`
 * @param {string} version - X.Y.Z or X.Y.Z-pre
 * @param {"release"|"prerelease"} type
 * @returns {object} A copy with `version`, `manifest`, and `download` set
 * @throws {Error} On a version or type the workflow must not release
 */
export function buildReleaseManifest(manifest, version, type) {
  if (!VERSION.test(String(version))) {
    throw new Error(`Not a release version (X.Y.Z or X.Y.Z-pre): ${version}`);
  }
  if (!RELEASE_TYPES.includes(type)) {
    throw new Error(`Not a release type (${RELEASE_TYPES.join(" or ")}): ${type}`);
  }
  const prerelease = type === "prerelease" || version.includes("-");
  const base = prerelease ? `${RELEASES}/download/v${version}` : `${RELEASES}/latest/download`;
  return {
    ...manifest,
    version,
    manifest: `${base}/system.json`,
    download: `${base}/l5r4.zip`
  };
}

/**
 * The text of `system.json` for a release: only the values of `version`, `manifest`, and `download` change, so the
 * file the create-release workflow commits keeps its layout and passes the format check.
 * @param {string} text - The repo's `system.json`
 * @param {string} version - X.Y.Z or X.Y.Z-pre
 * @param {"release"|"prerelease"} type
 * @returns {string}
 * @throws {Error} On a bad version or type, or a key that is not written once as `"key": "value"`
 */
export function updateManifestText(text, version, type) {
  const manifest = buildReleaseManifest(JSON.parse(text), version, type);
  let updated = text;
  for (const key of ["version", "manifest", "download"]) {
    const pattern = new RegExp(`("${key}":\\s*)"(?:[^"\\\\]|\\\\.)*"`, "g");
    if ((text.match(pattern) ?? []).length !== 1) {
      throw new Error(`system.json does not write "${key}" once as a string`);
    }
    updated = updated.replace(pattern, (_match, prefix) => prefix + JSON.stringify(manifest[key]));
  }
  if (!isDeepStrictEqual(JSON.parse(updated), manifest)) {
    throw new Error("system.json changed beyond its version and URLs");
  }
  return updated;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [version, type] = process.argv.slice(2);
  writeFileSync(
    "system.json",
    updateManifestText(readFileSync("system.json", "utf8"), version, type)
  );
  const { manifest, download } = JSON.parse(readFileSync("system.json", "utf8"));
  console.log(`system.json: ${version}, ${manifest}, ${download}`);
}
