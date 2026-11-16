# States

One look per state, the same on every component. A state shows by shape, weight, icon, or text as well as by color,
so it reads without color and in both themes. Core's own controls (buttons, inputs, checkboxes, tabs) keep core's state
looks; the tokens below give the system-drawn controls (Ring medallions, Trait ranks, rank names, Void Point dots, brush
buttons) the same ones.

## Tokens

Declared in `scss/base/_variables.scss`. The four that carry a color (focus color, focus outline, focus shadow,
selected outline) read themed variables, so they sit in both theme blocks (`foundations/color.md` C4); the rest sit on
`:root`.

| Token                            | Value                                     | State            |
| -------------------------------- | ----------------------------------------- | ---------------- |
| `--l5r4-state-hover-filter`      | `brightness(1.1)`                         | Hover            |
| `--l5r4-state-pressed-filter`    | `brightness(0.95)`                        | Active (pressed) |
| `--l5r4-state-pressed-transform` | `scale(0.98)`                             | Active (pressed) |
| `--l5r4-state-focus-color`       | `var(--color-warm-2)`                     | Focus-visible    |
| `--l5r4-state-focus-outline`     | `1px solid var(--l5r4-state-focus-color)` | Focus-visible    |
| `--l5r4-state-focus-shadow`      | `0 0 4px var(--l5r4-state-focus-color)`   | Focus-visible    |
| `--l5r4-state-selected-outline`  | `1px solid var(--l5r4-color-accent)`      | Selected         |
| `--l5r4-state-disabled-opacity`  | `0.75`                                    | Disabled         |

The focus values are core's button focus ring (`a.button:focus, button:focus` at `foundry2.css:4121-4125`), and the
disabled opacity is core's disabled `.inline-control` (`foundry2.css:6201-6204`), so a system control and a core
control in one row look alike. Core sets `--button-focus-outline-color` on each button element, not on a theme, so the
focus color reads the palette step core gives it, `--color-warm-2` (`foundry2.css:461`, `:2317`). The selected outline
reads `--l5r4-color-accent`: core's `--color-border-highlight` is undefined in ApplicationV2 windows
(`foundations/color.md`, **Core variables that resolve to nothing**).

Invalid and warning take no state token of their own: they read color.md's `--l5r4-color-danger` and
`--l5r4-color-warning`, whose pairings color.md checks in both themes (rule 7).

## The states

