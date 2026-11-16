# Panels and browsers

The system's own ApplicationV2 windows that are not sheets or dialogs: the effect panel, the compendium browser, the
rules editor that sits inside item and Active Effect sheets, and the managers (XP, wealth, Emphasis, Wound
configuration, Armor configuration, combat configuration, condition manager, NPC attack configuration). They share one
window shape, one row shape, and one rule for how each saves.

| Item       | Detail                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classes    | `module/apps/*.js`; the rules editor's context and actions in `module/sheets/rules-editor.js`                                                                                                                                                                                                                                                                                                                 |
| Templates  | `templates/apps/<file-name>.hbs`, one per app; `templates/apps/compendium-browser-results.hbs`; `templates/rules/_partials/_editor.hbs`, `effect-tab.hbs`                                                                                                                                                                                                                                                     |
| SCSS       | `scss/apps/_effect-panel.scss`, `_compendium-browser.scss`, `_rules-editor.scss`; `scss/apps/_xp-manager.scss`, `_wound-config.scss`, `_emphasis-manager.scss`. The target is one `scss/apps/_<file-name>.scss` per window (rule 7)                                                                                                                                                                           |
| Tokens     | `--l5r4-space-gap-tight`, `--l5r4-space-gap`, `--l5r4-space-card`, `--l5r4-space-indent`, `--l5r4-space-control-block`, `--l5r4-space-control-inline`; `--l5r4-size-item-icon`; `--l5r4-font-size-meta`, `--l5r4-font-code`; `--l5r4-color-line-muted`, `--l5r4-color-divider`, `--l5r4-color-danger`, `--l5r4-color-accent`; `--l5r4-radius-sm`, `--l5r4-border-width-thin`; `--l5r4-state-selected-outline` |
| Components | Effect panel, compendium browser, rules editor, item row and item list, sort header, form field, button, icon button                                                                                                                                                                                                                                                                                          |
| Checks     | `tests/conventions/actions.test.js`, `tests/conventions/templates.test.js`, `tests/conventions/styles.test.js`, Stylelint; "review" where no tool can judge                                                                                                                                                                                                                                                   |

## The windows

| Window                   | File                                | Opened from                                                                      | Shows                                                                               | Saves                        |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| Effect panel             | `module/apps/effect-panel.js`       | The token controls' hourglass tool (`effect-panel.js:155-168`); opens and closes | The effects on the controlled token's actor, else the user's character (`:44-46`)   | Actions                      |
| Compendium browser       | `module/apps/compendium-browser.js` | A button in the Compendium sidebar's header (`compendium-browser.js:288-299`)    | Every visible pack entry of a tab's types, filtered and searched                    | Actions                      |
| Rules editor             | `module/sheets/rules-editor.js`     | The Rules tab of an item sheet and of an Active Effect sheet                     | The document's `system.rules`, one card per rule or the list as JSON                | Through the sheet's form     |
| XP manager               | `module/apps/xp-manager.js`         | The XP control in the PC header (`templates/actor/_partials/_stats.hbs:35`)      | XP spent of total and its breakdown, manual XP entries, purchases                   | Actions                      |
| Wealth manager           | `module/apps/wealth-manager.js`     | The wealth control in the Items section title (`_item-section.hbs:16-22`)        | Koku, bu, and zeni; add, remove, and convert                                        | Actions                      |
| Emphasis manager         | `module/apps/emphasis-manager.js`   | The Skill item's Details (`templates/item/_type-details/skill.hbs:25`)           | The Skill's Emphases as checkboxes; custom Emphases with edit and remove            | Submit (`closeOnSubmit`)     |
| Wound configuration      | `module/apps/wound-config.js`       | The gear in the Wound track (`templates/actor/_partials/_wounds.hbs:13-16`)      | Wound mode, multipliers, and modifiers                                              | Live (`DebouncedFieldMixin`) |
| Armor configuration      | `module/apps/armor-config.js`       | The gear in the Armor TN block (`_armor.hbs:7-10`)                               | Armor TN and Reduction modifiers, armor stacking                                    | Live                         |
| Combat configuration     | `module/apps/combat-config.js`      | The gear in the Initiative block (`_combat.hbs:13-16`)                           | Initiative and movement modifiers                                                   | Live                         |
| Condition manager        | `module/apps/condition-manager.js`  | The Initiative block (`_combat.hbs:6-9`)                                         | Every condition as one checkbox group (`templates/apps/condition-manager.hbs:4-10`) | Live                         |
| NPC attack configuration | `module/apps/npc-attack-config.js`  | An NPC attack row's edit control (`_stats-npc.hbs:265`)                          | One attack's name, pool, modifier, and type                                         | Submit (`closeOnSubmit`)     |

