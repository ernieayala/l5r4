# Inline control

A row's cluster of icon buttons: edit, remove, post to chat, expand, and the activation toggle on kata, kiho, and tattoos. In a sheet's item rows the cluster stays out of sight until the pointer is over the row or focus is inside it, so a long list reads as names and numbers.

| Item | Detail |
| --- | --- |
| Partial | `templates/cards/_partials/_controls.hbs` (edit, remove, post, expand); `templates/cards/_partials/_activate.hbs` (activation toggle) |
| Parameters | `_controls.hbs`: `expandable` (boolean, target; `expand-control.md` X5); the handlers read the row's `data-item-id`. `_activate.hbs`: `active` (boolean, the activation is running) |
| SCSS | `scss/components/_inline-control.scss` (the activation toggle); the reveal rules sit in `.l5r4-item-row` (`scss/components/_item-row.scss`), the effects tab cluster in `.l5r4-effect-list` (`scss/layout/_item-layout.scss`) |
| Block class | `l5r4-inline-control` on the cluster. Each button keeps core's `inline-control icon`: the system block holds core controls |
| Shows in | Item rows in sheet sections (`cards/*.hbs`, in-sheet branch), NPC attack rows (`data-action="edit-attack"` (`templates/actor/_partials/_stats-npc.hbs`)), the item sheet's effects tab (`l5r4-effect-list` (`templates/item/_partials/_tab-effects.hbs`)), the emphasis manager's rows (`templates/apps/emphasis-manager.hbs`) |
| Gallery | A row with the cluster at rest, hovered, and focused; each button in every state below |

`l5r4-inline-control` is the cluster; core's `inline-control` is each button in it. The two names stay apart: the system class names the block, the core class draws the button.

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Cluster | `<div>` | `l5r4-inline-control flexrow -gap-xs`, with `-reveal` in a sheet's rows |
| Edit | `<button type="button" data-tooltip aria-label>` + `fa-pen-to-square` | `inline-control icon` |
| Remove | `<button type="button" data-tooltip aria-label>` + `fa-trash` | `inline-control icon` |
| Post to chat | `<button type="button" data-tooltip aria-label>` + `fa-comment` | `inline-control icon` |
| Expand | The expand control (`expand-control.md`) | `l5r4-expand-control inline-control icon` |
| Activation toggle | `<button type="button" aria-pressed data-tooltip aria-label>` + `fa-circle-play` / `fa-circle-stop` | `l5r4-inline-control-activate inline-control icon`, with core `active` when on |

The item sheet's effects tab (`templates/item/_partials/_tab-effects.hbs`) differs: its cluster is `flexrow -gap-md flex0 l5r4-inline-control`, and its buttons are `l5r4-effect-list-button` in place of core's `inline-control icon`.

Order: the activation toggle in its own cell (when the item has one), then the cluster: edit, remove, post, expand.

## Variants

| Variant | Selects it | Visible | Used at |
| --- | --- | --- | --- |
| Reveal | `l5r4-inline-control -reveal` | `opacity: 0` until the row is hovered or holds focus | Item rows, NPC attack rows |
| Shown | `l5r4-inline-control` | Always | The effects tab rows, the emphasis manager's rows |

## States

| State | Look | Markup |
| --- | --- | --- |
| Hidden (reveal) | `opacity: 0`, `pointer-events: none`; the buttons keep their place, so the row does not reflow | The row is neither `:hover` nor `:focus-within` |
| Revealed | `opacity: 1`, `pointer-events: all`, with no transition (`foundations/motion.md`) | Row `:hover` or `:focus-within` |
| Focus-visible | Core's focus ring on the focused button | `:focus-visible` |
| Activation on | `fa-circle-stop`, `--l5r4-color-accent`, tooltip and name from `l5r4.ui.activation.end` | `aria-pressed="true"`; core's `active` class mirrors it for CSS |
| Activation off | `fa-circle-play`, the text color, tooltip and name from `l5r4.ui.activation.start` | `aria-pressed="false"` |
| Effect on / off | `fa-toggle-on` / `fa-toggle-off` | `aria-pressed` on the toggle |
| Disabled | Core's disabled `.inline-control`; `data-tooltip` says why | `disabled` |
| Read-only | Core disables the buttons on a sheet the viewer cannot edit (`button.md` B8) | Core's `disabled` |
| Loading | The pressed button's icon becomes `fa-spinner fa-spin`; the button is disabled until the action ends | `aria-busy="true"`, `disabled` |

## Tokens

