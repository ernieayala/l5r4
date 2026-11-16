# Feedback

How the system tells the user what happened or why something did not: notifications, inline warnings, empty states, disabled controls with their reason, and the floating Wound and Void Point numbers. Each kind has one job; a message that fits one kind never appears as another.

| Item | Detail |
| --- | --- |
| APIs | Core's `ui.notifications.info`, `warn`, `error`; `canvas.interface.createScrollingText` for floating numbers |
| Code | Notifications across `module/`; floating numbers in `module/services/scrolling-text.js` and `module/utils/floating-text.js` |
| Copy | `content/voice.md`: Notifications, Hints and sentences, Tooltips; keys per `content/localization.md` |
| Tokens | `--l5r4-color-warning`, `--l5r4-color-danger`, `--l5r4-color-text`, `--l5r4-state-disabled-opacity`, `--l5r4-font-size-meta`; the floating number colors `--l5r4-color-float-wounds-up`, `-down`, `--l5r4-color-float-void-up`, `-down`, `--l5r4-color-float-stroke` (`foundations/color.md`) |
| Components | Floating number; the empty, warning, invalid, and disabled states of every component (`foundations/states.md`) |
| Checks | `tests/lang.test.js`, ESLint `no-restricted-syntax`, `tests/conventions/templates.test.js`, `tests/conventions/contrast.test.js`; "review" where no tool can judge |

## Kinds

| Kind | Use it when | Lives | Lasts |
| --- | --- | --- | --- |
| Info notification | An action finished somewhere the user cannot see it: Wounds applied to a token, slots restored | Core's notification area | Core's timeout |
| Warning | The system refused what the user asked, and the user can fix it: select a token, no GM connected | Core's notification area | Core's timeout |
| Error | Something failed that the user cannot fix: an update threw, a window would not open | Core's notification area | Core's timeout |
| Inline warning | A choice in front of the user carries a cost or a limit: a Void Point already spent this Round | The dialog or sheet, beside the choice | While the choice is shown |
| Empty state | A list has no entries | In the list's place | While the list is empty |
| Disabled reason | A control cannot be used now, and may be later | The control's `data-tooltip` | While disabled |
| Floating number | An actor's Wounds or Void Points changed | Over each of its visible tokens, on canvas | Core's scrolling text, 2000 ms |

A result the table should see (a roll, damage taken, a duel step) is a chat card (`patterns/chat-cards.md`), not a notification.

## Notifications

### Levels

| Level | Words | Example key |
| --- | --- | --- |
| `info` | What happened, naming the character: "Applied {amount} Wounds to {name}" | `l5r4.ui.mechanics.wounds.applied` |
| `warn` | What is missing or not allowed, then what to do | `l5r4.ui.mechanics.wounds.noTokenSelected` |
| `error` | "Failed to <verb> <object>" (`content/voice.md`, Notifications) | `l5r4.apps.armorConfig.errors.updateFailed` |

### Rules

#### 1. A notification is a key

Every notification is an i18n key passed through `T(key)` or `F(key, data)`, never a literal or a template string. Enforced by ESLint `no-restricted-syntax` (no string or template literal passed to `ui.notifications.*`) and `tests/lang.test.js` (every key passed to `ui.notifications.*` exists).

Conforming, `applyDamage` (`module/services/combat/damage.js`):

```js
ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noTokenSelected"));
```

Non-conforming, modeled: `ui.notifications.warn("Token has no actor")`, a literal no translation reaches.

#### 2. One sentence, no trailing period, the character by name

A notification is one sentence with no trailing period (Stage 17 decision 15). A refusal says what is missing, then what to do, joined with a colon. It names the character with `{name}`. Enforced by `tests/lang.test.js` (a value passed to `ui.notifications.*` does not end with a period) and review for the shape.

Conforming: "No Void Points available to reduce damage" (`l5r4.ui.mechanics.wounds.noVoidPoints`); "No token selected: select a token to apply Wounds" (`l5r4.ui.mechanics.wounds.noTokenSelected`).

Non-conforming, modeled: "No token selected. Select a token to apply wounds.": two sentences, a trailing period, and the game term in lowercase.

#### 3. The level matches who can fix it

