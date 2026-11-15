# Flow card

A card that runs a combat flow of several steps, an iaijutsu duel or a grapple: a title with the current stage, the
log of what happened, and one button per step the flow allows now. The GM's client re-renders the same message after
each step. It is a [chat card](chat-card.md).

| Item      | Detail                                                                                                                                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template  | `templates/chat/flow-card.hbs`, `CHAT_TEMPLATES.flowCard`, renamed `templates/chat/flow.hbs` (target): no `-card` suffix ([naming.md](../../code-system/naming.md#templates-and-actions)). Not in the preload list; `renderTemplate` loads it on first use |
| Flows     | `module/services/combat/duel.js` (`render` at `:201`), `module/services/combat/grapple.js` (`render` at `:193`), registered with `defineFlow` (`module/services/combat/flow.js:59`)                                                                        |
| Posted by | `startFlow(name, state, speaker)` (`flow.js:70-76`)                                                                                                                                                                                                        |
| Stored in | `flags.l5r4-enhanced.flow` (fixed flag): the flow's name and state                                                                                                                                                                                         |
| Wired by  | `bindFlowCards` (`flow.js:132-147`): each `[data-flow-action]` calls the flow's `click`, then `requestStep`                                                                                                                                                |
| SCSS      | Now `scss/_chat.scss:48-57`; `scss/components/_flow-card.scss` (target)                                                                                                                                                                                    |
| Quench    | `l5r4-enhanced.combat`                                                                                                                                                                                                                                     |

## Anatomy

All classes and attributes are fixed names ([chat card](chat-card.md#fixed-names)).

| Part    | Markup                                                                                                        | Shows                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Root    | `div.chat-card.l5r4-flow-card`                                                                                | A column                                                                  |
| Title   | `div.dice-flavor`                                                                                             | `{{title}}: {{stage}}`                                                    |
| Log     | `div.check-note`, one per line                                                                                | What each step did; a grapple shows its last six lines (`grapple.js:216`) |
| Buttons | `div.flow-actions.flexrow.-gap-sm`, one `<button type="button" data-flow-action data-duelist data-side>` each | One per step allowed now, stacked full width                              |

## Variants

| Variant | Buttons                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Duel    | `roll` "Roll for {name}" and `concede` "{name} concedes" per duelist while the stage allows (`duel.js:252-270`)          |
| Grapple | `control` "Control roll: {name}" until each side has rolled, then `hit`, `throw`, `break`, `pass` (`grapple.js:196-210`) |
| Over    | No buttons; the stage reads done or over                                                                                 |

## States

| State           | Look                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| In progress     | Stage in the title, buttons for the allowed steps                                                     |
| Step running    | The clicker's roll dialog or roll; the card re-renders when the GM applies the step (`flow.js:84-96`) |
| No GM connected | Warning `l5r4.ui.effects.noGM` on a player's step; the card does not change                           |
| Done            | Final stage word, the log, no buttons                                                                 |

## Parameters

Context from each flow's `render(state)`:

| Name      | Type                        | Meaning                                                                             |
| --------- | --------------------------- | ----------------------------------------------------------------------------------- |
| `title`   | string                      | The flow's name; a grapple adds both sides' names                                   |
| `stage`   | string                      | The stage, localized                                                                |
| `lines`   | string[]                    | Finished sentences                                                                  |
| `buttons` | `{ action, label, data }[]` | `action` fills `data-flow-action`; `data` fills both `data-duelist` and `data-side` |

## Tokens

| Token                    | Property | Part                                                                           |
| ------------------------ | -------- | ------------------------------------------------------------------------------ |
| `--l5r4-space-gap-tight` | `gap`    | Root column (`_chat.scss:48-53`); `flow-actions` stacks its buttons (`:55-57`) |

## Keyboard and screen reader

Every step is a `<button type="button">` with its label as its name. A step either side may take names its actor
("Roll for {name}"); the grapple's Hit, Throw, Break, and Pass belong to the side the title names as in control. The
title says the stage before the log and the buttons.

## Long text

The buttons stack one per row, full width (`_chat.scss:47-57`), so a label with two actor names wraps in a button of
its own ([chat card](chat-card.md#long-text)). The log wraps.

## Rules

| #   | Rule                                                                                                                                  | Enforced by                                              | Conforming                                                                                 | Non-conforming                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| FC1 | A step re-renders the same message from the new state; the state lives in flags, never in the HTML                                    | Quench `l5r4-enhanced.combat`                            | `card.update({ content: await handler.render(state), [flags…]: state })` (`flow.js:92-95`) | Posting a card per stage (modeled)                                                  |
| FC2 | A button exists only for a step the state allows now                                                                                  | Quench `l5r4-enhanced.combat`                            | `...(d.canRoll ? [{ action: "roll", … }] : [])` (`duel.js:253-261`)                        | Every button on every stage, refused on click (modeled)                             |
| FC3 | A step either side may take names whose step it is; a step only the side in control takes follows the stage line that names that side | Review                                                   | `F("l5r4.ui.combat.duel.roll", { name: d.name })` (`duel.js:257`)                          | Two buttons both labelled "Roll" (modeled)                                          |
| FC4 | `data-flow-action` values and `data-duelist` / `data-side` stay as they are                                                           | `tests/conventions/actions.test.js` (fixed names exempt) | `data-flow-action="concede"`                                                               | Renaming to `data-action="concede-duel"`: posted cards lose their buttons (modeled) |
| FC5 | Title and stage are one localized sentence                                                                                            | Review                                                   | One key with `{flow}` and `{stage}` (modeled)                                              | `{{title}}: {{stage}}` joined in the template (`flow-card.hbs:2`)                   |

## Do and don't

| Do                                         | Don't                                          |
| ------------------------------------------ | ---------------------------------------------- |
| Keep the last lines of the log on the card | Let the log grow without bound                 |
| Run every step through the GM's query      | Change the flow's flags from a player's client |
