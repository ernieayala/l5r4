/**
 * @module tools/conventions/shared
 * @description What the convention checks in `tests/conventions/` share: a file tree read from the repo or from a
 * fixture, JavaScript and SCSS parsing, the docs' Markdown tables (`markdown.mjs`), and the report-mode baseline.
 * Each check computes its violations per rule; `tests/conventions/baseline.json` holds the count each rule may have;
 * a test fails only when a count rises above its baseline, so a rule whose baseline is 0 is strict.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { codeSpansOf, escapeRegExp, tableAfter, tablesUnder } from "./markdown.mjs";

export { codeSpansOf, escapeRegExp, tableAfter, tablesUnder };

/** The repo root. */
export const REPO = fileURLToPath(new URL("../../", import.meta.url));

/** Where each check's violating (`bad/`) and conforming (`good/`) fixture trees live. */
export const FIXTURES = join(REPO, "tests/fixtures/conventions");

/** The folders a repo tree reads; everything the checks look at lives in one of them. */
const TREE_DIRS = Object.freeze([
  "docs",
  "dist",
  "lang",
  "module",
  "scripts",
  "scss",
  "templates",
  "tests",
  "tools"
]);

/** Folders no check reads: dependencies, generated output, and the fixtures of the checks themselves. */
const SKIPPED = Object.freeze(["node_modules", ".git", "tests/fixtures/conventions"]);

/** A fixture file that adds files and empty folders git cannot hold, or names a test file Vitest would run. */
const VIRTUAL = "virtual.json";

/**
 * A repo's files and folders, read once. Paths are relative to the root, with forward slashes.
 */
export class Tree {
  /**
   * Read a tree.
   * @param {string} root - The folder the paths are relative to
   * @param {object} [options] - What to read
   * @param {string[]} [options.dirs] - Top-level folders to read; all of them when absent
   * @param {string[]} [options.skip] - Path prefixes left out
   */
  constructor(root, { dirs, skip = SKIPPED } = {}) {
    this.root = root;
    this.virtual = new Map();
    this.paths = [];
    this.folders = [];
    const tops = dirs ?? readdirSync(root);
    for (const top of tops) {
      if (existsSync(join(root, top))) {
        this.#read(top, skip);
      }
    }
    const extra = join(root, VIRTUAL);
    if (existsSync(extra)) {
      const { files = {}, dirs: emptyDirs = [] } = JSON.parse(readFileSync(extra, "utf8"));
      for (const [path, text] of Object.entries(files)) {
        this.virtual.set(path, text);
        this.paths.push(path);
        const parts = path.split("/");
        for (let depth = 1; depth < parts.length; depth++) {
          this.folders.push(parts.slice(0, depth).join("/"));
        }
      }
      this.folders.push(...emptyDirs);
    }
    this.paths = this.paths.filter(path => path !== VIRTUAL).sort();
    this.folders = [...new Set(this.folders)].sort();
    this.cache = new Map();
  }

  /**
   * Walk one entry, adding its files and folders.
   * @param {string} path - The entry, relative to the root
   * @param {string[]} skip - Path prefixes left out
   */
  #read(path, skip) {
    if (skip.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }
    const full = join(this.root, path);
    let entries;
    try {
      entries = readdirSync(full, { withFileTypes: true });
    } catch {
      this.paths.push(path);
      return;
    }
    this.folders.push(path);
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) {
        this.#read(child, skip);
      } else if (entry.isFile()) {
        if (!skip.some(prefix => child.startsWith(`${prefix}/`))) {
          this.paths.push(child);
        }
      }
    }
  }

  /**
   * The files under a folder whose path matches.
   * @param {string} prefix - A folder ("module") or "" for every file
   * @param {RegExp} [pattern] - Paths kept
   * @returns {string[]} The paths, sorted
   */
  files(prefix, pattern = /./) {
    const start = prefix ? `${prefix}/` : "";
    return this.paths.filter(path => path.startsWith(start) && pattern.test(path));
  }

  /**
   * The folders under a folder, the folder itself included.
   * @param {string} prefix - A top-level folder
   * @returns {string[]} The folder paths, sorted
   */
  dirs(prefix) {
    return this.folders.filter(path => path === prefix || path.startsWith(`${prefix}/`));
  }

  /**
   * Whether a file exists in the tree.
   * @param {string} path - The file's path
   * @returns {boolean} True when the tree holds it
   */
  has(path) {
    return this.paths.includes(path);
  }

  /**
   * A file's text, read once.
   * @param {string} path - The file's path
   * @returns {string} Its text, with Windows line ends made Unix
   */
  text(path) {
    if (!this.cache.has(path)) {
      const raw = this.virtual.get(path) ?? readFileSync(join(this.root, path), "utf8");
      this.cache.set(path, raw.replaceAll("\r\n", "\n"));
    }
    return this.cache.get(path);
  }
}

