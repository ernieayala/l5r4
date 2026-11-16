# Sort header

The column header row above an item list. Each sortable column head is a button: the first press sorts the list by that column ascending, a second press on the same column sorts descending, and the choice is stored per user, actor, and list.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_sort-header.hbs`, included by every section partial, the NPC attacks (`_stats-npc.hbs`), and the XP manager's ledger and purchases (`templates/apps/xp-manager.hbs`) |
| Parameters | `scope` (the list's sort scope, its `data-scope`, `skills`; left out for a header that does not sort), `type` (the row subtype for the columns), `columns` (the list's heads: an array of `{ key, label }`, `key` left out for a head that does not sort, both left out for the spacer) |
| Columns | `SORT_COLUMNS` in `module/config/sort-keys.js`, one entry per list; the sheets and the XP manager pass it as `sortColumns`. `SORT_KEYS` holds each list's keys, read from the same entries, and the sort code checks a clicked or stored key against it |
| SCSS | `scss/components/_sort-header.scss` (target), holding the header rules now nested under `.l5r4-item-row-list` as `&.l5r4-sort-header` (`scss/components/_item-row.scss`) |
| Block class | `l5r4-sort-header`, on the header list |
| Handler | `SortHandler.updateSortPref` and `updateSortIndicators` (`module/sheets/handlers/sort-handler.js`), the XP manager's `sort-items` action (`module/apps/xp-manager.js`); keys allowed per scope in `SORT_KEYS` (`module/config/sort-keys.js`) |
| Shows in | Every list section that has columns; the XP manager's purchases list |
| Gallery | A header with no sort, sorted ascending, sorted descending, a column head focused, a long column label |

## Anatomy

| Part | Element | Class | Where the code differs |
| --- | --- | --- | --- |
| Header list | `<section data-sort-header data-scope>` | `l5r4-sort-header l5r4-item-row-list -<subtype>` |  |
| Header row | `<div>` | `l5r4-item-row` |  |
| Column head | `<button type="button" data-action="sort-items" data-sort-by aria-pressed>` | `l5r4-sort-header-button` |  |
| Direction | `<i class="fa-solid fa-sort-up" inert>` or `fa-sort-down`, after the label, active column only | core Font Awesome | No icon: `is-active` and `data-dir` with no style |
| Plain head | `<span>` for a column that does not sort | `l5r4-sort-header-label` | `<span>{{localize label}}</span>` (`templates/actor/_partials/_sort-header.hbs`), no class |
| Spacer | `<span>` over the controls column | none |  |

The header is an item list of one row, so its columns line up with the rows below through the same `-<subtype>` column set (`item-row.md`).

## Variants

| Variant | Selects it | Used at |
| --- | --- | --- |
| Sortable | Column heads are buttons | Skills, weapons, spells, techniques, items, XP purchases |
| Plain | Every head a `l5r4-sort-header-label` | NPC attacks (`SORT_COLUMNS.npcAttacks`), XP ledger (`SORT_COLUMNS.xpLedger`) |

## States

| State | Look | Markup |
| --- | --- | --- |
| Unsorted head | The label in the header text color | `aria-pressed="false"` |
| Sorted | The label in bold with the direction icon after it | `aria-pressed="true"`, `data-dir="asc"` or `"desc"`; `is-active` mirrors it for CSS |
| Hover | `--l5r4-state-hover-filter` | `:hover` |
| Focus-visible | Core's focus ring | `:focus-visible` |
| Read-only | Core disables the heads on a sheet the viewer cannot edit; that viewer has no actions bound (`button.md` B8) | Core's `disabled` |

The render sets the stored sort on the active head; `updateSortIndicators` only repeats it after the handler stores a new one, so the first paint already shows it. The code differs: the partial renders every head `aria-pressed="false"`, and the handler sets `aria-pressed`, `is-active`, and `data-dir` on the sorted head after a click (the NPC sheet repeats it on render for its Skills).

## Tokens

| Token                                                     | Use                  |
| --------------------------------------------------------- | -------------------- |
| `--l5r4-color-panel`                                      | Header background    |
| `--l5r4-color-line`, `--l5r4-border-width-thin`           | Header frame         |
| `--l5r4-color-text`                                       | Header text          |
| `--l5r4-space-card`                                       | Header padding       |
| `--l5r4-state-hover-filter`                               | Hover on a head      |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow` | Focus ring on a head |

