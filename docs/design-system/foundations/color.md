# Color

Core paints the window and sets the theme. The system's colors sit on top as tokens in three tiers: palette primitives
named by hue and step, role tokens named by job, and domain roles named by game term. Components read role and domain
tokens only. All tokens are declared in `scss/base/_variables.scss`.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Enforced by                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| C1  | Token names follow `--l5r4-{category}-{name}`: palette primitives `--l5r4-palette-{hue}-{step}`, role and domain tokens `--l5r4-color-{name}`, images `--l5r4-image-{name}`. The step is `round((100 - L*) / 10) * 100` with CIELAB L*, so 100 is lightest and 900 darkest; black and white have no step                                                                                                                                                                                                                                                                                                                          | Stylelint `custom-property-pattern`; `tests/conventions/styles.test.js`                              |
| C2  | Tokens are declared only in `scss/base/_variables.scss`. Every declared token is read somewhere and listed on this page; every token read is declared                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `tests/conventions/styles.test.js`                                                                   |
| C3  | Outside `scss/base/`, a color comes from a `--l5r4-color-*` token: never a palette primitive, a core color variable, a hex, `rgb()`, `hsl()`, or a named color                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Stylelint `color-no-hex` and `color-named` (off in `scss/base/`); `tests/conventions/styles.test.js` |
| C4  | A token that reads a core variable or differs by theme is declared in both a `.theme-light` and a `.theme-dark` block, never only on `:root`. A `var()` resolves on the element that declares the property, so a token computed on `:root` carries the interface's theme into a sheet that has its own. A token that reads an application-scoped core variable (`--background`, `--color-header-background`, `--color-border`) is also declared on `.application`, where core sets those. Core's button variables are set on each button element, so no token builds on them. Palette primitives hold literals and sit on `:root` | `tests/conventions/styles.test.js`                                                                   |
| C5  | A token holds a whole color. Transparency comes from `color-mix(in srgb, <token> N%, transparent)` in a role or domain token, never from an RGB triplet wrapped in `rgb()`                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `tests/conventions/styles.test.js`                                                                   |
| C6  | Every text/surface pairing in **Contrast** meets its minimum in both themes: 4.5:1 for text, 3:1 for large text (24 px, or 18.66 px bold) and for controls and state indicators                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `tests/conventions/contrast.test.js`                                                                 |
| C7  | Color never carries a state alone: the state also changes an icon, a shape, a weight, or text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Review, in the gallery's state sections                                                              |

| #   | Conforming                                                                                                                                                                | Non-conforming                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| C1  | `--l5r4-palette-rust-600: #ab4913;`                                                                                                                                       | `--fire-ring-color: 171, 73, 19;` (`scss/base/_variables.scss:11`)                             |
| C2  | `--l5r4-color-ring-fire` declared in `_variables.scss`, read in `_traits-rings.scss`                                                                                      | `--controls: 102px;` declared inside a rule (`scss/components/_item-row.scss:27`)              |
| C3  | `border-color: var(--l5r4-color-void-point);`                                                                                                                             | `border: 2px solid #666;` (`scss/features/_traits-rings.scss:573`)                             |
| C4  | `.theme-dark { --l5r4-color-ring-rank-backdrop: var(--color-cool-5-90); }`, as `scss/base/_variables.scss:21-24` sets the backdrop                                        | `:root { --l5r4-color-text: var(--color-text-primary); }` (modeled)                            |
| C5  | `--l5r4-color-ring-fire-tint: color-mix(in srgb, var(--l5r4-color-ring-fire) 10%, transparent);`                                                                          | `background-color: rgb(var(--fire-ring-color), 0.1);` (`scss/features/_traits-rings.scss:109`) |
| C6  | `--l5r4-color-text-on-header` on `--l5r4-color-header`: 11.40:1 light, 16.97:1 dark                                                                                       | `--l5r4-color-ring-text` on today's Air, `#889eb3`: 2.77:1                                     |
| C7  | Browser tab: active is bold and outlined as well as colored (`scss/apps/_compendium-browser.scss:40-43`), with `aria-pressed` (`templates/apps/compendium-browser.hbs:5`) | A Wound Rank row marked current by a red background only (modeled)                             |

## Core palette

Core defines its palette per theme in `resources/app/public/css/foundry2.css`. The system reads these steps through its
role tokens and does not redefine them. The light theme changes core's roles, not its palette.