`warn` for a refusal the user can fix (select a token, assign a character, wait for the GM); `error` for a failure they cannot; `info` for a finished action. A permission refusal is a warning. An error also logs its cause to the console with the system's prefix, so the GM can report it. Enforced by review.

Conforming, `requestStep` (`module/services/combat/flow.js`): no active GM is a warning, `l5r4.ui.effects.noGM`, and the step is not sent.

Non-conforming, `ItemEffectsHandler.#deleteItemEffect` (`module/sheets/handlers/item-effects-handler.js`): the error notification shows `err.message`, core's English text, in place of the system's key, and falls back to the key only when the error has no message.

#### 4. A notification never carries the result

A roll's outcome, the Wounds a damage roll dealt, and every step a player chose go on a chat card, which everyone at the table sees and which stays. A notification is for the one user who acted. Enforced by review.

Conforming, `postResult` (`module/services/combat/damage.js`): the damage result is a card.

Non-conforming, `applyWoundsToToken` (`module/services/combat/legacy-damage.js`): Wounds applied from a card posted before 4.0.0 show only as an `info` notification to the user who clicked. Those cards are fixed, so this path stays; no new path does this.

## Inline warnings

A warning about a choice sits beside the choice, in the warning look: a line led by `fa-triangle-exclamation` (`inert`) in `--l5r4-color-warning`, then the label in bold in `--l5r4-color-text`, with `role="note"` (`foundations/states.md`, Warning). It warns; it never blocks. A rule the system enforces disables the control instead (see **Disabled with a reason**). Enforced by review and `tests/conventions/contrast.test.js` (the warning pairing in `foundations/color.md`).

Conforming, modeled on the Round-limit line, `{{#if voidOverLimit}}` (`templates/dialogs/check-dialog.hbs`):

```hbs
{{#if voidOverLimit}}
  <p class="l5r4-check-dialog-warning" role="note">
    <i class="fa-solid fa-triangle-exclamation" inert></i>
    {{localize "l5r4.ui.effects.voidSpentThisRound"}}
  </p>
{{/if}}
```

Non-conforming, `{{#if voidOverLimit}}` (`templates/dialogs/check-dialog.hbs`): the same text in `p.hint`, which reads as help; `l5r4-check-dialog-warning` (`templates/dialogs/check-extras/maho.hbs`): a class no stylesheet defines, with no icon and no `role="note"`, on three keys joined by `<br />`.

## Empty states

One italic line in the list's place says what is missing and, where there is one, what to do (`foundations/states.md` rule 9). The line is a sentence and ends with a period (`content/voice.md`, Hints and sentences). On a sheet, a list section with no entries is left out instead (`patterns/sheets.md` rule 4).

| Place | Key | Value |
| --- | --- | --- |
| Effect panel | `l5r4.apps.effectPanel.none` | "No effects on {name}." |
| Effect panel | `l5r4.apps.effectPanel.noActor` | "Select a token, or assign a character, to see its effects." |
| Compendium browser | `l5r4.apps.compendiumBrowser.none` | "Nothing matches." |
| Rules editor | `l5r4.ui.rules.none` | "No rules." |
| Emphasis manager | `l5r4.apps.emphasisManager.noEmphases` | "No Emphases in this list." |
| XP manager | None | Nothing renders: `{{#if manualEntries}}` and `{{#if spentEntries}}` (`templates/apps/xp-manager.hbs`) have no `{{else}}` |

Enforced by review; `tests/lang.test.js` checks the period on keys used as sentences.

Conforming, `l5r4-effect-panel-empty` (`templates/apps/effect-panel.hbs`).

Non-conforming, the `{{else}}` of `{{#if emphasisList.length}}` (`templates/apps/emphasis-manager.hbs`): a bare `<p>` with no empty look.

## Disabled with a reason

A control that cannot be used now stays in place, takes the disabled look, and its `data-tooltip` says why in words: "No Void Points left", "Not your turn". The reason is its own key under the feature's group, a label with no period (`content/voice.md`, Tooltips). A control the user can never use is left out (`patterns/chat-cards.md` rule 4, `patterns/panels-and-browsers.md`, States). Enforced by review; the gallery shows each disabled state with its tooltip.

Conforming, modeled: `foundations/states.md` rule 5, the Void Point box with its reason in a `l5r4.ui.check.noVoidPoints` key.