The header text reads core's `--table-header-text-color`, set by `&.l5r4-sort-header` (`scss/components/_item-row.scss`); the target reads `--l5r4-color-text`, the color `--l5r4-color-panel` is checked against (`foundations/color.md`).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Moves through the sortable heads in column order |
| Enter or Space | Sorts by that column; again reverses the order |
| Screen reader | Reads the head's label and "pressed" on the sorted column; its `data-tooltip` shows the direction ("Sorted ascending") |

## Long text

A column label stays on one line; one that does not fit its column truncates with an ellipsis and keeps its full text in `data-tooltip`. Labels are the column's name in one or two words.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| H1 | A sortable head is a `<button type="button">`; the sorted one carries `aria-pressed="true"` and shows a direction icon | `tests/conventions/templates.test.js` (native controls; toggle carries `aria-pressed`) |
| H2 | The direction shows by icon and weight as well as by color | Review, in the gallery |
| H3 | Each head's sort key is `data-sort-by`, one of the scope's keys in `module/config/sort-keys.js` | `tests/conventions/actions.test.js` (action has a handler); review for the key |
| H4 | Two heads never share a sort key | Review |
| H5 | The handler finds the header by `[data-scope]`, never by `.item-list.-header` | ESLint `no-restricted-syntax` |
| H6 | The header is one partial; sections pass their columns | `tests/conventions/templates.test.js` (markup used twice) |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| H1 | `<button type="button" class="l5r4-sort-header-button" data-action="sort-items" data-sort-by="{{key}}" aria-pressed="false">` (`templates/actor/_partials/_sort-header.hbs`); the handler sets `aria-pressed="true"` on the sorted head | `<a class="item-sort-by" data-action="item-sort-by" data-sortby="name">` (modeled) |
| H2 | Bold label and `fa-sort-up` on the sorted head (modeled) | `is-active` and `data-dir` set by `SortHandler.#updateHeaderIndicators` (`module/sheets/handlers/sort-handler.js`) with no style anywhere in `scss/`: the sort is invisible |
| H3 | `{ key: "mastery", label: "l5r4.ui.sheets.mastery" }` in `SORT_COLUMNS.spells` (`module/config/sort-keys.js`), rendered as `data-sort-by="mastery"` | `data-sortby` run together (modeled) |
| H4 | One key per column | Attack and Damage both `key: "damage"` (`SORT_COLUMNS.weapons`, `module/config/sort-keys.js`) |
| H5 | ``root.querySelector(`[data-sort-header][data-scope="${scope}"]`)`` in `SortHandler.updateSortIndicators` (`module/sheets/handlers/sort-handler.js`) | ``root.querySelector(`.item-list.-header[data-scope="${scope}"]`)`` (modeled) |
| H6 | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_sort-header.hbs" scope="skills" type="skill" columns=@root.sortColumns.skills}}` (`templates/actor/_partials/_skill-section.hbs`) | The header written out in a section partial (modeled) |

H4's fix gives Attack its own key, which changes what the column sorts by: a behavior change, filed as its own issue (Stage 17 decision 10).

## Do and don't

| Do | Don't |
| --- | --- |
| Make a column sortable when players look rows up by it | Make the controls column sortable |
| Keep the spacer over the controls column | Drop it, which shifts every head one column left |
| Store the sort per user, as the handler does | Sort for every viewer of the actor |

## Names

The action is `sort-items`, verb first (`docs/code-system/naming.md`), and its key attribute `data-sort-by`, kebab-case words (naming.md).

## Keys this page needs

| Key                               | Value             | For                               |
| --------------------------------- | ----------------- | --------------------------------- |
| `l5r4.ui.common.sortedAscending`  | Sorted ascending  | `data-tooltip` of the sorted head |
| `l5r4.ui.common.sortedDescending` | Sorted descending | `data-tooltip` of the sorted head |

`fa-sort-up` and `fa-sort-down` are the "Direction of the sorted column" row in `foundations/iconography.md` rule 3.
