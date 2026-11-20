# Check card

The card the roll pipeline posts for every Skill, Trait, Ring, spell, attack, and damage roll: what was rolled, the modifiers that applied, the dice, the outcome against the TN, the notes the roll's rules add, and the buttons for what comes next. It is a [chat card](chat-card.md) on a `roll` ChatMessage, whose `system` holds the whole roll context.

| Item | Detail |
| --- | --- |
| Template | `templates/chat/check.hbs`, `CHAT_TEMPLATES.checkCard`; chat templates take no `-card` suffix ([naming.md](../../code-system/naming.md#templates-and-actions)) |
| Rendered by | `renderCheckCard` (`module/services/dice/check/card.js`), called as `renderCheckCard(system, roll, { actorId })` |
| Posted by | `rollCheck` through `roll.toMessage({ type: "roll", system, speaker, content })` in `postCheck` (`module/services/dice/check/roll-check.js`) |
| Wired by | `bindCheckCard` (`module/services/dice/check/chat-actions.js`), `bindAttackCard` (`module/services/combat/attack-card.js`) and `bindDamageCards` (`module/services/combat/damage.js`); each removes the buttons its viewer may not press (`hideUnusable` (`module/utils/dom.js`)) |
| Context menu | Re-roll and keep the better, Contested Roll (`onGetChatMessageContextOptions` (`module/services/dice/check/chat-actions.js`)) |
| SCSS | `scss/components/_check-card.scss`: the card's column under the fixed root `.l5r4-roll`, and the dropped-dice mark under `.l5r4-check` ([dice row](dice-row.md)) |
| Quench | `l5r4-enhanced.roll-pipeline`, `l5r4-enhanced.combat` |

## Anatomy

All classes on this card are fixed names ([chat card](chat-card.md#fixed-names)).

| Part | Markup | Shows |
| --- | --- | --- |
| Root | `div.chat-card.l5r4-roll.l5r4-check` | A column of the parts below |
| Title | `div.dice-flavor` | The roll's label, the target's name when there is one; suffixes for Unskilled, Emphasis, and Void Points spent (`buildCheckLabel` (`module/services/dice/check/message-data.js`)) |
| Modifiers | `ul.check-applied`, one `li` per modifier | Each modifier that applied, with its `+XkY` or `+N` text |
| Dice row | `{{{roll}}}` | [Dice row](dice-row.md) |
| TN line | `div.l5r4-tn-result` | Outcome, the TN, Raises, Free Raises spent on the TN, the wound penalty, and every other TN change the roll kept as one line (`templates/chat/_partials/_tn-changes.hbs`, which the check dialog's TN hint shares) |
| Free Raises | `div.check-free-raises` | Free Raises left after those spent on the TN |
| Notes | `div.check-note`, one per note, maneuver note, and the damage sources line | Sentences the roll's rules add |
| Buttons | `<button type="button" data-action="…">`; damage buttons in `div.damage-actions`, condition buttons in `div.check-conditions` | Next steps, below |

| Button | Action | Shown when | Runs |
| --- | --- | --- | --- |
| Roll Contested Strength | `combat-contest` | A hit with a target and Knockdown or Disarm | `rollContest` (`module/services/combat/contest.js`) |
| Start grapple with {target} | `grapple-start` | A hit with a target and the Grapple maneuver | `startGrapple` (`module/services/combat/grapple.js`) |
| Apply to {target} | `damage-apply-target` | A damage roll with a target | `applyDamage` (`module/services/combat/damage.js`) |
| Apply to selected | `damage-apply-selected` | Every damage roll | `applyDamage` (`module/services/combat/damage.js`) |
| {effect} on {target} | `apply-condition`, `data-index` | A success with ApplyCondition rules, one button per condition | `applyConditionFromMessage` (`module/services/dice/check/chat-actions.js`) |
| Damage roll ({weapon}) | `check-damage` | A hit that is not a grapple | `rollDamageFromMessage` (`module/services/dice/check/chat-actions.js`); Shift+click skips the dialog |
| Honor Roll | `honor-roll` | A failed Skill, Trait, Ring, or spell roll with the Honor Roll setting on (`game-rules/43_honor.md, p.92`) | `rollHonor` (`module/services/dice/check/honor-roll.js`) |

## Variants

| Variant | `kind` | Differs |
| --- | --- | --- |
| Roll against a TN | `skill`, `trait`, `ring`, `spell`, `maho` | TN line; Honor Roll button on a failure |
| Roll with no TN | any, `tn.effective` null | No TN line |
| Attack | `attack` | Target in the title; "Missed" in place of "Failure"; damage, contest, and grapple buttons on a hit; maneuver notes |
| Damage | `damage` | No TN line; damage sources note; Apply buttons |

## States

| State | Look |
| --- | --- |
| Success | TN line opens with the success word |
| Failure, miss | TN line opens with the failure or miss word; the Honor Roll button may show |
| Dice expanded | [Dice row](dice-row.md) states |
| Whispered | Core's frame for the message mode the roller chose [src: client/dice/roll.mjs:933] |
| Button pressed | Core's button look; the action posts a new card (damage, contest) or changes an actor (apply) |

The card does not change after posting. Each next step posts its own card.

## Parameters

Template context from `renderCheckCard` (`module/services/dice/check/card.js`): the stored `system` of the message, and

| Name | Type | Meaning |
| --- | --- | --- |
| `label` | string | The title |
| `target.name` | string | The target, empty when none |
| `appliedModifiers` | `{ label, text }[]` | Modifiers that applied, `text` as `+1k1` or `+5` |
| `roll` | HTML string | `Roll#render()` output |
| `tn` | object or null | `effective`, `raises`, `freeRaisesToTN` (a fixed field name), `woundPenalty` |
| `outcomeText` | string | Success, Failure, or Missed, localized |
| `freeRaisesLeft` | number | Free Raises not spent on the TN |
| `notes`, `maneuverNotes`, `sources` | string[] | Finished sentences, and the damage source tags |
| `contest`, `grappleButton`, `honorRoll` | boolean | Show that button |
| `kind`, `applyTarget` | string | Damage buttons and the target's name for them |
| `conditions`, `outcome.success` | array, boolean | Condition buttons on a success |
| `damageButton` | string | The weapon's name for the damage button, empty for none |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap-tight` | `gap` | Root column (`.l5r4-roll` (`scss/components/_check-card.scss`)) |
| `--l5r4-font-size-meta` | `font-size` | `check-applied` (`.check-applied` (`scss/components/_check-card.scss`)) |

`l5r4-check-damage` takes `width: 100%` (`.l5r4-check-damage` (`scss/components/_check-card.scss`)), so the damage button spans the card.

## Keyboard and screen reader

As [chat card](chat-card.md#keyboard-and-screen-reader). Each button's label names its action and its object ("Apply to {target}"), so a reader hears which target a button acts on. The outcome is the first word of the TN line.

## Long text

A long label, target name, or weapon name wraps in the title and in its button ([chat card](chat-card.md#long-text)). The modifier list holds one modifier per line.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| CK1 | The card renders from the stored `system` alone, so every render of one message draws the same card | Quench `l5r4-enhanced.roll-pipeline` | `renderCheckCard` (`module/services/dice/check/card.js`) reads only `system` and the roll | Reading the live actor inside the template context (modeled) |
| CK2 | The outcome is a word, first on the TN line | Review | `{{outcomeText}}` opens `l5r4-tn-result` (`templates/chat/check.hbs`) | Color on core's total as the only outcome (modeled) |
| CK3 | Each line is one localized sentence with placeholders: title, TN line, and button labels | `tests/conventions/templates.test.js`, review | `{{localize "l5r4.ui.effects.applyTo" effect=label target=../target.name}}` (`templates/chat/check.hbs`) | `{{outcomeText}} {{localize "l5r4.ui.combat.vs"}} {{localize "l5r4.ui.common.tn"}} {{tn.effective}}` builds the line from fragments (modeled) |
| CK4 | A label suffix is copy: no "!" and no bracketed tags built in code | `tests/lang.test.js` (no value ends with "!"), review | `F("l5r4.ui.mechanics.rolls.voidLabel", { label })` in `buildCheckLabel` (`module/services/dice/check/message-data.js`) | `` label += ` ${T("l5r4.ui.mechanics.rings.void")}!` `` (modeled) |
| CK5 | A button appears only when its action can run for this roll | Quench `l5r4-enhanced.combat` | `{{#if damageButton}}`, whose `damageButton` `renderCheckCard` (`module/services/dice/check/card.js`) sets only for a hit that is not a grapple | A damage button on every attack, which warns on a miss (modeled) |
| CK6 | Card actions and classes are fixed; a new button takes a kebab-case `data-action` and, if styled, an `l5r4-` class | `tests/conventions/actions.test.js`, `tests/conventions/templates.test.js` | `data-action="check-damage"` (`templates/chat/check.hbs`) | `data-action="rollDamage"` (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Add data to `system` and render from it | Store a computed sentence in `system` and render it raw |
| Name the target in a button that acts on it | Use "Apply" alone when the card has two Apply buttons |
| Keep `freeRaisesToTN` as the stored field name | Rename stored fields to fit the `Tn` stem |