| Core variable           | Value                   | Reached through                                                                 |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `--color-light-1`       | `#f7f3e8`               | `--l5r4-color-text-on-header`, `--l5r4-color-action-text`                       |
| `--color-light-2`       | `#efe6d8`               | `--l5r4-color-text` (dark)                                                      |
| `--color-light-5`       | `#9f8475`               | `--l5r4-color-text-muted` (dark)                                                |
| `--color-light-6`       | `#816b66`               | `--l5r4-color-line-muted` (dark)                                                |
| `--color-dark-1`        | `#111111`               | `--l5r4-color-line` (light)                                                     |
| `--color-dark-2`        | `#222222`               | `--l5r4-color-text` (light)                                                     |
| `--color-dark-3`        | `#333333`               | `--l5r4-color-header` (light)                                                   |
| `--color-dark-4`        | `#444444`               | `--l5r4-color-line-muted` (light)                                               |
| `--color-dark-5`        | `#555555`               | `--l5r4-color-text-muted` (light)                                               |
| `--color-dark-6`        | `#666666`               | `--l5r4-color-void-point` (light)                                               |
| `--color-cool-4`        | `#302831`               | `--l5r4-color-panel` (dark), `--l5r4-color-line` (dark), `--l5r4-color-divider` |
| `--color-cool-5-90`     | `rgba(11, 10, 19, 0.9)` | `--l5r4-color-ring-rank-face` (dark), `--l5r4-color-ring-rank-backdrop` (dark)  |
| `--color-warm-1`        | `#ee9b3a`               | `--l5r4-color-accent` (dark)                                                    |
| `--color-warm-2`        | `#c9593f`               | `--l5r4-state-focus-color` (`foundations/states.md`), as core's focus ring      |
| `--color-level-success` | `#26b231`               | `--l5r4-color-success`                                                          |
| `--color-level-info`    | `#59a1f6`               | `--l5r4-color-info`                                                             |
| `--color-level-warning` | `#ee9b3a`               | `--l5r4-color-warning` (dark)                                                   |

Core's `--color-warm-2` and `--color-level-error` fall below the action and danger minimums on the system's surfaces,
so those two roles take palette primitives (**Contrast fixes**).

## Palette primitives

Values core lacks. Declared on `:root`, read only by role and domain tokens.

| Token                      | Value     | L*   | Role or domain token                                                      |
| -------------------------- | --------- | ---- | ------------------------------------------------------------------------- |
| `--l5r4-palette-slate-500` | `#64798d` | 49.9 | `--l5r4-color-ring-air`                                                   |
| `--l5r4-palette-blue-600`  | `#405984` | 37.7 | `--l5r4-color-ring-water`                                                 |
| `--l5r4-palette-brown-700` | `#594839` | 31.9 | `--l5r4-color-ring-earth`                                                 |
| `--l5r4-palette-rust-600`  | `#ab4913` | 43.5 | `--l5r4-color-ring-fire`                                                  |
| `--l5r4-palette-mauve-500` | `#7d6862` | 45.8 | `--l5r4-color-ring-void`                                                  |
| `--l5r4-palette-brick-500` | `#ba4d34` | 47.0 | `--l5r4-color-action`                                                     |
| `--l5r4-palette-red-600`   | `#ba0104` | 38.7 | `--l5r4-color-danger` (light)                                             |
| `--l5r4-palette-red-400`   | `#fc452b` | 57.2 | `--l5r4-color-danger` (dark)                                              |
| `--l5r4-palette-amber-500` | `#ab6600` | 49.7 | `--l5r4-color-accent` (light), `--l5r4-color-warning` (light)             |
| `--l5r4-palette-gray-500`  | `#717171` | 47.6 | `--l5r4-color-void-point` (dark), `--l5r4-color-void-point-hover` (light) |
| `--l5r4-palette-gray-400`  | `#888888` | 56.7 | `--l5r4-color-void-point-hover` (dark)                                    |
| `--l5r4-palette-black`     | `#000000` | 0    | `--l5r4-color-shadow`, `--l5r4-color-shadow-strong`, `--l5r4-color-scrim` |
| `--l5r4-palette-white`     | `#ffffff` | 100  | `--l5r4-color-ring-text`                                                  |

Canvas text cannot read CSS, so the floating numbers' colors live in `COLORS` in
`module/services/scrolling-text.js:19-22` as numbers. They carry palette names for this page and the contrast check:

