import { readFile, access } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const lookup = (object, path) => path.split(".").reduce((node, key) => node?.[key], object);

let manifest;
let lang;
let pkg;
let DATA_MODELS;
let CORE_TYPE_DATA_MODELS;

beforeAll(async () => {
  // The data model classes extend Foundry's base models when their modules load; outside Foundry bare classes stand
  // in for them. Nothing here builds a model, only reads which classes are registered.
  globalThis.foundry = {
    abstract: { TypeDataModel: class {} },
    data: { ActiveEffectTypeDataModel: class {} }
  };
  ({ DATA_MODELS, CORE_TYPE_DATA_MODELS } = await import("../module/data/index.js"));
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

describe("system.json and the registered data models", () => {
  it("gives every declared subtype a data model", () => {
    for (const [documentName, type] of declaredSubtypes()) {
      expect(DATA_MODELS[documentName]?.[type], `${documentName}.${type}`).toBeTypeOf("function");
    }
  });

  it("declares every registered data model in documentTypes", () => {
    for (const [documentName, models] of Object.entries(DATA_MODELS)) {
      for (const type of Object.keys(models)) {
        expect(
          manifest.documentTypes[documentName]?.[type],
          `${documentName}.${type}`
        ).toBeDefined();
      }
    }
  });

  it("gives core's base ActiveEffect type a model and leaves it out of documentTypes", () => {
    expect(CORE_TYPE_DATA_MODELS.ActiveEffect?.base).toBeTypeOf("function");
    for (const [documentName, models] of Object.entries(CORE_TYPE_DATA_MODELS)) {
      for (const type of Object.keys(models)) {
        expect(
          manifest.documentTypes[documentName]?.[type],
          `${documentName}.${type}`
        ).toBeUndefined();
      }
    }
  });

  it("ships no template.json, whose subtypes the data models replace", async () => {
    await expect(access(new URL("template.json", root))).rejects.toThrow();
  });
});
