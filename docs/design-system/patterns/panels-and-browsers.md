# Panels and browsers

The system's own ApplicationV2 windows that are not sheets or dialogs: the effect panel, the compendium browser, the rules editor that sits inside item and Active Effect sheets, and the managers (XP, wealth, Emphasis, Wound configuration, Armor configuration, combat configuration, condition manager, NPC attack configuration). They share one window shape, one row shape, and one rule for how each saves.

| Item | Detail |
| --- | --- |
| Classes | `module/apps/*.js`; the rules editor's context and actions in `module/sheets/rules-editor.js` |
| Templates | `templates/apps/<file-name>.hbs`, one per app; `templates/apps/compendium-browser-results.hbs`; `templates/rules/_partials/_editor.hbs`, `effect-tab.hbs` |
| SCSS | `scss/apps/_effect-panel.scss`, `_compendium-browser.scss`, `_xp-manager.scss`, `_wound-config.scss`, `_emphasis-manager.scss`; `scss/components/_rules-editor.scss`. A window with styles of its own has one `scss/apps/_<file-name>.scss` (rule 7) |
| Tokens | `--l5r4-space-gap-tight`, `--l5r4-space-gap`, `--l5r4-space-card`, `--l5r4-space-indent`, `--l5r4-space-control-block`, `--l5r4-space-control-inline`; `--l5r4-size-item-icon`; `--l5r4-font-size-meta`, `--l5r4-font-code`; `--l5r4-color-line-muted`, `--l5r4-color-divider`, `--l5r4-color-danger`, `--l5r4-color-accent`; `--l5r4-radius-sm`, `--l5r4-border-width-thin`; `--l5r4-state-selected-outline` |
| Components | Effect panel, compendium browser, rules editor, item row and item list, sort header, form field, button, icon button |
| Checks | `tests/conventions/actions.test.js`, `tests/conventions/templates.test.js`, `tests/conventions/styles.test.js`, Stylelint; "review" where no tool can judge |

## The windows

| Window | File | Opened from | Shows | Saves |
| --- | --- | --- | --- | --- |
| Effect panel | `module/apps/effect-panel.js` | The token controls' hourglass tool, `EffectPanelApplication.onGetSceneControlButtons` (`module/apps/effect-panel.js`); opens and closes | The effects on the controlled token's actor, else the user's character: `EffectPanelApplication#actor` (`module/apps/effect-panel.js`) | Actions |
| Compendium browser | `module/apps/compendium-browser.js` | A button in the Compendium sidebar's header, `CompendiumBrowserApplication.onRenderCompendiumDirectory` (`module/apps/compendium-browser.js`) | Every visible pack entry of a tab's types, filtered and searched | Actions |
| Rules editor | `module/sheets/rules-editor.js` | The Rules tab of an item sheet and of an Active Effect sheet | The document's `system.rules`, one card per rule or the list as JSON | Through the sheet's form |
| XP manager | `module/apps/xp-manager.js` | The XP control in the PC header, `data-action="open-xp-manager"` (`templates/actor/_partials/_stats.hbs`) | XP spent of total and its breakdown, manual XP entries, purchases | Actions |
| Wealth manager | `module/apps/wealth-manager.js` | The wealth control in the Items section title, `data-action="open-wealth-manager"` (`templates/actor/_partials/_item-section.hbs`) | Koku, bu, and zeni; add, remove, and convert | Actions |
| Emphasis manager | `module/apps/emphasis-manager.js` | The Skill item's Details, `data-action="open-emphasis-manager"` (`templates/item/_type-details/skill.hbs`) | The Skill's Emphases as checkboxes; custom Emphases with edit and remove | Submit (`closeOnSubmit`) |
| Wound configuration | `module/apps/wound-config.js` | The gear in the Wound track, `data-action="open-wound-config"` (`templates/actor/_partials/_wounds.hbs`) | Wound mode, multipliers, and modifiers | Live (`FieldSaveMixin`) |
| Armor configuration | `module/apps/armor-config.js` | The gear in the Armor TN block, `data-action="open-armor-config"` (`templates/actor/_partials/_armor.hbs`) | Armor TN and Reduction modifiers, armor stacking | Live |
| Combat configuration | `module/apps/combat-config.js` | The gear in the Initiative block, `data-action="open-combat-config"` (`templates/actor/_partials/_combat.hbs`) | Initiative and movement modifiers | Live |
| Condition manager | `module/apps/condition-manager.js` | The Initiative block, `data-action="open-condition-manager"` (`templates/actor/_partials/_combat.hbs`) | Every condition as one checkbox group, `multi-checkbox` (`templates/apps/condition-manager.hbs`) | Live |
| NPC attack configuration | `module/apps/npc-attack-config.js` | An NPC attack row's edit control, `data-action="edit-attack"` (`templates/cards/_partials/_controls.hbs`) | One attack's name, pool, modifier, and type | Submit (`closeOnSubmit`) |

