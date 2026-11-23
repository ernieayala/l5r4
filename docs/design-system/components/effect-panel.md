# Effect panel

A small floating window listing the effects on the controlled token's actor, else the user's character: each effect's icon, name, source, and how long it lasts, with buttons to open its source and to remove it. A token-controls button opens and closes it; it redraws when control, effects, the actor, or the combat change. `patterns/panels-and-browsers.md` places it among the panels.

| Item | Detail |
| --- | --- |
| Window | `module/apps/effect-panel.js`, class `EffectPanelApplication`; target `EffectPanelApplication` ([naming.md](../../code-system/naming.md#classes)). `HandlebarsApplicationMixin(ApplicationV2)`, id `l5r4-enhanced-effect-panel`, classes `l5r4 l5r4-effect-panel`, icon `fa-solid fa-hourglass-half`, resizable, 320 px wide at top 80, left 120 |
| Template | `templates/apps/effect-panel.hbs`, the one part `effects` |
| Opened by | The token-controls tool `l5r4-enhanced-effects`, added by `EffectPanelApplication.onGetSceneControlButtons` (`module/apps/effect-panel.js`), which calls `EffectPanelApplication.openOrClose()` |
| Redraws on | `controlToken`, `createActiveEffect`, `updateActiveEffect`, `deleteActiveEffect`, `updateActor`, `updateCombat` (`EFFECT_PANEL_REDRAWS` (`module/hooks/register-all.js`)), each calling `EffectPanelApplication.renderIfOpen` |
| SCSS | `scss/apps/_effect-panel.scss`: a window's styles go in `apps/`, named as its `module/apps/` file ([templates-and-styles.md](../../code-system/templates-and-styles.md#folders)) |
| Copy | `l5r4.apps.effectPanel.*` ([localization.md](../content/localization.md#key-paths)) |
| Quench | `l5r4-enhanced.table-tools` |

## Anatomy

| Part | Markup | Class | Notes |
| --- | --- | --- | --- |
| Body | `<section>` | `l5r4-effect-panel-body` | The part's one root |
| Actor | `<h3>` | `l5r4-effect-panel-actor` | The actor's name, when there is an actor |
| List | `<ul>` | `l5r4-effect-panel-list` |  |
| Row | `<li data-uuid data-source-uuid>` | `l5r4-effect-panel-row` | Icon, text column, buttons |
| Icon | `<img alt="">` | `l5r4-effect-panel-icon` | Decorative beside the name (iconography.md rule 7) |
| Text | `<div>`: name, source, lasts | `l5r4-effect-panel-text`, `-name`, `-source`, `-lasts` | Name bold; source and lasts at the meta step |
| Open source | `<button type="button">`, icon-only | `l5r4-effect-panel-button` | `fa-up-right-from-square` |
| Remove | `<button type="button">`, icon-only, when the user may remove it | `l5r4-effect-panel-button` | `fa-trash`, the delete icon (iconography.md rule 3) |
| Empty | `<p>` | `l5r4-effect-panel-empty` | Italic |

## Actions

| Action          | Does                                                              |
| --------------- | ----------------------------------------------------------------- |
| `open-source`   | Opens the item that carries the effect, its origin, or the effect |
| `delete-effect` | Deletes an effect the user owns                                   |

The `DEFAULT_OPTIONS.actions` keys are quoted (naming.md); the handlers are `EffectPanelApplication.#onOpenSource` and `EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`).

## Variants

| Variant | Shows |
| --- | --- |
| Actor with effects | Actor heading, one row per applied effect |
| Actor with none | Actor heading, the empty line `l5r4.apps.effectPanel.none` with the actor's name |
| No actor | The empty line `l5r4.apps.effectPanel.noActor` |
| Effect on an item, or not owned | No remove button (`canRemove`, set by `EffectPanelApplication#buildRow` (`module/apps/effect-panel.js`)) |
| Effect with uses | "lasts" adds the uses left after the duration (`EffectPanelApplication#buildRow` (`module/apps/effect-panel.js`)) |

## States

| State | Look |
| --- | --- |
| Open | Core's window |
| Closed | The tool's next press opens it at the same place |
| Button hover, focus | Core's button looks |
| Removing | Target: the remove button is disabled with `aria-busy` and `fa-spinner fa-spin` until the delete resolves (states.md rule 8). The button shows no state |
| Empty | One italic line (states.md rule 9) |

## Parameters

Context from `EffectPanelApplication#_prepareContext` (`module/apps/effect-panel.js`):

| Name | Type | Meaning |
| --- | --- | --- |
| `actor` | Actor or null | Whose effects show |
| `effects` | `{ uuid, name, img, source, sourceUuid, lasts, canRemove }[]` | One per applied effect |
| `empty` | string | The localized empty line |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap` | `margin-block-end` | Actor heading (`.l5r4-effect-panel-actor` (`scss/apps/_effect-panel.scss`)) |
| `--l5r4-space-gap-tight` | `gap` | List (`.l5r4-effect-panel-list` (`scss/apps/_effect-panel.scss`)) |
| `--l5r4-space-gap` | `gap` | Row (`.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`)) |
| `--l5r4-size-item-icon` | `flex-basis`, `width`, `height` | Icon (`.l5r4-effect-panel-icon` (`scss/apps/_effect-panel.scss`)) |
| `--l5r4-font-size-meta` | `font-size` | Source, lasts (`.l5r4-effect-panel-lasts` (`scss/apps/_effect-panel.scss`)) |
| `--l5r4-space-control-block`, `--l5r4-space-control-inline` | `padding` | Buttons (`.l5r4-effect-panel-button` (`scss/apps/_effect-panel.scss`)) |

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Focus | Both buttons are `<button type="button">`; rows are not focusable |
| Names | `data-tooltip` and `aria-label` from one key each, the form icon-only controls take (Stage 17 decision 16; templates-and-styles.md **Structure**), under `l5r4.apps.effectPanel.*` |
| Reading | Heading, then per row: name, source, lasts, then the buttons, which read as "Open its source" and "Remove this effect" after the name they act on |
| Icons | `inert`; the image is `alt=""` beside its name |

## Long text

The text column has `min-width: 0` and wraps (`.l5r4-effect-panel-text` (`scss/apps/_effect-panel.scss`)), so a long effect or source name wraps beside its icon and the buttons keep their place. The window is resizable.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| EF1 | Actions are kebab-case | `tests/conventions/actions.test.js` | `data-action="open-source"` | `data-action="removeEffect"` (modeled) |
| EF2 | Delete shows `fa-trash`, the delete icon everywhere | `tests/conventions/design-system.test.js` (icon table), review | `<i class="fa-solid fa-trash" inert></i>` (`templates/apps/effect-panel.hbs`) | `<i class="fa-solid fa-xmark" inert></i>` for a delete (modeled) |
| EF3 | An icon-only button carries `data-tooltip` and `aria-label` from one key, never `title` | `tests/conventions/templates.test.js` | `data-tooltip` and `aria-label` both `l5r4.apps.effectPanel.openSource` (templates-and-styles.md example) | `title="…"` alone on an icon button (modeled) |
| EF4 | Remove shows only where the user may remove | Quench `l5r4-enhanced.table-tools` | `{{#if canRemove}}` (`templates/apps/effect-panel.hbs`), checked again on click (`EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`)) | A remove button on an item's effect that refuses on click (modeled) |
| EF5 | The window's styles live in their own file under `scss/apps/`, and nothing else does | `tests/conventions/styles.test.js` (one component per file) | `.l5r4-effect-panel` alone in `scss/apps/_effect-panel.scss` | The inline link's and the request card's rules in the effect panel's file (modeled) |
| EF6 | Spacing and sizes read tokens | `tests/conventions/styles.test.js` | `padding: var(--l5r4-space-control-block) var(--l5r4-space-control-inline);` (`scss/apps/_effect-panel.scss`) | `padding: 0.25rem 0.4rem;` (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Show what each effect came from and how long it lasts | Show the effect's rules: its source sheet holds them |
| Redraw on the hooks that change what it lists | Poll |
| Say whose effects these are | Show an empty list with no line |