| Name         | Value      | L*   | Domain token                     |
| ------------ | ---------- | ---- | -------------------------------- |
| `red-400`    | `0xff6b5a` | 63.8 | `--l5r4-color-float-wounds-up`   |
| `green-200`  | `0x7bd88f` | 79.2 | `--l5r4-color-float-wounds-down` |
| `blue-200`   | `0x9ecbff` | 80.3 | `--l5r4-color-float-void-up`     |
| `violet-200` | `0xc9b8ff` | 78.4 | `--l5r4-color-float-void-down`   |

## Role tokens

"Reserved" tokens are defined here and declared in `_variables.scss` when a component first reads one, so C2 holds.

| Token                         | Built on                                                                         | Light                          | Dark                                         | Read by                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `--l5r4-color-surface`        | `--background` (core paints it; never declared)                                  | parchment, reference `#d5d3c6` | `rgba(11, 10, 19, 0.9)`, reference `#23222b` | Contrast check only                                                             |
| `--l5r4-color-panel`          | `--table-header-bg-color`                                                        | `rgba(0, 0, 0, 0.1)`           | `#302831`                                    | Grid labels, item list header, Wound track labels, expanded NPC text, bio rows  |
| `--l5r4-color-row-alt`        | `--table-row-color-even`                                                         | `rgba(0, 0, 0, 0.1)`           | `rgba(255, 255, 255, 0.1)`                   | Even rows of item lists and the emphasis list                                   |
| `--l5r4-color-line`           | `--table-header-border-color`                                                    | `#111111`                      | `#302831`                                    | Grids, item list header, Wound track, emphasis list, Ring rank disc border      |
| `--l5r4-color-line-muted`     | `--content-link-border-color`                                                    | `#444444`                      | `#816b66`                                    | Text link chips, item summary divider, rule cards                               |
| `--l5r4-color-divider`        | `--color-border`                                                                 | `#302831`                      | `#302831`                                    | XP manager headings and lists                                                   |
| `--l5r4-color-text`           | `--color-text-primary`                                                           | `#222222`                      | `#efe6d8`                                    | Body text, Ring rank numbers, the clan, school, and Insight fields              |
| `--l5r4-color-text-muted`     | `--color-text-subtle`                                                            | `#555555`                      | `#9f8475`                                    | Reserved                                                                        |
| `--l5r4-color-header`         | `--color-header-background`                                                      | `#333333`                      | `rgba(0, 0, 0, 0.5)`                         | Section titles, rank block and mask-button frames                               |
| `--l5r4-color-text-on-header` | `--color-light-1`                                                                | `#f7f3e8`                      | `#f7f3e8`                                    | Section title text, rank block names                                            |
| `--l5r4-color-action`         | `--l5r4-palette-brick-500`, the hue core gives `--button-hover-background-color` | `#ba4d34`                      | `#ba4d34`                                    | Mask-sprite roll buttons in item rows (Skills, spells, weapons) and NPC attacks |
| `--l5r4-color-action-text`    | `--color-light-1`, the value core gives `--button-hover-text-color`              | `#f7f3e8`                      | `#f7f3e8`                                    | Mask-sprite roll button labels                                                  |
| `--l5r4-color-accent`         | `--l5r4-palette-amber-500` (light), `--color-text-accent` (dark)                 | `#ab6600`                      | `#ee9b3a`                                    | The active activate control, the selected outline (`foundations/states.md`)     |
| `--l5r4-color-danger`         | `--l5r4-palette-red-600` (light), `--l5r4-palette-red-400` (dark)                | `#ba0104`                      | `#fc452b`                                    | Rule editor errors, the invalid state (`foundations/states.md`)                 |
| `--l5r4-color-success`        | `--color-level-success`                                                          | `#26b231`                      | `#26b231`                                    | Reserved                                                                        |
| `--l5r4-color-info`           | `--color-level-info`                                                             | `#59a1f6`                      | `#59a1f6`                                    | Reserved                                                                        |
| `--l5r4-color-warning`        | `--l5r4-palette-amber-500` (light), `--color-level-warning` (dark)               | `#ab6600`                      | `#ee9b3a`                                    | The warning state's icon (`foundations/states.md`)                              |
| `--l5r4-color-shadow`         | `--l5r4-palette-black` at 50%                                                    | `rgba(0, 0, 0, 0.5)`           | `rgba(0, 0, 0, 0.5)`                         | Ring rank disc shadow, Ring medallion drop shadow                               |
| `--l5r4-color-shadow-strong`  | `--l5r4-palette-black`                                                           | `#000000`                      | `#000000`                                    | Text shadow on the spell slot count                                             |
| `--l5r4-color-scrim`          | `--l5r4-palette-black` at 40%                                                    | `rgba(0, 0, 0, 0.4)`           | `rgba(0, 0, 0, 0.4)`                         | Overlay on the spell slot icon                                                  |

