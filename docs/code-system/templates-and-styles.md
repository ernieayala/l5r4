# Templates and styles

Where markup and styles live and the shape each takes. Markup lives in `templates/**/*.hbs`, styles in `scss/**/*.scss`, behavior in JavaScript through `data-*` attributes (CLAUDE.md **Presentation**). Class, token, and file name patterns are in `naming.md`; what a component looks like is in `docs/design-system/`. Each rule names its check; "review" means no tool can check it.

## Templates

### Files and folders

| Folder | Holds |
| --- | --- |
| `templates/actor/` | PC and NPC sheet bodies, Limited views, and their `_partials/` |
| `templates/item/` | The item sheet, its `_partials/`, and `_type-details/<subtype>.hbs`, `_type-modifiers/<subtype>.hbs` |
| `templates/apps/` | One template per ApplicationV2 window, named as its `module/apps/` file |
| `templates/cards/` | Item cards shown on sheets and posted to chat, one per subtype, and their `_partials/` |
| `templates/chat/` | Chat cards the services post |
| `templates/dialogs/` | `DialogV2` content, each file ending `-dialog.hbs` |
| `templates/links/` | Text link output |
| `templates/rules/` | The rules editor |

| Rule | Check |
| --- | --- |
| File names are kebab-case `.hbs` | `tests/conventions/names.test.js` |
| A file only ever included by another template is a partial: `_<name>.hbs` inside a `_partials/` folder | `tests/conventions/names.test.js` |
| A file rendered on its own (a part, a chat card, a dialog) has no `_`, even when another template also includes it | `tests/conventions/names.test.js` |
| Templates named after a subtype keep the subtype's name (`commonItem.hbs`): fixed, the code loads them by type name | `tests/conventions/names.test.js` (exempt list) |
| Markup used twice is one registered partial | `tests/conventions/templates.test.js` |
| No empty folders | `tests/conventions/names.test.js` |

Fixed template names (Stage 17 decision 2): `templates/item/_type-details/<subtype>.hbs`, `templates/item/_type-modifiers/<subtype>.hbs`, and `templates/cards/<subtype>.hbs`. The code reaches them from the stored subtype: `CHAT_CARD_TEMPLATES` (`module/config/item-types.js`) maps each subtype to its card, and the `(concat ...)` includes of `_type-details/` (`templates/item/_partials/_tab-details.hbs`) and `_type-modifiers/` (`templates/item/_partials/_tab-modifiers.hbs`) join the subtype into the path, so a rename breaks every item of that type.

Not conforming (modeled): the Ring and Trait block written out in both actor sheets, its Trait row eight times in each, in place of `templates/actor/_partials/_traits-rings.hbs` and `_trait.hbs`.

A partial whose output posts to chat (`templates/cards/_partials/_text-section.hbs`) is included at the line's start: core compiles partials with `preventIndent` [src: client/applications/handlebars.mjs:41], which writes the include's indent once before the partial's output, so an indented include would add spaces to stored messages, and to nothing when the partial renders empty. Its own lines carry the card's indentation. Its heading carries `l5r4-item-summary-heading`, a fixed chat-card class from the cards that carry it on; cards posted before it hold a bare `<h5>`, so no style reads the class and both look the same. The roll button (`templates/cards/_partials/_roll-button.hbs`) renders only in a card's in-sheet branch, which no message stores.

### Structure

