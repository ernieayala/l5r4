import { describe, expect, it } from "vitest";
import {
  codeSpansOf,
  escapeRegExp,
  getRepoTree,
  lineOf,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

/** The single-word terms whose capitals copy keeps everywhere (Stage 17 decision 15, Game terms in copy). */
const CAPITALIZED_WORDS = Object.freeze(["Trait", "Ring", "Skill", "Wound"]);

/** The glossary, parsed once. */
let glossary = null;

/**
 * The glossary's Terms table and its fixed names.
 * @returns {{terms: object[], banned: string[], phrases: string[], fixed: string[]}} The parsed glossary
 */
function glossaryOf() {
  if (!glossary) {
    const page = getRepoTree().text("docs/code-system/glossary.md");
    const terms = tableAfter(page, "Terms");
    glossary = {
      terms,
      banned: terms.flatMap(row => codeSpansOf(row.Banned)),
      phrases: terms.flatMap(row =>
        [...row.Banned.matchAll(/"([^"]+)"/g)].map(([, phrase]) => phrase)
      ),
      fixed: tableAfter(page, "Fixed names the check exempts").flatMap(row =>
        codeSpansOf(row["Fixed name"])
      )
    };
  }
  return glossary;
}

/**
 * The camelCase words of an identifier: `getArmorTNPenalty` is get, Armor, TN, Penalty.
 * @param {string} name - The identifier
 * @returns {string[]} Its words
 */
function wordsOf(name) {
  return name.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g) ?? [];
}

/**
 * Whether two camelCase words are the same word, the case of the first letter aside.
 * @param {string} a - One word
 * @param {string} b - The other
 * @returns {boolean} True when equal
 */
function sameWord(a, b) {
  return (
    a.length === b.length && a[0].toLowerCase() === b[0].toLowerCase() && a.slice(1) === b.slice(1)
  );
}

/**
 * The banned identifier an identifier contains as a run of whole camelCase words, if any.
 * @param {string} name - The identifier
 * @returns {string|null} The banned identifier, or null
 */
function bannedIn(name) {
  const words = wordsOf(name);
  for (const banned of glossaryOf().banned) {
    const run = wordsOf(banned);
    for (let i = 0; i + run.length <= words.length; i++) {
      if (run.every((word, j) => sameWord(word, words[i + j]))) {
        return banned;
      }
    }
  }
  return null;
}

/**
 * Whether an identifier is a fixed name the check exempts, or the rule model class named after a fixed rule key
 * (docs/code-system/naming.md, Rule model).
 * @param {string} name - The identifier or key segment
 * @returns {boolean} True for a fixed name
 */
function isFixed(name) {
  if (
    /^[A-Z0-9_]+$/.test(name) ||
    /^[a-z0-9]+(_[a-z0-9]+)+$/.test(name) ||
    schemaFieldsOf().has(name)
  ) {
    return true;
  }
  return glossaryOf().fixed.some(fixed =>
    fixed.split(".").some(part => part === name || `${part}Rule` === name)
  );
}

/** The repo's schema field names, read once. */
let schemaFields = null;

/**
 * The `system` field names every `defineSchema` in `module/data/` declares: stored in world data, so fixed
 * (Stage 17 decision 2). UPPER_SNAKE constants and the snake_case keys of older stored data are exempt too.
 * @returns {Set<string>} The field names
 */
function schemaFieldsOf() {
  if (!schemaFields) {
    const tree = getRepoTree();
    schemaFields = new Set(
      tree.files("module/data", /\.js$/).flatMap(path => {
        const text = tree.text(path);
        return [...text.matchAll(/defineSchema\(\)\s*\{([\s\S]*?)\n {2}\}/g)].flatMap(([, body]) =>
          [...body.matchAll(/^\s*(\w+):/gm)].map(([, field]) => field)
        );
      })
    );
  }
  return schemaFields;
}

/**
 * The identifiers of a source text, comments left out.
 * @param {string} text - JavaScript or a template
 * @returns {{name: string, index: number}[]} Each identifier and its offset
 */
