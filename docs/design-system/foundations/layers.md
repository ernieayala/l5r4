# Layers

Stacking order inside the system's components, placed against core's page layers. Four tokens replace the five literal
`z-index` values in `scss/`.

## Core's layers

Core sets its page layers on `body` in `public/css/foundry2.css:325-332`. The system never sets one of these and never
writes a value at or above `--z-index-app`.

| Core variable            | Value | Holds                                                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------- |
| `--z-index-background`   | -1    | The page background                                                                               |
| `--z-index-canvas`       | 0     | The game canvas, where floating Wound and Void Point numbers and Sequencer animations are drawn   |
| `--z-index-app`          | 30    | Core UI frames                                                                                    |
| `--z-index-ui`           | 60    | The sidebar, hotbar, and controls                                                                 |
| `--z-index-window`       | 100   | Every `.application` window: sheets, the effect panel, the compendium browser, `DialogV2` dialogs |
| `--z-index-tooltip`      | 9999  | Tooltips and context menus                                                                        |
| `--z-index-notification` | 99999 | Notifications                                                                                     |

Every `.application` is `position: absolute` with `z-index: var(--z-index-window)` (`foundry2.css:7054-7056`), so each
window is its own stacking context. A system layer inside a sheet orders elements within that window and never reaches
another window, the sidebar, or a tooltip.

## Tokens

Declared on `:root` in `scss/base/_variables.scss`. The values are the ones the code uses now, so the order on screen
stays the same.

| Token                    | Value | Use                                                                                   | Read at                                                                 |
| ------------------------ | ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--l5r4-layer-behind`    | -1    | A decorative backdrop drawn behind its block's content: the brush frame of the header | The `&::before` of `.l5r4-pc-info` (`scss/features/_pc-info.scss`)      |
| `--l5r4-layer-raised`    | 1     | The face of a Ring rank medallion, above the medallion's own parchment `::before`     | `.l5r4-ring-rank-face` (`scss/features/_traits-rings.scss`)             |
| `--l5r4-layer-medallion` | 10    | A Ring rank medallion where it overlaps its Ring image                                | `.l5r4-ring-rank` (`scss/features/_traits-rings.scss`)                  |
| `--l5r4-layer-control`   | 11    | Rank step arrows, which slide out over the medallion and the Trait row                | The arrows of `@mixin rank-arrows` (`scss/features/_traits-rings.scss`) |

## Rules

### 1. A `z-index` reads a layer token

Enforced by `tests/conventions/styles.test.js` (no literal `z-index` outside `base/`; every token used is declared).

Conforming, modeled on `.l5r4-ring-rank` (`scss/features/_traits-rings.scss`):

```scss
.l5r4-ring-rank {
  position: relative;
  z-index: var(--l5r4-layer-medallion);
}
```

Non-conforming (modeled):

```scss
.trait-increase,
.trait-decrease {
  z-index: 11;
}
```

### 2. Windows, tooltips, and canvas effects take core's layer

The effect panel, the compendium browser, the managers, and every dialog are ApplicationV2 windows: core gives them
`--z-index-window` and brings the focused one to the front. Floating numbers go through
`canvas.interface.createScrollingText` in `startScrollingText` (`module/services/scrolling-text.js`) and status animations through
Sequencer; both draw on the canvas, which has no CSS stacking. The system sets no `z-index` on a window root, a
tooltip, or a chat message. Enforced by `tests/conventions/styles.test.js` (rule 1: any `z-index` reads a layer token,
and every layer token sits below 30) and review for the selector it lands on.

Conforming, `EffectPanel.DEFAULT_OPTIONS` (`module/apps/effect-panel.js`): the panel's options set an id, classes, a
window icon, and a position, and no stacking.

Non-conforming, modeled on a window root:

```scss
.l5r4-effect-panel {
  z-index: 200;
}
```

### 3. A new layer is a new token, in order

A component that needs another layer adds a token to the table above, between the two it sits between, with a value
below `--z-index-app` (30). It never adds 1 to a neighbour's value inline. Enforced by
`tests/conventions/styles.test.js` (every declared token is documented on a `foundations/` page) and review for the
order.

Conforming:

```scss
:root {
  --l5r4-layer-control: 11;
}
```

Non-conforming:

```scss
.l5r4-trait-rank-arrow {
  z-index: calc(var(--l5r4-layer-medallion) + 1);
}
```

### 4. A layer token stays inside its component's stacking context

`--l5r4-layer-behind` puts a backdrop behind content only while its block creates no stacking context of its own:
`.l5r4-pc-info` (`scss/features/_pc-info.scss`) is `position: relative` with no `z-index`. Giving such a block a
`z-index`, `isolation`, `opacity` below 1, or a `transform` moves the backdrop in front of the block's background and
changes the look. Enforced by review; the gallery shows the header in both themes.

Conforming, `.l5r4-pc-info` (`scss/features/_pc-info.scss`): the block is `position: relative`; only its `::before`
takes a layer.

Non-conforming:

```scss
.l5r4-pc-info {
  isolation: isolate;
  position: relative;
}
```

## Partials and files

| Item   | Where                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Tokens | `scss/base/_variables.scss`                                                                             |
| Users  | `scss/features/_pc-info.scss`, `scss/features/_traits-rings.scss`                                       |
| Markup | `templates/actor/_partials/_stats.hbs` and `_stats-npc.hbs` (the header block and the Rings and Traits) |
