# L5R4 Enhanced on Foundry VTT v14: Roadmap

4.0.0 moves `l5r4-enhanced` 3.2.1 (Foundry 13) to Foundry 14.370, adds pf2e-style automation, and checks the
rules against the Core Rulebook. Stages 1-6 port: each changes how the code talks to Foundry, never what a rule
computes. Stages 7-11 build the automation (rules carried as data on items and effects, one roll pipeline,
durations and conditions, the damage loop, rule authoring; design in `AUTOMATION.md`). Stage 12 migrates
3.2.1 worlds into the new data, Stage 13 audits every automated rule against the book, Stage 14 adds table tools
(text links, request cards, effect panel, macros), Stage 15 ships compendium packs of the book's content (names,
numbers, rules, and page citations, never its text) with a browser, Stage 16 makes the audit a repeatable coverage
check in the gate, Stage 17 writes a design system and a code system, enforces them with checks in the gate, and
brings the repo into line through a multi-agent review-and-fix pass, Stage 18 plays the system through the real UI
with GM and player clients, Stage 19 releases.

## How to read this roadmap

| Rule | Detail |
|------|--------|
| Foundry APIs come from the reference | `FOUNDRY-V14-REFERENCE.md` holds the v14 APIs with sources; the installed 14.370 source wins over it |
| Rules come from the book | A stage that touches a formula names its `game-rules/` file and printed page; it never restates the rule |
| Audits are snapshots | Each stage's **Audit** lists the call sites found on 2026-11-10, with the grep that found them. Re-run the grep when the stage starts |
| A stage ends loadable | Each stage leaves the system loading in Foundry 14.370 with the gate passing |
| One stage at a time | Finish, verify, and get Ernie's sign-off on a stage before starting the next |
| Tests ride with the code | A changed formula or a new pure function ships with Vitest tests; changed in-Foundry behavior ships with an updated Quench batch |

Working rules, architecture layers, and the gate live in `CLAUDE.md`.

## Already in place

The test and tooling setup the stages rely on: ESLint 10 flat config, Vitest 5 (Node environment),
Stylelint 17, Prettier 3, madge, Husky with lint-staged, the `gate.yml` workflow on Node 24, Quench batches
in `tests/quench/`, the transcribed rulebook in `game-rules/` (local, gitignored), and the `/rule`,
`/foundry-api`, `/stage` skills (local).

## Stages

| # | File | Goal | Needs |
|---|------|------|-------|
| 1 | `STAGE-01-LOAD-ON-V14.md` | The v13 code loads in 14.370 from a v14 manifest; a Quench smoke batch and a deprecation inventory run | none |
| 2 | `STAGE-02-DATA-MODELS.md` | `template.json` replaced by one `TypeDataModel` per subtype, with migrations for stored world data | 1 |
| 3 | `STAGE-03-ACTIVE-EFFECTS.md` | Active Effects V2: `system.changes`, string change `type`, phases, status effect registration | 2 |
| 4 | `STAGE-04-DEPRECATED-APIS.md` | No call to an API deprecated in v14: AppV1 `Dialog`, `rollMode`, `game.i18n.format`, deprecated globals | 1 |
| 5 | `STAGE-05-COMBAT.md` | Initiative and the Void prompt through `Combat` / `Combatant` subclasses instead of prototype patches | 2, 4 |
| 6 | `STAGE-06-SHEETS-AND-APPS.md` | Every sheet and app renders, saves, and handles its actions on 14.370 with no console warnings | 2, 3, 4 |
| 7 | `STAGE-07-RULE-ENGINE.md` | `system.rules` on items and effects, one engine applying them during preparation, the first rule keys, hard-coded bonuses converted | 2, 3, 5, 6 |
| 8 | `STAGE-08-ROLL-PIPELINE.md` | One roll pipeline fed by the engine: modifier dialog, Raises, Free Raises, Void, Emphasis, dice rules, target-aware TN, context stored on the message | 7 |
| 9 | `STAGE-09-EFFECTS-AND-CONDITIONS.md` | Stances, conditions, Fear, and timed effects as rule data with durations expiring on combat events, saves, use counters | 7, 8 |
| 10 | `STAGE-10-DAMAGE-AND-COMBAT.md` | Attack to damage to the target's Wounds with Reduction and Void, maneuvers, duel and grapple flows, undo | 8, 9 |
| 11 | `STAGE-11-CHARACTER-OPTIONS-AND-AUTHORING.md` | Rules editor, choices and grants for character options, XP and ledgers from rules, import and export | 7-10 |
| 12 | `STAGE-12-WORLD-MIGRATION-AND-MODULES.md` | A 3.2.1 world opens in 4.0.0 with its data intact and converted to rule data; optional module integrations (Sequencer) checked | 2-11 |
| 13 | `STAGE-13-RULES-AUDIT.md` | Every automated rule checked against the Core Rulebook, book examples as Vitest cases, mismatches and open rule bugs fixed | 2-12 |
| 14 | `STAGE-14-TABLE-TOOLS.md` | Text links for checks, damage, conditions, and Fear; GM request cards; effect panel; hotbar macros; floating Wound and Void numbers | 13 |
| 15 | `STAGE-15-COMPENDIUM-PACKS.md` | Packs of the Core Rulebook's character options, equipment, and creatures with names, numbers, rules, and page citations; a filtered compendium browser | 14 |
| 16 | `STAGE-16-COVERAGE-AUDIT.md` | A coverage report of every rule page, pack entry, action, and setting against code and tests; gaps closed or recorded; the check joins the gate | 15 |
| 17 | `STAGE-17-DESIGN-AND-CODE-SYSTEMS.md` | A design system (foundations, components, patterns, copy) with a living gallery in Foundry, a code system (naming dictionary, glossary, code shapes, test system), a check for each checkable rule in the gate, and a multi-agent review-and-fix pass that brings the repo into line without changing behavior | 16 |
| 18 | `STAGE-18-PLAYTEST.md` | An original scenario played through Claude in Chrome by a GM and players on their own clients; findings fixed at the root | 16, 17 |
| 19 | `STAGE-19-RELEASE.md` | Docs, translations, release workflows with an allowlisted zip and a tested manifest rewrite, a book-text sweep, and the 4.0.0 release | 1-18 |

