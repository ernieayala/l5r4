/**
 * @module tools/coverage/index
 * @description `npm run coverage` (roadmap/STAGE-16): runs the page, citation, action, setting, and pack checks and
 * writes `tools/coverage/report.md` (gitignored: it prints the headings of unclassified pages, decision 2).
 * `npm run coverage:check` (`--check`) runs the four checks that need only the repo, as CI does (decision 3), and
 * exits non-zero on a gap. The local page check runs too when `game-rules/` is present and fails the same way.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { actionsReport } from "./actions.mjs";
import { citationsReport } from "./citations.mjs";
import { packsReport } from "./packs.mjs";
import { questionsReport } from "./questions.mjs";
import { rulesReport } from "./rules.mjs";
import { settingsReport } from "./settings.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const check = process.argv.includes("--check");
const manifest = JSON.parse(readFileSync(join(repo, "tools/coverage/manifest.json"), "utf8"));

const rules = rulesReport(repo, manifest);
const citations = citationsReport(repo, manifest);
const actions = await actionsReport(repo, manifest);
const settings = settingsReport(repo, manifest);
const packs = packsReport(repo, manifest);
const questions = questionsReport(repo);

/** Each gap a check fails on: its title and the lines that list it. */
const gaps = [
  ...(rules
    ? [
        [
          "Unclassified pages",
          rules.unclassified.map(u => `${u.file} p.${u.page}: ${u.headings.join(" / ") || "(no heading)"}`)
        ],
        ["Manifest pages no rule file marks", rules.stale]
      ]
    : []),
  ["Malformed manifest entries", citations.invalid],
  ["Automated entries whose code cites none of their pages", citations.uncited],
  ["Citations to a page no manifest entry covers", citations.uncovered],
  ["Actions no Quench test triggers", actions.untested.map(a => `${a.action} (${a.source})`)],
  ["Stale action coverage", actions.stale],
  ["Settings no Quench test sets", settings.untested],
  ["Stale setting coverage", settings.stale],
  ["Full or partial pack entries the packs batch does not check", packs.unchecked],
  ["Partial or none pack entries no manual manifest entry covers", packs.undecided]
];

const list = lines => (lines.length ? lines.map(line => `- ${line}`).join("\n") : "None.");
const tally = counts =>
  Object.entries(counts)
    .map(([status, count]) => `${status} ${count}`)
    .join(", ");
const manual = Object.groupBy(
  manifest.rules.filter(entry => ["manual", "out"].includes(entry.status)),
  entry => entry.decision
);
const report = [
  "# Coverage report",
  "",
  "Written by `npm run coverage` (tools/coverage/, roadmap/STAGE-16). Local and gitignored.",
  "",
  "| Area | Count |",
  "|------|-------|",
  `| Rule pages | ${rules ? `${rules.units.length} (${tally(rules.counts)})` : "game-rules/ absent: not checked"} |`,
  `| Manifest rule entries | ${tally(citations.counts)} |`,
  `| Actions | ${actions.count} (${actions.accepted.length} accepted untested) |`,
  `| Settings | ${settings.count} (${settings.accepted.length} accepted untested) |`,
  `| Pack entries | ${tally(packs.counts)} |`,
  ...gaps.map(([title, lines]) => `| ${title} | ${lines.length} |`),
  "",
  ...gaps.flatMap(([title, lines]) => [`## ${title}`, "", list(lines), ""]),
  "## Untested actions accepted",
  "",
  list(actions.accepted),
  "",
  "## Untested settings accepted",
  "",
  list(settings.accepted),
  "",
  "## Pages left to the table or not planned, by decision",
  "",
  ...Object.entries(manual).flatMap(([decision, entries]) => [
    `### ${decision}`,
    "",
    list(entries.map(entry => `${entry.file} p.${entry.pages}`)),
    ""
  ]),
  "## Still open questions, by the stage they block",
  "",
  list(questions),
  ""
].join("\n");

writeFileSync(join(repo, "tools/coverage/report.md"), report);
console.log(
  `tools/coverage/report.md: ${rules ? `${rules.units.length} rule pages, ` : ""}${actions.count} actions, ` +
    `${settings.count} settings, ${Object.values(packs.counts).reduce((a, b) => a + b, 0)} pack entries`
);
for (const [title, lines] of gaps) {
  console.log(`${String(lines.length).padStart(5)}  ${title}`);
}
const open = gaps.filter(([, lines]) => lines.length);
if (check && open.length) {
  console.error(`Coverage check failed: ${open.map(([t, l]) => `${t} (${l.length})`).join("; ")}`);
  process.exitCode = 1;
}
