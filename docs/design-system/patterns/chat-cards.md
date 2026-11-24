# Chat cards

How a card the system posts to chat is put together: speaker, title, dice row with kept and dropped dice, TN and Raises, outcome, results per target, action buttons, parts only some viewers see, whispered cards, and request cards. A posted card's HTML is stored in its message, so its classes and `data-action` names are fixed (Stage 17 decision 2). This page lists them and the rules that keep new cards and old ones looking the same.

| Item | Detail |
| --- | --- |
| Templates | `templates/chat/check.hbs`, `check-request.hbs`, `contest.hbs`, `damage-result.hbs`, `effect-prompt.hbs`, `flow.hbs`, `healing.hbs`, `item-summary.hbs`, `note.hbs`, `weapon.hbs`; item cards `templates/cards/<subtype>.hbs` with `inSheet` false |
| Paths | `CHAT_TEMPLATES` (`module/config/templates.js`) |
| Posted by | `rollCheck`, through `postCheck` (`module/services/dice/check/roll-check.js`); `postCheckRequest` (`module/services/check-request.js`); damage results, `postResult` (`module/services/combat/damage.js`); effect prompts, `postPrompt` (`module/services/effects/prompts.js`); flow cards, `startFlow` (`module/services/combat/flow.js`); rest (`module/services/rest.js`) |
| Wired by | `bind<Card>Card(message, html)` on `renderChatMessageHTML` (`docs/code-system/foundry-patterns.md`, Chat cards) |
| SCSS | One file per card component in `scss/components/` (rule 6): `scss/components/_chat-card.scss`, `scss/components/_check-card.scss`, `scss/components/_damage-result.scss`, `scss/components/_flow-card.scss`, `scss/components/_request-card.scss`, `scss/components/_item-summary-card.scss` |
| Tokens | `--l5r4-space-gap-tight`, `--l5r4-space-gap`, `--l5r4-font-size-meta`, `--l5r4-color-text`, `--l5r4-color-line-muted`, `--l5r4-state-disabled-opacity` |
| Components | Chat card, dice row, check card, request card, damage result, effect prompt, flow card, item summary card, button |
| Checks | `tests/conventions/actions.test.js` (fixed names exempt by name), `tests/conventions/templates.test.js`, `tests/conventions/styles.test.js`, ESLint `no-restricted-syntax`; "review" where no tool can judge |

## Anatomy

Every card has the parts below in this order. A part with nothing to show renders nothing.

| # | Part | Markup | Notes |
| --- | --- | --- | --- |
| 1 | Speaker | Core's message header, from `speaker: ChatMessage.getSpeaker({ actor })` | The actor who rolled or is affected; the GM's name on a request card (`postCheckRequest` (`module/services/check-request.js`)). The card never repeats it |
| 2 | Root | `<div class="chat-card l5r4-<card>">` | One root per card |
| 3 | Title | `div.dice-flavor` | What happened: the roll's label and its target, `dice-flavor` (`templates/chat/check.hbs`); the result, `dice-flavor` (`templates/chat/damage-result.hbs`); the flow and stage |
| 4 | Applied modifiers | `ul.check-applied`, one `li` per modifier with its label and pool change | `meta` size, `.check-applied` (`scss/components/_check-card.scss`) |
| 5 | Dice row | `{{{roll}}}`: core's `roll.render()`, in `renderCheckCard` (`module/services/dice/check/card.js`) | Core's formula, dice, and total; see **Dice row** |
| 6 | TN and outcome | `div.l5r4-tn-result`: outcome, TN, then Raises, Free Raises spent on the TN, and the Wound penalty in parentheses | Only when the roll had a TN: `{{#if tn}}` around `l5r4-tn-result` (`templates/chat/check.hbs`) |
| 7 | Free Raises left | `div.check-free-raises` | Only when some remain |
| 8 | Notes | `div.check-note`, one per note | Rule notes, maneuver notes, damage sources; italic |
| 9 | Actions | One `<button type="button">` per action, grouped in `div.damage-actions`, `div.check-conditions`, or `div.flow-actions` | See **Actions** |

The item summary card (`item-summary.hbs`) is the one card without a `chat-card` root: it posts the rule lines and citation beside an item card, under `div.l5r4-item-summary`.

## Dice row

The dice row is core's roll template (`resources/app/templates/dice/roll.hbs`) with its tooltip (`resources/app/templates/dice/tooltip.hbs`). The system adds no markup to it and restyles nothing in it but one mark on dropped dice (`components/dice-row.md` DR5). Line numbers below are in those core files.

