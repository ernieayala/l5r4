# Grid

A two-column table of labels and values with a frame line around every cell. The sheet sidebar builds its blocks from
it: stance, Initiative, and movement; Armor TN and Reduction; Wounds; Fear Rank.

| Item        | Detail                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | None: the grid is one element whose cells the enclosing partial writes (`_combat.hbs`, `_armor.hbs`, `_wounds.hbs`, `_fear.hbs`)       |
| SCSS        | `scss/components/_grid.scss` (target), the rename of `scss/components/_grids.scss`, which styles `.grid`                               |
| Block class | `l5r4-grid`                                                                                                                            |
| Shows in    | PC and NPC sheet sidebar; the Wound Ranks table in the wound configuration window holds a Wound track inside a grid (`wound-track.md`) |
| Gallery     | A grid with a text value, a number input, a select, a checkbox beside a value, and a long label                                        |

## Anatomy

| Part       | Element  | Class                   | Class now                                                  |
| ---------- | -------- | ----------------------- | ---------------------------------------------------------- |
| Grid       | `<div>`  | `l5r4-grid`             | `grid` (`_grids.scss:8`)                                   |
| Label cell | `<span>` | `l5r4-grid-label`       | any `> span` child (`_grids.scss:19-28`)                   |
| Value cell | `<div>`  | `l5r4-grid-value`       | any `> div` child (`_grids.scss:30-44`)                    |
| Full row   | `<div>`  | `l5r4-grid-value -full` | `wound-grid` with `grid-column: 1 / 3` (`_wounds.scss:12`) |

Cells alternate label, value, label, value. A label cell names the value cell to its right.

## Variants

| Variant  | Selects it              | Look                                                     |
| -------- | ----------------------- | -------------------------------------------------------- |
| Default  | `l5r4-grid`             | Two equal columns (`1fr 1fr`)                            |
| Full row | `l5r4-grid-value -full` | A value that spans both columns, as the Wound track does |

## States

| State         | Look                                                                                        | Markup                          |
| ------------- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| Rest          | Label cells on `--l5r4-color-panel` in the label face; value cells on the surface           |                                 |
| Focus-visible | The input or control inside a value cell shows its own focus (`form-field.md`, `button.md`) | `:focus-visible` on the control |
| Read-only     | A computed value is text (`form-field.md` F3)                                               | Text                            |
| Disabled      | The control inside takes its own disabled look; the cell stays                              | `disabled` on the control       |
| Empty         | A value cell with nothing to show holds an em dash, so the row keeps its height             | `—`                             |

## Tokens

| Token                                           | Use                                             |
| ----------------------------------------------- | ----------------------------------------------- |
| `--l5r4-color-line`, `--l5r4-border-width-thin` | Frame and cell lines                            |
| `--l5r4-color-panel`                            | Label cell background                           |
| `--l5r4-color-text`                             | Cell text                                       |
| `--l5r4-font-label`, `--l5r4-font-size-label`   | Label cells; value cells take `font-size-label` |
| `--l5r4-space-4`                                | Cell padding                                    |
| `--l5r4-space-8`                                | Inline padding of a text value inside a cell    |

Contrast: `text` on `panel` is 8.51:1 light and 11.52:1 dark (`foundations/color.md`).

## Keyboard and screen reader

| Input         | Result                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tab           | Reaches the controls inside value cells in reading order; the cells themselves take no focus                                    |
| Screen reader | Reads each label, then its value. A control in a value cell carries `aria-label` with its label cell's key (`form-field.md` F1) |

## Long text

A label wraps inside its cell and the row grows to fit; a value cell's text wraps the same way. Numbers in value cells
use tabular figures (`foundations/typography.md` T5).

## Rules

| #   | Rule                                                                                                                  | Enforced by                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| G1  | Cells carry `l5r4-grid-label` and `l5r4-grid-value`; the stylesheet selects those classes, never `> span` and `> div` | Stylelint `selector-class-pattern`; `tests/conventions/styles.test.js` |
| G2  | Lines read `--l5r4-border-width-thin` and `--l5r4-color-line` (`foundations/frames.md` rule 1)                        | `tests/conventions/styles.test.js`                                     |
| G3  | A control in a value cell names itself with its label cell's key                                                      | Review, in the gallery                                                 |
| G4  | Labels and values alternate; a row never has two labels or two values side by side, except a `-full` value            | Review                                                                 |

| #   | Conforming                                                                                                                                              | Non-conforming                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| G1  | `.l5r4-grid-label { background: var(--l5r4-color-panel); }` (modeled on `_grids.scss:19-21`)                                                            | `.grid > span { background: var(--table-header-bg-color); }` (`scss/components/_grids.scss:19-21`) |
| G2  | `border: var(--l5r4-border-width-thin) solid var(--l5r4-color-line);` (`foundations/frames.md` rule 1)                                                  | `border: 1px solid var(--table-header-border-color);` (`scss/components/_grids.scss:9`)            |
| G3  | `<input type="number" name="system.suffered" aria-label="{{localize "l5r4.ui.mechanics.wounds.woundsSuffered"}}" ...>` (modeled on `_wounds.hbs:21-26`) | The same input with no name (`templates/actor/_partials/_wounds.hbs:21-26`)                        |
| G4  | Label, value, label, value (`templates/actor/_partials/_armor.hbs:14-28`)                                                                               | A checkbox placed as a third cell after the value (modeled)                                        |

## Do and don't

| Do                                                          | Don't                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Use the grid for short label and value pairs in the sidebar | Use it for a list of documents: that is an item row list              |
| Put a Void toggle inside the value cell, after the value    | Give the toggle its own cell, which breaks the label and value rhythm |
| Keep one value per cell                                     | Join two values into one cell with a slash where both are inputs      |

## Names

| Current                       | Target                                | Why                                                            |
| ----------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| `grid`                        | `l5r4-grid`                           | Decision 15                                                    |
| `> span` label cells          | `l5r4-grid-label`                     | G1                                                             |
| `> div` value cells           | `l5r4-grid-value`                     | G1                                                             |
| `scss/components/_grids.scss` | `scss/components/_grid.scss` (target) | The file takes its block's name (`docs/code-system/naming.md`) |
