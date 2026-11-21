# Stage 20: 3rd Edition stances option (#33)

**Goal:** a GM can switch a world to the stance rules of the L5R 3rd Edition (Revised) Core Rulebook, and every stance then grants, limits, and prompts as that book prints it; 4th Edition stays the default and is unchanged. **Needs:** 19 (after the 4.0.0 release). Ships in a 4.x minor release.

Issue #33 asks for the toggle and guesses that stances are the only rule that differs. That guess is unconfirmed: no 3rd Edition book is in `content/`, and no official source online sets the two editions side by side (searched 2026-11-17; only forum posts and fan documents). Step 1 settles the guess from the book before any code is written.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md, or installed source line) |
| --- | --- |
| World setting with choices, reload on change | `game.settings.register` with `scope: "world"`, `choices`, `requiresReload: true`. UNVERIFIED: check `requiresReload` and choice settings against the installed source (`/foundry-api`) |
| Reading the setting during `init` | `game.settings.get` after `registerSettings()` (`dist/l5r4-enhanced.js:80`) and before `registerSystemConfig()` (`:85`). UNVERIFIED: confirm world setting values are loaded by `init` |
| Status effects | `CONFIG.statusEffects` filled in place (`dist/l5r4-enhanced.js:227-232`); `ActiveEffect.fromStatusEffect` copies the entry onto the effect it creates (`module/config/status-effects.js:5-6`) |

## Audit

Found 2026-11-17 with `rg -n "attackStance|fullAttackStance|defenseStance|fullDefenseStance|centerStance|STANCE_LIMITS|STANCE_LIMIT_EXCEPTIONS" module` (design gallery files left out). Re-run when the stage starts.

| Where | What it holds |
| --- | --- |
| `module/config/status-effects.js:46-90` | The five stance entries; Full Attack and Defense carry their rules as data |
| `module/config/status-effects.js:254-281` | `SYSTEM_EFFECTS.centered` and `SYSTEM_EFFECTS.fullDefense`, the effects Center and Full Defense create |
| `module/config/game-mechanics.js:228-244` | `STANCE_LIMITS` and `STANCE_LIMIT_EXCEPTIONS`: which conditions rule a stance out (pp.84, 89, 140) |
| `module/services/effects/combat-events.js:49-50` | Full Defense prompt at Turn start |
| `module/services/effects/combat-events.js:25, 97-146` | Center Stance: the `centered` effect and `CENTER_INITIATIVE` +10 for the next Round |
| `module/services/effects/automation.js:129-137` | Full Defense roll when the stance is taken |
| `module/services/effects/prompts.js:66-125, 175` | The Full Defense roll and its Armor TN bonus |
| `module/services/combat/guard.js:20` | Guard refused in Full Attack (p.87) |
| `module/setup/settings/world.js` | World settings; the new one goes here |
| `dist/l5r4-enhanced.js:210-235` | `registerSystemConfig` fills `CONFIG.statusEffects` from `STATUS_EFFECTS` |
| `module/config/localization.js:116-120` | JSDoc describing stance numbers that do not match the rules data in `status-effects.js`; correct it here or in its own fix |
| `tests/` | 27 files name a stance id (`rg -c` over `tests/`); `tests/unit/utils/stances.test.js`, `tests/unit/config/status-effects.test.js`, and the Quench stance batches are the ones a second rule set changes |

## Deliverables

### 1. Source and comparison (blocks the rest)

- Ernie supplies a licensed 3rd Edition (Revised) Core Rulebook PDF in `content/` (gitignored, read-only).
- The `/rule` skill learns a second book: its PDF path and page offset. Transcribe only the pages this stage needs, into a gitignored folder beside `game-rules/`.
- A comparison, in chat only, of the 3rd Edition rules against the 4th Edition pages for: stances (p.84) and their condition limits (p.89), Ten Dice Rule (p.77), Raises (p.79), Wound Ranks (p.82), Initiative (p.81), Armor TN (p.82), Void Points (p.78), and spell casting (pp.163-164).
- If anything besides stances differs, stop and ask Ernie whether the option stays stances only (and says so in its name and hint) or grows into a wider rules option, which needs its own plan.

### 2. Config

- Stance rule data keyed by edition: the 4th Edition entries as today, plus 3rd Edition entries with their printed 3rd Edition pages. Config stays data only; no function chooses between them here.
- `STANCE_LIMITS` and `STANCE_LIMIT_EXCEPTIONS` per edition, only if step 1 finds the limits differ.
- The Center and Full Defense values (`CENTER_INITIATIVE`, the `centered` rules, the Full Defense halving) move into the per-edition data if 3rd Edition prints them differently, so services read data instead of branching.

### 3. Setup

- World setting `stanceRules` (choices `"4e"` default, `"3e"`), `requiresReload: true`, name and hint keys in `lang/en.json`.
- `registerSystemConfig` builds `CONFIG.statusEffects` from the chosen edition's stance entries.
- On `ready`, when the setting changed since the last load, the GM's client replaces `system.rules` on every active stance effect on world actors and unlinked tokens, since those effects hold a copy of the old edition's rules. Stored in a flag or hidden setting, like `lastMigratedVersion`.

### 4. Services

- Full Defense, Center, and Guard read the active edition's data from step 2. A branch on the setting is allowed only where 3rd Edition has a step 4th Edition lacks (a different prompt, a different timing), with the page cited.

### 5. Docs and systems

- `README.md` settings section, `CHANGELOG.MD`.
- `docs/code-system/` glossary row for the setting; `docs/design-system/` only if a prompt or card changes.
- `tools/coverage/manifest.json`: the new setting tested; the 3rd Edition pages recorded however Ernie decides (below).

## Acceptance

- Vitest: each edition's stance table against its book pages; `getStanceConflicts` per edition; the built `CONFIG.statusEffects` list for each setting value; the book's stance examples from both books, if either prints one. A new test fails without the change.
- Quench: the stance batches (`tests/quench/services/stance.js`, `workflows/stance-switching-workflow.js`, `workflows/stance-edge-cases.js`, `workflows/skill-stance-combinations.js`) run under both settings; a batch switches the setting with a stance active and checks the effect's rules are replaced after reload.
- Chrome: GM switches the setting, reloads, takes each stance on a PC and an NPC, and the sheet, token HUD, Armor TN, and attack rolls show the 3rd Edition values; switching back restores the 4th Edition values.
- The gate passes: `test`, `build:css`, `lint`, `format:check`, `deps:circular`, `coverage:check`.

## Decisions

None yet.

### Still open

1. Book source: which 3rd Edition printing (Revised or original) the option follows, and that Ernie provides the PDF.
2. Scope: stances only, or a wider 3rd Edition rules option if step 1 finds more differences.
3. Coverage: whether `coverage:check` classifies 3rd Edition pages, or the manifest lists the option as one accepted setting.
4. Setting shape: a choice setting named for the stance rules (planned) or a general "rules edition" setting.
5. Release: 4.1.0 or a later minor.

## Out of scope

| Item | Where |
| --- | --- |
| Any 3rd Edition rule other than stances | Its own plan, if decision 2 calls for one |
| 3rd Edition compendium content (schools, spells, techniques) | Not planned |
| Foundry 13 / 3.2.1 | Stays on 3.2.1 without this option |
