/**
 * @module tools/coverage/rules
 * @description The page check (roadmap/STAGE-16, local only: `game-rules/` is gitignored, decision 3). Each printed
 * page a `game-rules/` file marks with `<!-- p.N -->` is a unit; it lists units no manifest entry classifies and
 * manifest entries naming a page their file does not mark. Each unit carries its headings for the local report, so
 * a page can be classified without opening the book; the headings never reach the committed manifest (decision 2).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pagesOf } from "./citations.mjs";

/**
 * The pages one rule file marks, each with the headings printed on it.
 * @param {string} file - Its name in game-rules/
 * @param {string} markdown
 * @returns {{file: string, page: number, headings: string[]}[]}
 */
export function pageUnits(file, markdown) {
  const units = [];
  // A file's title sits above its first marker, on that marker's page
  let pending = [];
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^<!-- p\.(\d+) -->$/.exec(line.trim());
    if (marker) {
      units.push({ file, page: Number(marker[1]), headings: pending });
      pending = [];
    } else if (/^#{1,6} /.test(line)) {
      (units.at(-1)?.headings ?? pending).push(line.replace(/^#+\s*/, "").trim());
    }
  }
  return units;
}

/**
 * Join the units with the manifest's rule entries.
 * @param {{file: string, page: number}[]} units
 * @param {object[]} rules - The manifest's rule entries
 * @returns {{unclassified: object[], stale: string[], counts: Record<string, number>}}
 *   `counts` gives the units holding each status; a page with two entries counts under both.
 */
export function auditRules(units, rules) {
  const key = (file, page) => `${file}#${page}`;
  const statuses = new Map();
  for (const entry of rules) {
    for (const page of pagesOf(entry.pages ?? "")) {
      const at = key(entry.file, page);
      statuses.set(at, [...(statuses.get(at) ?? []), entry.status]);
    }
  }
  const known = new Set(units.map(unit => key(unit.file, unit.page)));
  const stale = rules.flatMap(entry =>
    pagesOf(entry.pages ?? "")
      .filter(page => !known.has(key(entry.file, page)))
      .map(page => `${entry.file} p.${page}`)
  );
  const counts = {};
  const unclassified = [];
  for (const unit of units) {
    const found = new Set(statuses.get(key(unit.file, unit.page)) ?? []);
    if (!found.size) {
      unclassified.push(unit);
    }
    for (const status of found.size ? found : ["unclassified"]) {
      counts[status] = (counts[status] ?? 0) + 1;
    }
  }
  return { unclassified, stale, counts };
}

/**
 * Read `game-rules/` and run the audit.
 * @param {string} repo
 * @param {object} manifest
 * @returns {(ReturnType<typeof auditRules> & {units: object[]}) | null}  Null without `game-rules/` (CI)
 */
export function rulesReport(repo, manifest) {
  const dir = join(repo, "game-rules");
  if (!existsSync(dir)) {
    return null;
  }
  const units = readdirSync(dir)
    .filter(name => /^\d+_[a-z0-9_]+\.md$/.test(name) && name !== "00_contents.md")
    .sort((a, b) => parseInt(a) - parseInt(b))
    .flatMap(name => pageUnits(name, readFileSync(join(dir, name), "utf8")));
  return { units, ...auditRules(units, manifest.rules) };
}
