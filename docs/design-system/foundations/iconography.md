# Iconography

The icon sets the system draws, the one icon each meaning gets, icon sizes, and how an icon-only control gets its name.

## Sets

| Set | Source | Used for |
| --- | --- | --- |
| Font Awesome Pro 7.2.0 | Core ships it (`public/fonts/fontawesome/css/all.min.css`; FOUNDRY-V14-REFERENCE.md §10.2). The system loads no icon font of its own | Every control, window, scene control, context menu entry, and text link |
| Ring images | `assets/icons/{air,earth,fire,water,void}.webp`, through the `$<ring>-ring-img` variables in `scss/base/_variables.scss` | The five Ring medallions on the PC and NPC sheets |
| Document images | `assets/icons/*.webp`, under `PATHS.icons` (`module/config/constants.js`), resolved by `getIconPath` (`module/utils/icons.js`) | Default item images, status effect and stance images |
| Brush sprites and border | `assets/animation/*.webp`, `assets/borders/brush-08-gray.svg` | Ornament, not icons: see motion.md and frames.md |

## Tokens

Declared on `:root` in `scss/base/_variables.scss`. They join the size scale in space-and-size.md under the `size` category.

| Token | Value | Use | Read at |
| --- | --- | --- | --- |
| `--l5r4-size-icon-sm` | `0.625rem` | The rank step arrow glyph | `@mixin rank-arrows` (`scss/features/_traits-rings.scss`) |

A document image in a row (effect panel, compendium browser, spell slots) is not a glyph: it reads `--l5r4-size-item-icon` (32 px) from the size scale in space-and-size.md. A Font Awesome glyph anywhere else takes the font size of its control or text and needs no token. The control around an icon-only glyph is core's `.inline-control`, whose `--button-size` is `24px` (`foundry2.css:6195-6200`), the minimum target in space-and-size.md.

## Rules

### 1. One style: `fa-solid`

Every Font Awesome icon the system writes uses the `fa-solid` style class (Stage 17 decision 15), in templates and in JavaScript (`DEFAULT_OPTIONS.window.icon`, scene control tools, context menu entries, the text link icons). No `fas`, `far`, `fa-regular`, `fa-light`, or `fa-duotone`. Every icon the templates and `module/` write is `fa-solid`; core writes `fa-solid` 871 times and `fas` 20. Enforced by `tests/conventions/templates.test.js` (one Font Awesome prefix) and ESLint `no-restricted-syntax` on string literals matching `/\bfa[srlb]\b|\bfa-(regular|light|duotone)\b/` in `module/`.

Conforming, the icon of `data-action="open-source"` (`templates/apps/effect-panel.hbs`):

```hbs
<i class="fa-solid fa-up-right-from-square" inert></i>
```

Non-conforming (modeled):

```hbs
<i class="fas fa-trash"></i>
```

### 2. Canonical names, not aliases

Write the name Font Awesome 7 lists first for a glyph, not an older alias that draws the same glyph. No template or JavaScript use carries an alias. Enforced by `tests/conventions/templates.test.js` and the same ESLint rule, both reading the alias list below.

| Alias (do not write) | Canonical          | Glyph  |
| -------------------- | ------------------ | ------ |
| `fa-edit`            | `fa-pen-to-square` | `f044` |
| `fa-cog`             | `fa-gear`          | `f013` |
| `fa-save`            | `fa-floppy-disk`   | `f0c7` |
| `fa-times`           | `fa-xmark`         | `f00d` |
| `fa-atlas`           | `fa-book-atlas`    | `f558` |

The glyph codes come from the grouped selectors in core's `all.min.css` (`.fa-edit,.fa-pen-to-square{--fa:"\f044"}`). Core itself writes `fa-edit` 21 times; the glyph is the same, so the system follows core's icon and writes its canonical name.

Conforming, the icon of `data-action="edit-attack"` (`templates/actor/_partials/_stats-npc.hbs`):

```hbs
<i class="fa-solid fa-pen-to-square" inert></i>
```

Non-conforming (modeled):

```hbs
<i class="fas fa-save"></i>
```

### 3. One icon per meaning, one meaning per icon

Each meaning the system shows has one icon, and an icon stands for one meaning. Where core shows the same meaning, the system uses core's icon. The table lists every meaning the templates and `module/` use; "Where the code differs" names what the code shows where it is not the pick. Enforced by `tests/conventions/design-system.test.js`, which reads this table and fails on an icon name in `templates/` or `module/` that the table does not list, and by review for whether a new control's meaning matches its row; the gallery's icon section renders the table.

