# Stage 12: World migration and optional modules

**Goal:** a world last saved under 3.2.1 on Foundry 13 opens under 4.0.0 on 14.370 with every Actor, Item,
and Active Effect intact, and the optional module integrations either work or switch off cleanly.
**Needs:** 2-11. It runs after the automation stages because Stages 7, 9, and 11 change item and effect data
(`system.rules`, stances and conditions as rule data, family and school bonuses as rules).

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| `migrateData` and world migrations in `ready` | §3.3, §10.1 |
| Package relationships (`relationships.recommends`) | §2.1 |

## Audit

| Where | Finding |
|-------|---------|
| `dist/l5r4-enhanced.js:206-239`, `module/setup/migrations.js`, `module/setup/migrations/**` | Version-gated world migrations (icons, items, actors, schema map) run by the GM in `ready` |
| `module/services/animations/**` | Sequencer and JB2A integration, active when those modules are |
| `C:\Users\teafo\repos\l5r4-migrator` | A separate migration module from an older system; decide whether it needs a v14 note |

## Deliverables

- A test world: a copy of a real 3.2.1 world (Ernie's), upgraded on 14.370. Record anything lost or changed.
- Fixes to `migrateData` or `module/setup/migrations/` for what the test world shows.
- Migrations into the automation data: check on the test world that the Stage 7 migrations (Family and School
  Trait effects to TraitAdjust, Master of Blood, Defense Stance and Mounted effects; STAGE-07 decision 4) and the
  Stage 9 ones for stance and condition effects left nothing behind. Skill bonus fields need none: they stay
  fields and act as a rule.
- Animations: confirm Sequencer's v14 support; if it has none, the integration stays off without errors.

## Acceptance

- Manual: the upgraded test world opens with no console errors; spot-check five PCs, five NPCs, items of each type, stances, and conditions against the 3.2.1 world.
- Quench: `migration-edge-cases` passes.

## Decisions

1. The test world is synthetic: `tests/fixtures/world-3.2.1/build-world.mjs` writes a world in the shapes 3.2.1 stored on
   Foundry 13 (Ernie, 2026-11-14; no 3.2.1 world was on this machine). Five PCs, five NPCs, every item type, stances
   and conditions made each way 3.2.1 made them, an unlinked token with its own effects, 3.2.1 chat cards, a combat.
   Opening it runs core's Foundry 13 migration, then the system's. `tests/quench/world-upgrade.js` checks the result
   and skips in any other world.
2. Migrations run only when `system.json` reports a version newer than the world's `lastMigratedVersion`. A 3.2.1
   world stores "3.2.1", so nothing converts until Stage 18 sets 4.0.0. Stage 12's runs set it to 4.0.0 locally and
   put it back.
3. An unlinked token's own items and effects (its actor delta) go through the item and status-effect migrations
   (`module/setup/migrations/actors/unlinked-tokens.js`); 3.2.1 never migrated them either.
4. A 3.2.1 Fear effect gets its end with the encounter (`module/utils/status-data.js`). A timed duration is not added
   to an old effect: it counts from a start the effect does not have.
5. 3.2.1's stored Full Defense roll is not converted: 4.0.0 asks for the roll at each Turn start while the stance
   holds (`module/services/effects/combat-events.js`).
6. A pre-3.0 key whose new name already holds a value loses to that value, as in 3.2.1's own schema migration.
7. Animations play on the client of the user who made the change, and Sequencer shows them to everyone; before,
   every client played its own copy. The JB2A Patreon collection counts as JB2A. Concentration plays its animation
   again (lost when the hooks moved to the shared condition list in Stage 9). `system.json` recommends Sequencer and
   JB2A.
8. Found on the way, fixed in Stage 13: #45, timed effects on unlinked combatants stop expiring after a reload
   (core prepares combatants before its effect registry exists).

## Plan drift

- The Audit's `dist/l5r4-enhanced.js:206-239` is now lines 219-250, and `module/setup/migrations.js` runs from there.
- `l5r4-migrator` was not touched (Out of scope).

## Out of scope

| Item | Stage |
|------|-------|
| Changes to the separate `l5r4-migrator` module | Not planned unless Ernie asks |
