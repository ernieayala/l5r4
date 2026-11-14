# Stage 7: Rule engine

**Goal:** Items and Active Effects carry their mechanics as data in `system.rules`, and one engine applies them
during actor preparation, so a bonus from an advantage, technique, stance, or spell needs a rule entry, not
new code.
**Needs:** 2, 3, 5, 6.

Design reference: `AUTOMATION.md` §1 (pf2e's engine, adapted to v14 Active Effects) and §3 (the rule
vocabulary).

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| A rule as a validated object | `foundry.abstract.DataModel` (each rule key is a DataModel class) §3.1 |
| `system.rules` on items and effects | `ArrayField` of `ObjectField` in the item `TypeDataModel` and an `ActiveEffectTypeDataModel` subtype §3.1, §6.1 |
| Where rules run | `prepareEmbeddedDocuments` (effects applied, phase `"initial"`), `prepareDerivedData`, end of `prepareData` §3.2 |
| Formula values | `Roll.safeEval` and roll data |

## Audit

| Where | Finding |
|-------|---------|
| `module/documents/actor/calculations/condition-effects.js:116-149`, `stance-effects.js:70-82` | Conditions and stances as `switch` on status id; their effects carry empty `changes` |
| `module/services/stance/rolls/attack-bonuses.js:53-104` | `attackBonus` / `damageBonus` flags on effects: the only data-driven bonus path today |
| `module/services/dice/effects/bonus-applicator.js:80-214` | `system.bonuses.skill/trait/ring.*` read by rolls; undocumented |
| `module/documents/actor/calculations/item-enrichment.js:112-136`, `module/utils/mechanics.js:338-366` | Skill item bonus fields aggregated by hand |
| `module/services/mounted-combat.js`, `stance/core/helpers.js:114-122`, `dice/rolls/maho-cast-roll.js:74-80` | Mechanics found by item name ("horsemanship", "defense", "master of blood") |
| `module/services/family-bonus-service.js:67-172` | Family and School Trait bonus read from effects through the deprecated `changes` / `mode` |

## Deliverables

| Layer | Change |
|-------|--------|
| Data | `system.rules` on every item model and on an `ActiveEffect` subtype (`base`); one DataModel class per rule key in `module/data/rules/`, registered in `module/config/rule-keys.js` |
| Utils | Predicates over roll-option strings, value resolution (formulas from roll data), typed modifier stacking: pure functions with Vitest cases |
| Documents | `L5R4Actor` collects rules from owned items and applied effects, sorts by priority, runs them at fixed hooks, and fills a per-actor modifier bag keyed by selector; roll options seeded from stance, conditions, Ring and Trait values, wound rank, equipped items |
| Rules (first set) | `RollModifier`, `TNModifier`, `ArmorTN`, `Reduction`, `Wounds`, `Initiative`, `FreeRaise`, `DiceRule`, `Substitute`, `TraitAdjust`, `Note`, `RollOption` (AUTOMATION.md §3) |
| Conversions | Family and School Trait bonuses, skill item bonus fields, mounted, Defense stance, Master of Blood expressed as rules; their name and `switch` lookups removed |
| Docs | CLAUDE.md **Layers** gains `module/data/rules/`; `ACTIVE_EFFECTS.md` becomes a rules guide (B12) |

## Acceptance

- Vitest: each rule key's schema and output; predicate operators; stacking; formula values; a rule on an
  unequipped item does not apply.
- Quench: the converted mechanics give the same numbers as 3.2.1 on the existing batches (family bonus,
  skill bonuses, mounted, stances); a `rules` batch adds a rule to an item and to an effect and checks the
  roll and Armor TN.
- Manual: Ernie adds a rule by hand (JSON in the item's rules field) and sees it on the sheet and in a roll.

## Decisions

1. Mechanics live in `system.rules` on Items and on Active Effects; effects stay Active Effects and expire
   through the core registry (AUTOMATION.md §1, FOUNDRY-V14-REFERENCE.md §6.3).
2. Positional rules (auras, Guard's 5 ft) stay manual: a `RollOption` toggle the player sets. Token positions
   are revisited with Guard in Stage 10 (Ernie, 2026-11-13).
3. Only armor gates its rules on `equipped`: weapons have no equip control on the sheet, so a weapon's rules
   always apply (a rule for attacks with one weapon waits for Stage 8 selectors).
4. The conversions ship with their migrations here, not in Stage 12 (CLAUDE.md: a schema change ships with its
   migration): `module/setup/migrations/items/item-rules.js` turns Family and School Trait effects into
   TraitAdjust rules and gives a Master of Blood advantage its RollOption; `actors/status-effect-rules.js` gives
   3.2.1 Defense Stance and Mounted effects their rules.
5. Until the Stage 8 pipeline, rolls read `system.bonuses`: a RollModifier on a `skill:`, `trait:`, or `ring:`
   selector whose predicate holds during preparation also lands there; `attack` rules are read from the bag with
   the target's options. Skill bonus fields act as one synthesized RollModifier (`SkillData#ownedRules`).
6. Rule schemas are checked in the Quench `rules` batch, since DataModels need Foundry; Vitest covers each key's
   output through `module/utils/rule-engine.js`.
7. Full Attack and Full Defense stay in `stance-effects.js` until Stage 9, which moves stances and conditions to
   rule data; only Defense Stance converts here.

## Out of scope

| Item | Stage |
|------|-------|
| The roll pipeline that consumes the modifier bag | 8 |
| Durations, saves, condition rules | 9 |
| The rules editor UI, choices, grants | 11 |
