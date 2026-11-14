# Stage 16: Coverage audit

**Goal:** a repeatable report shows, for every printed page of the Core Rulebook that holds a mechanic, every pack
entry, every chat-card and sheet action, and every world setting, whether it is automated and tested, left to the
table by a recorded decision, or advice with nothing to automate; every gap the first run finds is closed or
recorded, and the gate fails when a new gap opens.
**Needs:** 15. Stage 13 checks each automated rule against the book once; this stage makes that check repeatable
and adds the pack entries, actions, and settings it does not cover, including those Stages 14 and 15 add.

## Foundry v14 APIs

None for the static report (Node scripts over the repo). The runtime checks reuse the Quench batches (§12).

## Audit

State on 2026-11-14:

| What | Where | Finding |
|------|-------|---------|
| Page citations in code | `rg -c "\bpp?\.\d+" module` | 280 in 78 files; 13 files also name their `game-rules/` file (`rg -l "\d\d_[a-z_]+\.md" module`) |
| Actions | `rg -c 'data-action="' templates` | 210 in 39 templates. `tests/quench/sheets-and-apps.js:71` (`runEveryAction`) clicks every action on the PC, NPC, and item sheets and the apps, with a skip list (`:161`); chat-card actions are not in it |
| World and client settings | `module/setup/settings/` | 12 `game.settings.register` calls; no list says which ones a Quench batch turns on |
| Localization | `tests/lang.test.js` | Fails on a key the code uses that `en.json` lacks; nothing finds `en.json` keys no code uses |
| Rule table | `roadmap/STAGE-13-RULES-AUDIT.md` **Audit** | Mechanic to `game-rules/` file, page, and code, by hand; no link from a row to its tests |
| `game-rules/` | Gitignored | Not in a CI checkout, so any check that reads it runs locally only |

## Deliverables

### Tooling

| File | Does |
|------|------|
| `tools/coverage/manifest.json` | Hand-kept, committed. One entry per `game-rules/` file and printed page: `automated` (the code and test paths), `manual` (the stage decision or code-site comment that leaves it to the table), `advice` (no mechanic), or `out` (a topic the overview marks not planned, such as mass battle). Holds file names and page numbers only, never book text (decision 2) |
| `tools/coverage/rules.mjs` | Local check (needs `game-rules/`): reads the page markers (`<!-- p.N -->`) in each file and lists pages with no manifest entry. Prints each page's headings in the report so Ernie can classify it; the report is gitignored |
| `tools/coverage/citations.mjs` | CI check: collects the page citations in `module/` JSDoc (CLAUDE.md **CITE THE RULE**) and in test names. Fails on an `automated` entry whose code paths cite none of its pages or whose test paths do not exist, and on a citation to a page no manifest entry covers |
| `tools/coverage/actions.mjs` | CI check: every `data-action` in `templates/` and every action in a sheet's or app's `DEFAULT_OPTIONS.actions`; lists those no Quench test triggers, read from `runEveryAction`'s coverage list and from explicit test references |
| `tools/coverage/settings.mjs` | CI check: every setting registered in `module/setup/settings/`; lists those no Quench test sets |
| `tools/coverage/packs.mjs` | CI check: every entry in `src/packs/`; fails on a `full` or `partial` entry the Stage 15 `packs` batch does not check, and on a `partial` or `none` entry no manifest `manual` entry covers by its page |
| `tests/lang.test.js` (extend) | Fails on `en.json` keys no module, template, or `dist/l5r4-enhanced.js` uses (the same comment-stripping and template-literal group rules as the existing checks) |
| `package.json` | `coverage` runs all five scripts and writes `tools/coverage/report.md`; `coverage:check` runs the four CI checks and exits non-zero on a gap. Not under `coverage/`, which `test:coverage` owns |
| `.gitignore` | `tools/coverage/report.md` |
| Vitest | Each script on a fixture tree under `tests/fixtures/coverage/` |

### Sweeps (run once here, then kept by the gate)

| Sweep | Output |
|-------|--------|
| Every page classified | `manifest.json` complete; each `manual` entry names its decision |
| Every Stage 13 Audit row | Its pages are `automated` entries with the tests Stage 13 added |
| Every action and setting | Triggered by a Quench test, or listed in the manifest's `untested` with a reason Ernie accepts |
| Every pack entry | Checked by the `packs` batch, or its uncovered mechanics recorded as `manual` |
| Every **Still open** item across the stage files | Answered by Ernie, or listed in the report with the stage it blocks |
| Every **Out of scope** line across the stage files | Points to a stage or to "not planned" in the overview |
| Every Not verified item in the closed stages' Done Blocks and PR #39's checklist | Closed, or written into a later stage's file |
| Console | One full Quench run with zero errors and zero deprecation warnings from `l5r4-enhanced` |

### Gate

| File | Does |
|------|------|
| `.github/workflows/gate.yml` | Adds `npm run coverage:check` once the first sweep reaches zero (decision 1) |
| `CLAUDE.md` **The gate** | Adds the `coverage:check` row |

## Acceptance

- Vitest: on the fixture tree, an unclassified page is listed; an `automated` entry whose code cites none of its
  pages fails; a citation to an uncovered page fails; an action no test triggers is listed; a setting no test sets
  is listed; a `full` pack entry no batch checks fails; an unused `en.json` key fails `tests/lang.test.js`.
- Run: `npm run coverage` writes the report; its first-run counts go in the PR #39 checklist. After the sweeps the
  report shows zero unclassified pages, zero `automated` entries without tests, zero uncovered citations, and every
  untested action and setting accepted by Ernie.
- CI: removing one test's file makes `gate.yml` fail; restoring it passes.
- Quench: the full suite passes with no console errors or deprecation warnings from the system.

## Decisions

1. The coverage check joins the gate once the first sweep reaches zero, so later stages cannot reopen a gap
   silently. Basis: fabula-ultima `roadmap/STAGE-18-COVERAGE-AUDIT.md` decision 1.
2. The manifest unit is a `game-rules/` file and printed page, and the committed manifest stores only those, so the
   public repo holds no book text (CLAUDE.md **Licensed material**). Headings appear only in the local, gitignored
   report.
3. The page check runs locally, because `game-rules/` is gitignored and absent in CI. CI checks what the repo
   holds: citations, tests, actions, settings, and localization.
4. A page left to the table counts as covered only with a recorded decision; silence is a gap. Basis:
   fabula-ultima Stage 18 decision 2; CLAUDE.md **DEVIATIONS ARE DECISIONS**.

### Still open

None.

## Out of scope

| Item | Stage |
|------|-------|
| Playing the system end to end | 17 |
| Book-text sweep and release allowlist | 18 |
| Fixing a rule the sweep finds wrong | Its own issue, fixed with a failing test first (Stage 13 pattern) |
