# Dialogs

How the system asks the user something and waits: the check dialog with its modifier toggles, choice prompts, pickers with a route that needs no drag, and confirmations, destructive ones included. Every dialog is core's `foundry.applications.api.DialogV2` (CLAUDE.md **Foundry Integration**), opened through `module/services/dialog.js`; the system writes its content and buttons, and core draws the window, the footer, and the keyboard handling.

| Item | Detail |
| --- | --- |
| API | `askPrompt`, `askConfirm`, `askButtons`, `openDialog` (`module/services/dialog.js`), which call core's `DialogV2.prompt`, `DialogV2.confirm`, `DialogV2.wait`, and the constructor (`resources/app/client/applications/api/dialog.mjs:346-405`) with the `l5r4-dialog` class added |
| Templates | `templates/dialogs/check-dialog.hbs` with `check-extras/ring.hbs`, `spell.hbs`, `slot.hbs`, `maho.hbs`; `confirm-dialog.hbs`, `choice-dialog.hbs`, `ledger-dialog.hbs`, `unified-item-create-dialog.hbs`, `custom-emphasis-dialog.hbs`, `disadvantage-cap-dialog.hbs` |
| Paths | `DIALOG_TEMPLATES` (`module/config/templates.js`) |
| Callers | `ask*` functions in services (`docs/code-system/naming.md`, verb vocabulary): `askChoices` (`module/services/dice/check/dialog.js`), `askChoice` (`module/services/purchase.js`), `askSchool` (`module/services/purchase.js`), `askGmAllow` (`module/services/gm-allow.js`), `askDisadvantageCap` (`module/services/xp/disadvantage-cap.js`) |
| SCSS | `.l5r4-dialog` (`scss/layout/_dialog-layout.scss`); `.l5r4-check-dialog` (`scss/components/_check-dialog.scss`); `scss/components/_ledger-dialog.scss` |
| Tokens | `--l5r4-space-gap-tight`, `--l5r4-space-gap`, `--l5r4-font-code`, `--l5r4-font-size-meta`, `--l5r4-color-warning`, `--l5r4-color-text`, `--l5r4-state-disabled-opacity` |
| Components | Check dialog, ledger dialog, form field, button |
| Checks | ESLint `no-restricted-syntax` (no global `Dialog`, no HTML strings, no `DialogV2` outside `module/services/dialog.js`), the Quench dialog batch (`tests/quench/dialogs.js`), `tests/conventions/templates.test.js`, `tests/conventions/names.test.js`, `tests/lang.test.js`; "review" where no tool can judge |

## Anatomy

Core wraps the content in `div.dialog-content` inside `form.dialog-form` and renders the buttons in a `footer.form-footer` (`client/applications/api/dialog.mjs:205-215`).

| # | Part | Owner | Detail |
| --- | --- | --- | --- |
| 1 | Title | System | `window.title`: what is being decided. The check dialog uses the roll's label: `askChoices` (`module/services/dice/check/dialog.js`) |
| 2 | Content | System | A template from `templates/dialogs/`, rendered to a string; core cleans the string (`client/applications/api/dialog.mjs:192`) |
| 3 | Buttons | System | `buttons`, or the `ok`, `yes`, `no` options of the helpers. Each has an `action`, a `label` key, and an optional `icon` |
| 4 | Frame | Core | The window, its close control, the footer layout, the focus ring |

## Variants

| Variant | Helper | Resolves to | Used for |
| --- | --- | --- | --- |
| Check dialog | `prompt`, modal | The form's values, or `null` when closed | Every roll the pipeline makes, unless Shift skips it: `askCheck` (`module/services/dice/check/roll-check.js`) |
| Choice prompt | `prompt` or `input` | The chosen value, or `null` | A rule's open choice, `askChoice` (`module/services/purchase.js`); the ledger change; a name |
| Choice of two | `wait` with buttons | The pressed button's action, or `null` | Add a School beside the others or replace them: `askSchool` (`module/services/purchase.js`) |
| Confirmation | `confirm` | `true`, `false`, or `null` when closed | End the encounter, start a session, a GM allowing a roll the rules forbid: `askGmAllow` (`module/services/gm-allow.js`) |
| Destructive | `confirm` | As above | Removing an item, an NPC attack, a custom Emphasis (rule 3) |

A window that stays open while the user works (the XP manager, the wealth manager) is an app, not a dialog (`patterns/panels-and-browsers.md`).

## The check dialog

One dialog for every roll (`templates/dialogs/check-dialog.hbs`), 420 px wide and modal: `askChoices` (`module/services/dice/check/dialog.js`). Its rows appear only when they apply. Each row names its element or field in `check-dialog.hbs`.