## Domain roles

Game terms as the glossary spells them (`docs/code-system/glossary.md`, with the book pages).

| Term                        | Token                                           | Built on                                                            | Light                              | Dark                    | Read by                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Air                         | `--l5r4-color-ring-air`                         | `--l5r4-palette-slate-500`                                          | `#64798d`                          | `#64798d`               | Trait roll background, Trait rank border, Trait column bar, Ring rank disc inner ring                                                                                                                              |
| Water                       | `--l5r4-color-ring-water`                       | `--l5r4-palette-blue-600`                                           | `#405984`                          | `#405984`               | As Air                                                                                                                                                                                                             |
| Earth                       | `--l5r4-color-ring-earth`                       | `--l5r4-palette-brown-700`                                          | `#594839`                          | `#594839`               | As Air                                                                                                                                                                                                             |
| Fire                        | `--l5r4-color-ring-fire`                        | `--l5r4-palette-rust-600`                                           | `#ab4913`                          | `#ab4913`               | As Air                                                                                                                                                                                                             |
| Void                        | `--l5r4-color-ring-void`                        | `--l5r4-palette-mauve-500`                                          | `#7d6862`                          | `#7d6862`               | Ring rank disc inner ring                                                                                                                                                                                          |
| Ring fill                   | `--l5r4-color-ring-{air,water,earth,fire}-fill` | The Ring's token at 90%; the Void Ring has no Traits, so no fill    |                                    |                         | Trait rank background                                                                                                                                                                                              |
| Ring tint                   | `--l5r4-color-ring-{ring}-tint`                 | The Ring's token at 10%, all five Rings                             |                                    |                         | Ring rank disc                                                                                                                                                                                                     |
| Ring text                   | `--l5r4-color-ring-text`                        | `--l5r4-palette-white`                                              | `#ffffff`                          | `#ffffff`               | Trait roll label, Trait rank number                                                                                                                                                                                |
| Ring rank face              | `--l5r4-color-ring-rank-face`                   | `--content-link-background`                                         | `#dddddd`                          | `rgba(11, 10, 19, 0.9)` | Ring rank disc                                                                                                                                                                                                     |
| Ring rank backdrop          | `--l5r4-color-ring-rank-backdrop`               |                                                                     | `transparent`                      | `--color-cool-5-90`     | Ring rank disc halo                                                                                                                                                                                                |
| Ring rank backdrop image    | `--l5r4-image-ring-rank-backdrop`               |                                                                     | `url("../../../ui/parchment.jpg")` | `none`                  | Ring rank disc halo                                                                                                                                                                                                |
| Void Points                 | `--l5r4-color-void-point`                       | `--color-dark-6` (light), `--l5r4-palette-gray-500` (dark)          | `#666666`                          | `#717171`               | Void Point dot border, filled dot                                                                                                                                                                                  |
| Void Points                 | `--l5r4-color-void-point-hover`                 | `--l5r4-palette-gray-500` (light), `--l5r4-palette-gray-400` (dark) | `#717171`                          | `#888888`               | Hovered dot                                                                                                                                                                                                        |
| Wounds                      | `--l5r4-color-float-wounds-up`, `-down`         | `red-400`, `green-200`                                              |                                    |                         | Floating Wound numbers (canvas)                                                                                                                                                                                    |
| Void Points                 | `--l5r4-color-float-void-up`, `-down`           | `blue-200`, `violet-200`                                            |                                    |                         | Floating Void Point numbers (canvas)                                                                                                                                                                               |
| Floating stroke             | `--l5r4-color-float-stroke`                     | `--l5r4-palette-black`                                              | `#000000`                          | `#000000`               | Outline of every floating number (canvas)                                                                                                                                                                          |
| Wound Ranks                 | none                                            |                                                                     |                                    |                         | The Wound track reads `panel`, `line`, `text`                                                                                                                                                                      |
| Honor, Glory, Status, Taint | none                                            |                                                                     |                                    |                         | Rank blocks read `header` and `text-on-header` (`scss/components/_animations.scss:74-79`); that rule is more specific than the table colors in `scss/features/_ranks.scss:17-19`, which never show and are removed |
| Stances, conditions         | none                                            |                                                                     |                                    |                         | Core's status icons on tokens; icon and name rows in the effect panel                                                                                                                                              |