| State            | Look                                                                                                                                                                                                    | Markup that carries it                                                                                                                                                               | Now                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hover            | `filter: var(--l5r4-state-hover-filter)`. Brush buttons also play their sprite (motion.md)                                                                                                              | `:hover`                                                                                                                                                                             | Brightness on rank blocks (`_rank-control.scss:26-28`); `scale(1.1)` on Ring images (`_traits-rings.scss:163-165`); `scale(1.2)` and a lighter border on Void Point dots (`:578-581`)                                                                        |
| Focus-visible    | Core's focus ring: `outline: var(--l5r4-state-focus-outline)`, `box-shadow: var(--l5r4-state-focus-shadow)`                                                                                             | `:focus-visible` on a `<button>` or a native control                                                                                                                                 | None of the system's own; 111 `<a data-action>` controls cannot take focus                                                                                                                                                                                   |
| Active (pressed) | `filter: var(--l5r4-state-pressed-filter)`, `transform: var(--l5r4-state-pressed-transform)`                                                                                                            | `:active`                                                                                                                                                                            | Rank blocks (`_rank-control.scss:30-33`)                                                                                                                                                                                                                     |
| Selected         | Bold text and `outline: var(--l5r4-state-selected-outline)`                                                                                                                                             | `aria-pressed="true"` (a filter tab) or `aria-selected="true"`, with core's `active` class where core's CSS reads it (sheet tabs, and any `button.active`, `foundry2.css:4126-4130`) | Compendium browser tabs (`_compendium-browser.scss:41-44`, `templates/apps/compendium-browser.hbs:5`)                                                                                                                                                        |
| Checked (on)     | Native checkbox; for a system-drawn toggle, a filled shape or the "on" icon of its pair (iconography.md)                                                                                                | `:checked`, or `aria-pressed="true"` on a toggle button                                                                                                                              | Void Point dots fill (`_traits-rings.scss:583-589`); effect toggle icons (`_tab-effects.hbs:20`); activation icon and link color (`_activate.hbs:3-6`, `_rules-editor.scss:82-84`)                                                                           |
| Expanded         | The angle icon points up and the content shows                                                                                                                                                          | `aria-expanded` on the toggle, `is-collapsed` / `is-expanded` on the block                                                                                                           | Section titles and item rows (`_sections.scss:16-20`, `_item-lists.scss:155-163`), with no `aria-expanded`                                                                                                                                                   |
| Disabled         | Core's disabled look on core controls; `opacity: var(--l5r4-state-disabled-opacity)` on a system-drawn one. The reason sits in the control's `data-tooltip`                                             | `disabled` attribute                                                                                                                                                                 | Roll faces on a sheet the viewer cannot edit, with no sprite on hover (`scss/components/_button.scss:44-50`); check dialog Void Point boxes (`templates/dialogs/check-dialog.hbs:66`, `:71`); undone damage card at `opacity: 0.7` (`_chat-card.scss:59-61`) |
| Read-only        | A value the viewer cannot change reads as text. On a sheet the viewer cannot edit, core disables every input (`client/applications/api/document-sheet.mjs:212-222`, `:253`) and its disabled look shows | Text, or core's `disabled` on a non-editable sheet                                                                                                                                   | Computed values in disabled inputs (`templates/apps/xp-manager.hbs:7`, `templates/actor/_partials/_wounds.hbs:39`)                                                                                                                                           |
| Invalid          | `aria-invalid="true"` on the field, and below it a message in `--l5r4-color-danger` led by `fa-circle-exclamation`                                                                                      | `aria-invalid`, `aria-describedby` to the message                                                                                                                                    | Rule editor errors in error color, with no icon or link to the field (`templates/rules/_partials/_editor.hbs:25`, `_rules-editor.scss:43-47`)                                                                                                                |
| Warning          | A line led by `fa-triangle-exclamation` in `--l5r4-color-warning`, then the label in bold in `--l5r4-color-text`                                                                                        | `role="note"` on the line                                                                                                                                                            | Maho casting warning in a `.warning-text` no stylesheet styles (`templates/dialogs/check-extras/maho.hbs:3`); the Void-spent warning set as a plain hint (`check-dialog.hbs:75`)                                                                             |
| Loading          | The control is disabled and its icon is `fa-spinner fa-spin` until the action ends                                                                                                                      | `aria-busy="true"` and `disabled`                                                                                                                                                    | None shown; the effect delete guard keeps a `data-busy` flag with no visible state (`module/sheets/handlers/item-effects-handler.js:233-236`)                                                                                                                |
| Empty            | One italic line saying what is missing, where the list would be                                                                                                                                         | A `<p>` in the list's place                                                                                                                                                          | Italic in the effect panel and the browser (`templates/apps/effect-panel.hbs:27`, `compendium-browser-results.hbs:27`); a hint (`rules/editor.hbs:47`); a bare `<p>` (`apps/emphasis-manager.hbs:50`); nothing (`apps/xp-manager.hbs:89`, `:134`)            |
| Locked           | The value shows as text with `fa-lock` beside it; `data-tooltip` names what holds it (a rule, the GM). No edit control                                                                                  | Text, `fa-lock` `inert`                                                                                                                                                              | No component shows it yet. A Ring other than Void derives from its Traits and already renders with no step control                                                                                                                                           |

## Rules

### 1. Each state uses its tokens and no other look

A system-drawn control shows a state with the tokens above. It does not invent its own scale, color, or border for a
state another component already shows. Enforced by `tests/conventions/styles.test.js` (a `:hover`, `:active`,
`:focus-visible`, or `:disabled` block on an `l5r4-` class sets `filter`, `transform`, `outline`, `box-shadow`, or
`opacity` only from a `--l5r4-state-*` token) and review.

Conforming, `scss/components/_rank-control.scss:26-33`:

