# Sheets

How the PC, NPC, and item sheets compose components into one window: header, portrait, name, tabs, sections and their
expand control, sort headers, empty sections, and the Limited and Observer views. Each component named here has its
own page in `components/`; this page sets how they fit together and the rules that hold across sheets.

| Item       | Detail                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classes    | `L5R4PcSheet` (`module/sheets/pc-sheet.js`), `L5R4NpcSheet` (`module/sheets/npc-sheet.js`), both over `BaseActorSheet` (`module/sheets/base-actor-sheet.js`); `L5R4ItemSheet` (`module/sheets/item-sheet.js`)                                                                                             |
| Templates  | `templates/actor/pc.hbs`, `npc.hbs`, `pc-limited.hbs`, `npc-limited.hbs`, and `templates/actor/_partials/`; the item sheet's parts in `templates/item/_partials/`, with `templates/item/_type-details/<subtype>.hbs` and `_type-modifiers/<subtype>.hbs`                                                  |
| Partials   | Registered by path in `module/setup/preload-templates.js:43-174`                                                                                                                                                                                                                                          |
| SCSS       | `scss/sheets/_actor-sheet.scss`, `_item-sheet.scss` (the window); `scss/layout/_actor-layout.scss`, `_sidebar.scss`, `_item-layout.scss` (grids); `scss/features/_pc-info.scss` (header); `scss/components/_section.scss`, `_item-row.scss`, `_form-field.scss`, `_grid.scss` (blocks)                    |
| Tokens     | `--l5r4-space-section`, `--l5r4-space-card`, `--l5r4-space-gap`, `--l5r4-space-gap-tight`; `--l5r4-size-portrait`, `--l5r4-size-column-*`; `--l5r4-color-header`, `--l5r4-color-text-on-header`, `--l5r4-color-panel`, `--l5r4-color-row-alt`, `--l5r4-color-line`, `--l5r4-color-text`; `--l5r4-state-*` |
| Components | Section and section title, expand control, sort header, item row and item list, tabs, item header, Ring and Trait block, rank control, Void Point dots, Wound track, Initiative block, Armor TN block, Fear block, spell slots, button, icon button, inline control, form field                           |
| Checks     | `tests/conventions/templates.test.js`, `tests/conventions/actions.test.js`, `tests/conventions/styles.test.js`, Stylelint, the `l5r4-enhanced.design-gallery` Quench batch; "review" where no tool can judge                                                                                              |

## Anatomy

### PC sheet

`pc.hbs` is one `<form>` with two columns: the main column (`_stats.hbs`) and the sidebar. Width 870 px
(`module/sheets/pc-sheet.js:459`).

| Region   | Holds                                                                                                                                                            | Partial                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Header   | Name (an input), Clan, School, Insight Rank, XP spent of total with the XP manager control, Insight; framed by the brush border (`foundations/frames.md` rule 7) | `templates/actor/_partials/_stats.hbs:2-45`                             |
| Rings    | The five Ring medallions, the eight Traits with their rank controls, the Void Ring rank, and the Void Point dots                                                 | `_stats.hbs:46-234`                                                     |
| Sections | Skills, Weapons, Armor, Items, Spells, Techniques, Kiho, Kata, Tattoos, Advantages, Disadvantages, Bio, Notes, in that order                                     | `_stats.hbs:237-290`, one `_<noun>-section.hbs` each                    |
| Sidebar  | Portrait, then Honor, Glory, Status, and Taint, then Initiative and stances, Armor TN, and the Wound track                                                       | `pc.hbs:4-12`: `_ranks.hbs`, `_combat.hbs`, `_armor.hbs`, `_wounds.hbs` |

### NPC sheet

`npc.hbs` keeps the PC sheet's two columns at 840 px (`module/sheets/npc-sheet.js:121`).

