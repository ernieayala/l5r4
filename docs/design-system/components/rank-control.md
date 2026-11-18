# Rank control

A rank shown as a number and changed in place. Three variants: a Trait rank, the Void Ring rank, and a rank track (Honor, Glory, Status, Shadowlands Taint) that shows rank and points. A change made on the number needs Shift, so a stray click changes nothing; the up and down arrows on a Trait or the Void Ring step without it.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_rank-control.hbs`, for the Trait and Void Ring, nine uses per sheet; `templates/actor/_partials/_rank-track.hbs`, four uses in `_ranks.hbs` |
| Parameters | `_rank-control.hbs`: `variant` (`trait` or `void`), `trait` (key, Trait only), `label` (the Trait's localized name, Trait only), `value`. `_rank-track.hbs`: `track` (`honor`, `glory`, `status`, `shadowTaint`), `label` (i18n key), `rank`, `points` |
| SCSS | `scss/components/_rank-control.scss`: the track and its value button. The `rank-arrows` mixin and the Trait and Void Ring variants sit in `scss/features/_traits-rings.scss`, under `.l5r4-traits-rings`. The 2 by 2 track layout is in `scss/features/_ranks.scss` |
| Block class | `l5r4-rank-control` |
| Handlers | Trait: `PcTraitHandler.updateTraitRank`, `.updateTraitRankUp`, `.updateTraitRankDown` (`module/sheets/handlers/pc-trait-handler.js`). Void Ring, on both sheets: `TraitHandler.updateVoidRing` (`module/sheets/handlers/trait-handler.js`). Track: `PcAdjustmentHandler.updateRankPoints` (`module/sheets/handlers/pc-adjustment-handler.js`) |
| Shows in | Trait rows and the Void Ring (`ring-trait-block.md`); the PC sidebar's rank tracks (`templates/actor/_partials/_ranks.hbs`) |
| Game terms | Trait, Void Ring (`game-rules/25_rings_and_traits.md`, pp.76-78); Honor Rank (`game-rules/43_honor.md, p.90`), Glory Rank (`game-rules/44_glory.md, p.93`), Status Rank (`game-rules/45_status.md, p.95`), Taint Rank (`game-rules/89_shadowlands_taint.md, p.277`) |
| Gallery | Each variant at rest, hovered, focused, at its lowest and highest value |

## Anatomy

Trait and Void Ring:

| Part | Element | Class |
| --- | --- | --- |
| Control | `<div>` | `l5r4-rank-control -trait` or `-void` |
| Up arrow | `<button type="button" data-action="increase-trait" data-tooltip aria-label>` + `fa-chevron-up` | `l5r4-rank-control-arrow -up` |
| Value | `<button type="button" data-action="adjust-trait" data-tooltip>` holding the number | `l5r4-rank-control-value` |
| Down arrow | `<button type="button" data-action="decrease-trait" data-tooltip aria-label>` + `fa-chevron-down` | `l5r4-rank-control-arrow -down` |

The three buttons are siblings because a button cannot hold another. The Void Ring's actions are `adjust-void-ring`, `increase-void-ring`, `decrease-void-ring`.

Rank track:

| Part | Element | Class |
| --- | --- | --- |
| Track | `<div>` | `l5r4-rank-control -track` |
| Under-label | `<div inert>` with the label and `rank.points` | `l5r4-rank-control-under` |
| Face | `<button type="button" data-action="adjust-rank-points" data-key data-tooltip>` | `l5r4-rank-control-value` |
| Label | `<span>`, in the face and the under-label | `l5r4-rank-control-label` |
| Number | `<span>`, in the face and the under-label: `{{rank}}.{{points}}` | `l5r4-rank-control-number` |

## Variants

| Variant | Selects it | Look | Pointer |
| --- | --- | --- | --- |
| Trait | `l5r4-rank-control -trait` | The number on the Ring's fill; arrows above and below, shown on hover or focus inside | Click: Trait Roll. Shift+click: +1. Shift+right-click: -1. Arrows: +1 and -1 |
| Void | `l5r4-rank-control -void` | Inside the Void Ring's rank disc; arrows as the Trait's | Shift+click: +1. Shift+right-click: -1. Arrows: +1 and -1 |
| Track | `l5r4-rank-control -track` | Label over `rank.points` on the header color, the nature sprite on hover | Shift+click: +1 point. Shift+right-click: -1 point. Ctrl adds: a whole rank |

`L5R4PcSheet.CLICK_ACTIONS` and `L5R4PcSheet#_onActionContext` (`module/sheets/pc-sheet.js`) route the pointer gestures.

