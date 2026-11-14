# Stage 8: Roll pipeline

**Goal:** every roll (Skill, Trait, Ring, spell, maho, attack, damage, contested, Initiative) goes through one
pipeline that pulls its modifiers from the rule engine, shows them in one dialog the player can adjust, applies
the dice rules, and stores its full context on the chat message.
**Needs:** 7.

Rules read with `/rule` before building: `23_roll_and_keep.md` p.75, `26_special_dice_rules.md` p.77,
`24_target_numbers.md` p.76, `28_raises.md` p.79, `25_rings_and_traits.md` p.78 (Void),
`29_types_of_rolls.md` pp.79-80, `30_skill_rolls_expanded.md` pp.80-81, `58_skills_overview.md` p.133
(Emphases).

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Roll classes and evaluation | `foundry.dice.Roll`, `CONFIG.Dice.rolls` §5.1 |
| Chat message subtype holding roll context | `CONFIG.ChatMessage.dataModels`, `documentTypes.ChatMessage` §5.2 |
| Dialog | `DialogV2` or an `ApplicationV2` roll dialog §4.1 |
| Message visibility | `messageMode` |

## Audit

| Where | Finding |
|-------|---------|
| `module/services/dice/rolls/*.js` | Eight roll services, each rebuilding its modifier stack inline |
| `module/sheets/handlers/roll-handler.js`, `pc-roll-handler.js` | Handlers add bonuses the services add again (AUTOMATION.md B1-B3) |
| `module/services/dice/core/formula-builder.js:40-54` | Explosion fixed at 10; `explodesOn` never read (#37, B11) |
| `module/services/dice/rolls/simple-roll.js`, `skill-roll.js` | Only `SimpleRoll` reads `attack` rules from the modifier bag, so Skill weapon attacks miss Mounted (#41) |
| `module/services/dice/rolls/trait-roll.js` | Trait bonuses added only on the dialog path (#42) |
| `module/services/dice/core/tn-calculator.js:47-48`, `module/services/dice/resources/raise-manager.js:35-56` | Free Raises display-only; Raise cap from current Void Points (B7) |
| `module/services/dice/rolls/skill-roll.js:221-238, 272-274`, `weapon-roll.js:120-130` | Unskilled rolls allow Raises; Void on damage (B7) |
| `templates/dialogs/roll-modifiers-dialog.hbs:51-55` | Emphasis is a bare checkbox |
| `module/services/chat.js:305-371` | Inline `[[XkY]]` broken (B9) |
| `module/services/dice/resources/target-resolver.js:107-146` | Target Armor TN read only when the TN is 0 |

## Deliverables

| Layer | Change |
|-------|--------|
| Services | One `L5R4Check` pipeline: build the pool (Ring/Trait/Skill), collect modifiers for the roll's selectors, apply the target's rules (rolls against it), apply dice rules (explode threshold, unskilled, Emphasis reroll), Ten Dice Rule last, evaluate, compare with TN, compute Raises made |
| Services | The dialog lists each modifier with its source and a toggle, Raises and Free Raises (Free Raises may lower the TN), Void use, Emphasis offered from trained Emphases, keep-dice override |
| Documents | `ChatMessage` subtype `roll` storing pool, modifiers, TN, Raises, target, and outcome, so damage, rerolls, and Luck-style rerolls rebuild from the message |
| Services | Contested rolls; reroll keep-better; inline `[[XkY]]` through the same pipeline |
| Removed | The eight inline modifier stacks and the handler-side bonuses |

## Acceptance

- Vitest: the book's examples on pp.75-80 through `L5R4Check` with stubbed actors; B1-B3, B7, B9, B11 each
  have a failing-then-passing case; Ten Dice Rule examples (p.77).
- Quench: every existing roll batch passes with values that match the book where B1-B3 changed them; a
  `roll-pipeline` batch rolls each roll type and reads the stored context back from the message.
- Manual: Ernie rolls a skill with an Emphasis, an attack with Raises and a Free Raise against a target, and a
  spell, and checks the dialog and the card.

## Decisions

1. Every choice in AUTOMATION.md §4 that belongs to a roll is offered in the dialog, never made for the player.
2. Wound penalties raise the TN (p.82) instead of coming off the roll total as in 3.2.1 (Ernie, 2026-11-13).
3. Unskilled Rolls follow p.80 with Void: a Void Point adds +1k1, the dice still never explode, and no Raises or
   Free Raises apply. 3.2.1 gave +1k0 with explosions (Ernie, 2026-11-13).
4. The pipeline is `rollCheck` in `module/services/dice/check/roll-check.js`, with collection in `collect.js` and
   the pure math in `module/utils/check.js`. The seven roll services keep their names and arguments as thin
   adapters, so sheets and the existing Quench batches call them unchanged; their seven dialogs became one.
5. RollModifier rules no longer write `system.bonuses` (STAGE-07 decision 5 ends here): `system.bonuses` holds only
   Active Effect values, the pipeline lists each source, and sheet formulas read both through
   `displayRollBonus` (`module/utils/mechanics.js`).
6. A Ring Roll's dialog can still cast a spell without a spell item (3.2.1's second button), and a spell's slot is
   a choice in the dialog (elemental, Void, or none) instead of a separate confirmation.
7. Inline `xN` sets the explode threshold, as a DiceRule does; 3.2.1 parsed it into a value nothing read.
8. Initiative is rolled by core's Combat (Stage 5) from the same pool code (`initiativeFormula` uses `buildPool`
   and `poolFormula`). The Fear roll and the Full Defense roll stay as they are until Stage 9 moves Fear and
   stances to rule data; the once-per-Round Void limit (p.78) is a use counter, also Stage 9.
9. A Contested Roll is settled from the chat context menu against the last roll by someone else; a re-roll that
   keeps the better total is the other menu entry. Both read the stored context, never the card.
10. A ChatMessage subtype needs the manifest reread: after adding `documentTypes.ChatMessage.roll`, the test
    server was restarted.

## Out of scope

| Item | Stage |
|------|-------|
| Applying damage, maneuvers | 10 |
| Durations and saves | 9 |