| Region   | Differs from the PC sheet                                                                           | Partial                                                                 |
| -------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Header   | Name and, for a pack creature, its book citation (`l5r4-citation`); no Clan, School, Insight, or XP | `_stats-npc.hbs:1-13`                                                   |
| Rings    | The same block; Void Point dots only when `showNpcVoidPoints` is set                                | `_stats-npc.hbs:14-203`                                                 |
| Sections | Attacks (up to three, from `system.attack1` to `attack3`), Skills, Notes. Skills always renders     | `_stats-npc.hbs:205-297`                                                |
| Sidebar  | Portrait, Initiative and stances, Armor TN, Wound track, Fear. No rank blocks                       | `npc.hbs:4-10`: `_combat.hbs`, `_armor.hbs`, `_wounds.hbs`, `_fear.hbs` |

### Item sheet

The item sheet is the one tabbed sheet. Its parts render in order: header, tab strip, then one part per tab
(`module/sheets/item-sheet.js:174-200`). Width 640 px for every subtype (`item-sheet.js:80`).

| Part        | Holds                                                                                                                                                       | Partial                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Header      | Image, name input, book citation                                                                                                                            | `templates/item/_partials/_header.hbs`                        |
| Tabs        | One tab per available part: Details (not on a Clan or Family), Modifiers (Weapon, Armor, Skill only), Description, Effects, Rules (`item-sheet.js:414-436`) | `_tabs.hbs`                                                   |
| Details     | The subtype's fields, then keywords, nemuranai, and price for physical items                                                                                | `_tab-details.hbs`, `_type-details/<subtype>.hbs`             |
| Modifiers   | The subtype's bonus fields                                                                                                                                  | `_tab-modifiers.hbs`, `_type-modifiers/<subtype>.hbs`         |
| Description | Rule summary lines, description, special rules                                                                                                              | `_tab-description.hbs`                                        |
| Effects     | The item's Active Effects with edit, toggle, and delete controls                                                                                            | `_tab-effects.hbs`                                            |
| Rules       | The rules editor (`patterns/panels-and-browsers.md`)                                                                                                        | `_tab-rules.hbs` over `templates/rules/_partials/_editor.hbs` |

### Views

| View     | Who sees it                                                                            | What renders                                                                                                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner    | The GM and the actor's owners                                                          | The full sheet, every control live                                                                                                                                                                                                                                                                                   |
| Observer | A player with Observer permission                                                      | The full template. The sheet is not editable (`isEditable` false), so core disables every input (`foundations/states.md`, Read-only); notes and descriptions render as enriched text in place of the editor (`_stats.hbs:275-288`, `_tab-description.hbs:14-25`); the Effects tab hides "New" (`_tab-effects.hbs:4`) |
| Limited  | A player with Limited permission, never the GM (`pc-sheet.js:435`, `npc-sheet.js:353`) | `pc-limited.hbs` or `npc-limited.hbs`: the name as a heading and the portrait. Nothing else                                                                                                                                                                                                                          |

The item sheet has no Limited template; core gives it Observer behavior.

## Sections

A section is the unit of the main column: a title row, an optional sort header, and a list of item rows.

| Part        | Markup now                                                                                                                               | Target class                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Section     | `<section class="flexcol -gap-sm">`                                                                                                      | `l5r4-section`                                                              |
| Title row   | `div.flexrow.-gap-sm.section-title` with `data-scope="<section>"` and `is-collapsed` when collapsed (`_skills-section.hbs:2`)            | `l5r4-section-title`                                                        |
| Title text  | `h4.title`                                                                                                                               | `l5r4-section-heading` (`components/section.md`)                            |
| Add control | `_unified-item-create.hbs`: opens the item creation dialog with the section's type preselected                                           | Core's `inline-control icon` (`components/icon-button.md`)                  |
| Expand      | `_expand.hbs`: collapses the section; the state persists per actor and scope                                                             | `l5r4-expand-control` (`components/expand-control.md`)                      |
| Extras      | Fields that belong to the section's title: wealth on Items (`_item-section.hbs:4-22`), spell slots on Spells (`_spell-section.hbs:4-51`) | Their own component classes                                                 |
| Sort header | `section.item-list.-<type>.-header` with one `a.item-sort-by[data-action="item-sort-by"][data-sortby]` per column                        | `l5r4-sort-header l5r4-item-row-list -<type>` (`components/sort-header.md`) |
| List        | `section.item-list.-<type>` holding one card per item (`templates/cards/<subtype>.hbs` with `inSheet=true`)                              | `l5r4-item-row-list -<type>` (`components/item-row.md`)                     |

