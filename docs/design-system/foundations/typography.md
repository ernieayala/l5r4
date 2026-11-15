# Typography

The system uses core's faces and core's size steps. It names them by job, so a component asks for "the Trait rank
number" and not for a face or a pixel size. Font tokens read core variables, so they follow `foundations/color.md` rule
C4: declared in both theme blocks in `scss/base/_variables.scss`, never only on `:root`.

## Rules

| #   | Rule                                                                                                                                                                                                                                              | Enforced by                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `font-family` reads a `--l5r4-font-*` token or is inherited                                                                                                                                                                                       | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T2  | Text `font-size` reads a `--l5r4-font-size-*` token. An icon glyph takes its size from `foundations/iconography.md`                                                                                                                               | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T3  | `font-weight` is `normal` or `bold`. `600` maps to `bold`: `bold` is the majority (13 of 18 declarations)                                                                                                                                         | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T4  | Copy is in sentence case; game terms keep the book's capitals (Stage 17 decision 15). CSS never changes letter case                                                                                                                               | Copy: `tests/lang.test.js`, `tests/conventions/glossary.test.js`. CSS: Stylelint `declaration-property-value-disallowed-list` on `text-transform` |
| T5  | Numbers that are compared or that change in place use tabular figures (`font-variant-numeric: tabular-nums`): XkY pools, TNs, Wound totals and the Wound track, XP totals, and any column of numbers                                              | Review, in the gallery's type section                                                                                                             |
| T6  | `line-height` is inherited (core's 1.25) for text, and `1` for a number centered in a fixed box. `var(--input-height)` is allowed only to center text in a field-sized box                                                                        | Stylelint `declaration-property-value-allowed-list`                                                                                               |
| T7  | Text wraps. A label that must stay on one line (section title, tab, text link) is short enough to fit at 420 px; text that can still run long truncates with an ellipsis and keeps its full value in a tooltip. Text is never clipped without one | Review, in the gallery at 420 px                                                                                                                  |

| #   | Conforming                                                                                                                                                          | Non-conforming                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| T1  | `font-family: var(--font-h3);` on the Trait rank (`scss/features/_traits-rings.scss:245`), written as `var(--l5r4-font-number)`                                     | `font-family: "Signika", sans-serif;` (modeled)                            |
| T2  | `font-size: var(--font-size-12);` (`scss/components/_rules-editor.scss:45`), written as `var(--l5r4-font-size-meta)`                                                | `font-size: 29px;` (`scss/features/_traits-rings.scss:84`)                 |
| T3  | `font-weight: bold;` (`scss/components/_effect-panel.scss:42`)                                                                                                      | `font-weight: 600;` (`scss/features/_traits-rings.scss:85`)                |
| T4  | `"voidPoints": "Void Points"` (`lang/en.json:456`), shown as written                                                                                                | `text-transform: uppercase;` on a label (modeled)                          |
| T5  | The roll button's `{{system.rollDice}}k{{system.rollKeep}}` (`templates/cards/skill.hbs:22-23`) in tabular figures, so `10k3` and `6k3` line up in the Skill column | The same pool in proportional figures, shifting the column as ranks change |
| T6  | `line-height: 1;` on the Ring rank number in its disc (`scss/features/_traits-rings.scss:154`)                                                                      | `line-height: 1.4;` on a label (modeled)                                   |
| T7  | `.l5r4-effect-panel-text { min-width: 0; }` (`scss/components/_effect-panel.scss:38`) lets the effect text wrap in its row                                          | A row name cut off by `overflow: hidden` with no tooltip (modeled)         |

## Faces

Core sets the faces in `resources/app/public/css/foundry2.css:262-301`.

| Token                 | Built on           | Face                                                     | Job                                                                           | Read at                                                                                           |
| --------------------- | ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `--l5r4-font-body`    | `--font-body`      | Signika                                                  | All text not listed below. Inherited from core's window; never declared       | Inherited                                                                                         |
| `--l5r4-font-display` | `--font-h1`        | Modesto Condensed                                        | Ring rank numbers                                                             | `scss/features/_traits-rings.scss:83`                                                             |
| `--l5r4-font-label`   | `--font-h4`        | Modesto Condensed (core sets `--font-h4` to `--font-h1`) | Grid label cells (Initiative, Armor TN), Wound track labels, rank block names | `scss/components/_grids.scss:24`, `scss/features/_wounds.scss:22`, `scss/features/_ranks.scss:38` |
| `--l5r4-font-number`  | `--font-h3`        | Signika                                                  | Trait rank and Void Points numbers                                            | `scss/features/_traits-rings.scss:245`, `:264`                                                    |
| `--l5r4-font-code`    | `--font-monospace` | The platform's monospace                                 | Modifier values in the check dialog, the rules JSON editor, rule fields       | `scss/_chat.scss:85`, `scss/components/_rules-editor.scss:22`, `:50`                              |

Signika carries tabular figures (`tnum` in `public/fonts/signika/signika-regular.woff2`), so T5 takes effect wherever
the body or number face sets digits. Modesto Condensed has no `tnum`; the Ring rank is one number per disc, so it needs
none. Core's Amiri (`--font-h2`) is for core's prose; the system does not set it.

## Type scale

Core's window text is 14 px (`foundry2.css:7066`) at line height 1.25 (`foundry2.css:21`). Every step but `rank` is a
core size variable.

| Step      | Token                        | Value            | Built on            | Line height                    | Weight                             | Use                                                                                                             |
| --------- | ---------------------------- | ---------------- | ------------------- | ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| meta      | `--l5r4-font-size-meta`      | 0.75rem (12 px)  | `--font-size-12`    | inherited                      | normal                             | Sources, counts, citations, link reasons, rule errors, applied modifiers, ledger entries, browser filter labels |
| body      | `--l5r4-font-size-body`      | 0.875rem (14 px) | `--font-size-14`    | inherited                      | normal; bold for a name in a row   | Window text, expanded item text (`scss/components/_item-lists.scss:199`)                                        |
| label     | `--l5r4-font-size-label`     | 1rem (16 px)     | `--font-size-16`    | inherited, or 1 in a fixed box | normal                             | Grid cells, Wound track, rank block values, PC header fields, chat item headings                                |
| title     | `--l5r4-font-size-title`     | 1.125rem (18 px) | `--font-size-18`    | inherited                      | normal; bold for a rank block name | Section titles, rank block names                                                                                |
| rank      | `--l5r4-font-size-rank`      | 1.375rem (22 px) | none: a system step | 1                              | bold                               | Trait rank, Void Points number                                                                                  |
| medallion | `--l5r4-font-size-medallion` | 1.75rem (28 px)  | `--font-size-28`    | 1                              | bold                               | Ring rank number                                                                                                |

Letter case is sentence case at every step (T4). The smallest text is `meta`; nothing sets text smaller.

Literal sizes in `scss/` map to the scale as follows.

| Read at                                        | Literal   | Step              | Note                                                                              |
| ---------------------------------------------- | --------- | ----------------- | --------------------------------------------------------------------------------- |
| `scss/features/_traits-rings.scss:84`          | `29px`    | medallion (28 px) | Nearest core step; 1 px smaller                                                   |
| `scss/features/_traits-rings.scss:246`, `:265` | `22px`    | rank (22 px)      | Core's 20 and 24 px are both 2 px away, so the system keeps 22 px as its own step |
| `scss/features/_traits-rings.scss:34`          | `10px`    | none              | Size of the step arrow glyphs: an icon size (`foundations/iconography.md`)        |
| `scss/layout/_item-layout.scss:84`             | `0.85rem` | body (0.875rem)   | Nearest step; the `.price-field` rule matches no template                         |

## Numbers

| Rule             | Detail                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Figures          | Tabular in every place T5 lists                                                                                                                                                         |
| Notation         | XkY pools, TNs, Raises, signs, and units are copy: `content/voice.md` sets how they are written                                                                                         |
| Alignment        | A column of numbers aligns to the end of its cell; a single number in a box is centered                                                                                                 |
| Change in place  | A number that changes on click (Trait rank, Void Points, Wounds) keeps its box size, so the controls around it stay put                                                                 |
| Floating numbers | Canvas text, set in `module/services/scrolling-text.js:69-82` at 28 px with a 4 px black stroke; the sign and the resource's name carry the meaning (`module/utils/floating-text.js:4`) |

## Wrapping and truncation

| Element                         | Behavior                                          | Read at                                                                                        |
| ------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Section titles and their labels | One line                                          | `scss/components/_sections.scss:36`, `:87`                                                     |
| Item row names                  | Wrap                                              | `scss/components/_item-lists.scss:173`                                                         |
| Chat card buttons               | Full width, one per row, so long labels wrap      | `scss/_chat.scss:47-53`                                                                        |
| Text links                      | One line                                          | `scss/components/_effect-panel.scss:69`                                                        |
| Effect panel and browser rows   | The text column shrinks and wraps beside its icon | `scss/components/_effect-panel.scss:34-39`, `scss/components/_compendium-browser.scss:101-106` |
