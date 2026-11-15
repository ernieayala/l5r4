# Void Point dots

The actor's current Void Points as a row of nine dots under the Void Ring, filled up to the current count. One press
adds a Void Point, a right-press spends one; the count stays between 0 and 9
(`module/sheets/handlers/void-points-handler.js:56`).

| Item        | Detail                                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/actor/_partials/_void-points.hbs` (target), included by `_traits-rings.hbs`. Today written out in `_stats.hbs:219-233` and `_stats-npc.hbs:190-206`                   |
| Parameters  | `value` (`system.rings.void.value`), `dots` (the nine indexes, from the context)                                                                                                 |
| SCSS        | `scss/features/_void-points.scss` (target), holding `_traits-rings.scss:550-590`                                                                                                 |
| Block class | `l5r4-void-points`                                                                                                                                                               |
| Handler     | `BaseActorSheet._onVoidPointsAdjust` (`module/sheets/base-actor-sheet.js:266`), `VoidPointsHandler.adjust` and `.paint` (`module/sheets/handlers/void-points-handler.js:50-110`) |
| Shows in    | PC sheet; NPC sheet when `showNpcVoidPoints` is on (`_stats-npc.hbs:190`)                                                                                                        |
| Game terms  | Void Point, Void Ring (`game-rules/25_rings_and_traits.md, p.78`)                                                                                                                |
| Gallery     | 0, 3, and 9 filled; hovered; focused; light and dark                                                                                                                             |

## Anatomy

| Part  | Element                                                                                      | Class                                                         | Class now                                                  |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Block | `<div>`                                                                                      | `l5r4-void-points`                                            | `void-points` (`_stats.hbs:219`)                           |
| Dots  | `<button type="button" data-action="adjust-void-points" data-value data-tooltip aria-label>` | `l5r4-void-points-dots`                                       | `div.void-points-dots[role=button]` (`_stats.hbs:220-221`) |
| Dot   | `<span data-idx inert>`, nine                                                                | `l5r4-void-point`; `is-filled` when `data-idx` ≤ `data-value` | `span.void-dot` with `-filled` (`_stats.hbs:222-230`)      |
| Label | `<p>`                                                                                        | `l5r4-void-points-label`                                      | `void-points-name` (`_stats.hbs:232`)                      |

The dots are one button, so the nine dots are one target and one tab stop. The dots are `inert`: the button has no
visible text, so its `data-tooltip` and `aria-label` carry the count, from one key.

## Variants

| Variant | Selects it          | Shows                      |
| ------- | ------------------- | -------------------------- |
| PC      | Always rendered     | Dots and label             |
| NPC     | `showNpcVoidPoints` | Dots and label, or nothing |

## States

| State         | Look                                                                              | Markup                                                                      |
| ------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Empty dot     | A ring in `--l5r4-color-void-point`                                               | No `is-filled`                                                              |
| Filled dot    | A disc in `--l5r4-color-void-point`: fill, not color, tells filled from empty     | `is-filled`, set by the template from `value` and by `paint` after a change |
| Hover         | `--l5r4-state-hover-filter` on the dots; dots use `--l5r4-color-void-point-hover` | `:hover`                                                                    |
| Focus-visible | Core's focus ring around the row of dots                                          | `:focus-visible`                                                            |
| Active        | `--l5r4-state-pressed-filter`, `--l5r4-state-pressed-transform`                   | `:active`                                                                   |
| At 0 or 9     | Nothing changes and the press does nothing, as today                              | `data-value="0"` or `"9"`                                                   |
| Read-only     | Core disables the button on a sheet the viewer cannot edit (`button.md` B8)       | Core's `disabled`                                                           |

The template fills the dots from `value`; `paint` repeats it after a change, which updates with `render: false`
(`void-points-handler.js:64-71`). Today the template renders every dot empty and `_paintVoidPointsDots`
(`module/sheets/base-actor-sheet.js:279-281`) fills them after render.

## Tokens

| Token                                                      | Use                               |
| ---------------------------------------------------------- | --------------------------------- |
| `--l5r4-color-void-point`, `--l5r4-color-void-point-hover` | Dot ring and fill, hovered        |
| `--l5r4-size-void-point`                                   | Dot diameter                      |
| `--l5r4-border-width-thick`                                | Dot ring                          |
| `--l5r4-radius-round`                                      | Dot                               |
| `--l5r4-space-4`                                           | Gap between dots; above the block |
| `--l5r4-state-*`                                           | Hover, press, focus               |

Contrast (`foundations/color.md` **Contrast fixes**): `void-point` on the surface is 2.74:1 in dark today and
`void-point-hover` 2.36:1 in light, both against 3; the shared target `#717171` gives 3.22:1 and 3.25:1.

## Keyboard and screen reader

| Input                             | Result                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| Tab                               | Focuses the dots                                                        |
| Enter or Space                    | +1 Void Point, as a click                                               |
| Shift+F10 or the context menu key | -1 Void Point, through the same context action a right-click runs       |
| Screen reader                     | Reads the `aria-label`: "Void Points: 3/5 (click: +1, right-click: -1)" |

