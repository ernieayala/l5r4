# Expand control

An icon button that shows or hides content in place: a section's body, or an item row's details (description, special rules, Mastery abilities). The section's state is stored per user and actor; a row's lasts until the sheet renders again.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_expand.hbs`, which `templates/actor/_partials/_section-title.hbs` includes for a section with `expand=true`; the row's expand control is the last button of `templates/cards/_partials/_controls.hbs` |
| Parameters | `_expand.hbs`: `collapsed` (boolean, from `collapsedSections.<scope>`). `_controls.hbs`: `expandable` (boolean, the row has details), which each card passes with its root's `-expandable` test |
| SCSS | None of its own. `_section.scss` hides a collapsed body |
| Block class | `l5r4-expand-control`, beside core's `inline-control icon` |
| Shows in | Every collapsible section title; every item row with details |
| Handlers | Section: `ItemCrudHandler.updateSectionCollapsed` (`module/sheets/handlers/item-crud-handler.js`). Row: `ItemCrudHandler.updateItemExpanded` (`module/sheets/handlers/item-crud-handler.js`) |
| Gallery | A section and a row, each open and closed, at rest and focused |

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Button | `<button type="button" aria-expanded data-tooltip aria-label>` | `l5r4-expand-control inline-control icon` |
| Icon | `<i class="fa-solid fa-angle-down" inert>` closed, `fa-angle-up` open | core Font Awesome |

## Variants

| Variant | Selects it | Controls | State stored |
| --- | --- | --- | --- |
| Section | `data-action="expand-section"` in a title bar | The section's body | User flag per actor and the title bar's `data-scope`, through `updateSectionCollapsed` (`module/services/section-state.js`) |
| Row | `data-action="expand-item"` in a row | The row's `l5r4-item-row-details` cell | None: the next render shows the row closed |

A row with no details renders no expand control (the row lacks `-expandable`, X5).

## States

| State | Look | Markup |
| --- | --- | --- |
| Closed | `fa-angle-down` | `aria-expanded="false"`; `is-collapsed` on the section's title bar |
| Open | `fa-angle-up` | `aria-expanded="true"`; `is-expanded` on the row |
| Hover, active | Core's inline control looks | `:hover`, `:active` |
| Focus-visible | Core's focus ring | `:focus-visible` |
| Read-only | Core disables it on a sheet the viewer cannot edit; that viewer has no actions bound (`button.md` B8) | Core's `disabled` |

The render shows the stored state: a section stored as collapsed renders `fa-angle-down` and `aria-expanded="false"`. The handler swaps the icon and the attribute on click, then stores the state.

## Tokens

None of its own: core's `.inline-control` and the enclosing title bar's `--l5r4-color-text-on-header`. Open and close switch at once (`foundations/motion.md`).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Focuses the control; a row's control shows with the row's cluster on `:focus-within` (`inline-control.md`) |
| Enter or Space | Opens or closes |
| Screen reader | "Expand, button, collapsed" or "expanded", from `aria-label` and `aria-expanded` |

## Long text

No visible text. What it reveals follows its own component: a section body, or the row details cell, which spans every column and wraps (`item-row.md`).

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| X1 | The control carries `aria-expanded` and the render sets it from the stored state | `tests/conventions/templates.test.js` (an expand toggle carries `aria-expanded`) |
| X2 | The icon is `fa-angle-down` closed and `fa-angle-up` open; `fa-chevron-*` means stepping a rank | `tests/conventions/design-system.test.js` (icon table); review |
| X3 | The control has a name and a tooltip: `aria-label` and `data-tooltip`, both `l5r4.ui.common.expand` | `tests/conventions/templates.test.js`; `tests/quench/design-gallery.js` |
| X4 | The handler finds its section by `data-scope` and its row by `data-item-id`, never by class | ESLint `no-restricted-syntax` |
| X5 | A row renders the control only when it has details | Review |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| X1 | The `foundations/states.md` rule 4 example: `aria-expanded="{{#if collapsed}}false{{else}}true{{/if}}"` | `<a class="button inline-control icon" data-action="section-expand">` with no state (modeled) |
| X2 | `<i class="fa-solid {{#if collapsed}}fa-angle-down{{else}}fa-angle-up{{/if}}" inert></i>` (`templates/actor/_partials/_expand.hbs`) | `<i class="fa-solid fa-angle-down" inert></i>` whatever the stored state (modeled) |
| X3 | `data-tooltip="{{localize "l5r4.ui.common.expand"}}" aria-label="{{localize "l5r4.ui.common.expand"}}"` | An expand control with no name (modeled) |
| X4 | `element.closest("[data-scope]")`, as in `ItemCrudHandler.getSectionItemType` (`module/sheets/handlers/item-crud-handler.js`) | `element.closest(".section-title")` (modeled) |
| X5 | `{{#if expandable}}` around the control (`templates/cards/_partials/_controls.hbs`), passed `expandable=(or system.description system.specialRules)` (`templates/cards/kata.hbs`) | The control rendered on every row and hidden by a style (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Render the icon that matches the stored state | Render one icon and rely on the click to correct it |
| Keep the control last in its title bar or cluster | Put it where a click meant for another control lands on it |
| Toggle the state at once | Animate the body open; motion.md keeps expand instant |

## Names

The actions are `expand-section` and `expand-item`, verb first (`docs/code-system/naming.md`); the control's name is `l5r4.ui.common.expand`, "Expand", which `foundations/states.md` rule 4 lists. `-expandable` on a posted item card's root is a fixed name (Stage 17 decision 2): it stays on the row, see `item-row.md`.