`flexrow`, `flexcol`, `flex0`, and `flex1` are core classes and keep their names. The item card templates also post to
chat, so the classes they put on posted cards (`item`, `title`, `-<subtype>`, `-bio`, `-expandable`) are fixed
(Stage 17 decision 2): a card's root keeps `item` and adds `l5r4-item-row`, and sheet styles read `l5r4-item-row`
(`components/item-row.md`).

### Variants

| Variant                  | Where                                                                                      | Difference                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| List section             | Skills, Weapons, Armor, Spells, Techniques, Kiho, Kata, Tattoos, Advantages, Disadvantages | Title row, sort header, list                                       |
| List section with extras | Items (wealth), Spells (spell slots)                                                       | Extras sit in the title row between the label and the controls     |
| Bio                      | `_bio.hbs`                                                                                 | Clan, Family, and School cards; no sort header, no add control     |
| Notes                    | `_stats.hbs:270-290`, `_stats-npc.hbs:279-297`                                             | Title row with no controls over the notes editor                   |
| Attacks (NPC)            | `_stats-npc.hbs:205-277`                                                                   | Add control only while an attack slot is free (`firstEmptyAttack`) |

### States

| State     | Look                                                                                             | Carried by                                               |
| --------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Expanded  | Rows show; the expand control's icon is `fa-angle-up`                                            | `aria-expanded="true"` on the control                    |
| Collapsed | Rows hide; the icon is `fa-angle-down`                                                           | `aria-expanded="false"`, `is-collapsed` on the title row |
| Empty     | See rule 4                                                                                       | The section's list is empty                              |
| Sorted    | The sorted column's label in bold with its direction icon                                        | `aria-pressed="true"` on the column head (rule 3)        |
| Read-only | Core's disabled inputs; add, edit, delete, and expand controls stay, and the sheet blocks writes | `isEditable` false                                       |

## Rules

### 1. One section title partial

Every section title row is one registered partial, `templates/actor/_partials/_section-title.hbs` (target), so the
title, the add control, and the expand control render the same in every section. It takes named parameters and a
block for extras.

| Parameter   | Type    | Meaning                                                                |
| ----------- | ------- | ---------------------------------------------------------------------- |
| `scope`     | string  | The section's id for collapse and sort state: `skills`, `weapons`, ... |
| `label`     | string  | The i18n key of the title                                              |
| `collapsed` | boolean | Whether the section starts collapsed (`collapsedSections.<scope>`)     |
| `create`    | boolean | Whether the title row carries the add control                          |
| `expand`    | boolean | Whether the title row carries the expand control                       |

Enforced by `tests/conventions/templates.test.js` (markup used twice is a registered partial).

Conforming, modeled on `templates/actor/_partials/_item-section.hbs:2-25`:

```hbs
{{#> "systems/l5r4-enhanced/templates/actor/_partials/_section-title.hbs"
    scope="items" label="l5r4.ui.sheets.items" collapsed=collapsedSections.items create=true expand=true}}
  <label class="l5r4-wealth-field">
    {{localize "l5r4.world.wealth.koku"}}
    <input type="number" name="system.wealth.koku" value="{{system.wealth.koku}}" min="0" step="1" />
  </label>
{{/"systems/l5r4-enhanced/templates/actor/_partials/_section-title.hbs"}}
```

Non-conforming, `templates/actor/_partials/_skill-section.hbs:2-6` and `_weapon-section.hbs:2-6`: the same five lines
copied into twelve section partials.

### 2. The expand control states its state

