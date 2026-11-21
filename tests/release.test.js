import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildReleaseManifest, updateManifestText } from "../tools/manifest.mjs";
import { isReleasePath, listReleaseFiles, RELEASE_PATHS } from "../tools/release-files.mjs";

const text = readFileSync(new URL("../system.json", import.meta.url), "utf8");
const manifest = JSON.parse(text);
const RELEASES = "https://github.com/ernieayala/l5r4/releases";

describe("The release manifest (tools/manifest.mjs)", () => {
  it("should point a stable release at the latest release", () => {
    const built = buildReleaseManifest(manifest, "4.0.0", "release");
    expect(built).toMatchObject({
      version: "4.0.0",
      manifest: `${RELEASES}/latest/download/system.json`,
      download: `${RELEASES}/latest/download/l5r4.zip`
    });
  });

  it("should point a pre-release at its own tag, by type or by version", () => {
    for (const [version, type] of [
      ["4.0.0", "prerelease"],
      ["4.0.0-rc.1", "release"]
    ]) {
      expect(buildReleaseManifest(manifest, version, type)).toMatchObject({
        version,
        manifest: `${RELEASES}/download/v${version}/system.json`,
        download: `${RELEASES}/download/v${version}/l5r4.zip`
      });
    }
  });

  it("should keep the rest of the manifest and leave the input as it was", () => {
    const before = structuredClone(manifest);
    const built = buildReleaseManifest(manifest, "4.0.0", "release");
    expect(manifest).toEqual(before);
    expect(built.compatibility).toEqual(manifest.compatibility);
    expect(built.packs).toEqual(manifest.packs);
  });

  it("should reject a version that is not X.Y.Z or X.Y.Z-pre, and an unknown type", () => {
    for (const version of ["4.0", "v4.0.0", "4.0.0.1", "4.0.0-", "4.0.0+build", "", undefined]) {
      expect(() => buildReleaseManifest(manifest, version, "release"), String(version)).toThrow(
        /release version/
      );
    }
    expect(() => buildReleaseManifest(manifest, "4.0.0", "draft")).toThrow(/release type/);
  });

  it("should change only the three values in system.json's text, so its layout stays", () => {
    // A version the repo never carries, so all three values change whatever system.json holds now
    const updated = updateManifestText(text, "9.9.9-test.1", "release");
    expect(JSON.parse(updated)).toEqual(buildReleaseManifest(manifest, "9.9.9-test.1", "release"));
    const before = text.split("\n");
    const changed = updated.split("\n").filter((line, i) => line !== before[i]);
    expect(changed.map(line => line.trim().split(":")[0])).toEqual([
      '"manifest"',
      '"download"',
      '"version"'
    ]);
  });

  it("should refuse a text that writes a key twice or not as a string", () => {
    const twice = text.replace('"license": "MIT"', '"license": "MIT", "x": { "version": "1.0.0" }');
    expect(() => updateManifestText(twice, "4.0.0", "release")).toThrow(/"version" once/);
    const missing = text.replace(/"download": "[^"]*",/, "");
    expect(() => updateManifestText(missing, "4.0.0", "release")).toThrow(/"download" once/);
  });
});

describe("The release files (tools/release-files.mjs)", () => {
  let root;
  afterEach(() => root && rmSync(root, { recursive: true, force: true }));

  const NEVER = [
    "game-rules/25_rings_and_traits.md",
    "content/Legend_of_the_Five_Rings_4th_Edition.pdf",
    "roadmap/00-OVERVIEW.md",
    "tests/manifest.test.js",
    "src/packs/skills.json",
    "tools/packs.mjs",
    ".claude/settings.json",
    "CLAUDE.md",
    "node_modules/sass/package.json",
    "scss/l5r4-enhanced.scss",
    "docs/code-system/naming.md",
    "images/presentation-sample-sheets.webp",
    "package.json",
    ".github/workflows/create-release.yml"
  ];

  it("should never ship licensed material, the plan, tests, sources, tooling, or Claude Code files", () => {
    for (const file of NEVER) {
      expect(isReleasePath(file), file).toBe(false);
    }
  });

  it("should ship every file system.json points to", () => {
    const files = [
      ...manifest.esmodules,
      ...manifest.styles.map(style => style.src),
      ...manifest.languages.map(language => language.path),
      ...manifest.packs.map(pack => `${pack.path}/CURRENT`)
    ];
    for (const file of files) {
      expect(isReleasePath(file), file).toBe(true);
    }
  });

  it("should list the allowlisted files on disk and nothing beside them", () => {
    root = mkdtempSync(path.join(tmpdir(), "l5r4-release-"));
    const write = file => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), "");
    };
    const shipped = RELEASE_PATHS.map(entry =>
      entry.endsWith("/") ? `${entry}nested/file.txt` : entry
    );
    [...shipped, ...NEVER].forEach(write);
    expect(listReleaseFiles(root)).toEqual([...shipped].sort());
  });

  it("should fail when an allowlisted path is missing", () => {
    root = mkdtempSync(path.join(tmpdir(), "l5r4-release-"));
    expect(() => listReleaseFiles(root)).toThrow(/Release path missing: system.json/);
  });
});
