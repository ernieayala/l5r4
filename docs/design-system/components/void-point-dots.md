# Void Point dots

The actor's current Void Points as a row of nine dots under the Void Ring, filled up to the current count. One press adds a Void Point, a right-press spends one; the count stays between 0 and 9 (`VoidPointsHandler.updateVoidPoints` (`module/sheets/handlers/void-points-handler.js`)).

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_void-points.hbs`, included by `_traits-rings.hbs` |
| Parameters | `value` (`system.rings.void.value`), `max` (`system.rings.void.rank`) |
| SCSS | `scss/features/_void-points.scss` (target), holding `.l5r4-void-points` (`scss/features/_traits-rings.scss`) and the dot rules after it |
| Block class | `l5r4-void-points` |
| Handler | `BaseActorSheet#_onVoidPointsAdjust` (`module/sheets/base-actor-sheet.js`), then `VoidPointsHandler.updateVoidPoints` and `VoidPointsHandler.updateVoidDots` (`module/sheets/handlers/void-points-handler.js`) |
| Shows in | PC sheet; NPC sheet when `showNpcVoidPoints` is on: `showVoidPoints=@root.showNpcVoidPoints` (`templates/actor/_partials/_stats-npc.hbs`) |
| Game terms | Void Point, Void Ring (`game-rules/25_rings_and_traits.md, p.78`) |
| Gallery | 0, 3, and 9 filled; hovered; focused; light and dark |

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Block | `<div>` | `l5r4-void-points` |
| Dots | `<button type="button" data-action="adjust-void-points" data-value data-tooltip aria-label>` | `l5r4-void-points-dots` |
| Dot | `<span data-idx inert>`, nine | `l5r4-void-point`; `is-filled` when `data-idx` ≤ `data-value` |
| Label | `<p>` | `l5r4-void-points-label` |

The dots are one button, so the nine dots are one target and one tab stop. The dots are `inert`: the button has no visible text, so its `data-tooltip` and `aria-label` carry the count, from one key.

## Variants

| Variant | Selects it          | Shows                      |
| ------- | ------------------- | -------------------------- |
| PC      | Always rendered     | Dots and label             |
| NPC     | `showNpcVoidPoints` | Dots and label, or nothing |

## States

| State | Look | Markup |
| --- | --- | --- |
| Empty dot | A ring in `--l5r4-color-void-point` | No `is-filled` |
| Filled dot | A disc in `--l5r4-color-void-point`: fill, not color, tells filled from empty | `is-filled`, set by the template from `value` and by `updateVoidDots` after a change |
| Hover | `--l5r4-state-hover-filter` on the dots; dots use `--l5r4-color-void-point-hover` | `:hover` |
| Focus-visible | Core's focus ring around the row of dots | `:focus-visible` |
| Active | `--l5r4-state-pressed-filter`, `--l5r4-state-pressed-transform` | `:active` |
| At 0 or 9 | Nothing changes and the press does nothing | `data-value="0"` or `"9"` |
| Read-only | Core disables the button on a sheet the viewer cannot edit (`button.md` B8) | Core's `disabled` |

The template fills the dots from `value`; `updateVoidDots` repeats it, the tooltip and name included, after a change, which `VoidPointsHandler.updateVoidPoints` (`module/sheets/handlers/void-points-handler.js`) saves with `render: false`.

## Tokens

| Token                                                      | Use                               |
| ---------------------------------------------------------- | --------------------------------- |
| `--l5r4-color-void-point`, `--l5r4-color-void-point-hover` | Dot ring and fill, hovered        |
| `--l5r4-size-void-point`                                   | Dot diameter                      |
| `--l5r4-border-width-thick`                                | Dot ring                          |
| `--l5r4-radius-round`                                      | Dot                               |
| `--l5r4-space-4`                                           | Gap between dots; above the block |
| `--l5r4-state-*`                                           | Hover, press, focus               |

Contrast (`foundations/color.md` **Contrast fixes**): `void-point` in dark and `void-point-hover` in light share `#717171`, 3.22:1 and 3.25:1 on the surface, against a minimum of 3.

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Focuses the dots |
| Enter or Space | +1 Void Point, as a click |
| Shift+F10 or the context menu key | -1 Void Point, through the same context action a right-click runs |
| Screen reader | Reads the `aria-label`: "Void Points: 3/5 (click: +1, right-click: -1)" |

Arrow keys do not change the count (Stage 17 decision 10).

## Long text

No text in the dots. The label is "Void Points" on one line under them; a longer translation wraps under the dots and the block stays its own width (`width: max-content`).

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| V1 | The dots are one `<button type="button">` whose `data-tooltip` and `aria-label` name Void Points, the count, and the gestures | `tests/conventions/templates.test.js`; `tests/quench/design-gallery.js` |
| V2 | Filled and empty differ by fill; hover and press read the state tokens | `tests/conventions/styles.test.js` (`foundations/states.md` rule 1); review |
| V3 | Colors come from the Void Point tokens, defined for both themes | Stylelint `color-no-hex`; `tests/conventions/styles.test.js` |
| V4 | `updateVoidDots` selects the button by `[data-action="adjust-void-points"]` and the dots by `[data-idx]`, never by class | ESLint `no-restricted-syntax` |
| V5 | The block is one partial, included once by `_traits-rings.hbs` | `tests/conventions/templates.test.js` (markup used twice) |
| V6 | The dots keep their size: 12 px, one target for all nine; the 24 px minimum does not apply to them (Stage 17 decision 16) | Review, in the gallery (`foundations/space-and-size.md` S5) |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| V1 | `data-tooltip` and `aria-label` both `{{localize "l5r4.ui.mechanics.rings.voidPointsValue" current=value max=max}}` (`templates/actor/_partials/_void-points.hbs`) | "Click: +1, right-click: -1", which names neither Void Points nor the count (modeled) |
| V2 | `&:hover { filter: var(--l5r4-state-hover-filter); }` (`foundations/states.md` rule 1) | `&:hover { border-color: #888; transform: scale(1.2); }` (modeled) |
| V3 | `border: var(--l5r4-border-width-thick) solid var(--l5r4-color-void-point);` (modeled) | `border: 2px solid #666;` (modeled) |
| V4 | `root?.querySelector?.("[data-action='adjust-void-points']")` in `VoidPointsHandler.updateVoidDots` (`module/sheets/handlers/void-points-handler.js`) | `root?.querySelector?.(".void-points-dots")` (modeled) |
| V5 | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_void-points.hbs" value=system.rings.void.value max=system.rings.void.rank}}` (`templates/actor/_partials/_traits-rings.hbs`) | The nine dots written out in each sheet's header (modeled) |
| V6 | `block-size: var(--l5r4-size-void-point);` on each dot, the size `.l5r4-void-point` (`scss/features/_traits-rings.scss`) sets | `min-block-size: var(--l5r4-size-target);` on the button, which adds height under the Void Ring (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Fill the dots in the template from `value` | Render them empty and fill them in JavaScript after each render |
| Keep the count in the button's tooltip and name | Make each dot a button; nine tab stops for one number |
| Spend a Void Point in a roll through the check dialog | Add a spend shortcut to the dots that skips the roll it belongs to |

## Names

The action is `adjust-void-points`, verb first (`docs/code-system/naming.md`); a filled dot's state class is `is-filled` (state classes are `is-`, naming.md).

`l5r4.ui.mechanics.rings.voidPointsValue` reads "Void Points: {current}/{max} (click: +1, right-click: -1)"; `{max}` is the Void Ring rank, and the dots show nine.
