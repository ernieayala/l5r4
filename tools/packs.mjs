/**
 * @module tools/packs
 * @description `npm run build:packs`: compiles every src/packs/<pack>.json into the LevelDB pack packs/<pack>
 * (roadmap/STAGE-15). Run it with Foundry closed: a world that has a pack open locks it, and compilePack then writes
 * nothing (roadmap/FOUNDRY-V14-REFERENCE.md §9).
 */

import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPack } from "./pack-sources.mjs";

const SOURCES = "src/packs";
const OUTPUT = "packs";

const sources = readdirSync(SOURCES)
  .filter(name => name.endsWith(".json"))
  .sort()
  .map(file => JSON.parse(readFileSync(path.join(SOURCES, file), "utf8")));

// compilePack reads one JSON file per document from a directory, so each pack is staged there first
const staging = mkdtempSync(path.join(tmpdir(), "l5r4-packs-"));
try {
  for (const source of sources) {
    // A creature's embedded Skills are copies of the skills pack's entries
    const { documents } = buildPack(source, sources);
    const dir = path.join(staging, source.name);
    mkdirSync(dir);
    for (const doc of documents) {
      writeFileSync(path.join(dir, `${doc._id}.json`), JSON.stringify(doc));
    }
    await compilePack(dir, path.join(OUTPUT, source.name));
    console.log(`Built ${source.name}: ${documents.length} documents`);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