| Rule | Check |
| --- | --- |
| A part template renders one root element; core throws otherwise [src: client/applications/api/handlebars-application.mjs:172] | Core, at render |
| The root element carries the component's `l5r4-` block class | `tests/conventions/templates.test.js` |
| Every class the system defines starts with `l5r4-`; core classes (`flexrow`, `form-group`, `active`) keep core's names | `tests/conventions/templates.test.js` |
| Classes inside a posted chat card keep their names: fixed, the message stores its HTML | `tests/conventions/templates.test.js` (exempt list) |
| Classes are for CSS only; JavaScript never selects by class | ESLint `no-restricted-syntax` |
| Behavior hooks are `data-action` (kebab-case) and `data-*` attributes | `tests/conventions/actions.test.js` |
| An element with `data-action` is a native control: `<button type="button">`, `<a href>`, `<input>`, `<select>`. Core's `<img data-action="editImage">` file picker stays an image, as in core's own sheets | `tests/conventions/templates.test.js` |
| An icon-only control carries `data-tooltip` (its tooltip) and `aria-label` (its accessible name), both `{{localize}}` of one key. A control with visible text that needs a tooltip (a disabled reason, a gesture hint) carries `data-tooltip` alone. No element carries `title` | `tests/conventions/templates.test.js` |
| A decorative `<i>` icon carries `inert`; an `<img>` carries `alt` (`alt=""` when decorative) | `tests/conventions/templates.test.js` |
| Font Awesome as `fa-solid fa-<name>`, with the names core's Font Awesome 7.2.0 ships, never 5.x aliases (`fa-edit`) | `tests/conventions/templates.test.js` |
| No `style=`, no `width=` or `height=` for looks, no `on*=`, no `<script>` | `tests/conventions/templates.test.js` |
| No user-facing text outside `{{localize}}` | `tests/conventions/templates.test.js` |
| One key per label; no label joined from two keys or with a literal `&`. Two or more `{{localize}}` calls (or `(localize)` subexpressions) in one text node or attribute value fail; a localize passed as another's placeholder value, `{{else}}` branches, and partial arguments do not count | `tests/conventions/templates.test.js` (`joined-localize`); review for `&` |
| Comments are `{{!-- --}}`; `<!-- -->` ships into the DOM | `tests/conventions/templates.test.js` |
| A dialog template opens no `<form>`: core's `DialogV2` wraps its content in one | `tests/conventions/templates.test.js` (`dialog-form`) |
| Partials are included by literal path: `{{> "systems/l5r4-enhanced/templates/..."}}`; a subtype file by `(concat ...)` | review |
| A partial's parameters are named on the include (`{{> "..." item=this}}`) and listed in a `{{!-- --}}` comment at its top | review |
| No rule logic or formula in a template: the context arrives computed (`castFormula`), never built with helpers | review |
| Mustache without inner spaces (`{{name}}`); a key inside an attribute in double quotes: `aria-label="{{localize "key"}}"` | review |
| A field's value type is `data-type`, never `data-dtype` | review |
| Files end with a newline and carry no trailing whitespace (`.editorconfig`) | review |

Stage 17 decision 15 sets `l5r4-` on every system class, kebab-case actions, and `fa-solid`. Decision 16 sets `<button type="button">` for every clickable element in place of an `<a>` with no `href`, which takes no keyboard focus, and `data-tooltip` with `aria-label` on icon-only controls in place of `title`. Picked by majority: `{{!-- --}}` comments, literal partial paths, `{{name}}` spacing, double quotes inside attributes, `data-type`.

Conforming, the `data-action="open-source"` (`templates/apps/effect-panel.hbs`) button, one attribute per line:

<!-- prettier-ignore -->
```hbs
<button
  type="button"
  class="l5r4-effect-panel-button"
  data-action="open-source"
  data-tooltip="{{localize "l5r4.apps.effectPanel.openSource"}}"
  aria-label="{{localize "l5r4.apps.effectPanel.openSource"}}"
>
  <i class="fa-solid fa-up-right-from-square" inert></i>
</button>
```

Not conforming (modeled): an `<a>` with no `href`, no accessible name, bare classes, and `fas`.

<!-- prettier-ignore -->
```hbs
<a class="button inline-control icon" data-action="section-expand"><i class="fas fa-chevron-down"></i></a>
```

## No markup in JavaScript

| Rule | Check |
| --- | --- |
| No HTML in a string or template literal; render a template with `foundry.applications.handlebars.renderTemplate` | ESLint `no-restricted-syntax` |
| No `innerHTML`, `outerHTML`, or `insertAdjacentHTML` writes; parse rendered HTML with `foundry.utils.parseHTML` [src: client/utils/helpers.mjs:382] | ESLint `no-restricted-syntax` |
| No `.style` writes, `style.setProperty` included; toggle a state class or a `data-*` attribute | ESLint `no-restricted-syntax` |
| `querySelector*` and `closest` select by `[data-*]`, `[name]`, or element, never by class or id | ESLint `no-restricted-syntax` |
| No jQuery | ESLint `no-restricted-syntax` |
| `DialogV2` content is a template from `templates/dialogs/` | ESLint `no-restricted-syntax` |
| A selector on a fixed chat-card class (posted before 4.0.0, so it has no `data-*`) carries `// eslint-disable-next-line no-restricted-syntax -- fixed name, Stage 17 decision 2` | review |
| A selector on core's own markup that carries no `data-*` names core's class and carries `// eslint-disable-next-line no-restricted-syntax -- core markup, <its template>` | review |

