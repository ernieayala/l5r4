import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPack,
  entryUuid,
  FLAVOR_FIELDS,
  MECHANICAL_FIELDS,
  noteText,
  pageInRanges,
  referenceProblems,
  sourceProblems,
  SUMMARY_MAX
} from "../tools/pack-sources.mjs";
import { ACTION_TYPES } from "../module/config/localization.js";

const SOURCES = "src/packs";
const sources = readdirSync(SOURCES)
  .filter(name => name.endsWith(".json"))
  .map(name => JSON.parse(readFileSync(path.join(SOURCES, name), "utf8")));
const manifest = JSON.parse(readFileSync("system.json", "utf8"));

describe.each(sources.map(source => [source.name, source]))("Pack %s", (_name, source) => {
  const { documents } = buildPack(source, sources);
  const entries = documents.filter(doc => !doc._key.startsWith("!folders!"));

  it("should have no problems", () => {
    expect(sourceProblems(source)).toEqual([]);
  });

  it("should give the same ids on a second build, and no id twice", () => {
    expect(buildPack(source, sources).documents.map(doc => doc._id)).toEqual(
      documents.map(doc => doc._id)
    );
    expect(new Set(documents.map(doc => doc._id)).size).toBe(documents.length);
  });

  it("should leave every flavor field empty", () => {
    for (const doc of entries) {
      for (const field of FLAVOR_FIELDS) {
        expect(doc.system[field] ?? "", `${doc.name}: ${field}`).toBe("");
      }
    }
  });

  it("should keep each mechanical field to the summary limit, empty in a full-coverage entry", () => {
    for (const entry of source.entries) {
      for (const field of MECHANICAL_FIELDS) {
        const text = entry.system?.[field] ?? "";
        expect(text.length, `${entry.name}: ${field}`).toBeLessThanOrEqual(SUMMARY_MAX);
        if (entry.coverage === "full") {
          expect(text, `${entry.name}: ${field}`).toBe("");
        }
      }
    }
  });

  it("should give every Note rule the item's name and citation as its text", () => {
    for (const entry of source.entries) {
      for (const rule of (entry.system?.rules ?? []).filter(r => r.key === "Note")) {
        expect(rule.text).toBe(noteText(entry.name, entry.page));
      }
    }
  });

  it("should cite the Core Rulebook on a page in the pack's range", () => {
    for (const doc of entries) {
      expect(doc.system.source.book).toBe("core");
      expect(pageInRanges(source.pages, doc.system.source.page), doc.name).toBe(true);
    }
  });

  it("should repeat no name", () => {
    const names = source.entries.map(entry => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("should be declared in system.json with its label, path, and type", () => {
    const pack = manifest.packs.find(p => p.name === source.name);
    expect(pack).toMatchObject({
      label: source.label,
      path: `packs/${source.name}`,
      type: source.documentType,
      system: manifest.id
    });
    const folders = manifest.packFolders.flatMap(folder => folder.folders.flatMap(f => f.packs));
    expect(folders).toContain(source.name);
  });
});

describe("Pack sources", () => {
  it("should cover every pack system.json declares", () => {
    expect(manifest.packs.map(p => p.name).sort()).toEqual(sources.map(s => s.name).sort());
  });

  it("should store each creature attack's action as a key the attack config's select offers", () => {
    const creatures = sources.find(source => source.name === "creatures");
    for (const entry of creatures.entries) {
      for (const key of ["attack1", "attack2", "attack3"]) {
        const action = entry.system?.[key]?.type ?? "";
        if (action) {
          expect(Object.keys(ACTION_TYPES), `${entry.name}: ${key}`).toContain(action);
        }
      }
    }
  });

  it("should name only entries that exist when they reference one", () => {
    expect(referenceProblems(sources)).toEqual([]);
  });

  it("should turn a reference into the UUID of the entry it names, and catch one naming no entry", () => {
    const skills = {
      name: "skills",
      label: "Skills",
      documentType: "Item",
      types: ["skill"],
      pages: [[133, 145]],
      entries: [{ name: "Lore: History", type: "skill", page: 136, coverage: "full", system: {} }]
    };
    const schools = {
      name: "schools",
      label: "Schools",
      documentType: "Item",
      types: ["school"],
      pages: [[105, 132]],
      entries: [
        {
          name: "Test School",
          type: "school",
          page: 106,
          coverage: "full",
          system: {
            rules: [
              { key: "GrantItem", uuid: "@entry[skills/Lore: History]" },
              { key: "GrantItem", uuid: "@entry[skills/Lore: Nothing]" }
            ]
          }
        }
      ]
    };
    const [school] = buildPack(schools).documents;
    expect(school.system.rules[0].uuid).toBe(entryUuid("skills", "Lore: History"));
    expect(buildPack(skills).documents[0]._id).toBe(
      entryUuid("skills", "Lore: History").split(".").pop()
    );
    expect(referenceProblems([skills, schools])).toEqual([
      'schools: Test School: no entry "Lore: Nothing" in pack skills'
    ]);
  });

  it("should embed a creature's Skills as skills pack copies and its abilities as an effect with rules", () => {
    const skills = {
      name: "skills",
      label: "Skills",
      documentType: "Item",
      types: ["skill"],
      pages: [[133, 145]],
      entries: [
        {
          name: "Hunting",
          type: "skill",
          page: 140,
          coverage: "full",
          system: { type: "bugei", rank: 0 }
        }
      ]
    };
    const creatures = {
      name: "creatures",
      label: "Creatures",
      documentType: "Actor",
      types: ["npc"],
      pages: [[318, 331]],
      entries: [
        {
          name: "Test Dog",
          type: "npc",
          page: 320,
          coverage: "full",
          system: { fear: { rank: 0 } },
          items: [{ from: "@entry[skills/Hunting]", system: { rank: 3 } }],
          effects: [{ name: "Swift 2", rules: [{ key: "Movement", water: 2 }] }]
        }
      ]
    };
    const [dog] = buildPack(creatures, [skills, creatures]).documents;
    const [hunting] = dog.items;
    expect(hunting).toMatchObject({
      name: "Hunting",
      type: "skill",
      _key: `!actors.items!${dog._id}.${hunting._id}`,
      system: { type: "bugei", rank: 3, source: { book: "core", page: 140 } }
    });
    expect(dog.effects).toEqual([
      expect.objectContaining({
        name: "Swift 2",
        type: "base",
        _key: `!actors.effects!${dog._id}.${dog.effects[0]._id}`,
        system: { rules: [{ key: "Movement", water: 2 }] }
      })
    ]);
    expect(() => buildPack(creatures, [creatures])).toThrow(/no entry @entry\[skills\/Hunting\]/);
    expect(referenceProblems([creatures])).toEqual([
      'creatures: Test Dog: no entry "Hunting" in pack skills'
    ]);
  });

  it("should catch a broken entry", () => {
    const broken = {
      name: "test",
      label: "Test",
      documentType: "Item",
      types: ["weapon"],
      pages: [[198, 205]],
      entries: [
        {
          name: "Katana",
          type: "weapon",
          page: 300,
          coverage: "full",
          system: {
            description: "text",
            specialRules: "x".repeat(121),
            rules: [{ key: "Note", text: "a" }]
          }
        },
        { name: "Katana", type: "armor", page: 204, coverage: "partial", system: {} }
      ]
    };
    const problems = sourceProblems(broken).join("\n");
    for (const expected of [
      "page 300",
      "description must stay empty",
      "over 120",
      "full-coverage entry",
      "Note rule",
      "name used twice",
      "type armor",
      "partial-coverage entry"
    ]) {
      expect(problems).toContain(expected);
    }
    expect(() => buildPack(broken)).toThrow(/cannot be built/);
  });
});