## States

| State | Look | Markup |
| --- | --- | --- |
| Rest | Number only; arrows at `opacity: 0` |  |
| Hover | Arrows slide out (`--l5r4-duration-fast`); track sprite plays (`--l5r4-duration-sprite`); `--l5r4-state-hover-filter` on the track | `:hover` |
| Focus inside | Arrows show as on hover, so a keyboard user can reach them | `:focus-within` |
| Focus-visible | Core's focus ring on the focused button | `:focus-visible` |
| Active | `--l5r4-state-pressed-filter`, `--l5r4-state-pressed-transform` | `:active` |
| At a limit | Nothing changes and the press does nothing | None |
| Read-only | Core disables the buttons on a sheet the viewer cannot edit; that viewer has no actions bound (`button.md` B8) | Core's `disabled` |

## Tokens

| Token | Use |
| --- | --- |
| `--l5r4-color-ring-<ring>-fill`, `--l5r4-color-ring-<ring>`, `--l5r4-color-ring-text` | Trait value face, border, number |
| `--l5r4-color-header`, `--l5r4-color-text-on-header`, `--l5r4-color-text` | Track face, its text, the under-label |
| `--l5r4-size-trait-rank` | Trait value box |
| `--l5r4-size-stepper` | Arrow height and slide-out offset |
| `--l5r4-size-rank-block` | Track height |
| `--l5r4-size-icon-sm` | Arrow glyph |
| `--l5r4-font-number`, `--l5r4-font-size-rank` | Trait and Void Ring number |
| `--l5r4-font-label`, `--l5r4-font-size-title`, `--l5r4-font-size-label` | Track label and number |
| `--l5r4-border-width-thin` | Arrow and value frames |
| `--l5r4-layer-control` | Arrows over the medallion and the row |
| `--l5r4-space-4` | Gap between track label and number |
| `--l5r4-duration-fast`, `--l5r4-duration-sprite`, `--l5r4-easing-standard` | Arrow slide, track sprite |
| `--l5r4-state-*` | Hover, press, focus |

The nature sprite's path and frame count are SCSS variables in `scss/base/_variables.scss` (`foundations/motion.md`).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Up arrow, value, down arrow for a Trait or the Void Ring; the face for a track |
| Enter or Space on the value | As a click: a Trait Roll on a Trait value; nothing on the Void Ring or a track without Shift |
| Shift+Enter | +1 (a track: +1 point); with Ctrl on a track, a whole rank |
| Shift+F10 or the context menu key, with Shift | -1, through the same context action a right-click runs |
| Enter on an arrow | +1 or -1 without Shift |
| Screen reader | The value button reads its number; its `data-tooltip` shows sighted users the Trait and the gestures: "Stamina: Trait Roll; Shift+click: +1, Shift+right-click: -1". Arrows read their `aria-label`, "Increase Stamina", "Decrease Stamina". A track reads its label and `rank.points` |

Arrow keys do not step the value (Stage 17 decision 10).

## Long text