The rules apply to `module/`, `dist/l5r4-enhanced.js`, and `tests/quench/`: a test that selects by class breaks when a class is renamed.

Conforming: `postCheckRequest` (`module/services/check-request.js`) renders the card from a template, and `bindCheckRequestCard` (`module/services/check-request.js`) finds its button by `[data-action='check-request-roll']`.

Not conforming (modeled): dialog content as `` `<p>${...}</p>` ``. `root.style.setProperty("--conditional-cursor", ...)` (modeled): a style write where the Shift-held state is the `is-shift-held` class that `_updateConditionalCursor` (`module/mixins/keyboard-behavior-mixin.js`) toggles. `closest(".item")` (modeled): a selector by class.

## Stylesheets

### Folders

| Folder | Holds |
| --- | --- |
| `base/` | Tokens (`_variables.scss`), the reset, and utility classes. The only folder with literal colors, `z-index` values, and spacing outside the token scale |
| `layout/` | The grids of the actor sheets, the item sheet, and the sidebar |
| `components/` | One reusable component per file, as the design system names it: button, form field, item list, section, chat card, check dialog, rules editor |
| `features/` | One game feature's block on a sheet: Rings and Traits, Wounds, ranks, Initiative, Armor TN |
| `apps/` | One file per ApplicationV2 window, named as its `module/apps/` file: XP manager, effect panel, compendium browser |
| `sheets/` | Rules for one sheet as a whole that no component or feature owns |

| Rule | Check |
| --- | --- |
| Partials are `_<kebab-case>.scss` inside a folder; the entry `scss/l5r4-enhanced.scss` is the only top-level file | `tests/conventions/names.test.js` |
| One component per file; the file's name is the component's block name | `tests/conventions/styles.test.js` |
| No file that compiles to nothing | `tests/conventions/styles.test.js` |
| The entry `@use`s every partial, grouped by folder in the table's order, one `// <Folder>` comment per group | review |
| Every file opens with a `/** <Title> / <purpose> */` block, the title in Title Case | review |
| `dist/l5r4-enhanced.css` is generated: change `scss/`, then `npm run build:css` | review |

Picked by majority: window styles in `apps/`, Title Case file titles.

Not conforming (modeled): a top-level `scss/_chat.scss` that also holds the check dialog; one file holding a panel, text links, and a request card; a file with only comments.

### Rules and selectors

| Rule | Check |
| --- | --- |
| A component's rules sit under its own `l5r4-` block class, so it renders the same in a sheet and in the gallery | Stylelint `selector-class-pattern`, `tests/conventions/styles.test.js` |
| No selector on `[data-action]` or another behavior attribute | Stylelint `selector-attribute-name-disallowed-list` |
| Class names follow `naming.md`; core classes are styled only inside a system block | Stylelint `selector-class-pattern` |
| Nesting at most four levels deep | Stylelint `max-nesting-depth` (`4`) |
| Order inside a block: custom properties, declarations, `@include`, nested state rules (`&:hover`, `&:focus-visible`, state classes), nested children, then `@media` | Stylelint `order/order` |
| Properties in alphabetical order | Stylelint `order/properties-alphabetical-order` |
| Box sides as logical properties (`margin-block-start`), never `margin-top` | Stylelint `property-disallowed-list` |
| Colors, spacing, sizes, durations, and `z-index` from tokens (`--l5r4-{category}-{name}`), never literals outside `base/` | Stylelint `color-no-hex`, `color-named`, `tests/conventions/styles.test.js` |
| Spacing on the one rem scale (0.25, 0.5, 0.75, 1, 1.5), through its tokens | `tests/conventions/styles.test.js` |
| Text font sizes through the `--l5r4-font-size-*` type scale (`docs/design-system/foundations/typography.md` T2) | Stylelint `declaration-property-value-allowed-list` |
| Every token used is declared, every declared token is used and documented in `docs/design-system/foundations/` | `tests/conventions/styles.test.js` |
| Every `transition` and `animation` reads a `--l5r4-duration-*` token; the one `prefers-reduced-motion` block in `scss/base/_variables.scss` sets each to `0ms`, and no component writes its own (`docs/design-system/foundations/motion.md` rule 3) | `tests/conventions/styles.test.js` |
| No `!important`, no `@extend`, no `transition: all` | Stylelint `declaration-no-important`, `at-rule-disallowed-list`, `declaration-property-value-disallowed-list` |
| `font-weight: bold`, not `600` | review |
| Grid lines unspaced: `grid-column: 1/3` | review |

