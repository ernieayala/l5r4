# Rules editor

The editor for an item's or an Active Effect's `system.rules`: one card per rule with a field per property, or the
whole list as JSON, and a key picker to add a rule. The item sheet's Rules tab and the Active Effect sheet's Rules
tab share it. `patterns/panels-and-browsers.md` places it among the authoring tools.

| Item     | Detail                                                                                                                                                                                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template | `templates/rules/_partials/_editor.hbs`, `RULES_EDITOR_TEMPLATE` (`module/sheets/rules-editor.js`). Included by `templates/item/_partials/_tab-rules.hbs` and `templates/rules/effect-tab.hbs`; it is rendered only as a partial, so it lives in `_partials/` with a leading underscore ([naming.md](../../code-system/naming.md#templates-and-actions)) |
| Context  | `buildRulesEditorContext` (`module/sheets/rules-editor.js`)                                                                                                                                                                                                                                                                                              |
| Actions  | `RULES_EDITOR_ACTIONS` (`module/sheets/rules-editor.js`), in each sheet's `DEFAULT_OPTIONS.actions`: `L5R4ItemSheet.DEFAULT_OPTIONS` (`module/sheets/item-sheet.js`), `L5R4ActiveEffectConfig.DEFAULT_OPTIONS` (`module/sheets/active-effect-config.js`)                                                                                                 |
| Saves    | `parseRulesForm` (`module/sheets/rules-editor.js`) in each sheet's `_processFormData`; JSON that does not parse throws, and core shows the error and saves nothing                                                                                                                                                                                       |
| SCSS     | `scss/components/_rules-editor.scss`, the `.l5r4-rules-editor` block alone. The ledger rules live in `scss/components/_ledger-dialog.scss` and the activation control in `scss/components/_inline-control.scss`                                                                                                                                          |
| Quench   | `l5r4-enhanced.authoring`; `l5r4-enhanced.sheets-and-apps` clicks every action that `tests/quench/every-action.js` lists                                                                                                                                                                                                                                 |

## Anatomy

| Part        | Markup                                                             | Class now                           | Target class                                                                  |
| ----------- | ------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------- |
| Root        | `<div data-rules-editor>`, a column                                | `l5r4-rules-editor flexcol -gap-sm` | `l5r4-rules-editor`; the column gap in its own rule                           |
| Toolbar     | `<div>`: hint, view switch                                         | `rules-toolbar flexrow -gap-sm`     | `l5r4-rules-editor-toolbar`                                                   |
| View switch | `<button type="button">`                                           | `rules-mode`                        | `l5r4-rules-editor-mode`                                                      |
| JSON        | `<textarea name="rulesJson">`, monospace                           | `rules-json`                        | `l5r4-rules-editor-json`                                                      |
| Rule card   | `<fieldset data-rule-index>`, the rule key as `<legend>`           | `rule-card`                         | `l5r4-rules-editor-card`                                                      |
| Remove      | Icon-only control in the legend                                    | `<a class="rule-delete">`           | `<button type="button" class="l5r4-rules-editor-delete inline-control icon">` |
| Error       | `<p>`, one per rule that does not validate                         | `rule-error`                        | `l5r4-rules-editor-error`                                                     |
| Field       | Core's `form-group` with the field's name and one control by kind  | `rule-field`                        | `l5r4-rules-editor-field`                                                     |
| Add row     | `<select data-rule-key>` with an `aria-label`, then the Add button | `rules-add flexrow -gap-sm`         | `l5r4-rules-editor-add`                                                       |
| Empty       | `p.hint`                                                           | core's `hint`                       | `l5r4-rules-editor-empty`, the Empty state of states.md                       |

The names follow naming.md's block-element pattern (`l5r4-<block>-<element>`, one block per file); frames.md and
states.md use the same `l5r4-rules-editor-card` and `l5r4-rules-editor-error`.

| Field kind | Control                                                    |
| ---------- | ---------------------------------------------------------- |
| `boolean`  | Checkbox                                                   |
| `number`   | Number input                                               |
| `select`   | Select from the field's choices, empty first when nullable |
| `json`     | Two-row monospace textarea                                 |
| other      | Text input                                                 |

## Variants

| Variant   | Shows                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| Form view | One card per rule, the add row                                                                |
| JSON view | One textarea with the whole list                                                              |
| Read-only | Either view with every control disabled and no switch, remove, or add (`rulesEditable` false) |

## States

| State                    | Look                                                                                                                                                                            | Markup                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Empty                    | One line saying the item has no rules                                                                                                                                           | The `{{else}}` of the `{{#each rules` loop (`templates/rules/_partials/_editor.hbs`)                              |
| Invalid rule             | The card's error line: `fa-circle-exclamation` and the message in `--l5r4-color-danger`; the field carries `aria-invalid` and `aria-describedby` to the line (states.md rule 7) | Target. Now the message in error color alone: `l5r4-rules-editor-error` (`templates/rules/_partials/_editor.hbs`) |
| JSON that does not parse | Core shows the thrown error; nothing saves                                                                                                                                      | The `throw` in `parseRulesForm` (`module/sheets/rules-editor.js`)                                                 |
| Action failed            | Error notification with the message                                                                                                                                             | The `catch` in `updateRules` (`module/sheets/rules-editor.js`)                                                    |
| Read-only                | Core's disabled look on every control                                                                                                                                           | `{{disabled (not rulesEditable)}}`                                                                                |

## Parameters

| Name            | Type                                                                          | Meaning                                              |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `rulesMode`     | `"form"` or `"json"`                                                          | The view; each sheet keeps it in its own `rulesMode` |
| `rulesEditable` | boolean                                                                       | The sheet's `isEditable`                             |
| `ruleKeys`      | `Record<key, key>`                                                            | Every rule key, for the add select                   |
| `rules`         | `{ index, key, error, fields: { name, kind, value, choices, nullable }[] }[]` | One per stored rule, from `describeRule`             |
| `rulesJson`     | string                                                                        | The stored list, pretty-printed                      |

Rule keys and field names show as stored (`TNModifier`, `value`): they are the names the JSON view, `ACTIVE_EFFECTS.md`,
and pack data use, and they are fixed names (Stage 17 decision 2).

## Actions

| Now           | Target              | Does                                          |
| ------------- | ------------------- | --------------------------------------------- |
| `rulesAdd`    | `create-rule`       | Adds a rule of the selected key               |
| `rulesDelete` | `delete-rule`       | Removes the rule whose card holds the control |
| `rulesMode`   | `toggle-rules-view` | Switches between the forms and the JSON       |

Stage 17 decision 15 makes every `data-action` kebab-case; the `RULES_EDITOR_ACTIONS` keys and the `EVERY_ACTION`
list in `tests/quench/every-action.js` use the kebab-case names. Each action first takes in what the form holds, so
nothing typed is lost: `updateRules` (`module/sheets/rules-editor.js`).

## Tokens

| Token                                                 | Property                | Part                                                                                                                                                                       |
| ----------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--l5r4-font-code`                                    | `font-family`           | JSON textarea, `.l5r4-rules-editor-json` (`scss/components/_rules-editor.scss`); `json` fields, `.l5r4-rules-editor-field textarea` (`scss/components/_rules-editor.scss`) |
| `--l5r4-border-width-thin`, `--l5r4-color-line-muted` | `border`                | Rule card, `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`)                                                                                                |
| `--l5r4-radius-sm`                                    | `border-radius`         | Rule card, `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`)                                                                                                |
| `--l5r4-space-card`                                   | `padding`               | Rule card, `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`)                                                                                                |
| `--l5r4-space-gap`, `--l5r4-space-4`                  | `gap`, `padding-inline` | Legend, the `legend` rule in `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`); `gap` reads `--l5r4-space-8` now                                            |
| `--l5r4-color-danger`                                 | `color`                 | Error line, `.l5r4-rules-editor-error` (`scss/components/_rules-editor.scss`)                                                                                              |
| `--l5r4-font-size-meta`                               | `font-size`             | Error line, `.l5r4-rules-editor-error` (`scss/components/_rules-editor.scss`)                                                                                              |
| `--l5r4-space-4`                                      | `margin-block-end`      | Error line, `.l5r4-rules-editor-error` (`scss/components/_rules-editor.scss`)                                                                                              |
| `--l5r4-space-gap-tight`                              | `gap`                   | Root column (now `-gap-sm`)                                                                                                                                                |

`min-height: 16rem` on the JSON textarea and `2.5rem` on `json` fields stay literals: one component each.
`--l5r4-color-danger` takes its **Contrast fixes** targets in color.md (`#ba0104` light, `#fc452b` dark), 4.51:1 on
the surface in both themes; core's `--color-level-error`, read today, gives 3.82:1 and 2.74:1.

## Keyboard and screen reader

| Contract | Detail                                                                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controls | The view switch and Add are `<button>`s. The remove control is an `<a>` with no `href` today and takes no focus; the target is a `<button type="button">` with `data-tooltip` and `aria-label` from `l5r4.ui.rules.delete` (iconography.md rule 4) |
| Names    | The add select is named by `aria-label`. Each field's `<label>` has no `for`; the target ties it as the check dialog does                                                                                                                          |
| Groups   | Each rule is a `<fieldset>` whose `<legend>` is its key, so a reader hears which rule a field belongs to                                                                                                                                           |
| Errors   | The target error line is linked from the field by `aria-describedby`                                                                                                                                                                               |

## Long text

Rule keys are single words. A field value runs inside its input; JSON scrolls inside the textarea, which resizes
vertically. The hint in the toolbar wraps beside the view switch.

## Rules

| #   | Rule                                                                                                            | Enforced by                                                 | Conforming                                                                                                                                                                                                                                        | Non-conforming                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| RE1 | Every control is a native control; an icon-only one carries `data-tooltip` and `aria-label` and an `inert` icon | `tests/conventions/templates.test.js`                       | The Add button, `data-action="create-rule"` (`templates/rules/_partials/_editor.hbs`); the icon-only remove button, `data-action="delete-rule"` (`templates/rules/_partials/_editor.hbs`), with `data-tooltip`, `aria-label`, and an `inert` icon | `<a class="rule-delete" data-action="rulesDelete" title="…"><i class="fa-solid fa-trash"></i></a>` (modeled)      |
| RE2 | Actions are kebab-case                                                                                          | `tests/conventions/actions.test.js`                         | `data-action="delete-rule"` (`templates/rules/_partials/_editor.hbs`)                                                                                                                                                                             | `data-action="rulesDelete"` (modeled)                                                                             |
| RE3 | An action keeps what the form holds                                                                             | Quench `l5r4-enhanced.authoring`                            | `updateRules` (`module/sheets/rules-editor.js`) reads the form first                                                                                                                                                                              | Rebuilding the list from stored rules and dropping unsaved fields (modeled)                                       |
| RE4 | An invalid rule shows icon, words, and the state color, linked from its field                                   | Review (states.md rule 7)                                   | states.md rule 7 conforming example                                                                                                                                                                                                               | `<p class="l5r4-rules-editor-error" data-rule-error>{{rule.error}}</p>` (`templates/rules/_partials/_editor.hbs`) |
| RE5 | Read-only shows the same layout with every control disabled                                                     | Quench `l5r4-enhanced.authoring`                            | `{{disabled (not @root.rulesEditable)}}` (`templates/rules/_partials/_editor.hbs`) on each field                                                                                                                                                  | Hiding the rules from a viewer who cannot edit (modeled)                                                          |
| RE6 | The editor's file holds the editor only                                                                         | `tests/conventions/styles.test.js` (one component per file) | `scss/components/_rules-editor.scss` with `.l5r4-rules-editor` alone                                                                                                                                                                              | `.l5r4-ledger` and `.item-activate.active` in the editor's file (modeled)                                         |
| RE7 | Borders read a width token and a color role                                                                     | `tests/conventions/styles.test.js`, frames.md rule 1        | `border: var(--l5r4-border-width-thin) solid var(--l5r4-color-line-muted);` in `.l5r4-rules-editor-card` (`scss/components/_rules-editor.scss`)                                                                                                   | `border: 1px solid var(--color-border-dark-tertiary);` (modeled)                                                  |

## Do and don't

| Do                                  | Don't                                                         |
| ----------------------------------- | ------------------------------------------------------------- |
| Offer both views for the same rules | Let the two views disagree on what is stored                  |
| Show each rule's error on its card  | Collect errors in one notification and leave the cards silent |
| Show keys and field names as stored | Translate a rule key: the JSON and the pack data use it       |