The expand control is a `<button type="button">` with a name, `aria-expanded`, and the angle icon of its state
(`foundations/states.md` rule 4 shows the markup). `fa-chevron-*` steps ranks and never expands
(`foundations/iconography.md` rule 3). The action is `expand-section` on a section and `expand-item` on an item row,
verb first (`docs/code-system/naming.md`, `data-action` value). Enforced by `tests/conventions/templates.test.js` (an
expand toggle carries `aria-expanded`; icon-only buttons carry an accessible name) and
`tests/conventions/actions.test.js` (casing, every action has a handler).

Conforming: `foundations/states.md` rule 4.

Non-conforming, `templates/actor/_partials/_expand.hbs:1`:

<!-- prettier-ignore -->
```hbs
<a class="button inline-control icon" data-action="section-expand"><i class="fas fa-chevron-down"></i></a>
```

### 3. A sort header is a row of buttons that shows the sort

Each sortable column head is a `<button type="button" data-action="sort-items" data-sort-by="<key>">` labelled with
the column's name. The head of the sorted column carries `aria-pressed="true"`, its label in bold, and the direction
icon after it, `fa-sort-up` or `fa-sort-down` (`foundations/iconography.md` rule 3); the others carry
`aria-pressed="false"`. A column that does not sort is a `<span>`. The sort persists per actor and scope
(`module/sheets/handlers/sort-handler.js:144-150`). `components/sort-header.md` holds the anatomy. Enforced by
`tests/conventions/templates.test.js` (interactive elements are native controls; a toggle carries `aria-pressed`),
`tests/conventions/actions.test.js`, and review for the visible state.

Conforming, modeled on `templates/actor/_partials/_skill-section.hbs:9`:

```hbs
<button type="button" class="l5r4-sort-header-button" data-action="sort-items" data-sort-by="name"
  aria-pressed="{{#if sort.name}}true{{else}}false{{/if}}">
  {{localize "l5r4.ui.common.name"}}
  {{#if sort.name}}<i class="fa-solid {{#if sort.asc}}fa-sort-up{{else}}fa-sort-down{{/if}}" inert></i>{{/if}}
</button>
```

Non-conforming, `_skills-section.hbs:9` with `sort-handler.js:54-66`: an `<a>` with no `href` cannot take focus, and
the `is-active` class and `data-dir` attribute the handler sets have no style, so the sorted column looks like the
rest. `_weapon-section.hbs:10-11` gives the Attack and Damage heads the same key, `damage`.

### 4. An empty list section is left out