| Row | Control | Shown when |
| --- | --- | --- |
| Pool | Text: the pool before choices (`l5r4-check-dialog-pool`) | Always |
| Modifiers | One checkbox per rule modifier, with its label and its change (`name="modifier.{{@index}}"`) | Rules offer modifiers |
| Substitutes | One checkbox per substitute Trait or Skill (`name="substitute.{{@index}}"`) | Rules offer substitutes |
| TN | Number input, the TN changes as a hint, Wound penalty checkbox (`name="tn"`, `name="woundPenalty"`) | The roll has a TN |
| Raises | Number input bounded by the allowed minimum and maximum (`name="raises"`) | Raises are allowed |
| Free Raises to the TN | Number input up to the Free Raises held (`name="freeRaisesToTn"`) | The roller holds Free Raises |
| Unskilled hint | One line (`l5r4.ui.check.unskilled`) | An Unskilled Roll |
| Void Point | Checkbox, the Void Points left in its label; disabled at none (`name="void"`, `name="voidSkill"`). Each use takes its own point, so once every point is chosen the other use disables and says why (`bindVoidUses`, `module/services/dice/check/dialog.js`) | A Void Point may be spent |
| Embrace Taint | Checkbox (`name="embraceTaint"`) | The rules allow it |
| Emphasis | Select (`name="emphasis"`) | The Skill has Emphases |
| Attack | Ranged checkbox and the maneuvers fieldset (`name="isRanged"`, a `l5r4-check-dialog-group`) | An attack |
| Social resistance | Checkbox (`name="socialResistance"`) | The rules allow it |
| Roll, Keep, Total mods | Number inputs (`name="rollMod"`, `name="keepMod"`, `name="totalMod"`) | Always |
| Keep fewer | Number input (`name="keep"`) | Always |
| Extras | Spell casting, spell slot, maho (`templates/dialogs/check-extras/`) | The request passes `extras` |

The one button is "Roll", the `ok` button of `askChoices` (`module/services/dice/check/dialog.js`). Closing the dialog cancels the roll.

## Rules

### 1. Content comes from a template

A dialog's content is a template in `templates/dialogs/`, named `<name>-dialog.hbs`, rendered with `foundry.applications.handlebars.renderTemplate` and listed in `DIALOG_TEMPLATES`. No dialog content is an HTML string built in JavaScript, and none uses the global `Dialog`. The template has no `<form>` of its own: core's form wraps it, and a nested form breaks the submit. A confirmation shares one template, `templates/dialogs/confirm-dialog.hbs`, with two parameters, `question` and `consequence`, each already localized. Enforced by ESLint `no-restricted-syntax` (no HTML strings; `DialogV2` content is a template; no global `Dialog`), `tests/conventions/names.test.js` (the `-dialog.hbs` suffix), and `tests/conventions/templates.test.js` (`dialog-form`: no `<form>` in `templates/dialogs/`).

Conforming, `askChoices` (`module/services/dice/check/dialog.js`): `renderTemplate(DIALOG_TEMPLATES.check, ...)` passed as `content`. Conforming, `askDisadvantageCap` in `module/services/xp/disadvantage-cap.js`: `R(DIALOG_TEMPLATES.disadvantageCap, { currentCap })` passed as `content`, the template with no `<form>` and its label linked to the field by `for`; the XP manager's `#onChangeDisadvantageCap` (`module/apps/xp-manager.js`) calls it and stores the answer.

Conforming, `l5r4-unified-item-create-dialog` (`templates/dialogs/unified-item-create-dialog.hbs`): a `<div>` root in core's form. `askEmphasisName` (`module/apps/emphasis-manager.js`) renders `DIALOG_TEMPLATES.customEmphasis` (`module/config/templates.js`).

Non-conforming (modeled): a dialog template that opens its own `<form>`; a template path written in place, not from `DIALOG_TEMPLATES`; `` content: `<p>${...}</p>` ``, an HTML string.

### 2. Buttons name the action

The submitting button's label is the action's verb, from `lang/en.json`: "Roll", "Remove", "Replace", "Add as another School" (`content/voice.md`, Buttons). A confirmation overrides core's "Yes" and "No" with `yes: { label }` and `no: { label: "l5r4.ui.common.cancel" }`. Enforced by review; `tests/lang.test.js` checks button keys carry no period.

Conforming, `module/services/purchase.js`, `askSchool`: the School choice's buttons read "Add as another School" and "Replace"; `module/services/session.js`, `startNewSession`: the confirmation's buttons read "Start session" and "Cancel".

Non-conforming, modeled: a prompt that keeps core's "Confirm", or a confirmation that keeps core's "Yes" and "No".

### 3. A destructive confirmation defaults to the safe button