## Anatomy

### Window

| Part   | Rule                                                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Frame  | Core's: title bar, close control, resize handle where `resizable`, the window elevation (`foundations/frames.md`, Elevation)      |
| Title  | `window.title`, an i18n key ending `.title`; a window for one actor appends the actor's name                                      |
| Icon   | `window.icon`, the window's icon from `foundations/iconography.md` rule 3, `fa-solid`                                             |
| Root   | `classes: ["l5r4", "l5r4-<file-name>"]`; `id` `<file-name>-${actor.id}` for a window opened for one actor, so one opens per actor |
| Body   | Core's `standard-form` with `form-group` rows for fields, `h3` headings between groups                                            |
| Footer | Only in a window that saves on submit: the submit button, then Cancel                                                             |

### Row

The effect panel and the browser show one document per row, and the managers follow the same shape where they list
documents or entries.

| Part     | Effect panel (`templates/apps/effect-panel.hbs:6-23`)                       | Browser (`compendium-browser-results.hbs:5-25`)                  |
| -------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Image    | The effect's image, `alt=""`                                                | The entry's image, `alt=""`                                      |
| Name     | Bold                                                                        | A control that opens the entry's sheet                           |
| Details  | Source, then how long it lasts and uses left, at `meta` size                | Subtype, numbers, folder; then citation and pack, at `meta` size |
| Controls | Open source; remove, when the effect sits on the actor and the user owns it | Add (Item tabs); Import (Actor tab, GM only)                     |

### Effect panel

320 px wide, auto height, first shown at the top left of the canvas (`effect-panel.js:29`). An actor heading, then the
list, or one empty line. It redraws when token control, an effect, the actor, or the combat changes
(`effect-panel.js:173-182`).

### Compendium browser

Two parts: controls and results (`compendium-browser.js:59-65`).

| Part    | Holds                                                                               |
| ------- | ----------------------------------------------------------------------------------- |
| Tabs    | One button per tab, `aria-pressed` on the open one (`compendium-browser.hbs:2-7`)   |
| Filters | Search, one labelled select or field per filter of the tab, Clear filters (`:9-36`) |
| Count   | "Entries: {count}" (`compendium-browser-results.hbs:2`)                             |
| Results | The rows, or "Nothing matches." in the list's place (`:26-28`)                      |

A search or filter change re-renders the results part only, so the control in use keeps its focus and value
(`compendium-browser.js:58`, `:172-182`). The indexes are read once while the window is open and dropped on close
(`:204-207`).

### Rules editor

| Part      | Holds                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Toolbar   | The hint, and the switch between the form view and the JSON view (`templates/rules/_partials/_editor.hbs:3-10`)                        |
| Rule card | A `fieldset` per rule: the rule key in the `legend` with the remove control, an error line, then one field per schema field (`:15-45`) |
| JSON view | One `textarea` with the whole list (`:12-13`)                                                                                          |
| Add row   | A select of the rule keys and an "Add rule" button (`:49-56`)                                                                          |
| Empty     | "No rules." in the cards' place (`:46-48`)                                                                                             |

When the document is not editable, every field is disabled and the toolbar switch, remove controls, and add row are
not rendered (`editor.hbs:5`, `:19`, `:49`).

## States

| State        | Look                                                                                        | Where                                                             |
| ------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| No actor     | The panel says to select a token or assign a character                                      | Effect panel (`l5r4.ui.effectPanel.noActor`)                      |
| Empty        | One italic line in the list's place (`foundations/states.md` rule 9)                        | Effect panel, browser, rules editor; the managers' lists (rule 4) |
| Selected tab | Bold and the selected outline (`foundations/states.md`, Selected), `aria-pressed="true"`    | Browser tabs (`scss/apps/_compendium-browser.scss:40-43`)         |
| Can't act    | The control is not rendered: remove on an effect the user does not own, Import for a player | `effect-panel.js:85`, `compendium-browser.js:159-160`             |
| Invalid rule | The error line under the legend with the invalid look (`foundations/states.md` rule 7)      | Rules editor (`editor.hbs:25`)                                    |
| Read-only    | Fields disabled, edit controls left out                                                     | Rules editor on a document the user cannot edit                   |
| Loading      | The browser reads its indexes before its first render; the window opens when they are read  | `compendium-browser.js:92-115`                                    |
| Refused      | A warning notification: no character to add to, no permission (`patterns/feedback.md`)      | Browser Add (`compendium-browser.js:238-242`)                     |

