# Iconography

The icon sets the system draws, the one icon each meaning gets, icon sizes, and how an icon-only control gets its name.

## Sets

| Set                      | Source                                                                                                                               | Used for                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Font Awesome Pro 7.2.0   | Core ships it (`public/fonts/fontawesome/css/all.min.css`; FOUNDRY-V14-REFERENCE.md §10.2). The system loads no icon font of its own | Every control, window, scene control, context menu entry, and text link |
| Ring images              | `assets/icons/{air,earth,fire,water,void}.webp`, through the `$<ring>-ring-img` variables in `scss/base/_variables.scss:175-179`     | The five Ring medallions on the PC and NPC sheets                       |
| Document images          | `assets/icons/*.webp`, under `PATHS.icons` (`module/config/constants.js:35`), resolved by `getIconPath` (`module/utils/icons.js:17`) | Default item images, status effect and stance images                    |
| Brush sprites and border | `assets/animation/*.webp`, `assets/borders/brush-08-gray.svg`                                                                        | Ornament, not icons: see motion.md and frames.md                        |

## Tokens

Declared on `:root` in `scss/base/_variables.scss`. They join the size scale in space-and-size.md under the `size`
category.

| Token                 | Value      | Use                       | Read at                               |
| --------------------- | ---------- | ------------------------- | ------------------------------------- |
| `--l5r4-size-icon-sm` | `0.625rem` | The rank step arrow glyph | `scss/features/_traits-rings.scss:39` |

A document image in a row (effect panel, compendium browser, spell slots) is not a glyph: it reads
`--l5r4-size-item-icon` (32 px) from the size scale in space-and-size.md. A Font Awesome glyph anywhere else takes the
font size of its control or text and needs no token. The control around an icon-only glyph is core's
`.inline-control`, whose `--button-size` is `24px` (`foundry2.css:6195-6200`), the minimum target in space-and-size.md.

## Rules

### 1. One style: `fa-solid`

Every Font Awesome icon the system writes uses the `fa-solid` style class (Stage 17 decision 15), in templates and in
JavaScript (`DEFAULT_OPTIONS.window.icon`, scene control tools, context menu entries, the text link icons). No `fas`,
`far`, `fa-regular`, `fa-light`, or `fa-duotone`. Today 66 template uses are `fas` and 15 are `fa-solid`; core writes
`fa-solid` 871 times and `fas` 20. Enforced by `tests/conventions/templates.test.js` (one Font Awesome prefix) and
ESLint `no-restricted-syntax` on string literals matching `/\bfa[srlb]\b|\bfa-(regular|light|duotone)\b/` in
`module/`.

Conforming, `templates/apps/effect-panel.hbs:15`:

```hbs
<i class="fa-solid fa-up-right-from-square" inert></i>
```

Non-conforming, `templates/cards/_partials/_controls.hbs:3`:

```hbs
<i class="fas fa-trash"></i>
```

### 2. Canonical names, not aliases

Write the name Font Awesome 7 lists first for a glyph, not an older alias that draws the same glyph. Nine template uses
and three JavaScript uses carry an alias today; 72 template uses are canonical. Enforced by
`tests/conventions/templates.test.js` and the same ESLint rule, both reading the alias list below.

| Alias (do not write) | Canonical          | Glyph  |
| -------------------- | ------------------ | ------ |
| `fa-edit`            | `fa-pen-to-square` | `f044` |
| `fa-cog`             | `fa-gear`          | `f013` |
| `fa-save`            | `fa-floppy-disk`   | `f0c7` |
| `fa-times`           | `fa-xmark`         | `f00d` |
| `fa-atlas`           | `fa-book-atlas`    | `f558` |

The glyph codes come from the grouped selectors in core's `all.min.css` (`.fa-edit,.fa-pen-to-square{--fa:"\f044"}`).
Core itself writes `fa-edit` 21 times; the glyph is the same, so the system follows core's icon and writes its
canonical name.

Conforming, modeled on `templates/actor/_partials/_stats-npc.hbs:265`:

```hbs
<i class="fa-solid fa-pen-to-square" inert></i>
```

Non-conforming, `templates/apps/npc-attack-config.hbs:61`:

```hbs
<i class="fas fa-save"></i>
```

### 3. One icon per meaning, one meaning per icon