A list section renders only when its list has an entry (`_stats.hbs:237-267`, 11 of the 13 sections). A section with
fields of its own (Items with wealth, Bio, Notes, the NPC's Attacks and Skills) always renders; when its list is empty
it shows one italic line in the list's place (`foundations/states.md` rule 9), worded as `patterns/feedback.md` sets.
The sort header renders only over a list with entries. Picked by majority (11 of 13). Enforced by review; the gallery
shows each section empty and full.

Conforming, `templates/actor/_partials/_item-section.hbs:26-40`: the header and list render inside
`{{#if items.length}}`.

Non-conforming, `templates/actor/_partials/_bio.hbs:6-28`: a character with no Clan, Family, or School shows the Bio
title over an empty list.

### 5. A Limited view shows the name and the portrait only

The Limited templates render the actor's name as a heading and the portrait, and no value from `system`. They share
one partial, since `pc-limited.hbs` and `npc-limited.hbs` are the same eight lines. The GM never sees the Limited view.
Enforced by `tests/conventions/templates.test.js` (markup used twice is a registered partial) and review for what a
Limited user sees.

Conforming, `templates/actor/pc-limited.hbs:2-7`, moved into one partial that both Limited templates include, with the
portrait's `alt` set to the actor's name.

Non-conforming: a Limited view that shows a Ring, a Wound total, or a Skill.

### 6. An Observer sees the owner's layout, read-only

An Observer gets the full template. Every editable value renders through a native input, so core's disabled look is
the read-only look and the system adds no second one. Controls that write (add, delete, rank steps, Void Point dots)
stay where they are; the sheet refuses the write. A rich text field renders as enriched text, never as an empty
editor. Enforced by review and the sheet Quench batches.

Conforming, `templates/actor/_partials/_stats.hbs:275-288`: the notes render in `prose-mirror` when `editable`, as
enriched text otherwise.

Non-conforming: a value an Observer sees only by hovering, or a control removed for Observers so the row shifts.

### 7. Sheet classes carry `l5r4-`, and sheet styles sit under them

Every class a sheet template defines starts with `l5r4-` (Stage 17 decision 15); core classes keep core's names; the
classes item cards post to chat stay as they are. A component's styles sit under its own block class, never under
`.l5r4.pc` or `.l5r4.npc`, so the gallery can render it outside a sheet. A rule for one sheet as a whole goes in
`scss/sheets/`. Enforced by `tests/conventions/templates.test.js` (system classes carry `l5r4-`), Stylelint
`selector-class-pattern`, and `tests/conventions/styles.test.js`.

| Now                          | Target                    |
| ---------------------------- | ------------------------- |
| `main-sheet`                 | `l5r4-sheet-body`         |
| `stats`                      | `l5r4-sheet-main`         |
| `sidebar`                    | `l5r4-sheet-sidebar`      |
| `actor-img`                  | `l5r4-portrait`           |
| `actor-header`               | `l5r4-actor-header`       |
| `pc-info`                    | `l5r4-pc-info`            |
| `section-title`              | `l5r4-section-title`      |
| `title` (in a section title) | `l5r4-section-heading`    |
| `item-list`                  | `l5r4-item-row-list`      |
| `item-sort-by`               | `l5r4-sort-header-button` |
| `limited-sheet`              | `l5r4-limited`            |
| `sheet-header` (item sheet)  | `l5r4-item-header`        |
| `section-container`          | `l5r4-section-body`       |

Conforming, `scss/apps/_effect-panel.scss:6-60`: every rule sits under `.l5r4-effect-panel`.

Non-conforming (modeled): a section rule scoped under `.l5r4.pc` and `.l5r4.npc`, so a window outside the sheet copies
its look. Under the window scope today, for want of an `l5r4-` class on the element: `scss/sheets/_actor-sheet.scss`,
`scss/sheets/_item-sheet.scss`, and `scss/features/_traits-rings.scss` (`docs/code-system/templates-and-styles.md`,
Rules and selectors).

### 8. Tabs use core's tab markup with a kebab-case action

The item sheet's tab strip is core's `nav.sheet-tabs.tabs[data-group]` with `role="tablist"`, one control per tab,
core's `active` on the current one, and `data-tab` naming the part. The action is `change-tab` (Stage 17 decision 15
renames `changeTab`). Each tab control is a `<button type="button" role="tab">` with `aria-selected`, so it takes
focus and states which part shows (`components/tabs.md`, sheet variant). Enforced by
`tests/conventions/actions.test.js` and `tests/conventions/templates.test.js`.

Conforming, modeled on `templates/item/_partials/_tabs.hbs:3`:

```hbs
<button type="button" role="tab" class="l5r4-tabs-tab{{#if tab.active}} active{{/if}}" data-action="change-tab"
  data-tab="{{tab.id}}" aria-selected="{{#if tab.active}}true{{else}}false{{/if}}">{{tab.label}}</button>
```

Non-conforming, `templates/item/_partials/_tabs.hbs:3`: `<a class="item {{tab.cssClass}}" data-action="changeTab">`.
Core's ApplicationV2 also offers `static TABS` with its own `tab` action; moving the item sheet onto it is a
`docs/code-system/foundry-patterns.md` question, decided in review.

## Partials and parameters

The partials below read their parent's context today. The target names each parameter on the include and lists it in
a `{{!-- --}}` comment at the partial's top (`docs/code-system/templates-and-styles.md`, Structure).