## Rules

### 1. One window shape

Every window follows `docs/code-system/foundry-patterns.md`, Window shape: `classes` `["l5r4", "l5r4-<file-name>"]`, a
`.title` key, a `fa-solid` icon from the icon table, and a per-actor `id` for a window opened for one actor. The root
class is the window's block, and its element classes repeat the block name (`docs/code-system/naming.md`, Window root
class). Enforced by review and `tests/conventions/templates.test.js` (system classes carry `l5r4-`).

| Window                   | Root class now                                       | Target                               | Icon now                     | Target icon              |
| ------------------------ | ---------------------------------------------------- | ------------------------------------ | ---------------------------- | ------------------------ |
| XP manager               | `xp-modal-dialog`                                    | `l5r4-xp-manager`                    | `fas fa-star`                | `fa-solid fa-chart-line` |
| Wealth manager           | `wealth-manager`                                     | `l5r4-wealth-manager`                | `fas fa-calculator`          | `fa-solid fa-calculator` |
| Emphasis manager         | `emphasis-manager`                                   | `l5r4-emphasis-manager`              | `fa-solid fa-list-check`     | Same                     |
| Wound configuration      | `wound-config-app`                                   | `l5r4-wound-config`                  | `fas fa-cog`                 | `fa-solid fa-gear`       |
| Armor configuration      | `armor-config-app`                                   | `l5r4-armor-config`                  | `fas fa-cog`                 | `fa-solid fa-gear`       |
| Combat configuration     | `combat-config-app`                                  | `l5r4-combat-config`                 | `fas fa-cog`                 | `fa-solid fa-gear`       |
| Condition manager        | `condition-manager`                                  | `l5r4-condition-manager`             | `fa-solid fa-heart-pulse`    | Same                     |
| NPC attack configuration | `npc-attack-config`                                  | `l5r4-npc-attack-config`             | `fas fa-swords`              | `fa-solid fa-swords`     |
| Effect panel             | `l5r4-effect-panel`                                  | Same                                 | `fa-solid fa-hourglass-half` | Same                     |
| Compendium browser       | `l5r4-compendium-browser`; elements `l5r4-browser-*` | Elements `l5r4-compendium-browser-*` | `fa-solid fa-book-open`      | `fa-solid fa-books`      |

Conforming, `module/apps/effect-panel.js:21-34`.

Non-conforming, `module/apps/xp-manager.js:49-53`: `xp-modal-dialog` names neither the file nor the system, and
`fa-star` means a favorite in core (`foundations/iconography.md` rule 3).

### 2. One save model per window, and the window shows which

A window saves in one of three ways and shows it:

| Model   | Windows                                                      | The user sees                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live    | Wound, Armor, and combat configuration; condition manager    | No Save button. A field saves when it changes (`module/mixins/debounced-field-mixin.js`; the condition manager's own listener, `module/apps/condition-manager.js:196`); the sheet behind it updates |
| Submit  | Emphasis manager, NPC attack configuration                   | A footer with the submit button and Cancel; the window closes on save                                                                                                                               |
| Actions | XP manager, wealth manager, effect panel, compendium browser | Each button acts at once and the window redraws; no footer                                                                                                                                          |

A window never mixes two models. Enforced by review.

Conforming, `templates/apps/armor-config.hbs:2-32`: every field carries `data-action="field-change"` and the window has
no Save button.

Non-conforming, modeled: a Save button added to the Armor configuration, which already saved each field as it
changed, so the button does nothing a user can see. Under the actions model each button reads as its verb
(`content/voice.md`, Buttons): `templates/apps/xp-manager.hbs:73-76` labels its add button "Add XP"
(`l5r4.apps.xpManager.addXp`), never "OK".

### 3. Rows share one shape

A row that shows a document is image, text column, then controls at the row's end. The image is
`--l5r4-size-item-icon` square with `alt=""`; the name is bold; details sit below at `meta` size; the text column
shrinks and wraps (`min-width: 0`). A control acts on its row through `closest("[data-uuid]")`, never through the
row's index. Enforced by `tests/conventions/templates.test.js` (`<img>` has `alt`) and review; the gallery shows a row
of each window.

Conforming, `templates/apps/effect-panel.hbs:6-23` with `scss/apps/_effect-panel.scss:20-54`.

Non-conforming, `templates/apps/compendium-browser-results.hbs:9`: the entry's name is an `<a>` with no `href`, so the
one control that opens the entry takes no focus. Target: a `<button type="button" data-action="open-entry">`.

### 4. A list that can be empty says so

Every list in a window has an `{{else}}` that renders one italic line in its place (`foundations/states.md` rule 9),
a sentence ending with a period (`content/voice.md`, Hints and sentences). The line names what is missing and, where
there is one, what to do. Enforced by review; the gallery shows each window empty.

Conforming, `templates/apps/effect-panel.hbs:26-28`: "No effects on {name}." and, with no actor, "Select a token, or
assign a character, to see its effects."

Non-conforming, `templates/apps/xp-manager.hbs:89` and `:134`: `{{#if manualEntries}}` and `{{#if spentEntries}}` with
no `{{else}}`, so an empty ledger shows a header over nothing. `templates/rules/_partials/_editor.hbs:47` sets its empty line in
the hint look; `templates/apps/emphasis-manager.hbs:50` in a bare `<p>`.

### 5. The browser filters without losing the user's place

Tabs are buttons with `aria-pressed` inside a `nav` with a name. Each filter is a native control inside its `<label>`.
A filter or search change re-renders the results part alone. The count line carries `aria-live="polite"`, so a screen
reader hears the new count after each change. "Clear filters" resets the search and every filter. A new tab starts
with no filter chosen (`compendium-browser.js:215-219`). Enforced by review and the browser's Quench batch.

Conforming, `templates/apps/compendium-browser.hbs:2-36`: the tab buttons, `aria-label` on the `nav`, and labelled
filters.

Non-conforming, `templates/apps/compendium-browser-results.hbs:2`: the count changes with no announcement.

### 6. The rules editor keeps both views of one list

The form view and the JSON view edit the same `system.rules`; switching views saves the current one first
(`module/sheets/rules-editor.js:102-106`). A rule that fails validation keeps its card with the error line under its
legend, in words, with the invalid icon, and its fields link to it with `aria-describedby`
(`foundations/states.md` rule 7). The card's remove control is an icon button named "Remove this rule". Rule keys and
field names show as stored, since they are fixed names (Stage 17 decision 2). Enforced by review and the
`l5r4-enhanced.rules` Quench batch.

Conforming, `templates/rules/_partials/_editor.hbs:16-45`: one `fieldset` per rule with its key as the `legend`.

Non-conforming, `templates/rules/_partials/_editor.hbs:20-22`: the remove control is an `<a>` with no `href` and an icon with no
`inert`; `:25` shows the error in color alone.

### 7. One stylesheet per window

A window's styles sit in `scss/apps/_<file-name>.scss` under its root class (`docs/code-system/templates-and-styles.md`,
Folders). A part shared with another window or a sheet (the row, the rule card) is a component in
`scss/components/`. Enforced by `tests/conventions/names.test.js` and `tests/conventions/styles.test.js` (one component
per file).