## Anatomy

### Window

| Part | Rule |
| --- | --- |
| Frame | Core's: title bar, close control, resize handle where `resizable`, the window elevation (`foundations/frames.md`, Elevation) |
| Title | `window.title`, an i18n key ending `.title`; a window for one actor shows its `.titleFor` key, the actor's name as `{name}` |
| Icon | `window.icon`, the window's icon from `foundations/iconography.md` rule 3, `fa-solid` |
| Root | `classes: ["l5r4", "l5r4-<file-name>"]`; `id` `<file-name>-${actor.id}` for a window opened for one actor, so one opens per actor |
| Body | Core's `standard-form` with `form-group` rows for fields, `h3` headings between groups |
| Footer | Only in a window that saves on submit: the submit button, then Cancel |

### Row

The effect panel and the browser show one document per row, and the managers follow the same shape where they list documents or entries.

| Part | Effect panel, `l5r4-effect-panel-row` (`templates/apps/effect-panel.hbs`) | Browser, `l5r4-compendium-browser-row` (`templates/apps/compendium-browser-results.hbs`) |
| --- | --- | --- |
| Image | The effect's image, `alt=""` | The entry's image, `alt=""` |
| Name | Bold | A control that opens the entry's sheet |
| Details | Source, then how long it lasts and uses left, at `meta` size | Subtype, numbers, folder; then citation and pack, at `meta` size |
| Controls | Open source; remove, when the effect sits on the actor and the user owns it | Add (Item tabs); Import (Actor tab, GM only) |

### Effect panel

320 px wide, auto height, first shown at the top left of the canvas: `EffectPanelApplication.DEFAULT_OPTIONS` (`module/apps/effect-panel.js`). An actor heading, then the list, or one empty line. It redraws when token control, an effect, the actor, or the combat changes: `EFFECT_PANEL_REDRAWS` (`module/hooks/register-all.js`).

### Compendium browser

Two parts: controls and results, `CompendiumBrowserApplication.PARTS` (`module/apps/compendium-browser.js`).

| Part | Holds |
| --- | --- |
| Tabs | One button per tab, `aria-pressed` on the open one: `data-action="select-tab"` (`templates/apps/compendium-browser.hbs`) |
| Filters | Search, one labelled select or field per filter of the tab, Clear filters: `l5r4-compendium-browser-filters` (`templates/apps/compendium-browser.hbs`) |
| Count | "Entries: {count}": `l5r4-compendium-browser-count` (`templates/apps/compendium-browser-results.hbs`) |
| Results | The rows, or "Nothing matches." in the list's place: `l5r4-compendium-browser-empty` (`templates/apps/compendium-browser-results.hbs`) |

A search or filter change re-renders the results part only, so the control in use keeps its focus and value: `CompendiumBrowserApplication#_onRender` (`module/apps/compendium-browser.js`). The indexes are read once while the window is open and dropped on close: `CompendiumBrowserApplication#_onClose` (`module/apps/compendium-browser.js`).

### Rules editor

| Part | Holds |
| --- | --- |
| Toolbar | The hint, and the switch between the form view and the JSON view: `l5r4-rules-editor-toolbar` (`templates/rules/_partials/_editor.hbs`) |
| Rule card | A `fieldset` per rule: the rule key in the `legend` with the remove control, an error line, then one field per schema field: `l5r4-rules-editor-card` (`templates/rules/_partials/_editor.hbs`) |
| JSON view | One `textarea` with the whole list: `l5r4-rules-editor-json` (`templates/rules/_partials/_editor.hbs`) |
| Add row | A select of the rule keys and an "Add rule" button: `l5r4-rules-editor-add` (`templates/rules/_partials/_editor.hbs`) |
| Empty | "No rules." in the cards' place: `l5r4.ui.rules.none` (`templates/rules/_partials/_editor.hbs`) |

When the document is not editable, every field is disabled and the toolbar switch, remove controls, and add row are not rendered: each sits under `rulesEditable` (`templates/rules/_partials/_editor.hbs`).

## States

