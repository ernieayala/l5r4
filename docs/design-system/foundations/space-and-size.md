# Space and size

One space scale in rem for the room between and inside things, semantic spacing tokens on top of it, and one size
scale for the fixed-size parts of a sheet. All are declared on `:root` in `scss/base/_variables.scss`: they hold
literals and do not change with the theme.

## Rules

| #   | Rule                                                                                                                                                                                | Enforced by                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| S1  | `gap`, `row-gap`, `column-gap`, and every `margin*` and `padding*` property take a `--l5r4-space-*` token, `0`, or `auto`. A negative offset is `calc(-1 * var(--l5r4-space-*))`    | `tests/conventions/styles.test.js`                                                                    |
| S2  | Spacing is in rem, through the tokens; sizes of fixed-size art and controls are in px, through the size tokens                                                                      | `tests/conventions/styles.test.js` (spacing); review (sizes)                                          |
| S3  | A component reads the semantic token for its job (`gap`, `card`, `section`, ...) when one fits, and a step token otherwise                                                          | Review                                                                                                |
| S4  | A size two or more components share, or one listed in **Size scale**, reads its `--l5r4-size-*` token. A size only one component uses is a literal in that component's file         | Review; `tests/conventions/styles.test.js` checks every size token is declared, read, and listed here |
| S5  | Every new pointer target is at least 24 by 24 px, or has 24 px of clear space around it. Existing controls keep their size (**Minimum target**). A link inside a sentence is exempt | Review, in the gallery's state sections                                                               |

| #   | Conforming                                                                                                                        | Non-conforming                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| S1  | `gap: 0.5rem;` (`scss/apps/_effect-panel.scss:23`), written as `gap: var(--l5r4-space-gap);`                                      | `gap: 0.15rem;` (`scss/apps/_compendium-browser.scss:58`)                                       |
| S2  | `padding: 0.5rem;` on the section title (`scss/components/_section.scss:20`)                                                      | `margin-block-start: 8px;` (`scss/features/_traits-rings.scss:308`)                             |
| S3  | Card padding as `var(--l5r4-space-card)` on the section title and the rule card alike                                             | `padding: var(--l5r4-space-8);` on a card, where `--l5r4-space-card` fits (modeled)             |
| S4  | `width: var(--l5r4-size-item-icon);` on the effect panel and browser icons, which share 32 px (`scss/apps/_effect-panel.scss:30`) | `width: 240px;` on the portrait, which **Size scale** lists as `--l5r4-size-portrait` (modeled) |
| S5  | The Ring medallion, 96 px (`scss/features/_traits-rings.scss:170-173`)                                                            | A new icon button set to `width: 16px` (modeled)                                                |

## Space scale

Five even steps (Stage 17 decision 15). Names follow core's spacer variables, which name each step by its pixels at a
16 px root (`--spacer-4` to `--spacer-16`, `foundry2.css:333-337`).

| Token             | Value   | At a 16 px root | Core's equal  |
| ----------------- | ------- | --------------- | ------------- |
| `--l5r4-space-4`  | 0.25rem | 4 px            | `--spacer-4`  |
| `--l5r4-space-8`  | 0.5rem  | 8 px            | `--spacer-8`  |
| `--l5r4-space-12` | 0.75rem | 12 px           | `--spacer-12` |
| `--l5r4-space-16` | 1rem    | 16 px           | `--spacer-16` |
| `--l5r4-space-24` | 1.5rem  | 24 px           | none          |

The tokens hold the rem literals, not core's variables, so the scale is fixed by this page.

### Off-scale values

A value maps to the nearest step. A value under 0.25rem maps to 0.25rem, so no gap collapses to zero. A value halfway
between two steps maps to the larger one.

