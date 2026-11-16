# Tabs

A row of buttons that picks which panel or which filter shows. Two variants: sheet tabs, which switch the item sheet
(and the Active Effect sheet's Rules tab) between its parts, and filter tabs, which pick the compendium browser's
category.

| Item        | Detail                                                                                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | Sheet tabs: `templates/item/_partials/_tabs.hbs` (the item sheet's `tabs` part). Filter tabs: inline as `l5r4-tabs -filter` (`templates/apps/compendium-browser.hbs`)                                                                                                       |
| Panels      | The item sheet's panels, one part each: `templates/item/_partials/_tab-description.hbs`, `templates/item/_partials/_tab-details.hbs`, `templates/item/_partials/_tab-modifiers.hbs`, `templates/item/_partials/_tab-effects.hbs`, `templates/item/_partials/_tab-rules.hbs` |
| Parameters  | `tabs`: array of `{ id, label, active }` (`L5R4ItemSheet#prepareTabs` (`module/sheets/item-sheet.js`); `buildTabs` (`module/apps/compendium-browser.js`))                                                                                                                   |
| SCSS        | `scss/components/_tabs.scss`, holding the filter tab rules now in `.l5r4-tabs.-filter` (`scss/apps/_compendium-browser.scss`). Sheet tabs undo core's button face in `.l5r4-tabs.-sheet` (`scss/components/_tabs.scss`) and keep core's `.sheet-tabs.tabs` look             |
| Block class | `l5r4-tabs` on the `<nav>`                                                                                                                                                                                                                                                  |
| Shows in    | Item sheet; compendium browser; the Active Effect sheet's Rules panel (`templates/rules/effect-tab.hbs`) under core's tabs                                                                                                                                                  |
| Gallery     | Each variant with two, four, and six tabs, one selected, one focused, at the default width                                                                                                                                                                                  |

## Anatomy

Sheet tabs:

| Part  | Element                                                                             | Class                                                | Class now                                                                       |
| ----- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| Bar   | `<nav role="tablist" aria-label data-group="primary">`                              | `l5r4-tabs -sheet sheet-tabs tabs`                   | same: `l5r4-tabs -sheet sheet-tabs tabs` (`templates/item/_partials/_tabs.hbs`) |
| Tab   | `<button type="button" role="tab" data-action="change-tab" data-tab aria-selected>` | `l5r4-tabs-tab`; core's `active` on the selected one | same, with `data-action="change-tab"` (`templates/item/_partials/_tabs.hbs`)    |
| Panel | `<section role="tabpanel" data-tab>`, core's `tab` and `active`                     | `tab`                                                | same: `tab` (`templates/item/_partials/_tab-details.hbs`)                       |

Filter tabs:

| Part | Element                                                                 | Class                                                | Class now                                                           |
| ---- | ----------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Bar  | `<nav aria-label>`                                                      | `l5r4-tabs -filter`                                  | same: `l5r4-tabs -filter` (`templates/apps/compendium-browser.hbs`) |
| Tab  | `<button type="button" data-action="select-tab" data-tab aria-pressed>` | `l5r4-tabs-tab`; core's `active` on the selected one | `l5r4-browser-tab` with `data-action="selectTab"`                   |

## Variants

| Variant | Selects it          | Look                                                                     | Selected state                          |
| ------- | ------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Sheet   | `l5r4-tabs -sheet`  | Core's sheet tab bar                                                     | `aria-selected="true"`, core's `active` |
| Filter  | `l5r4-tabs -filter` | Wrapping row of core buttons; selected is bold with the selected outline | `aria-pressed="true"`, core's `active`  |

## States

| State         | Look                                                                                                                         | Markup                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Rest          | Sheet: core's tab. Filter: core's button                                                                                     |                                                                             |
| Hover         | Core's                                                                                                                       | `:hover`                                                                    |
| Focus-visible | Core's focus ring                                                                                                            | `:focus-visible`                                                            |
| Selected      | Sheet: core's active tab. Filter: bold and `--l5r4-state-selected-outline`                                                   | `aria-selected="true"` or `aria-pressed="true"`; core's `active` mirrors it |
| Disabled      | Not used: a tab that has nothing to show is not rendered (`L5R4ItemSheet#_getAvailableTabs` (`module/sheets/item-sheet.js`)) |                                                                             |

## Tokens

| Token                                                       | Use                     |
| ----------------------------------------------------------- | ----------------------- |
| `--l5r4-state-selected-outline`                             | Selected filter tab     |
| `--l5r4-space-gap-tight`                                    | Gap between filter tabs |
| `--l5r4-space-control-block`, `--l5r4-space-control-inline` | Filter tab padding      |

The selected outline reads `--l5r4-state-selected-outline` (`.l5r4-tabs-tab` (`scss/apps/_compendium-browser.scss`)),
built on `--l5r4-color-accent`: core's `--color-border-highlight` resolves to nothing in system windows
(`foundations/color.md`). Core's
`active` stays on the selected tab of both variants: core's sheet tab rules and its `button.active` rule
(`foundry2.css:4126-4130`) read it.

## Keyboard and screen reader

| Input          | Result                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Tab            | Moves through the tabs in order, then into the panel                                                        |
| Enter or Space | Selects the focused tab                                                                                     |
| Arrow keys     | Not handled: each tab is its own stop. Roving focus with arrows is new behavior and lands as its own change |
| Screen reader  | Sheet: "Details, tab, selected, 1 of 4". Filter: "Spells, button, pressed"                                  |

## Long text

A tab label is one line (`foundations/typography.md` T7) and short: the tab's name in one or two words. Filter tabs
wrap to a second row when they do not fit (`flex-wrap: wrap`); sheet tabs take core's overflow.

## Rules

| #   | Rule                                                                                                       | Enforced by                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| T1  | A tab is a `<button type="button">`                                                                        | `tests/conventions/templates.test.js`                                         |
| T2  | Sheet tabs carry `role="tablist"`, `role="tab"`, and `aria-selected`; filter tabs carry `aria-pressed`     | `tests/conventions/templates.test.js` (toggle carries `aria-pressed`); review |
| T3  | A panel marks itself active with `{{#if (eq currentTab "<id>")}}`; a tab button reads its own `tab.active` | Review                                                                        |
| T4  | Action names are kebab-case: `change-tab`, `select-tab`                                                    | `tests/conventions/actions.test.js`                                           |
| T5  | Selected shows by weight or outline as well as color                                                       | Review, in the gallery                                                        |

| #   | Conforming                                                                                                                                | Non-conforming                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| T1  | The filter tab, `<button type="button" class="l5r4-tabs-tab` (`templates/apps/compendium-browser.hbs`)                                    | `<a class="item {{tab.cssClass}}" data-action="changeTab" data-tab="{{tab.id}}">` (modeled) |
| T2  | `aria-pressed="{{#if active}}true{{else}}false{{/if}}"` (`templates/apps/compendium-browser.hbs`)                                         | The sheet tab bar with no roles (modeled)                                                   |
| T3  | `{{#if (eq currentTab "details")}}active{{/if}}` on the panel (`templates/item/_partials/_tab-details.hbs`)                               | `class="item {{tab.cssClass}}"` on the tab, a class string built in JavaScript (modeled)    |
| T4  | `"select-tab": CompendiumBrowser.#onSelectTab` (`module/apps/compendium-browser.js`)                                                      | `changeTab: L5R4ItemSheet.prototype._onChangeTab` (modeled)                                 |
| T5  | `font-weight: bold; outline: var(--l5r4-state-selected-outline);` on the selected `.l5r4-tabs-tab` (`scss/apps/_compendium-browser.scss`) | A selected tab shown by a background color only (modeled)                                   |

Picked by majority: a panel's `{{#if (eq currentTab "<id>")}}active` (5 of 7 active-state forms). The tab buttons read
`tab.active`, which `L5R4ItemSheet#prepareTabs` (`module/sheets/item-sheet.js`) sets, so no class string is built in
JavaScript.

## Do and don't

| Do                                              | Don't                                                       |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Use sheet tabs for parts of one document        | Use tabs for steps of a flow; that is a dialog's job        |
| Use filter tabs for one choice among categories | Allow more than one filter tab selected; use a filter field |
| Keep tab labels to the panel's name             | Put counts or icons in a tab label                          |

## Names

| Current                                 | Target                               | Why                                                      |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `data-action="changeTab"`               | `data-action="change-tab"`           | Stage 17 decision 15                                     |
| `data-action="selectTab"`               | `data-action="select-tab"`           | Stage 17 decision 15                                     |
| `a.item` (sheet tab)                    | `button.l5r4-tabs-tab`               | T1; `item` here collides with the item row's fixed class |
| `l5r4-browser-tabs`, `l5r4-browser-tab` | `l5r4-tabs -filter`, `l5r4-tabs-tab` | One component for both tab bars                          |

Core's `active`, `tab`, `sheet-tabs`, and `tabs` are core's names and stay.

## Keys this page needs

| Key                   | Value       | For                               |
| --------------------- | ----------- | --------------------------------- |
| `l5r4.ui.sheets.tabs` | Sheet parts | `aria-label` of the sheet tab bar |
