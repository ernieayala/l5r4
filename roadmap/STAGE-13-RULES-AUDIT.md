# Stage 13: Rules audit

**Goal:** every mechanic the system automates matches the Core Rulebook: each rule is read in the book, its
worked examples run as Vitest cases against the system's own functions, and every mismatch is fixed.
**Needs:** 2-12. It runs last so it covers the mechanics Stages 7-11 add as well as the ones 3.2.1 had.

Stages 1-6 keep 3.2.1's behavior (X3). Stages 7-11 build new automation and read each rule they touch with
`/rule` as they go; this stage checks the whole system against the book once more and fixes what disagrees.
The rows below list the 3.2.1 mechanics; add a row for each rule key and condition Stages 7-11 add.

## Sources

| Need | Source |
|------|--------|
| The rule | The Core Rulebook PDF, then `game-rules/` (CLAUDE.md **THE BOOK IS THE SOURCE**); read each with `/rule` |
| Where the code applies it | The Audit table below; re-run `rg -n "<mechanic>" module` when the stage starts |
| Which values reach the player | Quench batches in `tests/quench/` |

## Audit

Pages are the printed pages holding the paragraphs each row's code depends on, located with `/rule` on
2026-11-12 (page markers in `game-rules/`, plus the book's index in `105_index.md`).

| Mechanic | `game-rules/` | Pages | Code |
|----------|---------------|-------|------|
| Roll & Keep, exploding dice, Ten Dice Rule | `23_roll_and_keep.md`, `26_special_dice_rules.md` | 75, 77 | `module/services/dice/core/formula-builder.js`, `ten-dice-rule.js`, `roll-parser.js` |
| Target Numbers, Raises, Free Raises | `24_target_numbers.md`, `28_raises.md` | 76, 79 | `module/services/dice/core/tn-calculator.js`, `module/services/dice/resources/raise-manager.js`, `module/utils/raises-validator.js` |
| Rings from Traits; Void Points | `25_rings_and_traits.md` | 76 (Rings), 78 (Void) | `module/documents/actor/calculations/shared-traits-rings.js`, `module/services/dice/resources/void-manager.js` |
| Skill, Trait, Ring, and damage rolls; unskilled rolls; Emphases | `27_skills_in_rolls.md`, `29_types_of_rolls.md`, `30_skill_rolls_expanded.md`, `58_skills_overview.md` | 79-80 (roll types), 80 (unskilled), 133 (Emphases) | `module/services/dice/rolls/skill-roll.js`, `trait-roll.js`, `ring-roll.js`, `module/documents/item/preparation/skill-formulas.js` |
| Initiative | `31_combat_round.md` | 81 | `module/services/initiative.js` (the Stage 5 Combat classes) |
| Attack, Armor TN | `32_attack_and_defense.md`, `73_armor.md` | 82, 198 | `module/utils/armor-penalties.js`, `module/services/dice/rolls/weapon-roll.js` |
| Weapon damage: Strength added to DR, bow Strength, arrows | `74_weapons.md` | 198 (melee and thrown), 199 (bows and arrows) | `module/documents/item/preparation/melee-damage.js`, `bow-damage.js`, `module/services/dice/rolls/weapon-roll.js` |
| Wound Ranks, penalties, healing | `33_wounds.md`, `34_ambush_falling_drowning.md`, `35_healing_wounds.md` | 82 (Wounds), 84 (Wound Rank table, healing) | `module/documents/actor/calculations/wound-system.js`, `module/services/rest.js`, `module/services/wound-prone-automation.js` |
| Stances | `36_stances.md` | 84 | `module/services/stance/**`, `module/documents/actor/calculations/stance-effects.js` |
| Conditions (including Grappled), Fear | `40_grappling.md`, `41_conditional_effects.md`, `42_fear.md` | 88-89 (grappling), 89 (conditions), 90 (Fear) | `module/documents/actor/calculations/condition-effects.js`, `fear-system.js`, `module/services/fear.js`, `module/utils/condition-penalties.js` |
| Mounted combat: attack bonus, no Full Attack while mounted, Horsemanship Rank 3 exception | `41_conditional_effects.md`, `36_stances.md`, `60_bugei_skills.md` | 89, 84, 140 | `mounted` in `module/config/status-effects.js` |
| Riding armor while mounted | `73_armor.md` | 198 | `module/utils/armor-penalties.js` |
| Bows and lance from horseback, Polearms Mastery against mounted foes | `74_weapons.md`, `60_bugei_skills.md` | 200, 203, 142 | None found (`rg -n -i "horseback\|lance\|polearm" module`); confirm the system leaves them to the GM |
| Family and School Trait bonuses | `48_character_creation_expanded.md` | 102 | `module/services/family-bonus-service.js` |
| Starting XP and XP costs | `48_character_creation_expanded.md` | 102-103 | `module/utils/xp-calculations.js`, `module/utils/advancement.js`, `module/services/xp/xp-calculator.js`, `module/documents/actor/calculations/xp-system.js` |
| Insight, Insight Rank | `49_improving_your_character.md` | 104 | `module/utils/mechanics.js` |
| Spell casting, spell slots | `66_magic_and_spell_casting.md` | 163 | `module/services/dice/rolls/spell-cast-roll.js`, `module/services/dice/resources/spell-slot-manager.js` |
| Maho casting, blood, Taint gain; Master of Blood | `88_maho.md`, `89_shadowlands_taint.md` | 267-268, 280 | `module/services/dice/rolls/maho-cast-roll.js` |

### Open rule bugs

| Issue | Finding | Row |
|-------|---------|-----|
| #29 | A Strength raised by an Active Effect does not reach weapon damage; a second effect point on Strength is charged as XP | Attack/damage; Family and School bonuses; XP |
| #37 | A weapon's "Explodes on" value is ignored on damage rolls (fixed by Stage 8's dice rules; checked here) | Roll & Keep; damage |
| #38 | NPC formula wound mode: `woundLevels` overwritten by the manual thresholds | Wound Ranks |
| #30 (part) | NPC Initiative stays 2k2 whatever its Reflexes | Initiative |

The rest of #30 (light-theme Ring values, Void arrows, PC portrait, removable NPC attacks) is sheet work in
Stage 6. #33 (a 3rd Edition rules option) is a feature request.

## Deliverables

| Layer | Change |
|-------|--------|
| Tests | For each Audit row: every worked example on its pages as a Vitest case through the system's function, in `tests/unit/` mirroring `module/`; the case fails before its fix |
| Utils, Services, Documents | Fixes for each mismatch, in the layer that owns the rule (CLAUDE.md **Layers**) |
| JSDoc | Rule code names its printed page and `game-rules/` file (CLAUDE.md **CITE THE RULE**) |
| `game-rules/` | Corrected wherever the transcription and the PDF disagree |
| `CLAUDE.md` | Each rule checked here added to **Domain Invariants** |
| Issues | One GitHub issue per mismatch, citing the page and never the book's text; closed by the fix |
| Regression tests | Closed rule bugs #5, #7-#15, and #32 each get a test that names the issue, as #34's do (`tests/unit/utils/mechanics.test.js:876-879`) |

## Acceptance

- Vitest: book-example cases for every Audit row pass; each fix's case fails on the code before it.
- Quench: the full suite passes, including `documents.actor.wounds` (#38).
- Issues #29, #37, #38, and the Initiative part of #30 are closed.
- Manual: on a sample PC and NPC, Ernie runs a skill roll, an attack with damage, a spell, and a round of
  Initiative, and compares each to the book.

## Decisions

1. The audit runs after the port and the automation stages and before 4.0.0, so 4.0.0 ships v14 support,
   automation, and checked rules together (Ernie, 2026-11-12).
2. Where the book leaves a choice to the player or GM, the fix keeps it (CLAUDE.md **AUTOMATE MATH, KEEP
   CHOICES**); where Foundry cannot model a rule, the deviation is Ernie's call and is recorded at the code
   site.

### Still open

- The book questions in AUTOMATION.md §6 (Q1-Q11), each answered by Ernie before the stage that automates
  it, and the `game-rules/` transcription gaps listed there.

## Out of scope

| Item | Stage |
|------|-------|
| Sheet and UI parts of #30 | 6 |
| A 3rd Edition rules option (#33) | Not planned |
| Mass battle (pp.236-241) | Not planned |
