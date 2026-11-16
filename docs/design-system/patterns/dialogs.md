# Dialogs

How the system asks the user something and waits: the check dialog with its modifier toggles, choice prompts, pickers
with a route that needs no drag, and confirmations, destructive ones included. Every dialog is core's
`foundry.applications.api.DialogV2` (CLAUDE.md **Foundry Integration**); the system writes its content and buttons,
and core draws the window, the footer, and the keyboard handling.

| Item       | Detail                                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API        | `DialogV2.prompt`, `DialogV2.confirm`, `DialogV2.wait`, `DialogV2.input` (`resources/app/client/applications/api/dialog.mjs:346-405`)                                                                                                                                                           |
| Templates  | `templates/dialogs/check-dialog.hbs` with `check-extras/ring.hbs`, `spell.hbs`, `slot.hbs`, `maho.hbs`; `ledger-dialog.hbs`, `unified-item-create-dialog.hbs`, `custom-emphasis-dialog.hbs`, `disadvantage-cap-dialog.hbs`                                                                      |
| Paths      | `DIALOG_TEMPLATES` in `module/config/templates.js:112-120`                                                                                                                                                                                                                                      |
| Callers    | `ask*` functions in services (`docs/code-system/naming.md`, verb vocabulary): `askChoices` (`module/services/dice/check/roll-check.js:165-184`), `askChoice` and `askSchool` (`module/services/purchase.js:58-81`, `:157-172`), `askDisadvantageCap` (`module/services/xp/disadvantage-cap.js`) |
| SCSS       | `scss/components/_check-dialog.scss:5-28` today (`l5r4-check-dialog`); `scss/components/_check-dialog.scss` and `scss/components/_ledger-dialog.scss`                                                                                                                                           |
| Tokens     | `--l5r4-space-gap-tight`, `--l5r4-space-gap`, `--l5r4-font-code`, `--l5r4-font-size-meta`, `--l5r4-color-warning`, `--l5r4-color-text`, `--l5r4-state-disabled-opacity`                                                                                                                         |
| Components | Check dialog, ledger dialog, form field, button                                                                                                                                                                                                                                                 |
| Checks     | ESLint `no-restricted-syntax` (no global `Dialog`, no HTML strings), `tests/conventions/templates.test.js`, `tests/conventions/names.test.js`, `tests/lang.test.js`; "review" where no tool can judge                                                                                           |

## Anatomy

Core wraps the content in `form.dialog-form` and renders the buttons in a `footer.form-footer`
(`dialog.mjs:205-215`).

| #   | Part    | Owner  | Detail                                                                                                                  |
| --- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Title   | System | `window.title`: what is being decided. The check dialog uses the roll's label (`roll-check.js:177`)                     |
| 2   | Content | System | A template from `templates/dialogs/`, rendered to a string; core cleans the string (`dialog.mjs:192`)                   |
| 3   | Buttons | System | `buttons`, or the `ok`, `yes`, `no` options of the helpers. Each has an `action`, a `label` key, and an optional `icon` |
| 4   | Frame   | Core   | The window, its close control, the footer layout, the focus ring                                                        |

## Variants

| Variant       | Helper              | Resolves to                              | Used for                                                                                                        |
| ------------- | ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Check dialog  | `prompt`, modal     | The form's values, or `null` when closed | Every roll the pipeline makes, unless Shift skips it (`roll-check.js:176-183`)                                  |
| Choice prompt | `prompt` or `input` | The chosen value, or `null`              | A rule's open choice (`purchase.js:58-81`), the ledger change, a name                                           |
| Choice of two | `wait` with buttons | The pressed button's action, or `null`   | Add a School beside the others or replace them (`purchase.js:157-172`)                                          |
| Confirmation  | `confirm`           | `true`, `false`, or `null` when closed   | End the encounter, start a session, a GM allowing a roll the rules forbid (`module/services/gm-allow.js:15-25`) |
| Destructive   | `confirm`           | As above                                 | Removing an item, an NPC attack, a custom Emphasis (rule 3)                                                     |

A window that stays open while the user works (the XP manager, the wealth manager) is an app, not a dialog
(`patterns/panels-and-browsers.md`).

