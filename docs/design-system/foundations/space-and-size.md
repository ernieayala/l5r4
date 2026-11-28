# Space and size

One space scale in rem for the room between and inside things, semantic spacing tokens on top of it, and one size scale for the fixed-size parts of a sheet. All are declared on `:root` in `scss/base/_variables.scss`: they hold literals and do not change with the theme.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| S1 | `gap`, `row-gap`, `column-gap`, and every `margin*` and `padding*` property take a `--l5r4-space-*` token, `0`, or `auto`. A negative offset is `calc(-1 * var(--l5r4-space-*))` | `tests/conventions/styles.test.js` |
| S2 | Spacing is in rem, through the tokens; sizes of fixed-size art and controls are in px, through the size tokens | `tests/conventions/styles.test.js` (spacing); review (sizes) |
| S3 | A component reads the semantic token for its job (`gap`, `card`, `section`, ...) when one fits, and a step token otherwise | Review |
| S4 | A size two or more components share, or one listed in **Size scale**, reads its `--l5r4-size-*` token. A size only one component uses is a literal in that component's file | Review; `tests/conventions/styles.test.js` checks every size token is declared, read, and listed here |
| S5 | Every new pointer target is at least 24 by 24 px, or has 24 px of clear space around it. Existing controls keep their size (**Minimum target**). A link inside a sentence is exempt | Review, in the gallery's state sections |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| S1 | `gap: var(--l5r4-space-gap);` on `.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`) | `gap: 0.15rem;` (modeled) |
| S2 | `padding: var(--l5r4-space-card);` on `.l5r4-section-title` (`scss/components/_section.scss`) | `margin-block-start: 8px;` (modeled) |
| S3 | Card padding as `var(--l5r4-space-card)` on the section title and the rule card alike | `padding: var(--l5r4-space-8);` on a card, where `--l5r4-space-card` fits (modeled) |
| S4 | `width: var(--l5r4-size-item-icon);` on `.l5r4-effect-panel-icon` (`scss/apps/_effect-panel.scss`) and the browser icon, which share 32 px | `width: 240px;` on the portrait, which **Size scale** lists as `--l5r4-size-portrait` (modeled) |
| S5 | The Ring medallion, `.l5r4-ring-image` (`scss/features/_traits-rings.scss`), 96 px | A new icon button set to `width: 16px` (modeled) |

## Space scale

Five even steps (Stage 17 decision 15). Names follow core's spacer variables, which name each step by its pixels at a 16 px root (`--spacer-4` to `--spacer-16`, `foundry2.css:333-337`).

| Token             | Value   | At a 16 px root | Core's equal  |
| ----------------- | ------- | --------------- | ------------- |
| `--l5r4-space-4`  | 0.25rem | 4 px            | `--spacer-4`  |
| `--l5r4-space-8`  | 0.5rem  | 8 px            | `--spacer-8`  |
| `--l5r4-space-12` | 0.75rem | 12 px           | `--spacer-12` |
| `--l5r4-space-16` | 1rem    | 16 px           | `--spacer-16` |
| `--l5r4-space-24` | 1.5rem  | 24 px           | none          |

The tokens hold the rem literals, not core's variables, so the scale is fixed by this page.

### Off-scale values

A value off the scale takes the nearest step. A value under 0.25rem takes 0.25rem, so no gap collapses to zero. A value halfway between two steps takes the larger one.

One value keeps its size off the scale: the 20 px list indent of `.l5r4-rule-lines` (`scss/components/_item-summary-card.scss`) and `.l5r4-ledger-dialog-entries` (`scss/components/_ledger-dialog.scss`). `--l5r4-space-24` would move each list 4 px, over the 2 px Stage 17 decision 9 allows, so the lists write a `--l5r4-space-4` margin plus a `--l5r4-space-16` padding; the indent step is for review.

### Gap utilities

The `-gap-*` classes keep their names; `-gap-sm` sits inside posted chat cards, so it is a fixed name (Stage 17 decision 2). Each class reads one step.

| Class     | Step              |
| --------- | ----------------- |
| `-gap-xs` | `--l5r4-space-4`  |
| `-gap-sm` | `--l5r4-space-4`  |
| `-gap-md` | `--l5r4-space-8`  |
| `-gap-lg` | `--l5r4-space-12` |