Removing an item, an NPC attack, or a custom Emphasis asks first, states what is lost, and focuses the button that keeps it: `ItemCrudHandler.#askItemRemoval` (`module/sheets/handlers/item-crud-handler.js`), `NpcActionsHandler.deleteAttack` (`module/sheets/handlers/npc-actions-handler.js`), `EmphasisManagerApplication.#onDeleteEmphasis` (`module/apps/emphasis-manager.js`). Removing an Active Effect or a rule from the rules editor does not ask: `EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`), `ItemEffectsHandler.deleteEffect` (`module/sheets/handlers/item-effects-handler.js`), and the `delete-rule` action of `RULES_EDITOR_ACTIONS` (`module/sheets/rules-editor.js`). The split follows each kind's code: every item, attack, and Emphasis removal asks, and no effect or rule removal does. Core's `confirm` marks "No" as the default and autofocuses it (`client/applications/api/dialog.mjs:350-352`, `:228`, `:242`), so Enter on open keeps the document. The system never passes `default: true` on the destructive button. Shift held on the remove control skips the dialog: `ItemCrudHandler.deleteItem` (`module/sheets/handlers/item-crud-handler.js`); that is the one way past it. The question names the thing in its words (`content/voice.md`, Voice and confirmations): "Remove {name}?", then the consequence. Enforced by review and the Quench batch of each remove action.

Conforming, `ItemCrudHandler.deleteItem` (`module/sheets/handlers/item-crud-handler.js`): `confirm` with core's default; its question is `l5r4.ui.dialogs.deleteItem.content` (`lang/en.json`), "Remove {name}?"; Shift skips it.

Non-conforming (modeled): `{{localize "l5r4.ui.common.delete"}} "{{name}}"?`, a question that joins a key, a name, and a "?", and states no consequence.

### 4. Every control has a label the control knows

Each input in a dialog is associated with its label, either inside the `<label>` (the modifier rows of `check-dialog.hbs`) or through `for` and `id`. A `.form-group` that puts a bare `<label>` beside its input gives the input no accessible name, since core's `form-group` styles the row and does not link them. The label text is one key; a count or a limit goes in the key's placeholder, not in parentheses after it. Enforced by `tests/conventions/templates.test.js` (no text outside `{{localize}}`) and review for the association; the gallery batch checks every input has an accessible name.

Conforming, `l5r4-check-dialog-modifier` (`templates/dialogs/check-dialog.hbs`):

```hbs
<label class="l5r4-check-dialog-modifier" data-range="{{range}}">
  <input type="checkbox" name="modifier.{{@index}}" {{checked enabled}} />
  <span class="l5r4-check-dialog-modifier-label" data-modifier-label>{{label}}</span>
  <span class="l5r4-check-dialog-modifier-value">{{text}}</span>
</label>
```

Conforming, the label of `name="rollMod"` (`templates/dialogs/check-dialog.hbs`): `<label for="{{formId}}-roll-mod">` beside `<input id="{{formId}}-roll-mod">`, with `formId` unique to the open dialog.

Non-conforming, `l5r4-custom-emphasis-dialog` (`templates/dialogs/custom-emphasis-dialog.hbs`): a bare `<label>` beside its input, with a ":" outside the key.

### 5. A toggle that changes the pool shows the change

Each modifier, substitute, and Void Point row shows what it does to the pool beside its label (`+1k1`, `+5`), in the code face and in `XkY` notation (`content/voice.md`, Numbers and dice). A row the roller cannot use is disabled and its `data-tooltip` says why (`foundations/states.md` rule 5). A warning about the roll (a Void Point already spent this Round, the blood maho costs) uses the warning look, not the hint look. Enforced by review and the gallery's check dialog entries.

Conforming, `l5r4-check-dialog-modifier-value` (`templates/dialogs/check-dialog.hbs`) with `.l5r4-check-dialog-modifier-value` (`scss/components/_check-dialog.scss`): the label, then the value in the monospace face.

Non-conforming, `name="void"` (`templates/dialogs/check-dialog.hbs`): the Void Point box disables at zero with no reason, and `{{#if voidOverLimit}}` (`templates/dialogs/check-dialog.hbs`) shows the Round-limit warning as a hint; `l5r4-check-dialog-warning` (`templates/dialogs/check-extras/maho.hbs`) is a class no stylesheet defines.

### 6. Every pick has a route that needs no drag

Anything the user can drag onto a sheet can also be chosen from a control. The routes:

| Dragged | Route with no drag |
| --- | --- |
| A compendium entry onto a sheet | The browser row's "Add" button, which adds it to the user's character or controlled token: `CompendiumBrowserApplication.#onAddEntry` (`module/apps/compendium-browser.js`) |
| A creature into the world | The browser row's "Import" button, GM only: `CompendiumBrowserApplication.#onImportEntry` (`module/apps/compendium-browser.js`) |
| A new item of a type | The section's add control, which opens the item creation dialog (`templates/dialogs/unified-item-create-dialog.hbs`) |
| A status effect onto a token | The condition manager's checkboxes (`templates/apps/condition-manager.hbs`) |
| A rule's choice | The choice prompt, `askChoice` (`module/services/purchase.js`), a select of the options |

