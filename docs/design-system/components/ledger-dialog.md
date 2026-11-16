# Ledger dialog

The dialog that records a gain or loss of Honor, Glory, Status, or Shadowlands Taint with its reason, and lists the latest changes. The character's Ledger rules size what is recorded; the dialog shows the asked amount beside the recorded one when they differ. It is a `DialogV2.prompt` whose content is a template.

| Item | Detail |
| --- | --- |
| Template | `templates/dialogs/ledger-dialog.hbs`, `DIALOG_TEMPLATES.ledger` |
| Opened by | `openLedgerDialog` (`module/services/ledger.js`), from the PC sheet's ledger control (`open-ledger` in `L5R4PcSheet.CLICK_ACTIONS` (`module/sheets/pc-sheet.js`)): width 440, title `l5r4.ui.ledger.titleFor` with the actor's name, one button `l5r4.ui.ledger.record`; closing records nothing |
| Records | `applyTrackChange` (`module/services/ledger.js`) into `flags.l5r4-enhanced.ledger` (a fixed flag) |
| SCSS | `.l5r4-ledger-dialog` (`scss/components/_ledger-dialog.scss`) |
| Quench | `l5r4-enhanced.authoring` |

## Anatomy

| Part | Markup | Class | Where the code differs |
| --- | --- | --- | --- |
| Root | `<div>` with core's `standard-form` | `l5r4-ledger-dialog` |  |
| Track | `form-group` with a `<select name="track">` | core's |  |
| Points | `form-group` with `<input type="number" name="points">`, starting at 1 | core's |  |
| Reason | `form-group` with `<input type="text" name="reason">` | core's |  |
| Hint | `p.hint` | core's |  |
| Entries | `<ol>`, newest first, at most 20 (`SHOWN_ENTRIES` (`module/services/ledger.js`)) | `l5r4-ledger-dialog-entries` |  |
| Entry | `<li>`: track, points, asked points when changed, reason | `l5r4-ledger-dialog-entry` | A bare `<li>` |
| Entry parts | `<span>` each | `l5r4-ledger-dialog-track`, `-points`, `-asked`, `-reason` | The asked points carry core's `hint` in place of `-asked` |

## Variants

| Variant | Tracks offered                                                               |
| ------- | ---------------------------------------------------------------------------- |
| PC      | Honor, Glory, Status, Taint (`ledgerTracksOf` (`module/services/ledger.js`)) |
| NPC     | Taint                                                                        |

## States

| State | Look |
| --- | --- |
| No entries | Target: one italic line saying the ledger is empty (states.md rule 9). The code renders nothing (`{{#if entries.length}}` (`templates/dialogs/ledger-dialog.hbs`)) |
| Entries | The list, scrolling past 12rem |
| Changed by rules | The asked points in parentheses after the recorded points |
| Zero points or a track the actor lacks | Nothing is recorded (the guard after the prompt in `openLedgerDialog` (`module/services/ledger.js`)); the dialog closes |

## Parameters

Context from `renderLedgerContent` (`module/services/ledger.js`):

| Name | Type | Meaning |
| --- | --- | --- |
| `tracks` | `Record<track, label>` | For `selectOptions` |
| `entries` | `{ track, points, asked, changed, reason }[]` | `track` localized; `changed` when asked ≠ points |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-font-size-meta` | `font-size` | Entries |
| `--l5r4-space-8` | `margin-block-start` | Entries |
| `--l5r4-space-4`, `--l5r4-space-16` | `margin-inline-start`, `padding-inline-start` | Entries: the 20 px indent (space-and-size.md, **Off-scale values**) |
| `--l5r4-space-8` | `gap` | Entry parts |

All four sit in `.l5r4-ledger-dialog .l5r4-ledger-dialog-entries` (`scss/components/_ledger-dialog.scss`).

`max-height: 12rem` stays a literal: one component (space-and-size.md rule S4). Points use tabular figures (typography.md rule T5), so a column of signed numbers lines up.

## Keyboard and screen reader

Tab walks track, points, reason, then Record. Each `<label>` is a sibling of its control with no `for`, so the controls have no accessible name; the target is the check dialog's: `for` and an `id` built from a `formId` parameter. The entries are an ordered list, newest first. Points read with their sign (`numberFormat … sign=true`).

## Long text

A reason wraps inside its entry; the track and points stay at the start of the row. The list scrolls inside 12rem.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| LD1 | The form is user input: the track must be the actor's, and 0 points records nothing | Quench `l5r4-enhanced.authoring` | `ledgerTracksOf(actor).includes(choice.track)` in `openLedgerDialog` (`module/services/ledger.js`) | Recording whatever `track` the form sent (modeled) |
| LD2 | When the rules change an amount, the dialog shows both | Review | `({{numberFormat asked sign=true}})` inside `{{#if changed}}` (`templates/dialogs/ledger-dialog.hbs`) | Showing only the recorded points (modeled) |
| LD3 | The title is one key with `{name}` | `l5r4/joined-title` ([localization.md](../content/localization.md#one-key-per-meaning)) | `F("l5r4.ui.ledger.titleFor", { name: actor.name })` in `openLedgerDialog` (`module/services/ledger.js`) | `` `${T("l5r4.ui.ledger.title")}: ${actor.name}` `` (modeled) |
| LD4 | An empty ledger says so | Review (states.md rule 9) | `{{else}}<p class="l5r4-ledger-dialog-empty">…</p>` (modeled) | `{{#if entries.length}}` (`templates/dialogs/ledger-dialog.hbs`) with no `{{else}}` |
| LD5 | The dialog's styles live in their own file, under its own block | `tests/conventions/styles.test.js` (one component per file) | `.l5r4-ledger-dialog` in `scss/components/_ledger-dialog.scss` | `.l5r4-ledger .ledger-entries` in another component's file (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Ask for a reason with every change | Change Honor from the dialog without a ledger entry |
| Keep Shift+click on the sheet as the raw correction | Route the raw correction through this dialog |