Non-conforming, `name="void"` and `name="voidSkill"` (`templates/dialogs/check-dialog.hbs`): the Void Point boxes disable at zero with no reason.

## Floating numbers

When an actor's Wounds or Void Points change, the change floats over each of its tokens on every client with the `floatingNumbers` setting on: `onUpdateActorScrollingText` (`module/services/scrolling-text.js`).

| Part | Detail |
| --- | --- |
| Text | The sign, the amount, and the resource's name: "+7 Wounds", "−1 Void Points", from `formatFloatingText` (`module/utils/floating-text.js`); names from `l5r4.ui.floating.*` |
| Color | By resource and direction, `COLORS` (`module/services/scrolling-text.js`); the text alone carries the meaning, so the color is never needed to read it |
| Stroke | 4 px black (`--l5r4-color-float-stroke`); every fill meets 3:1 against it (`foundations/color.md`, Contrast) |
| Size | 28 px, the `fontSize` of `startScrollingText` (`module/services/scrolling-text.js`) |
| Position | The token's center; a second change in one update sits 0.3 token heights higher, `startScrollingText` (`module/services/scrolling-text.js`) |
| Motion | Core's scrolling text: rises two token heights with jitter, `startScrollingText` (`module/services/scrolling-text.js`); under reduced motion it stays in place (`foundations/motion.md` rule 5) |
| Visibility | Only over tokens the viewer can see; never over a secret token, the token check in `onUpdateActorScrollingText` (`module/services/scrolling-text.js`) |
| Settings | Off with the system's `floatingNumbers` client setting or core's `scrollingStatusText` (`foundations/motion.md` rule 5) |

Rules:

| # | Rule | Enforced by |
| --- | --- | --- |
| F1 | The text names the resource and carries its sign; color only repeats it | Vitest `tests/unit/utils/floating-text.test.js`; review |
| F2 | The colors are the four floating tokens' values, kept equal to `COLORS` in `scrolling-text.js`, since canvas text cannot read CSS | `tests/conventions/contrast.test.js` (the pairings); review that `COLORS` matches |
| F3 | A floating number repeats a change the sheet and chat already show; it never carries a result on its own | Review |
| F4 | No floating number for a token the viewer cannot see | Review; the `Floating numbers` (`tests/quench/table-tools.js`) cases cover the text |

Conforming, `formatFloatingText` (`module/utils/floating-text.js`): `formatFloatingText(7, "Wounds")` gives "+7 Wounds".

Non-conforming, modeled: a red "7" with no sign and no name, which reads the same as a heal to a viewer who cannot tell the colors apart.

## Keyboard and screen reader

| Kind | Contract |
| --- | --- |
| Notifications | Core's notification area; the system adds no second channel |
| Inline warning | `role="note"`, read in document order beside its control |
| Invalid field | `aria-invalid="true"` and `aria-describedby` to its message (`foundations/states.md` rule 7) |
| Empty state | Plain text in the list's place, read as the list's content |
| Disabled reason | The `data-tooltip` of the disabled control; a disabled native control stays in the accessibility tree with its name |
| Floating numbers | Canvas only, not announced. The same change shows on the sheet (the Wound track, the Void Point dots) and, for damage, on a chat card |

## Long text

| Kind | Behavior |
| --- | --- |
| Notification | Core wraps it; one sentence keeps it short |
| Inline warning | Wraps beside the icon; the icon stays at the first line |
| Empty state | Wraps in the list's width |
| Disabled reason | A tooltip: one short phrase, no sentence of explanation (`content/voice.md`, Tooltips) |
| Floating number | One line; a long translated name runs wider over the token |

## Do and don't

| Do | Don't |
| --- | --- |
| Pass a key to `ui.notifications.*` | Pass "Token has no actor" or a template string |
| Warn for what the user can fix, error for what they cannot | Show a permission refusal as an error |
| Post results the table needs as a chat card | Report a roll's outcome in a notification |
| Put a warning beside the choice it concerns, with its icon | Put a warning in hint text |
| Say why a control is disabled in its `data-tooltip` | Disable a control with no reason |
| Name the resource and the sign in a floating number | Rely on red and green alone |
