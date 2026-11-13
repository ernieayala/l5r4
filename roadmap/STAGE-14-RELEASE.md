# Stage 14: Release 4.0.0

**Goal:** 4.0.0 is published with a manifest requiring 14.370, documentation that matches it, and a smoke
batch that fails on any deprecated call.
**Needs:** 1-13.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Manifest, `manifest` / `download` URLs | §2.1, §14 |
| Package release API (optional) | §14 |

## Audit

| Where | Finding |
|-------|---------|
| `README.md`, `CONTRIBUTING.md`, `DEVELOPER.md`, `CHANGELOG.MD` | Say Foundry v13+ |
| `.github/workflows/create-release.yml`, `release.yml` | Zip excludes predate the new files: add `roadmap/`, `CLAUDE.md`, `eslint.config.mjs`, `vitest.config.mjs`, `.gitattributes`, `.husky/`, `coverage/`. `softprops/action-gh-release@v1` runs on a retired Node runtime. `create-release` validates with `format:check`, `lint:css`, `build:css`, `deps:circular` only; add `test` and `lint:js` |
| `package.json` `release:validate` | Passes `--validate-only`, which `scripts/prepare-release.js` does not accept (it treats it as the version and exits) |
| `tests/quench/smoke.js` | Switch to `CONFIG.compatibility.mode` `FAILURE` scoped to `systems/l5r4-enhanced/` (X4) |
| `lang/*.json` | List keys present in `en.json` and missing from each translation, for translators |

## Deliverables

- Docs updated for Foundry 14.370; `CHANGELOG.MD` 4.0.0 entry: v14 only, data models, Active Effects V2, the automation (rule engine, roll pipeline, effects and durations, damage loop, rule authoring), each rule fix from Stage 13 with its page, what 3.2.1 users must do.
- Release workflows per the Audit.
- 4.0.0 released through `create-release` (version, tag, manifest).

## Acceptance

- Gate passes; `smoke` passes in `FAILURE` mode.
- Install 4.0.0 from its manifest URL into a clean 14.370 and run `smoke`.
- On a Foundry 13 install that has 3.2.1, the update check reports 4.0.0 as incompatible (its `minimum` is 14.370) and 3.2.1 keeps working.

## Out of scope

| Item | Stage |
|------|-------|
| New features | After 4.0.0 |