/** The repo, read once for every check. */
let repoTree = null;

/**
 * The repo's tree, read once.
 * @returns {Tree} The repo tree
 */
export function getRepoTree() {
  repoTree ??= new Tree(REPO, { dirs: TREE_DIRS });
  return repoTree;
}

/** Fixture trees by check, read once. */
const fixtureTrees = new Map();

/**
 * A check's violating and conforming fixture trees, read once.
 * @param {string} check - The check's fixture folder under `tests/fixtures/conventions/`
 * @returns {{bad: Tree, good: Tree}} The two trees
 */
export function getFixtureTrees(check) {
  if (!fixtureTrees.has(check)) {
    fixtureTrees.set(check, {
      bad: new Tree(join(FIXTURES, check, "bad"), { skip: [] }),
      good: new Tree(join(FIXTURES, check, "good"), { skip: [] })
    });
  }
  return fixtureTrees.get(check);
}

/**
 * The 1-based line of a character offset.
 * @param {string} text - The text
 * @param {number} index - The offset
 * @returns {number} The line
 */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
    }
  }
  return line;
}

/** One parser, reused for every file. */
const linter = new Linter({ configType: "flat" });

/** Parse options for the system's JavaScript. */
const PARSE_CONFIG = Object.freeze([
  { languageOptions: { ecmaVersion: "latest", sourceType: "module" }, rules: {} }
]);

/**
 * Parse JavaScript into an ESTree program with its comments.
 * @param {string} text - The source
 * @returns {{ast: object, comments: object[]}|null} The program, or null when the source does not parse
 */
export function parseJs(text) {
  const messages = linter.verify(text, PARSE_CONFIG);
  if (messages.some(message => message.fatal)) {
    return null;
  }
  const source = linter.getSourceCode();
  return { ast: source.ast, comments: source.getAllComments() };
}

/**
 * Visit every node of an ESTree tree, with its ancestors.
 * @param {object} node - The root node
 * @param {(node: object, ancestors: object[]) => void} visit - Called for each node
 * @param {object[]} [ancestors] - The nodes above `node`
 */
export function walkAst(node, visit, ancestors = []) {
  visit(node, ancestors);
  const below = [...ancestors, node];
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "tokens") {
      continue;
    }
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === "string") {
        walkAst(child, visit, below);
      }
    }
  }
}

/**
 * Replace every character but newlines with a space, so offsets keep their lines.
 * @param {string} text - The text to blank
 * @returns {string} The blanked text
 */
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

/**
 * Parse SCSS into its blocks and statements: enough structure for the style checks, not a full parser.
 * @param {string} text - The stylesheet
 * @returns {{blocks: {chain: string[], line: number}[], statements: {chain: string[], text: string, prop: string|null, value: string|null, line: number}[]}}
 *   Each block's chain of preludes (selectors and at-rules, outermost first), and each statement inside a chain:
 *   a declaration (`prop` and `value`) or an at-rule such as `@include`
 */
export function parseScss(text) {
  const source = text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'])(\/\/[^\n]*)/g, (match, before, comment) => before + blank(comment));
  const blocks = [];
  const statements = [];
  const chain = [];
  let buffer = "";
  let start = -1;
  let line = 1;
  let startLine = 1;
  const flush = () => {
    const statement = buffer.trim();
    if (statement) {
      const declaration = /^([$\w-]+)\s*:\s*([\s\S]*)$/.exec(statement);
      statements.push({
        chain: [...chain],
        text: statement,
        prop: declaration && !statement.startsWith("@") ? declaration[1] : null,
        value: declaration && !statement.startsWith("@") ? declaration[2].trim() : null,
        line: startLine
      });
    }
    buffer = "";
    start = -1;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\n") {
      line++;
    }
    if (start < 0 && /\S/.test(char) && !"{};".includes(char)) {
      start = i;
      startLine = line;
    }
    if (char === '"' || char === "'") {
      const end = source.indexOf(char, i + 1);
      const stop = end < 0 ? source.length - 1 : end;
      buffer += source.slice(i, stop + 1);
      line += (source.slice(i + 1, stop + 1).match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }
    if (char === "{" && buffer.endsWith("#")) {
      let depth = 1;
      let j = i + 1;
      for (; j < source.length && depth > 0; j++) {
        depth += source[j] === "{" ? 1 : source[j] === "}" ? -1 : 0;
      }
      buffer += source.slice(i, j);
      i = j - 1;
      continue;
    }
    if (char === "{") {
      chain.push(buffer.trim());
      blocks.push({ chain: [...chain], line: startLine });
      buffer = "";
      start = -1;
    } else if (char === ";") {
      flush();
    } else if (char === "}") {
      flush();
      chain.pop();
    } else {
      buffer += char;
    }
  }
  flush();
  return { blocks, statements };
}

/**
 * Capitalized words a sentence-case name may hold besides game terms: Ring and Trait names, the book's own titles
 * (the Core Rulebook, its Little Truths sidebar), products.
 */