Stage 17 decision 15 sets the token pattern and the space scale. Token names per step are in `docs/design-system/foundations/space-and-size.md`. Picked by majority: logical properties, `bold`, unspaced grid lines, custom properties before nested rules. Rules sit under a component's block class, not a sheet's class, because the design gallery renders each component outside a sheet (Stage 17 decision 7).

A component rule that must not reach every copy of its block names the block that contains it: item rows sit under `.l5r4-item-row-list`, because a row's card root also posts to chat; the Wound track under `.l5r4-grid`, so it overrides the grid's cell rules. A reset that every component should override is wrapped in `:where()`, which gives it no class weight (`scss/sheets/_actor-sheet.scss`). Core's CSS sits in cascade layers below the system's, so a system rule beats core's at any specificity; specificity only orders the system's own rules.

A sheet window's own rules sit under the block class its sheet class adds to the window: `l5r4-actor-sheet` (`module/sheets/base-actor-sheet.js`) in `scss/sheets/_actor-sheet.scss`, `l5r4-item-sheet` (`module/sheets/item-sheet.js`) in `scss/sheets/_item-sheet.scss`. The window keeps `pc`, `npc`, and `item` beside it for code outside the system; no system rule reads them.

Fixed chat-card classes keep their names and their rules, so they sit outside a file's block: each card's file styles posted cards, which share no `l5r4-` root, each rule under its fixed root class (`l5r4-roll` in `scss/components/_check-card.scss`, `l5r4-flow-card` in `scss/components/_flow-card.scss`, `l5r4-damage-result` in `scss/components/_damage-result.scss`; the shared note line in `scss/components/_chat-card.scss`), and `scss/components/_item-summary-card.scss` styles `l5r4-citation` and `l5r4-rule-lines`, which posted messages store (`naming.md` **Fixed names**) and so carry no `l5r4-item-summary-` element name. `tests/conventions/styles.test.js` (`styles/one-component`) reads naming.md's chat card class list and exempts a selector that starts with one. Core's message wrapper `message-content` is a core class, not a fixed chat-card class, so the exemption does not cover it, and core classes are styled only inside a system block. One rule keeps it as its scope: the posted item card's root `item` also roots every sheet item row, so `.message-content .item` is what tells the posted card apart. `styles/block-class` and `styles/one-component` hold that one named exemption (`UNSCOPED` in `tests/conventions/styles.test.js`): exactly that selector in `scss/components/_chat-card.scss`, and any other unscoped selector in the file still fails.

Conforming, modeled on `.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`), with the tokens `docs/design-system/foundations/space-and-size.md` declares:

```scss
.l5r4-effect-panel-row {
  align-items: center;
  display: flex;
  gap: var(--l5r4-space-gap);

  .l5r4-effect-panel-icon {
    block-size: var(--l5r4-size-item-icon);
    inline-size: var(--l5r4-size-item-icon);
  }
}
```

Not conforming (modeled): a hex literal with no theme variant on a bare class.

```scss
.void-dot {
  border-color: #666;
}
```

Not conforming (modeled): `a[data-action="post-item"]` styles a behavior attribute.

### Where a new style goes

| The style is for | Put it in |
| --- | --- |
| A token value (a color, a space step, a duration) | `scss/base/_variables.scss` |
| A control or block used in more than one place | `scss/components/_<component>.scss` |
| One game feature's block on a sheet | `scss/features/_<feature>.scss` |
| One window | `scss/apps/_<module-apps-file-name>.scss` |
| A sheet's grid | `scss/layout/_<sheet>-layout.scss` |
| One sheet as a whole (its window, a field reset) | `scss/sheets/_<sheet>-sheet.scss` |
| A new file | Its folder, plus one `@use` in the entry's group |

A new component also gets a page in `docs/design-system/components/` and a gallery entry (`tests/conventions/design-system.test.js`).
