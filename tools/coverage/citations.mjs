/**
 * @module tools/coverage/citations
 * @description The citation check (roadmap/STAGE-16, CI). Reads the page citations in `module/` and `tests/`
 * (CLAUDE.md **CITE THE RULE**: `p.82`, `pp.86-87`, `pp.82, 198-199`) and the page of each pack entry in
 * `src/packs/`, and joins them with the manifest's rule entries. It fails on a malformed entry, an `automated` entry whose code cites none of its pages or whose code or
 * test paths do not exist, a `manual` or `out` entry with no decision in an existing file, and a citation to a page
 * no entry covers. It needs only the repo, not `game-rules/` (decision 3).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** What a rule page can be (decision 4): automated and tested, left to the table, advice, or not planned. */
export const STATUSES = Object.freeze(["automated", "manual", "advice", "out"]);

/** A page list: `82`, `86-87`, `82, 198-199`. */
const PAGE_LIST = String.raw`\d+(?:\s*[-–]\s*\d+)?(?:,\s*\d+(?:\s*[-–]\s*\d+)?)*`;
const CITATION = new RegExp(String.raw`\bpp?\.\s?(${PAGE_LIST})`, "g");

/**
 * The pages a page list names, a range expanded.
 * @param {string} list
 * @returns {number[]}  Empty when the list is malformed or a range runs backwards
 */
export function pagesOf(list) {
  if (!new RegExp(`^${PAGE_LIST}$`).test(String(list).trim())) {
    return [];
  }
  const pages = [];
  for (const part of String(list).split(",")) {
    const [from, to = from] = part.split(/[-–]/).map(text => Number(text.trim()));
    if (to < from) {
      return [];
    }
    for (let page = from; page <= to; page++) {
      pages.push(page);
    }
  }
  return pages;
}

/**
 * The citations in a source file's text.
 * @param {string} text
 * @returns {{pages: number[], line: number}[]}
 */
export function citationsIn(text) {
  const lineOf = index => text.slice(0, index).split("\n").length;
  return [...text.matchAll(CITATION)].map(match => ({
    pages: pagesOf(match[1]),
    line: lineOf(match.index)
  }));
}

/**
 * The pages a source file cites: its `p.N` citations, or for a pack source (`src/packs/*.json`) the page of each
 * entry, which is where that entry's numbers and rules come from.
 * @param {{path: string, text: string}} source
 * @returns {{pages: number[], line: number}[]}
 */
export function citationsOf({ path, text }) {
  if (path.endsWith(".json")) {
    return JSON.parse(text).entries.map(entry => ({ pages: [entry.page], line: 0 }));
  }
  return citationsIn(text);
}

/**
 * What is wrong with one manifest rule entry's shape, one line each.
 * @param {object} entry
 * @param {(path: string) => boolean} exists
 * @returns {string[]}
 */
export function entryProblems(entry, exists) {
  const where = `${entry.file} p.${entry.pages}`;
  const problems = [];
  if (!/^\d+_[a-z0-9_]+\.md$/.test(entry.file ?? "")) {
    problems.push(`${where}: file must name a game-rules/ file`);
  }
  if (!pagesOf(entry.pages ?? "").length) {
    problems.push(`${where}: pages must be a page list such as "82" or "86-87, 89"`);
  }
  if (!STATUSES.includes(entry.status)) {
    problems.push(`${where}: status must be ${STATUSES.join(", ")}`);
  }
  if (entry.status === "automated") {
    for (const key of ["code", "tests"]) {
      if (!entry[key]?.length) {
        problems.push(`${where}: an automated entry lists its ${key} paths`);
      }
      for (const path of entry[key] ?? []) {
        if (!exists(path)) {
          problems.push(`${where}: ${key} path ${path} does not exist`);
        }
      }
    }
  }
  if (["manual", "out"].includes(entry.status)) {
    // The decision names the stage file or code site that records it (decision 4)
    const path = /^([\w./-]+\.(?:md|js|mjs|hbs|json))\b/.exec(entry.decision ?? "")?.[1];
    if (!path || !exists(path)) {
      problems.push(`${where}: a ${entry.status} entry's decision starts with the existing file recording it`);
    }
  }
  return problems;
}

/**
 * Join the manifest's rule entries with the citations in code and tests.
 * @param {object} data
 * @param {object[]} data.rules  The manifest's rule entries
 * @param {{path: string, text: string}[]} data.code  Source files under module/, and the pack sources
 * @param {{path: string, text: string}[]} data.tests  Source files under tests/
 * @param {(path: string) => boolean} data.exists
 * @returns {{invalid: string[], uncited: string[], uncovered: string[], counts: Record<string, number>}}
 */
export function auditCitations({ rules, code, tests, exists }) {
  const invalid = rules.flatMap(entry => entryProblems(entry, exists));
  const citedBy = new Map(code.map(source => [source.path, citationsOf(source)]));
  const uncited = rules
    .filter(entry => entry.status === "automated" && pagesOf(entry.pages).length)
    .filter(entry => {
      const pages = new Set(pagesOf(entry.pages));
      return !(entry.code ?? []).some(path =>
        (citedBy.get(path) ?? []).some(citation => citation.pages.some(page => pages.has(page)))
      );
    })
    .map(entry => `${entry.file} p.${entry.pages}: ${entry.code.join(", ")} cite none of its pages`);
  const covered = new Set(rules.flatMap(entry => pagesOf(entry.pages ?? "")));
  const uncovered = [...code, ...tests].flatMap(source =>
    citationsOf(source).flatMap(({ pages, line }) =>
      pages.filter(page => !covered.has(page)).map(page => `${source.path}:${line} cites p.${page}`)
    )
  );
  const counts = {};
  for (const entry of rules) {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  }
  return { invalid, uncited, uncovered: [...new Set(uncovered)], counts };
}

/**
 * Every file under a directory of the repo whose name matches, with its text.
 * @param {string} repo
 * @param {string} dir
 * @param {string[]} [skip]  Path prefixes left out
 * @param {RegExp} [pattern]  File names kept; .js and .mjs by default
 * @returns {{path: string, text: string}[]}
 */
export function sourcesIn(repo, dir, skip = [], pattern = /\.m?js$/) {
  return readdirSync(join(repo, dir), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && pattern.test(entry.name))
    .map(entry => relative(repo, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .filter(path => !skip.some(prefix => path.startsWith(prefix)))
    .map(path => ({ path, text: readFileSync(join(repo, path), "utf8") }));
}

/**
 * Read the manifest and the repo, and run the audit.
 * @param {string} repo  The repo root
 * @param {object} manifest
 * @returns {ReturnType<typeof auditCitations>}
 */
export function citationsReport(repo, manifest) {
  return auditCitations({
    rules: manifest.rules,
    code: [...sourcesIn(repo, "module"), ...sourcesIn(repo, "src/packs", [], /\.json$/)],
    // The coverage tool's own tests and fixtures cite made-up pages
    tests: sourcesIn(repo, "tests", ["tests/fixtures/coverage/", "tests/coverage.test.js"]),
    exists: path => existsSync(join(repo, path))
  });
}
