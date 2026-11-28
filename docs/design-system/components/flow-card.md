# Flow card

A card that runs a flow of several steps, an iaijutsu duel, a grapple, or a group's Fear test: a title with the current stage, the log of what happened, and one button per step the flow allows now. The GM's client re-renders the same message after each step. It is a [chat card](chat-card.md).

| Item | Detail |
| --- | --- |
| Template | `templates/chat/flow.hbs`, `CHAT_TEMPLATES.flowCard`: no `-card` suffix ([naming.md](../../code-system/naming.md#templates-and-actions)). Preloaded in `PRELOAD_TEMPLATES` (`module/config/templates.js`) |
| Flows | `module/services/combat/duel.js`, `module/services/combat/grapple.js`, and `module/services/fear-card.js`, each with its `render`, registered with `registerFlow` (`module/services/combat/flow.js`) |
| Posted by | `startFlow` (`module/services/combat/flow.js`) |
| Stored in | `flags.l5r4-enhanced.flow` (fixed flag): the flow's name and state |
| Wired by | `bindFlowCards` (`module/services/combat/flow.js`): each `[data-flow-action]` calls the flow's `click` with the button and whether Shift was held, then `requestStep` |
| SCSS | `.l5r4-flow-card` (`scss/components/_flow-card.scss`); its note lines share the chat card shell's italic (`scss/components/_chat-card.scss`) |
| Quench | `l5r4-enhanced.combat`; the Fear card in `l5r4-enhanced.workflows.fear-workflow` |

## Anatomy

All classes and attributes are fixed names ([chat card](chat-card.md#fixed-names)).

| Part | Markup | Shows |
| --- | --- | --- |
| Root | `div.chat-card.l5r4-flow-card` | A column |
| Title | `div.dice-flavor` | `l5r4.ui.combat.flowTitle` "{flow}: {stage}" |
| Log | `div.check-note`, one per line | What each step did; a grapple shows its last six lines (`render` (`module/services/combat/grapple.js`)) |
| Buttons | `div.flow-actions.flexrow.-gap-sm`, one `<button type="button" data-flow-action data-duelist data-side>` each | One per step allowed now, stacked full width |

## Variants

| Variant | Buttons |
| --- | --- |
| Duel | `roll` "Roll for {name}" and `concede` "{name} concedes" per duelist while the stage allows; at the Strike, `concede` reads "{name} yields" for the duelist a first strike hit (`buildDuelButtons`, `canConcede` (`module/services/combat/duel.js`)) |
| Grapple | `control` "Control roll: {name}" for each side that has not rolled, and `hit`, `throw`, `break`, `pass` for the side in control, until the grapple is over (`render` (`module/services/combat/grapple.js`)) |
| Fear | `roll` "Roll for {name}" for each character who has not rolled, through the check dialog, Shift skipping it; the log has one line per result; the GM's End reads "Roll for the rest" and rolls them with no dialog (`render`, `end` (`module/services/fear-card.js`)) |
| Over | No buttons; the stage reads done or over |

## States

| State | Look |
| --- | --- |
| In progress | Stage in the title, buttons for the allowed steps |
| Step running | The clicker's roll dialog or roll; the card re-renders when the GM applies the step (`applyFlowStep` (`module/services/combat/flow.js`)) |
| No GM connected | Warning `l5r4.ui.effects.noGM` on a player's step; the card does not change |
| Done | Final stage word, the log, no buttons |

## Parameters

Context from each flow's `render(state)`:

| Name | Type | Meaning |
| --- | --- | --- |
| `title` | string | The flow's name; a grapple adds both sides' names |
| `stage` | string | The stage, localized |
| `lines` | string[] | Finished sentences |
| `buttons` | `{ action, label, data }[]` | `action` fills `data-flow-action`; `data` fills both `data-duelist` and `data-side` |
| `gm` | `{ redo, end, endLabel? }` | Which of the GM's corrections show; `endLabel` names End when the flow's `end` does more than stop it, as the Fear card's "Roll for the rest" |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap-tight` | `gap` | Root column (`.l5r4-flow-card` (`scss/components/_flow-card.scss`)); `flow-actions` stacks its buttons (`.flow-actions` in `.l5r4-flow-card` (`scss/components/_flow-card.scss`)) |

## Keyboard and screen reader

Every step is a `<button type="button">` with its label as its name. A step either side may take names its actor ("Roll for {name}"); the grapple's Hit, Throw, Break, and Pass belong to the side the title names as in control. The title says the stage before the log and the buttons.

## Long text

The buttons stack one per row, full width (`.flow-actions` in `.l5r4-flow-card` (`scss/components/_flow-card.scss`)), so a label with two actor names wraps in a button of its own ([chat card](chat-card.md#long-text)). The log wraps.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| FC1 | A step re-renders the same message from the new state; the state lives in flags, never in the HTML | Quench `l5r4-enhanced.combat` | `card.update` with `handler.render(state)` and the new state in `applyFlowStep` (`module/services/combat/flow.js`) | Posting a card per stage (modeled) |
| FC2 | A button exists only for a step the state allows now | Quench `l5r4-enhanced.combat` | A `roll` button only when `d.canRoll`, in `buildDuelButtons` (`module/services/combat/duel.js`) | Every button on every stage, refused on click (modeled) |
| FC3 | A step either side may take names whose step it is; a step only the side in control takes follows the stage line that names that side | Review | `F("l5r4.ui.combat.duel.roll", { name: d.name })` (`module/services/combat/duel.js`) | Two buttons both labelled "Roll" (modeled) |
| FC4 | `data-flow-action` values and `data-duelist` / `data-side` stay as they are | `tests/conventions/actions.test.js` (fixed names exempt) | `data-flow-action="concede"` | Renaming to `data-action="concede-duel"`: posted cards lose their buttons (modeled) |
| FC5 | Title and stage are one localized sentence | Review | `{{localize "l5r4.ui.combat.flowTitle" flow=title stage=stage}}` (`templates/chat/flow.hbs`) | `{{title}}: {{stage}}` joined in the template (modeled) |

## Do and don't

| Do                                         | Don't                                          |
| ------------------------------------------ | ---------------------------------------------- |
| Keep the last lines of the log on the card | Let the log grow without bound                 |
| Run every step through the GM's query      | Change the flow's flags from a player's client |