| Meaning | Icon | Used at | Where the code differs | Core precedent |
| --- | --- | --- | --- | --- |
| Add or create | `fa-plus` | `templates/rules/_partials/_editor.hbs`, `templates/apps/xp-manager.hbs`, `templates/apps/wealth-manager.hbs`, `templates/apps/emphasis-manager.hbs`, `templates/item/_partials/_tab-effects.hbs`, `templates/apps/compendium-browser-results.hbs`, `templates/actor/_partials/_stats-npc.hbs`, `templates/actor/_partials/_unified-item-create.hbs` |  | 17 uses (file picker favorites, card faces) |
| Subtract an amount | `fa-minus` | `data-action="remove-money"` (`templates/apps/wealth-manager.hbs`) |  |  |
| Edit | `fa-pen-to-square` | `templates/cards/_partials/_controls.hbs`, `templates/apps/emphasis-manager.hbs`, `templates/item/_partials/_tab-effects.hbs`, `templates/actor/_partials/_stats-npc.hbs` |  | `fa-edit`, the same glyph, 21 uses |
| Delete a document or entry | `fa-trash` | `templates/rules/_partials/_editor.hbs`, `templates/apps/xp-manager.hbs`, `templates/apps/emphasis-manager.hbs`, `templates/item/_partials/_tab-effects.hbs`, `templates/cards/_partials/_controls.hbs`, `templates/actor/_partials/_stats-npc.hbs`, `templates/apps/effect-panel.hbs` |  | 48 uses |
| Save | `fa-floppy-disk` | `templates/apps/npc-attack-config.hbs`, `templates/apps/emphasis-manager.hbs` |  | 44 uses |
| Open a configuration window | `fa-gear` | `templates/actor/_partials/_combat.hbs`, `templates/actor/_partials/_armor.hbs`, `templates/actor/_partials/_wounds.hbs`; window icons `WoundConfigApplication.DEFAULT_OPTIONS` (`module/apps/wound-config.js`), `CombatConfigApplication.DEFAULT_OPTIONS` (`module/apps/combat-config.js`), `ArmorConfigApplication.DEFAULT_OPTIONS` (`module/apps/armor-config.js`) |  | `fa-gear` 8 uses, `fa-cog` 1 |
| Expand or collapse a section or row | `fa-angle-down` closed, `fa-angle-up` open | `templates/actor/_partials/_expand.hbs`, `data-action="expand-item"` (`templates/cards/_partials/_controls.hbs`); swapped by `ItemCrudHandler.updateItemExpanded` and `ItemCrudHandler.updateSectionCollapsed` (`module/sheets/handlers/item-crud-handler.js`) |  | `fa-angle-down` on a collapsible section [src: templates/adventure/exporter/contents.hbs:5] |
| Step a rank up or down | `fa-chevron-up`, `fa-chevron-down` | `templates/actor/_partials/_rank-control.hbs` |  |  |
| Direction of the sorted column | `fa-sort-up` ascending, `fa-sort-down` descending | `components/sort-header.md`, for `templates/actor/_partials/_sort-header.hbs` | No icon: `is-active` and `data-dir` with no style (`SortHandler.#updateHeaderIndicators` (`module/sheets/handlers/sort-handler.js`)) |  |
| Current Wound Rank | `fa-check` | `templates/actor/_partials/_wound-track.hbs`, `components/wound-track.md` |  | A finished or chosen item [src: templates/dice/roll-resolver.hbs:20] |
| Open the design gallery | `fa-palette` | `module/setup/settings/menus.js` (the settings menu button) |
| Convert to a larger or smaller coin | `fa-arrow-up`, `fa-arrow-down` | `data-action="convert-up"` and `data-action="convert-down"` (`templates/apps/wealth-manager.hbs`) |  |  |
| Recalculate | `fa-arrows-rotate` | `data-action="recalculate-xp"` (`templates/apps/xp-manager.hbs`) |  | Reset and refresh, 3 uses |
| Open the wealth manager | `fa-calculator` | `templates/actor/_partials/_item-section.hbs`, window icon `WealthManagerApplication.DEFAULT_OPTIONS` (`module/apps/wealth-manager.js`) |  |  |
| Open the XP manager | `fa-chart-line` | `data-action="open-xp-manager"` (`templates/actor/_partials/_stats.hbs`), window icon `XpManagerApplication.DEFAULT_OPTIONS` (`module/apps/xp-manager.js`) |  | `fa-star` means a favorite package |
| Open the condition manager | `fa-heart-pulse` | `templates/actor/_partials/_combat.hbs`, window icon `ConditionManagerApplication.DEFAULT_OPTIONS` (`module/apps/condition-manager.js`) |  |  |
| Apply healing (rest) | `fa-bed` | `templates/actor/_partials/_wounds.hbs` |  |  |
| Manage Emphases | `fa-list-check` | `templates/item/_type-details/skill.hbs`, window icon `EmphasisManagerApplication.DEFAULT_OPTIONS` (`module/apps/emphasis-manager.js`) |  |  |
| Open the Honor, Glory, and Status ledger | `fa-book-bookmark` | `templates/actor/_partials/_ranks.hbs` |  |  |
| Rules (the rules tab and editor) | `fa-scroll` | `L5R4ActiveEffectConfig.TABS` (`module/sheets/active-effect-config.js`) |  |  |
| Turn an effect on or off | `fa-toggle-on`, `fa-toggle-off` | `data-action="toggle-effect"` (`templates/item/_partials/_tab-effects.hbs`) |  | Region behaviors [src: templates/scene/parts/region-behaviors.hbs:22] |
| Start or end an activation (kata, kiho, tattoo) | `fa-circle-play`, `fa-circle-stop` | `templates/cards/_partials/_activate.hbs` |  |  |
| Post to chat | `fa-comment` | `data-action="post-item"` (`templates/cards/_partials/_controls.hbs`) |  |  |
| Post a request card (GM) | `fa-comment-dots` | `data-link-request` (`templates/links/inline-link.hbs`) |  |  |
| Roll a check (Check link, request card) | `fa-dice-d10` | `ICONS.Check` (`module/setup/enrichers.js`), `templates/chat/check-request.hbs` |  | The d10 die (`client/config.mjs:432`) |
| Re-roll and keep the better | `fa-dice` | `onGetChatMessageContextOptions` (`module/services/dice/check/chat-actions.js`) |  |  |
| Contested roll | `fa-scale-balanced` | `onGetChatMessageContextOptions` (`module/services/dice/check/chat-actions.js`) |  |  |
| Damage link | `fa-burst` | `ICONS.Damage` (`module/setup/enrichers.js`) |  |  |
| Condition link | `fa-person-falling-burst` | `ICONS.Condition` (`module/setup/enrichers.js`) |  |  |
| Fear link | `fa-ghost` | `ICONS.Fear` (`module/setup/enrichers.js`) |  |  |
| Broken link | `fa-link-slash` | `templates/links/inline-link.hbs` |  | Broken content link (`client/applications/ux/text-editor.mjs:496`) |
| Open the source document | `fa-up-right-from-square` | `data-action="open-source"` (`templates/apps/effect-panel.hbs`) |  | Pop out (`client/applications/sidebar/tabs/chat.mjs:344`) |
| Import a compendium entry into the world | `fa-download` | `data-action="import-entry"` (`templates/apps/compendium-browser-results.hbs`) |  | Compendium import (`client/applications/sidebar/apps/compendium.mjs:130`) |
| Export or import a folder file | `fa-file-export`, `fa-file-import` | `onGetFolderContextOptions` (`module/services/item-transfer.js`) |  | `client/applications/sidebar/document-directory.mjs:259`, `:264` |
| Open the compendium browser | `fa-books` | Window icon `CompendiumBrowserApplication.DEFAULT_OPTIONS` (`module/apps/compendium-browser.js`), sidebar button `templates/apps/compendium-browser-open.hbs` |  | None: core's `fa-book-atlas` is the Compendium tab and Create Compendium, beside the sidebar button |
| Open the effect panel | `fa-hourglass-half` | `EffectPanelApplication.DEFAULT_OPTIONS` and `EffectPanelApplication.onGetSceneControlButtons` (`module/apps/effect-panel.js`) |  |  |
| Configure an NPC attack | `fa-swords` | Window icon `NpcAttackConfigApplication.DEFAULT_OPTIONS` (`module/apps/npc-attack-config.js`) |  |  |
| Start a duel | `fa-khanda` | `onGetSceneControlButtonsDuel` (`module/services/combat/duel.js`) |  |  |
| Guard | `fa-shield-halved` | `onGetSceneControlButtonsGuard` (`module/services/combat/guard.js`) |  |  |
| End the encounter | `fa-flag-checkered` | `onGetSceneControlButtonsEncounter` (`module/services/effects/automation.js`) |  |  |
| Start a new session | `fa-calendar-plus` | `onGetSceneControlButtonsSession` (`module/services/session.js`) |  |  |
| Warning | `fa-triangle-exclamation` | states.md, Warning | Only the gallery shows it | 8 uses |
| Invalid | `fa-circle-exclamation` | states.md, Invalid | Only the gallery shows it | 4 uses |
| Locked | `fa-lock` | states.md, Locked | Only the gallery shows it | HUD lock [src: templates/hud/token-hud.hbs:26] |
| Loading | `fa-spinner fa-spin` | states.md, Loading | Only the gallery shows it | 18 uses |