| State | Look | Where |
| --- | --- | --- |
| No actor | The panel says to select a token or assign a character | Effect panel (`l5r4.apps.effectPanel.noActor`) |
| Empty | One italic line in the list's place (`foundations/states.md` rule 9) | Effect panel, browser, rules editor; the managers' lists (rule 4) |
| Selected tab | Bold and the selected outline (`foundations/states.md`, Selected), `aria-pressed="true"` | Browser tabs: `.l5r4-tabs-tab` (`scss/apps/_compendium-browser.scss`), its `&.active` |
| Can't act | The control is not rendered: remove on an effect the user does not own, Import for a player | `canRemove` in `EffectPanelApplication#buildRow` (`module/apps/effect-panel.js`); `canImport` in `CompendiumBrowserApplication#_prepareContext` (`module/apps/compendium-browser.js`) |
| Invalid rule | The error line under the legend with the invalid look (`foundations/states.md` rule 7) | Rules editor: `l5r4-rules-editor-error` (`templates/rules/_partials/_editor.hbs`) |
| Read-only | Fields disabled, edit controls left out | Rules editor on a document the user cannot edit |
| Loading | The browser reads its indexes before its first render; the window opens when they are read | `CompendiumBrowserApplication#getEntries` (`module/apps/compendium-browser.js`) |
| Refused | A warning notification: no character to add to, no permission (`patterns/feedback.md`) | Browser Add: `CompendiumBrowserApplication.#onAddEntry` (`module/apps/compendium-browser.js`) |

## Rules

### 1. One window shape

Every window follows `docs/code-system/foundry-patterns.md`, Window shape: `classes` `["l5r4", "l5r4-<file-name>"]`, a `.title` key, a `fa-solid` icon from the icon table, and a per-actor `id` for a window opened for one actor. The root class is the window's block, and its element classes repeat the block name (`docs/code-system/naming.md`, Window root class). Enforced by review and `tests/conventions/templates.test.js` (system classes carry `l5r4-`).

| Window | Root class | Elements | Icon |
| --- | --- | --- | --- |
| XP manager | `l5r4-xp-manager` | `l5r4-xp-manager-*` | `fa-solid fa-chart-line` |
| Wealth manager | `l5r4-wealth-manager` | `l5r4-wealth-manager-*` | `fa-solid fa-calculator` |
| Emphasis manager | `l5r4-emphasis-manager` | `l5r4-emphasis-manager-*` | `fa-solid fa-list-check` |
| Wound configuration | `l5r4-wound-config` | `l5r4-wound-config-*` | `fa-solid fa-gear` |
| Armor configuration | `l5r4-armor-config` | `l5r4-armor-config-*` | `fa-solid fa-gear` |
| Combat configuration | `l5r4-combat-config` | `l5r4-combat-config-*` | `fa-solid fa-gear` |
| Condition manager | `l5r4-condition-manager` | `l5r4-condition-manager-*` | `fa-solid fa-heart-pulse` |
| NPC attack configuration | `l5r4-npc-attack-config` | `l5r4-npc-attack-config-*` | `fa-solid fa-swords` |
| Effect panel | `l5r4-effect-panel` | `l5r4-effect-panel-*` | `fa-solid fa-hourglass-half` |
| Compendium browser | `l5r4-compendium-browser` | `l5r4-compendium-browser-*` | `fa-solid fa-books` |

Conforming, `EffectPanelApplication.DEFAULT_OPTIONS` (`module/apps/effect-panel.js`).

Non-conforming, modeled: a root class `xp-modal-dialog`, which names neither the file nor the system, with `fa-star`, which means a favorite in core (`foundations/iconography.md` rule 3).

### 2. One save model per window, and the window shows which

A window saves in one of three ways and shows it:

| Model | Windows | The user sees |
| --- | --- | --- |
| Live | Wound, Armor, and combat configuration; condition manager | No Save button. A field saves when it changes: `module/mixins/field-save-mixin.js`, or the condition manager's own listener, `ConditionManagerApplication#_onCheckboxChange` (`module/apps/condition-manager.js`); the sheet behind it updates |
| Submit | Emphasis manager, NPC attack configuration | A footer with the submit button and Cancel; the window closes on save |
| Actions | XP manager, wealth manager, effect panel, compendium browser | Each button acts at once and the window redraws; no footer |

A window never mixes two models. Enforced by review.

Conforming, `data-action="update-field"` (`templates/apps/armor-config.hbs`): every field carries it and the window has no Save button.

Non-conforming, modeled: a Save button added to the Armor configuration, which already saved each field as it changed, so the button does nothing a user can see. Under the actions model each button reads as its verb (`content/voice.md`, Buttons): `data-action="add-xp"` (`templates/apps/xp-manager.hbs`) labels its add button "Add XP" (`l5r4.apps.xpManager.addXp`), never "OK".