`-gap-xs` and `-gap-sm` give the same gap on this scale; whether to merge them is a review decision, and `-gap-sm` stays either way.

## Semantic spacing

| Token | Value | Job | Read at |
| --- | --- | --- | --- |
| `--l5r4-space-gap-tight` | `--l5r4-space-4` | Between stacked rows: list rows, card rows, dialog rows | `.l5r4-item-row-list` (`scss/components/_item-row.scss`), `.l5r4-roll` (`scss/components/_check-card.scss`), `.l5r4-flow-card` (`scss/components/_flow-card.scss`), `.l5r4-check-dialog-group` (`scss/components/_check-dialog.scss`), `.l5r4-effect-panel-list` (`scss/apps/_effect-panel.scss`), `.l5r4-compendium-browser-results` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-space-gap-controls` | `0.125rem` (2 px), off the scale | Between the buttons of an item row's control cluster, so four 24 px buttons fit `--l5r4-size-column-controls` | The cluster rule of `.l5r4-item-row` (`scss/components/_item-row.scss`) |
| `--l5r4-space-gap` | `--l5r4-space-8` | Between parts of one row: icon and text, toggle and label, label and value | `.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`), `.l5r4-compendium-browser-row` (`scss/apps/_compendium-browser.scss`), `.l5r4-check-dialog-modifier` (`scss/components/_check-dialog.scss`), `.l5r4-xp-manager-breakdown` (`scss/apps/_xp-manager.scss`) |
| `--l5r4-space-control-block` | `--l5r4-space-4` | Block padding inside a compact button or tab | `.l5r4-effect-panel-button` (`scss/apps/_effect-panel.scss`), `.l5r4-tabs-tab` and `.l5r4-compendium-browser-button` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-space-control-inline` | `--l5r4-space-8` | Inline padding inside a compact button or tab | As above |
| `--l5r4-space-card` | `--l5r4-space-8` | Padding of a card, a section title, a list header, a rule card | `.l5r4-section-title` (`scss/components/_section.scss`), `&.l5r4-sort-header` (`scss/components/_item-row.scss`), `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`) |
| `--l5r4-space-section` | `--l5r4-space-16` | Between sheet columns and between sections; padding of the PC header and the Limited view | `.l5r4-actor-sheet` (`scss/sheets/_actor-sheet.scss`), `.l5r4-sheet-body` and `.l5r4-limited` (`scss/layout/_actor-layout.scss`), `.l5r4-pc-info` (`scss/features/_pc-info.scss`), `.l5r4-emphasis-manager-body` (`scss/apps/_emphasis-manager.scss`) |
| `--l5r4-space-indent` | `--l5r4-space-24` | Start padding of a bulleted list. Not declared: the lists that indent write a `--l5r4-space-4` margin and a `--l5r4-space-16` padding (**Off-scale values**, the 1.25rem indent) | None |

## Density

| Context | Between rows | Inside a row | Padding | Between sections |
| --- | --- | --- | --- | --- |
| Sheets (PC, NPC, item) | `gap-tight` | `gap` | `card` | `section` |
| Chat cards | `gap-tight` | `-gap-sm` (fixed in posted cards) | Core's message padding | None: one card is one section |
| Dialogs | `gap-tight` | `gap` | Core's window padding | `gap` |
| Panels and browsers | `gap-tight` | `gap` | Core's window padding | `gap` |

Chat card buttons run full width, one per row (`.l5r4-flow-card` (`scss/components/_flow-card.scss`), `.l5r4-damage-result` (`scss/components/_damage-result.scss`)), so a long label wraps and the button keeps its height.

## Size scale