| Part | Core shows | Source |
| --- | --- | --- |
| Formula | The pool as core's formula (`dice-formula`) | [src: templates/dice/roll.hbs:6] |
| Total | `h4.dice-total` | [src: templates/dice/roll.hbs:8] |
| Dice | One `li.roll.die.d10` per die in the tooltip, opened by core's `expandRoll` action | [src: templates/dice/tooltip.hbs:18-20], [src: templates/dice/roll.hbs:1] |
| Dropped dice | `discarded`: faded to `opacity(0.4)`; the system adds a line through the number, a mark that is not color (Stage 17 decision 16) | `public/css/foundry2.css:5726-5730`; `components/dice-row.md` DR5 |
| Exploded dice | `exploded`: an icon before the number. `L5R4Die` adds each explosion into its die, so the number is the die's total | `foundry2.css:5731-5734`, `L5R4Die#rollExplosions` (`module/services/dice/roll-keep-die.js`) |

## Actions

| Card | Button | `data-action` | Shown when | Who may use it |
| --- | --- | --- | --- | --- |
| Check card | Contested Strength roll | `combat-contest` | A hit with Knockdown or Disarm on a target | Each side's owner rolls that side (`rollContest` (`module/services/combat/contest.js`)) |
| Check card | Grapple | `grapple-start` | A hit that declared a grapple | The attacker's owner (`startGrapple` (`module/services/combat/grapple-start.js`)) |
| Check card | Apply to the target | `damage-apply-target` | A damage roll with a target | The roller or the GM, through the GM's client |
| Check card | Apply to selected | `damage-apply-selected` | Every damage roll | As above |
| Check card | Apply a condition to the target | `apply-condition` with `data-index` | A success whose rules offer a condition | The roller or the GM |
| Check card | Damage roll | `check-damage` | A hit that is not a grapple | The roller or the GM; Shift skips the dialog |
| Check card | Honor Roll | `honor-roll` | A failed roll the Honor Roll setting covers | The actor's owner, once per session |
| Damage result | Reduce with Void | `damage-void` | Wounds taken, no Void Point spent, not undone | The damaged actor's owner; removed for others |
| Damage result | Undo | `damage-undo` | Not undone | The roller or the GM |
| Effect prompt | Roll | `effect-prompt` | Always | The actor's owner |
| Flow card | Each step of a duel or grapple | `data-flow-action` with `data-duelist`, `data-side` | The flow's state offers it | Checked on the GM's client per step |
| Request card | Roll with my character | `check-request-roll` | Always | Any user with a character or a controlled token |

The check card's context menu adds "re-roll and keep the better" (the message's author) and "contest the previous roll" (`onGetChatMessageContextOptions` (`module/services/dice/check/chat-actions.js`)). Those entries are core's context menu, not card markup.

## Fixed names

Posted messages store their HTML, so these names never change and every check exempts them by name. The full list with the reason is in `docs/code-system/naming.md`, Fixed names.

| Kind | Names |
| --- | --- |
| Card classes | `chat-card`, `card-content`, `dice-flavor`, `check-note`, `check-applied`, `check-free-raises`, `check-conditions`, `damage-actions`, `flow-actions`, `healing-card`, `weapon`, `l5r4-roll`, `l5r4-check`, `l5r4-tn-result`, `l5r4-check-damage`, `l5r4-check-request`, `l5r4-check-request-text`, `l5r4-damage-result`, `l5r4-effect-prompt`, `l5r4-flow-card`, `l5r4-contest`, `l5r4-item-summary`, `l5r4-rule-lines`, `l5r4-citation`, `l5r4-damage-button`, `l5r4-damage-roll`, `apply-wounds-btn`, `reduce-wounds-btn` |
| Card modifiers | `-undone`, `-gap-sm`; on posted item cards `item`, `title`, `-bio`, `-expandable`, `-<subtype>` |
| Card actions | `apply-wounds`, `reduce-wounds-void`, `check-damage`, `apply-condition`, `honor-roll`, `combat-contest`, `grapple-start`, `damage-apply-target`, `damage-apply-selected`, `damage-void`, `damage-undo`, `effect-prompt`, `check-request-roll` |
| Flow actions and attributes | `data-flow-action` values `control`, `hit`, `throw`, `break`, `pass`, `roll`, `concede`; `data-side`, `data-duelist`, `data-index`, `data-item-id`, `data-document-id`, `data-document-type` |
| Cards posted before 4.0.0 | `data-attack-raises`, `data-damage-roll`, `data-damage-keep`, `data-weapon-name`, `data-weapon-id`, `data-actor-id`, `data-damage` on `l5r4-damage-button`, `apply-wounds`, and `reduce-wounds-void` (`validateLegacyDamageClick` (`module/services/chat.js`), `bindLegacyDamageCard` (`module/services/combat/legacy-damage.js`)) |

