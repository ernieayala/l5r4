# Inline control

A row's cluster of icon buttons: edit, remove, post to chat, expand, and the activation toggle on kata, kiho, and
tattoos. In a sheet's item rows the cluster stays out of sight until the pointer is over the row or focus is inside
it, so a long list reads as names and numbers.

| Item        | Detail                                                                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/cards/_partials/_controls.hbs` (edit, remove, post, expand); `templates/cards/_partials/_activate.hbs` (activation toggle)                                                                 |
| Parameters  | `_controls.hbs`: `expandable` (boolean, target; `expand-control.md` X5); the handlers read the row's `data-item-id`. `_activate.hbs`: `active` (boolean, the activation is running)                   |
| SCSS        | `scss/components/_inline-control.scss`, holding `_item-lists.scss:138-143`, `:183-195`, `_forms.scss:33-41`, `_rules-editor.scss:82-84`                                                               |
| Block class | `l5r4-inline-control` on the cluster. Each button keeps core's `inline-control icon`: the system block holds core controls                                                                            |
| Shows in    | Item rows in sheet sections (`cards/*.hbs`, in-sheet branch), NPC attack rows (`_stats-npc.hbs:264-267`), the item sheet's effects tab (`_tab-effects.hbs:17-23`), the PC name field (`_stats.hbs:7`) |
| Gallery     | A row with the cluster at rest, hovered, and focused; each button in every state below                                                                                                                |

`l5r4-inline-control` is the cluster; core's `inline-control` is each button in it. The two names stay apart: the
system class names the block, the core class draws the button.

## Anatomy

| Part              | Element                                                                                             | Class                                              | Class now                                 |
| ----------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Cluster           | `<div>`                                                                                             | `l5r4-inline-control flexrow -gap-xs`              | `controls flexrow -gap-xs`                |
| Edit              | `<button type="button" data-tooltip aria-label>` + `fa-pen-to-square`                               | `inline-control icon`                              | `a.button inline-control icon`, `fa-edit` |
| Remove            | `<button type="button" data-tooltip aria-label>` + `fa-trash`                                       | `inline-control icon`                              | as above                                  |
| Post to chat      | `<button type="button" data-tooltip aria-label>` + `fa-comment`                                     | `inline-control icon`                              | as above                                  |
| Expand            | The expand control (`expand-control.md`)                                                            | `l5r4-expand-control inline-control icon`          | `inline-control icon expandable`          |
| Activation toggle | `<button type="button" aria-pressed data-tooltip aria-label>` + `fa-circle-play` / `fa-circle-stop` | `l5r4-inline-control-activate inline-control icon` | `item-activate` with core `active`        |

Order: the activation toggle in its own cell (when the item has one), then the cluster: edit, remove, post, expand.
The order matches the cards today.

## Variants

| Variant | Selects it                    | Visible                                              | Used at                                       |
| ------- | ----------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Reveal  | `l5r4-inline-control -reveal` | `opacity: 0` until the row is hovered or holds focus | Item rows, NPC attack rows, the PC name field |
| Shown   | `l5r4-inline-control`         | Always                                               | The effects tab rows                          |

## States

| State           | Look                                                                                                 | Markup                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Hidden (reveal) | `opacity: 0`, `pointer-events: none`; the buttons keep their place, so the row does not reflow       | The row is neither `:hover` nor `:focus-within`                 |
| Revealed        | `opacity: 1`, `pointer-events: all`, with no transition (`foundations/motion.md`)                    | Row `:hover` or `:focus-within`                                 |
| Focus-visible   | Core's focus ring on the focused button                                                              | `:focus-visible`                                                |
| Activation on   | `fa-circle-stop`, `--l5r4-color-accent`, tooltip and name from `l5r4.ui.activation.end`              | `aria-pressed="true"`; core's `active` class mirrors it for CSS |
| Activation off  | `fa-circle-play`, the text color, tooltip and name from `l5r4.ui.activation.start`                   | `aria-pressed="false"`                                          |
| Effect on / off | `fa-toggle-on` / `fa-toggle-off`                                                                     | `aria-pressed` on the toggle                                    |
| Disabled        | Core's disabled `.inline-control`; `data-tooltip` says why                                           | `disabled`                                                      |
| Read-only       | Core disables the buttons on a sheet the viewer cannot edit (`button.md` B8)                         | Core's `disabled`                                               |
| Loading         | The pressed button's icon becomes `fa-spinner fa-spin`; the button is disabled until the action ends | `aria-busy="true"`, `disabled`                                  |

## Tokens

| Token                                                     | Use                                   |
| --------------------------------------------------------- | ------------------------------------- |
| `--l5r4-color-accent`                                     | Activation on                         |
| `--l5r4-space-gap-tight`                                  | Gap between buttons (`-gap-xs`)       |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow` | Focus ring                            |
| `--l5r4-state-disabled-opacity`                           | Disabled, where core's does not apply |

## Keyboard and screen reader

| Input          | Result                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tab into a row | The first button takes focus and the cluster shows (`:focus-within`)                                              |
| Tab            | Moves through the buttons in the order above, then out of the row; the cluster hides again                        |
| Enter or Space | Runs the focused button's action                                                                                  |
| Screen reader  | Reads each `aria-label` ("Edit", "Remove", "Post to chat", "Expand"), and "pressed" or "not pressed" for a toggle |

## Long text

No visible text. The cluster has a fixed column (`--l5r4-size-column-controls`, 102 px) in the item row grid, which
holds four 24 px buttons and their gaps. The activation toggle is its own cell before the cluster (`cards/kata.hbs:8`);
the gallery checks at 420 px that the kata, kiho, and tattoo rows keep it on the row's first line.

## Rules

| #   | Rule                                                                                                                          | Enforced by                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| N1  | A rule that reveals the cluster on `:hover` also matches `:focus-within`                                                      | `tests/conventions/styles.test.js` (`foundations/states.md` rule 3)           |
| N2  | Hidden means `opacity: 0`, never `display: none`, so the buttons stay in the tab order and the row keeps its width            | Review                                                                        |
| N3  | Every button follows `icon-button.md`: a `<button>`, `data-tooltip` and `aria-label` from one key, an `inert` `fa-solid` icon | `tests/conventions/templates.test.js`                                         |
| N4  | Behavior rides on `data-action`; no handler binds a control by class                                                          | ESLint `no-restricted-syntax`; `tests/conventions/templates.test.js`          |
| N5  | A toggle states its state with `aria-pressed` and swaps its icon; color is the third cue, never the only one                  | `tests/conventions/templates.test.js` (toggle carries `aria-pressed`); review |
| N6  | The row's controls are one partial; a row never writes its own copy                                                           | `tests/conventions/templates.test.js` (markup used twice)                     |

| #   | Conforming                                                                                                                                                                                                              | Non-conforming                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | `.l5r4-item-row:hover, .l5r4-item-row:focus-within { .l5r4-inline-control.-reveal { opacity: 1; pointer-events: all; } }` (modeled)                                                                                     | `&:hover { .inline-control { opacity: 1; } }` alone (`scss/components/_item-row.scss:138-143`)                                                                     |
| N2  | `opacity: 0; pointer-events: none;` (`scss/components/_item-row.scss:188-189`)                                                                                                                                          | `display: none` on the cluster until hover (modeled)                                                                                                               |
| N3  | `<button type="button" class="inline-control icon" data-action="post-item" data-tooltip="{{localize "l5r4.ui.hints.postToChat"}}" aria-label="{{localize "l5r4.ui.hints.postToChat"}}">` (modeled on `_controls.hbs:4`) | `<a class="button inline-control icon expandable" data-action="item-expand"><i class="fas fa-chevron-down"></i></a>` (`templates/cards/_partials/_controls.hbs:5`) |
| N4  | `data-action="delete-item"` routed by `module/sheets/pc-sheet.js:163`                                                                                                                                                   | `<a class="effect-delete">` bound by class in `module/sheets/handlers/item-effects-handler.js:66-78` (`templates/item/_partials/_tab-effects.hbs:22`)              |
| N5  | `aria-pressed="{{#if active}}true{{else}}false{{/if}}"` beside the `fa-circle-stop` / `fa-circle-play` swap (modeled on `_activate.hbs:3-6`)                                                                            | `<a class="effect-toggle">` with only the icon swap (`templates/item/_partials/_tab-effects.hbs:19-21`)                                                            |
| N6  | `{{> "systems/l5r4-enhanced/templates/cards/_partials/_controls.hbs"}}` (`templates/cards/skill.hbs:32`)                                                                                                                | The edit and remove buttons written out in the NPC attack row (`templates/actor/_partials/_stats-npc.hbs:264-267`)                                                 |

## Do and don't

| Do                                                                     | Don't                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Keep the order: edit, remove, post, expand                             | Move remove to the end, where a fast click meant for expand lands on it |
| Keep the cluster in the row's last column                              | Put a control between the name and the numbers                          |
| Use the shown variant where a list is short and controls are the point | Reveal on hover in a dialog, where there is no row to hover             |

## Names

| Current                                                                               | Target                                                                                   | Why                                                   |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `controls`                                                                            | `l5r4-inline-control -reveal`                                                            | Decision 15                                           |
| `item-activate`                                                                       | `l5r4-inline-control-activate`                                                           | Decision 15                                           |
| `info-group` (`_stats.hbs:7`)                                                         | `l5r4-inline-control -reveal` around the field's controls                                | One reveal rule for rows and fields                   |
| `effect-controls`, `effect-edit`, `effect-toggle`, `effect-delete`                    | `l5r4-inline-control` with `data-action="edit-effect"`, `toggle-effect`, `delete-effect` | N4                                                    |
| `data-action="item-edit"`, `item-delete`, `item-chat`, `item-expand`, `item-activate` | `edit-item`, `delete-item`, `post-item`, `expand-item`, `toggle-activation`              | Verb first; `delete-item` and `post-*` from naming.md |
| `fa-edit`                                                                             | `fa-pen-to-square`                                                                       | `foundations/iconography.md` rule 2                   |

The cluster sits only in the in-sheet branch of `cards/*.hbs`, so no posted chat card holds it and none of its names
is fixed.

## Keys this page needs

| Key                     | Value          | For                                                          |
| ----------------------- | -------------- | ------------------------------------------------------------ |
| `l5r4.ui.common.toggle` | Turn on or off | The effect toggle, which has no name (`_tab-effects.hbs:19`) |

`l5r4.ui.common.delete` keeps its key; its value becomes "Remove" (`content/voice.md` **Remove, not Delete**).