A new drag target ships with its control. Enforced by review.

Conforming, `data-action="add-entry"` (`templates/apps/compendium-browser-results.hbs`): each row is draggable and carries an "Add" button.

Non-conforming, modeled: a field that fills only when an item is dropped on it.

### 7. A choice prompt lists every option it can offer

A choice prompt shows a select of the options, a label that says what is chosen, and nothing else. When there are no options it does not open; `askChoice` (`module/services/purchase.js`) warns instead. The title names the item and the choice. Enforced by review.

Conforming, `askChoice` (`module/services/purchase.js`): `DIALOG_TEMPLATES.choice` with the choice's prompt as its label and a select of the options, titled with the item and the prompt.

Non-conforming, modeled: a prompt with a free-text field for a choice the rules restrict to a list.

### 8. The fields scroll, the buttons stay in view

A dialog taller than the window scrolls its fields inside the window, starts scrolled to the top, and keeps its footer buttons in view. Core caps a window at the viewport and hides `.window-content`'s overflow, so the scroll goes on `.dialog-content`, never on `.window-content` (which would scroll the buttons away with the fields) and never on the page. Every dialog opens through `module/services/dialog.js`, which adds the `l5r4-dialog` class that `scss/layout/_dialog-layout.scss` styles. Enforced by ESLint `no-restricted-syntax` (no `DialogV2` outside `module/services/dialog.js`) and the Quench dialog batch (`tests/quench/dialogs.js`), which opens a check dialog in a short window.

Conforming, `askChoices` (`module/services/dice/check/dialog.js`): `askPrompt({ ... })`, so an attack's maneuvers, TN, Raises and Void Point scroll above a Roll button that stays in view.

Non-conforming, modeled: `foundry.applications.api.DialogV2.prompt({ ... })` from a service: the dialog gets no `l5r4-dialog` class and clips the fields that don't fit.

## States

| State | Look | Source |
| --- | --- | --- |
| Open | Modal dialogs block the rest of the UI; the default button has focus | `client/applications/api/dialog.mjs:283`, `:242` |
| Default button | The one Enter presses; core autofocuses it | `client/applications/api/dialog.mjs:228` |
| Disabled option | The control at core's disabled look with its reason in `data-tooltip` | `foundations/states.md`, Disabled |
| Submitting | Core disables every footer button until the callback returns | `client/applications/api/dialog.mjs:266-275` |
| Closed | Resolves `null` (`rejectClose: false`); the caller treats it as cancel and changes nothing | `client/applications/api/dialog.mjs:405`; `askChoices` (`module/services/dice/check/dialog.js`) |
| Invalid input | The field's own `min`, `max`, and `step`; a value past them is user input the caller validates (`docs/code-system/foundry-patterns.md`, Forms) | `name="raises"` and `name="freeRaisesToTn"` in `templates/dialogs/check-dialog.hbs` |

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Open | Focus moves to the default button; a field marked `autofocus` takes it instead: `name="emphasisName"` (`templates/dialogs/custom-emphasis-dialog.hbs`) |
| Enter | Submits the form with the default button (`client/applications/api/dialog.mjs:213`) |
| Escape | Closes the dialog and resolves `null` (`client/applications/api/dialog.mjs:309-316`) |
| Tab | Moves through the content in document order, then the footer buttons. A modal dialog keeps focus inside (`showModal`) |
| Groups | A set of related toggles is a `fieldset` with a `legend`, `l5r4-check-dialog-group` (`templates/dialogs/check-dialog.hbs`), so a screen reader reads the group's name |
| Names | Every input has a label (rule 4); the title names what is being decided |

## Long text

| Element | Behavior |
| --- | --- |
| Title | One line in core's title bar; a title that names an item and a choice stays under 420 px |
| Modifier labels | Wrap inside their row; the value stays at the row's end: `.l5r4-check-dialog-modifier` (`scss/components/_check-dialog.scss`) |
| Question text | Wraps; a long list of names (the Schools in `askSchool`) wraps in the sentence |
| Dialog height | Grows with its rows; the rows that do not apply are left out, so a short roll gives a short dialog. Past the window's height the fields scroll and the buttons stay in view (rule 8) |

## Do and don't

| Do | Don't |
| --- | --- |
| Render content from a `templates/dialogs/*-dialog.hbs` template | Pass an HTML string as `content` |
| Label the submit button with its verb | Ship "OK", "Yes", or "Confirm" |
| Keep core's safe default on a destructive confirmation | Mark "Remove" as the default button |
| Treat `null` as cancel and change nothing | Read a closed dialog as consent |
| Give each pick a button or select as well as a drop | Make a drop the only way to choose |
| Put a warning in the warning look with its icon | Show a warning in hint text |
