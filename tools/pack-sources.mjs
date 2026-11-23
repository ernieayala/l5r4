/**
 * @module tools/pack-sources
 * @description Turns a pack source in src/packs/<pack>.json into the documents `compilePack` writes
 * (roadmap/STAGE-15): stable ids from the pack and name, a folder per group, the book and page in `system.source`,
 * and the coverage of each entry kept out of the documents. Pure, so Vitest runs it.
 *
 * A source is `{ name, label, documentType, types, pages, entries }`. `pages` lists the printed page ranges its
 * entries may cite. Each entry is `{ name, type, folder, page, coverage, system }`; `coverage` says how much of the
 * entry's mechanics `system.rules` and the item's fields model: `full`, `partial` (a mechanical field summarizes the
 * rest), or `none`. A string in `system` may name another pack's entry as "@entry[pack/Name]", which the build turns
 * into its UUID, so a School's GrantItem rules name its Skills and Techniques.
 */

import { createHash } from "node:crypto";
import { SYS_ID } from "../module/config/constants.js";
import { DEFAULT_ICONS } from "../module/config/item-types.js";

/** The book every pack cites (module/config/sources.js). */
export const BOOK = "core";

/** How much of an entry the engine models. */
export const COVERAGE = Object.freeze(["full", "partial", "none"]);

/** Fields that hold a summary of what the rules do not model (content policy); a creature's is `notes`. */
export const MECHANICAL_FIELDS = Object.freeze([
  "notes",
  "specialRules",
  "effect",
  "raises",
  "mastery3",
  "mastery5",
  "mastery7"
]);

/** Fields for the book's prose, which stay empty in a pack (content policy). */
export const FLAVOR_FIELDS = Object.freeze(["description", "demands"]);

/** The longest a mechanical summary may be (content policy). */
export const SUMMARY_MAX = 120;

/**
 * A 16-character document id that stays the same from build to build.
 * @param {...string} parts - The pack name, then the document's name and kind
 * @returns {string}
 */
export function stableId(...parts) {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);
}

/** A source string's reference to an Item in another pack, by pack and name: "@entry[skills/Lore: History]". */
const REFERENCE = /@entry\[([a-z]+)\/([^\]]+)\]/g;

/**
 * The UUID a pack Item has once built.
 * @param {string} pack
 * @param {string} name
 * @returns {string}
 */
export function entryUuid(pack, name) {
  return `Compendium.${SYS_ID}.${pack}.Item.${stableId(pack, name)}`;
}

/**
 * A value with every reference in its strings turned into the UUID it names.
 * @param {*} value
 * @returns {*}
 */
function resolveReferences(value) {
  if (typeof value === "string") {
    return value.replace(REFERENCE, (_whole, pack, name) => entryUuid(pack, name));
  }
  if (Array.isArray(value)) {
    return value.map(resolveReferences);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveReferences(v)]));
  }
  return value;
}

/**
 * The references in a set of pack sources that name no entry of them, one line each.
 * @param {object[]} sources
 * @returns {string[]}
 */
export function referenceProblems(sources) {
  const names = new Map(
    sources.map(source => [source.name, new Set(source.entries.map(e => e.name))])
  );
  const problems = [];
  for (const source of sources) {
    for (const entry of source.entries) {
      const referencing = { system: entry.system, items: entry.items, effects: entry.effects };
      for (const [, pack, name] of JSON.stringify(referencing).matchAll(REFERENCE)) {
        if (!names.get(pack)?.has(name)) {
          problems.push(`${source.name}: ${entry.name}: no entry "${name}" in pack ${pack}`);
        }
      }
    }
  }
  return problems;
}

/**
 * The text a Note rule in a pack entry holds: the item's name and its citation, never the book's words.
 * @param {string} name
 * @param {number} page
 * @returns {string}
 */
export function noteText(name, page) {
  return `${name}, Core Rulebook p.${page}`;
}

/**
 * Whether a printed page lies in one of the source's page ranges.
 * @param {number[][]} ranges - [first, last] pairs
 * @param {number} page
 * @returns {boolean}
 */
export function pageInRanges(ranges, page) {
  return ranges.some(([first, last]) => page >= first && page <= last);
}

/**
 * What is wrong with a pack source, one line per problem; empty when it may be built.
 * @param {object} source
 * @returns {string[]}
 */
export function sourceProblems(source) {
  const problems = [];
  const seen = new Set();
  for (const entry of source.entries ?? []) {
    const where = `${source.name}: ${entry.name || "(no name)"}`;
    if (!entry.name?.trim()) {
      problems.push(`${where}: no name`);
    }
    if (seen.has(entry.name)) {
      problems.push(`${where}: name used twice`);
    }
    seen.add(entry.name);
    if (!source.types.includes(entry.type)) {
      problems.push(`${where}: type ${entry.type} is not one of ${source.types.join(", ")}`);
    }
    if (!COVERAGE.includes(entry.coverage)) {
      problems.push(`${where}: coverage must be ${COVERAGE.join(", ")}`);
    }
    if (!Number.isInteger(entry.page) || !pageInRanges(source.pages, entry.page)) {
      problems.push(`${where}: page ${entry.page} is outside the pack's pages`);
    }
    const system = entry.system ?? {};
    if ("source" in system) {
      problems.push(`${where}: system.source is written by the build from "page"`);
    }
    for (const field of FLAVOR_FIELDS) {
      if (system[field]) {
        problems.push(`${where}: ${field} must stay empty`);
      }
    }
    const summaries = MECHANICAL_FIELDS.filter(field => system[field]);
    for (const field of summaries) {
      if (String(system[field]).length > SUMMARY_MAX) {
        problems.push(`${where}: ${field} is over ${SUMMARY_MAX} characters`);
      }
    }
    if (entry.coverage === "full" && summaries.length) {
      problems.push(`${where}: a full-coverage entry leaves ${summaries.join(", ")} empty`);
    }
    if (entry.coverage === "partial" && !summaries.length) {
      problems.push(
        `${where}: a partial-coverage entry summarizes what is left in a mechanical field`
      );
    }
    for (const rule of [
      ...(system.rules ?? []),
      ...(entry.effects ?? []).flatMap(e => e.rules ?? [])
    ]) {
      if (rule.key === "Note" && rule.text !== noteText(entry.name, entry.page)) {
        problems.push(`${where}: a Note rule holds "${noteText(entry.name, entry.page)}"`);
      }
    }
  }
  return problems;
}