function identifiersOf(text) {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, comment => " ".repeat(comment.length))
    .replace(/\{\{!--[\s\S]*?--\}\}/g, comment => comment.replace(/[^\n]/g, " "));
  return [...code.matchAll(/[A-Za-z_$][\w$]*/g)].map(match => ({
    name: match[0],
    index: match.index
  }));
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
 * The lang/en.json leaves of a tree.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{key: string, value: string}[]} The leaves
 */
function englishOf(tree) {
  return tree.has("lang/en.json") ? leavesOf(JSON.parse(tree.text("lang/en.json"))) : [];
}

/**
 * The terms whose letter case the copy check holds: every multi-word term, and the single words decision 15 names.
 * @returns {string[]} The terms
 */
function casedTermsOf() {
  return glossaryOf()
    .terms.map(row => row.Term)
    .filter(term => /\s/.test(term) || CAPITALIZED_WORDS.includes(term));
}

/**
 * The places a value writes a term with other capitals than the glossary's. A lowercase term may take a capital as
 * the first word of the value or of a sentence.
 * @param {string} value - The copy
 * @param {string} term - The glossary term
 * @returns {string[]} The wrong spellings found
 */
function miscasedIn(value, term) {
  const pattern = new RegExp(String.raw`\b${escapeRegExp(term)}(e?s)?\b`, "gi");
  return [...value.matchAll(pattern)]
    .filter(match => {
      const written = match[0].slice(0, term.length);
      if (written === term) {
        return false;
      }
      const startsSentence = match.index === 0 || /[.:!?]\s+$/.test(value.slice(0, match.index));
      const capitalized = term[0].toUpperCase() + term.slice(1);
      return !(startsSentence && written === capitalized);
    })
    .map(match => match[0]);
}

/** docs/code-system/glossary.md, Rules. */
const RULES = {
  "glossary/banned-identifier": tree =>
    [
      ...tree.files("module", /\.js$/),
      ...tree.files("dist", /\.js$/),
      ...tree.files("templates", /\.hbs$/)
    ].flatMap(path => {
      const text = tree.text(path);
      return identifiersOf(text).flatMap(({ name, index }) => {
        const banned = isFixed(name) ? null : bannedIn(name);
        return banned
          ? [`${path}:${lineOf(text, index)}: ${name} uses the banned stem ${banned}`]
          : [];
      });
    }),

  "glossary/banned-key": tree =>
    englishOf(tree).flatMap(({ key }) =>
      key.split(".").flatMap(segment => {
        const banned = isFixed(segment) ? null : bannedIn(segment);
        return banned
          ? [`lang/en.json ${key}: the segment ${segment} uses the banned stem ${banned}`]
          : [];
      })
    ),

  "glossary/banned-phrase": tree =>
    englishOf(tree).flatMap(({ key, value }) =>
      glossaryOf()
        .phrases.filter(phrase =>
          new RegExp(String.raw`\b${escapeRegExp(phrase)}(e?s)?\b`).test(value)
        )
        .map(phrase => `lang/en.json ${key}: "${value}" uses the banned phrase "${phrase}"`)
    ),

  "glossary/term-case": tree =>
    englishOf(tree).flatMap(({ key, value }) =>
      casedTermsOf().flatMap(term =>
        miscasedIn(value, term).map(
          written => `lang/en.json ${key}: "${written}" is written "${term}"`
        )
      )
    )
};

registerConventionSuite("Glossary", RULES, "glossary");

describe("Glossary stems", () => {
  it("should match a banned stem as whole camelCase words", () => {
    expect(bannedIn("getArmorTNPenalty")).not.toBeNull();
    expect(bannedIn("rollKeepBonus")).toBe("rollKeep");
    expect(bannedIn("fearTN")).toBe("TN");
    expect(bannedIn("saveTn")).toBeNull();
    expect(bannedIn("tnBase")).toBeNull();
  });
});
