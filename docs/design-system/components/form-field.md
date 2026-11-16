# Form field

A label and the value it names: an input the viewer types into, a select, a checkbox, or a value the system computes
and shows as text. Core's `form-group` draws fields in dialogs, apps, and the item sheet; the system adds the compact
inline field of the PC and NPC header, the read-only value box, and the select inside an item row.

| Item        | Detail                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Partial     | None: a field is two or three elements, written where it shows                                                                                                                                   |
| SCSS        | `scss/components/_form-field.scss`: the header label and the value box. The sheets' bare-input reset is in `scss/sheets/_actor-sheet.scss`, at no class weight, so a component's field rule wins |
| Block class | `l5r4-form-field` on the inline field. Core's `form-group`, `form-fields`, `<label>` stay as core names them                                                                                     |
| Shows in    | The PC and NPC header (`_stats.hbs:5-43`, `_stats-npc.hbs:4-9`), item sheet tabs, apps, dialogs, item rows (`cards/skill.hbs:17`, `cards/weapon.hbs:15`), grid value cells (`grid.md`)           |
| Gallery     | Each variant with a short and a long label, in every state below, light and dark                                                                                                                 |

## Anatomy

Inline field (sheet header):

| Part     | Element                                                         | Class                             | Class now                                 |
| -------- | --------------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| Field    | `<label>` when it holds an input; `<div>` when it holds a value | `l5r4-form-field flexrow -gap-sm` | `flexrow -gap-sm` (`_stats.hbs:5`)        |
| Label    | `<span>`                                                        | `l5r4-form-field-label`           | `h4.flex0.title` (`_stats.hbs:6`)         |
| Input    | `<input>`, `<select>`                                           | none                              | `flex1`                                   |
| Value    | `<span>`                                                        | `l5r4-form-field-value`           | `div.input-placeholder` (`_stats.hbs:13`) |
| Controls | The inline control cluster (`inline-control.md`)                | `l5r4-inline-control -reveal`     | `info-group` (`_stats.hbs:7`)             |

Core field (apps, dialogs, item sheet):

| Part   | Element                                        | Class         |
| ------ | ---------------------------------------------- | ------------- |
| Field  | `<div>`                                        | `form-group`  |
| Label  | `<label>` wrapping the input, or `<label for>` | none          |
| Inputs | `<div>` around one or more inputs              | `form-fields` |
| Hint   | `<p>` after the inputs                         | `hint`        |

## Variants

| Variant    | Selects it                                                       | Used for                                                             |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| Inline     | `l5r4-form-field`                                                | Header fields on the PC and NPC sheets                               |
| Read-only  | `l5r4-form-field` holding `l5r4-form-field-value`                | A computed value: Clan, School, Insight, XP spent of total           |
| Core       | `form-group`                                                     | Every field in apps, dialogs, and the item sheet                     |
| Row select | A `<select data-action="update-item-field">` in an item row cell | A stored field edited in place: a Skill's Trait, a bow's arrow       |
| Grid value | An input in a `l5r4-grid-value` cell                             | Sidebar values: Wounds suffered, NPC Armor TN, Fear Rank (`grid.md`) |

## States

| State         | Look                                                                                                                          | Markup                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Rest          | Inputs on actor sheets have no border; core's on other windows                                                                |                                    |
| Focus-visible | Core's field outline (`outline: 2px solid var(--input-focus-outline-color)`); the actor-sheet reset never removes it          | `:focus`                           |
| Disabled      | Core's disabled field; `data-tooltip` on the field says why                                                                   | `disabled`                         |
| Read-only     | The value as text in `l5r4-form-field-value`, never a disabled input. On a sheet the viewer cannot edit, core disables inputs | Text                               |
| Invalid       | `aria-invalid="true"`; a message below in `--l5r4-color-danger` led by `fa-circle-exclamation`                                | `aria-invalid`, `aria-describedby` |
| Warning       | A `role="note"` line led by `fa-triangle-exclamation` in `--l5r4-color-warning`, its words in `--l5r4-color-text`             | `role="note"`                      |
| Locked        | The value as text with `fa-lock` beside it; `data-tooltip` names what holds it                                                | Text and an `inert` `fa-lock`      |
| Empty         | An input shows its placeholder in core's placeholder color; a read-only value shows an em dash                                | `placeholder`; `—`                 |

## Tokens