## The check dialog

One dialog for every roll (`templates/dialogs/check-dialog.hbs`), 420 px wide and modal (`roll-check.js:178-182`).
Its rows appear only when they apply.

| Row                    | Control                                                                   | Shown when                   |
| ---------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| Pool                   | Text: the pool before choices (`:2`)                                      | Always                       |
| Modifiers              | One checkbox per rule modifier, with its label and its change (`:4-15`)   | Rules offer modifiers        |
| Substitutes            | One checkbox per substitute Trait or Skill (`:17-28`)                     | Rules offer substitutes      |
| TN                     | Number input, the TN changes as a hint, Wound penalty checkbox (`:30-44`) | The roll has a TN            |
| Raises                 | Number input bounded by the allowed minimum and maximum (`:46-52`)        | Raises are allowed           |
| Free Raises to the TN  | Number input up to the Free Raises held (`:53-58`)                        | The roller holds Free Raises |
| Unskilled hint         | One line (`:59-61`)                                                       | An Unskilled Roll            |
| Void Point             | Checkbox, the Void Points left in its label; disabled at none (`:63-76`)  | A Void Point may be spent    |
| Embrace Taint          | Checkbox (`:78-83`)                                                       | The rules allow it           |
| Emphasis               | Select (`:85-93`)                                                         | The Skill has Emphases       |
| Attack                 | Ranged checkbox and the maneuvers fieldset (`:95-144`)                    | An attack                    |
| Social resistance      | Checkbox (`:146-155`)                                                     | The rules allow it           |
| Roll, Keep, Total mods | Number inputs (`:157-168`)                                                | Always                       |
| Keep fewer             | Number input (`:169-172`)                                                 | Always                       |
| Extras                 | Spell casting, spell slot, maho (`templates/dialogs/check-extras/`)       | The request passes `extras`  |

The one button is "Roll" (`roll-check.js:180`). Closing the dialog cancels the roll.

## Rules

### 1. Content comes from a template

A dialog's content is a template in `templates/dialogs/`, named `<name>-dialog.hbs`, rendered with
`foundry.applications.handlebars.renderTemplate` and listed in `DIALOG_TEMPLATES`. No dialog content is an HTML string
built in JavaScript, and none uses the global `Dialog`. The template has no `<form>` of its own: core's form wraps it,
and a nested form breaks the submit. A confirmation shares one template, `templates/dialogs/confirm-dialog.hbs`, with
two parameters, `question` and `consequence`, each already localized. Enforced by ESLint `no-restricted-syntax` (no
HTML strings; `DialogV2` content is a template; no global `Dialog`) and `tests/conventions/names.test.js` (the
`-dialog.hbs` suffix).

Conforming, `module/services/dice/check/roll-check.js:172-183`: `renderTemplate(DIALOG_TEMPLATES.check, ...)` passed
as `content`. Conforming, `askDisadvantageCap` in `module/services/xp/disadvantage-cap.js`:
`R(DIALOG_TEMPLATES.disadvantageCap, { currentCap })` passed as `content`, the template with no `<form>` and its label
linked to the field by `for`; the XP manager's `#onChangeDisadvantageCap` (`module/apps/xp-manager.js`) calls it and
stores the answer.

Non-conforming, `module/sheets/handlers/item-crud-handler.js:191-196`: `` content: `<p>${...}</p>` ``; the same at
`module/services/purchase.js:71-73`, `:101-103`, `:160-166`, `module/services/gm-allow.js:21-24`,
`module/sheets/handlers/npc-actions-handler.js:679-682`, and
`module/sheets/handlers/pc-actions-handler.js:134-136`. `templates/dialogs/unified-item-create-dialog.hbs:1` opens its
own `<form>`.

### 2. Buttons name the action

The submitting button's label is the action's verb, from `lang/en.json`: "Roll", "Remove", "Replace", "Add as another
School" (`content/voice.md`, Buttons). A confirmation overrides core's "Yes" and "No" with `yes: { label }` and
`no: { label: "l5r4.ui.common.cancel" }`. Enforced by review; `tests/lang.test.js` checks button keys carry no period.

