# Item row

One document on a sheet as one grid row: its name, the numbers players read most (rank, Trait, pool, Mastery Level),
a roll button where it rolls, and the row's controls. Rows stack in an item list under a section title and a sort
header. The same template, without `inSheet`, is the item card posted to chat.

| Item        | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/cards/<subtype>.hbs` with `inSheet=true` (one per Item subtype, `advantage-disadvantage.hbs` for both); NPC attack rows inline in `_stats-npc.hbs`. Shared parts: the details cell `templates/cards/_partials/_details.hbs` (`rules`, `description`), its paragraphs `templates/cards/_partials/_detail-text.hbs` for a row with lines of its own (Skill, spell), and the Clan, Family, and School row `templates/cards/_partials/_bio-row.hbs` |
| Parameters  | `name`, `type`, `system`, `docId`, `inSheet` (all rows); `ranged` (weapons: `weapon.system.isBow`). Example: `systems/l5r4-enhanced/templates/cards/skill.hbs` (`templates/actor/_partials/_skill-section.hbs`)                                                                                                                                                                                                                                            |
| SCSS        | `scss/components/_item-row.scss`, the rename of `scss/components/_item-row.scss`                                                                                                                                                                                                                                                                                                                                                                           |
| Block class | `l5r4-item-row` on the row, beside its fixed classes; `l5r4-item-row-list` on the list                                                                                                                                                                                                                                                                                                                                                                     |
| Shows in    | Every list section of the PC and NPC sheets, the bio section, the XP manager's ledgers (`l5r4-item-row-list -xp` (`templates/apps/xp-manager.hbs`))                                                                                                                                                                                                                                                                                                        |
| Game terms  | Skill, Skill Rank, Emphasis (`game-rules/58_skills_overview.md, p.133`); Mastery Level (`game-rules/66_magic_and_spell_casting.md, p.163`)                                                                                                                                                                                                                                                                                                                 |
| Gallery     | One row per subtype, closed and open, hovered and focused, with a long name, with and without details; an empty list                                                                                                                                                                                                                                                                                                                                       |

## Anatomy

| Part        | Element                                                  | Class                                                                | Class now                                                                           |
| ----------- | -------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| List        | `<section>`                                              | `l5r4-item-row-list -<subtype>`                                      | same: `l5r4-item-row-list -skill` (`templates/actor/_partials/_skill-section.hbs`)  |
| Row         | `<div data-item-id data-document-id>`                    | `l5r4-item-row item -<subtype>` + `-expandable` + core's `draggable` | same: `item l5r4-item-row -{{type}}` (`templates/cards/skill.hbs`)                  |
| Name        | `<h4>`                                                   | `flexrow -gap-sm title` (fixed)                                      | same                                                                                |
| Badge       | `<img alt>` after the name, on a Skill the School grants | `l5r4-item-row-badge`                                                | `l5r4-item-row-badge flex0` (`templates/cards/skill.hbs`)                           |
| Number cell | `<div>`                                                  | `l5r4-item-row-cell`                                                 | bare `<div>`: `<div>{{system.rank}}</div>` (`templates/cards/skill.hbs`)            |
| Field cell  | `<div>` holding a row select (`form-field.md`)           | `l5r4-item-row-cell`                                                 | bare `<div>` around `data-action="update-item-field"` (`templates/cards/skill.hbs`) |
| Roll cell   | The roll button (`button.md`)                            | `l5r4-button -roll`                                                  | `button-mask-container`                                                             |
| Emphases    | `<div>`                                                  | `l5r4-item-row-emphases`                                             | same: `l5r4-item-row-emphases` (`templates/cards/skill.hbs`)                        |
| Controls    | The inline control cluster (`inline-control.md`)         | `l5r4-inline-control -reveal`                                        | `controls`                                                                          |
| Details     | `<div>` spanning every column, second grid row           | `l5r4-item-row-details`                                              | same: `l5r4-item-row-details` (`templates/cards/skill.hbs`)                         |

Columns per subtype, from `.l5r4-item-row-list` (`scss/components/_item-row.scss`), read the size tokens:

| Subtype                             | Columns                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `skill`                             | name, rank `column-60`, Trait `column-120`, roll `column-60`, Emphases `1fr`, controls |
| `weapon`                            | name, attack `column-80`, damage `column-80`, arrow `column-150`, controls             |
| `spell`                             | name, Ring `column-80`, Mastery Level `column-60`, cast `column-60`, controls          |
| `armor`                             | name, `column-80`, `column-100`, `column-100`, controls                                |
| `advantage`, `disadvantage`, `kata` | name, `column-80`, `column-80`, controls                                               |
| `kiho`                              | name, three `column-80`, controls                                                      |
| `technique`                         | name, two `1fr`, controls                                                              |
| `tattoo`                            | name, `1fr`, controls                                                                  |
| `commonItem`, bio                   | name, controls                                                                         |
| `-attacks`                          | name, four `1fr`, controls                                                             |
| `-xp`                               | `column-150`, `1fr`, controls                                                          |
| `-xp-spent`                         | name, `column-80`, `column-120`, controls                                              |

## Variants

| Variant    | Selects it                   | Look                                                    |
| ---------- | ---------------------------- | ------------------------------------------------------- |
| Subtype    | `-<subtype>` on list and row | The column set above                                    |
| Expandable | `-expandable` on the row     | Renders the expand control and the details cell         |
| Bio        | `-bio` on the row            | Row on `--l5r4-color-panel`                             |
| Attacks    | `l5r4-item-row -attacks`     | An NPC attack: two roll buttons, action, type, controls |
| Ledger     | `-xp`, `-xp-spent`           | XP manager rows                                         |

## States

| State        | Look                                                                                           | Markup                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Rest         | Even rows on `--l5r4-color-row-alt`; controls hidden                                           | `:nth-of-type(even)`                                                   |
| Hover        | Controls show                                                                                  | `:hover`                                                               |
| Focus inside | Controls show                                                                                  | `:focus-within`                                                        |
| Open         | Details cell shows below the row                                                               | `is-expanded` on the row; `aria-expanded="true"` on its expand control |
| Dragging     | Core's drag image                                                                              | Core's `draggable`                                                     |
| Read-only    | Core disables the row's selects and buttons on a sheet the viewer cannot edit (`button.md` B8) | Core's `disabled`                                                      |
| Empty list   | The section is not rendered                                                                    | `{{#if <list>.length}}` in the sheet body                              |

## Tokens

| Token                                                                                 | Use                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------- |
| `--l5r4-color-row-alt`                                                                | Even rows                             |
| `--l5r4-color-panel`                                                                  | Bio rows                              |
| `--l5r4-color-text`                                                                   | Row text                              |
| `--l5r4-space-gap-tight`                                                              | Gap between rows; gap between columns |
| `--l5r4-space-8`                                                                      | Row inline padding                    |
| `--l5r4-size-column-60`, `-80`, `-100`, `-120`, `-150`, `--l5r4-size-column-controls` | Column widths                         |
| `--l5r4-font-size-body`                                                               | Details text                          |
| `--l5r4-border-width-thin`                                                            | Row select border                     |

Contrast: `text` on `row-alt` is 8.51:1 light and 9.35:1 dark (`foundations/color.md`).

## Keyboard and screen reader

| Input         | Result                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Tab           | Moves through the row's roll buttons, selects, and controls, left to right; the row takes no focus |
| Drag          | Pointer only, through core's `draggable`: a row drags to the hotbar or another sheet               |
| Screen reader | Reads the name as a level 4 heading, then each cell; the badge's `alt` names what it marks         |

## Long text

A name wraps inside its column (`text-wrap: revert` on the row's `.title` (`scss/components/_item-row.scss`)) and the row grows; numbers never wrap.
Emphases join with ", " and wrap inside their column. The details cell spans every column and wraps as prose. When
a window is made narrower the `1fr` columns shrink first; fixed columns keep their width.

## Rules

| #   | Rule                                                                                                                            | Enforced by                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| R1  | Row styles sit under `.l5r4-item-row-list .l5r4-item-row`, so a posted item card, which has no list, keeps the chat card's look | `tests/conventions/styles.test.js`; review                                |
| R2  | The row's root and name keep their fixed classes; the system adds `l5r4-item-row` beside them                                   | `tests/conventions/templates.test.js` (fixed-name exempt list)            |
| R3  | Handlers find the row by `[data-item-id]`, never by `.item`                                                                     | ESLint `no-restricted-syntax`                                             |
| R4  | A list's variant matches its rows' subtype spelling, `-commonItem` included                                                     | `tests/conventions/styles.test.js`; Stylelint exception for `-commonItem` |
| R5  | No presentational `width` or `height` attributes; an image's size is in its SCSS                                                | `tests/conventions/templates.test.js`                                     |
| R6  | Every `<img>` has `alt`: the badge names what it marks                                                                          | `tests/conventions/templates.test.js`; review for the value               |
| R7  | Column widths read size tokens; a width only one subtype uses is still a column token, because the columns are one scale        | `tests/conventions/styles.test.js`                                        |

| #   | Conforming                                                                                                                                                   | Non-conforming                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| R1  | The even-row rule `> .l5r4-item-row:nth-of-type(even)` (`scss/components/_item-row.scss`), inside `.l5r4-item-row-list`                                      | `.l5r4.pc .item { display: grid; ... }` (modeled), which any `.item` in the sheet matches |
| R2  | `<div class="l5r4-item-row item -{{type}}{{#if expandable}} -expandable{{/if}}" data-item-id=... data-document-id=...>` (modeled)                            | Renaming `item` to `l5r4-item-row`, which unstyles every item card already posted         |
| R3  | `element?.closest?.("[data-item-id]")` in `ItemCrudHandler.#getItemRow` (`module/sheets/handlers/item-crud-handler.js`)                                      | `element?.closest?.(".item")` (modeled)                                                   |
| R4  | `l5r4-item-row-list -commonItem` (`templates/actor/_partials/_item-section.hbs`) with rows `item l5r4-item-row -{{type}}` (`templates/cards/commonItem.hbs`) | `&.-advantages` (modeled), which no template uses: the lists say `-advantage`             |
| R5  | `.l5r4-item-row-badge { block-size: 16px; inline-size: 16px; }` (modeled)                                                                                    | `<img class="flex0" width="16px" height="16px" ...>` (modeled)                            |
| R6  | `<img class="l5r4-item-row-badge" src=... alt="{{localize "l5r4.ui.common.school"}}" />` (modeled)                                                           | The same image with no `alt` (modeled)                                                    |
| R7  | `grid-template-columns: 1fr var(--l5r4-size-column-80) var(--l5r4-size-column-80) var(--l5r4-size-column-controls);`                                         | `grid-template-columns: 1fr 80px 80px var(--controls);` (modeled)                         |

## Do and don't

| Do                                                             | Don't                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Show the numbers a player reads at the table in the row        | Put prose in a cell; it belongs in the details                         |
| Keep one roll button per cell, the pool as its label           | Show a pool twice in one row                                           |
| Keep the row template's in-sheet and chat branches in one file | Split the row into a second template; the subtype file names are fixed |

## Names

| Current                                                                         | Target                           | Why                             |
| ------------------------------------------------------------------------------- | -------------------------------- | ------------------------------- |
| `item-list`                                                                     | `l5r4-item-row-list`             | Decision 15                     |
| `expanded-text`                                                                 | `l5r4-item-row-details`          | Decision 15                     |
| `emphasis-display`                                                              | `l5r4-item-row-emphases`         | Decision 15                     |
| `--controls`                                                                    | `--l5r4-size-column-controls`    | `foundations/space-and-size.md` |
| `item -attacks` (NPC attack row)                                                | `l5r4-item-row -attacks`         | Not posted, so not fixed        |
| `scss/components/_item-row.scss`                                                | `scss/components/_item-row.scss` | The file takes its block's name |
| Dead: `-advantages`, `.expanded-text.-npc`, `.title a[data-action="item-chat"]` | Removed                          | They match no template          |

Fixed (Stage 17 decision 2), because posted item cards store them: the root's `item`, `-<subtype>`, `-expandable`,
`-bio`; the name's `title`, `flexrow`, `-gap-sm`; `data-item-id`, `data-document-id`; the template files
`templates/cards/<subtype>.hbs`. Core's `draggable` is core's name.