The number is one or two digits in a fixed box, in tabular figures. A track label is one or two words on one line in its 64 px block; a translation that does not fit wraps to two lines inside the block, which keeps its height.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| Q1 | The value and each arrow are `<button type="button">` siblings; no control nests inside another | `tests/conventions/templates.test.js` |
| Q2 | The arrows show on `:focus-within` as well as `:hover` | `tests/conventions/styles.test.js` (`foundations/states.md` rule 3) |
| Q3 | Every button has a name: the arrows by `aria-label` with a matching `data-tooltip`, the value by its number with a `data-tooltip` that names the Trait and the gestures | `tests/conventions/templates.test.js`; `tests/quench/design-gallery.js` |
| Q4 | The arrows read `fa-chevron-up` and `fa-chevron-down`, the icons for stepping a rank, and nothing else uses them | `tests/conventions/design-system.test.js` |
| Q5 | The control is one partial per variant family, included nine times per sheet and four times in the tracks | `tests/conventions/templates.test.js` (markup used twice) |
| Q6 | `z-index` reads `--l5r4-layer-control`; durations read the motion tokens | `tests/conventions/styles.test.js` |
| Q7 | The arrows keep their size, 16 px tall; the 24 px minimum does not apply to them (Stage 17 decision 16). A new rank control meets it | Review, in the gallery (`foundations/space-and-size.md` S5) |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| Q1 | `<div class="l5r4-rank-control -trait"><button ... -up>...</button><button class="l5r4-rank-control-value" ...>3</button><button ... -down>...</button></div>` (modeled) | `<span class="trait-rank" data-action="trait-rank" role="button">` holding two `<a data-action>` (modeled) |
| Q2 | `&:hover, &:focus-within { .l5r4-rank-control-arrow { opacity: 1; } }` (modeled) | `@mixin rank-arrows { &:hover { ... } }` alone (modeled) |
| Q3 | `data-tooltip` and `aria-label` both `{{localize "l5r4.ui.hints.increaseTrait" trait=label}}` on the up arrow (`templates/actor/_partials/_rank-control.hbs`) | `<a class="trait-increase" data-action="trait-increase" data-trait="sta">` with no name (modeled) |
| Q4 | `fa-chevron-up` on the Trait arrows (`templates/actor/_partials/_rank-control.hbs`) | `fa-chevron-down` on the expand control (modeled) |
| Q5 | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_rank-track.hbs" track="honor" label="l5r4.character.ranks.honorRank" rank=system.honor.rank points=system.honor.points}}` (modeled) | The track's label and number written twice in each of four blocks (modeled) |
| Q6 | `z-index: var(--l5r4-layer-control);` (`foundations/layers.md`) | `z-index: 11;` (modeled) |
| Q7 | The arrows at `--l5r4-size-stepper`, 16 px: `@mixin rank-arrows` (`scss/features/_traits-rings.scss`) | Arrows grown to 24 px, which changes how the Trait row looks (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Keep Shift on every value change made with the value button | Let a plain click change a rank |
| Keep the arrows as the no-Shift way to step | Add a third way (scroll wheel, drag) without its own change and tests |
| Show the gestures in the value's `data-tooltip` | Put "Click to" in a tooltip (`content/voice.md` **Tooltips**) |

## Names

The actions are verb first (`docs/code-system/naming.md`): `adjust-trait`, `increase-trait`, `decrease-trait`, `adjust-void-ring`, `increase-void-ring`, `decrease-void-ring`, and `adjust-rank-points`. `data-key="shadowTaint"` names the stored field `system.shadowTaint` (decision 2). The Taint track's label is `l5r4.character.ranks.taintRank`: `docs/code-system/glossary.md` bans `shadowRank`.

## Keys

| Key | Value | For |
| --- | --- | --- |
| `l5r4.ui.hints.traitRank` | {trait}: Trait Roll; Shift+click: +1, Shift+right-click: -1 | The Trait value's `data-tooltip` |
| `l5r4.ui.hints.voidRingRank` | Void Ring: Shift+click: +1, Shift+right-click: -1 | The Void Ring value's `data-tooltip` |
| `l5r4.ui.hints.increaseTrait` | Increase {trait} | Trait up arrows |
| `l5r4.ui.hints.decreaseTrait` | Decrease {trait} | Trait down arrows |
| `l5r4.ui.hints.increaseVoidRing` | Increase Void Ring | Void Ring up arrow |
| `l5r4.ui.hints.decreaseVoidRing` | Decrease Void Ring | Void Ring down arrow |

`{trait}` is the Trait's localized name: a placeholder is named for what its value means (`docs/code-system/naming.md` **i18n keys**).

The tracks read `l5r4.ui.hints.shiftClickRankPoints`, written to `content/voice.md` **Punctuation** ("Shift+click", "Shift+Ctrl+click").