A term with no token has no hue of its own. Giving one a hue adds a domain token here and its pairings to **Contrast**.

The Trait roll's own background, `#000` (`scss/features/_traits-rings.scss:220`), is overridden by a Ring for all eight
Traits, so it maps to no token and is removed.

## Renamed tokens

Token names are not stored in world data (Stage 17 decision 2). A module or world stylesheet could read the old names,
so each rename goes in `CHANGELOG.MD`.

| Old                               | New                               | Change in value                                                                                                                                                                      |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--air-ring-color`                | `--l5r4-color-ring-air`           | The RGB triplet `136, 158, 179` becomes a whole color, darkened to `#64798d` by **Contrast fixes**; a stylesheet that wrapped the old name in `rgb()` reads the new token as a color |
| `--water-ring-color`              | `--l5r4-color-ring-water`         | The RGB triplet becomes a whole color of the same value; a stylesheet that wrapped the old name in `rgb()` reads the new token as a color                                            |
| `--earth-ring-color`              | `--l5r4-color-ring-earth`         | As Water                                                                                                                                                                             |
| `--fire-ring-color`               | `--l5r4-color-ring-fire`          | As Water                                                                                                                                                                             |
| `--void-ring-color`               | `--l5r4-color-ring-void`          | As Water                                                                                                                                                                             |
| `--l5r4-ring-rank-backdrop-color` | `--l5r4-color-ring-rank-backdrop` | None                                                                                                                                                                                 |
| `--l5r4-ring-rank-backdrop-image` | `--l5r4-image-ring-rank-backdrop` | None                                                                                                                                                                                 |

## Core variables that resolve to nothing in system windows

Core declares its older variables only on `body.game .app` (`foundry2.css:61-138`). Only ApplicationV1 windows carry
`.app` (`resources/app/templates/app-window.html:1`); ApplicationV2 windows carry `.application`
(`client/applications/api/application.mjs:459`). Inside the system's windows these variables are undefined, so each
declaration below falls back to its inherited or initial value. The system reads six of them. The pass maps each color
to a role token, so its color renders (Stage 17 decision 16); the one size goes with the rule that reads it.

| Variable                        | Read at                                                                             | Replaced by                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--color-text-dark-primary`     | `scss/components/_form-field.scss:19`                                               | `--l5r4-color-text`                                                                                      |
| `--color-text-hyperlink`        | `scss/components/_inline-control.scss:7`                                            | `--l5r4-color-accent`                                                                                    |
| `--color-border-highlight`      | `scss/apps/_compendium-browser.scss:42`                                             | `--l5r4-color-accent`, through `--l5r4-state-selected-outline`                                           |
| `--color-border-light-tertiary` | `scss/components/_inline-link.scss:8`, `scss/components/_item-summary-card.scss:18` | `--l5r4-color-line-muted`                                                                                |
| `--color-border-dark-tertiary`  | `scss/components/_rules-editor.scss:29`, `scss/layout/_item-layout.scss:61`         | `--l5r4-color-line-muted`                                                                                |
| `--form-field-height`           | `scss/components/_form-field.scss:46`                                               | None: a size; the `.clear-btn` rule matches no template and is removed (`foundations/space-and-size.md`) |

## Contrast

`tests/conventions/contrast.test.js` reads the two tables below. It resolves each token to its reference value for the
theme, composites any value with alpha over the token in the **Over** column (recursively), and computes the WCAG 2
contrast ratio.

Reference values. The light surface is the darkest 5% of core's `public/ui/parchment.jpg` by luminance (its average is
`#dad8cd`). The dark surface is core's `--background` over white, the lightest canvas a translucent window can show.