Stage 4 needs only Stage 1, so it can run before Stage 2 or 3 if Ernie prefers. Stage 2's data models carry
`system.rules` from the start so Stage 7 does not reshape them (Stage 2 Decision 2).

## GitHub issues and pull requests

Reviewed 2026-11-12 (`gh issue list --state all`, `gh pr list --state all`). Each open item has a stage.

| Item | What | Where it is handled |
|------|------|---------------------|
| #38 | NPC formula wound mode: `woundLevels` overwritten by manual thresholds | Stage 13 |
| #40 | NPC long rest heals no Wounds: `wounds.healRate` computed for PCs only | Stage 13 |
| #43 | Kata and kiho XP read the `cost` field, not the Mastery Level (pp.259, 231) | Stage 13 |
| #44 | A Family or School Void Ring bonus is not priced into Void XP (p.103) | Stage 13 |
| #45 | Timed effects on unlinked combatants stop expiring after a reload (core registry timing) | Stage 13 |
| #37 | A weapon's "Explodes on" value ignored on damage rolls | Stage 8 (dice rules), checked in Stage 13 |
| #41 | Mounted +1k0 (p.89) missing on Skill weapon attacks: only `SimpleRoll` reads attack rules | Stage 8 (one roll pipeline), test in Stage 13 (`tests/quench/rules.js`) |
| #42 | Shift-click Trait rolls skip `system.bonuses.trait` | Stage 8 (one roll pipeline), test in Stage 13 (`tests/quench/rules.js`) |
| #29 | Strength raised by an Active Effect misses weapon damage; extra effect points on Strength charged as XP | Stage 3 (Trait changes in the `"initial"` phase reach derived values), checked in Stage 13 |
| #30 | NPC Initiative stays 2k2 | Stage 13 (Initiative row; code moves to Combat classes in Stage 5) |
| #30 | Light-theme Ring values, Void Ring arrows, PC portrait picker, removable NPC attacks | Stage 6 (done; the portrait picker already worked in 3.2.1) |
| #33 | Request: a setting for 3rd Edition rules (stances) | Open question for Ernie; not planned until decided |
| PR #25 | "Packs": compendium databases on branch `release/3.2.0`, with rulebook text in spell and advantage entries | Not mergeable as is (CLAUDE.md **Licensed material**); Stage 15 builds new packs without book text and uses it only as a list of entries. Ernie decides whether to close it and delete the branch |
| No issue yet | Code comments on `main` repeat rulebook wording: `skill-formulas.js`, `tn-calculator.js`, `bow-damage.js`, `module/services/combat/legacy-damage.js` (`module/hooks/chat-damage-buttons.js` on `main`), `melee-damage.js`, and `tests/quench/workflows/melee-damage-strength.js` (12-word runs matched against `game-rules/`, 2026-11-12) | Stage 19 book-text sweep: rewritten in own words with page citations, as its own commit |
| No issue | Probable bugs read from the code (B1-B12): bonuses counted twice, Raise and Void limits, damage button, inline rolls, Prone automation | Fixed in the stages `AUTOMATION.md` §2 names; B11's unread Insight bonus field was removed (#75) |
| #75 | Skill Insight bonus field shown but never counted (p.104) | Found by the Stage 16 sweep; removed with a migration (Ernie, 2026-11-14) |
| Closed #5, #7-#15, #32, #34 | Rule bugs fixed in 2.x-3.2 | Stage 13: each has a regression test that names it, in Vitest (#5, #7, #10, #14, #32, #34) or `tests/quench/regressions.js` (#8, #9, #11, #12, #13, #15) |
| Closed #3 | Firefox right-click context menus | No item menu since v3.0.0; its unused module is deleted in Stage 4 (Decision 1) |

