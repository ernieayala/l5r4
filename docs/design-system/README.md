# Design system

The rules for everything a player or GM sees in `l5r4-enhanced`: sheets, chat cards, dialogs, panels, and their copy. Each page states a rule, shows one conforming and one non-conforming example, names the tokens and partials involved, and names the check that enforces it. "Review" means no check can, and a reviewer or the gallery decides.

The code system (`docs/code-system/`) holds the rules for what a developer writes: names, modules, tests. Where a rule touches both, the detail lives in one place and the other page links to it.

## Principles

| # | Principle | Rule | Enforced by |
| --- | --- | --- | --- |
| 1 | The L5R look the system has, built on core's themes | Core paints the window: parchment in light, translucent dark in dark. The system adds the Ring hues, the Ring medallions, the brush frame, and the mask-sprite buttons on top. The pre-stage captures are the visual reference; a change may make the look consistent, never different in direction | Review against the captures (Stage 17 wave 8) |
| 2 | Readable first | Every text and control meets its contrast minimum in both themes; text is never smaller than the `meta` step (12 px) | `tests/conventions/contrast.test.js`; Stylelint font-size allow list |
| 3 | The book's terms are the UI's terms | A game term reads as the glossary spells it, capitals included, in labels, buttons, and notifications | `tests/conventions/glossary.test.js`, `tests/lang.test.js` |
| 4 | Every state visible without color alone | A state that matters (active, selected, filled, undone, broken) changes shape, icon, weight, or text as well as color | Review, in the gallery's state sections |
| 5 | Works in light and dark | Every color comes from a token defined for `.theme-light` and `.theme-dark`; the gallery and its batch run in both | `tests/conventions/styles.test.js`, `tests/conventions/contrast.test.js`, `tests/quench/design-gallery.js` |

Examples, one pair per principle:

| # | Conforming | Non-conforming |
| --- | --- | --- |
| 1 | Section titles take core's header background through `--l5r4-color-header`, so they follow the theme and the core look (`.l5r4-section-title` (`scss/components/_section.scss`)) | A section painted with a gradient no capture shows (modeled) |
| 2 | Section title text `--color-light-1` on the header background: 11.40:1 light, 16.97:1 dark | White Trait label on a pale Air hue: 2.77:1 (modeled) |
| 3 | "Void Points" (`l5r4.ui.mechanics.rings.voidPoints` (`lang/en.json`)) | "{name} spent Void Point for initiative (+10)", where the glossary writes "Initiative" (`l5r4.ui.combat.initiativeVoidSpent` (`lang/en.json`)) |
| 4 | The activate control swaps `fa-circle-play` for `fa-circle-stop` and its tooltip when active (`data-action="toggle-activation"` (`templates/cards/_partials/_activate.hbs`)) | A Wound Rank row marked current by a red background only (modeled) |
| 5 | The Ring rank backdrop is set per theme (`--l5r4-color-ring-rank-backdrop` (`scss/base/_variables.scss`)) | Void Point dots in one gray for both themes, at 2.74:1 on the dark window (modeled) |

## How the tiers fit

The design system has four tiers. Each tier uses only the tiers above it.

| Tier | Holds | Lives in | Pages |
| --- | --- | --- | --- |
| Foundations | Tokens and the rules for using them: color, type, space and size, frames, icons, motion, layers, states | `scss/base/_variables.scss` | `foundations/*.md` |
| Components | One reusable piece: a partial, its SCSS file, and the tokens it reads | `templates/**/_partials/`, `scss/components/` | `components/<name>.md` |
| Patterns | Components composed into a sheet, a chat card, a dialog, a panel | `templates/actor/`, `templates/chat/`, `templates/apps/`, `templates/dialogs/` | `patterns/*.md` |
| Content | The words: letter case, game terms, button labels, notifications, keys | `lang/en.json` | `content/*.md` |

Tokens have their own tiers, and a component reads only the last two:

| Token tier | Example | Named | Declared in | Read by |
| --- | --- | --- | --- | --- |
| Core variables | `--color-text-primary`, `--color-cool-4`, `--font-size-12` | By core | `resources/app/public/css/foundry2.css` | System tokens only, except core layout values (`--input-height`) |
| Palette primitives | `--l5r4-palette-rust-600` | Hue and step, never role | `scss/base/_variables.scss` | Role and domain tokens only |
| Role tokens | `--l5r4-color-text`, `--l5r4-space-8`, `--l5r4-font-size-meta` | Job | `scss/base/_variables.scss` | Components |
| Domain roles | `--l5r4-color-ring-fire` | Game term | `scss/base/_variables.scss` | Components |

Every token is named `--l5r4-{category}-{name}` (Stage 17 decision 15). Each category belongs to one page:

| Category | Page |
| --- | --- |
| `palette`, `color`, `image` | `foundations/color.md` |
| `font`, `font-size` | `foundations/typography.md` |
| `space`, `size` | `foundations/space-and-size.md`; icon sizes in `foundations/iconography.md` |
| `border-width`, `radius`, `shadow` | `foundations/frames.md` |
| `duration`, `easing` | `foundations/motion.md` |
| `layer` | `foundations/layers.md` |
| `state` | `foundations/states.md` |

Token names are not stored in world data, so they may change; a renamed token a module or world CSS could read is listed in `CHANGELOG.MD`.

## Pages

| Page | Covers |
| --- | --- |
| `foundations/color.md` | Palette, role and domain colors per theme, contrast pairings |
| `foundations/typography.md` | Faces, type scale, numbers, truncation, wrapping |
| `foundations/space-and-size.md` | Space scale, semantic spacing, density, size scale, minimum target |
| `foundations/frames.md` | Borders, dividers, shadows, the parchment backdrop, elevation |
| `foundations/iconography.md` | Icon sets, icon sizes, icon-only versus labelled controls |
| `foundations/motion.md` | Durations, easing, what animates, reduced motion |
| `foundations/layers.md` | Stacking order against core's layers |
| `foundations/states.md` | One look per state across components |
| `components/<name>.md` | One page per component |
| `patterns/sheets.md`, `chat-cards.md`, `dialogs.md`, `panels-and-browsers.md`, `feedback.md` | Compositions |
| `content/voice.md`, `content/localization.md` | Copy and keys |

## Adding a component

| Step | Do | Checked by |
| --- | --- | --- |
| 1 | Search `components/` and `templates/**/_partials/` for a component that already does the job. Extend it with a variant before adding a new one | Review |
| 2 | Write the markup once, as a partial in the nearest `_partials/` folder, `_kebab-case.hbs`, registered in `PRELOAD_TEMPLATES` (`module/config/templates.js`). Behavior hooks are `data-action` and `data-*`; classes carry `l5r4-` and serve CSS only | `tests/conventions/templates.test.js`, `tests/conventions/names.test.js` |
| 3 | Write its styles in one file, `scss/components/_<name>.scss` (a window's in `scss/apps/`), `@use`d from `scss/l5r4-enhanced.scss`. Read role and domain tokens; never a palette primitive, a literal color, or an off-scale space | Stylelint, `tests/conventions/styles.test.js` |
| 4 | Add any new text/surface pairing to the contrast table in `foundations/color.md` | `tests/conventions/contrast.test.js` |
| 5 | Write `components/<name>.md`: purpose, anatomy, variants, every state, partial and parameters, SCSS file, tokens read, keyboard and screen-reader contract, long-text behavior, do and don't | `tests/conventions/design-system.test.js` |
| 6 | Add a gallery entry in every variant and state: fixture data in its section's file in `module/config/design-gallery/`, markup composing the real partial in `templates/apps/design-gallery/` | `tests/conventions/design-system.test.js`, `tests/quench/design-gallery.js` |
| 7 | Run the gate and the gallery batch in both themes | `npm run test`, `npm run lint`, Quench `l5r4-enhanced.design-gallery` |

## Fixed names

Classes and `data-action` names inside chat cards already posted are stored in the message HTML, so they never change (Stage 17 decision 2). A component that appears in a chat card keeps those classes and styles them as they are: `l5r4-roll`, `l5r4-flow-card`, `l5r4-damage-result`, `-undone`, `-gap-sm`, `check-note`, `check-applied`, and the rest listed in `docs/code-system/naming.md`. The checks exempt them by name.