| Token | Use |
| --- | --- |
| `--l5r4-color-accent` | Activation on |
| `--l5r4-space-gap-tight` | Gap between buttons (`-gap-xs`), outside item rows |
| `--l5r4-space-gap-controls` | Gap between buttons in an item row (2 px) |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow` | Focus ring |
| `--l5r4-state-disabled-opacity` | Disabled, where core's does not apply |

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab into a row | The first button takes focus and the cluster shows (`:focus-within`) |
| Tab | Moves through the buttons in the order above, then out of the row; the cluster hides again |
| Enter or Space | Runs the focused button's action |
| Screen reader | Reads each `aria-label` ("Edit", "Remove", "Post to chat", "Expand"), and "pressed" or "not pressed" for a toggle |

## Long text

No visible text. The cluster has a fixed column (`--l5r4-size-column-controls`, 102 px) in the item row grid, which holds four 24 px buttons and their gaps. In an item row the cluster departs from `-gap-xs`: it reads `--l5r4-space-gap-controls`, 2 px, since `-gap-xs` (4 px) would make the four buttons 108 px wide and wrap them (`foundations/space-and-size.md`, literal sizes that leave the scale). The activation toggle is its own cell before the cluster (`{{> "systems/l5r4-enhanced/templates/cards/_partials/_activate.hbs"}}` (`templates/cards/kata.hbs`)); the gallery checks at the sheet's default width that the kata, kiho, and tattoo rows keep it on the row's first line.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| N1 | A rule that reveals the cluster on `:hover` also matches `:focus-within` | `tests/conventions/styles.test.js` (`foundations/states.md` rule 3) |
| N2 | Hidden means `opacity: 0`, never `display: none`, so the buttons stay in the tab order and the row keeps its width | Review |
| N3 | Every button follows `icon-button.md`: a `<button>`, `data-tooltip` and `aria-label` from one key, an `inert` `fa-solid` icon | `tests/conventions/templates.test.js` |
| N4 | Behavior rides on `data-action`; no handler binds a control by class | ESLint `no-restricted-syntax`; `tests/conventions/templates.test.js` |
| N5 | A toggle states its state with `aria-pressed` and swaps its icon; color is the third cue, never the only one | `tests/conventions/templates.test.js` (toggle carries `aria-pressed`); review |
| N6 | The row's controls are one partial; a row never writes its own copy | `tests/conventions/templates.test.js` (markup used twice) |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| N1 | The `&:hover` and `&:focus-within` rule that shows `.inline-control` in `.l5r4-item-row` (`scss/components/_item-row.scss`) | `&:hover { .inline-control { opacity: 1; } }` alone (modeled) |
| N2 | `opacity: 0` and `pointer-events: none` on `.inline-control` in `.l5r4-item-row` (`scss/components/_item-row.scss`) | `display: none` on the cluster until hover (modeled) |
| N3 | `<button type="button" class="inline-control icon" data-action="post-item" data-tooltip="{{localize "l5r4.ui.hints.postToChat"}}" aria-label="{{localize "l5r4.ui.hints.postToChat"}}">` (`templates/cards/_partials/_controls.hbs`) | `<a class="button inline-control icon expandable" data-action="item-expand"><i class="fas fa-chevron-down"></i></a>` (modeled) |
| N4 | `data-action="delete-item"` routed by `BaseActorSheet.CLICK_ACTIONS` (`module/sheets/base-actor-sheet.js`) | An effect control bound by a hand-added listener in place of the sheet's `DEFAULT_OPTIONS.actions` (modeled) |
| N5 | `aria-pressed="{{#if active}}true{{else}}false{{/if}}"` (`templates/cards/_partials/_activate.hbs`) beside the `fa-circle-stop` / `fa-circle-play` swap | A toggle with only the icon swap (modeled); the effect toggle carries `aria-pressed` (`templates/item/_partials/_tab-effects.hbs`) |
| N6 | `{{> "systems/l5r4-enhanced/templates/cards/_partials/_controls.hbs"}}` (`templates/cards/skill.hbs`) | The edit and remove buttons written out in the NPC attack row (`data-action="edit-attack"` (`templates/actor/_partials/_stats-npc.hbs`)) |

## Do and don't

| Do | Don't |
| --- | --- |
| Keep the order: edit, remove, post, expand | Move remove to the end, where a fast click meant for expand lands on it |
| Keep the cluster in the row's last column | Put a control between the name and the numbers |
| Use the shown variant where a list is short and controls are the point | Reveal on hover in a dialog, where there is no row to hover |

## Names

The row actions are `edit-item`, `delete-item`, `post-item`, `expand-item`, and `toggle-activation`; the effects tab's are `create-effect`, `edit-effect`, `toggle-effect`, and `delete-effect`, routed by the item sheet's `DEFAULT_OPTIONS.actions` (N4). The effect toggle's name is `l5r4.ui.common.toggle` ("Turn on or off"), and `l5r4.ui.common.delete` reads "Remove" (`content/voice.md` **Remove, not Delete**).

The cluster sits only in the in-sheet branch of `cards/*.hbs`, so no posted chat card holds it and none of its names is fixed.
