# Stage 2: Data models

**Goal:** every Actor and Item subtype gets its `system` data from a `TypeDataModel`, `template.json` is
gone, and worlds saved by 3.2.1 load with their data intact.
**Needs:** 1.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| `TypeDataModel`, `defineSchema`, field classes | §3.1 |
| Preparation order; derived values in `prepareDerivedData` | §3.2 |
| `migrateData` (may receive only an update delta; handle `ForcedReplacement`) | §3.3 |
| Subtype labels (`CONFIG.<Document>.typeLabels`) | §3.1, fabula-ultima `fabula-ultima.js:33-40` |
| Token bars from the schema or `CONFIG.Actor.trackableAttributes` | §8 |

## Audit

| Where | Finding |
|-------|---------|
| `template.json` | Actor `common` template plus `pc` and `npc`; Item `itemDescription` template plus 15 types. `bow` is in `template.json` but not in `system.json` `documentTypes`; `module/setup/migrations/items/bow-to-weapon.js` converts bows to weapons with `isBow` |
| Derived values stored as source | `rings.*` (from Traits), `woundLevels.*`, `wounds.value/max`, `insight.*`, `armorTn.current`, `initiative.roll/keep` are in `template.json` but recomputed in `module/documents/actor/preparation/*.js`. Decide per field: schema (stored) or derived only |
| Fields written but not in `template.json` | `system.initiative._voidThisRoll` (`module/services/initiative.js:84`, `:163`). A schema strips unknown keys, so the Void +10 Initiative bonus would stop working without any error. Move it to a flag or a roll option (coordinate with Stage 5) |
| All written paths | `rg -n "update\(.*system\." module` and `rg -n "\"system\.[a-zA-Z.]+\"" module templates` list every stored path the schema must define |
| Release script | `scripts/prepare-release.js:144` requires `template.json`; remove that entry when the file goes |

## Deliverables

| Layer | Change |
|-------|--------|
| Data models | `module/data/actor/` (`common` fields shared by `pc` and `npc`) and `module/data/item/` (`itemDescription` fields shared by every item), one class per subtype; `module/data/index.js` maps subtype to class |
| Entry | Register the models in `init`; set `typeLabels` |
| Documents | Move subtype-only derived math into the data models' `prepareDerivedData`, calling the existing Utils. Shared behavior stays in `L5R4Actor` / `L5R4Item` |
| Migrations | `migrateData` for each shape change; world data written by the existing `module/setup/migrations/` stays valid |
| Manifest | `documentTypes` matches the registered models; `htmlFields` for description and notes fields |
| Removed | `template.json` |

## Acceptance

- Vitest: `tests/manifest.test.js` extended: every declared subtype has a model and every model is declared; `migrateData` for each migrated field, including a delta that holds only that field.
- Vitest: the existing unit suite passes unchanged (derived math did not change).
- Quench: `smoke` and the Actor/XP/wound batches in `tests/quench/index.js` pass; a new `data-models` batch checks that each subtype's defaults equal the 3.2.1 `template.json` defaults.
- Manual: open a copy of a 3.2.1 world; PCs, NPCs, and items keep their values.

## Decisions

1. Defaults equal the 3.2.1 `template.json` defaults (X3).
2. Every item model, and an Active Effect subtype, carries `system.rules` (an `ArrayField` of `ObjectField`,
   default empty) so Stage 7 adds behavior without reshaping stored data (X6, AUTOMATION.md §1). Nothing reads
   it until Stage 7.
3. B5 and B6 (AUTOMATION.md §2) are fixed here, because the schema defines what is stored and what is derived:
   no manual `prepareData()` calls, and no derived value written back to storage.

### Still open

- Derived fields: keep any of the derived values in the schema? Keeping them stored preserves exports and macros that read source data; dropping them is the v14 norm. Ernie's call before the schema is written.

## Out of scope

| Item | Stage |
|------|-------|
| Active Effect data shape | 3 |
| Initiative storage beyond removing `_voidThisRoll` from `system` | 5 |
