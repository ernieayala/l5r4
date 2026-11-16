# Ledger dialog

The dialog that records a gain or loss of Honor, Glory, Status, or Shadowlands Taint with its reason, and lists the
latest changes. The character's Ledger rules size what is recorded; the dialog shows the asked amount beside the
recorded one when they differ. It is a `DialogV2.prompt` whose content is a template.

| Item      | Detail                                                                                                                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template  | `templates/dialogs/ledger-dialog.hbs`, `DIALOG_TEMPLATES.ledger`                                                                                                                                                                                                     |
| Opened by | `openLedgerDialog(actor)` (`module/services/ledger.js:103-138`), from the PC sheet's ledger control (`module/sheets/pc-sheet.js:244`): width 440, title `l5r4.ui.ledger.titleFor` with the actor's name, one button `l5r4.ui.ledger.record`; closing records nothing |
| Records   | `recordTrackChange(actor, track, points, reason)` (`ledger.js:67-95`) into `flags.l5r4-enhanced.ledger` (a fixed flag)                                                                                                                                               |
| SCSS      | Now `scss/components/_ledger-dialog.scss:6-21`, inside another component's file. `scss/components/_ledger-dialog.scss`, styling `.l5r4-ledger-dialog`                                                                                                                |
| Quench    | `l5r4-enhanced.authoring`                                                                                                                                                                                                                                            |

## Anatomy

| Part        | Markup                                                                 | Class now                                                | Target class                                               |
| ----------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Root        | `<div>` with core's `standard-form`                                    | `l5r4-ledger`                                            | `l5r4-ledger-dialog`                                       |
| Track       | `form-group` with a `<select name="track">`                            | core's                                                   | Same                                                       |
| Points      | `form-group` with `<input type="number" name="points">`, starting at 1 | core's                                                   | Same                                                       |
| Reason      | `form-group` with `<input type="text" name="reason">`                  | core's                                                   | Same                                                       |
| Hint        | `p.hint`                                                               | core's                                                   | Same                                                       |
| Entries     | `<ol>`, newest first, at most 20 (`ledger.js:18`)                      | `ledger-entries`                                         | `l5r4-ledger-dialog-entries`                               |
| Entry       | `<li>`: track, points, asked points when changed, reason               | none                                                     | `l5r4-ledger-dialog-entry`                                 |
| Entry parts | `<span>` each                                                          | `ledger-track`, `ledger-points`, `hint`, `ledger-reason` | `l5r4-ledger-dialog-track`, `-points`, `-asked`, `-reason` |

## Variants

| Variant | Tracks offered                                  |
| ------- | ----------------------------------------------- |
| PC      | Honor, Glory, Status, Taint (`ledger.js:44-46`) |
| NPC     | Taint                                           |

## States

| State                                  | Look                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No entries                             | Target: one italic line saying the ledger is empty (states.md rule 9). Now nothing renders (`ledger-dialog.hbs:15`) |
| Entries                                | The list, scrolling past 12rem                                                                                      |
| Changed by rules                       | The asked points in parentheses after the recorded points                                                           |
| Zero points or a track the actor lacks | Nothing is recorded (`ledger.js:134-136`); the dialog closes                                                        |

## Parameters

Context from `openLedgerDialog` (`ledger.js:105-115`):

| Name      | Type                                          | Meaning                                          |
| --------- | --------------------------------------------- | ------------------------------------------------ |
| `tracks`  | `Record<track, label>`                        | For `selectOptions`                              |
| `entries` | `{ track, points, asked, changed, reason }[]` | `track` localized; `changed` when asked ≠ points |

## Tokens

| Token                   | Property               | Part                              |
| ----------------------- | ---------------------- | --------------------------------- |
| `--l5r4-font-size-meta` | `font-size`            | Entries (`_rules-editor.scss:61`) |
| `--l5r4-space-8`        | `margin-block-start`   | Entries (`:62`)                   |
| `--l5r4-space-indent`   | `padding-inline-start` | Entries (`:65`, `1.25rem` now)    |
| `--l5r4-space-gap`      | `gap`                  | Entry parts (`:69`)               |

`max-height: 12rem` stays a literal: one component (space-and-size.md rule S4). Points use tabular figures
(typography.md rule T5), so a column of signed numbers lines up.

## Keyboard and screen reader

Tab walks track, points, reason, then Record. Each `<label>` is a sibling of its control with no `for`, so the controls
have no accessible name today; the target is the check dialog's: `for` and an `id` built from a `formId` parameter.
The entries are an ordered list, newest first. Points read with their sign (`numberFormat … sign=true`).

## Long text

A reason wraps inside its entry; the track and points stay at the start of the row. The list scrolls inside 12rem.

## Rules

| #   | Rule                                                                                | Enforced by                                                                             | Conforming                                                                             | Non-conforming                                                            |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| LD1 | The form is user input: the track must be the actor's, and 0 points records nothing | Quench `l5r4-enhanced.authoring`                                                        | `ledgerTracks(actor).includes(choice.track)` (`ledger.js:134`)                         | Recording whatever `track` the form sent (modeled)                        |
| LD2 | When the rules change an amount, the dialog shows both                              | Review                                                                                  | `{{#if changed}}… ({{numberFormat asked sign=true}}){{/if}}` (`ledger-dialog.hbs:21`)  | Showing only the recorded points (modeled)                                |
| LD3 | The title is one key with `{name}`                                                  | `l5r4/joined-title` ([localization.md](../content/localization.md#one-key-per-meaning)) | `F("l5r4.ui.ledger.titleFor", { name: actor.name })` (`ledger.js`, `openLedgerDialog`) | `` `${T("l5r4.ui.ledger.title")}: ${actor.name}` `` (modeled)             |
| LD4 | An empty ledger says so                                                             | Review (states.md rule 9)                                                               | `{{else}}<p class="l5r4-ledger-dialog-empty">…</p>` (modeled)                          | `{{#if entries.length}}` with no `{{else}}` (`ledger-dialog.hbs:15`)      |
| LD5 | The dialog's styles live in their own file, under its own block                     | `tests/conventions/styles.test.js` (one component per file)                             | `.l5r4-ledger-dialog` in `scss/components/_ledger-dialog.scss`                         | `.l5r4-ledger .ledger-entries` in `scss/components/_ledger-dialog.scss:6` |

## Do and don't

| Do                                                  | Don't                                               |
| --------------------------------------------------- | --------------------------------------------------- |
| Ask for a reason with every change                  | Change Honor from the dialog without a ledger entry |
| Keep Shift+click on the sheet as the raw correction | Route the raw correction through this dialog        |
