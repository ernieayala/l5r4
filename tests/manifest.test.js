import { readFile, access } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const lookup = (object, path) => path.split(".").reduce((node, key) => node?.[key], object);

let manifest;
let lang;
let pkg;

beforeAll(async () => {
  manifest = await readJson("system.json");
  lang = await readJson("lang/en.json");
  pkg = await readJson("package.json");
});

/** Every [documentName, subtype] pair declared in system.json. */
const declaredSubtypes = () =>
  Object.entries(manifest.documentTypes).flatMap(([documentName, types]) =>
    Object.keys(types).map(type => [documentName, type])
  );

describe("system.json for Foundry v14", () => {
  it("declares itself a system", () => {
    expect(manifest.type).toBe("system");
  });

  it("requires Foundry 14.370 and stops at 14", () => {
    expect(manifest.compatibility).toEqual({
      minimum: "14.370",
      verified: "14.370",
      maximum: "14"
    });
  });

  it("loads only the stylesheet that build:css writes, in the system cascade layer", () => {
    const output = pkg.scripts["build:css"].split(/\s+/).at(-1);
    expect(manifest.styles).toEqual([{ src: output, layer: "system" }]);
  });

  it("points every language at a JSON file that parses", async () => {
    for (const { path } of manifest.languages) {
      await expect(access(new URL(path, root))).resolves.toBeUndefined();
      await expect(readJson(path)).resolves.toBeTypeOf("object");
    }
  });

  it("gives every declared subtype a display name in lang/en.json", () => {
    for (const [documentName, type] of declaredSubtypes()) {
      const key = `TYPES.${documentName}.${type}`;
      expect(lookup(lang, key), key).toBeTypeOf("string");
    }
  });
});