/**
 * The default image of an item type; a bow uses the bow's.
 * @param {object} entry
 * @returns {string}
 */
function itemImage(entry) {
  if (entry.type === "weapon" && entry.system?.isBow) {
    return DEFAULT_ICONS.bow;
  }
  return DEFAULT_ICONS[entry.type];
}

/** A whole-string reference, as an embedded item's `from`. */
const REFERENCE_ONLY = /^@entry\[([a-z]+)\/([^\]]+)\]$/;

/**
 * An Actor entry's embedded item: a copy of another pack's entry, named by reference in `from`, with the entry's own
 * `system` values laid over it, as a creature's Skill at its rank.
 * game-rules/99_creatures.md, p.318
 * @param {object[]} sources - Every pack source, to find the referenced entry in
 * @param {object} source - The Actor pack's source
 * @param {object} owner - The Actor entry
 * @param {string} ownerId
 * @param {{from: string, system?: object}} spec
 * @returns {object}
 * @throws {Error} When `from` names no entry
 */
function embeddedItem(sources, source, owner, ownerId, spec) {
  const [, pack, name] = REFERENCE_ONLY.exec(spec.from ?? "") ?? [];
  const from = sources.find(s => s.name === pack)?.entries.find(e => e.name === name);
  if (!from) {
    throw new Error(`${source.name}: ${owner.name}: no entry ${spec.from}`);
  }
  const _id = stableId(source.name, owner.name, "item", name);
  return {
    _id,
    _key: `!actors.items!${ownerId}.${_id}`,
    name: from.name,
    type: from.type,
    img: from.img ?? itemImage(from),
    system: {
      ...resolveReferences(from.system),
      source: { book: BOOK, page: from.page },
      ...resolveReferences(spec.system ?? {})
    },
    folder: null,
    sort: 0,
    effects: [],
    flags: {}
  };
}

/**
 * An entry's embedded Active Effect, carrying rules the engine applies while the effect is on the document, as a
 * creature's special abilities.
 * game-rules/99_creatures.md, p.319-320
 * @param {object} source
 * @param {object} owner - The entry
 * @param {string} ownerId
 * @param {{name: string, img?: string, rules: object[]}} effect
 * @returns {object}
 */
function embeddedEffect(source, owner, ownerId, effect) {
  const collection = source.documentType === "Actor" ? "actors" : "items";
  const _id = stableId(source.name, owner.name, "effect", effect.name);
  return {
    _id,
    _key: `!${collection}.effects!${ownerId}.${_id}`,
    name: effect.name,
    img: effect.img ?? "icons/svg/aura.svg",
    type: "base",
    system: { rules: resolveReferences(effect.rules ?? []) },
    disabled: false,
    transfer: false,
    statuses: [],
    description: "",
    flags: {}
  };
}

/**
 * The documents of a pack source: its folders, then its entries. An entry's `effects` become embedded Active Effects;
 * an Actor entry's `items` become embedded copies of the entries they name.
 * @param {object} source
 * @param {object[]} [sources] - Every pack source, for an Actor entry's embedded items
 * @returns {{documents: object[], coverage: Record<string, string>}}
 * @throws {Error} When the source has problems (sourceProblems)
 */
export function buildPack(source, sources = [source]) {
  const problems = sourceProblems(source);
  if (problems.length) {
    throw new Error(`Pack ${source.name} cannot be built:\n${problems.join("\n")}`);
  }
  const collection = source.documentType === "Actor" ? "actors" : "items";
  const folderNames = [...new Set(source.entries.map(entry => entry.folder).filter(Boolean))];
  const folderIds = Object.fromEntries(
    folderNames.map(name => [name, stableId(source.name, "folder", name)])
  );
  const folders = folderNames.map(name => ({
    _id: folderIds[name],
    _key: `!folders!${folderIds[name]}`,
    name,
    type: source.documentType,
    folder: null,
    sorting: "a",
    sort: 0,
    color: null,
    description: "",
    flags: {}
  }));
  const entries = source.entries.map(entry => {
    const _id = stableId(source.name, entry.name);
    const doc = {
      _id,
      _key: `!${collection}!${_id}`,
      name: entry.name,
      type: entry.type,
      img: entry.img ?? itemImage(entry),
      system: { ...resolveReferences(entry.system), source: { book: BOOK, page: entry.page } },
      folder: entry.folder ? folderIds[entry.folder] : null,
      sort: 0,
      effects: (entry.effects ?? []).map(effect => embeddedEffect(source, entry, _id, effect)),
      flags: {}
    };
    if (source.documentType === "Actor") {
      doc.items = (entry.items ?? []).map(spec => embeddedItem(sources, source, entry, _id, spec));
    }
    return doc;
  });
  const coverage = Object.fromEntries(source.entries.map(entry => [entry.name, entry.coverage]));
  return { documents: [...folders, ...entries], coverage };
}