`dice-flavor`, `flexrow`, and the icon classes inside a posted card are core's or stored; a card the system writes uses `fa-solid` (`foundations/iconography.md` rule 1), and an older card's `fas` renders as before.

## Rules

### 1. A posted card keeps its classes and actions

A card template never renames or removes a fixed class or `data-action`. A new class may be added to a card template; it reaches only messages posted after it, so it never replaces a fixed one, and the card's styles keep selecting the fixed name. A new card takes `chat-card` and its own `l5r4-<card>` root, and kebab-case, verb-first action names (`docs/code-system/naming.md`). Enforced by `tests/conventions/actions.test.js` and `tests/conventions/templates.test.js`, both exempting the names above.

Conforming, `templates/chat/damage-result.hbs`: `chat-card l5r4-damage-result` with the fixed `-undone` state.

Non-conforming, modeled: renaming `damage-void` to `reduce-with-void` in `templates/chat/damage-result.hbs`. Every card posted before the change loses its button binding, because `bindDamageCards` (`module/services/combat/damage.js`) looks it up by name.

### 2. Behavior reads the message, never the card

A button finds its data in `message.system` or the message's flags (the check card's context, the damage result's `flags.l5r4-enhanced.damageResult`, the prompt's `flags.l5r4-enhanced.prompt`), never in attributes parsed from the card's HTML, which a user can edit. Cards posted before 4.0.0 carry their dice in attributes; that path validates every value (`validateLegacyDamageClick` (`module/services/chat.js`)). Enforced by review (`docs/code-system/foundry-patterns.md`, Chat cards, step 4).

Conforming, `applyConditionFromMessage` (`module/services/dice/check/chat-actions.js`): the condition comes from `message.system.conditions[index]`; the button carries only the index.

Non-conforming (modeled): a new card whose button takes the Wounds to apply from its `data-damage`. Only cards posted before 4.0.0 carry their damage in attributes; `bindLegacyDamageCard` (`module/services/combat/legacy-damage.js`) reads it as untrusted input, a whole number from 0 to 99.

### 3. One card, one template, no markup in JavaScript

Every card renders from a template in `templates/chat/` listed in `CHAT_TEMPLATES`. No card is built from an HTML string. Enforced by ESLint `no-restricted-syntax` (no HTML strings) and review.

Conforming, `postCheckRequest` (`module/services/check-request.js`): it renders `CHAT_TEMPLATES.checkRequest`.

Conforming, `templates/chat/contest.hbs`: the contest card, rendered with the classes posted cards already store. Non-conforming (modeled): a card built as a template literal or a `<p>` string in JavaScript.

### 4. Who may act decides what the viewer sees