| Partial                                              | Parameters                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `templates/actor/_partials/_stats.hbs`               | The PC sheet context: `actor`, `system`, `traitsEff`, `collapsedSections`, item lists |
| `templates/actor/_partials/_stats-npc.hbs`           | The NPC sheet context: `actor`, `system`, `attacks`, `firstEmptyAttack`, `summary`    |
| `templates/actor/_partials/_<noun>-section.hbs`      | Its list (`skills`, `weapons`, ...), `collapsedSections`                              |
| `templates/actor/_partials/_expand.hbs`              | None today; target `collapsed`                                                        |
| `templates/actor/_partials/_unified-item-create.hbs` | None; the section's `data-scope` gives the type                                       |
| `templates/actor/_partials/_bio.hbs`                 | `bioClan`, `bioFamily`, `bioSchool`, `collapsedSections`                              |
| `templates/cards/<subtype>.hbs`                      | `name`, `type`, `system`, `inSheet`, `docId`; `ranged` on `weapon.hbs`                |
| `templates/cards/_partials/_controls.hbs`            | None                                                                                  |
| `templates/cards/_partials/_activate.hbs`            | `active`                                                                              |
| `templates/item/_partials/_header.hbs`               | `item`, `summary`                                                                     |
| `templates/item/_partials/_tabs.hbs`                 | `tabs`: `{ id, label, active }` per tab                                               |

## Keyboard and screen reader

| Contract         | Detail                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus order      | Document order: header fields, Rings and Traits, each section's title controls then its rows, then the sidebar. No `tabindex` above 0                                                                      |
| Every control    | A `<button type="button">` or a native input, so Tab reaches it and Enter or Space runs it. Today 111 `<a>` elements with no `href` and 48 `div`, `span`, or `h4` elements carry actions and take no focus |
| Hidden controls  | Item controls and rank arrows that show on hover also show on `:focus-within` (`foundations/states.md` rule 3)                                                                                             |
| Two-button input | A value changed by left and right click (Trait rank, spell slots, Void Point dots) also has step buttons or an input, so a keyboard reaches both directions; the component page sets which                 |
| Names            | Icon-only controls carry `data-tooltip` and `aria-label` from one key (`foundations/iconography.md` rule 4); section titles are `h4` headings (20 of 20); the portrait's `alt` is the actor's name         |
| Announced state  | Expand state in `aria-expanded`, the sorted column and toggles in `aria-pressed`, the sheet tab in `aria-selected`                                                                                         |
| Window           | Core's: the window title is the document's name, Escape closes the sheet, the header buttons are core's                                                                                                    |

## Long text

| Element                 | Behavior                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Actor and item name     | An input: a long name scrolls inside it. The Limited heading wraps                                                 |
| Section title           | One line (`foundations/typography.md`, Wrapping); a label that cannot fit at the sheet's default width is too long |
| Item row name           | Wraps (`scss/components/_item-row.scss:197`); the row grows, its controls stay at the end                          |
| Clan, School            | Text in the header field; wraps inside its box                                                                     |
| Emphases on a Skill row | Joined with ", " and wraps (`templates/cards/skill.hbs:25-31`)                                                     |
| Notes and descriptions  | Core's editor; the section grows                                                                                   |

## Do and don't

| Do                                                                            | Don't                                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Add a section as a `_<noun>-section.hbs` over the section title partial       | Copy a title row into a new partial                               |
| Leave out a list section with no entries                                      | Render a sort header over an empty list                           |
| Use core's disabled inputs as the Observer look                               | Hide a value or remove a control for Observers                    |
| Put a new sidebar block in its own partial and its own `scss/features/` file  | Add a block's styles under `.l5r4.pc`                             |
| Keep `item`, `title`, and `-<subtype>` on card roots, and add `l5r4-item-row` | Rename a class an item card posts to chat                         |
| Give every row control a `<button>` with `data-tooltip` and `aria-label`      | Bind a click to a `div`, `span`, `h4`, or an `<a>` with no `href` |
