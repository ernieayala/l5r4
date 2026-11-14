# Automation: gap analysis and rule vocabulary

Reference for Stages 7-11. It compares what pf2e 8.7.0 automates with what `l5r4-enhanced` 3.2.1 automates,
and lists the effect shapes the Core Rulebook needs. Sources, all read 2026-11-12:

| Source | Where |
|--------|-------|
| pf2e 8.7.0 (Foundry 14.370 verified) | `%LOCALAPPDATA%\FoundryVTT\Data\systems\pf2e\pf2e.mjs`; line numbers below are `pf2e.mjs` lines |
| l5r4 3.2.1 code | `module/`, `dist/l5r4-enhanced.js`, `templates/`, `template.json` |
| Core Rulebook | `game-rules/` (printed pages); paraphrased here, never quoted |
| Foundry 14.370 | `FOUNDRY-V14-REFERENCE.md` and the installed source |

## 1. How pf2e automates

| Idea | pf2e | Evidence |
|------|------|----------|
| Rules are data on items | Every item has `system.rules`, an array of `{key, ...}`; a registry maps 40 keys to `RuleElement` DataModel classes, built per owned item | `RuleElements.builtin` L45424-45466; `fromOwnedItem` L45474; base class L31674 |
| Fixed hooks in data preparation | `onApplyActiveEffects` (end of `prepareEmbeddedDocuments`), `beforePrepareData` (in `prepareDerivedData`), `afterPrepareData`; sorted by `priority` | L33067-33178, L34641 |
| A "synthetics" bag keyed by selector | Rule elements push modifiers, dice, notes, adjustments into `actor.synthetics[kind][selector]`; each statistic pulls by its domain list | L33025-33065, L39433-39494 |
| Roll options and predicates | Conditions, effects, traits, target relations, roll results become namespaced strings; a predicate is JSON logic over them | `Predicate` L3909; seeding L33092 |
| Typed modifiers, one stacking function | `Modifier`, `applyStackingRules`, `StatisticModifier`, reused for checks, DCs, damage | L39624, L39765, L39771 |
| One check pipeline, context on the message | `StatisticCheck.roll` gathers context, notes, adjustments, rerolls; `Check.roll` stores the full context in `flags.pf2e.context` for rerolls and damage | L15026-15197, L19343-19510, L19567 |
| Target-aware math | Contextual clones of the opposing actor with extra roll options; the DC is read from the clone | L14795-14830, L32879 |
| Effects with durations | Effects and conditions are items with `duration`, `start`, `badge`, origin context; an `EffectTracker` deletes expired ones | L46029, L49574-49680, L116837 |
| Turn events reach rules and effects | `onStartTurn` / `onEndTurn` call rule `onUpdateEncounter`, condition `onEndTurn`, badge re-evaluation | L26632-26745 |
| Grants and choices | `GrantItem` with two-way links and delete policies; `ChoiceSet` writes the pick back into the rule | L43962-44186, L45498-45525, L31875 |
| Damage loop | `applyDamageFromMessage` to selected tokens with multipliers, IWR, temp HP, persistent damage, undo | L54496, L33224, L32160, L56601 |
| Content | 100 packs, ~17,000 records carrying `system.rules` | `system.json`; pack scan |

**Adapted for l5r4 on v14.** pf2e turns effects into items and projects Active Effects only for display
(L31105). Foundry 14 gives Active Effects a typed `system` (`ActiveEffectTypeDataModel`) and core duration
and expiry with custom expiry events (FOUNDRY-V14-REFERENCE.md §6.1, §6.3). l5r4 keeps stances, conditions,
and timed effects as Active Effects with their rules in `system.rules`, and lets the core registry expire
them. Items carry `system.rules` too; one engine reads both.

## 2. What l5r4 automates today

All mechanics are hard-coded services keyed by status id, item type, or item name; no item carries its own
rules. Active Effects change only the owning actor, and the system reads them only through core application
and three flags (`attackBonus`, `damageBonus`, `fearRank`).