Conforming, `module/services/purchase.js`, `askSchool`: the School choice's buttons read "Add as another School" and
"Replace"; `module/services/session.js`, `startNewSession`: the confirmation's buttons read "Start session" and
"Cancel".

Non-conforming, modeled: a prompt that keeps core's "Confirm", or a confirmation that keeps core's "Yes" and "No".

### 3. A destructive confirmation defaults to the safe button

Removing an item, an NPC attack, or a custom Emphasis asks first, states what is lost, and focuses the button that
keeps it (`item-crud-handler.js:191`, `module/sheets/handlers/npc-actions-handler.js:679`, `module/apps/emphasis-manager.js:333`).
Removing an Active Effect or a rule from the rules editor does not ask, as both effect controls and the rules editor
do today (`module/apps/effect-panel.js:118-123`, `module/sheets/handlers/item-effects-handler.js:218-257`,
`module/sheets/rules-editor.js:96-99`). The split follows each kind's code: every item, attack, and Emphasis removal
asks, and no effect or rule removal does. Core's `confirm` marks "No"
as the default and autofocuses it (`dialog.mjs:350-352`, `:228`, `:242`), so Enter on open keeps the document. The
system never passes `default: true` on the destructive button. Shift held on the remove control skips the dialog
(`item-crud-handler.js:188-201`); that is the one way past it. The question names the thing in its words
(`content/voice.md`, Voice and confirmations): "Remove {name}?", then the consequence. Enforced by review and the
Quench batch of each remove action.

Conforming, `module/sheets/handlers/item-crud-handler.js:188-201`: `confirm` with core's default; Shift skips it.

Non-conforming, `lang/en.json` `l5r4.ui.dialogs.deleteItem.content`: "Are you sure you want to delete {name}?" asks
for certainty instead of naming the action; `module/apps/emphasis-manager.js:333-335` builds the question by joining a
key, a name, and a "?".

### 4. Every control has a label the control knows

Each input in a dialog is associated with its label, either inside the `<label>` (`check-dialog.hbs:8-12`) or through
`for` and `id`. A `.form-group` that puts a bare `<label>` beside its input gives the input no accessible name, since
core's `form-group` styles the row and does not link them. The label text is one key; a count or a limit goes in the
key's placeholder, not in parentheses after it. Enforced by `tests/conventions/templates.test.js` (no text outside
`{{localize}}`) and review for the association; the gallery batch checks every input has an accessible name.

Conforming, `templates/dialogs/check-dialog.hbs:8-12`:

```hbs
<label class="check-modifier" data-range="{{range}}">
  <input type="checkbox" name="modifier.{{@index}}" {{checked enabled}} />
  <span class="check-modifier-label">{{label}}</span>
  <span class="check-modifier-value">{{text}}</span>
</label>
```

Non-conforming, `templates/dialogs/check-dialog.hbs:157-160`: `<label>{{localize "l5r4.ui.common.roll"}}
{{localize "l5r4.ui.common.mod"}}</label>` is two keys joined and not linked to its input;
`templates/dialogs/custom-emphasis-dialog.hbs:2` writes "Emphasis Name:" in English.

### 5. A toggle that changes the pool shows the change

Each modifier, substitute, and Void Point row shows what it does to the pool beside its label (`+1k1`, `+5`), in the
code face and in `XkY` notation (`content/voice.md`, Numbers and dice). A row the roller cannot use is disabled and its
`data-tooltip` says why (`foundations/states.md` rule 5). A warning about the roll (a Void Point already spent this Round, the
blood maho costs) uses the warning look, not the hint look. Enforced by review and the gallery's check dialog entries.

Conforming, `templates/dialogs/check-dialog.hbs:10-11` with `scss/components/_check-dialog.scss:25-27`: the label, then the value in the
monospace face.

Non-conforming, `templates/dialogs/check-dialog.hbs:66`: the Void Point box disables at zero with no reason, and
`:75` shows the Round-limit warning as a hint; `templates/dialogs/check-extras/maho.hbs:3` uses `warning-text`, a
class no stylesheet defines.

### 6. Every pick has a route that needs no drag

