import { readFile, readdir } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const lookup = (object, path) => path.split(".").reduce((node, key) => node?.[key], object);

let lang;
let sources;

/** Drop comment lines, so keys in JSDoc examples are not taken for keys the code uses. */
const code = text =>
  text
    .split("\n")
    .filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n");

/** Every .js and .hbs file under a directory, with its text. */
async function readSources(dir) {
  const entries = await readdir(new URL(dir, root), { recursive: true, withFileTypes: true });
  const files = entries.filter(entry => entry.isFile() && /\.(js|hbs)$/.test(entry.name));
  return Promise.all(
    files.map(async entry => {
      const path = `${entry.parentPath}/${entry.name}`;
      return { path, text: code(await readFile(path, "utf8")) };
    })
  );
}

beforeAll(async () => {
  lang = JSON.parse(await readFile(new URL("lang/en.json", root), "utf8"));
  const entry = "dist/l5r4-enhanced.js";
  sources = [
    ...(await readSources("module/")),
    ...(await readSources("templates/")),
    { path: entry, text: code(await readFile(new URL(entry, root), "utf8")) }
  ];
});

describe("lang/en.json covers every key the system uses", () => {
  it("defines every key written out in code and templates", () => {
    const missing = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/["'](l5r4\.[A-Za-z0-9_.]+[A-Za-z0-9_])["']/g)]
        .filter(([, key]) => typeof lookup(lang, key) !== "string")
        .map(([, key]) => `${key} (${path})`)
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it("defines the group under every key built from a template literal", () => {
    const missing = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/`(l5r4\.[A-Za-z0-9_.]+)\.\$\{/g)]
        .filter(([, prefix]) => typeof lookup(lang, prefix) !== "object")
        .map(([, prefix]) => `${prefix} (${path})`)
    );
    expect([...new Set(missing)]).toEqual([]);
  });
});
