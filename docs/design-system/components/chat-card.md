# Chat card

The frame every chat message the system posts shares: a root, a title line, note lines, and action buttons. The cards built on it have their own pages: [check card](check-card.md), [request card](request-card.md), [damage result](damage-result.md), [effect prompt](effect-prompt.md), [flow card](flow-card.md), and [item summary card](item-summary-card.md). This page holds what they share; `patterns/chat-cards.md` composes them.

| Item | Detail |
| --- | --- |
| Templates | `templates/chat/*.hbs`. Seven of the eight root on `chat-card`; `item-summary.hbs` is appended to an item card instead |
| Registered in | `CHAT_TEMPLATES` (`module/config/templates.js`); preloaded in `PRELOAD_TEMPLATES` (`module/config/templates.js`), under its chat message templates |
| Rendered by | `foundry.applications.handlebars.renderTemplate`, then posted with `ChatMessage.create` or `Roll#toMessage` |
| Wired by | One `renderChatMessageHTML` listener per card, `bind<Card>Card(message, html)` ([naming.md](../../code-system/naming.md#function-kinds)), registered by `registerChatCardHooks` and `registerCombatHooks` (`module/hooks/register-all.js`) |
| SCSS | `scss/components/_chat-card.scss` holds the shared shell; each card on its own page has its own file (`patterns/chat-cards.md` rule 6). The entry is the only top-level file ([templates-and-styles.md](../../code-system/templates-and-styles.md#folders)) |
| Quench | `l5r4-enhanced.roll-pipeline`, `l5r4-enhanced.combat`, `l5r4-enhanced.effects`, `l5r4-enhanced.table-tools` |

## Fixed names

A posted message stores its HTML (Stage 17 decision 2). Every class and `data-*` name below sits in posted cards, so it keeps its spelling, keeps its styles, and is exempt from the `l5r4-` rule. A new part added to a card takes an `l5r4-` class; the names below never change.

| Kind | Names |
| --- | --- |
| Root classes | `chat-card`, `l5r4-roll`, `l5r4-check`, `l5r4-check-request`, `l5r4-damage-result`, `l5r4-effect-prompt`, `l5r4-flow-card`, `healing-card`, `weapon` |
| Part classes | `dice-flavor`, `card-content`, `check-applied`, `check-note`, `check-free-raises`, `check-conditions`, `damage-actions`, `flow-actions`, `l5r4-tn-result`, `l5r4-check-damage`, `l5r4-check-request-text`, `l5r4-damage-button`, `-undone`, `-gap-sm` |
| Core classes | `flexrow` inside the button rows; `fa-solid fa-dice-d10` on the request card |
| Actions | `combat-contest`, `grapple-start`, `damage-apply-target`, `damage-apply-selected`, `apply-condition`, `check-damage`, `honor-roll`, `check-request-roll`, `initiative-request-roll`, `damage-void`, `damage-undo`, `effect-prompt`; on cards posted before 4.0.0 `apply-wounds`, `reduce-wounds-void` |
| Data attributes | `data-flow-action`, `data-duelist`, `data-side`, `data-index`; on cards posted before 4.0.0 `data-damage`, `data-actor-id`, `data-attack-raises`, `data-damage-roll`, `data-damage-keep`, `data-weapon-name`, `data-weapon-id` |

The full list, with item cards, is in [naming.md](../../code-system/naming.md#fixed-names). `tests/conventions/templates.test.js` and `tests/conventions/actions.test.js` exempt these names by list.

## Anatomy

| Part | Markup | Class | Notes |
| --- | --- | --- | --- |
| Root | `<div>` | `chat-card` and the card's block (`l5r4-roll l5r4-check`, ...) | One root per card |
| Title line | `<div>` | `dice-flavor` | Names what happened; the first line of every card |
| Dice row | `{{{roll}}}` | Core's | Check card only; [dice row](dice-row.md) |
| Modifier list | `<ul>`, one `<li>` per modifier | `check-applied` | Check card only |
| Note line | `<div>`, one per note | `check-note` | Italic. One sentence each |
| Button row | `<div>` | `damage-actions`, `check-conditions`, or `flow-actions`, with `flexrow -gap-sm` | `flow-actions` stacks its buttons; the others share the row |
| Button | `<button type="button" data-action="…">` with a visible label | None, or `l5r4-check-damage` | Flow cards carry `data-flow-action` instead of `data-action` |

## Variants

| Variant | Template | Page |
| --- | --- | --- |
| Check card | `templates/chat/check.hbs` | [check-card.md](check-card.md) |
| Request card | `templates/chat/check-request.hbs`, `templates/chat/initiative-request.hbs` | [request-card.md](request-card.md) |
| Damage result | `templates/chat/damage-result.hbs` | [damage-result.md](damage-result.md) |
| Effect prompt | `templates/chat/effect-prompt.hbs` | [effect-prompt.md](effect-prompt.md) |
| Flow card | `templates/chat/flow.hbs` | [flow-card.md](flow-card.md) |
| Item card with its summary | `templates/cards/<subtype>.hbs` + `templates/chat/item-summary.hbs` | [item-summary-card.md](item-summary-card.md) |
| Healing card | `templates/chat/healing.hbs`, posted by `postRestMessage` (`module/services/rest.js`) | This page: the title line "{name} rested and recovered Wounds" (`l5r4.ui.mechanics.wounds.restTitle`), then a `card-content` block of sentences |
| Weapon card | `templates/chat/weapon.hbs` | This page. `CHAT_TEMPLATES.weaponCard` is defined and preloaded, and no code in `module/` or `dist/` renders it; cards posted before 4.0.0 keep its `weapon` class |
| Damage card posted before 4.0.0 | Stored HTML only | This page. Wired by `bindLegacyDamageCard` (`module/services/combat/legacy-damage.js`) and `bindLegacyAttackCard` (`module/services/chat.js`), which read the card's data attributes as untrusted input |

## States

| State | Look | Markup |
| --- | --- | --- |
| Default | Core's message frame; the card's parts stacked with `--l5r4-space-gap-tight` between them | As anatomy |
| Button hover, focus | Core's button looks | `<button>` |
| Button hidden for viewer | The button is absent on clients that may not use it | Removed at bind time (`bindDamageCards` (`module/services/combat/damage.js`)) or not rendered |
| Done (undone, finished) | The card re-renders in place without its buttons and with a note line that says so | `existing.update({ content, flags })` in `postResult` (`module/services/combat/damage.js`) |
| Disabled (undone damage) | `opacity: var(--l5r4-state-disabled-opacity)` on the whole card, beside the note line | `-undone` on the root (fixed) |
| Whispered or private | Core's whisper frame. The check card follows core's message mode setting [src: client/dice/roll.mjs:933] | Core's |

## Parameters

Each card's template context is on its own page. Every card takes `title` (or `label`) for its title line and a `notes` or `lines` array of finished sentences for its note lines. The context arrives localized and computed: a template builds no copy and no formula (templates-and-styles.md **Structure**).

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap-tight` | `gap` | Between a card's parts (`.l5r4-roll` (`scss/components/_check-card.scss`), `.l5r4-damage-result` (`scss/components/_damage-result.scss`)) |
| `--l5r4-font-size-meta` | `font-size` | Modifier list (`.check-applied` (`scss/components/_check-card.scss`)) |
| `--l5r4-state-disabled-opacity` | `opacity` | `-undone` (`.l5r4-damage-result` (`scss/components/_damage-result.scss`)) |
| `--l5r4-font-size-label`, `--l5r4-space-8` | `font-size`, `margin-block-start` | Item card headings ([item summary card](item-summary-card.md)) |

Text and surface colors are core's message colors; a card sets none of its own.

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Controls | Every action is a `<button type="button">` with a visible text label, so it takes focus in the chat log and runs on Enter and Space |
| Name | The button's label is its name. No card carries an icon-only control |
| Reading order | Title line, dice row, outcome, notes, buttons: the template order is the reading order |
| Outcome without color | The outcome is a word on the card ("Success", "Missed"), never only core's green or red total |
| Hidden buttons | A button a card hides from a viewer (Reduce with Void) is removed, not disabled, so focus never lands on a dead control |

## Long text

Actor, item, and target names reach titles, notes, and button labels. Core breaks long words in message content (`word-break: break-word`, `foundry2.css:10011`), so titles and notes wrap. Core fixes a chat button's height at `--input-height` (`foundry2.css:9969-9971`), so a label that wraps to two lines overflows its button. Target: a card's button takes `height: auto` and `min-height: var(--input-height)`, so a wrapped label grows the button (typography.md rule T7: text is never clipped). Enforced by review, in the gallery.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| CC1 | A card's root carries `chat-card` and one block class; its first child is the `dice-flavor` title line | `tests/conventions/templates.test.js` (root block class) | `<div class="chat-card l5r4-effect-prompt">` then `<div class="dice-flavor">` (`templates/chat/effect-prompt.hbs`) | A root followed by `<div class="card-content">` with no title line (modeled) |
| CC2 | Fixed names stay; a new part takes an `l5r4-` class | `tests/conventions/templates.test.js` (exempt list) | A new outcome line as `<div class="l5r4-check-outcome">` (modeled) | Renaming `check-note` to `l5r4-check-note` in `templates/chat/check.hbs`: posted cards lose the style (modeled) |
| CC3 | Each action is a `<button type="button">` with a visible label and a `data-action` (a flow card: `data-flow-action`) | `tests/conventions/templates.test.js` (interactive elements are native controls) | `<button type="button" data-action="damage-undo">` (`templates/chat/damage-result.hbs`) | `<a data-action="damage-undo">` with no `href` (modeled) |
| CC4 | A binding finds a card's controls by `[data-action]` or `[data-flow-action]`, never by class; a pre-4.0.0 card's class carries the fixed-name disable comment | ESLint `no-restricted-syntax` | `html.querySelector("[data-action='effect-prompt']")` in `bindPromptCard` (`module/services/effects/prompts.js`) | `html.querySelectorAll(".l5r4-damage-button")` with no disable comment (modeled) |
| CC5 | A binding reads the card's request from the message's `system` or flags, never from its HTML; a pre-4.0.0 card's attributes are validated as untrusted | Review | `message.getFlag(SYS_ID, "prompt")` in `onPromptClick` (`module/services/effects/prompts.js`) | Trusting a pre-4.0.0 card's `data-damage` without an upper bound (modeled); `bindLegacyDamageCard` (`module/services/combat/legacy-damage.js`) clamps it to 0-99 |
| CC6 | Every value a card shows is localized before render; a sentence is one key with placeholders | `tests/conventions/templates.test.js` (no text outside `{{localize}}`), review | `F("l5r4.ui.combat.resultTitle", { name, wounds, damage })` in `postResult` (`module/services/combat/damage.js`) | `{{localize "l5r4.ui.combat.grappleStart"}} {{target.name}}` joins a fragment to a name (modeled on `l5r4.ui.combat.grappleStart` "Start grapple with {target}", `templates/chat/check.hbs`) |
| CC7 | A state shows in words as well as look: an undone card adds its note line and drops its buttons | Review, in the gallery's chat section | `-undone` with the "Undone." line `l5r4.ui.combat.undoneNote` (`templates/chat/damage-result.hbs`) | Dimming a card with no note (modeled) |
| CC8 | Colors and spacing come from tokens; the card adds no shadow or frame to core's message | Stylelint, `tests/conventions/styles.test.js` | `gap: var(--l5r4-space-gap-tight);` | `gap: 0.25rem;` (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Keep every fixed class and action name, and keep its style | Rename a class a posted card carries |
| Re-render the same message when a card's state changes | Post a second card to say the first one is done |
| Remove a button the viewer may not use | Leave a button that warns "no permission" on every click when it can be hidden |
| Put the outcome in words | Leave the outcome to the color of core's total |
| Style the card's parts under its root block | Style `[data-action]` or a bare `button` inside `.message-content` |