| Area | Automated | Missing |
|------|-----------|---------|
| Derived data | Rings, Armor TN, Reduction, wounds, Insight, initiative values, movement, Fear TN, XP totals, heal rate (`module/documents/actor/preparation/*.js`, `calculations/*.js`) | NPC Armor TN is manual; `final`-phase effects reach nothing |
| Rolls | Skill, Trait, Ring, spell, maho, attack, damage, Full Defense, Fear; Ten Dice Rule; wound, stance, condition, armor, mounted modifiers (`module/services/dice/**`) | One shared pipeline; Emphasis from trained Emphases; Free Raises that change the TN; explode threshold; contested rolls; context stored on the message |
| Damage | Attack card to damage card; Apply Wounds and Void reduction to the controlled token; Prone at Down/Out (`module/hooks/chat-damage-buttons.js`, `wound-prone-automation.js`) | Damage to the attack's target; Strength and arrow in the button's damage; NPC Apply buttons; undo; damage source tags |
| Effects | Stances (one at a time), ten hard-coded conditions, Fear, Void-for-Armor expiry on `combatTurn` | Durations and expiry; saves; Center and Attack stance; Full Attack damage; conditions as data |
| Items | Skill bonus fields, weapon and armor stats, spell mastery, XP costs, family and school Trait bonus | Rules on advantages, techniques, kata, kiho, tattoos, spells |
| Resources | Void Points, spell slots, XP ledger, Honor/Glory/Status/Taint tracks | Per-round Void limit, use counters, ledger hooks |

Probable bugs read from the code, not yet reproduced in play (each gets an issue once reproduced):