Each meaning the system shows has one icon, and an icon stands for one meaning. Where core shows the same meaning, the
system uses core's icon. The table lists every meaning the templates and `module/` use now; "Now" names the icon
in use where it differs from the pick. Enforced by `tests/conventions/design-system.test.js`, which reads this table
and fails on an icon name in `templates/` or `module/` that the table does not list, and by review for whether a new
control's meaning matches its row; the gallery's icon section renders the table.

| Meaning                                         | Icon                                              | Used at                                                                                                                                                                                                                                                                                              | Now                                                                                                 | Core precedent                                                                                         |
| ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Add or create                                   | `fa-plus`                                         | `templates/rules/_partials/_editor.hbs:53`, `apps/xp-manager.hbs:74`, `apps/wealth-manager.hbs:41`, `apps/emphasis-manager.hbs:4`, `item/_partials/_tab-effects.hbs:6`, `apps/compendium-browser-results.hbs:17`, `actor/_partials/_stats-npc.hbs:213`, `actor/_partials/_unified-item-create.hbs:5` |                                                                                                     | 17 uses (file picker favorites, card faces)                                                            |
| Subtract an amount                              | `fa-minus`                                        | `templates/apps/wealth-manager.hbs:69`                                                                                                                                                                                                                                                               |                                                                                                     |                                                                                                        |
| Edit                                            | `fa-pen-to-square`                                | `templates/cards/_partials/_controls.hbs:2`, `apps/emphasis-manager.hbs:33`, `item/_partials/_tab-effects.hbs:18`, `actor/_partials/_stats-npc.hbs:265`                                                                                                                                              | `fa-edit`                                                                                           | `fa-edit`, the same glyph, 21 uses                                                                     |
| Delete a document or entry                      | `fa-trash`                                        | `templates/rules/_partials/_editor.hbs:21`, `apps/xp-manager.hbs:103`, `apps/emphasis-manager.hbs:42`, `item/_partials/_tab-effects.hbs:22`, `cards/_partials/_controls.hbs:3`, `actor/_partials/_stats-npc.hbs:266`, `apps/effect-panel.hbs:20`                                                     | `fa-xmark` in the effect panel, whose action deletes the effect (`module/apps/effect-panel.js:121`) | 48 uses                                                                                                |
| Save                                            | `fa-floppy-disk`                                  | `templates/apps/npc-attack-config.hbs:61`, `apps/emphasis-manager.hbs:55`                                                                                                                                                                                                                            | `fa-save`                                                                                           | 44 uses                                                                                                |
| Open a configuration window                     | `fa-gear`                                         | `templates/actor/_partials/_combat.hbs:16`, `_armor.hbs:10`, `_wounds.hbs:16`; window icons `module/apps/wound-config.js:78`, `combat-config.js:44`, `armor-config.js:44`                                                                                                                            | `fa-cog`                                                                                            | `fa-gear` 8 uses, `fa-cog` 1                                                                           |
| Expand or collapse a section or row             | `fa-angle-down` closed, `fa-angle-up` open        | `templates/actor/_partials/_expand.hbs:1`, `cards/_partials/_controls.hbs:5`; swapped by `module/sheets/handlers/item-crud-handler.js:228-229`, `pc-adjustment-handler.js:271-272`                                                                                                                   | `fa-chevron-down` / `fa-chevron-up`, which also step ranks                                          | `fa-angle-down` on a collapsible section (`resources/app/templates/adventure/exporter/contents.hbs:5`) |
| Step a rank up or down                          | `fa-chevron-up`, `fa-chevron-down`                | `templates/actor/_partials/_stats.hbs:62-211`, `_stats-npc.hbs:31-182`                                                                                                                                                                                                                               |                                                                                                     |                                                                                                        |
| Direction of the sorted column                  | `fa-sort-up` ascending, `fa-sort-down` descending | `templates/actor/_partials/_sort-header.hbs` (target), `components/sort-header.md`                                                                                                                                                                                                                   | No icon: `is-active` and `data-dir` with no style (`module/sheets/handlers/sort-handler.js:58-63`)  |                                                                                                        |
| Current Wound Rank                              | `fa-check`                                        | `templates/actor/_partials/_wound-track.hbs`, `components/wound-track.md`                                                                                                                                                                                                                            | A disabled checked checkbox (`templates/actor/_partials/_wounds.hbs:55`)                            | A finished or chosen item (`resources/app/templates/dice/roll-resolver.hbs:20`)                        |
| Open the design gallery                         | `fa-palette`                                      | `module/setup/settings/menus.js` (the settings menu button)                                                                                                                                                                                                                                          |
| Convert to a larger or smaller coin             | `fa-arrow-up`, `fa-arrow-down`                    | `templates/apps/wealth-manager.hbs:80-94`                                                                                                                                                                                                                                                            |                                                                                                     |                                                                                                        |
| Recalculate                                     | `fa-arrows-rotate`                                | `templates/apps/xp-manager.hbs:118`                                                                                                                                                                                                                                                                  | `fa-calculator`, which also means the wealth manager                                                | Reset and refresh, 3 uses                                                                              |
| Open the wealth manager                         | `fa-calculator`                                   | `templates/actor/_partials/_item-section.hbs:21`, window icon `module/apps/wealth-manager.js:42`                                                                                                                                                                                                     |                                                                                                     |                                                                                                        |
| Open the XP manager                             | `fa-chart-line`                                   | `templates/actor/_partials/_stats.hbs:35`, window icon `module/apps/xp-manager.js:53`                                                                                                                                                                                                                | `fa-star` on the window, which core uses for a favorite                                             | `fa-star` means a favorite package                                                                     |
| Open the condition manager                      | `fa-heart-pulse`                                  | `templates/actor/_partials/_combat.hbs:9`, window icon `module/apps/condition-manager.js:75`                                                                                                                                                                                                         |                                                                                                     |                                                                                                        |
| Apply healing (rest)                            | `fa-bed`                                          | `templates/actor/_partials/_wounds.hbs:9`                                                                                                                                                                                                                                                            |                                                                                                     |                                                                                                        |
| Manage Emphases                                 | `fa-list-check`                                   | `templates/item/_type-details/skill.hbs:26`, window icon `module/apps/emphasis-manager.js:124`                                                                                                                                                                                                       |                                                                                                     |                                                                                                        |
| Open the Honor, Glory, and Status ledger        | `fa-book-bookmark`                                | `templates/actor/_partials/_ranks.hbs:64`                                                                                                                                                                                                                                                            | `fa-scroll`, which also means rules                                                                 |                                                                                                        |
| Rules (the rules tab and editor)                | `fa-scroll`                                       | `module/sheets/active-effect-config.js:33`                                                                                                                                                                                                                                                           |                                                                                                     |                                                                                                        |
| Turn an effect on or off                        | `fa-toggle-on`, `fa-toggle-off`                   | `templates/item/_partials/_tab-effects.hbs:20`                                                                                                                                                                                                                                                       |                                                                                                     | Region behaviors (`resources/app/templates/scene/parts/region-behaviors.hbs:22`)                       |
| Start or end an activation (kata, kiho, tattoo) | `fa-circle-play`, `fa-circle-stop`                | `templates/cards/_partials/_activate.hbs:6`                                                                                                                                                                                                                                                          |                                                                                                     |                                                                                                        |
| Post to chat                                    | `fa-comment`                                      | `templates/cards/_partials/_controls.hbs:4`                                                                                                                                                                                                                                                          |                                                                                                     |                                                                                                        |
| Post a request card (GM)                        | `fa-comment-dots`                                 | `module/setup/enrichers.js:118`                                                                                                                                                                                                                                                                      |                                                                                                     |                                                                                                        |
| Roll a check (Check link, request card)         | `fa-dice-d10`                                     | `module/setup/enrichers.js:20`, `templates/chat/check-request.hbs:5`                                                                                                                                                                                                                                 |                                                                                                     | The d10 die (`client/config.mjs:432`)                                                                  |
| Re-roll and keep the better                     | `fa-dice`                                         | `module/services/dice/check/chat-actions.js:260`                                                                                                                                                                                                                                                     |                                                                                                     |                                                                                                        |
| Contested roll                                  | `fa-scale-balanced`                               | `module/services/dice/check/chat-actions.js:269`                                                                                                                                                                                                                                                     |                                                                                                     |                                                                                                        |
| Damage link                                     | `fa-burst`                                        | `module/setup/enrichers.js:21`                                                                                                                                                                                                                                                                       |                                                                                                     |                                                                                                        |
| Condition link                                  | `fa-person-falling-burst`                         | `module/setup/enrichers.js:22`                                                                                                                                                                                                                                                                       |                                                                                                     |                                                                                                        |
| Fear link                                       | `fa-ghost`                                        | `module/setup/enrichers.js:23`                                                                                                                                                                                                                                                                       |                                                                                                     |                                                                                                        |
| Broken link                                     | `fa-link-slash`                                   | `templates/links/inline-link.hbs:7`                                                                                                                                                                                                                                                                  |                                                                                                     | Broken content link (`client/applications/ux/text-editor.mjs:496`)                                     |
| Open the source document                        | `fa-up-right-from-square`                         | `templates/apps/effect-panel.hbs:15`                                                                                                                                                                                                                                                                 |                                                                                                     | Pop out (`client/applications/sidebar/tabs/chat.mjs:344`)                                              |
| Import a compendium entry into the world        | `fa-download`                                     | `templates/apps/compendium-browser-results.hbs:22`                                                                                                                                                                                                                                                   |                                                                                                     | Compendium import (`client/applications/sidebar/apps/compendium.mjs:130`)                              |
| Export or import a folder file                  | `fa-file-export`, `fa-file-import`                | `module/services/item-transfer.js:131`, `:137`                                                                                                                                                                                                                                                       |                                                                                                     | `client/applications/sidebar/document-directory.mjs:259`, `:264`                                       |
| Open the compendium browser                     | `fa-book-atlas`                                   | Window icon `module/apps/compendium-browser.js:47`, sidebar button `:296`                                                                                                                                                                                                                            | `fa-book-open`, core's journal icon                                                                 | The Compendium sidebar tab (`client/applications/sidebar/sidebar.mjs:80`)                              |
| Open the effect panel                           | `fa-hourglass-half`                               | `module/apps/effect-panel.js:26`, `:164`                                                                                                                                                                                                                                                             |                                                                                                     |                                                                                                        |
| Configure an NPC attack                         | `fa-swords`                                       | Window icon `module/apps/npc-attack-config.js:43`                                                                                                                                                                                                                                                    |                                                                                                     |                                                                                                        |
| Start a duel                                    | `fa-khanda`                                       | `module/services/combat/duel.js:94`                                                                                                                                                                                                                                                                  |                                                                                                     |                                                                                                        |
| Guard                                           | `fa-shield-halved`                                | `module/services/combat/guard.js:56`                                                                                                                                                                                                                                                                 |                                                                                                     |                                                                                                        |
| End the encounter                               | `fa-flag-checkered`                               | `module/services/effects/automation.js:136`                                                                                                                                                                                                                                                          |                                                                                                     |                                                                                                        |
| Start a new session                             | `fa-calendar-plus`                                | `module/services/session.js:38`                                                                                                                                                                                                                                                                      |                                                                                                     |                                                                                                        |
| Warning                                         | `fa-triangle-exclamation`                         | states.md, Warning                                                                                                                                                                                                                                                                                   | No use yet                                                                                          | 8 uses                                                                                                 |
| Invalid                                         | `fa-circle-exclamation`                           | states.md, Invalid                                                                                                                                                                                                                                                                                   | No use yet                                                                                          | 4 uses                                                                                                 |
| Locked                                          | `fa-lock`                                         | states.md, Locked                                                                                                                                                                                                                                                                                    | No use yet                                                                                          | HUD lock (`resources/app/templates/hud/token-hud.hbs:26`)                                              |
| Loading                                         | `fa-spinner fa-spin`                              | states.md, Loading                                                                                                                                                                                                                                                                                   | No use yet                                                                                          | 18 uses                                                                                                |

