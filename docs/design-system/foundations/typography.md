# Typography

The system uses core's faces and core's size steps. It names them by job, so a component asks for "the Trait rank
number" and not for a face or a pixel size. Font tokens read core variables, so they follow `foundations/color.md` rule
C4: declared in both theme blocks in `scss/base/_variables.scss`, never only on `:root`.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                  | Enforced by                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `font-family` reads a `--l5r4-font-*` token or is inherited                                                                                                                                                                                                           | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T2  | Text `font-size` reads a `--l5r4-font-size-*` token. An icon glyph takes its size from `foundations/iconography.md`                                                                                                                                                   | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T3  | `font-weight` is `normal` or `bold`. `600` maps to `bold`: `bold` is the majority (13 of 18 declarations)                                                                                                                                                             | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T4  | Copy is in sentence case; game terms keep the book's capitals (Stage 17 decision 15). CSS never changes letter case                                                                                                                                                   | Copy: `tests/lang.test.js`, `tests/conventions/glossary.test.js`. CSS: Stylelint `declaration-property-value-disallowed-list` on `text-transform` |
| T5  | Numbers that are compared or that change in place use tabular figures (`font-variant-numeric: tabular-nums`): XkY pools, TNs, Wound totals and the Wound track, XP totals, and any column of numbers                                                                  | Review, in the gallery's type section                                                                                                             |
| T6  | `line-height` is inherited (core's 1.25) for text, and `1` for a number centered in a fixed box. `var(--input-height)` is allowed only to center text in a field-sized box                                                                                            | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T7  | Text wraps. A label that must stay on one line (section title, tab, text link) is short enough to fit at its window's default width; text that can still run long truncates with an ellipsis and keeps its full value in a tooltip. Text is never clipped without one | Review, in the gallery                                                                                                                            |

| #   | Conforming                                                                                                                                    | Non-conforming                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| T1  | `font-family: var(--l5r4-font-number);` on the Trait rank, `.l5r4-rank-control.-trait` (`scss/features/_traits-rings.scss`)                   | `font-family: "Signika", sans-serif;` (modeled)                            |
| T2  | `font-size: var(--l5r4-font-size-meta);` on `.l5r4-rules-editor-error` (`scss/components/_rules-editor.scss`)                                 | `font-size: 29px;` (modeled)                                               |
| T3  | `font-weight: bold;` on `.l5r4-effect-panel-name` (`scss/apps/_effect-panel.scss`)                                                            | `font-weight: 600;` (modeled)                                              |
| T4  | `l5r4.ui.mechanics.rings.voidPoints` (`lang/en.json`): "Void Points", shown as written                                                        | `text-transform: uppercase;` on a label (modeled)                          |
| T5  | The roll button's `pool=system.rollFormula` (`templates/cards/skill.hbs`) in tabular figures, so `10k3` and `6k3` line up in the Skill column | The same pool in proportional figures, shifting the column as ranks change |
| T6  | `line-height: 1;` on the Ring rank number in its disc, `.l5r4-ring-rank-face` (`scss/features/_traits-rings.scss`)                            | `line-height: 1.4;` on a label (modeled)                                   |
| T7  | `min-width: 0` on `.l5r4-effect-panel-text` (`scss/apps/_effect-panel.scss`) lets the effect text wrap in its row                             | A row name cut off by `overflow: hidden` with no tooltip (modeled)         |

## Faces

Core sets the faces in `resources/app/public/css/foundry2.css:262-301`.

| Token                 | Built on           | Face                                                     | Job                                                                           | Read at                                                                                                                                                                                                                            |
| --------------------- | ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--l5r4-font-body`    | `--font-body`      | Signika                                                  | All text not listed below. Inherited from core's window; never declared       | Inherited                                                                                                                                                                                                                          |
| `--l5r4-font-display` | `--font-h1`        | Modesto Condensed                                        | Ring rank numbers                                                             | `.l5r4-ring-rank` (`scss/features/_traits-rings.scss`)                                                                                                                                                                             |
| `--l5r4-font-label`   | `--font-h4`        | Modesto Condensed (core sets `--font-h4` to `--font-h1`) | Grid label cells (Initiative, Armor TN), Wound track labels, rank block names | The label cells of `.l5r4-grid` (`scss/components/_grid.scss`), `.l5r4-grid .l5r4-wound-track` (`scss/features/_wound-track.scss`), the value's first `span` in `.l5r4-rank-control.-track` (`scss/components/_rank-control.scss`) |
| `--l5r4-font-number`  | `--font-h3`        | Signika                                                  | Trait rank numbers                                                            | `.l5r4-rank-control.-trait` (`scss/features/_traits-rings.scss`)                                                                                                                                                                   |
| `--l5r4-font-code`    | `--font-monospace` | The platform's monospace                                 | Modifier values in the check dialog, the rules JSON editor, rule fields       | `.l5r4-check-dialog-modifier-value` (`scss/components/_check-dialog.scss`), `.l5r4-rules-editor-json` (`scss/components/_rules-editor.scss`), `.l5r4-rules-editor-field textarea` (`scss/components/_rules-editor.scss`)           |

Signika carries tabular figures (`tnum` in `public/fonts/signika/signika-regular.woff2`), so T5 takes effect wherever
the body or number face sets digits. Modesto Condensed has no `tnum`; the Ring rank is one number per disc, so it needs
none. Core's Amiri (`--font-h2`) is for core's prose; the system does not set it.

## Type scale

Core's window text is 14 px (`foundry2.css:7066`) at line height 1.25 (`foundry2.css:21`). Every step but `rank` is a
core size variable.

| Step      | Token                        | Value            | Built on            | Line height                    | Weight                             | Use                                                                                                             |
| --------- | ---------------------------- | ---------------- | ------------------- | ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| meta      | `--l5r4-font-size-meta`      | 0.75rem (12 px)  | `--font-size-12`    | inherited                      | normal                             | Sources, counts, citations, link reasons, rule errors, applied modifiers, ledger entries, browser filter labels |
| body      | `--l5r4-font-size-body`      | 0.875rem (14 px) | `--font-size-14`    | inherited                      | normal; bold for a name in a row   | Window text; expanded item text, `.l5r4-item-row-details` (`scss/components/_item-row.scss`)                    |
| label     | `--l5r4-font-size-label`     | 1rem (16 px)     | `--font-size-16`    | inherited, or 1 in a fixed box | normal                             | Grid cells, Wound track, rank block values, PC header fields, chat item headings                                |
| title     | `--l5r4-font-size-title`     | 1.125rem (18 px) | `--font-size-18`    | inherited                      | normal; bold for a rank block name | Section titles, rank block names                                                                                |
| rank      | `--l5r4-font-size-rank`      | 1.375rem (22 px) | none: a system step | 1                              | bold                               | Trait rank                                                                                                      |
| medallion | `--l5r4-font-size-medallion` | 1.75rem (28 px)  | `--font-size-28`    | 1                              | bold                               | Ring rank number                                                                                                |

Letter case is sentence case at every step (T4). The smallest text is `meta`; nothing sets text smaller.

The sizes the Ring and Trait block needs map to the scale as follows.

| Read at                                                                      | Literal | Step              | Note                                                                                              |
| ---------------------------------------------------------------------------- | ------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `.l5r4-ring-rank` (`scss/features/_traits-rings.scss`)                       | `29px`  | medallion (28 px) | Nearest core step; 1 px smaller                                                                   |
| `.l5r4-rank-control.-trait` (`scss/features/_traits-rings.scss`)             | `22px`  | rank (22 px)      | Core's 20 and 24 px are both 2 px away, so the system keeps 22 px as its own step                 |
| The step arrows in `@mixin rank-arrows` (`scss/features/_traits-rings.scss`) | `10px`  | none              | Size of the step arrow glyphs: an icon size, `--l5r4-size-icon-sm` (`foundations/iconography.md`) |

## Numbers

| Rule             | Detail                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Figures          | Tabular in every place T5 lists                                                                                                                                                                                                             |
| Notation         | XkY pools, TNs, Raises, signs, and units are copy: `content/voice.md` sets how they are written                                                                                                                                             |
| Alignment        | A column of numbers aligns to the end of its cell; a single number in a box is centered                                                                                                                                                     |
| Change in place  | A number that changes on click (Trait rank, Void Points, Wounds) keeps its box size, so the controls around it stay put                                                                                                                     |
| Floating numbers | Canvas text, set in `startScrollingText` (`module/services/scrolling-text.js`) at 28 px with a 4 px black stroke; the sign and the resource's name carry the meaning, as `formatFloatingText` (`module/utils/floating-text.js`) writes them |

## Wrapping and truncation

| Element                         | Behavior                                          | Read at                                                                                                                            |
| ------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Section titles and their labels | One line                                          | `.l5r4-section-title` (`scss/components/_section.scss`), `.l5r4-section-heading` (`scss/components/_section.scss`)                 |
| Item row names                  | Wrap                                              | The `.title` rule in `.l5r4-item-row-list` (`scss/components/_item-row.scss`)                                                      |
| Chat card buttons               | Full width, one per row, so long labels wrap      | `.l5r4-flow-card` (`scss/components/_chat-card.scss`)                                                                              |
| Text links                      | One line                                          | `.l5r4-inline-link` (`scss/components/_inline-link.scss`)                                                                          |
| Effect panel and browser rows   | The text column shrinks and wraps beside its icon | `.l5r4-effect-panel-text` (`scss/apps/_effect-panel.scss`), `.l5r4-compendium-browser-text` (`scss/apps/_compendium-browser.scss`) |