| # | Finding | Code | Stage |
|---|---------|------|-------|
| B1 | Skill item bonus counted twice on skill rolls | `module/sheets/handlers/roll-handler.js:198-220`, `module/services/dice/rolls/skill-roll.js:142-149` | 8 (fixed) |
| B2 | Skilled weapon attack: a skill keep bonus is added to rolled and kept dice more than once | `module/utils/mechanics.js:364`, `roll-handler.js:362` | 8 (fixed) |
| B3 | Full Attack +2k1 applied twice on unskilled and NPC attacks | `roll-handler.js:264-273, 396-397`, `simple-roll.js:228-235` | 8 (fixed) |
| B4 | PC initiative reads Insight Rank before it is recomputed | `module/documents/actor/preparation/pc-preparation.js:86`, `:216` | 5 (fixed) |
| B5 | Manual `actor.prepareData()` calls re-apply effects | `module/sheets/pc-sheet.js:430, 633`, `module/services/stance/rolls/full-defense-roll.js:137` | 2 |
| B6 | Derived values written back to storage bake effect bonuses in | `chat-damage-buttons.js:63-66`, `void-manager.js:191, 274-276`, `spell-cast-roll.js:252` | 3 |
| B7 | Unskilled rolls allow Raises; Void spendable on damage; Raise cap from current Void Points | `skill-roll.js:221-238, 272-274`, `weapon-roll.js:120-130` | 8 (fixed) |
| B8 | Damage button omits Strength and the arrow modifier | `skill-roll.js:322-331`, `simple-roll.js:336-349` | 10 (fixed) |
| B9 | Inline `[[XkY]]` chat rolls pass an object to `String.replace` | `module/services/chat.js:333-334, 359` | 8 (fixed) |
| B10 | Prone automation runs on every client and is never removed | `wound-prone-automation.js:44-172` | 9 (fixed) |
| B11 | `explodesOn`, `insightBonus`, technique `rank` shown but never read (#37) | `templates/item/_type-modifiers/weapon.hbs:16-18` | 8 (`explodesOn` fixed); `insightBonus` and technique `rank` in 13 |
| B12 | `ACTIVE_EFFECTS.md` documents keys that change nothing (item keys, `system.xp`, Insight) | `ACTIVE_EFFECTS.md:166-228` | 3 |

## 3. Rule vocabulary for L5R 4e

The shapes below recur across Advantages and Disadvantages (pp.146-162), School Techniques (pp.105-132,
211-257), Mastery Abilities (pp.133-145), spells (pp.167-197), kata (pp.259-260), kiho (pp.261-267), maho and
Taint (pp.267-284), ancestors (pp.241-244), equipment (pp.198-210), and creatures (pp.318-331). Counts are
approximate and overlap. Each shape becomes a rule key in Stage 7; the keys are working names.

| Rule key | Shape | Approx. uses |
|----------|-------|--------------|
| `RollModifier` | +XkY or +N on a selected roll; selector = roll type, Skill or Skill tag, Trait, Ring, weapon keyword or size, spell element or keyword; value may be a formula (Honor Rank, School Rank, Ring, Taint Rank) | 150+ |
| `OpponentModifier` | Bonus to others' rolls against this actor | 20 |
| `TNModifier` | TN change on own rolls, on others' rolls against this actor, or chosen ± by the player | 50 |
| `ArmorTN` | Armor TN modifier (by stance, vs ranged, vs a target class, per hit, timed), override formula, or armor bonus multiplied or ignored | 55 |
| `Reduction` | Grant Reduction, or ignore it | 35 |
| `Wounds` | Wounds per rank, wound-penalty reduction, first rank filled, once-per-session survival | 25 |
| `Initiative` | Flat, formula, traded, growing per round | 15 |
| `FreeRaise` | Free Raise scoped to a Skill, spell keyword, element, maneuver, or duel stage | 45 |
| `RaiseRule` | Maneuver Raise cost, Raise cap, forced Raise, forgiven Raise | 20 |
| `DiceRule` | Explode threshold, no explode, explode once, reroll 1s, reroll keep better | 35 |
| `UnskilledAs` | Unskilled counts as rank 1 for a Skill group | 6 |
| `ActionCost` | Attack as a Simple Action under a gate; ready or mount as Free; extra action (shown and validated, not enforced) | 45 |
| `Resource` | Spend Void, a spell slot, Honor, Taint, or Wounds to start an effect; use counters per round, skirmish, session, day | 90 |
| `Duration` | Until next turn, N rounds, Reactions stage, skirmish, encounter, time, concentration, until an event; on-expire consequence | (on effects) |
| `ApplyCondition` | Condition on hit or on cast, with a save in Reactions and a fallback expiry | 45 |
| `ConditionImmunity` | Immunity to or removal of a condition | 8 |
| `PeriodicSave` | Interval, TN, and failure effect (poison, Taint growth, drowning, fatigue) | 10 |
| `Substitute` | Use X instead of Y on roll Z | 15 |
| `TraitAdjust` | Temporary Trait or Ring ±N, cascading to derived values | 20 |
| `Cost` / `Prerequisite` | XP cost changes; purchase gates with a GM bypass | 25 |
| `Ledger` | Honor, Glory, Status, Taint hooks (extra loss, extra gain, exemptions, cost) | 7 |
| `Aura` / `Mark` | Radius effect; designated target with a bonus against it next round | 15 |
| `DamageSource` | Tags on damage (jade, crystal, magic, nemuranai, sacred) for Invulnerability and Spirit | creatures |
| `Note`, `RollOption`, `ChoiceSet`, `GrantItem` | Text on a roll card; a sheet toggle; a choice stored at purchase; an item granted with its giver | throughout |

## 4. Choices that stay manual

CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**. The engine prompts for these and never resolves them:

- **Player:** which dice to keep (p.75); whether and how to spend a Void Point (p.78); declared Raises and spell
  Raise allocation; which slot pool pays; stance; Center Stance's roll; delaying; grapple option; Guard
  target; duel concession and Assessment facts; Emphasis claimed; Honor Roll; Embracing the Taint; maho blood
  source; kiho, kata, and tattoo activation; every once-per-X ability; technique option switches; reactive
  triggers; choices made at purchase.
- **GM:** every TN, Skill/Trait pair, and situational modifier; retries; terrain; ambush; Fear calls;
  Honor, Glory, Infamy, and Status awards; optional rules; in-play purchases; Disadvantage triggers;
  situational predicates the system cannot see (higher ground, unaware target, faction); narrative outcomes;
  magic answers and research; Taint exposure, mutations, Powers; mass battle choices; ancestor permission.

## 5. Content and licensing

pf2e ships its automation as compendium content under an open license. The L5R 4e Core Rulebook is not open
content and this repository is public (CLAUDE.md **Licensed material**), so the system ships the engine,
the rule editor, and import/export, never the book's schools, spells, techniques, or advantages. GMs build
their own items or private compendiums. PR #25 ("Packs") contains rulebook text and cannot be merged.

## 6. Book questions for Ernie

Found while surveying; each needs a ruling before the stage that automates it (CLAUDE.md **Ask Ernie when**).

| # | Question | Pages |
|---|----------|-------|
| Q1 | Monk starting Status and Glory differ between two passages | 95, 231 |
| Q2 | A fractional Honor (e.g. 6.5) as a roll input: rank 6? Rounding for half Honor | 90, 252 |
| Q3 | Does the Weakness Disadvantage lower the Ring derived from the weakened Trait? | 162 |
| Q4 | Blind's replacement Armor TN: stacking order with armor and stance | 89, 157 |
| Q5 | War Fan Mastery 7 and 5: do the bonuses stack? | 143 |
| Q6 | Ichiro Rank 3 grants Reduction in "Ranks" with no unit | 216 |
| Q7 | Scorpion Instigator Rank 1 uses an Honor difference: signed or absolute? | 250 |
| Q8 | Kakita Rank 1 adds School Rank: to which value? | 109 |
| Q9 | Hiruma Rank 5's "two attacks in a row" wording | 108 |
| Q10 | No Pure Breaths (maho) damage wording | 273 |
| Q11 | The "Ninja" weapon keyword is used but not defined | 204 |

Transcription gaps to fix in `game-rules/` against the PDF before the stage that needs them: the Battle Table
(p.240), the crafting tables (p.258), missing page markers for pp.282-283 in `89_shadowlands_taint.md`, and the
Advantages after Silent that landed in `65_disadvantages.md`.
