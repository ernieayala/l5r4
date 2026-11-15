# Effect panel

A small floating window listing the effects on the controlled token's actor, else the user's character: each effect's
icon, name, source, and how long it lasts, with buttons to open its source and to remove it. A token-controls button
opens and closes it; it redraws when control, effects, the actor, or the combat change. `patterns/panels-and-browsers.md`
places it among the panels.

| Item       | Detail                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window     | `module/apps/effect-panel.js`, class `EffectPanel`; target `EffectPanelApplication` ([naming.md](../../code-system/naming.md#classes)). `HandlebarsApplicationMixin(ApplicationV2)`, id `l5r4-enhanced-effect-panel`, classes `l5r4 l5r4-effect-panel`, icon `fa-solid fa-hourglass-half`, resizable, 320 px wide at top 80, left 120 |
| Template   | `templates/apps/effect-panel.hbs`, the one part `effects`                                                                                                                                                                                                                                                                             |
| Opened by  | The token-controls tool `l5r4-enhanced-effects` (`effect-panel.js:155-168`), which calls `EffectPanel.toggle()`                                                                                                                                                                                                                       |
| Redraws on | `controlToken`, `createActiveEffect`, `updateActiveEffect`, `deleteActiveEffect`, `updateActor`, `updateCombat` (`effect-panel.js:173-182`)                                                                                                                                                                                           |
| SCSS       | Now `scss/apps/_effect-panel.scss:6-60`, beside the inline link and the request card. `scss/apps/_effect-panel.scss`: a window's styles go in `apps/`, named as its `module/apps/` file ([templates-and-styles.md](../../code-system/templates-and-styles.md#folders))                                                                |
| Copy       | Now `l5r4.ui.effectPanel.*`; target `l5r4.apps.effectPanel.*` ([localization.md](../content/localization.md#key-paths))                                                                                                                                                                                                               |
| Quench     | `l5r4-enhanced.table-tools`                                                                                                                                                                                                                                                                                                           |

## Anatomy

| Part        | Markup                                                           | Class                                                  | Notes                                                                      |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Body        | `<section>`                                                      | `l5r4-effect-panel-body`                               | The part's one root                                                        |
| Actor       | `<h3>`                                                           | `l5r4-effect-panel-actor`                              | The actor's name, when there is an actor                                   |
| List        | `<ul>`                                                           | `l5r4-effect-panel-list`                               |                                                                            |
| Row         | `<li data-uuid data-source-uuid>`                                | `l5r4-effect-panel-row`                                | Icon, text column, buttons                                                 |
| Icon        | `<img alt="">`                                                   | `l5r4-effect-panel-icon`                               | Decorative beside the name (iconography.md rule 7)                         |
| Text        | `<div>`: name, source, lasts                                     | `l5r4-effect-panel-text`, `-name`, `-source`, `-lasts` | Name bold; source and lasts at the meta step                               |
| Open source | `<button type="button">`, icon-only                              | `l5r4-effect-panel-button`                             | `fa-up-right-from-square`                                                  |
| Remove      | `<button type="button">`, icon-only, when the user may remove it | `l5r4-effect-panel-button`                             | `fa-xmark` now; `fa-trash` target, the delete icon (iconography.md rule 3) |
| Empty       | `<p>`                                                            | `l5r4-effect-panel-empty`                              | Italic                                                                     |

## Actions

| Now            | Target          | Does                                                              |
| -------------- | --------------- | ----------------------------------------------------------------- |
| `openSource`   | `open-source`   | Opens the item that carries the effect, its origin, or the effect |
| `removeEffect` | `delete-effect` | Deletes an effect the user owns                                   |

`DEFAULT_OPTIONS.actions` keys change with them, quoted (naming.md); the handlers become `#onOpenSource` and
`#onDeleteEffect`.

## Variants

| Variant                         | Shows                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Actor with effects              | Actor heading, one row per applied effect                                      |
| Actor with none                 | Actor heading, the empty line `l5r4.ui.effectPanel.none` with the actor's name |
| No actor                        | The empty line `l5r4.ui.effectPanel.noActor`                                   |
| Effect on an item, or not owned | No remove button (`canRemove`, `effect-panel.js:85`)                           |
| Effect with uses                | "lasts" adds the uses left after the duration (`effect-panel.js:67-76`)        |

## States

| State               | Look                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open                | Core's window                                                                                                                                       |
| Closed              | The tool's next press opens it at the same place                                                                                                    |
| Button hover, focus | Core's button looks                                                                                                                                 |
| Removing            | Target: the remove button is disabled with `aria-busy` and `fa-spinner fa-spin` until the delete resolves (states.md rule 8). Now it shows no state |
| Empty               | One italic line (states.md rule 9)                                                                                                                  |

## Parameters

Context from `_prepareContext` (`effect-panel.js:49-58`):

| Name      | Type                                                          | Meaning                  |
| --------- | ------------------------------------------------------------- | ------------------------ |
| `actor`   | Actor or null                                                 | Whose effects show       |
| `effects` | `{ uuid, name, img, source, sourceUuid, lasts, canRemove }[]` | One per applied effect   |
| `empty`   | string                                                        | The localized empty line |

## Tokens

| Token                                                       | Property                        | Part                                      |
| ----------------------------------------------------------- | ------------------------------- | ----------------------------------------- |
| `--l5r4-space-gap`                                          | `margin-block-end`              | Actor heading (`_effect-panel.scss:8-10`) |
| `--l5r4-space-gap-tight`                                    | `gap`                           | List (`:15`)                              |
| `--l5r4-space-gap`                                          | `gap`                           | Row (`:24`)                               |
| `--l5r4-size-item-icon`                                     | `flex-basis`, `width`, `height` | Icon (`:29-31`)                           |
| `--l5r4-font-size-meta`                                     | `font-size`                     | Source, lasts (`:45-48`)                  |
| `--l5r4-space-control-block`, `--l5r4-space-control-inline` | `padding`                       | Buttons (`:53`, `0.25rem 0.4rem` now)     |

## Keyboard and screen reader

| Contract | Detail                                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus    | Both buttons are `<button type="button">`; rows are not focusable                                                                                                                             |
| Names    | `data-tooltip` and `aria-label` from one key each, the form icon-only controls take (Stage 17 decision 16; templates-and-styles.md **Structure**); the keys move to `l5r4.apps.effectPanel.*` |
| Reading  | Heading, then per row: name, source, lasts, then the buttons, which read as "Open its source" and "Remove this effect" after the name they act on                                             |
| Icons    | `inert`; the image is `alt=""` beside its name                                                                                                                                                |

## Long text

The text column has `min-width: 0` and wraps (`_effect-panel.scss:34-39`), so a long effect or source name wraps
beside its icon and the buttons keep their place. The window is resizable.

## Rules

| #   | Rule                                                                                    | Enforced by                                                    | Conforming                                                                                                | Non-conforming                                                                     |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| EF1 | Actions are kebab-case                                                                  | `tests/conventions/actions.test.js`                            | `data-action="open-source"`                                                                               | `data-action="removeEffect"` (`effect-panel.hbs:18`)                               |
| EF2 | Delete shows `fa-trash`, the delete icon everywhere                                     | `tests/conventions/design-system.test.js` (icon table), review | `<i class="fa-solid fa-trash" inert></i>` (modeled on `templates/rules/_partials/_editor.hbs:21`)         | `<i class="fa-solid fa-xmark" inert></i>` for a delete (`effect-panel.hbs:20`)     |
| EF3 | An icon-only button carries `data-tooltip` and `aria-label` from one key, never `title` | `tests/conventions/templates.test.js`                          | `data-tooltip` and `aria-label` both `l5r4.apps.effectPanel.openSource` (templates-and-styles.md example) | `title="…"` alone on an icon button (modeled)                                      |
| EF4 | Remove shows only where the user may remove                                             | Quench `l5r4-enhanced.table-tools`                             | `{{#if canRemove}}` (`effect-panel.hbs:17`), checked again on click (`effect-panel.js:120`)               | A remove button on an item's effect that refuses on click (modeled)                |
| EF5 | The window's styles live in their own file under `scss/apps/`, and nothing else does    | `tests/conventions/styles.test.js` (one component per file)    | `.l5r4-effect-panel` alone in `scss/apps/_effect-panel.scss`                                              | `.l5r4-link` and `.l5r4-check-request` in `scss/components/_inline-link.scss:6-30` |
| EF6 | Spacing and sizes read tokens                                                           | `tests/conventions/styles.test.js`                             | `padding: var(--l5r4-space-control-block) var(--l5r4-space-control-inline);`                              | `padding: 0.25rem 0.4rem;` (`_effect-panel.scss:53`)                               |

## Do and don't

| Do                                                    | Don't                                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Show what each effect came from and how long it lasts | Show the effect's rules: its source sheet holds them |
| Redraw on the hooks that change what it lists         | Poll                                                 |
| Say whose effects these are                           | Show an empty list with no line                      |
