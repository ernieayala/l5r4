# Stage 1: Load on v14

**Goal:** Foundry 14.370 lists and loads `l5r4-enhanced` from a v14 manifest, a GM can create every Actor
and Item subtype and open its sheet, and Quench reports a smoke result and an inventory of the deprecated
APIs the system still calls.
**Needs:** none.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Manifest `type`, `compatibility` strings, `styles` objects with `layer` | §2.1, §2.4 |
| Sheet registration; core registers no Actor or Item sheet, so nothing to unregister | §1.6, §4.6 |
| Compatibility logging mode for the inventory (`CONFIG.compatibility.mode`, `includePatterns`) | §11; `common/utils/logging.mjs:19-58` |
| Quench registration from `quenchReady` | §12 |

## Audit

| Where | Change |
|-------|--------|
| `system.json` | Add `"type": "system"`; `compatibility` to `"14.370"` / `"14.370"` / `"14"` (X2); `styles` to `[{ "src": "dist/l5r4-enhanced.css", "layer": "system" }]`; description no longer says v13 |
| `dist/l5r4-enhanced.js:105`, `:128` | `try { DocumentSheetConfig.unregisterSheet(...core V2 sheet...) } catch {}`: nothing is registered in 14.370; remove |
| `dist/l5r4-enhanced.js:117` | `"item"` is in the Item sheet's `types` but is not a declared subtype; remove |
| `dist/l5r4-enhanced.js:166-189` | Quench registration swallows every error in an empty `catch`. Register from `quenchReady` (dynamic import of `tests/quench/index.js`) and let a failure surface |
| `tests/quench/index.js` | The batch registry. Existing batches run unchanged in this stage to record the 14.370 baseline |

## Deliverables

### Manifest and entry
- `system.json` per the Audit. `template.json` stays until Stage 2; 14.370 still reads it, with a package warning.
- `dist/l5r4-enhanced.js` per the Audit.

### Tests
| File | Does |
|------|------|
| `tests/manifest.test.js` (Vitest) | `compatibility.minimum` is `"14.370"`; every `styles` entry is the `build:css` output path; every `languages` path exists and parses; every `documentTypes` subtype has a `TYPES.<Document>.<type>` or system label key in `lang/en.json` |
| `tests/lang.test.js` (Vitest) | Every `l5r4.` key written out in `module/`, `templates/`, and `dist/l5r4-enhanced.js` (comment lines excluded) exists in `lang/en.json`, and every template-literal key prefix names a group (pattern: fabula-ultima `tests/lang.test.js`). It found nine keys the code reads that `en.json` lacked (now added) and the Awareness trait label stored as `aw` instead of `awa` (renamed) |
| `tests/quench/smoke.js` | Batch `l5r4-enhanced.smoke`, replacing the old smoke batch in `index.js` (its config checks are kept): config namespace and document classes; system id and version match `system.json`; the stylesheet is imported in layer `system`; each Actor and Item subtype creates, opens its system sheet (the only one offered, and the default), and saves a rename through the sheet. Fails on any console error during a test |
| `tests/quench/deprecations.js` | Batch `l5r4-enhanced.deprecations`: sets `CONFIG.compatibility` to `WARNING` scoped to `systems/l5r4-enhanced/`, exercises create, sheet render, a skill roll, a stance change, and an item chat card, and fails listing every distinct compatibility warning raised. The list is the checklist for Stages 2-6 |
| `tests/quench/helpers.js` | `watchConsole`, `cleanTest` (fails on console errors), `nextUpdate`, `changeThroughSheet` (pattern: fabula-ultima `tests/quench/helpers.js`); later stages add what their batches need |

### Local install
Link the repo with the junction command in `CLAUDE.md` (**Testing and the Gate**).

## Acceptance

- Gate: the five scripts pass.
- Vitest: `manifest.test.js` and `lang.test.js` pass, and each fails when its condition is broken (remove a key, change `minimum`).
- Manual, in 14.370:
  1. The system appears in Game Systems with no compatibility warning (the `template.json` deprecation notice is expected until Stage 2).
  2. A world loads; note every console error from `l5r4-enhanced` during load.
  3. With Quench active, run `l5r4-enhanced.smoke`, `l5r4-enhanced.deprecations`, then every existing batch. Paste the results; they are the baseline the later stages work from.

## Baseline on 14.370 (2026-11-12)

| Check | Result |
|-------|--------|
| Game Systems listing | Verified compatibility badge; one package warning, the expected `template.json` deprecation |
| World load | No errors from `l5r4-enhanced`; Sequencer and JB2A "module not found" warnings |
| `smoke`, `deprecations` | 42/42; the deprecation inventory is empty for the paths it exercises (AppV1 `Dialog.confirm` sits on paths it does not reach; `game.i18n.format` is a silent alias in 14.370) |
| All 74 batches | 1407/1411. Failing: `documents.actor.wounds` formula NPC (#38); `workflows.fear` icon and duration and `stance-effect-preservation` icon (Active Effect `icon` dropped and `duration` reshaped in 14.370; Stage 3 audit) |
| Console | Core `#postNotification` errors when a chat message is deleted within ~100 ms of creation: a 14.370 race reproduced with core alone, not this system |

## Decisions

1. Version: `system.json` and `package.json` stay at 3.2.1 on `main` until Stage 14 releases 4.0.0; the `create-release` workflow sets the version (X2).
2. Existing Quench batches are not rewritten here; failures they show on 14.370 go to the stage that owns the code.
3. The legacy `bow` Item subtype, still declared in `template.json`, gets the system item sheet: 14.370 has no core sheet to fall back on, and the sheet already has `bow` partials. Stage 2 decides `bow`'s fate when `template.json` goes (Ernie, 2026-11-12).
4. Exception to 2: baseline failures whose cause sits in the test alone are fixed here: tests that read created embedded documents by position (14.370's server returns them in completion order, `dist/database/backend/server-backend.mjs` `_createDocuments`), tests that close several windows within Mocha's 2000 ms default (14.370 animates each ApplicationV2 close), tests written against an older app constructor or error message, and a test that left a world item behind (`emphasis-manager`) (Ernie, 2026-11-12).

## Out of scope

| Item | Stage |
|------|-------|
| Removing `template.json`, data models | 2 |
| Fixing deprecated calls the inventory lists | 2-6 |
| Switching the smoke batch to `FAILURE` mode | 14 |
