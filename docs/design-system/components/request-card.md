# Request card

The GM's ask for a roll: a [chat card](chat-card.md) naming the check, with one button that rolls it for whoever
clicks, with that player's own character. The GM posts it from the second button on a Check [inline link](inline-link.md).

| Item      | Detail                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template  | `templates/chat/check-request.hbs`, `CHAT_TEMPLATES.checkRequest`. The file is named after the `checkRequest` ChatMessage subtype: a fixed name                                                                |
| Posted by | `postCheckRequest(spec)` (`module/services/check-request.js:19-44`), GMs only, as a `checkRequest` message whose `system` holds the check                                                                      |
| Wired by  | `bindCheckRequestCard` (`check-request.js:52-70`), from `module/hooks/register-all.js:66`                                                                                                                      |
| Rolls     | `rollCheck(checkRequestFor(actor, message.system))`, the same request a Check link makes (`module/services/links.js:68-87`)                                                                                    |
| SCSS      | Now `scss/components/_request-card.scss:6-8`, beside two other components. `scss/components/_request-card.scss`, named for this page and styling the fixed block `l5r4-check-request` (one component per file) |
| Quench    | `l5r4-enhanced.table-tools`                                                                                                                                                                                    |

## Anatomy

All classes and the action are fixed names ([chat card](chat-card.md#fixed-names)).

| Part    | Markup                                                                             | Shows                                                                             |
| ------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Root    | `div.chat-card.l5r4-check-request`                                                 |                                                                                   |
| Title   | `div.dice-flavor`                                                                  | `l5r4.ui.links.requestTitle`                                                      |
| Request | `p.l5r4-check-request-text`, bold                                                  | The check as the link names it: Skill and Trait, or the Trait or Ring, and the TN |
| Button  | `button[data-action="check-request-roll"]` with `fa-solid fa-dice-d10` and a label | `l5r4.ui.links.requestRoll`                                                       |

## Variants

| Variant          | Request text                                 |
| ---------------- | -------------------------------------------- |
| Skill with Trait | `linkText(spec)`: Skill / Trait, with the TN |
| Trait or Ring    | The Trait or Ring name, with the TN          |
| Labelled link    | The link's own `{label}`                     |
| No TN            | The check's name alone                       |

## States

| State                                           | Look or result                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Default                                         | One button for every viewer                                                              |
| Clicked with a character                        | The check dialog opens for the clicker's controlled token, else their assigned character |
| Clicked with no character                       | Warning notification `l5r4.ui.links.noActor`; the card does not change                   |
| Skill the character lacks, no Trait in the link | Warning `l5r4.ui.links.needTrait`; no roll                                               |

The card never changes after posting. Each roll posts its own [check card](check-card.md).

## Parameters

Context from `postCheckRequest` (`check-request.js:31-37`):

| Name   | Type           | Meaning                                                  |
| ------ | -------------- | -------------------------------------------------------- |
| `text` | string         | `linkText(spec)`, localized                              |
| `tn`   | number or null | Passed and not read by the template; the TN is in `text` |

The message's `system` (`label`, `skill`, `trait`, `ring`, `tn`) is what the button rolls; the HTML is never read back.

## Tokens

| Token                                       | Property      | Part                                                   |
| ------------------------------------------- | ------------- | ------------------------------------------------------ |
| None today; `font-weight: bold` on the text | `font-weight` | `l5r4-check-request-text` (`_effect-panel.scss:85-87`) |

## Keyboard and screen reader

The button is a `<button type="button">` with an `inert` icon and a visible label; the label is its name. The request
text is a paragraph before the button, so a reader hears what is asked before the control.

## Long text

A long Skill name or label wraps in the request paragraph and in no other part.

## Rules

| #   | Rule                                                                          | Enforced by                                                         | Conforming                                                                                                    | Non-conforming                                                 |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| RQ1 | The button rolls from the message's `system`, never from the card's text      | Quench `l5r4-enhanced.table-tools`                                  | `checkRequestFor(actor, message.system)` (`check-request.js:65`)                                              | Parsing `.l5r4-check-request-text` back into a check (modeled) |
| RQ2 | Only a GM posts a request card                                                | Quench `l5r4-enhanced.table-tools`                                  | `if (!game.user.isGM)` warns and returns (`check-request.js:20-23`)                                           | Offering the request button to players (modeled)               |
| RQ3 | The button's icon is `fa-dice-d10`, `inert`, before its label                 | `tests/conventions/templates.test.js` (`inert`, one prefix), review | `<i class="fa-solid fa-dice-d10" inert></i> {{localize "l5r4.ui.links.requestRoll"}}` (`check-request.hbs:5`) | An icon-only roll button (modeled)                             |
| RQ4 | The request card's styles live in their own file, under `.l5r4-check-request` | `tests/conventions/styles.test.js` (one component per file)         | `scss/components/_request-card.scss` holding `.l5r4-check-request`                                            | The rule inside `scss/components/_request-card.scss:6-8`       |

## Do and don't

| Do                                            | Don't                                                  |
| --------------------------------------------- | ------------------------------------------------------ |
| Let each player roll with their own character | Roll for the GM's selected token from a player's click |
| Show the TN in the request text               | Hide the TN in a tooltip                               |
