/**
 * @module tools/coverage/packs
 * @description The pack check (roadmap/STAGE-16, CI). Every entry in `src/packs/` carries a coverage (Stage 15
 * decision 9). A `full` or `partial` entry is checked by the `packs` Quench batch: its generic rule checks (Stage 16
 * decision 5) add every Item entry to a PC and import every creature, and find each rule on the actor, so the check
 * fails on a pack's entries when the test for its document type is gone. A `partial` or `none` entry leaves
 * mechanics to the table, so a `manual` manifest entry covers its page (decision 4).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pagesOf, sourcesIn } from "./citations.mjs";

/** The titles of the packs batch's generic rule checks (tests/quench/packs.js), by the pack's document type. */
export const RULE_CHECKS = Object.freeze({
  Item: "every full or partial entry's rules reach the actor",
  Actor: "every creature's rules reach it"
});

/**
 * Join the pack entries with the packs batch and the manifest.
 * @param {object} data
 * @param {{name: string, documentType: string, entries: object[]}[]} data.sources  The pack sources
 * @param {string} data.tests  tests/quench/packs.js
 * @param {object[]} data.rules  The manifest's rule entries
 * @returns {{counts: Record<string, number>, unchecked: string[], undecided: string[]}}
 */
export function auditPacks({ sources, tests, rules }) {
  const manual = new Set(
    rules.filter(entry => entry.status === "manual").flatMap(entry => pagesOf(entry.pages))
  );
  const counts = {};
  const unchecked = [];
  const undecided = [];
  for (const { name: pack, documentType, entries } of sources) {
    const checked = Boolean(RULE_CHECKS[documentType]) && tests.includes(RULE_CHECKS[documentType]);
    for (const entry of entries) {
      counts[entry.coverage] = (counts[entry.coverage] ?? 0) + 1;
      const where = `${pack}: ${entry.name} (p.${entry.page}, ${entry.coverage})`;
      if (entry.coverage !== "none" && !checked) {
        unchecked.push(where);
      }
      if (entry.coverage !== "full" && !manual.has(entry.page)) {
        undecided.push(where);
      }
    }
  }
  return { counts, unchecked, undecided };
}

/**
 * Read the pack sources, the packs batch, and the manifest, and run the audit.
 * @param {string} repo
 * @param {object} manifest
 * @returns {ReturnType<typeof auditPacks>}
 */
export function packsReport(repo, manifest) {
  return auditPacks({
    sources: sourcesIn(repo, "src/packs", [], /\.json$/).map(({ text }) => JSON.parse(text)),
    tests: readFileSync(join(repo, "tests/quench/packs.js"), "utf8"),
    rules: manifest.rules
  });
}