| Token                                         | Use                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--l5r4-color-text`                           | Read-only value text (replaces `--color-text-dark-primary`, which resolves to nothing in system windows) |
| `--l5r4-space-8`                              | Inline padding of the read-only value                                                                    |
| `--l5r4-space-gap-tight`                      | Gap between label and value (`-gap-sm`)                                                                  |
| `--l5r4-color-danger`, `--l5r4-color-warning` | Invalid message; warning icon (`foundations/states.md`)                                                  |

The read-only value reads core's `--input-height` for its height and line height, so it lines up with the inputs
beside it (`foundations/typography.md` T6).

## Keyboard and screen reader

| Input         | Result                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Tab           | Focuses the input; a read-only value takes no focus                                                          |
| Typing, Enter | Core's: the sheet saves on change (`submitOnChange`)                                                         |
| Screen reader | Reads the field's name from its `<label>`, or from `aria-label` where the visible label sits in another cell |

## Long text

A label wraps; it never truncates. In the header the label column is as wide as its longest label and the input takes
the rest (`flex1`). A read-only value wraps inside its box. A row select is as wide as its cell; its options show in
full in the open list.

## Rules

| #   | Rule                                                                                                                                          | Enforced by                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F1  | Every input, select, and textarea has an accessible name: a wrapping `<label>`, a `<label for>`, or `aria-label` with the visible label's key | Review, in the gallery                                                                   |
| F2  | A label is text, never a heading and never a control                                                                                          | `tests/conventions/templates.test.js` (interactive elements are native controls); review |
| F3  | A value the system computes is text in `l5r4-form-field-value`, never a disabled input (`foundations/states.md` rule 6)                       | Review                                                                                   |
| F4  | A field's value type is `data-type`, never `data-dtype`                                                                                       | Review                                                                                   |
| F5  | A field outside `system.*` has a camelCase `name`                                                                                             | Review                                                                                   |
| F6  | The actor-sheet input reset leaves core's focus outline in place                                                                              | `tests/quench/design-gallery.js` (focus style)                                           |
| F7  | A label has no trailing colon in the string; where the layout shows one, the template adds it                                                 | Review                                                                                   |

| #   | Conforming                                                                                                                                                                             | Non-conforming                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `<label class="l5r4-browser-filter"><span>{{localize "l5r4.ui.browser.search"}}</span><input type="search" name="search" ...></label>` (`templates/apps/compendium-browser.hbs:10-13`) | `<select data-action="inline-edit" data-field="system.trait">` with no name (`templates/cards/skill.hbs:17`)                              |
| F2  | `<span class="l5r4-form-field-label">{{localize "l5r4.ui.common.clan"}}</span>` (modeled)                                                                                              | `<h4 class="flex0 title" data-action="recalc-sheet">` (`templates/actor/_partials/_stats.hbs:6`): a heading that is also a hidden control |
| F3  | `<span class="flex0">{{system._xp.spent}}/{{system._xp.total}}</span>` (`templates/actor/_partials/_stats.hbs:34`)                                                                     | `<input type="number" value="{{system.wounds.max}}" disabled />` (`templates/actor/_partials/_wounds.hbs:35-40`)                          |
| F4  | `data-type="Number"` (`templates/actor/_partials/_wounds.hbs:25`)                                                                                                                      | `data-dtype="String"` (`templates/cards/skill.hbs:17`)                                                                                    |
| F5  | `name="woundMode"` (`templates/apps/wound-config.hbs:7`)                                                                                                                               | `name="add-amount"` (`templates/apps/wealth-manager.hbs:25`)                                                                              |
| F6  | `input, select { border: none; }` with no `outline` rule (`scss/sheets/_actor-sheet.scss:30-38`)                                                                                       | `input { outline: none; }` in a sheet reset (modeled)                                                                                     |
| F7  | `<span>{{localize "l5r4.world.wealth.koku"}}:</span>` (`templates/actor/_partials/_item-section.hbs:5`)                                                                                | A value "Koku:" in `lang/en.json` (modeled)                                                                                               |

Picked by majority: `data-type` (63 of 73), camelCase field names outside `system` (57 of 64), the colon typed in the
template (41 against 0 in strings).

## Do and don't

| Do                                                                    | Don't                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Use core's `form-group` in every app and dialog                       | Rebuild a core field with system classes                               |
| Show a computed number as text beside its label                       | Make the viewer wonder whether a greyed input will unlock              |
| Put a gesture hint ("Shift+click") in a hint or the control's tooltip | Hide an action on a label; move it to a button the pattern page places |

## Names

| Current                         | Target                            | Why                                       |
| ------------------------------- | --------------------------------- | ----------------------------------------- |
| `h4.flex0.title` (header label) | `span.l5r4-form-field-label`      | F2; decision 15                           |
| `input-placeholder`             | `l5r4-form-field-value`           | Decision 15                               |
| `info-group`                    | `l5r4-inline-control -reveal`     | `inline-control.md`                       |
| `data-action="inline-edit"`     | `data-action="update-item-field"` | Verb first; `update*` changes (naming.md) |
| `data-dtype`                    | `data-type`                       | F4                                        |

The hidden actions on header labels (`recalc-sheet` on the Name label, `toggle-rank-mode` on the Insight Rank label)
move to controls the PC header pattern places (`patterns/sheets.md`); a new visible control is a look change, so its
place goes to the visual sign-off (Stage 17 decision 9).