| Read at                                                                                      | Literal                   | Step                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scss/features/_wound-track.scss:39`                                                         | `0.1rem` (block padding)  | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/base/_utilities.scss:7`                                                                | `0.125rem` (`.-gap-xs`)   | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/components/_inline-link.scss:16`                                                       | `0.15rem`                 | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/apps/_compendium-browser.scss:58`, `:131`                                              | `0.15rem`                 | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/features/_ranks.scss:11`                                                               | `0.2rem`                  | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/apps/_compendium-browser.scss:37`, `:119`                                              | `0.2rem` (block padding)  | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/apps/_effect-panel.scss:52`                                                            | `0.4rem` (inline padding) | `--l5r4-space-8`                                                                                                                                                                                                     |
| `scss/components/_item-summary-card.scss:15-16`, `scss/components/_ledger-dialog.scss:10-13` | `1.25rem` (list indent)   | Not mapped: `--l5r4-space-24` would move each list 4 px, over the 2 px Stage 17 decision 9 allows. The lists keep 20 px as a `--l5r4-space-4` margin plus a `--l5r4-space-16` padding; the indent step is for review |
| `scss/features/_traits-rings.scss:554`, `:569`                                               | `2px`                     | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/features/_traits-rings.scss:557`                                                       | `4px`                     | `--l5r4-space-4`                                                                                                                                                                                                     |
| `scss/features/_traits-rings.scss:308`                                                       | `8px`                     | `--l5r4-space-8`                                                                                                                                                                                                     |
| `scss/features/_traits-rings.scss:479`, `:512`, `:536`                                       | `-12px`                   | `calc(-1 * var(--l5r4-space-12))`                                                                                                                                                                                    |

### Gap utilities

The `-gap-*` classes keep their names; `-gap-sm` sits inside posted chat cards, so it is a fixed name (Stage 17
decision 2). Each class reads one step.

| Class     | Step                                        | Templates using it |
| --------- | ------------------------------------------- | ------------------ |
| `-gap-xs` | `--l5r4-space-4`                            | 11                 |
| `-gap-sm` | `--l5r4-space-4`                            | 89                 |
| `-gap-md` | `--l5r4-space-8`                            | 4                  |
| `-gap-lg` | `--l5r4-space-12`                           | 5                  |
| `-gap-xl` | none: no template uses it, so it is removed | 0                  |

`-gap-xs` and `-gap-sm` give the same gap on this scale; whether to merge them is a review decision, and `-gap-sm`
stays either way.

## Semantic spacing

