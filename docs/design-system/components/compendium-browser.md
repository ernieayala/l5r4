# Compendium browser

One window over every system pack and world compendium the user can see, in tabs by kind of entry, with a name search
and filters per tab. A row shows the entry's icon, name, kind, key numbers, folder, and the page it cites; it drags
onto a sheet, and its buttons add an item to the user's character or import a creature (GM). A button in the
Compendium sidebar opens it. `patterns/panels-and-browsers.md` places it among the panels.

| Item      | Detail                                                                                                                                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window    | `module/apps/compendium-browser.js`, class `CompendiumBrowser`; target `CompendiumBrowserApplication`. `HandlebarsApplicationMixin(ApplicationV2)`, id `l5r4-enhanced-compendium-browser`, classes `l5r4 l5r4-compendium-browser`, resizable, 760 × 660         |
| Icon      | `fa-solid fa-book-open` now; `fa-book-atlas` target (iconography.md rule 3: `fa-book-open` is core's journal icon)                                                                                                                                              |
| Templates | Parts `controls` (`templates/apps/compendium-browser.hbs`) and `results` (`templates/apps/compendium-browser-results.hbs`, scrollable). A filter change re-renders `results` alone, so the field in use keeps focus (`compendium-browser.js:58-65`, `:170-183`) |
| Opened by | A button added to the Compendium sidebar's header (`compendium-browser.js:288-299`)                                                                                                                                                                             |
| Config    | Tabs and filters in `module/config/browser.js` (`BROWSER_TABS`, `BROWSER_FILTERS`); filtering in `module/utils/browser-filter.js`                                                                                                                               |
| SCSS      | Now `scss/components/_compendium-browser.scss:7-126`, beside the item summary. `scss/apps/_compendium-browser.scss` (target); the tabs to `scss/components/_tabs.scss` (target)                                                                                 |
| Copy      | Now `l5r4.ui.browser.*`; target `l5r4.apps.compendiumBrowser.*` (localization.md). Title "Compendium Browser" becomes "Compendium browser" (voice.md, sentence case)                                                                                            |
| Quench    | `l5r4-enhanced.packs`                                                                                                                                                                                                                                           |

## Anatomy

Element classes now read `l5r4-browser-*`; the target is `l5r4-compendium-browser-*`, the window's block
([naming.md](../../code-system/naming.md#stylesheets)).

| Part        | Markup                                                                  | Class now                             | Target element                                                                        |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Controls    | `<section>`                                                             | `l5r4-browser-controls`               | `-controls`                                                                           |
| Tabs        | `<nav aria-label>`, one `<button type="button" aria-pressed>` per tab   | `l5r4-browser-tabs`, `-tab`, `active` | The tabs component: `l5r4-tabs -filter`, `l5r4-tabs-tab`, core's `active` (`tabs.md`) |
| Filters     | `<div>` of `<label>` blocks, each a caption `<span>` and one control    | `l5r4-browser-filters`, `-filter`     | `-filters`, `-filter`                                                                 |
| Search      | `<input type="search" data-browser-search>`                             | `l5r4-browser-search`                 | `-search`                                                                             |
| Clear       | `<button type="button">` with a label                                   | `l5r4-browser-clear`                  | `-clear`                                                                              |
| Results     | `<section>`: the count, then the list                                   | `l5r4-browser-results-part`           | `-results-part`                                                                       |
| Count       | `<p>`                                                                   | `l5r4-browser-count`                  | `-count`                                                                              |
| List        | `<ul>`                                                                  | `l5r4-browser-results`                | `-results`                                                                            |
| Row         | `<li draggable="true" data-uuid data-id data-pack data-document-name>`  | `l5r4-browser-row`                    | `-row`                                                                                |
| Icon        | `<img alt="">`                                                          | `l5r4-browser-icon`                   | `-icon`                                                                               |
| Name        | `<a data-action>` with no `href` now; a `<button type="button">` target | `l5r4-browser-name`                   | `-name`                                                                               |
| Details     | `<span>`: kind · numbers · folder                                       | `l5r4-browser-details`                | `-details`                                                                            |
| Source      | `<span>`: citation · pack                                               | `l5r4-browser-source`                 | `-source`                                                                             |
| Add, Import | `<button type="button">`, icon and label                                | `l5r4-browser-button`                 | `-button`                                                                             |
| Empty       | `<li>` now; a `<p>` in the list's place target (states.md rule 9)       | `l5r4-browser-empty`                  | `-empty`                                                                              |

## Actions

| Now            | Target          | Does                                                                  |
| -------------- | --------------- | --------------------------------------------------------------------- |
| `selectTab`    | `select-tab`    | Shows another tab with no filter chosen                               |
| `clearFilters` | `clear-filters` | Clears the search and every filter                                    |
| `openEntry`    | `open-entry`    | Opens the entry's sheet                                               |
| `addEntry`     | `add-entry`     | Adds the item to the user's character or the controlled token's actor |
| `importEntry`  | `import-entry`  | Imports a creature into the world; GMs only                           |

Search and filter fields are not actions: `input` and `change` listeners on `[data-browser-search]` and
`[data-browser-filter]` (`compendium-browser.js:173-182`).

## Variants

| Variant      | Differs                                                      |
| ------------ | ------------------------------------------------------------ |
| Item tab     | Add on every row (`canAdd`)                                  |
| Creature tab | Import on every row for a GM (`canImport`); no Add           |
| Filter kinds | `select` from the values present, `bool` as All/Yes/No, text |

## States

| State             | Look                                                                             | Markup                                                                         |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Selected tab      | Bold and `outline: var(--l5r4-state-selected-outline)` (states.md Selected)      | `aria-pressed="true"`; core's `active` mirrors it, as `button.active` reads it |
| Filtered          | The count and the rows change; the field keeps focus                             | `results` part only                                                            |
| No matches        | One italic line, "Nothing matches."                                              | Empty                                                                          |
| Dragging          | Core's drag; the row carries `cursor: grab`                                      | `dragstart` sets the document's UUID (`compendium-browser.js:185-196`)         |
| Add with no actor | Warning `l5r4.ui.browser.noActor`                                                | `compendium-browser.js:238-242`                                                |
| Loading           | Indexes are read once per opening (`#load`); the window renders when they are in | No visible state                                                               |

## Parameters

Context from `_prepareContext` (`compendium-browser.js:118-163`):

| Name                  | Type                                                                                   | Meaning                |
| --------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| `tabs`                | `{ id, label, active }[]`                                                              | One per kind of entry  |
| `search`              | string                                                                                 | The name search        |
| `filters`             | `{ id, kind, label, value, options }[]`                                                | The open tab's filters |
| `rows`                | `{ uuid, id, pack, packTitle, name, img, folderName, typeLabel, numbers, citation }[]` | The entries that pass  |
| `count`               | number                                                                                 | `rows.length`          |
| `canAdd`, `canImport` | boolean                                                                                | Which row buttons show |
| `documentName`        | `"Item"` or `"Actor"`                                                                  | For the drag data      |

## Tokens

| Token                                                       | Property                        | Part                                                                                        |
| ----------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `--l5r4-space-gap`                                          | `gap`                           | Window content, controls, filters, row (`_compendium-browser.scss:11`, `:19`, `:51`, `:91`) |
| `--l5r4-space-gap-tight`                                    | `gap`                           | Results part, tabs, list, filter caption (`:26`, `:33`, `:80`, `:59`)                       |
| `--l5r4-space-control-block`, `--l5r4-space-control-inline` | `padding`                       | Tabs, row buttons (`:38`, `:119`)                                                           |
| `--l5r4-state-selected-outline`                             | `outline`                       | Selected tab (`:41-44`)                                                                     |
| `--l5r4-size-item-icon`                                     | `flex-basis`, `width`, `height` | Icon (`:96-98`)                                                                             |
| `--l5r4-font-size-meta`                                     | `font-size`                     | Filter captions, count, details, source (`:58`, `:72`, `:112-115`)                          |

`flex-basis` of 9rem and 14rem on the filters stay literals: one component (space-and-size.md rule S4).
The outline's color is `--l5r4-color-accent`: color.md lists the selected browser tab as a reader of that role, and
lists core's `--color-border-highlight`, which the tab reads today, as undefined in an ApplicationV2 window.

## Keyboard and screen reader

| Contract       | Detail                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tabs           | Buttons in a named `<nav>`, each with `aria-pressed`; Tab moves between them                                      |
| Filters        | Each control sits inside its `<label>`, so the caption is its name                                                |
| Rows           | The name opens the sheet. Now an `<a>` with no `href`, which takes no focus; the target `<button>` does           |
| No drag needed | Add puts an item on the character without a drag (`patterns/dialogs.md`, pickers with a route that needs no drag) |
| Count          | "Entries: {count}" above the list, so a reader hears how many rows follow                                         |
| Icons          | `inert` on button icons; row images `alt=""`                                                                      |

## Long text

The text column has `min-width: 0` and wraps (`_compendium-browser.scss:101-106`), so a long name, kind, or pack title
wraps beside the icon and the buttons keep their place. Tabs and filters wrap to new rows. The list scrolls inside the
window; the controls stay at the top.

## Rules

| #   | Rule                                                                                                                                                         | Enforced by                                   | Conforming                                                                           | Non-conforming                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| CB1 | A filter change re-renders the results part only                                                                                                             | Quench `l5r4-enhanced.packs`                  | `this.render({ parts: ["results"] })` (`compendium-browser.js:175`)                  | Re-rendering the whole window on each keystroke, which drops the search field's focus (modeled)      |
| CB2 | Every row action has a route without drag                                                                                                                    | Review                                        | Add on each item row (`compendium-browser-results.hbs:15-19`)                        | Drag as the only way to put an item on a sheet (modeled)                                             |
| CB3 | The selected tab shows weight and outline, and states it in `aria-pressed`                                                                                   | Review (states.md Selected)                   | `aria-pressed="{{#if active}}true{{else}}false{{/if}}"` (`compendium-browser.hbs:5`) | A tab marked by color alone (modeled)                                                                |
| CB4 | The tabs are the tabs component's filter variant; the selected one keeps core's `active`, which core's `button.active` rule reads (`foundry2.css:4126-4130`) | `tests/conventions/templates.test.js`; review | `class="l5r4-tabs-tab active"` inside `nav.l5r4-tabs.-filter` (`tabs.md`)            | `class="l5r4-browser-tab active"` (`compendium-browser.hbs:4`): a second tab component               |
| CB5 | Actions are kebab-case                                                                                                                                       | `tests/conventions/actions.test.js`           | `data-action="select-tab"`                                                           | `data-action="selectTab"` (`compendium-browser.hbs:4`)                                               |
| CB6 | JavaScript selects by data attribute, never by class                                                                                                         | ESLint `no-restricted-syntax`                 | `querySelectorAll("[data-browser-filter]")` (`compendium-browser.js:177`)            | `querySelectorAll(".l5r4-browser-row[data-uuid]")` (`compendium-browser.js:185`)                     |
| CB7 | No markup in JavaScript: the sidebar button comes from a template                                                                                            | ESLint `no-restricted-syntax`                 | `renderTemplate` and `foundry.utils.parseHTML` (templates-and-styles.md)             | ``button.innerHTML = `<i class="fa-solid fa-book-open" inert></i>…` `` (`compendium-browser.js:296`) |
| CB8 | The empty state is one italic `<p>` in the list's place                                                                                                      | Review (states.md rule 9)                     | `{{else}}<p class="l5r4-compendium-browser-empty">…</p>` (modeled)                   | `<li class="l5r4-browser-empty">` inside the list (`compendium-browser-results.hbs:27`)              |

## Do and don't

| Do                                                 | Don't                                       |
| -------------------------------------------------- | ------------------------------------------- |
| Show the cited page on each row that has one       | Show book text in a row                     |
| Offer Import to the GM alone                       | Show Import to a player and refuse on click |
| Keep the search field's focus while results change | Re-render the controls part on input        |