### 3. Rows share one shape

A row that shows a document is image, text column, then controls at the row's end. The image is `--l5r4-size-item-icon` square with `alt=""`; the name is bold; details sit below at `meta` size; the text column shrinks and wraps (`min-width: 0`). A control acts on its row through `closest("[data-uuid]")`, never through the row's index. Enforced by `tests/conventions/templates.test.js` (`<img>` has `alt`) and review; the gallery shows a row of each window.

Conforming, `l5r4-effect-panel-row` (`templates/apps/effect-panel.hbs`) with `.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`) and the rules after it; the browser's name, `data-action="open-entry"` (`templates/apps/compendium-browser-results.hbs`), a `<button type="button">`.

Non-conforming, modeled: the entry's name as an `<a>` with no `href`, so the one control that opens the entry takes no focus.

### 4. A list that can be empty says so

Every list in a window has an `{{else}}` that renders one italic line in its place (`foundations/states.md` rule 9), a sentence ending with a period (`content/voice.md`, Hints and sentences). The line names what is missing and, where there is one, what to do. Enforced by review; the gallery shows each window empty.

Conforming, `l5r4-effect-panel-empty` (`templates/apps/effect-panel.hbs`): "No effects on {name}." and, with no actor, "Select a token, or assign a character, to see its effects."

Conforming, `l5r4-xp-manager-empty` (`templates/apps/xp-manager.hbs`), each ledger list's `{{else}}`, and `l5r4-rules-editor-empty` (`templates/rules/_partials/_editor.hbs`), the rules editor's.

Non-conforming, `l5r4.apps.emphasisManager.noEmphases` (`templates/apps/emphasis-manager.hbs`) in a bare `<p>`.

### 5. The browser filters without losing the user's place

Tabs are buttons with `aria-pressed` inside a `nav` with a name. Each filter is a native control inside its `<label>`. A filter or search change re-renders the results part alone. The count line carries `aria-live="polite"`, so a screen reader hears the new count after each change. "Clear filters" resets the search and every filter. A new tab starts with no filter chosen: `CompendiumBrowserApplication.#onSelectTab` (`module/apps/compendium-browser.js`). Enforced by review and the browser's Quench batch.

Conforming, `l5r4-compendium-browser-controls` (`templates/apps/compendium-browser.hbs`): the tab buttons, `aria-label` on the `nav`, and labelled filters.

Conforming, `l5r4-compendium-browser-count` (`templates/apps/compendium-browser-results.hbs`): `aria-live="polite"` on the count line.

Non-conforming (modeled): a count that changes with no announcement.

### 6. The rules editor keeps both views of one list

The form view and the JSON view edit the same `system.rules`; switching views saves the current one first, in the `toggle-rules-view` action of `RULES_EDITOR_ACTIONS` (`module/sheets/rules-editor.js`). A rule that fails validation keeps its card with the error line under its legend, in words, with the invalid icon, and its fields link to it with `aria-describedby` (`foundations/states.md` rule 7). The card's remove control is an icon button named "Remove this rule". Rule keys and field names show as stored, since they are fixed names (Stage 17 decision 2). Enforced by review and the `l5r4-enhanced.rules` Quench batch.

Conforming, `l5r4-rules-editor-card` (`templates/rules/_partials/_editor.hbs`): one `fieldset` per rule with its key as the `legend`; `l5r4-rules-editor-delete` (`templates/rules/_partials/_editor.hbs`), the remove control, a button named "Remove this rule" with an `inert` icon.

Conforming, `l5r4-rules-editor-error` (`templates/rules/_partials/_editor.hbs`): the error line with the invalid icon, which each of its rule's fields names in `aria-describedby`.

Non-conforming (modeled): an error line in color alone that no field points at.

### 7. One stylesheet per window

A window's styles sit in `scss/apps/_<file-name>.scss` under its root class (`docs/code-system/templates-and-styles.md`, Folders). A part shared with another window or a sheet (the row, the rule card) is a component in `scss/components/`. Enforced by `tests/conventions/names.test.js` and `tests/conventions/styles.test.js` (one component per file).