| Token                         | Value             | Job                                                                                                             | Read at                                                                                                                                                                                               |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--l5r4-space-gap-tight`      | `--l5r4-space-4`  | Between stacked rows: list rows, card rows, dialog rows                                                         | `scss/components/_item-row.scss:12`, `scss/components/_chat-card.scss:27`, `:52`, `scss/components/_check-dialog.scss:10`, `scss/apps/_effect-panel.scss:14`, `scss/apps/_compendium-browser.scss:85` |
| `--l5r4-space-gap`            | `--l5r4-space-8`  | Between parts of one row: icon and text, toggle and label, label and value                                      | `scss/apps/_effect-panel.scss:23`, `scss/apps/_compendium-browser.scss:96`, `scss/components/_check-dialog.scss:16`, `scss/apps/_xp-manager.scss:26`                                                  |
| `--l5r4-space-control-block`  | `--l5r4-space-4`  | Block padding inside a compact button or tab                                                                    | `scss/apps/_effect-panel.scss:52`, `scss/apps/_compendium-browser.scss:37`, `:136`                                                                                                                    |
| `--l5r4-space-control-inline` | `--l5r4-space-8`  | Inline padding inside a compact button or tab                                                                   | As above                                                                                                                                                                                              |
| `--l5r4-space-card`           | `--l5r4-space-8`  | Padding of a card, a section title, a list header, a rule card                                                  | `scss/components/_section.scss:20`, `scss/components/_item-row.scss:20`, `scss/components/_rules-editor.scss:31`                                                                                      |
| `--l5r4-space-section`        | `--l5r4-space-16` | Between sheet columns and between sections; padding of the PC header and the Limited view                       | `scss/sheets/_actor-sheet.scss:15`, `scss/layout/_actor-layout.scss:8`, `:16`, `scss/features/_pc-info.scss:8`, `scss/apps/_emphasis-manager.scss:9`                                                  |
| `--l5r4-space-indent`         | `--l5r4-space-24` | Start padding of a bulleted list. Not declared: no list reads it yet (**Off-scale values**, the 1.25rem indent) | None                                                                                                                                                                                                  |

## Density

| Context                | Between rows | Inside a row                      | Padding                | Between sections              |
| ---------------------- | ------------ | --------------------------------- | ---------------------- | ----------------------------- |
| Sheets (PC, NPC, item) | `gap-tight`  | `gap`                             | `card`                 | `section`                     |
| Chat cards             | `gap-tight`  | `-gap-sm` (fixed in posted cards) | Core's message padding | None: one card is one section |
| Dialogs                | `gap-tight`  | `gap`                             | Core's window padding  | `gap`                         |
| Panels and browsers    | `gap-tight`  | `gap`                             | Core's window padding  | `gap`                         |

Chat card buttons run full width, one per row (`scss/components/_chat-card.scss:47-53`), so a long label wraps and the button keeps its
height.

## Size scale

| Token                         | Value | Job                                                                      | Read at                                                                                                                                 |
| ----------------------------- | ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `--l5r4-size-portrait`        | 240px | Actor image box on PC and NPC sheets                                     | `scss/layout/_sidebar.scss:9-13`                                                                                                        |
| `--l5r4-size-medallion`       | 96px  | Ring medallion image                                                     | `scss/features/_traits-rings.scss:191`, `:194`                                                                                          |
| `--l5r4-size-ring-rank`       | 32px  | Ring rank disc; the Ring and Trait grid's columns                        | `scss/features/_traits-rings.scss:70`, `:96`, `:100`                                                                                    |
| `--l5r4-size-trait-rank`      | 28px  | Trait rank box and Trait row height                                      | `scss/features/_traits-rings.scss:199`, `:211`, `:274`, `:277`, `:288`                                                                  |
| `--l5r4-size-item-icon`       | 32px  | Document icon in a row: effect panel, compendium browser, spell slots    | `scss/apps/_effect-panel.scss:28-30`, `scss/apps/_compendium-browser.scss:101-103`, `scss/components/_section.scss:56-57`, `:70`, `:79` |
| `--l5r4-size-rank-block`      | 64px  | Honor, Glory, Status, and Taint block height                             | `scss/components/_rank-control.scss:44`                                                                                                 |
| `--l5r4-size-void-point`      | 12px  | Void Point dot                                                           | `scss/features/_traits-rings.scss:579`, `:581`                                                                                          |
| `--l5r4-size-stepper`         | 16px  | Trait and Void Ring step arrow height, and the arrow's offset when shown | `scss/features/_traits-rings.scss:21`, `:25`, `:40`                                                                                     |
| `--l5r4-size-target`          | 24px  | Minimum pointer target (S5); Ring name height                            | `scss/features/_traits-rings.scss:82`                                                                                                   |
| `--l5r4-size-column-60`       | 60px  | Item list column                                                         | `scss/components/_item-row.scss:104`, `:112`                                                                                            |
| `--l5r4-size-column-80`       | 80px  | Item list column                                                         | `scss/components/_item-row.scss:51`, `:59`, `:80`, `:88`, `:96`, `:112`, `:132`, `:146`                                                 |
| `--l5r4-size-column-100`      | 100px | Item list column                                                         | `scss/components/_item-row.scss:59`                                                                                                     |
| `--l5r4-size-column-120`      | 120px | Item list column                                                         | `scss/components/_item-row.scss:104`, `:146`                                                                                            |
| `--l5r4-size-column-150`      | 150px | Item list column                                                         | `scss/components/_item-row.scss:132`, `:139`                                                                                            |
| `--l5r4-size-column-controls` | 102px | Item list column holding the row's controls                              | `scss/components/_item-row.scss:44-147`, every list variant                                                                             |

Glyph sizes for icons are in `foundations/iconography.md`. Components read core's field height (`--input-height`, 2rem)
as core sets it.

Literal sizes that leave the scale:

| Read at                               | Literal                                   | Result                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scss/features/_wound-track.scss:39`  | `min-height: 25px` on a Wound track row   | Stays a literal: `--l5r4-size-target` (24 px) takes 1 px off each of the eight rows, 8 px off the track, a size change Stage 17 decision 9 does not take. For review |
| `scss/components/_section.scss:38`    | `max-width: 46px` on section title fields | Stays a literal: one component                                                                                                                                       |
| `scss/components/_form-field.scss:24` | `min-width: 20px`                         | Stays a literal: one component                                                                                                                                       |

Renamed for `CHANGELOG.MD`: `--controls` becomes `--l5r4-size-column-controls`.

## Minimum target

S5 applies to every control a pointer can press that the system adds. A control that exists today keeps its size
(Stage 17 decision 16): growing it would change the sheet's look, which the pass leaves alone (decision 9). Two stay
under 24 px:

| Control                                  | Size       | Read at                                                                                                                                    |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Trait and Void Ring step arrows          | 16 px tall | `scss/features/_traits-rings.scss:40`; `templates/actor/_partials/_stats.hbs:61-67`                                                        |
| Void Point dots, one target for all nine | 12 px tall | `scss/features/_traits-rings.scss:579`; `templates/actor/_partials/_stats.hbs:220-231`, `templates/actor/_partials/_stats-npc.hbs:192-202` |

A new control's rendered size is measured in the gallery, in both themes, at the sheet's default width.
