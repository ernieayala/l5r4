# Dice row

The roll inside a check card: the dice formula, the total, and, when expanded, each die with its kept, dropped,
exploded, and re-rolled marks. Core renders it and styles it; the system adds one mark, on dropped and re-rolled dice,
so they differ from kept dice by more than color. This page records what the row shows for a Roll & Keep roll and the
rules a card around it follows.

| Item        | Detail                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Template    | Core's `resources/app/templates/dice/roll.hbs` and `resources/app/templates/dice/tooltip.hbs`, rendered by `Roll#render()`                                                                             |
| Inserted at | `{{{roll}}}` in `templates/chat/check-card.hbs:10`, from `roll: await roll.render()` (`module/services/dice/check/roll-check.js:637`); `templates/chat/weapon-chat.hbs:2` on cards posted before 4.0.0 |
| Die         | `L5R4Die` (`module/services/dice/roll-keep-die.js:14`), registered as `CONFIG.Dice.terms.d`                                                                                                            |
| Formula     | `poolFormula` (`module/utils/check.js:105-109`): `<roll>d10[r1][xa<n>]k<keep><±bonus>`                                                                                                                 |
| SCSS        | Core's `.dice-roll` and `.dice-tooltip` rules (`foundry2.css:5597-5738`). The dropped-dice mark (DR5) sits in `scss/components/_check-card.scss` (target), under the card's fixed root `.l5r4-check`   |
| Quench      | `l5r4-enhanced.roll-pipeline`                                                                                                                                                                          |

## Anatomy

| Part    | Markup (core's)                             | Shows                                                                                                                                                                                    |
| ------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roll    | `div.dice-roll[data-action="expandRoll"]`   | The whole row; a click expands or collapses the dice                                                                                                                                     |
| Formula | `div.dice-formula`                          | Core's dice notation for the pool, such as `7d10xa10k3+0`                                                                                                                                |
| Dice    | `div.dice-tooltip > section.tooltip-part`   | One part per dice term: its formula, its total, and one `li` per die                                                                                                                     |
| Die     | `li.roll.l5r4die.d10` and its state classes | The die's result. An exploded die shows its summed total (a 10 then a 7 is one die of 17), as `L5R4Die` adds each explosion to its own die (`game-rules/26_special_dice_rules.md, p.77`) |
| Total   | `h4.dice-total`                             | The roll's total: the kept dice and any flat bonus                                                                                                                                       |

The TN, the Raises, and the outcome are in the [check card](check-card.md), not in this row.

## Variants

| Variant                   | Formula          | What differs                                                                                              |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| Skilled roll              | `6d10xa10k3+0`   | Dice explode on 10                                                                                        |
| Unskilled Roll            | `4d10k2+0`       | No `xa`: no die explodes                                                                                  |
| Lower explosion threshold | `5d10xa>=9k2+0`  | A weapon's "Explodes on" value                                                                            |
| Emphasis                  | `6d10r1xa10k3+0` | Each 1 is re-rolled once; the first result shows as re-rolled (`game-rules/58_skills_overview.md, p.133`) |
| Flat bonus                | `5d10xa10k3+5`   | The total includes the bonus                                                                              |

## States

| State        | Look (core's)                                                                                                    | Class on the die     |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| Collapsed    | Formula and total only                                                                                           | `dice-roll`          |
| Expanded     | The dice show under the formula                                                                                  | `dice-roll expanded` |
| Kept         | Full strength                                                                                                    | none                 |
| Dropped      | Core's dimming, `filter: sepia(0.5) contrast(0.75) opacity(0.4)`, and the system's line through the number (DR5) | `discarded`          |
| Re-rolled    | As dropped                                                                                                       | `rerolled`           |
| Exploded     | A Font Awesome glyph above the die                                                                               | `exploded`           |
| Highest face | Green tint; never on an exploded die, whose total passes 10                                                      | `max`                |
| Lowest face  | Red tint                                                                                                         | `min`                |

## Parameters

None the system passes. `Roll#render()` reads the evaluated roll. The system passes no `flavor`, so the row has no
flavor line of its own; the card's `dice-flavor` title carries the label.

## Tokens

None. The row is core's markup and core's styles, in both themes; the DR5 mark is a text decoration and reads no
color token.

## Keyboard and screen reader

| Contract | Detail                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expand   | Core's `expandRoll` action on a `<div>`. Core owns its keyboard behavior; the system adds none                                                             |
| Reading  | Formula, then total. The dice list reads each result as a number; kept or dropped shows by core's dimming and DR5's line, which a reader does not announce |
| Outcome  | The card states the outcome in words beside the row ([check card](check-card.md)), so no reader depends on the dimmed dice                                 |

## Long text

The formula is one token with no spaces; core breaks it anywhere (`word-break: break-all`, `foundry2.css:5627`), so a
long pool wraps inside the sidebar. The dice float in rows and wrap (`foundry2.css:5684-5688`); the Ten Dice Rule
caps a roll at ten dice (`game-rules/26_special_dice_rules.md, p.77`). Review checks the row at 420 px in the gallery.

## Rules

| #   | Rule                                                                                                                                                                                                  | Enforced by                                                       | Conforming                                                                                                                                  | Non-conforming                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| DR1 | The row is core's `Roll#render()` output, inserted whole. The system writes no dice markup of its own                                                                                                 | ESLint `no-restricted-syntax` (no HTML strings)                   | `roll: await roll.render()` (`roll-check.js:637`)                                                                                           | Building `<li class="roll">` strings for each die (modeled)                               |
| DR2 | The system adds no style under `.dice-roll` or `.dice-tooltip` other than DR5's mark; core's look holds in both themes                                                                                | `tests/conventions/styles.test.js` (selectors on `l5r4-` classes) | No rule in `scss/` names `.dice-roll` (true today)                                                                                          | `.l5r4-check .dice-total { color: … }` (modeled)                                          |
| DR3 | The formula comes from `poolFormula` and nowhere else, so every roll reads the same                                                                                                                   | Review                                                            | `new foundry.dice.Roll(poolFormula(pool))` (`roll-check.js:426`)                                                                            | A formula assembled at a call site (modeled)                                              |
| DR4 | Outcome, TN, and Raises live on the card, in words, never only in the dice marks                                                                                                                      | Review, in the gallery's chat section                             | `l5r4-tn-result` states the outcome and the TN in words ([check card](check-card.md))                                                       | A card that shows the dice row and relies on the dimmed dice to say what failed (modeled) |
| DR5 | A dropped or re-rolled die carries a mark that is not color: a line through its number (Stage 17 decision 16). The rule sits under the card's fixed root, so cards posted before it show the mark too | Review, in the gallery's chat section                             | `.l5r4-check .roll.discarded, .l5r4-check .roll.rerolled { text-decoration: line-through; }` in `scss/components/_check-card.scss` (target) | Dropped dice told apart by core's dimming alone (today)                                   |

## Do and don't

| Do                                                     | Don't                                               |
| ------------------------------------------------------ | --------------------------------------------------- |
| Insert `{{{roll}}}` where the dice belong in a card    | Restyle core's dice beyond DR5's mark               |
| Build every pool through `buildPool` and `poolFormula` | Hand-write a formula string                         |
| Put the XkY pool and the outcome in the card's text    | Expect a reader to count kept dice from the tooltip |
