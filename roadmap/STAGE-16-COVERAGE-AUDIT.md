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

State on 2026-11-14, re-run when the stage started (after Stage 15):

| What | Where | Finding |
|------|-------|---------|
| Page citations in code | `rg -c "\bpp?\.\d+" module` | 319 in 85 files; 13 files also name their `game-rules/` file (`rg -l "\d\d_[a-z_]+\.md" module`) |
| Actions | `rg -c 'data-action="' templates` | 218 in 43 templates, 82 distinct with the sheets' and apps' `DEFAULT_OPTIONS.actions`. `tests/quench/sheets-and-apps.js` (`runEveryAction`) clicks every action on the PC, NPC, and item sheets and the apps, with a skip list; chat-card actions are not in it |
| World and client settings | `module/setup/settings/` | 8 `game.settings.register` calls (the first count of 12 included JSDoc lines that name the API); no list says which ones a Quench batch turns on |
| Localization | `tests/lang.test.js` | Fails on a key the code uses that `en.json` lacks; nothing finds `en.json` keys no code uses |
| Rule table | `roadmap/STAGE-13-RULES-AUDIT.md` **Audit** | Mechanic to `game-rules/` file, page, and code, by hand; no link from a row to its tests |
| `game-rules/` | Gitignored | Not in a CI checkout, so any check that reads it runs locally only |

## Deliverables

### Tooling

