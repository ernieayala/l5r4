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

## Out of scope

| Item | Stage |
|------|-------|
| Changes to the separate `l5r4-migrator` module | Not planned unless Ernie asks |
