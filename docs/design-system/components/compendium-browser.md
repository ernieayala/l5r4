# Compendium browser

One window over every system pack and world compendium the user can see, in tabs by kind of entry, with a name search and filters per tab. A row shows the entry's icon, name, kind, key numbers, folder, and the page it cites; it drags onto a sheet, and its buttons add an item to the user's character or import a creature (GM). A button in the Compendium sidebar opens it. `patterns/panels-and-browsers.md` places it among the panels.

| Item | Detail |
| --- | --- |
| Window | `module/apps/compendium-browser.js`, class `CompendiumBrowserApplication` (naming.md's target is `CompendiumBrowserApplication`). `HandlebarsApplicationMixin(ApplicationV2)`, id `l5r4-enhanced-compendium-browser`, classes `l5r4 l5r4-compendium-browser`, resizable, 760 × 660 |
| Icon | `fa-solid fa-books`, on the window and the sidebar button (iconography.md rule 3): core's journal icon `fa-book-open` and its Compendium tab and Create Compendium icon `fa-book-atlas` stand beside the button, so neither is used |
| Templates | Parts `controls` (`templates/apps/compendium-browser.hbs`) and `results` (`templates/apps/compendium-browser-results.hbs`, scrollable). A filter change re-renders `results` alone, so the field in use keeps focus: `CompendiumBrowserApplication.PARTS` and `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`) |
| Opened by | A button added to the Compendium sidebar's header: `CompendiumBrowserApplication.onRenderCompendiumDirectory` (`module/apps/compendium-browser.js`) |
| Config | Tabs and filters in `module/config/browser.js` (`BROWSER_TABS`, `BROWSER_FILTERS`); filtering in `module/utils/browser-filter.js` |
| SCSS | `scss/apps/_compendium-browser.scss`, the `.l5r4-compendium-browser` block, which also holds its filter tabs, `.l5r4-tabs.-filter` (`scss/apps/_compendium-browser.scss`); the target puts them in `scss/components/_tabs.scss` |
| Copy | `l5r4.apps.compendiumBrowser.*` (localization.md); the title reads "Compendium browser" (voice.md, sentence case) |
| Quench | `l5r4-enhanced.packs` |

## Anatomy

Element classes are `l5r4-compendium-browser-<element>`, the window's block ([naming.md](../../code-system/naming.md#stylesheets)); the table writes the element part.

| Part | Markup | Class |
| --- | --- | --- |
| Controls | `<section>` | `-controls` |
| Tabs | `<nav aria-label>`, one `<button type="button" aria-pressed>` per tab | The tabs component: `l5r4-tabs -filter`, `l5r4-tabs-tab`, core's `active` (`tabs.md`) |
| Filters | `<div>` of `<label>` blocks, each a caption `<span>` and one control | `-filters`, `-filter` |
| Search | `<input type="search" data-browser-search>` | `-search`, on its `<label>` |
| Clear | `<button type="button">` with a label | `-clear` |
| Results | `<section>`: the count, then the list | `-results-part` |
| Count | `<p aria-live="polite">` | `-count` |
| List | `<ul>` | `-results` |
| Row | `<li draggable="true" data-uuid data-id data-pack data-document-name>` | `-row` |
| Icon | `<img alt="">` | `-icon` |
| Text | `<div>`: name, details, source | `-text` |
| Name | `<button type="button" data-action="open-entry">` | `-name` |
| Details | `<span>`: kind · numbers · folder | `-details` |
| Source | `<span>`: citation · pack | `-source` |
| Add, Import | `<button type="button">`, icon and label | `-button` |
| Empty | A `<p>` in the list's place (states.md rule 9, CB8) | `-empty` |

## Actions

| Action          | Does                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `select-tab`    | Shows another tab with no filter chosen                               |
| `clear-filters` | Clears the search and every filter                                    |
| `open-entry`    | Opens the entry's sheet                                               |
| `add-entry`     | Adds the item to the user's character or the controlled token's actor |
| `import-entry`  | Imports a creature into the world; GMs only. A creature the world already holds asks Replace, New, or Cancel, as core's compendium import does |

Search and filter fields are not actions: `input` and `change` listeners on `[data-browser-search]` and `[data-browser-filter]`, added in `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`).

## Variants

| Variant      | Differs                                                      |
| ------------ | ------------------------------------------------------------ |
| Item tab     | Add on every row (`canAdd`)                                  |
| Creature tab | Import on every row for a GM (`canImport`); no Add           |
| Filter kinds | `select` from the values present, `bool` as All/Yes/No, text |

## States

| State | Look | Markup |
| --- | --- | --- |
| Selected tab | Bold and `outline: var(--l5r4-state-selected-outline)` (states.md Selected) | `aria-pressed="true"`; core's `active` mirrors it, as `button.active` reads it |
| Filtered | The count and the rows change; the field keeps focus | `results` part only |
| No matches | One italic line, "Nothing matches." | Empty |
| Dragging | Core's drag; the row carries `cursor: grab` | `dragstart` sets the document's UUID: `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`) |
| Add with no actor | Warning `l5r4.apps.compendiumBrowser.noActor` | The guard at the top of `CompendiumBrowserApplication.#onAddEntry` (`module/apps/compendium-browser.js`) |
| Loading | Indexes are read once per opening (`#getEntries`); the window renders when they are in | No visible state |

## Parameters

Context from `CompendiumBrowserApplication#_prepareContext` (`module/apps/compendium-browser.js`):

