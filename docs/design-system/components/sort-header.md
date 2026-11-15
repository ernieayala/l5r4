# Sort header

The column header row above an item list. Each sortable column head is a button: the first press sorts the list by
that column ascending, a second press on the same column sorts descending, and the choice is stored per user, actor,
and list.

| Item        | Detail                                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | Inline in each section partial (`_skills-section.hbs:7-16`, `_weapon-section.hbs:7-14`, `_spell-section.hbs:55-63`, ...) and the XP manager (`xp-manager.hbs:120-132`). `templates/actor/_partials/_sort-header.hbs` (target) |
| Parameters  | `scope` (the list's key, `skills`), `type` (the row subtype for the columns), `columns` (array of `{ key, label }`, `key` empty for a column that does not sort), all new with the partial                                    |
| SCSS        | `scss/components/_sort-header.scss` (target), holding `_item-lists.scss:14-25`                                                                                                                                                |
| Block class | `l5r4-sort-header`, on the header list                                                                                                                                                                                        |
| Handler     | `SortHandler.handleClick` and `initializeIndicators` (`module/sheets/handlers/sort-handler.js:84-160`); keys allowed per scope in `module/config/sort-keys.js`                                                                |
| Shows in    | Every list section that has columns; the XP manager's purchases list                                                                                                                                                          |
| Gallery     | A header with no sort, sorted ascending, sorted descending, a column head focused, a long column label                                                                                                                        |

## Anatomy

| Part        | Element                                                                                        | Class                                            | Class now                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Header list | `<section data-scope>`                                                                         | `l5r4-sort-header l5r4-item-row-list -<subtype>` | `item-list -<subtype> -header` (`_skills-section.hbs:7`)      |
| Header row  | `<div>`                                                                                        | `l5r4-item-row`                                  | `item`                                                        |
| Column head | `<button type="button" data-action="sort-items" data-sort-by aria-pressed>`                    | `l5r4-sort-header-button`                        | `a.item-sort-by` with `data-sortby` (`_skills-section.hbs:9`) |
| Direction   | `<i class="fa-solid fa-sort-up" inert>` or `fa-sort-down`, after the label, active column only | core Font Awesome                                | `is-active` and `data-dir` with no style                      |
| Plain head  | `<span>` for a column that does not sort                                                       | `l5r4-sort-header-label`                         | `<span>` (`_spell-section.hbs:60`)                            |
| Spacer      | `<span>` over the controls column                                                              | none                                             | `<span></span>` (`_skills-section.hbs:14`)                    |

The header is an item list of one row, so its columns line up with the rows below through the same `-<subtype>`
column set (`item-row.md`).

## Variants

| Variant  | Selects it                            | Used at                                                                    |
| -------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Sortable | Column heads are buttons              | Skills, weapons, spells, techniques, items, XP purchases                   |
| Plain    | Every head a `l5r4-sort-header-label` | NPC attacks (`_stats-npc.hbs:216-225`), XP ledger (`xp-manager.hbs:81-87`) |

## States

| State         | Look                                                                                                               | Markup                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Unsorted head | The label in the header text color                                                                                 | `aria-pressed="false"`                                                              |
| Sorted        | The label in bold with the direction icon after it                                                                 | `aria-pressed="true"`, `data-dir="asc"` or `"desc"`; `is-active` mirrors it for CSS |
| Hover         | `--l5r4-state-hover-filter`                                                                                        | `:hover`                                                                            |
| Focus-visible | Core's focus ring                                                                                                  | `:focus-visible`                                                                    |
| Read-only     | Core disables the heads on a sheet the viewer cannot edit; that viewer has no actions bound today (`button.md` B8) | Core's `disabled`                                                                   |

The render sets the stored sort on the active head; `initializeIndicators` only repeats it after the handler stores a
new one, so the first paint already shows it.

## Tokens

| Token                                                     | Use                  |
| --------------------------------------------------------- | -------------------- |
| `--l5r4-color-panel`                                      | Header background    |
| `--l5r4-color-line`, `--l5r4-border-width-thin`           | Header frame         |
| `--l5r4-color-text`                                       | Header text          |
| `--l5r4-space-card`                                       | Header padding       |
| `--l5r4-state-hover-filter`                               | Hover on a head      |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow` | Focus ring on a head |

The header text reads core's `--table-header-text-color` today (`_item-lists.scss:18`); the target reads
`--l5r4-color-text`, the color `--l5r4-color-panel` is checked against (`foundations/color.md`).

## Keyboard and screen reader

| Input          | Result                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tab            | Moves through the sortable heads in column order                                                                       |
| Enter or Space | Sorts by that column; again reverses the order                                                                         |
| Screen reader  | Reads the head's label and "pressed" on the sorted column; its `data-tooltip` shows the direction ("Sorted ascending") |

## Long text

A column label stays on one line; one that does not fit its column truncates with an ellipsis and keeps its full text
in `data-tooltip`. Labels are the column's name in one or two words.

## Rules

| #   | Rule                                                                                                                   | Enforced by                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| H1  | A sortable head is a `<button type="button">`; the sorted one carries `aria-pressed="true"` and shows a direction icon | `tests/conventions/templates.test.js` (native controls; toggle carries `aria-pressed`) |
| H2  | The direction shows by icon and weight as well as by color                                                             | Review, in the gallery                                                                 |
| H3  | Each head's sort key is `data-sort-by`, one of the scope's keys in `module/config/sort-keys.js`                        | `tests/conventions/actions.test.js` (action has a handler); review for the key         |
| H4  | Two heads never share a sort key                                                                                       | Review                                                                                 |
| H5  | The handler finds the header by `[data-scope]`, never by `.item-list.-header`                                          | ESLint `no-restricted-syntax`                                                          |
| H6  | The header is one partial; sections pass their columns                                                                 | `tests/conventions/templates.test.js` (markup used twice)                              |

| #   | Conforming                                                                                                                            | Non-conforming                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| H1  | `<button type="button" class="l5r4-sort-header-button" data-action="sort-items" data-sort-by="name" aria-pressed="true">` (modeled)   | `<a class="item-sort-by" data-action="item-sort-by" data-sortby="name">` (`templates/actor/_partials/_skills-section.hbs:9`) |
| H2  | Bold label and `fa-sort-up` on the sorted head (modeled)                                                                              | `is-active` and `data-dir` set by `sort-handler.js:58-63` with no style anywhere in `scss/`: the sort is invisible           |
| H3  | `data-sort-by="mastery"` (modeled on `_spell-section.hbs:59`)                                                                         | `data-sortby` run together (`templates/actor/_partials/_skills-section.hbs:9`)                                               |
| H4  | One key per column                                                                                                                    | Attack and Damage both `data-sortby="damage"` (`templates/actor/_partials/_weapon-section.hbs:10-11`)                        |
| H5  | `root.querySelector('[data-scope="skills"]')` (modeled on `sort-handler.js:88`)                                                       | `root.querySelector(\`.item-list.-header[data-scope="${scope}"]\`)` (`module/sheets/handlers/sort-handler.js:88`)            |
| H6  | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_sort-header.hbs" scope="skills" type="skill" columns=skillColumns}}` (modeled) | The header written out in 11 section partials and the XP manager                                                             |

H4's fix gives Attack its own key, which sorts by a different value than today: a behavior change, filed as its own
issue (Stage 17 decision 10).

## Do and don't

| Do                                                     | Don't                                            |
| ------------------------------------------------------ | ------------------------------------------------ |
| Make a column sortable when players look rows up by it | Make the controls column sortable                |
| Keep the spacer over the controls column               | Drop it, which shifts every head one column left |
| Store the sort per user, as the handler does           | Sort for every viewer of the actor               |

## Names

| Current                        | Target                                           | Why                                       |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------- |
| `item-list -<subtype> -header` | `l5r4-sort-header l5r4-item-row-list -<subtype>` | Decision 15                               |
| `item-sort-by`                 | `l5r4-sort-header-button`                        | Decision 15                               |
| `data-action="item-sort-by"`   | `data-action="sort-items"`                       | Verb first (`docs/code-system/naming.md`) |
| `data-sortby`                  | `data-sort-by`                                   | kebab-case words (naming.md)              |

## Keys this page needs

| Key                               | Value             | For                               |
| --------------------------------- | ----------------- | --------------------------------- |
| `l5r4.ui.common.sortedAscending`  | Sorted ascending  | `data-tooltip` of the sorted head |
| `l5r4.ui.common.sortedDescending` | Sorted descending | `data-tooltip` of the sorted head |

`fa-sort-up` and `fa-sort-down` are the "Direction of the sorted column" row in `foundations/iconography.md` rule 3.
