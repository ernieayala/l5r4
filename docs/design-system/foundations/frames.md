# Frames

Borders, dividers, corners, shadows, the parchment backdrop, and the four elevation levels. Line and surface colors
are color.md's role tokens; this page sets the widths, corners, and depth around them.

## Tokens

Declared in `scss/base/_variables.scss`, on `:root` unless the table says otherwise.

| Token                       | Value                                                                                        | Use                                                                           | Replaces                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--l5r4-border-width-thin`  | `1px`                                                                                        | Every frame and grid line                                                     | The 1px widths in `_grids.scss`, `_wounds.scss`, `_item-lists.scss`, `_ranks.scss`, `_traits-rings.scss`, and the rest |
| `--l5r4-border-width-thick` | `2px`                                                                                        | A Ring rank face and a Void Point dot                                         | `scss/features/_traits-rings.scss:100`, `:148`, `:573`                                                                 |
| `--l5r4-border-width-band`  | `32px`                                                                                       | The Ring color band on the outer side of each Trait row; one grid column wide | `scss/features/_traits-rings.scss:313`, `:332`, `:351`, `:370`                                                         |
| `--l5r4-radius-sm`          | `4px`                                                                                        | A chip or a card inside content: text links, rule cards                       | `3px` at `scss/components/_inline-link.scss:9`; `4px` at `_rules-editor.scss:30`, `_item-layout.scss:62`               |
| `--l5r4-radius-round`       | `50%`                                                                                        | Ring medallions, spell slot images, Void Point dots                           | `_traits-rings.scss:80`, `:101`, `:149`, `:168`, `:260`, `:574`; `_sections.scss:48`, `:56`                            |
| `--l5r4-shadow-raised`      | `0 0 2px 1px var(--l5r4-color-shadow)`                                                       | `box-shadow` on a raised element                                              | `scss/features/_traits-rings.scss:150`                                                                                 |
| `--l5r4-shadow-drop`        | `drop-shadow(0 0 3px var(--l5r4-color-shadow))`                                              | `filter` on a raised image with a transparent edge (the Ring images)          | `scss/features/_traits-rings.scss:169`                                                                                 |
| `--l5r4-shadow-text-halo`   | `1px 1px 1px var(--l5r4-color-shadow-strong), -1px -1px 1px var(--l5r4-color-shadow-strong)` | `text-shadow` that keeps a number legible over an image                       | `scss/components/_section.scss:64-66` (spell slot count)                                                               |

A shadow's color is one of color.md's shadow roles, `--l5r4-color-shadow` (black at 50%) or
`--l5r4-color-shadow-strong` (black); frames.md sets only the offsets and blur around it.

A square corner is `border-radius: 0` and needs no token: the mask buttons and the Trait roll button set it to clear
core's `4px` button corner (`_animations.scss:14`, `:35`, `:78`; `_traits-rings.scss:196`, `:222`).

The parchment backdrop behind each Ring rank medallion reads two color.md tokens, set per theme on each themed element:
`--l5r4-image-ring-rank-backdrop` (core's `ui/parchment.jpg` in light, `none` in dark) and
`--l5r4-color-ring-rank-backdrop` (`transparent` in light, `--color-cool-5-90` in dark). color.md lists their values
and their rename from `--l5r4-ring-rank-backdrop-image` and `--l5r4-ring-rank-backdrop-color`.

## Elevation

| Level   | What sits there                                                                                                         | Look                                                                                                                          | Owner  |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| Flat    | Grids, item lists, sections, the Wound track, chat cards, fieldsets, rule cards                                         | No shadow. A frame is a thin line in the line color, or no frame                                                              | System |
| Raised  | An element drawn over another inside a component: Ring rank medallions over Ring images, the Ring images over the sheet | `--l5r4-shadow-raised` (boxes) or `--l5r4-shadow-drop` (images)                                                               | System |
| Window  | Every ApplicationV2 window: sheets, managers, the effect panel, the compendium browser, dialogs                         | Core's: `border: 1px solid var(--color-border)`, `border-radius: 6px`, `box-shadow: 0 0 10px #000` (`foundry2.css:7054-7071`) | Core   |
| Overlay | Tooltips, context menus, notifications                                                                                  | Core's                                                                                                                        | Core   |

## Rules

### 1. A line is a width token and a color role

A border reads `--l5r4-border-width-thin` (or `-thick`, `-band` for their one job) and a line color from color.md.
No hex, `rgb()`, or named color in a border. Enforced by `tests/conventions/styles.test.js` (no literal colors outside
`base/`) and Stylelint `color-named: "never"` and `color-no-hex` in `.stylelintrc.json`.

Conforming, modeled on `scss/components/_grid.scss:9`:

```scss
.l5r4-grid {
  border: var(--l5r4-border-width-thin) solid var(--l5r4-color-line);
}
```

Non-conforming, `scss/features/_traits-rings.scss:30-31` and `:573`:

```scss
border: 1px solid black;
border-color: inherit;

border: 2px solid #666;
```

### 2. A frame line and a divider are different jobs