| Token                             | Light                      | Dark                       | Over                              |
| --------------------------------- | -------------------------- | -------------------------- | --------------------------------- |
| `--l5r4-color-surface`            | `#d5d3c6`                  | `#23222b`                  |                                   |
| `--l5r4-color-panel`              | `rgba(0, 0, 0, 0.1)`       | `#302831`                  | `--l5r4-color-surface`            |
| `--l5r4-color-row-alt`            | `rgba(0, 0, 0, 0.1)`       | `rgba(255, 255, 255, 0.1)` | `--l5r4-color-surface`            |
| `--l5r4-color-text`               | `#222222`                  | `#efe6d8`                  |                                   |
| `--l5r4-color-text-muted`         | `#555555`                  | `#9f8475`                  |                                   |
| `--l5r4-color-header`             | `#333333`                  | `rgba(0, 0, 0, 0.5)`       | `--l5r4-color-surface`            |
| `--l5r4-color-text-on-header`     | `#f7f3e8`                  | `#f7f3e8`                  |                                   |
| `--l5r4-color-action`             | `#ba4d34`                  | `#ba4d34`                  |                                   |
| `--l5r4-color-action-text`        | `#f7f3e8`                  | `#f7f3e8`                  |                                   |
| `--l5r4-color-accent`             | `#ab6600`                  | `#ee9b3a`                  |                                   |
| `--l5r4-color-danger`             | `#ba0104`                  | `#fc452b`                  |                                   |
| `--l5r4-color-warning`            | `#ab6600`                  | `#ee9b3a`                  |                                   |
| `--l5r4-color-ring-air`           | `#64798d`                  | `#64798d`                  |                                   |
| `--l5r4-color-ring-water`         | `#405984`                  | `#405984`                  |                                   |
| `--l5r4-color-ring-earth`         | `#594839`                  | `#594839`                  |                                   |
| `--l5r4-color-ring-fire`          | `#ab4913`                  | `#ab4913`                  |                                   |
| `--l5r4-color-ring-void`          | `#7d6862`                  | `#7d6862`                  |                                   |
| `--l5r4-color-ring-air-fill`      | `rgba(100, 121, 141, 0.9)` | `rgba(100, 121, 141, 0.9)` | `--l5r4-color-surface`            |
| `--l5r4-color-ring-water-fill`    | `rgba(64, 89, 132, 0.9)`   | `rgba(64, 89, 132, 0.9)`   | `--l5r4-color-surface`            |
| `--l5r4-color-ring-earth-fill`    | `rgba(89, 72, 57, 0.9)`    | `rgba(89, 72, 57, 0.9)`    | `--l5r4-color-surface`            |
| `--l5r4-color-ring-fire-fill`     | `rgba(171, 73, 19, 0.9)`   | `rgba(171, 73, 19, 0.9)`   | `--l5r4-color-surface`            |
| `--l5r4-color-ring-air-tint`      | `rgba(100, 121, 141, 0.1)` | `rgba(100, 121, 141, 0.1)` | `--l5r4-color-ring-rank-face`     |
| `--l5r4-color-ring-water-tint`    | `rgba(64, 89, 132, 0.1)`   | `rgba(64, 89, 132, 0.1)`   | `--l5r4-color-ring-rank-face`     |
| `--l5r4-color-ring-earth-tint`    | `rgba(89, 72, 57, 0.1)`    | `rgba(89, 72, 57, 0.1)`    | `--l5r4-color-ring-rank-face`     |
| `--l5r4-color-ring-fire-tint`     | `rgba(171, 73, 19, 0.1)`   | `rgba(171, 73, 19, 0.1)`   | `--l5r4-color-ring-rank-face`     |
| `--l5r4-color-ring-void-tint`     | `rgba(125, 104, 98, 0.1)`  | `rgba(125, 104, 98, 0.1)`  | `--l5r4-color-ring-rank-face`     |
| `--l5r4-color-ring-rank-face`     | `#dddddd`                  | `rgba(11, 10, 19, 0.9)`    | `--l5r4-color-ring-rank-backdrop` |
| `--l5r4-color-ring-rank-backdrop` | `rgba(0, 0, 0, 0)`         | `rgba(11, 10, 19, 0.9)`    | `--l5r4-color-surface`            |
| `--l5r4-color-ring-text`          | `#ffffff`                  | `#ffffff`                  |                                   |
| `--l5r4-color-void-point`         | `#666666`                  | `#717171`                  |                                   |
| `--l5r4-color-void-point-hover`   | `#717171`                  | `#888888`                  |                                   |
| `--l5r4-color-float-wounds-up`    | `#ff6b5a`                  | `#ff6b5a`                  |                                   |
| `--l5r4-color-float-wounds-down`  | `#7bd88f`                  | `#7bd88f`                  |                                   |
| `--l5r4-color-float-void-up`      | `#9ecbff`                  | `#9ecbff`                  |                                   |
| `--l5r4-color-float-void-down`    | `#c9b8ff`                  | `#c9b8ff`                  |                                   |
| `--l5r4-color-float-stroke`       | `#000000`                  | `#000000`                  |                                   |