```scss
.l5r4-rank-control-value {
  &:hover {
    filter: var(--l5r4-state-hover-filter);
  }

  &:active {
    filter: var(--l5r4-state-pressed-filter);
    transform: var(--l5r4-state-pressed-transform);
  }
}
```

Non-conforming, `scss/features/_traits-rings.scss:578-581`:

```scss
&:hover {
  border-color: #888;
  transform: scale(1.2);
}
```

### 2. Every control can take focus and shows it

A control is a native control or a `<button type="button">`, so it takes keyboard focus, and it shows the focus ring
on `:focus-visible`. A system-drawn control that is not a core-styled button adds the ring itself. Enforced by
`tests/conventions/templates.test.js` (interactive elements carry `data-action` or are native controls) and the
`l5r4-enhanced.design-gallery` Quench batch (every focusable element shows a focus style, in light and dark themes).

Conforming, `templates/apps/effect-panel.hbs:13-16`: a `<button type="button">`, which core's button focus ring covers.

Non-conforming, `templates/actor/_partials/_stats.hbs:60`:

```hbs
<span class="trait-rank" data-action="trait-rank" data-trait="sta" role="button" title="...">
```

A `<span>` with `role="button"` and no `tabindex` never takes focus.

### 3. A control hidden until hover also shows on focus

Item controls and rank step arrows sit at `opacity: 0` until the pointer is over their row
(`scss/components/_item-row.scss:159-165`, `:206-208`; `scss/features/_traits-rings.scss:13-27`, `:45`). Each such
rule also matches `:focus-within`, so a keyboard user who tabs into the row sees the controls. Enforced by
`tests/conventions/styles.test.js` (a `:hover` rule that sets `opacity: 1` has a matching `:focus-within` selector).

Conforming, modeled on `scss/components/_item-row.scss:159-165`:

```scss
.l5r4-item-row {
  &:hover,
  &:focus-within {
    .inline-control {
      opacity: 1;
      pointer-events: all;
    }
  }
}
```

Non-conforming (modeled): `&:hover` alone, so the controls stay hidden from a keyboard user.

### 4. A state rides on its attribute; a class mirrors it only for CSS