Anything the user can drag onto a sheet can also be chosen from a control. The routes today:

| Dragged                         | Route with no drag                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A compendium entry onto a sheet | The browser row's "Add" button, which adds it to the user's character or controlled token (`module/apps/compendium-browser.js:237-247`) |
| A creature into the world       | The browser row's "Import" button, GM only (`compendium-browser.js:255-262`)                                                            |
| A new item of a type            | The section's add control, which opens the item creation dialog (`templates/dialogs/unified-item-create-dialog.hbs`)                    |
| A status effect onto a token    | The condition manager's checkboxes (`templates/apps/condition-manager.hbs`)                                                             |
| A rule's choice                 | The choice prompt (`purchase.js:58-81`), a select of the options                                                                        |

A new drag target ships with its control. Enforced by review.

Conforming, `templates/apps/compendium-browser-results.hbs:15-19`: each row is draggable and carries an "Add" button.

Non-conforming, modeled: a field that fills only when an item is dropped on it.

### 7. A choice prompt lists every option it can offer

A choice prompt shows a select of the options, a label that says what is chosen, and nothing else. When there are no
options it does not open; the caller warns instead (`purchase.js:60-63`). The title names the item and the choice.
Enforced by review.

Conforming, `module/services/purchase.js:58-81`, with its content moved to a template (rule 1).

Non-conforming, modeled: a prompt with a free-text field for a choice the rules restrict to a list.

## States

| State           | Look                                                                                                                                           | Source                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Open            | Modal dialogs block the rest of the UI; the default button has focus                                                                           | `dialog.mjs:283`, `:242`              |
| Default button  | The one Enter presses; core autofocuses it                                                                                                     | `dialog.mjs:228`                      |
| Disabled option | The control at core's disabled look with its reason in `data-tooltip`                                                                          | `foundations/states.md`, Disabled     |
| Submitting      | Core disables every footer button until the callback returns                                                                                   | `dialog.mjs:266-275`                  |
| Closed          | Resolves `null` (`rejectClose: false`); the caller treats it as cancel and changes nothing                                                     | `dialog.mjs:405`, `roll-check.js:181` |
| Invalid input   | The field's own `min`, `max`, and `step`; a value past them is user input the caller validates (`docs/code-system/foundry-patterns.md`, Forms) | `check-dialog.hbs:51`, `:56`          |

## Keyboard and screen reader

| Contract | Detail                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Open     | Focus moves to the default button; a field marked `autofocus` takes it instead (`custom-emphasis-dialog.hbs:3`)              |
| Enter    | Submits the form with the default button (`dialog.mjs:213`)                                                                  |
| Escape   | Closes the dialog and resolves `null` (`dialog.mjs:309-316`)                                                                 |
| Tab      | Moves through the content in document order, then the footer buttons. A modal dialog keeps focus inside (`showModal`)        |
| Groups   | A set of related toggles is a `fieldset` with a `legend` (`check-dialog.hbs:5-6`), so a screen reader reads the group's name |
| Names    | Every input has a label (rule 4); the title names what is being decided                                                      |

## Long text

| Element         | Behavior                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Title           | One line in core's title bar; a title that names an item and a choice stays under 420 px             |
| Modifier labels | Wrap inside their row; the value stays at the row's end (`scss/components/_check-dialog.scss:15-23`) |
| Question text   | Wraps; a long list of names (the Schools in `askSchool`) wraps in the sentence                       |
| Dialog height   | Grows with its rows; the rows that do not apply are left out, so a short roll gives a short dialog   |

## Do and don't

| Do                                                              | Don't                               |
| --------------------------------------------------------------- | ----------------------------------- |
| Render content from a `templates/dialogs/*-dialog.hbs` template | Pass an HTML string as `content`    |
| Label the submit button with its verb                           | Ship "OK", "Yes", or "Confirm"      |
| Keep core's safe default on a destructive confirmation          | Mark "Remove" as the default button |
| Treat `null` as cancel and change nothing                       | Read a closed dialog as consent     |
| Give each pick a button or select as well as a drop             | Make a drop the only way to choose  |
| Put a warning in the warning look with its icon                 | Show a warning in hint text         |