Conforming, `templates/item/_partials/_tab-effects.hbs:22` and `templates/rules/_partials/_editor.hbs:21`: both delete controls
show `fa-trash`.

Non-conforming, `templates/apps/effect-panel.hbs:20` shows `fa-xmark` for the same deletion, and
`templates/actor/_partials/_expand.hbs:1` shows `fa-chevron-down` for expand while `_stats.hbs:66` shows it for
lowering a rank.

### 4. An icon-only control is a named button

An icon with no visible text sits in a `<button type="button">` that carries its tooltip in `data-tooltip` and its
accessible name in `aria-label`, both from the same key, never in `title` (Stage 17 decision 16). `data-tooltip` is
core's tooltip, shown by core's tooltip manager on pointer hover
(`client/helpers/interaction/tooltip-manager.mjs:118`), so the system's tooltips look like core's; `aria-label`
names the control for assistive technology, which a tooltip does not. Today 17 of the 23 named
icon-only controls use `title`, 4 `data-tooltip` alone, and 2 the target pair; 40 have no name. The control is a
`<button>` because an `<a>` with no `href` cannot take keyboard focus (111 such controls today), which breaks the
focus rule in states.md. Enforced by `tests/conventions/templates.test.js` (icon-only buttons carry `data-tooltip` and
`aria-label`; no `title`) and the `l5r4-enhanced.design-gallery` Quench batch (every icon-only control has an
accessible name).