Conforming, `data-action="delete-effect"` (`templates/item/_partials/_tab-effects.hbs`) and `data-action="delete-rule"` (`templates/rules/_partials/_editor.hbs`): both delete controls show `fa-trash`.

Non-conforming (modeled): `fa-xmark` on one delete control while every other shows `fa-trash`, or `fa-chevron-down` for expand while the same glyph lowers a rank.

### 4. An icon-only control is a named button

An icon with no visible text sits in a `<button type="button">` that carries its tooltip in `data-tooltip` and its accessible name in `aria-label`, both from the same key, never in `title` (Stage 17 decision 16). `data-tooltip` is core's tooltip, shown by core's tooltip manager on pointer hover (`client/helpers/interaction/tooltip-manager.mjs:118`), so the system's tooltips look like core's; `aria-label` names the control for assistive technology, which a tooltip does not. Every icon-only control in the templates carries the pair. The control is a `<button>` because an `<a>` with no `href` cannot take keyboard focus, which breaks the focus rule in states.md. Enforced by `tests/conventions/templates.test.js` (icon-only buttons carry `data-tooltip` and `aria-label`; no `title`) and the `l5r4-enhanced.design-gallery` Quench batch (every icon-only control has an accessible name).

Conforming, `data-action="delete-item"` (`templates/cards/_partials/_controls.hbs`), here on several lines:

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