| Part               | Stylesheet                                |
| ------------------ | ----------------------------------------- |
| Effect panel       | `scss/apps/_effect-panel.scss`            |
| Compendium browser | `scss/apps/_compendium-browser.scss`      |
| Rules editor       | `scss/components/_rules-editor.scss`      |
| Text links         | `scss/components/_inline-link.scss`       |
| Request card       | `scss/components/_request-card.scss`      |
| Item summary       | `scss/components/_item-summary-card.scss` |
| Ledger dialog      | `scss/components/_ledger-dialog.scss`     |
| Activate control   | `scss/components/_inline-control.scss`    |

Conforming, `.l5r4-wound-config` (`scss/apps/_wound-config.scss`): one window's rules under its root class.

Non-conforming, modeled: a window's stylesheet under a header such as "Table tools" that holds three components.

### 8. Actions are kebab-case, verb first

Every `DEFAULT_OPTIONS.actions` key and `data-action` value in these windows is kebab-case (Stage 17 decision 15), verb first (`docs/code-system/naming.md`, `data-action` value). Enforced by `tests/conventions/actions.test.js`.

| Window | Actions |
| --- | --- |
| Effect panel | `open-source`, `delete-effect` |
| Compendium browser | `select-tab`, `clear-filters`, `open-entry`, `add-entry`, `import-entry` |
| Rules editor | `toggle-rules-view`, `delete-rule`, `create-rule` (`components/rules-editor.md`) |
| Emphasis manager | `add-emphasis`, `edit-emphasis`, `delete-emphasis` |
| Skill item sheet | `open-emphasis-manager` |
| XP manager | `add-xp`, `delete-xp-entry`, `change-disadvantage-cap` (the GM's only), `recalculate-xp` |

`close` in the Emphasis manager's footer is core's action and keeps core's name. The XP manager renders `add-xp`, `delete-xp-entry`, and `change-disadvantage-cap` for a GM alone, and a player sees the cap as text (`foundations/states.md`, Read-only); the handlers do nothing for a player (`module/apps/xp-manager.js`).

Conforming, `WealthManagerApplication.DEFAULT_OPTIONS` (`module/apps/wealth-manager.js`): `"add-money"`.

Non-conforming, modeled: camelCase keys such as `openSource`.

### 9. A computed value is text

A total the system works out (XP spent of total, current wealth) shows as text, never as a disabled input (`foundations/states.md` rule 6). Enforced by review.

Conforming, `l5r4-wealth-manager-value` (`templates/apps/wealth-manager.hbs`): each coin's amount in a `div`; `l5r4-xp-manager-total` (`templates/apps/xp-manager.hbs`): the XP spent of total as text.

Non-conforming (modeled): `<input type="text" disabled value="{{xp.spent}} / {{xp.total}}" />`.

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Focus | Core focuses the window on open; Tab moves through the body in document order, then the footer |
| Controls | Every action is a `<button type="button">` or a native control. Icon-only controls carry `data-tooltip` and `aria-label` (`foundations/iconography.md` rule 4) |
| Rows | The row is a `li` in a `ul`, so a screen reader counts the entries; its controls follow its text |
| Live counts | The browser's count is a polite live region (rule 5); the effect panel's redraws announce nothing |
| Drag | Every dragged row has a button that does the same job (`patterns/dialogs.md` rule 6) |
| Escape | Closes the window (core) |

## Long text

| Element | Behavior |
| --- | --- |
| Row name and details | The text column shrinks and wraps beside the image: `.l5r4-effect-panel-text` (`scss/apps/_effect-panel.scss`), `.l5r4-compendium-browser-text` (`scss/apps/_compendium-browser.scss`) |
| Effect duration | Phrases joined with "; " and wrap: `EffectPanelApplication#buildRow` (`module/apps/effect-panel.js`) |
| Browser tabs | One line each; the strip wraps when the window is narrow: `.l5r4-tabs.-filter` (`scss/apps/_compendium-browser.scss`) |
| Rule field values | JSON fields are `textarea`s that grow by hand, `resize: vertical`: `.l5r4-rules-editor-field textarea` (`scss/components/_rules-editor.scss`) |
| Manager labels | `form-group` labels wrap; the field keeps its width |
| Window title | Core's title bar: the window's `.titleFor` key, the actor's name after the window's name |

## Do and don't

| Do | Don't |
| --- | --- |
| Give a new window `["l5r4", "l5r4-<file-name>"]` and its own SCSS file | Name the root class after anything but the file |
| Pick one save model and show it: live, submit, or actions | Add a Save button to a window whose fields save on change |
| Render a row as image, text, controls | Put a control before the name |
| Re-render only the part that changed | Re-render the controls while the user types in the search |
| Leave out a control the user cannot use | Show a remove control that refuses every click |
| Show an empty list as one italic sentence | Leave a header over nothing |