| Now                                                                                                                      | Target                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scss/apps/_effect-panel.scss` (panel, text links `:63-83`, request card `:85-87`)                                       | `scss/apps/_effect-panel.scss`; links to `scss/components/_inline-link.scss`; the request card to `scss/components/_request-card.scss`                                                              |
| `scss/apps/_compendium-browser.scss` (browser, item summary `:128-143`)                                                  | `scss/apps/_compendium-browser.scss`; the summary to `scss/components/_item-summary-card.scss`                                                                                                      |
| `scss/components/_rules-editor.scss` (editor, ledger dialog `:60-75`, ledger button `:77-80`, activate control `:82-84`) | The editor stays a component; the ledger to `scss/components/_ledger-dialog.scss`; the activate control to `scss/components/_inline-control.scss`; the ledger button to the component that draws it |

Conforming, `scss/apps/_wound-config.scss:6-10`: one window's rules under its root class (renamed `l5r4-wound-config`
by rule 1).

Non-conforming, `scss/apps/_effect-panel.scss:0-4`: a header titled "Table tools" over three components.

### 8. Actions are kebab-case, verb first

Every `DEFAULT_OPTIONS.actions` key and `data-action` value in these windows is kebab-case (Stage 17 decision 15),
verb first (`docs/code-system/naming.md`, `data-action` value). Enforced by `tests/conventions/actions.test.js`.

| Window             | Now                                                                 | Target                                                                           |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Effect panel       | `openSource`, `removeEffect`                                        | `open-source`, `delete-effect`                                                   |
| Compendium browser | `selectTab`, `clearFilters`, `openEntry`, `addEntry`, `importEntry` | `select-tab`, `clear-filters`, `open-entry`, `add-entry`, `import-entry`         |
| Rules editor       | `rulesMode`, `rulesDelete`, `rulesAdd`                              | `toggle-rules-view`, `delete-rule`, `create-rule` (`components/rules-editor.md`) |
| Emphasis manager   | `addCustom`, `editCustom`, `deleteCustom`                           | `add-emphasis`, `edit-emphasis`, `delete-emphasis`                               |
| Skill item sheet   | `manageEmphases`                                                    | `open-emphasis-manager`                                                          |
| XP manager         | `xp-add-confirm`, `xp-delete-manual`, `recalculate-xp-purchase`     | `add-xp`, `delete-xp-entry`, `recalculate-xp`                                    |

`close` in the Emphasis manager's footer is core's action and keeps core's name.

Conforming, `module/apps/wealth-manager.js:50`: `"add-money"`.

Non-conforming, `module/apps/effect-panel.js:30-33`: camelCase keys.

### 9. A computed value is text

A total the system works out (XP spent of total, current wealth) shows as text, never as a disabled input
(`foundations/states.md` rule 6). Enforced by review.

Conforming, `templates/apps/wealth-manager.hbs:5-16`: each coin's amount in a `div`.

Non-conforming, `templates/apps/xp-manager.hbs:7`: `<input type="text" disabled value="{{xp.spent}} / {{xp.total}}" />`.

## Keyboard and screen reader

| Contract    | Detail                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus       | Core focuses the window on open; Tab moves through the body in document order, then the footer                                                                 |
| Controls    | Every action is a `<button type="button">` or a native control. Icon-only controls carry `data-tooltip` and `aria-label` (`foundations/iconography.md` rule 4) |
| Rows        | The row is a `li` in a `ul`, so a screen reader counts the entries; its controls follow its text                                                               |
| Live counts | The browser's count is a polite live region (rule 5); the effect panel's redraws announce nothing                                                              |
| Drag        | Every dragged row has a button that does the same job (`patterns/dialogs.md` rule 6)                                                                           |
| Escape      | Closes the window (core)                                                                                                                                       |

## Long text

| Element              | Behavior                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Row name and details | The text column shrinks and wraps beside the image (`_effect-panel.scss:34-39`, `_compendium-browser.scss:101-106`) |
| Effect duration      | Phrases joined with "; " and wrap (`effect-panel.js:84`)                                                            |
| Browser tabs         | One line each; the strip wraps when the window is narrow (`_compendium-browser.scss:30-34`)                         |
| Rule field values    | JSON fields are `textarea`s that grow by hand (`resize: vertical`, `_rules-editor.scss:49-53`)                      |
| Manager labels       | `form-group` labels wrap; the field keeps its width                                                                 |
| Window title         | Core's title bar: the actor's name appended after the window's name                                                 |

## Do and don't

| Do                                                                     | Don't                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Give a new window `["l5r4", "l5r4-<file-name>"]` and its own SCSS file | Name the root class after anything but the file           |
| Pick one save model and show it: live, submit, or actions              | Add a Save button to a window whose fields save on change |
| Render a row as image, text, controls                                  | Put a control before the name                             |
| Re-render only the part that changed                                   | Re-render the controls while the user types in the search |
| Leave out a control the user cannot use                                | Show a remove control that refuses every click            |
| Show an empty list as one italic sentence                              | Leave a header over nothing                               |