| Token | Value | Job | Read at |
| --- | --- | --- | --- |
| `--l5r4-size-portrait` | 240px | Actor image box on PC and NPC sheets | `.l5r4-portrait` (`scss/layout/_sidebar.scss`) |
| `--l5r4-size-medallion` | 96px | Ring medallion image | `.l5r4-ring-image` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-ring-rank` | 32px | Ring rank disc; the Ring and Trait grid's columns | `.l5r4-traits-rings` and `.l5r4-ring-rank` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-trait-rank` | 28px | Trait rank box and Trait row height | `.l5r4-trait`, its grid columns, and `.l5r4-rank-control.-trait` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-item-icon` | 32px | Document icon in a row: effect panel, compendium browser, spell slots | `.l5r4-effect-panel-icon` (`scss/apps/_effect-panel.scss`), `.l5r4-compendium-browser-icon` (`scss/apps/_compendium-browser.scss`), `.l5r4-spell-slot` and its count (`scss/components/_section.scss`) |
| `--l5r4-size-rank-block` | 64px | Honor, Glory, Status, and Taint block height | `.l5r4-rank-control.-track` (`scss/components/_rank-control.scss`) |
| `--l5r4-size-void-point` | 12px | Void Point dot | `.l5r4-void-point` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-stepper` | 16px | Trait and Void Ring step arrow height, and the arrow's offset when shown | `@mixin rank-arrows` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-target` | 24px | Minimum pointer target (S5); Ring name height | `.l5r4-ring-name` (`scss/features/_traits-rings.scss`) |
| `--l5r4-size-column-60` | 60px | Item list column | `&.-skill` and `&.-spell` (`scss/components/_item-row.scss`) |
| `--l5r4-size-column-80` | 80px | Item list column | `&.-advantage`, `&.-armor`, `&.-disadvantage`, `&.-kata`, `&.-kiho`, `&.-spell`, `&.-weapon`, and `&.-xp-spent` (`scss/components/_item-row.scss`) |
| `--l5r4-size-column-100` | 100px | Item list column | `&.-armor` (`scss/components/_item-row.scss`) |
| `--l5r4-size-column-120` | 120px | Item list column | `&.-xp-spent` (`scss/components/_item-row.scss`) |
| `--l5r4-size-column-150` | 150px | Item list column | `&.-skill`, `&.-weapon`, and `&.-xp` (`scss/components/_item-row.scss`) |
| `--l5r4-size-column-controls` | 102px | Item list column holding the row's controls | Every list variant of `.l5r4-item-row-list` (`scss/components/_item-row.scss`) |

Glyph sizes for icons are in `foundations/iconography.md`. Components read core's field height (`--input-height`, 2rem) as core sets it.

Literal sizes that leave the scale:

| Read at | Literal | Result |
| --- | --- | --- |
| The rows of `.l5r4-grid .l5r4-wound-track` (`scss/features/_wound-track.scss`) | `min-height: 25px` on a Wound track row | A documented exception: Ernie kept the look. `--l5r4-size-target` (24 px) would take 1 px off each of the eight rows, 8 px off the track (Stage 17 decision 9) |
| The control cluster of `.l5r4-item-row` (`scss/components/_item-row.scss`) | `gap: var(--l5r4-space-gap-controls)`, 2 px | A documented exception: Ernie kept the look. `-gap-xs` (4 px) makes four 24 px buttons 108 px wide, so the cluster wraps in the 102 px controls column and each row with an expand control grows from 32 px to 52 px |
| `.l5r4-section-title` (`scss/components/_section.scss`) | `max-width: 46px` on section title fields | Stays a literal: one component |
| `.l5r4-form-field-value` (`scss/components/_form-field.scss`) | `min-width: 20px` | Stays a literal: one component |

The wound configuration window's manual Wound Ranks table is the second documented exception: it keeps its own look in place of the grid's frame, which Ernie kept because the frame would make each row 3 px shorter and its text 2 px larger (Stage 17 decision 9). `scss/components/_grid.scss` leaves that table out of the grid rule with `:not(:where(.l5r4-wound-config .l5r4-grid))`; `components/wound-track.md` records both exceptions.

## Minimum target

S5 applies to every control a pointer can press that the system adds. Two controls keep a size under 24 px (Stage 17 decision 16), since growing them would change the sheet's look (decision 9):

| Control | Size | Read at |
| --- | --- | --- |
| Trait and Void Ring step arrows | 16 px tall | `@mixin rank-arrows` (`scss/features/_traits-rings.scss`); `l5r4-rank-control-arrow` (`templates/actor/_partials/_rank-control.hbs`) |
| Void Point dots, one target for all nine | 12 px tall | `.l5r4-void-point` (`scss/features/_traits-rings.scss`); `data-action="adjust-void-points"` (`templates/actor/_partials/_void-points.hbs`), on the PC and NPC sheets |

A new control's rendered size is measured in the gallery, in both themes, at the sheet's default width.