The attribute in the "Markup" column is the state: assistive technology reads it, and the Quench batches test it.
Where CSS needs a class besides, it is `is-<state>` (`is-collapsed`, `is-expanded`), the form 12 of the 21 state-class
uses in templates take (core's bare `active` 8, a dash modifier 1). An `is-` class always sits on an element that also
carries its `l5r4-` block class, never alone, and core's `active` stays where core's CSS reads it. The undone damage
card keeps `-undone`: it is stored in posted messages (fixed name, Stage 17 decision 2) and takes the disabled look.
Enforced by `tests/conventions/templates.test.js` (an `is-` class needs an `l5r4-` class on the same element; an
expand toggle carries `aria-expanded`; a toggle button carries `aria-pressed`) and review.

Conforming, modeled on `templates/actor/_partials/_skill-section.hbs:2` and `_expand.hbs:1`:

```hbs
<div class="l5r4-section-title{{#if collapsed}} is-collapsed{{/if}}" data-scope="skills">
  <button type="button" class="l5r4-expand-control inline-control icon" data-action="expand-section"
    aria-expanded="{{#if collapsed}}false{{else}}true{{/if}}"
    data-tooltip="{{localize "l5r4.ui.common.expand"}}" aria-label="{{localize "l5r4.ui.common.expand"}}">
    <i class="fa-solid {{#if collapsed}}fa-angle-down{{else}}fa-angle-up{{/if}}" inert></i>
  </button>
</div>
```

`l5r4.ui.common.expand` is a key this rule adds to `lang/en.json`; the toggle has no name today.

Non-conforming, `templates/actor/_partials/_expand.hbs:1`: the toggle states nothing; only the parent's
`is-collapsed` class and a swapped chevron show the state.

### 5. Disabled says why

A disabled control stays where it is, so the layout does not move, and its `data-tooltip` says why it is disabled (no
Void Points left, the GM's turn). Disabled is for a choice that is closed now and may open later; a value the viewer can
never change is read-only, and one a rule or the GM holds is locked. Enforced by review; the copy of the reason follows
`content/voice.md` (tooltips).

Conforming, modeled on `templates/dialogs/check-dialog.hbs:66`:

```hbs
<input type="checkbox" name="void" {{disabled (not voidPoints)}}
  {{#unless voidPoints}}data-tooltip="{{localize "l5r4.ui.check.noVoidPoints"}}"{{/unless}} />
```

`l5r4.ui.check.noVoidPoints` is a key this rule adds to `lang/en.json`.

Non-conforming, `templates/dialogs/check-dialog.hbs:66` today: the box disables with no reason.

### 6. A computed value is text, not a disabled input

A value the system works out (XP spent of total, a Wound total) shows as text. A disabled input reads as a field the
user may unlock. On a sheet the viewer cannot edit, core's disabled inputs are the read-only look and the system adds
nothing. Enforced by review.

Conforming, `templates/actor/_partials/_stats.hbs:34`:

```hbs
<span class="flex0">{{system._xp.spent}}/{{system._xp.total}}</span>
```

Non-conforming, `templates/apps/xp-manager.hbs:7`:

```hbs
<input type="text" disabled value="{{xp.spent}} / {{xp.total}}" />
```

### 7. Invalid and warning carry an icon and words, not color alone

The message names the problem in words and starts with the state's icon (`fa-circle-exclamation` for invalid,
`fa-triangle-exclamation` for warning, `inert`). An invalid message is in `--l5r4-color-danger`, a text pairing; a
warning's icon is in `--l5r4-color-warning`, an indicator pairing, and its words in `--l5r4-color-text`. An invalid
field links to its message with `aria-describedby`. Enforced by `tests/conventions/contrast.test.js` (the danger and
warning pairings in `foundations/color.md`, in both themes) and review for the icon and the words.

Conforming, modeled on `templates/rules/_partials/_editor.hbs:25`:

```hbs
{{#if rule.error}}
  <p class="l5r4-rules-editor-error" id="rule-{{rule.index}}-error">
    <i class="fa-solid fa-circle-exclamation" inert></i>
    {{rule.error}}
  </p>
{{/if}}
```

Non-conforming, `templates/dialogs/check-dialog.hbs:75`: the warning that Void Points were already spent this round
uses the `hint` class, so it reads as help text.

### 8. Loading disables the control until the action ends

A control whose action awaits the server (delete, import, post) sets `disabled` and `aria-busy="true"` and shows
`fa-spinner fa-spin` in place of its icon until the action resolves or fails. Font Awesome stops the spin under
reduced motion. Enforced by review and the Quench batch of the component whose action it is.

Conforming, modeled on `module/sheets/handlers/item-effects-handler.js:233-256`: the guard that blocks a second delete
also sets the button's `disabled` and `aria-busy`, and clears both in its `finally`.

Non-conforming, the same handler today: `wrap.dataset.busy` blocks the second click but nothing on screen changes.

### 9. An empty list says so in one italic line

Where a list has no entries, one `<p>` in italic takes its place and says what is missing, in the words
`patterns/feedback.md` sets. A list never renders nothing. Enforced by review; the gallery shows each list empty.

Conforming, `templates/apps/effect-panel.hbs:26-28`:

```hbs
{{else}}
  <p class="l5r4-effect-panel-empty">{{empty}}</p>
{{/if}}
```

Non-conforming, `templates/apps/xp-manager.hbs:89`: `{{#if manualEntries}}` with no `{{else}}`, so an empty ledger
shows a header over nothing.

## Partials and files

| Item     | Where                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens   | `scss/base/_variables.scss`                                                                                                                                                                                           |
| Users    | `scss/components/_button.scss`, `_rank-control.scss`, `_inline-control.scss`; `scss/apps/_compendium-browser.scss`. Hidden-until-hover controls: `scss/components/_item-row.scss`, `scss/features/_traits-rings.scss` |
| Partials | `templates/actor/_partials/_expand.hbs`, `templates/cards/_partials/_controls.hbs`, `templates/cards/_partials/_activate.hbs`                                                                                         |
| Icons    | iconography.md                                                                                                                                                                                                        |
| Motion   | motion.md                                                                                                                                                                                                             |
| Frames   | frames.md                                                                                                                                                                                                             |
