import { readFile, readdir } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  codeSpansOf,
  getRepoTree,
  isSentenceCase,
  registerConventionSuite,
  tableAfter
} from "../tools/conventions/shared.mjs";

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

/**
 * The leaf keys of a lang tree that no source names: not written out, not under a prefix the code builds keys from
 * ("prefix." + x, `prefix.${x}`, or Handlebars (concat "prefix." x)), and not a subtype label core reads.
 * @param {object} tree - A parsed lang file
 * @param {string} text - Every source, comments dropped
 * @param {string[]} types - The `TYPES.<Document>.<subtype>` keys core reads
 * @returns {string[]} The unused keys
 */
function unusedKeysOf(tree, text, types) {
  const prefixes = [
    ...text.matchAll(/[`"']([A-Za-z0-9_]+\.[A-Za-z0-9_.]*\.)(?:\$\{|["']\s*\+)/g),
    ...text.matchAll(/\(concat ["']([A-Za-z0-9_]+\.[A-Za-z0-9_.]*\.)["']/g)
  ].map(([, prefix]) => prefix);
  // Whole dotted paths only, so a key does not count as used inside a longer key that starts with it
  const written = new Set(text.match(/[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+/g));
  const leaves = (node, path) =>
    typeof node === "string"
      ? [path]
      : Object.entries(node).flatMap(([key, child]) =>
          leaves(child, path ? `${path}.${key}` : key)
        );
  return leaves(tree, "").filter(
    key =>
      !written.has(key) && !prefixes.some(prefix => key.startsWith(prefix)) && !types.includes(key)
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

describe("Key coverage of lang/en.json", () => {
  it("should define every key written out in code and templates", () => {
    const missing = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/["'](l5r4\.[A-Za-z0-9_.]+[A-Za-z0-9_])["']/g)]
        .filter(([, key]) => typeof lookup(lang, key) !== "string")
        .map(([, key]) => `${key} (${path})`)
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  // roadmap/STAGE-16
  it("should hold no key the system never uses", async () => {
    // Core labels each declared subtype with TYPES.<Document>.<subtype>
    const { documentTypes } = JSON.parse(await readFile(new URL("system.json", root), "utf8"));
    const types = Object.entries(documentTypes).flatMap(([doc, subtypes]) =>
      Object.keys(subtypes).map(type => `TYPES.${doc}.${type}`)
    );
    const text = sources.map(({ text }) => text).join("\n");
    expect(unusedKeysOf(lang, text, types)).toEqual([]);
  });

  it("should define the group under every key built from a template literal", () => {
    const missing = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/`(l5r4\.[A-Za-z0-9_.]+)\.\$\{/g)]
        .filter(([, prefix]) => typeof lookup(lang, prefix) !== "object")
        .map(([, prefix]) => `${prefix} (${path})`)
    );
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe("Unused key detection", () => {
  const fixture = {
    l5r4: {
      weapons: { fallback: "Fallback", fallbackTrait: "Fallback Trait" },
      rings: { air: "Air", water: "Water" },
      common: { roll: "Roll" }
    },
    TYPES: { Item: { skill: "Skill" } }
  };

  it("should report a key whose path only appears inside a longer key", () => {
    const text = `T("l5r4.weapons.fallbackTrait"); (concat "l5r4.rings." ring); "l5r4.common.roll"`;
    expect(unusedKeysOf(fixture, text, ["TYPES.Item.skill"])).toEqual(["l5r4.weapons.fallback"]);
  });

  it("should count a key written whole, a built-key prefix, and a declared subtype as used", () => {
    const text = `"l5r4.weapons.fallback" "l5r4.weapons.fallbackTrait" \`l5r4.rings.\${ring}\` 'l5r4.common.roll'`;
    expect(unusedKeysOf(fixture, text, ["TYPES.Item.skill"])).toEqual([]);
  });
});

/** The community translations beside lang/en.json (CLAUDE.md Project Context). */
const TRANSLATIONS = Object.freeze(["de", "es", "fr", "pt-BR", "ru"]);

/** The areas under `l5r4.` (docs/design-system/content/localization.md, Key paths). */
const AREAS = Object.freeze(["apps", "ui", "character", "equipment", "magic", "system", "world"]);

/** The Intl plural categories a plural group holds (localization.md, Plurals). */
const PLURAL_CATEGORIES = Object.freeze(["zero", "one", "two", "few", "many", "other"]);

/**
 * The English a translation's key answers to. A plural category `en.json` leaves out (a translation adds the
 * categories its language needs, localization.md Plurals) answers to its group's `other`, when that group is a plural
 * group with `one` and `other`.
 * @param {object} en - The parsed `en.json`
 * @param {string} key - The translation's key
 * @returns {unknown} The English value, or undefined when there is none
 */
function englishFor(en, key) {
  const english = lookup(en, key);
  const segments = key.split(".");
  if (english !== undefined || !PLURAL_CATEGORIES.includes(segments.at(-1))) {
    return english;
  }
  const group = lookup(en, segments.slice(0, -1).join("."));
  return typeof group?.one === "string" && typeof group?.other === "string"
    ? group.other
    : undefined;
}

/** The abbreviations copy may write (docs/design-system/content/voice.md, Abbreviations), and the system's name. */
const ABBREVIATIONS = Object.freeze(["TN", "XP", "NPC", "PC", "GM", "DR", "L5R4", "XkY"]);

/**
 * A tree's lang file, parsed, or null when the tree has none.
 * @param {import("../tools/conventions/shared.mjs").Tree} tree - The tree
 * @param {string} code - The language code
 * @returns {object|null} The parsed file
 */
function langOf(tree, code) {
  const path = `lang/${code}.json`;
  return tree.has(path) ? JSON.parse(tree.text(path)) : null;
}

/**
 * Every leaf of a lang file: its key path and value.
 * @param {object} node - The parsed JSON
 * @param {string} [path] - The key path so far
 * @returns {{key: string, value: string}[]} The leaves
 */
function leavesOf(node, path = "") {
  return Object.entries(node).flatMap(([key, child]) => {
    const full = path ? `${path}.${key}` : key;
    return typeof child === "string" ? [{ key: full, value: child }] : leavesOf(child, full);
  });
}

/**
 * Every group of a lang file: its key path and the group object.
 * @param {object} node - The parsed JSON
 * @param {string} [path] - The key path so far
 * @returns {{key: string, group: object}[]} The groups, the root included
 */
function groupsOf(node, path = "") {
  return [
    { key: path, group: node },
    ...Object.entries(node)
      .filter(([, child]) => typeof child === "object")
      .flatMap(([key, child]) => groupsOf(child, path ? `${path}.${key}` : key))
  ];
}

/**
 * The English leaves of a tree.
 * @param {import("../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{key: string, value: string}[]} The leaves
 */
function englishOf(tree) {
  const en = langOf(tree, "en");
  return en ? leavesOf(en) : [];
}

/** The fixed key segments, read once. */
let fixedSegments = null;

/**
 * The key segments localization.md fixes, they mirror stored or external names, with every rule key naming.md
 * lists (localization.md abbreviates that list).
 * @returns {Set<string>} The fixed segments
 */
function fixedSegmentsOf() {
  if (!fixedSegments) {
    const tree = getRepoTree();
    const localization = tableAfter(
      tree.text("docs/design-system/content/localization.md"),
      "Fixed names"
    );
    const ruleData = tableAfter(tree.text("docs/code-system/naming.md"), "Fixed names").find(
      row => row.Kind === "Rule data"
    );
    fixedSegments = new Set([
      ...localization.flatMap(row =>
        codeSpansOf(row.Segment).flatMap(code => code.split(/[.\s]+/))
      ),
      ...codeSpansOf(ruleData.Names)
    ]);
  }
  return fixedSegments;
}

/**
 * The trees localization.md removes in favor of a winning tree.
 * @returns {string[]} The removed key paths
 */
function removedTreesOf() {
  const page = getRepoTree().text("docs/design-system/content/localization.md");
  return tableAfter(page, "Duplicate trees")
    .flatMap(row => codeSpansOf(row.Removed))
    .filter(code => /^[a-z][\w.]*\.[\w.]+$/.test(code))
    .map(code => (code.startsWith("l5r4.") ? code : `l5r4.${code}`));
}

/**
 * The keys the system passes to `ui.notifications`, which voice.md writes without a trailing period.
 * @param {import("../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Set<string>} The notification keys
 */
function notificationKeysOf(tree) {
  const keys = new Set();
  for (const path of [...tree.files("module", /\.js$/), ...tree.files("dist", /\.js$/)]) {
    const pattern =
      /ui\.notifications\??\.(?:info|warn|error)\(\s*(?:T|F|game\.i18n\.localize)\(\s*["'`](l5r4\.[\w.]+)["'`]/g;
    for (const [, key] of tree.text(path).matchAll(pattern)) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * The placeholders of a value, sorted.
 * @param {string} value - The copy
 * @returns {string[]} The placeholders, braces included
 */
function placeholdersOf(value) {
  return [...value.matchAll(/\{[^{}]*\}/g)].map(([placeholder]) => placeholder).sort();
}

/**
 * The leaves of a value whose text a pattern finds.
 * @param {import("../tools/conventions/shared.mjs").Tree} tree - The tree
 * @param {RegExp} pattern - What the copy never holds
 * @param {string} rule - The rule, for the message
 * @returns {string[]} The violations
 */
function valuesMatching(tree, pattern, rule) {
  return englishOf(tree)
    .filter(({ value }) => pattern.test(value))
    .map(({ key, value }) => `lang/en.json ${key}: "${value}" ${rule}`);
}

/**
 * The groups holding the book's names of game things, which keep the book's capitals as proper names
 * (docs/design-system/content/voice.md, Names of game things).
 */
const NAME_GROUPS = Object.freeze([
  "l5r4.character.skills.names.",
  "l5r4.equipment.weapons.arrows."
]);

/**
 * The words of the book's names of game things in a tree's English copy.
 * @param {import("../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Set<string>} The capitalized words
 */
function nameWordsOf(tree) {
  return new Set(
    englishOf(tree)
      .filter(({ key }) => NAME_GROUPS.some(group => key.startsWith(group)))
      .flatMap(({ value }) => value.split(/\s+/))
      .filter(word => /^[A-Z]/.test(word))
  );
}

/** docs/design-system/content/voice.md and localization.md, the rules a pattern can test. */
const COPY_RULES = {
  "lang/sentence-case": tree => {
    const names = nameWordsOf(tree);
    return englishOf(tree)
      .filter(
        ({ key }) => !key.startsWith("TYPES.") && !fixedSegmentsOf().has(key.split(".").at(-1))
      )
      .filter(({ value }) => {
        const words = value.trim().split(/\s+/);
        return words.length >= 2 && words.length <= 6 && !/[{}.!?:;]/.test(value);
      })
      .filter(({ value }) => !isSentenceCase(value, names))
      .map(({ key, value }) => `lang/en.json ${key}: "${value}" is not in sentence case`);
  },

  "lang/label-period": tree =>
    englishOf(tree)
      .filter(({ key }) => /(^|\.)title$/.test(key) || /\.(tabs|common)\./.test(key))
      .filter(({ value }) => /\.$/.test(value.trim()))
      .map(({ key, value }) => `lang/en.json ${key}: "${value}" is a label; no trailing period`),

  "lang/hint-period": tree =>
    englishOf(tree)
      .filter(({ key }) => /(^|\.)hint$|Hint$/.test(key))
      .filter(({ value }) => !/\.$/.test(value.trim()))
      .map(({ key, value }) => `lang/en.json ${key}: "${value}" is a hint; end it with a period`),

  "lang/notification-period": tree => {
    const keys = notificationKeysOf(tree);
    return englishOf(tree)
      .filter(({ key, value }) => keys.has(key) && /\.$/.test(value.trim()))
      .map(
        ({ key, value }) => `lang/en.json ${key}: "${value}" is a notification; no trailing period`
      );
  },

  "lang/exclamation": tree => valuesMatching(tree, /!\s*$/, 'ends with "!"'),

  "lang/capitals": tree =>
    englishOf(tree)
      .filter(({ value }) =>
        [...value.matchAll(/\b([A-Z]{2,})\s+([A-Z]{2,})\b/g)].some(
          ([, a, b]) => !ABBREVIATIONS.includes(a) || !ABBREVIATIONS.includes(b)
        )
      )
      .map(({ key, value }) => `lang/en.json ${key}: "${value}" writes words in capitals`),

  "lang/delete-word": tree =>
    valuesMatching(tree, /\bDelete\b/, 'says "Delete"; copy says "Remove"'),

  "lang/contraction": tree =>
    valuesMatching(tree, /n't\b|^L5R4\b/, 'holds a contraction or a leading "L5R4"'),

  "lang/placeholder-name": tree =>
    englishOf(tree)
      .filter(({ value }) =>
        placeholdersOf(value).some(
          placeholder =>
            !/^\{[a-z][a-zA-Z0-9]*\}$/.test(placeholder) ||
            /^\{(character|actor|creature)\}$/.test(placeholder)
        )
      )
      .map(
        ({ key, value }) =>
          `lang/en.json ${key}: "${value}" holds a placeholder localization.md does not allow`
      ),

  "lang/dice-notation": tree =>
    valuesMatching(
      tree,
      /(\d|\})k[A-Za-z]|(\d|\})\s*x\s*(\d|\{)/,
      "writes a pool or a product in the wrong notation"
    ),

  "lang/abbreviation": tree =>
    valuesMatching(
      tree,
      /\b(Max|Min)\b|\be\.g\.|\bvs\b|Experience Points/,
      "uses an abbreviation voice.md writes out"
    ),

  "lang/spaced-hyphen": tree => valuesMatching(tree, /\w - \w/, 'uses " - " as a dash'),

  "lang/click-to": tree => valuesMatching(tree, /^Click to\b/, 'starts "Click to"'),

  "lang/plural-parens": tree =>
    valuesMatching(tree, /\(s\)/, 'writes a plural as "(s)"; use a plural group'),

  "lang/plural-group": tree =>
    groupsOf(langOf(tree, "en") ?? {})
      .filter(({ group }) => "one" in group && !("other" in group))
      .map(({ key }) => `lang/en.json ${key}: a plural group with "one" has "other"`),

  "lang/key-path": tree =>
    englishOf(tree)
      .filter(({ key }) => !key.startsWith("TYPES."))
      .filter(({ key }) => {
        const segments = key.split(".");
        const plural = PLURAL_CATEGORIES.includes(segments.at(-1)) ? 1 : 0;
        const depth = segments.length - plural;
        return segments[0] !== "l5r4" || !AREAS.includes(segments[1]) || depth < 4 || depth > 5;
      })
      .map(({ key }) => `lang/en.json ${key}: not l5r4.<area>.<group>.<key> at depth 4 or 5`),

  "lang/key-segment": tree => {
    const fixed = fixedSegmentsOf();
    return englishOf(tree)
      .filter(({ key }) => !key.startsWith("TYPES."))
      .flatMap(({ key }) => {
        const segments = key.split(".");
        return segments
          .filter((segment, i) => {
            if (fixed.has(segment)) {
              return false;
            }
            const parent = segments[i - 1];
            return (
              !/^[a-z][a-zA-Z0-9]*$/.test(segment) ||
              /TN/.test(segment) ||
              (parent && segment.toLowerCase().startsWith(parent.toLowerCase()))
            );
          })
          .map(
            segment => `lang/en.json ${key}: segment "${segment}" breaks localization.md Segments`
          );
      });
  },

  "lang/standard-leaves": tree =>
    groupsOf(langOf(tree, "en") ?? {}).flatMap(({ key, group }) => [
      ...Object.keys(group)
        .filter(
          name => typeof group[name] === "object" && ["error", "label", "help"].includes(name)
        )
        .map(name => `lang/en.json ${key}.${name}: a group is not named error, label, or help`),
      ...Object.keys(group)
        .filter(name => typeof group[name] === "string" && /(Tooltip|Description)$/.test(name))
        .map(name => `lang/en.json ${key}.${name}: no leaf ends Tooltip or Description`),
      ...Object.keys(group)
        .filter(name => /^\w+Hint$/.test(name) && !(name.replace(/Hint$/, "") in group))
        .map(name => `lang/en.json ${key}.${name}: a <field>Hint has a sibling <field>`)
    ]),

  "lang/removed-tree": tree => {
    const en = langOf(tree, "en") ?? {};
    return removedTreesOf()
      .filter(path => lookup(en, path) !== undefined)
      .map(
        path => `lang/en.json ${path}: localization.md removes this tree in favor of its winner`
      );
  },

  "lang/key-order": tree =>
    ["en", ...TRANSLATIONS].flatMap(code => {
      const parsed = langOf(tree, code);
      return parsed
        ? groupsOf(parsed)
            .filter(({ group }) => {
              const keys = Object.keys(group);
              return (
                keys.join("\n") !== [...keys].sort((a, b) => a.localeCompare(b, "en")).join("\n")
              );
            })
            .map(({ key }) => `lang/${code}.json ${key || "(root)"}: keys are not sorted`)
        : [];
    }),

  "lang/translation-key": tree => {
    const en = langOf(tree, "en") ?? {};
    return TRANSLATIONS.flatMap(code => {
      const parsed = langOf(tree, code);
      if (!parsed) {
        return [];
      }
      return [...leavesOf(parsed), ...groupsOf(parsed).filter(({ key }) => key)]
        .filter(({ key, group }) => {
          const english = englishFor(en, key);
          return group ? typeof english !== "object" : typeof english !== "string";
        })
        .map(({ key }) => `lang/${code}.json ${key}: not in lang/en.json with the same type`);
    });
  },

  "lang/translation-placeholders": tree => {
    const en = langOf(tree, "en") ?? {};
    return TRANSLATIONS.flatMap(code => {
      const parsed = langOf(tree, code);
      return parsed
        ? leavesOf(parsed)
            .filter(({ key, value }) => {
              const english = englishFor(en, key);
              const set = text => [...new Set(placeholdersOf(text))].join();
              return typeof english === "string" && set(english) !== set(value);
            })
            .map(({ key }) => `lang/${code}.json ${key}: placeholders differ from lang/en.json`)
        : [];
    });
  },

  "lang/translation-order": tree => {
    const en = langOf(tree, "en") ?? {};
    const order = new Map(leavesOf(en).map(({ key }, i) => [key, i]));
    return TRANSLATIONS.flatMap(code => {
      const parsed = langOf(tree, code);
      if (!parsed) {
        return [];
      }
      const positions = leavesOf(parsed)
        .map(({ key }) => ({ key, at: order.get(key) }))
        .filter(({ at }) => at !== undefined);
      return positions
        .filter(({ at }, i) => i > 0 && at < positions[i - 1].at)
        .map(({ key }) => `lang/${code}.json ${key}: out of lang/en.json's order`);
    });
  }
};

registerConventionSuite("Copy", COPY_RULES, "lang");