Conforming, modeled on `templates/cards/_partials/_controls.hbs:3`:

<!-- prettier-ignore -->
```hbs
<button
  type="button"
  class="inline-control icon"
  data-action="delete-item"
  data-tooltip="{{localize "l5r4.ui.common.delete"}}"
  aria-label="{{localize "l5r4.ui.common.delete"}}"
>
  <i class="fa-solid fa-trash" inert></i>
</button>
```

Non-conforming, `templates/actor/_partials/_expand.hbs:1`:

<!-- prettier-ignore -->
```hbs
<a class="button inline-control icon" data-action="section-expand"><i class="fas fa-chevron-down"></i></a>
```

### 5. An icon is `inert`

Every `<i>` icon carries `inert`, so it takes no focus, no pointer events, and no place in the accessibility tree; the
control or the text beside it carries the meaning. `inert` is the one form in use (7 icons, as core writes it); the 75
icons with no attribute follow no rule. Enforced by `tests/conventions/templates.test.js` (every Font Awesome `<i>`
carries `inert`).

Conforming, `templates/chat/check-request.hbs:5`:

```hbs
<i class="fa-solid fa-dice-d10" inert></i> {{localize "l5r4.ui.links.requestRoll"}}
```

Non-conforming, `templates/apps/emphasis-manager.hbs:4`:

```hbs
<i class="fa-solid fa-plus"></i>
```

### 6. A labelled control puts the icon before its label

When a control has visible text, the icon comes first, then one space, then the localized label. The icon adds no
meaning the label lacks, so the label alone must read as the action. Enforced by review.

Conforming, `templates/apps/compendium-browser-results.hbs:17`:

```hbs
<i class="fa-solid fa-plus" inert></i> {{localize "l5r4.ui.browser.add"}}
```

Non-conforming: a label before its icon, or a control whose text is only a number with the meaning left to the icon.

### 7. Document images are decorative beside a name

An image that shows a document beside its name (effect panel row, browser row) has `alt=""`; the name is the text.
An image that stands alone as a control gets the control's name per rule 4. Enforced by
`tests/conventions/templates.test.js` (every `<img>` has an `alt` attribute) and review for its value.

Conforming, `templates/apps/effect-panel.hbs:7`:

```hbs
<img class="l5r4-effect-panel-icon" src="{{img}}" alt="" />
```

Non-conforming: an `<img>` with no `alt`, which screen readers announce by its file name.

## Fixed names

| Name                                                          | Why it stays                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File names in `assets/icons/`, `defence-stance.webp` included | Items and Active Effects store their image path in world data (`img`), set from `DEFAULT_ICONS` (`module/config/item-types.js`), `module/config/status-effects.js`, and `getIconPath` (`module/utils/icons.js`). A rename breaks stored images (Stage 17 decision 2) |
| Icon classes inside posted chat cards                         | The card's HTML is stored in the message (decision 2). `fas` still renders there: core's CSS declares `.fa-solid,.fas` together                                                                                                                                      |

## Partials and files

| Item                | Where                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tokens              | `scss/base/_variables.scss`                                                                                                   |
| Ring image paths    | `scss/base/_variables.scss:175-179`                                                                                           |
| Document images     | `assets/icons/`, `module/utils/icons.js`, `module/config/item-types.js`                                                       |
| Icon-only controls  | `templates/cards/_partials/_controls.hbs`, `templates/cards/_partials/_activate.hbs`, `templates/actor/_partials/_expand.hbs` |
| Icons in JavaScript | `module/setup/enrichers.js:19-24`, window icons in each `module/apps/*.js`, scene controls in `module/services/`              |
