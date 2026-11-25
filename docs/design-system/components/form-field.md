# Form field

A label and the value it names: an input the viewer types into, a select, a checkbox, or a value the system computes and shows as text. Core's `form-group` draws fields in dialogs, apps, and the item sheet; the system adds the compact inline field of the PC and NPC header, the read-only value box, and the select inside an item row.

| Item | Detail |
| --- | --- |
| Partial | None: a field is two or three elements, written where it shows. Fields two windows share are one partial: `templates/item/_partials/_advantage-details.hbs` (an Advantage's and a Disadvantage's type and cost), `templates/item/_partials/_mastery-details.hbs` (a kata's and a kiho's Ring and Mastery Level), `templates/apps/_partials/_wealth-change.hbs` (the wealth manager's amount and denomination, parameter `field`) |
| SCSS | `scss/components/_form-field.scss`: the header label, the value box, and the Invalid message. The sheets' bare-input reset is in `scss/sheets/_actor-sheet.scss`, at no class weight, so a component's field rule wins |
| Block class | `l5r4-form-field` on the inline field. Core's `form-group`, `form-fields`, `<label>` stay as core names them |
| Shows in | The PC and NPC header (`l5r4-pc-info` (`templates/actor/_partials/_stats.hbs`), `l5r4-pc-info` (`templates/actor/_partials/_stats-npc.hbs`)), item sheet tabs, apps, dialogs, item rows (`data-field="system.trait"` (`templates/cards/skill.hbs`), `data-field="system.arrow"` (`templates/cards/weapon.hbs`)), grid value cells (`grid.md`) |
| Gallery | Each variant with a short and a long label, in every state below, light and dark |

## Anatomy

Inline field (sheet header):

| Part | Element | Class |
| --- | --- | --- |
| Field | `<label>` when it holds an input alone; `<div>` when it holds a value, or an input beside a control, whose input then names itself with `aria-label` (a label around a control would add the control's name to the input's) | `l5r4-form-field flexrow -gap-sm` |
| Label | `<span>` in the face core gives an `<h4>` | `flex0 l5r4-form-field-label` |
| Input | `<input>`, `<select>` | `flex1` |
| Value | `<div>` | `flex1 l5r4-form-field-value` |
| Control | An icon button after the value, always shown (`icon-button.md`, field tool): recalculate after the PC's Name, the GM's Insight Rank switch after the rank, the XP manager after XP | `flex0 inline-control icon` |

The PC header's controls: `data-action="recalculate-sheet"` rebuilds and redraws the sheet; `data-action="toggle-rank-mode"`, shown to a GM only, switches the Insight Rank between computed (`fa-lock`) and typed in (`fa-lock-open`), its state in `aria-pressed` (Stage 18 decision 6).

Core field (apps, dialogs, item sheet):

| Part   | Element                                        | Class         |
| ------ | ---------------------------------------------- | ------------- |
| Field  | `<div>`                                        | `form-group`  |
| Label  | `<label>` wrapping the input, or `<label for>` | none          |
| Inputs | `<div>` around one or more inputs              | `form-fields` |
| Hint   | `<p>` after the inputs                         | `hint`        |

## Variants

| Variant | Selects it | Used for |
| --- | --- | --- |
| Inline | `l5r4-form-field` | Header fields on the PC and NPC sheets |
| Read-only | `l5r4-form-field` holding `l5r4-form-field-value` | A computed value: Clan, School, Insight, XP spent of total |
| Invalid message | `l5r4-form-field-error` after a field | Why what was typed cannot be saved |
| Core | `form-group` | Every field in apps, dialogs, and the item sheet |
| Row select | A `<select data-action="update-item-field">` in an item row cell | A stored field edited in place: a Skill's Trait, a bow's arrow |
| Grid value | An input in a `l5r4-grid-value` cell | Sidebar values: Wounds suffered, NPC Armor TN, Fear Rank (`grid.md`) |

## States

| State | Look | Markup |
| --- | --- | --- |
| Rest | Inputs on actor sheets have no border; core's on other windows |  |
| Focus-visible | Core's field outline (`outline: 2px solid var(--input-focus-outline-color)`); the actor-sheet reset never removes it | `:focus` |
| Disabled | Core's disabled field; `data-tooltip` on the field says why | `disabled` |
| Read-only | The value as text in `l5r4-form-field-value`, never a disabled input. On a sheet the viewer cannot edit, core disables inputs | Text |
| Invalid | `aria-invalid="true"`; a message below in `--l5r4-color-danger` led by `fa-circle-exclamation`, in `l5r4-form-field-error` (the custom Emphasis name (`templates/dialogs/custom-emphasis-dialog.hbs`)) | `aria-invalid`, `aria-describedby` |
| Warning | A `role="note"` line led by `fa-triangle-exclamation` in `--l5r4-color-warning`, its words in `--l5r4-color-text` | `role="note"` |
| Locked | The value as text with `fa-lock` beside it; `data-tooltip` names what holds it | Text and an `inert` `fa-lock` |
| Empty | An input shows its placeholder in core's placeholder color; a read-only value shows an em dash | `placeholder`; `—` |

## Tokens

| Token | Use |
| --- | --- |
| `--l5r4-color-text` | Read-only value text (replaces `--color-text-dark-primary`, which resolves to nothing in system windows) |
| `--l5r4-space-8` | Inline padding of the read-only value |
| `--l5r4-space-gap-tight` | Gap between label and value (`-gap-sm`) |
| `--l5r4-color-danger`, `--l5r4-color-warning` | Invalid message; warning icon (`foundations/states.md`) |

The read-only value reads core's `--input-height` for its height and line height, so it lines up with the inputs beside it (`foundations/typography.md` T6).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Focuses the input; a read-only value takes no focus |
| Typing, Enter | Core's: the sheet saves on change (`submitOnChange`) |
| Screen reader | Reads the field's name from its `<label>`, or from `aria-label` where the visible label sits in another cell |

## Long text

A label wraps; it never truncates. In the header the label column is as wide as its longest label and the input takes the rest (`flex1`). A read-only value wraps inside its box. A row select is as wide as its cell; its options show in full in the open list.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| F1 | Every input, select, and textarea has an accessible name: a wrapping `<label>`, a `<label for>`, or `aria-label` with the visible label's key | Review, in the gallery |
| F2 | A label is text, never a heading and never a control | `tests/conventions/templates.test.js` (interactive elements are native controls); review |
| F3 | A value the system computes is text in `l5r4-form-field-value`, never a disabled input (`foundations/states.md` rule 6) | Review |
| F4 | A field's value type is `data-type`, never `data-dtype` | `tests/conventions/templates.test.js` (`data-dtype`) |
| F5 | A field outside `system.*` has a camelCase `name` | Review |
| F6 | The actor-sheet input reset leaves core's focus outline in place | `tests/quench/design-gallery.js` (focus style) |
| F7 | A label has no trailing colon in the string; where the layout shows one, the template adds it | Review |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| F1 | The search field's `<span>` and `<input>` inside `<label class="l5r4-compendium-browser-filter l5r4-compendium-browser-search">` (`templates/apps/compendium-browser.hbs`); a row select's `aria-label="{{localize "l5r4.character.skills.properties.trait"}}"` (`templates/cards/skill.hbs`) | A row select with no name (modeled) |
| F2 | `<span class="flex0 l5r4-form-field-label">{{localize "l5r4.ui.common.clan"}}</span>` (`templates/actor/_partials/_stats.hbs`) | A heading that holds a control: `<h4 class="l5r4-form-field-label"><button data-action="recalculate-sheet">` (modeled) |
| F3 | `<span class="flex0">{{system._xp.spent}}/{{system._xp.total}}</span>` (`templates/actor/_partials/_stats.hbs`) | The `disabled` number input with `value="{{system.wounds.max}}"` (`templates/actor/_partials/_wounds.hbs`) |
| F4 | `data-type="Number"` (`templates/actor/_partials/_wounds.hbs`) | `data-dtype="String"` (modeled) |
| F5 | `name="woundMode"` (`templates/apps/wound-config.hbs`) | `name="{{field}}-amount"` (`templates/apps/_partials/_wealth-change.hbs`) |
| F6 | `input, select { border: none; }` with no `outline` rule, in the `:where(&)` reset (`scss/sheets/_actor-sheet.scss`) | `input { outline: none; }` in a sheet reset (modeled) |
| F7 | `<span>{{localize "l5r4.world.wealth.koku"}}:</span>` (`templates/actor/_partials/_item-section.hbs`) | A value "Koku:" in `lang/en.json` (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Use core's `form-group` in every app and dialog | Rebuild a core field with system classes |
| Show a computed number as text beside its label | Make the viewer wonder whether a greyed input will unlock |
| Put a gesture hint ("Shift+click") in a hint or the control's tooltip | Hide an action on a label; move it to a button the pattern page places |

## Names

The header's actions are `recalculate-sheet` and `toggle-rank-mode`, verb first (`docs/code-system/naming.md`).
