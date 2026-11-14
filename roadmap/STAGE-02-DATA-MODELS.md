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
2. Every item model carries `system.rules` (an `ArrayField` of `ObjectField`, default empty) so Stage 7 adds
   behavior without reshaping stored item data (X6, AUTOMATION.md §1). Nothing reads it until Stage 7. The
   Active Effect side comes with Stage 3's `ActiveEffectTypeDataModel` subtype, since that model replaces core's
   effect data shape, which Stage 3 owns.
3. B5 (AUTOMATION.md §2) is fixed here: no manual `prepareData()` on a prepared actor (`reset()` where a
   recalculation is wanted). B6 moves to Stage 3: it bites only when an Active Effect modifies a stored value,
   and it spans about ten read-then-write sites unrelated to the schema.
4. Derived values are not stored: `rings.air/earth/fire/water`, `woundLevels.*`, `wounds.value`,
   `wounds.healRate`, PC `insight.points`, PC `armorTn.reduction/current`, and PC `initiative.roll/keep` are
   computed in preparation and absent from the schema (Ernie, 2026-11-12). Fields that are inputs as well stay
   stored: `wounds.max` (an NPC's custom maximum, read before preparation overwrites it), `insight.rank` (the
   GM's manual rank), NPC `initiative.roll/keep` (custom pool), NPC `manualWoundLevels`.
5. The legacy `bow` Item subtype stays declared with a model sharing the weapon schema, because 14.370 treats a
   stored item with an undeclared type as invalid (`common/data/fields.mjs:4293`) and leaves it out of the
   collection (`common/abstract/embedded-collection.mjs:204`), where the bow-to-weapon migration cannot reach
   it. It is removed in a later major (Ernie, 2026-11-12).
6. A schema drops stored keys it does not define (`common/data/fields.mjs:1143-1146`), so every key the code
   or sheets write is declared, including ones `template.json` never had: item `rules`, advantage `clan` and
   `demands`, spell `maho`, family and school legacy `trait` / `bonus` (read by `module/utils/xp-calculations.js:162-163`),
   weapon and bow `equipped` (the item-management Quench batch sets it), `insight.autoCalculate`,
   `movement.showSimple` (both actors), NPC `woundsMultiplier` / `woundsMod` / `woundsPenaltyMod` (written by
   the wound config app), NPC `shadowTaint` (written by maho), NPC `spellSlots` (written by rest; initial 0,
   which blocks casting as an absent pool does). `armor` is NPC-only (`npc-preparation.js:84-85`; the PC sheet
   never renders it, and `cleanup.js` removes it from PCs).
7. Legacy renames move into `migrateData`, which sees raw source before the schema prunes it: actor snake_case
   keys (`wound_lvl`, `armor_tn`, `shadow_taint`, `initiative.*_mod`), NPC `wound_lvl` / `woundLevels` to
   `manualWoundLevels`, Traits stored as `{rank}`, skill snake_case keys, armor `equiped` / `specialRues`. The
   ready-hook migrations in `module/setup/migrations/` then find nothing left to rename.
8. `keywords` (weapon, bow, armor, commonItem, spell) is a `StringField`: the sheet edits it as text and nothing
   else reads it. `migrateData` joins a stored array with ", ". Stage 11 reshapes it when spell keywords gain
   rules.
9. `system.initiative._voidThisRoll` moves to the actor flag `flags.l5r4-enhanced.voidInitiative` with the same
   set-read-clear lifecycle (`module/services/initiative.js:84`, `:160-165`).
10. Quench batches assert the paths the schema defines (Ernie, 2026-11-12): conditions through
    `actor.toggleStatusEffect` and `actor.statuses`, `spellSlots.<ring>`, skill `trainedEmphases` and `school`,
    weapon `damageRoll` / `damageKeep` / `associatedSkill`, NPC `damageN`, School Rank as `insight.rank`. A
    NaN update is refused and a null cleans to the field's initial value (`common/data/fields.mjs:239-243`), so
    tests of corrupt values pass the validators a plain object.

## Out of scope

| Item | Stage |
|------|-------|
| Active Effect data shape | 3 |
| Initiative storage beyond removing `_voidThisRoll` from `system` | 5 |
