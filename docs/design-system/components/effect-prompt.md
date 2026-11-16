# Effect prompt

A card that asks an actor's owner to roll for an effect: a save against a condition, the Full Defense roll, or a
Concentration check. The active GM posts it on a combat event or after damage; the owner clicks, rolls through the
[check dialog](check-dialog.md), and the result is applied. It is a [chat card](chat-card.md).

| Item      | Detail                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Template  | `templates/chat/effect-prompt.hbs`, `CHAT_TEMPLATES.effectPrompt`                                                               |
| Posted by | `postPrompt` (`module/services/effects/prompts.js`), from `postSavePrompts`, `postFullDefensePrompt`, `postConcentrationPrompt` |
| Stored in | `flags.l5r4-enhanced.prompt` (fixed flag): the actor and the request; the button reads it, never the HTML                       |
| Wired by  | `bindPromptCard` (`module/services/effects/prompts.js`), from `registerChatCardHooks` (`module/hooks/register-all.js`)          |
| SCSS      | None of its own. The root column comes from the shared chat card rules in `scss/components/_chat-card.scss`                     |
| Quench    | `l5r4-enhanced.effects`                                                                                                         |

## Anatomy

All classes and the action are fixed names ([chat card](chat-card.md#fixed-names)).

| Part   | Markup                                | Shows                                                                     |
| ------ | ------------------------------------- | ------------------------------------------------------------------------- |
| Root   | `div.chat-card.l5r4-effect-prompt`    |                                                                           |
| Title  | `div.dice-flavor`                     | What asks for the roll: `l5r4.ui.effects.saveTitle`, or the stance's name |
| Text   | `<p>`, when there is text             | What to roll and against which TN                                         |
| Button | `button[data-action="effect-prompt"]` | The label the caller passes: "Roll"                                       |

## Variants

| Variant       | `request.kind`  | Title                       | Text                                         |
| ------------- | --------------- | --------------------------- | -------------------------------------------- |
| Save          | `save`          | `saveTitle` with the effect | `saveText` with the Ring or Trait and the TN |
| Full Defense  | `fullDefense`   | The stance's name           | The stance's description key                 |
| Concentration | `concentration` | `saveTitle` with the effect | `saveText` with Willpower and the TN         |

## States

| State                   | Result                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default                 | One button for every viewer                                                                                                                        |
| Clicked by the owner    | The roll dialog opens; the result ends, changes, or keeps the effect: `onPromptClick` and `applySaveResult` (`module/services/effects/prompts.js`) |
| Clicked by someone else | Warning `l5r4.ui.notifications.noPermission`; nothing rolls                                                                                        |
| Effect already ended    | Info `l5r4.ui.effects.alreadyEnded`; nothing rolls                                                                                                 |

The card never changes after posting; the roll posts its own [check card](check-card.md).

## Parameters

| Name     | Type             | Meaning                |
| -------- | ---------------- | ---------------------- |
| `title`  | string           | Localized title        |
| `text`   | string, optional | One localized sentence |
| `button` | string           | Localized button label |

## Tokens

None of its own; it reads the [chat card](chat-card.md#tokens) tokens.

## Keyboard and screen reader

The button is a `<button type="button">` with its label as its name. The text paragraph comes before it, so a reader
hears the TN before the control.

## Long text

A long effect name wraps in the title. The text paragraph wraps.

## Rules

| #   | Rule                                                                                  | Enforced by                                      | Conforming                                                                                                        | Non-conforming                                     |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| EP1 | The button reads the request from the message flags, which only the GM's client wrote | Quench `l5r4-enhanced.effects`                   | `message.getFlag(SYS_ID, "prompt")` in `onPromptClick` (`module/services/effects/prompts.js`)                     | Reading the TN from the `<p>` text (modeled)       |
| EP2 | The click checks ownership before it rolls                                            | Quench `l5r4-enhanced.effects`                   | The `actor?.isOwner` guard at the top of `onPromptClick` warns and returns (`module/services/effects/prompts.js`) | Rolling for any clicker (modeled)                  |
| EP3 | The button label is a verb                                                            | Review ([voice.md](../content/voice.md#buttons)) | `button: T("l5r4.ui.common.roll")` in `postFullDefensePrompt` (`module/services/effects/prompts.js`)              | A button labelled with the effect's name (modeled) |
| EP4 | Title, text, and label arrive localized; the template renders them as text            | `tests/conventions/templates.test.js`            | `{{title}}`, `{{text}}`, `{{button}}` (`templates/chat/effect-prompt.hbs`)                                        | `{{{text}}}` with markup built in code (modeled)   |

## Do and don't

| Do                                      | Don't                                            |
| --------------------------------------- | ------------------------------------------------ |
| Put the TN and what to roll in the text | Leave the TN for the dialog to reveal            |
| Post one card per save                  | Bundle saves for several effects into one button |