A frame line draws a box or a grid cell: `--l5r4-color-line` at the thin width. `_grids.scss`, `_wounds.scss`, and
`_item-lists.scss` draw it today with core's `--table-header-border-color`, the most used line color, which color.md
builds the line role on. A divider separates
two stacked blocks with no box around them (a heading's underline, the end of a prose editor) and uses core's
`--sidebar-separator` whole, which core sets per theme (`1px solid` in dark, `2px groove` in light; `foundry2.css:685`,
`:2056`). Enforced by review.

Conforming, `scss/components/_chat-card.scss:14` and `scss/layout/_item-layout.scss:42`:

```scss
border-block-end: var(--sidebar-separator);
```

Non-conforming, `scss/apps/_xp-manager.scss:11` and `:22`: dividers drawn as `1px solid var(--color-border)`, a third
line color for the same job.

### 3. Borders use logical sides

Write `border-block-start`, `border-block-end`, `border-inline-start`, `border-inline-end`, the form 32 of 35
side-specific declarations use today. Enforced by Stylelint `property-disallowed-list` (`border-top`, `border-right`,
`border-bottom`, `border-left`) in `.stylelintrc.json`.

Conforming, modeled on `scss/features/_wound-track.scss:19`:

```scss
border-block-end: var(--l5r4-border-width-thin) solid var(--l5r4-color-line);
```

Non-conforming, `scss/components/_item-summary-card.scss:18`:

```scss
border-top: 1px solid var(--color-border-light-tertiary);
```

### 4. Corners are square, small, or round

A corner is `0`, `--l5r4-radius-sm`, or `--l5r4-radius-round`. A window's corner is core's. Enforced by
`tests/conventions/styles.test.js` (`border-radius` reads a radius token or is `0`).

Conforming, modeled on `scss/components/_rules-editor.scss:30`:

```scss
.l5r4-rules-editor-card {
  border-radius: var(--l5r4-radius-sm);
}
```

Non-conforming, `scss/components/_inline-link.scss:9`:

```scss
.l5r4-link {
  border-radius: 3px;
}
```

### 5. Only raised elements cast a shadow, through a token

Flat surfaces have no shadow. A raised element reads `--l5r4-shadow-raised` or `--l5r4-shadow-drop`; legibility over
an image reads `--l5r4-shadow-text-halo`. The system never adds a shadow to a window, a panel, or a chat card: those
take core's elevation. Enforced by `tests/conventions/styles.test.js` (no literal colors outside `base/`, which catches
a literal shadow) and review for the level.

Conforming, modeled on `scss/features/_traits-rings.scss:150`:

```scss
.l5r4-ring-rank-face {
  box-shadow: var(--l5r4-shadow-raised);
}
```

Non-conforming, `scss/features/_traits-rings.scss:169`:

```scss
filter: drop-shadow(0 0 3px rgb(0 0 0 / 50%));
```

### 6. The parchment is core's

Window surfaces show core's themed background: parchment in light theme (`--background: url("../ui/parchment.jpg")`,
`foundry2.css:2164`), a cool fill in dark. The system paints no background of its own on a window or panel. The one
place it draws parchment is behind each Ring rank medallion, through the two backdrop tokens above, which point at
core's own `ui/parchment.jpg` and switch with the nearest themed ancestor. Enforced by review; the gallery shows the
Rings in both themes.

Conforming, modeled on `scss/features/_traits-rings.scss:95-105`: the medallion's `::before` reads
`--l5r4-image-ring-rank-backdrop` and `--l5r4-color-ring-rank-backdrop`.

Non-conforming: a copy of the parchment image in `assets/`, or `background-image` set on `.window-content`.

### 7. The brush frame marks the sheet header only

The brush-stroke border (`assets/borders/brush-08-gray.svg`, a `border-image` at `opacity: 0.25` on the header's
`::before`, `scss/features/_pc-info.scss:13-24`) is the system's one frame ornament. It frames the PC and NPC sheet
header and nothing else, and sits behind the header's content through `--l5r4-layer-behind` (layers.md). Its path is
an SCSS variable in `base/_variables.scss`, as the Ring image paths are. Enforced by review.

Conforming: the header block in `templates/actor/_partials/_stats.hbs` and `_stats-npc.hbs`, framed by
`.pc-info::before`.

Non-conforming: the brush border on an item row or a chat card, where it competes with the content.

### 8. Focus, selection, and disabled change the frame the same way everywhere

A frame shows these states with the states.md tokens and nothing else:

| State         | Frame change                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Focus-visible | `outline: var(--l5r4-state-focus-outline)` and `box-shadow: var(--l5r4-state-focus-shadow)`, as core's buttons |
| Selected      | `outline: var(--l5r4-state-selected-outline)` and bold text                                                    |
| Disabled      | The frame stays; the whole control takes `opacity: var(--l5r4-state-disabled-opacity)`                         |

A state never removes or thickens a frame line, so the layout does not shift. Enforced by review, with the gallery
showing each frame in each state.

Conforming, `scss/apps/_compendium-browser.scss:40-43`: the selected tab adds an outline, which takes no space.

Non-conforming: a selected row that gains `border: 2px solid`, which moves its neighbors by a pixel.

## Partials and files

| Item   | Where                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens | `scss/base/_variables.scss`                                                                                                                                                                        |
| Users  | `scss/components/_grid.scss`, `_item-lists.scss`, `_sections.scss`, `_effect-panel.scss`, `_rules-editor.scss`; `scss/features/_traits-rings.scss`, `_wounds.scss`, `_ranks.scss`, `_pc-info.scss` |
| Assets | `assets/borders/brush-08-gray.svg`; core's `ui/parchment.jpg`                                                                                                                                      |
| Color  | Line and surface roles in color.md                                                                                                                                                                 |
| States | states.md                                                                                                                                                                                          |