| File | Does |
|------|------|
| `tools/coverage/manifest.json` | Hand-kept, committed. `rules`: entries of one `game-rules/` file and a page list (`"86-87, 89"`), each `automated` (its code and test paths), `manual` (a `decision` that starts with the stage file or code site leaving it to the table), `advice` (no mechanic), or `out` (a topic the overview's **Not planned** lists, such as mass battle). A page may have two entries, as one automated and left to the table in part. `untested`: actions and settings accepted untested, each with its reason. Holds file names and page numbers only, never book text (decision 2) |
| `tools/coverage/rules.mjs` | Local check (needs `game-rules/`): reads the page markers (`<!-- p.N -->`) in each file and lists pages with no manifest entry, and manifest pages no file marks. Prints each page's headings in the report so Ernie can classify it; the report is gitignored |
| `tools/coverage/citations.mjs` | CI check: collects the page citations in `module/` and `tests/` (CLAUDE.md **CITE THE RULE**), and the page of each pack entry in `src/packs/` (decision 8). Fails on a malformed entry, an `automated` entry whose code paths cite none of its pages or whose code or test paths do not exist, a `manual` or `out` entry whose decision names no existing file, and a citation to a page no manifest entry covers |
| `tools/coverage/actions.mjs` | CI check: every `data-action` in `templates/` and every key of a sheet's or app's `DEFAULT_OPTIONS.actions`; lists those no Quench test triggers, read from `runEveryAction`'s coverage list `tests/quench/every-action.js` (decision 7) and from tests naming the action in a `data-action` selector |
| `tools/coverage/settings.mjs` | CI check: every setting registered in `module/`; lists those no Quench test sets |
| `tools/coverage/packs.mjs` | CI check: every entry in `src/packs/`; fails on a `full` or `partial` entry the Stage 15 `packs` batch does not check (decision 5), and on a `partial` or `none` entry no manifest `manual` entry covers by its page |
| `tools/coverage/questions.mjs` | The **Still open** sweep: each stage file's open items, listed in the report |
| `tools/coverage/index.mjs` | Runs the checks and writes the report; `--check` exits non-zero on a gap |
| `tests/quench/every-action.js` | The actions `runEveryAction` runs; the `sheets-and-apps` batch fails unless it runs exactly these |
| `tests/lang.test.js` (extend) | Fails on `en.json` keys no module, template, or `dist/l5r4-enhanced.js` uses (the same comment-stripping and template-literal group rules as the existing checks, plus Handlebars `(concat "prefix." x)` and core's `TYPES.<Document>.<subtype>` labels) |
| `package.json` | `coverage` runs every check and writes `tools/coverage/report.md`; `coverage:check` exits non-zero on a gap. Without `game-rules/` (CI) the page check is skipped. Not under `coverage/`, which `test:coverage` owns |
| `.gitignore` | `tools/coverage/report.md`; `content/` and `game-rules/` anchored to the root, so the fixture tree's `game-rules/` is committed |
| Vitest | `tests/coverage.test.js`, each check on the fixture tree under `tests/fixtures/coverage/` (made-up pages) |

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

## Results (2026-11-14)

First run, with an empty manifest: 428 unclassified pages, 882 citations to an uncovered page, 56 actions no test
triggered, 2 settings no test set, 614 `full` or `partial` pack entries unchecked, 776 `partial` or `none` entries
undecided; `tests/lang.test.js` found 121 unused `en.json` keys. After the sweeps every count is 0:

- Pages: 164 manifest entries over the 428 pages (pp.51, 54, 72-73, 96-97, 208-209, 282-283, 385-388 are
  full-page art with no text and no marker). The Stage 13 Audit rows' pages are `automated` with the tests Stage 13
  added; `maho-cast-roll.js` gained its pp.267-268 citation.
- Actions: the click-through runs 55 (`tests/quench/every-action.js`); the other 27 are clicked by name, 17 of them
  in tests this stage added or changed (chat-card damage, Apply to selected, Contested Strength, Start grapple, and
  condition buttons; the browser's tabs, Clear, name, and Import; the effect panel's source; the wound mode, XP cap
  and award delete, custom emphasis rename and delete, Rules delete, and NPC Fear buttons).
- Settings: `runMigration` set by a new `migration-edge-cases` test; `lastMigratedVersion` accepted untested
  (decision 6).
- Pack entries: the `packs` batch's generic rule checks (decision 5); `partial` and `none` pages are `manual` under
  Stage 15 decision 9.
- Localization: the 121 unused keys removed from `en.json` and the 96 of them the translations held.
- Still open: Stage 13's item now points to AUTOMATION.md §6's new Status column; Stage 17's and 18's questions are
  in the report with their stage.
- Out of scope: the overview gained **Not planned**; Stages 1, 13, 14, and 15 pointed at the old Stage 17 and 18
  numbers, and Stage 3's durations row said "Not planned" for what Stage 9 built. Fixed.
- B1-B12 (AUTOMATION.md §2): fixed in their stages except B11's unread Skill Insight bonus field, now #75. Ernie,
  2026-11-14: the field is removed, with a migration, as its own change.
- Quench: two full runs each failed one older test on Mocha's 2 s default. An animated `close()` waits up to 1 s
  for its transition after any queued render, so the four batches still closing with animation (28 calls) now pass
  `{ animate: false }`, as the newer ones do; the message-mode card test makes ten server round trips and now has a
  15 s budget. Neither run logged a deprecation warning; every console error came from a test's deliberately bad
  input.

Not verified items in earlier stages' Done Blocks, by where they stand:

| Items | Now |
|-------|-----|
| Stage 1's load, smoke, deprecations, baseline, layering, and client console in 14.370 | Closed: every full Quench run since loads the system in 14.370; this stage's run logged no deprecation warning |
| CI runs pending at the time (gate, pack build on Linux) | Closed: the gate passed on `4e67d53` with the pack build |
| Full runs not repeated after a fix | Closed: this stage's full run |
| `#29` XP half; the six Stage 13 findings; Stage 15's UNVERIFIED APIs and tattoo pages | Closed by Stage 13's rulings and issues and by Stage 15's build and its tests |
| A drag driven by the browser tool; the Active Effect phase dropdown, Token HUD statuses, and create-dialog subtype labels by hand; the intermittent console errors seen once | Written into Stage 18's Acceptance |
| Two clients (GM queries, animations, a player refused by a prerequisite) | Stage 18's purpose |
| A world saved by released 3.2.1 on Foundry 13, with a compendium; the Game Systems listing; the free JB2A collection; the release workflows | Written into Stage 19's Acceptance |
| Translations | By design (X5); Stage 19 lists missing keys for translators |
| Fails-before runs against code that no longer exists; line-by-line rereads; docs-only gate skips; Gmail test send; server outliving a session | Closed with no further check: the old code lacks the features the tests assert, and the rest checked nothing a release depends on |
| Stage 17's and 18's own checks (APIs, survey, the stages themselves) | Their stages |

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
5. A `full` or `partial` pack entry counts as checked by the `packs` batch's generic rule checks: every Item entry is
   added to a PC through the drop path, worn or activated as play does, and each of its rules is found on the actor
   (none skipped by validation); every creature is imported and each of its effects' and Skills' rules is found the
   same way. `packs:verify` checks the printed numbers against the book; named rows check what representative
   entries do. Basis: Ernie, 2026-11-14 (a row per entry was the alternative).
6. Pages the system leaves to the table that no earlier decision covers, recorded here (decision 4); accepted by
   Ernie, 2026-11-14, with `lastMigratedVersion` accepted untested:

   | Pages | What stays with the table |
   |-------|---------------------------|
   | p.83 (`34`) | Ambush, falling, and drowning: the GM calls them and rolls their damage, as with any `@Damage` link |
   | p.95 (`46`) | Monk Status and Glory: nothing sets them at creation, and Glory awards are the GM's (AUTOMATION.md Q1) |
   | p.258 (`85`) | Crafting: the GM sets the time and the TN; the roll is an ordinary Skill roll |
   | p.300 (`94`) | XP awards: the GM decides them; the XP manager records them |

7. The click-through's coverage is a committed list (`tests/quench/every-action.js`) that the `sheets-and-apps`
   batch compares with the actions it ran, both ways, so the static check reads what Quench proved.
8. A pack entry's `page` is a citation like a `p.N` comment: the manifest covers it, and an `automated` entry may
   name the pack source as its code.

### Still open

None.

## Out of scope

| Item | Stage |
|------|-------|
| Design system, code system, and consistency checks | 17 |
| Playing the system end to end | 18 |
| Book-text sweep and release allowlist | 19 |
| Fixing a rule the sweep finds wrong | Its own issue, fixed with a failing test first (Stage 13 pattern) |
