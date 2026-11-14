# Stage 11: Character options and rule authoring

**Goal:** GMs and players can author rules on any item or effect from the sheet, character options (family,
school, advantages, disadvantages, techniques, kata, kiho, tattoos, spells) apply their mechanics from those
rules with the choices made at purchase stored, and rules move between worlds by import and export.
**Needs:** 7, 8, 9, 10.

Rules read with `/rule` before building: `48_character_creation_expanded.md` pp.102-103 (bonuses, XP costs),
`63_advantages_and_disadvantages.md` pp.145-146 (subtypes, discounts), `58_skills_overview.md` p.133
(Mastery Abilities), `43_honor.md` pp.90-92 (Honor Roll, gains and losses), `89_shadowlands_taint.md`
pp.274-279.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Item and effect sheets | `ItemSheetV2`, `ActiveEffectConfig` (v14) with `PARTS` §4.1, §4.3 |
| Compendiums | Compendium packs, including Active Effect packs §9, §2.3 |
| Drop handling | Sheet drag and drop §4.5 |

## Audit

| Where | Finding |
|-------|---------|
| `module/documents/actor/calculations/xp-system.js:167-374`, `module/utils/xp-calculations.js:119-216` | XP costs and free ranks computed by hand per item type |
| `module/sheets/handlers/bio-item-handler.js:94-96` | Family and School dropped as plain items |
| Items: advantage, disadvantage, kata, kiho, tattoo, technique | Only `cost` is read |
| `module/sheets/handlers/pc-adjustment-handler.js:182-219` | Honor, Glory, Status, Taint tracked; no ledger hooks |

## Deliverables

| Layer | Change |
|-------|--------|
| Sheets | A rules editor on item and effect sheets: add, edit, remove rules with a form per key and a JSON view |
| Rules | `ChoiceSet` (choice stored at purchase), `GrantItem` (school grants skills and techniques, linked both ways), `Cost`, `Prerequisite` with a GM bypass, `Ledger`, `ActionCost`, `RaiseRule`, `UnskilledAs`, `OpponentModifier`, `Aura` / `Mark` if Stage 7 keeps them |
| Services | XP ledger reads costs and discounts from rules; Honor Roll (optional world setting); Taint ledger |
| Services | Import and export of items with rules as JSON; no book content shipped (AUTOMATION.md §5) |
| Docs | User guide: authoring rules, with worked examples written for the guide, not copied from the book |

## Acceptance

- Vitest: XP for a sample build matches the book's character creation example (pp.103-104); prerequisite
  checks; grant and ungrant.
- Quench: drop a school with grants on a PC and check skills, techniques, and Trait bonus; remove it and check
  the cleanup; author a technique's rule in the editor and see it in a roll.
- Manual: Ernie builds a PC from scratch with a family, school, two advantages, a disadvantage, and a kata,
  and plays a skirmish with them.

## Decisions

1. No compendium content from the Core Rulebook ships with the system (CLAUDE.md **Licensed material**).

## Out of scope

| Item | Stage |
|------|-------|
| Pre-built rules for the book's content | Not planned (licensing) |