A button stays on the card for everyone who could use it. Where the card knows a viewer cannot (the damaged actor's owner alone spends that actor's Void Point), the binder removes the button for that viewer when the card renders, so it is never a dead control. Where only the click can tell (permission resolved on the GM's client, a once-per-session limit), the button stays, and a refused click shows a warning notification (`patterns/feedback.md`). No card part is hidden by color, opacity, or a GM-only class. Enforced by review and each card's Quench batch.

Conforming, `bindDamageCards` (`module/services/combat/damage.js`): `damage-void` is removed when the viewer does not own the damaged actor.

Non-conforming, modeled: a Reduce with Void button greyed out for non-owners, which still takes a click and does nothing.

### 5. Visibility comes from core's message modes

A roll card takes the roller's chat mode: `roll.toMessage` applies `core.messageMode` when no mode is passed (`resources/app/client/dice/roll.mjs:933`, `:949`), so public, GM-only, blind, and self rolls work as core's do. Cards posted with `ChatMessage.create` (damage results, prompts, flow cards, request cards) pass no mode and are public (`client/documents/chat-message.mjs:552-555`). A whispered card is the same template; core marks it as whispered in its header. The system adds no whisper styling and no card that is GM-only by markup. Enforced by review.

Conforming, `postCheck` (`module/services/dice/check/roll-check.js`): `toMessage` with no `messageMode`, so the user's mode applies.

Non-conforming, modeled: a card that hides its total with a CSS class for players, while the total stays in the message's HTML for anyone to read.

### 6. Card styles live in one file per card

Each card component has one file in `scss/components/`, named for its page: `scss/components/_chat-card.scss` (the shared shell: the posted item card and the note lines' italic), `scss/components/_request-card.scss`, `scss/components/_item-summary-card.scss`, `scss/components/_check-card.scss` (the check card's `.l5r4-roll` column and its dice row), `scss/components/_damage-result.scss`, and `scss/components/_flow-card.scss`. The selectors start at the card's fixed root class (`l5r4-roll`, `l5r4-check`, `l5r4-check-request`, `l5r4-item-summary`, ...); none reaches into core's dice row except the dropped-dice mark in the check card's file (`components/dice-row.md` DR5). The check dialog's rules live in `scss/components/_check-dialog.scss`. Enforced by `tests/conventions/names.test.js` (the entry is the only top-level file) and `tests/conventions/styles.test.js` (one component per file).

Conforming, `.l5r4-damage-result` (`scss/components/_damage-result.scss`):

```scss
.l5r4-damage-result {
  display: flex;
  flex-direction: column;
  gap: var(--l5r4-space-gap-tight);

  &.-undone {
    opacity: var(--l5r4-state-disabled-opacity);
  }
}
```

Non-conforming (modeled): the undone card at a literal `opacity: 0.7`, or a card's rules in another card's file.

### 7. One key per line of card text

Every line on a card is one i18n key with placeholders, never fragments joined in the template. A button label starts with a verb and names its object (`content/voice.md`, Buttons). Copy is not a fixed name: a reworded key changes new cards only (`content/voice.md`, Fixed names). Enforced by `tests/conventions/templates.test.js` (`joined-localize`: two keys joined in one line), review for a key joined to a value (`docs/code-system/templates-and-styles.md`, one key per label), and `tests/lang.test.js` for the letter case.

Conforming, `data-action="apply-condition"` (`templates/chat/check.hbs`):

```hbs
{{localize "l5r4.ui.effects.applyTo" effect=label target=../target.name}}
```

Conforming, `data-action="damage-apply-target"` (`templates/chat/check.hbs`): `{{localize "l5r4.ui.combat.applyTo" target=applyTarget}}`, "Apply to {target}".

Non-conforming (modeled): `{{localize "l5r4.ui.combat.applyTo"}} {{applyTarget}}`, joining "Apply to" and a name.

## States

| State | Look | Carried by |
| --- | --- | --- |
| Success | The outcome word in the TN line | Text: "Success" (`l5r4.ui.mechanics.rolls.success`) |
| Failure | The outcome word: "Failure", or "Missed" on an attack | Text: `outcomeText` in `renderCheckCard` (`module/services/dice/check/card.js`) |
| No TN | No TN line; the total stands alone | `tn` null, in `renderCheckCard` (`module/services/dice/check/card.js`) |
| Undone | The whole card at the disabled opacity, its buttons gone, an "Undone." note | The fixed `-undone` class and the note (`templates/chat/damage-result.hbs`) |
| Updated | The card's content replaced in place: a damage result after Void or Undo, a flow card after each step | `update` with the new `content`: `postResult` (`module/services/combat/damage.js`), `applyFlowStep` (`module/services/combat/flow.js`) |
| Busy | A button whose action waits on the GM disables until it returns (`foundations/states.md`, Loading) | `disabled`, `aria-busy` |

A state never rests on color: the outcome is a word, the undone card says so.

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Controls | Every action is a `<button type="button">` with a visible label |
| Order | Title, modifiers, dice, outcome, notes, then the buttons, so a reader hears the result before the choices |
| Dice detail | Core's `expandRoll` opens the dice tooltip; the system adds no other disclosure |
| Icons | `inert` (`templates/chat/check-request.hbs`); the label carries the meaning |
| New cards | Core announces nothing for a new message; the card's first line, the title, says what happened in words |

## Long text

| Element | Behavior |
| --- | --- |
| Title | Wraps; a long label or target name takes a second line |
| Buttons | Full width, one per row, so a long label wraps and the button keeps its height (`.flow-actions` in `.l5r4-flow-card` (`scss/components/_flow-card.scss`); `foundations/space-and-size.md`, Density) |
| Notes | Wrap |
| Modifier list | One line per modifier; a long source name wraps inside its line |
| Dice | Core's: a pool past one line of dice wraps in the tooltip |

## Do and don't

| Do | Don't |
| --- | --- |
| Add a class beside a fixed one when a card needs a new style | Rename `damage-void`, `-undone`, or any name in **Fixed names** |
| Store what a button needs in `message.system` or the message's flags | Read a number off the card's HTML |
| Render each card from a template in `CHAT_TEMPLATES` | Post a card built from a template literal |
| Remove a button for a viewer who can never use it | Grey out a button that still takes a click |
| Let core's message modes decide who sees a card | Hide part of a card with CSS |
| Write each line as one key with placeholders | Join "Apply to" and a name in the template |