Arrow keys do not change the count: that would be new behavior and lands as its own change (Stage 17 decision 10).

## Long text

No text in the dots. The label is "Void Points" on one line under them; a longer translation wraps under the dots and
the block stays its own width (`width: max-content`).

## Rules

| #   | Rule                                                                                                                                   | Enforced by                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| V1  | The dots are one `<button type="button">` whose `data-tooltip` and `aria-label` name Void Points, the count, and the gestures          | `tests/conventions/templates.test.js`; `tests/quench/design-gallery.js`     |
| V2  | Filled and empty differ by fill; hover and press read the state tokens                                                                 | `tests/conventions/styles.test.js` (`foundations/states.md` rule 1); review |
| V3  | Colors come from the Void Point tokens, defined for both themes                                                                        | Stylelint `color-no-hex`; `tests/conventions/styles.test.js`                |
| V4  | `paint` selects the button by `[data-action="adjust-void-points"]` and the dots by `[data-idx]`, never by class                        | ESLint `no-restricted-syntax`                                               |
| V5  | The block is one partial, included once by `_traits-rings.hbs`                                                                         | `tests/conventions/templates.test.js` (markup used twice)                   |
| V6  | The dots keep their size: 12 px, one target for all nine. They exist today, so the 24 px minimum does not apply (Stage 17 decision 16) | Review, in the gallery (`foundations/space-and-size.md` S5)                 |

| #   | Conforming                                                                                                                                                                                                                                                                                                     | Non-conforming                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | `<button type="button" class="l5r4-void-points-dots" data-action="adjust-void-points" data-value="{{value}}" data-tooltip="{{localize "l5r4.ui.mechanics.rings.voidPointsValue" current=value max=max}}" aria-label="{{localize "l5r4.ui.mechanics.rings.voidPointsValue" current=value max=max}}">` (modeled) | `<div class="void-points-dots" data-action="void-points-dots" role="button" title="Left click: +1, Right click: -1">` (`templates/actor/_partials/_stats.hbs:220-221`, `lang/en.json:772`) |
| V2  | `&:hover { filter: var(--l5r4-state-hover-filter); }` (`foundations/states.md` rule 1)                                                                                                                                                                                                                         | `&:hover { border-color: #888; transform: scale(1.2); }` (`scss/features/_traits-rings.scss:578-581`)                                                                                      |
| V3  | `border: var(--l5r4-border-width-thick) solid var(--l5r4-color-void-point);` (modeled)                                                                                                                                                                                                                         | `border: 2px solid #666;` (`scss/features/_traits-rings.scss:573`)                                                                                                                         |
| V4  | `root.querySelector('[data-action="adjust-void-points"]')` (modeled)                                                                                                                                                                                                                                           | `root?.querySelector?.(".void-points-dots")` (`module/sheets/handlers/void-points-handler.js:97`)                                                                                          |
| V5  | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_void-points.hbs" value=system.rings.void.value}}` (modeled)                                                                                                                                                                                             | The nine dots written out in `_stats.hbs:222-230` and again in `_stats-npc.hbs:194-202`                                                                                                    |
| V6  | `block-size: var(--l5r4-size-void-point);` on each dot, as today (`scss/features/_traits-rings.scss:575-576`)                                                                                                                                                                                                  | `min-block-size: var(--l5r4-size-target);` on the button, which adds height under the Void Ring (modeled)                                                                                  |

## Do and don't

| Do                                                    | Don't                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| Fill the dots in the template from `value`            | Render them empty and fill them in JavaScript after each render    |
| Keep the count in the button's tooltip and name       | Make each dot a button; nine tab stops for one number              |
| Spend a Void Point in a roll through the check dialog | Add a spend shortcut to the dots that skips the roll it belongs to |

## Names

| Current                          | Target                             | Why                                                |
| -------------------------------- | ---------------------------------- | -------------------------------------------------- |
| `void-points`                    | `l5r4-void-points`                 | Decision 15                                        |
| `void-points-dots`               | `l5r4-void-points-dots`            | Decision 15                                        |
| `void-dot`, `-filled`            | `l5r4-void-point`, `is-filled`     | Decision 15; state classes are `is-` (naming.md)   |
| `void-points-name`               | `l5r4-void-points-label`           | Decision 15                                        |
| `data-action="void-points-dots"` | `data-action="adjust-void-points"` | Verb first (`docs/code-system/naming.md`)          |
| `.void-points-amount`            | Removed                            | Matches no template (`_traits-rings.scss:257-284`) |

## Keys this page needs

| Key                                       | Value                                                     | For                                  |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| `l5r4.ui.mechanics.rings.voidPointsValue` | Void Points: {current}/{max} (click: +1, right-click: -1) | V1's `data-tooltip` and `aria-label` |

`{max}` is the Void Ring rank the context passes; the dots still show nine, as today.