Pairings. Minimum 4.5 is body text; 3 is large text (the Ring and Trait rank numbers, floating numbers) or a control or
state indicator (accent, the warning icon, Void Point dots).

| Text token                       | Surface token                  | Theme | Minimum |
| -------------------------------- | ------------------------------ | ----- | ------- |
| `--l5r4-color-text`              | `--l5r4-color-surface`         | light | 4.5     |
| `--l5r4-color-text`              | `--l5r4-color-surface`         | dark  | 4.5     |
| `--l5r4-color-text`              | `--l5r4-color-panel`           | light | 4.5     |
| `--l5r4-color-text`              | `--l5r4-color-panel`           | dark  | 4.5     |
| `--l5r4-color-text`              | `--l5r4-color-row-alt`         | light | 4.5     |
| `--l5r4-color-text`              | `--l5r4-color-row-alt`         | dark  | 4.5     |
| `--l5r4-color-text-muted`        | `--l5r4-color-surface`         | light | 4.5     |
| `--l5r4-color-text-muted`        | `--l5r4-color-surface`         | dark  | 4.5     |
| `--l5r4-color-text-on-header`    | `--l5r4-color-header`          | light | 4.5     |
| `--l5r4-color-text-on-header`    | `--l5r4-color-header`          | dark  | 4.5     |
| `--l5r4-color-action-text`       | `--l5r4-color-action`          | light | 4.5     |
| `--l5r4-color-action-text`       | `--l5r4-color-action`          | dark  | 4.5     |
| `--l5r4-color-danger`            | `--l5r4-color-surface`         | light | 4.5     |
| `--l5r4-color-danger`            | `--l5r4-color-surface`         | dark  | 4.5     |
| `--l5r4-color-accent`            | `--l5r4-color-surface`         | light | 3       |
| `--l5r4-color-accent`            | `--l5r4-color-surface`         | dark  | 3       |
| `--l5r4-color-warning`           | `--l5r4-color-surface`         | light | 3       |
| `--l5r4-color-warning`           | `--l5r4-color-surface`         | dark  | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-air`        | light | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-air`        | dark  | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-water`      | light | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-water`      | dark  | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-earth`      | light | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-earth`      | dark  | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-fire`       | light | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-fire`       | dark  | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-void`       | light | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-void`       | dark  | 4.5     |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-air-fill`   | light | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-air-fill`   | dark  | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-water-fill` | light | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-water-fill` | dark  | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-earth-fill` | light | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-earth-fill` | dark  | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-fire-fill`  | light | 3       |
| `--l5r4-color-ring-text`         | `--l5r4-color-ring-fire-fill`  | dark  | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-air-tint`   | light | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-air-tint`   | dark  | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-water-tint` | light | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-water-tint` | dark  | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-earth-tint` | light | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-earth-tint` | dark  | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-fire-tint`  | light | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-fire-tint`  | dark  | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-void-tint`  | light | 3       |
| `--l5r4-color-text`              | `--l5r4-color-ring-void-tint`  | dark  | 3       |
| `--l5r4-color-void-point`        | `--l5r4-color-surface`         | light | 3       |
| `--l5r4-color-void-point`        | `--l5r4-color-surface`         | dark  | 3       |
| `--l5r4-color-void-point-hover`  | `--l5r4-color-surface`         | light | 3       |
| `--l5r4-color-void-point-hover`  | `--l5r4-color-surface`         | dark  | 3       |
| `--l5r4-color-float-wounds-up`   | `--l5r4-color-float-stroke`    | light | 3       |
| `--l5r4-color-float-wounds-up`   | `--l5r4-color-float-stroke`    | dark  | 3       |
| `--l5r4-color-float-wounds-down` | `--l5r4-color-float-stroke`    | light | 3       |
| `--l5r4-color-float-wounds-down` | `--l5r4-color-float-stroke`    | dark  | 3       |
| `--l5r4-color-float-void-up`     | `--l5r4-color-float-stroke`    | light | 3       |
| `--l5r4-color-float-void-up`     | `--l5r4-color-float-stroke`    | dark  | 3       |
| `--l5r4-color-float-void-down`   | `--l5r4-color-float-stroke`    | light | 3       |
| `--l5r4-color-float-void-down`   | `--l5r4-color-float-stroke`    | dark  | 3       |

Ratios for the values above, computed with the same model:

| Pairing                               | Light | Dark  |
| ------------------------------------- | ----- | ----- |
| `text` on `surface`                   | 10.58 | 12.72 |
| `text` on `panel`                     | 8.51  | 11.52 |
| `text` on `row-alt`                   | 8.51  | 9.35  |
| `text-muted` on `surface`             | 4.96  | 4.52  |
| `text-on-header` on `header`          | 11.40 | 16.97 |
| `action-text` on `action`             | 4.51  | 4.51  |
| `danger` on `surface`                 | 4.51  | 4.51  |
| `accent` on `surface`                 | 3.01  | 7.03  |
| `warning` on `surface`                | 3.01  | 7.03  |
| `ring-text` on `ring-air`             | 4.51  | 4.51  |
| `ring-text` on `ring-water`           | 7.05  | 7.05  |
| `ring-text` on `ring-earth`           | 8.71  | 8.71  |
| `ring-text` on `ring-fire`            | 5.68  | 5.68  |
| `ring-text` on `ring-void`            | 5.21  | 5.21  |
| `ring-text` on `ring-air-fill`        | 3.97  | 5.08  |
| `ring-text` on `ring-water-fill`      | 5.88  | 7.67  |
| `ring-text` on `ring-earth-fill`      | 7.05  | 9.29  |
| `ring-text` on `ring-fire-fill`       | 4.99  | 6.35  |
| `text` on `ring-air-tint`             | 10.60 | 14.64 |
| `text` on `ring-water-tint`           | 10.27 | 15.03 |
| `text` on `ring-earth-tint`           | 10.15 | 15.21 |
| `text` on `ring-fire-tint`            | 10.31 | 14.97 |
| `text` on `ring-void-tint`            | 10.49 | 14.78 |
| `void-point` on `surface`             | 3.82  | 3.22  |
| `void-point-hover` on `surface`       | 3.25  | 4.44  |
| `float-wounds-up` on `float-stroke`   | 7.50  | 7.50  |
| `float-wounds-down` on `float-stroke` | 12.06 | 12.06 |
| `float-void-up` on `float-stroke`     | 12.44 | 12.44 |
| `float-void-down` on `float-stroke`   | 11.78 | 11.78 |

## Contrast fixes

Seven pairings fall below their minimum with today's values, in eight rows below. The pass sets each to the target below (Stage 17
decision 16). A target keeps its color's hue and moves only its CIELAB L\*, as far as the minimum needs and no
further, so it stays as close as it can to the color it replaces; chroma drops only where sRGB cannot hold it at the
new lightness. The role, domain, and reference tables above already carry the targets. Danger fails in both themes,
so it takes two rows.

| Pairing                         | Theme | Token changed                   | Today     | Ratio today | Target    | Ratio | Minimum |
| ------------------------------- | ----- | ------------------------------- | --------- | ----------- | --------- | ----- | ------- |
| `action-text` on `action`       | both  | `--l5r4-color-action`           | `#c9593f` | 3.80        | `#ba4d34` | 4.51  | 4.5     |
| `danger` on `surface`           | light | `--l5r4-color-danger`           | `#ce0707` | 3.82        | `#ba0104` | 4.51  | 4.5     |
| `danger` on `surface`           | dark  | `--l5r4-color-danger`           | `#ce0707` | 2.74        | `#fc452b` | 4.51  | 4.5     |
| `accent` on `surface`           | light | `--l5r4-color-accent`           | `#ee9b3a` | 1.49        | `#ab6600` | 3.01  | 3       |
| `ring-text` on `ring-air`       | both  | `--l5r4-color-ring-air`         | `#889eb3` | 2.77        | `#64798d` | 4.51  | 4.5     |
| `ring-text` on `ring-air-fill`  | light | `--l5r4-color-ring-air`, at 90% | `#889eb3` | 2.59        | `#64798d` | 3.97  | 3       |
| `void-point` on `surface`       | dark  | `--l5r4-color-void-point`       | `#666666` | 2.74        | `#717171` | 3.22  | 3       |
| `void-point-hover` on `surface` | light | `--l5r4-color-void-point-hover` | `#888888` | 2.36        | `#717171` | 3.25  | 3       |

The Air fill pairing follows from the Air target, so one value fixes two rows. The Void Point dot in dark and its
hover in light share `--l5r4-palette-gray-500`: the nearest values each could take (`#6d6d6d`, `#767676`) fall on
the same palette step, and one primitive serves both. `--l5r4-color-warning` is new in the pairings: its light value
takes the accent's target, since core builds both on `#ee9b3a`.
