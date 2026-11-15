# Stage 19: Release 4.0.0

**Goal:** 4.0.0 is published with a manifest requiring 14.370, a release zip built from an allowlist that ships the
compiled packs and no licensed or development file, documentation that matches it, and a smoke batch that fails on
any deprecated call.
**Needs:** 1-18. A release candidate passes the Stage 16 coverage check, the Stage 17 convention checks, and a
Stage 18 playtest run first.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Manifest, `manifest` / `download` URLs | §2.1, §14 |
| Version format and comparison (`isNewerVersion`) | §2.1 |
| Package release API (optional) | §14 |

## Audit

| Where | Finding |
|-------|---------|
| `README.md`, `CONTRIBUTING.md`, `DEVELOPER.md`, `CHANGELOG.MD` | Say Foundry v13+ |
| `.github/workflows/create-release.yml:186-208`, `release.yml:74-97` | The zip is `zip -r . -x ...`: everything not excluded ships. The exclude list predates `roadmap/`, `eslint.config.mjs`, `vitest.config.mjs`, `.gitattributes`, `.husky/`, `coverage/`, `tools/`, so they ship today. A new top-level file ships unless someone remembers to exclude it |
| `images/` | Ships today. Only `tests/quench/workflows/migration-edge-cases.js` names it (`rg -n "images/" module templates system.json dist scss tests`, 2026-11-14); confirm no world data points at it before leaving it off the allowlist |
| `.github/workflows/create-release.yml:102-126`, `release.yml:47-67` | The manifest rewrite is written twice, once as `node -e` and once as `sed`, with no test |
| `.github/workflows/create-release.yml:213`, `release.yml:103` | `softprops/action-gh-release@v1` runs on a retired Node runtime |
| `.github/workflows/create-release.yml:69-83` | Validates with `format:check`, `lint:css`, `build:css`, `deps:circular` only; add `test` and `lint:js` |
| `package.json` `release:validate` | Passes `--validate-only`, which `scripts/prepare-release.js` does not accept (it treats it as the version and exits) |
| `tests/quench/smoke.js` | Switch to `CONFIG.compatibility.mode` `FAILURE` scoped to `systems/l5r4-enhanced/` (X4) |
| `lang/*.json` | List keys present in `en.json` and missing from each translation, for translators |
| Code comments on `main` | Some repeat rulebook wording: `skill-formulas.js`, `tn-calculator.js`, `bow-damage.js`, `chat-damage-buttons.js`, `melee-damage.js`, `tests/quench/workflows/melee-damage-strength.js` (12-word runs matched against `game-rules/`, 2026-11-12). Re-run on `release/4.0.0`; several of these files are gone since Stage 8 |

## Deliverables

### Release tooling

| File | Does |
|------|------|
| `tools/release-files.mjs` | The allowlist of paths that go into the zip: `system.json`, `dist/`, `module/`, `templates/`, `lang/`, `assets/`, `packs/`, the user-facing docs, `LICENSE`. Anything not listed stays out. `game-rules/`, `content/`, `roadmap/`, `tests/`, `scss/`, `src/`, `tools/`, `.claude/`, `CLAUDE.md`, `docs/`, and `node_modules/` are never listed. A CLI wrapper prints the file list for `zip -@` |
| `tools/manifest.mjs` | Pure function with a CLI wrapper: given a version and a release type, returns `system.json` with `version`, `manifest`, and `download` set (stable releases point at `releases/latest/download/`, pre-releases at the tag). Both workflows call it instead of their own rewrite |
| `.github/workflows/create-release.yml`, `release.yml` | Compile the packs with `npm run build:packs`, build the zip from `tools/release-files.mjs`, rewrite the manifest with `tools/manifest.mjs`, validate with the whole gate, replace the retired upload action |
| `package.json` `release:validate` | Fixed to a mode `scripts/prepare-release.js` accepts, or removed |

### Book-text sweep (the repo is public)

| Where | Check |
|-------|-------|
| Code comments, JSDoc, `lang/en.json`, templates, Vitest fixtures built from book examples, `tests/quench/` | No run of 12 or more words matching `game-rules/` (the 2026-11-12 method, run locally since `game-rules/` is gitignored). Each hit is rewritten in own words with its page citation, as its own commit |
| `src/packs/` | `npm run packs:verify` (Stage 15) finds no run of six or more words matching `game-rules/`; flavor fields are empty and mechanical summaries are within Stage 15's cap |
| Git history | No path under `content/` or `game-rules/` was ever committed: `git log --all -- content game-rules` prints nothing |

### Docs and release

- Docs updated for Foundry 14.370; `CHANGELOG.MD` 4.0.0 entry: v14 only, data models, Active Effects V2, the
  automation (rule engine, roll pipeline, effects and durations, damage loop, rule authoring), the table tools (text
  links, request cards, effect panel, hotbar macros, floating numbers), the compendium packs and browser, each rule
  fix from Stage 13 with its page,
  what 3.2.1 users must do.
- 4.0.0 released through `create-release` (version, tag, manifest).

## Acceptance

- Vitest: `tools/manifest.mjs` gives a stable version the `latest` URLs and a pre-release its tag's URLs, and
  rejects a version that is not `X.Y.Z` or `X.Y.Z-pre`; `tools/release-files.mjs` never lists `game-rules/`,
  `content/`, `roadmap/`, `tests/`, `src/`, `tools/`, `.claude/`, `CLAUDE.md`, or `node_modules/`, and lists every
  file `system.json` points to (`esmodules`, `styles`, `languages`, `packs`).
- Gate passes; `smoke` passes in `FAILURE` mode.
- The book-text sweep finds nothing; the history check prints nothing.
- `unzip -l` of the release zip lists only allowlisted paths.
- Install 4.0.0 from its manifest URL into a clean 14.370 and run `smoke`; every pack opens.
- With the released 4.0.0 (`system.json` `version` "4.0.0", which is what starts the world migrations; STAGE-12
  decision 2), rebuild the 3.2.1 fixture world (`tests/fixtures/world-3.2.1/build-world.mjs`), open it, and run the
  `world-upgrade` batch.
- On a Foundry 13 install that has 3.2.1, the update check reports 4.0.0 as incompatible (its `minimum` is 14.370)
  and 3.2.1 keeps working.
- A world that released 3.2.1 saved on that Foundry 13 install, with a world compendium of Items, opens in 4.0.0
  on 14.370 and the `world-upgrade` batch passes; the fixture world (Stage 12) is built from the 3.2.1 code, never
  saved by Foundry 13. Written here by the Stage 16 sweep.
- The setup screen's Game Systems list shows 4.0.0 as verified for 14.370, and the `animations` batch passes with
  the free JB2A collection as well as the Patreon one (Stage 12 ran Patreon only). Written here by the Stage 16
  sweep.

## Decisions

1. The zip is built from an allowlist, not an exclude list, so a new file stays out until someone adds it. Basis:
   the Audit's exclude list fell behind the repo; fabula-ultima `roadmap/STAGE-20-RELEASE.md` builds its zip the
   same way.
2. The manifest rewrite is one tested function both workflows call. Basis: two untested copies (Audit).

## Out of scope

| Item | Stage |
|------|-------|
| New features | After 4.0.0 |