| Name | Type | Meaning |
| --- | --- | --- |
| `tabs` | `{ id, label, active }[]` | One per kind of entry |
| `search` | string | The name search |
| `filters` | `{ id, kind, label, value, options }[]` | The open tab's filters |
| `rows` | `{ uuid, id, pack, packTitle, name, img, folderName, typeLabel, numbers, citation }[]` | The entries that pass |
| `count` | number | `rows.length` |
| `canAdd`, `canImport` | boolean | Which row buttons show |
| `documentName` | `"Item"` or `"Actor"` | For the drag data |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap` | `gap` | Window content, controls, filters, row: `.window-content`, `.l5r4-compendium-browser-controls`, `.l5r4-compendium-browser-filters`, `.l5r4-compendium-browser-row` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-space-gap-tight` | `gap` | Results part, tabs, list, filter caption: `.l5r4-compendium-browser-results-part`, `.l5r4-tabs.-filter`, `.l5r4-compendium-browser-filter`, `.l5r4-compendium-browser-results` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-space-control-block`, `--l5r4-space-control-inline` | `padding` | Tabs, row buttons: `.l5r4-tabs-tab`, `.l5r4-compendium-browser-button` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-state-selected-outline` | `outline` | Selected tab, `&.active` in `.l5r4-tabs-tab` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-size-item-icon` | `flex-basis`, `width`, `height` | Icon, `.l5r4-compendium-browser-icon` (`scss/apps/_compendium-browser.scss`) |
| `--l5r4-font-size-meta` | `font-size` | Filter captions, count, details, source: `.l5r4-compendium-browser-filter`, `.l5r4-compendium-browser-count`, `.l5r4-compendium-browser-details`, `.l5r4-compendium-browser-source` (`scss/apps/_compendium-browser.scss`) |

`flex-basis` of 9rem and 14rem on the filters stay literals: one component (space-and-size.md rule S4). The outline's color is `--l5r4-color-accent`: color.md lists the selected browser tab as a reader of that role, and lists core's `--color-border-highlight` as undefined in an ApplicationV2 window.

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Tabs | Buttons in a named `<nav>`, each with `aria-pressed`; Tab moves between them |
| Filters | Each control sits inside its `<label>`, so the caption is its name |
| Rows | The name is a `<button>` that opens the sheet and takes focus |
| No drag needed | Add puts an item on the character without a drag (`patterns/dialogs.md`, pickers with a route that needs no drag) |
| Count | "Entries: {count}" above the list, in a polite live region, so a reader hears how many rows follow and the new count after each filter change |
| Icons | `inert` on button icons; row images `alt=""` |

## Long text

The text column, `.l5r4-compendium-browser-text` (`scss/apps/_compendium-browser.scss`), has `min-width: 0` and wraps, so a long name, kind, or pack title wraps beside the icon and the buttons keep their place. Tabs and filters wrap to new rows. The list scrolls inside the window; the controls stay at the top.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| CB1 | A filter change re-renders the results part only | Quench `l5r4-enhanced.packs` | `this.render({ parts: ["results"] })` in `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`) | Re-rendering the whole window on each keystroke, which drops the search field's focus (modeled) |
| CB2 | Every row action has a route without drag | Review | Add on each item row, `data-action="add-entry"` (`templates/apps/compendium-browser-results.hbs`) | Drag as the only way to put an item on a sheet (modeled) |
| CB3 | The selected tab shows weight and outline, and states it in `aria-pressed` | Review (states.md Selected) | `aria-pressed="{{#if active}}true{{else}}false{{/if}}"` (`templates/apps/compendium-browser.hbs`) | A tab marked by color alone (modeled) |
| CB4 | The tabs are the tabs component's filter variant; the selected one keeps core's `active`, which core's `button.active` rule reads (`foundry2.css:4126-4130`) | `tests/conventions/templates.test.js`; review | `l5r4-tabs-tab`, with `active` on the selected one, inside `l5r4-tabs -filter` (`templates/apps/compendium-browser.hbs`), as `tabs.md` shows | `class="l5r4-browser-tab active"`: a second tab component (modeled) |
| CB5 | Actions are kebab-case | `tests/conventions/actions.test.js` | `data-action="select-tab"` (`templates/apps/compendium-browser.hbs`) | `data-action="selectTab"` (modeled) |
| CB6 | JavaScript selects by data attribute, never by class | ESLint `no-restricted-syntax` | `querySelectorAll("[data-browser-filter]")` in `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`) | `querySelectorAll(".l5r4-browser-row[data-uuid]")` (modeled) |
| CB7 | No markup in JavaScript: the sidebar button comes from a template | ESLint `no-restricted-syntax` | `renderTemplate` and `foundry.utils.parseHTML` in `CompendiumBrowserApplication.onRenderCompendiumDirectory` (`module/apps/compendium-browser.js`) (templates-and-styles.md) | ``button.innerHTML = `<i class="fa-solid fa-book-open" inert></i>…` `` (modeled) |
| CB8 | The empty state is one italic `<p>` in the list's place | Quench `l5r4-enhanced.packs`, review (states.md rule 9) | The `{{else}}` of `{{#if rows.length}}`: `<p class="l5r4-compendium-browser-empty">` (`templates/apps/compendium-browser-results.hbs`) | An `<li>` inside the list (modeled) |

## Do and don't

| Do                                                 | Don't                                       |
| -------------------------------------------------- | ------------------------------------------- |
| Show the cited page on each row that has one       | Show book text in a row                     |
| Offer Import to the GM alone                       | Show Import to a player and refuse on click |
| Keep the search field's focus while results change | Re-render the controls part on input        |
