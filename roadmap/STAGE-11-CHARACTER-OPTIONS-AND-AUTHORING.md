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
2. A School's Techniques are GrantItem rules with a School Rank. Adding the School grants every Technique up to the
   character's School Rank; when the School Rank rises, the next ones are granted and a chat note says so. School
   Rank follows Insight Rank (p.104) unless the School item sets its own rank, as a character with Multiple Schools
   does (Ernie, 2026-11-13).
3. The Honor Roll (p.92) is a world setting, off by default. A GM "New session" token control starts a new session,
   which gives every character its Honor Roll back (Ernie, 2026-11-13).
4. Import and export work on Item folders: a folder's items, with their rules and effects, go to one JSON file, and
   rules that point at an item in the same file point at its imported copy after import (Ernie, 2026-11-13).
5. The Taint ledger logs every gain with its reason; Embracing the Taint is a roll-dialog choice on physical Trait
   rolls (p.279); Taint Level 3 and 4 penalties to social Skill rolls, Level 4's lost Void Point, and its Honor Roll
   penalty apply on their own (pp.278-279); Level 4's -2k0 replaces Level 3's -1k0, as each level describes the
   character's state. Exposure and growth rolls stay the GM's (Ernie, 2026-11-13).
6. `Aura` and `Mark` are not built: Stage 7 did not keep them (`module/config/rule-keys.js`).
7. A granted Skill comes at rank 1 for free, as a School Skill (p.102). If the character already has that Skill, it
   becomes a School Skill with a free rank instead of a second copy. Removing the giver deletes what it granted,
   except a Skill with bought ranks or Emphases, which stays without its free rank.
8. Kata and kiho rules apply while the item is active, not while it is owned (pp.259, 261): activating one makes an
   Active Effect carrying its rules, one kata at a time and one kiho of each type but Martial (Stage 9 decision 13).
   Tattoo rules apply while owned.
9. Social Skills (p.134) are a tick box on the Skill item; rules select them with `skill-tag:social`, School Skills
   with `skill-tag:school`, and a Skill type with `skill-type:<type>`.
10. A roll input of Honor, Glory, Status, or Taint is the stored rank; points are the fraction (p.90). This answers
   AUTOMATION.md Q2 for this stage's uses.
11. Kata and kiho XP keep reading the item's `cost` field, as 3.2.1 does; the book prices them at their Mastery Level
   (pp.259, 231). That difference is #43, for Stage 13, not part of this stage. A Cost rule's formula sees the base
   price as `@cost`, so an author writes the 1.5× and 2× kiho prices (p.266) with the rounding they want.

## Plan drift

- The user guide is the **Character options** section of `ACTIVE_EFFECTS.md`, which Stage 7 made the rules guide,
  not a new file.
- Prerequisites and choices are asked when an item is dropped on a character sheet (`module/services/purchase.js`):
  documents do not import services, and a prompt is UI. Grants run from the Item and Actor document lifecycle, so
  they follow any way an item is added; an item added without the sheet keeps its choices open until they are
  filled in on its Rules tab.
- The XP manager's history and the sheet's XP total read one ledger (`module/utils/xp-ledger.js`). Before, the
  history had its own arithmetic, which priced a legacy free Trait rank and a School's Void bonus differently from
  the total; the history now lists what the total charges. The total leaving a Void bonus out of the price is #44.
- Insight Rank is calculated before the rules run, so predicates can test Insight and School Rank; it reads only
  Rings and Skill ranks, which are known by then.
- `createRule` validates a copy: a DataModel cleans the source it is given in place, which wrote every default into
  a stored rule the editor displayed.

## Out of scope

| Item | Stage |
|------|-------|
| Pre-built rules for the book's content | Not planned (licensing) |