## Not planned

Out of 4.0.0, each recorded by the stage that set it aside. The coverage manifest marks the pages of these
topics `out` (Stage 16).

| Item | Recorded in |
|------|-------------|
| Mass battle (pp.236-241) | Stages 10, 13, 15, 18 |
| A 3rd Edition rules option (#33) | Stage 13 |
| Shadowlands Powers and Mutations as items (pp.274-284); the GM picks them | Stage 15 |
| Content beyond the Core Rulebook; translated pack entry names | Stage 15 |
| Shops and loot | Stages 14, 15 |
| Combat tracker UI changes | Stage 5 |
| A visual redesign or new visual direction; new accessibility rules | Stages 6, 17 (decision 9) |
| Renaming names worlds store | Stage 17 (decision 2) |
| Changes to the separate `l5r4-migrator` module, unless Ernie asks | Stage 12 |
| New features | Stage 19: after 4.0.0 |

## Cross-stage decisions

| Id | Decision | Basis |
|----|----------|-------|
| X1 | The system id stays `l5r4-enhanced`. Worlds, flags (`flags.l5r4-enhanced.*`), and template paths depend on it | Existing worlds |
| X2 | 4.0.0 requires Foundry 14.370 (`compatibility.minimum` `"14.370"`, `verified` `"14.370"`, `maximum` `"14"`). Foundry 13 users stay on 3.2.1 | Ernie, 2026-11-10 |
| X3 | Stages 1-6 keep behavior. A rule bug found during them becomes a GitHub issue with the printed page, fixed in the automation stage that rebuilds that code (7-11) or in Stage 13 | CLAUDE.md **PORT KEEPS BEHAVIOR**; Ernie, 2026-11-12 |
| X4 | The smoke batch runs with `CONFIG.compatibility.mode` `WARNING` until Stage 19, which switches it to `FAILURE` scoped to `systems/l5r4-enhanced/`, so any deprecated call left fails the batch | FOUNDRY-V14-REFERENCE.md §11; fabula-ultima `tests/quench/smoke.js` |
| X5 | The six languages stay. New keys go in `lang/en.json`; the other files fall back to English until a translator adds them | `system.json` `languages` |
| X6 | Automation follows pf2e's design adapted to v14: mechanics as `system.rules` on Items and Active Effects, effects expiring through the core registry, every player and GM choice prompted. The book's content ships as packs of names, printed numbers, rules, short mechanical summaries, and page citations, never its text (Stage 15 **Content policy**) | `AUTOMATION.md`; Ernie, 2026-11-12, packs 2026-11-14 |

## Stage file template

```markdown
# Stage N: Name

**Goal:** one sentence: what works when this stage is done.
**Needs:** the stages that must be complete.

## Foundry v14 APIs
| Need | API (section of FOUNDRY-V14-REFERENCE.md, or installed source line) |

## Audit
The call sites to change, as `file:line`, with the grep that finds them.

## Deliverables
Grouped by layer. Each item says what changes.

## Acceptance
- Vitest: what the tests cover.
- Quench: which batches run, and what they check.
- Manual: what Ernie clicks through in Foundry.

## Decisions
Answered questions, one numbered line each, with the basis. Open ones go under "### Still open".

## Out of scope
What a later stage covers.
```