const PROPER_NAMES = Object.freeze([
  "Rulebook",
  "Little",
  "Truths",
  "Air",
  "Earth",
  "Fire",
  "Water",
  "Void",
  "Stamina",
  "Willpower",
  "Strength",
  "Perception",
  "Reflexes",
  "Awareness",
  "Agility",
  "Intelligence",
  "Foundry",
  "Quench",
  "Sequencer",
  "Handlebars",
  "Vitest"
]);

/** The capitalized words of the glossary's terms, read once. */
let capitalizedWords = null;

/**
 * The words that keep a capital inside sentence-case copy and names: each capitalized word of a glossary term
 * (docs/code-system/glossary.md, Terms), and the Ring, Trait, and product names.
 * @returns {Set<string>} The words
 */
export function getCapitalizedWords() {
  if (!capitalizedWords) {
    const terms = tableAfter(getRepoTree().text("docs/code-system/glossary.md"), "Terms").map(
      row => row.Term
    );
    capitalizedWords = new Set(
      [...terms.flatMap(term => term.split(/\s+/)), ...PROPER_NAMES].filter(word =>
        /^[A-Z]/.test(word)
      )
    );
  }
  return capitalizedWords;
}

/**
 * Whether text is in sentence case: after the first word, a capital only on a game term, a proper name, an
 * acronym, or an identifier.
 * @param {string} text - The name or label
 * @param {Set<string>} [names] - More words that keep a capital, such as the words of the book's Skill names
 * @returns {boolean} True for sentence case
 */
export function isSentenceCase(text, names = new Set()) {
  const allowed = new Set([...getCapitalizedWords(), ...names]);
  const words = text.split(/\s+/).map(word => word.replace(/^[^\w]+|[^\w]+$/g, ""));
  return words.slice(1).every(word => {
    if (!/^[A-Z]/.test(word) || /^[A-Z0-9]{2,}s?$/.test(word) || /[a-z][A-Z]|\d/.test(word)) {
      return true;
    }
    // Plurals: Skills, Wounds, Emphases (Emphasis)
    const forms = [
      word,
      word.replace(/e?s$/, ""),
      word.replace(/s$/, ""),
      word.replace(/es$/, "is")
    ];
    return forms.some(form => allowed.has(form));
  });
}

/** The baseline file: the violation count each rule may have. */
const BASELINE = join(REPO, "tests/conventions/baseline.json");

/**
 * The baseline counts.
 * @returns {Record<string, number>} Count per rule key
 */
export function readBaseline() {
  return JSON.parse(readFileSync(BASELINE, "utf8"));
}

/**
 * Assert a rule's violations do not outnumber its baseline, printing them when they do.
 * @param {string} key - The rule's baseline key
 * @param {string[]} violations - One line per violation
 * @param {Record<string, number>} [baseline] - The baseline counts
 */
export function expectWithinBaseline(key, violations, baseline = readBaseline()) {
  const allowed = baseline[key];
  if (violations.length > 0 || allowed === undefined) {
    console.info(`[conventions] ${key}: ${violations.length} (baseline ${allowed})`);
  }
  expect(
    baseline,
    `add "${key}": ${violations.length} to tests/conventions/baseline.json`
  ).toHaveProperty([key]);
  if (violations.length < allowed) {
    console.info(`[conventions] ${key} is below its baseline: lower it to ${violations.length}`);
  }
  const listing = `${key}: ${violations.length} violations, baseline ${allowed}\n${violations.join("\n")}`;
  expect(violations.length, listing).toBeLessThanOrEqual(allowed);
}

/**
 * Register a check's Vitest cases: each rule stays within its baseline on the repo, fails on the check's violating
 * fixture, and passes on its conforming one.
 * @param {string} title - The `describe` name
 * @param {Record<string, (tree: Tree) => string[]>} rules - Each rule's baseline key and its collector
 * @param {string} fixture - The check's fixture folder under `tests/fixtures/conventions/`
 */
export function registerConventionSuite(title, rules, fixture) {
  const keys = Object.keys(rules);
  const prefix = `${keys[0].split("/")[0]}/`;
  describe(title, () => {
    it.each(keys)("should keep %s at or below its baseline", key => {
      expectWithinBaseline(key, rules[key](getRepoTree()));
    });

    it.each(keys)("should fail %s on its violating fixture", key => {
      expect(rules[key](getFixtureTrees(fixture).bad).length).toBeGreaterThan(0);
    });

    it.each(keys)("should pass %s on its conforming fixture", key => {
      expect(rules[key](getFixtureTrees(fixture).good)).toEqual([]);
    });

    it("should hold no baseline key for a rule the check does not run", () => {
      const stale = Object.keys(readBaseline()).filter(
        key => key.startsWith(prefix) && !keys.includes(key)
      );
      expect(stale).toEqual([]);
    });
  });
}