Non-conforming (modeled):

<!-- prettier-ignore -->
```hbs
<a class="button inline-control icon" data-action="section-expand"><i class="fas fa-chevron-down"></i></a>
```

### 5. An icon is `inert`

Every `<i>` icon carries `inert`, so it takes no focus, no pointer events, and no place in the accessibility tree; the control or the text beside it carries the meaning. `inert` is the one form, as core writes it, and every icon in the templates carries it. Enforced by `tests/conventions/templates.test.js` (every Font Awesome `<i>` carries `inert`).

Conforming, the icon of `data-action="check-request-roll"` (`templates/chat/check-request.hbs`):

```hbs
<i class="fa-solid fa-dice-d10" inert></i> {{localize "l5r4.ui.links.requestRoll"}}
```

Non-conforming (modeled):

```hbs
<i class="fa-solid fa-plus"></i>
```

### 6. A labelled control puts the icon before its label

When a control has visible text, the icon comes first, then one space, then the localized label. The icon adds no meaning the label lacks, so the label alone must read as the action. Enforced by review.

Conforming, `data-action="add-entry"` (`templates/apps/compendium-browser-results.hbs`):

```hbs
<i class="fa-solid fa-plus" inert></i> {{localize "l5r4.apps.compendiumBrowser.add"}}
```

Non-conforming: a label before its icon, or a control whose text is only a number with the meaning left to the icon.

### 7. Document images are decorative beside a name

An image that shows a document beside its name (effect panel row, browser row) has `alt=""`; the name is the text. An image that stands alone as a control gets the control's name per rule 4. Enforced by `tests/conventions/templates.test.js` (every `<img>` has an `alt` attribute) and review for its value.

Conforming, `l5r4-effect-panel-icon` (`templates/apps/effect-panel.hbs`):

```hbs
<img class="l5r4-effect-panel-icon" src="{{img}}" alt="" />
```

Non-conforming: an `<img>` with no `alt`, which screen readers announce by its file name.

## Fixed names

| Name | Why it stays |
| --- | --- |
| File names in `assets/icons/`, `defence-stance.webp` included | Items and Active Effects store their image path in world data (`img`), set from `DEFAULT_ICONS` (`module/config/item-types.js`), `module/config/status-effects.js`, and `getIconPath` (`module/utils/icons.js`). A rename breaks stored images (Stage 17 decision 2) |
| Icon classes inside posted chat cards | The card's HTML is stored in the message (decision 2). `fas` still renders there: core's CSS declares `.fa-solid,.fas` together |

## Partials and files

| Item | Where |
| --- | --- |
| Tokens | `scss/base/_variables.scss` |
| Ring image paths | `$air-ring-img` to `$void-ring-img` (`scss/base/_variables.scss`) |
| Document images | `assets/icons/`, `module/utils/icons.js`, `module/config/item-types.js` |
| Icon-only controls | `templates/cards/_partials/_controls.hbs`, `templates/cards/_partials/_activate.hbs`, `templates/actor/_partials/_expand.hbs` |
| Icons in JavaScript | `ICONS` (`module/setup/enrichers.js`), window icons in each `module/apps/*.js`, scene controls in `module/services/` |
