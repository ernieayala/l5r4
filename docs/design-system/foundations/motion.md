# Motion

What may move, how long it takes, and what it does when the user asks the system for less motion
(`prefers-reduced-motion: reduce`). Motion confirms a change the user made; it never carries information on its own.

## Tokens

Declared on `:root` in `scss/base/_variables.scss`. Each duration token is set to `0ms` in the one reduced-motion block
(rule 3).

| Token                    | Value      | Use                                                                    | Replaces                                                                                                                       |
| ------------------------ | ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `--l5r4-duration-fast`   | `150ms`    | Hover and press feedback, rank step arrows sliding out                 | The nine `150ms` literals (`_ranks.scss:26`, `_traits-rings.scss:42-44`, `:172`, `:202`, `:272`, `_animations.scss:17`, `:56`) |
| `--l5r4-duration-sprite` | `500ms`    | One pass of a brush-stroke sprite mask on a roll button or a rank name | `$mask-animation-duration` (`base/_variables.scss:34`) and the literal `0.5s` at `_traits-rings.scss:236`                      |
| `--l5r4-easing-standard` | `ease-out` | Every transition                                                       | The `ease-out` keyword in every transition today                                                                               |

A sprite's timing function is `steps(N)`, where N is the sprite file's frame count less one: 29 for
`assets/animation/urban-sprite.webp` (mask size `3000%`), 22 for `assets/animation/nature-sprite.webp` (mask size
`2300%`). N belongs to the file, so it is an SCSS variable beside the sprite's path in `base/_variables.scss`, not a
token.

## What may animate

| Motion                                  | Where                                                                                  | Now                                                                       | Reduced motion                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Rank name hover and press               | `scss/features/_ranks.scss:26-35`                                                      | `all 150ms ease-out`: brightness, press scale                             | Instant: the hover and pressed looks (states.md) apply with no transition                       |
| Rank step arrows slide out              | `scss/features/_traits-rings.scss:41-44`                                               | opacity, top, bottom, `150ms ease-out`                                    | Instant: the arrows appear at their open position                                               |
| Ring image hover                        | `scss/features/_traits-rings.scss:163-173`                                             | `all 150ms ease-out` to `scale(1.1)`                                      | Instant                                                                                         |
| Trait roll button                       | `scss/features/_traits-rings.scss:202`                                                 | `all 150ms ease-out`                                                      | Instant                                                                                         |
| Trait roll sprite (urban)               | `scss/features/_traits-rings.scss:235-237`                                             | `mask-reverse-urban 0.5s steps(29) forwards`                              | The animation runs for `0ms` and holds its last frame, so the hovered look shows at once        |
| Mask button and its sprite (urban)      | `scss/components/_animations.scss:17`, `:45-47`                                        | `all 150ms ease-out`; `mask-reverse-urban` sprite                         | Instant; sprite holds its last frame                                                            |
| Rank name container and sprite (nature) | `scss/components/_animations.scss:56`, `:92-94`                                        | `all 150ms ease-out`; `mask-forward-nature` sprite                        | Instant; sprite holds its last frame                                                            |
| Floating Wound and Void Point numbers   | `module/services/scrolling-text.js:69-82`                                              | Core's `createScrollingText`: 2000 ms, rises 2 token heights, jitter 0.25 | Target: `distance: 0` and `jitter: 0`, so the number fades in and out where it appears (rule 5) |
| Stance and condition loops              | `module/services/animations/asset-library.js:54-204`, played by `animation-manager.js` | Sequencer persistent effects, when Sequencer and JB2A are active          | Target: not played; the token's status icon carries the state (rule 5)                          |
| Attack animations                       | `module/services/animations/attack-animations.js`                                      | Sequencer one-shot on a hit                                               | Target: not played; the chat card carries the result (rule 5)                                   |
| Loading spinner                         | Core's `fa-spin` (states.md, Loading)                                                  | Font Awesome spin                                                         | Font Awesome's own reduced-motion rule stops it (`public/fonts/fontawesome/css/all.min.css`)    |

Two declarations in the inventory animate nothing a template renders: `.void-points-amount`
(`_traits-rings.scss:272`) and `.clear-btn` (`_forms.scss:51`, `250ms`). The keyframes `mask-forward-urban`
(`_animations.scss:100`) and `mask-reverse-nature` (`:130`) are never used. These are removed with their selectors, so
no token exists for `250ms`.

What does not animate: section and item expand and collapse (`_sections.scss:16-20`, `_item-lists.scss:155-163`)
switch at once, and inline item controls appear at once on hover (`_item-lists.scss:190` sets `transition: none` over
core's `transition: 0.5s` on every button, `foundry2.css:4101`). Both stay instant.

## Rules

### 1. Durations and easing read tokens

A `transition` or `animation` names its duration and easing with the tokens above. Enforced by
`tests/conventions/styles.test.js` (no literal duration or easing keyword outside `base/`; `steps()` allowed with an
SCSS frame-count variable).

Conforming, modeled on `scss/features/_ranks.scss:26`:

```scss
.l5r4-rank-name {
  transition:
    filter var(--l5r4-duration-fast) var(--l5r4-easing-standard),
    transform var(--l5r4-duration-fast) var(--l5r4-easing-standard);
}
```

Non-conforming, `scss/features/_traits-rings.scss:236`:

```scss
&:hover {
  animation: mask-reverse-urban 0.5s steps(29) forwards;
}
```

### 2. A transition names its properties

`transition: all` also animates layout properties a later change adds. Six declarations use it today
(`_ranks.scss:26`, `_traits-rings.scss:172`, `:202`, `:272`, `_animations.scss:17`, `:56`). Enforced by Stylelint
`declaration-property-value-disallowed-list` (`transition: /\ball\b/`, `transition-property: all`) in
`.stylelintrc.json`.

Conforming, modeled on `scss/features/_traits-rings.scss:41-44`, which names its three properties:

```scss
transition:
  opacity var(--l5r4-duration-fast) var(--l5r4-easing-standard),
  top var(--l5r4-duration-fast) var(--l5r4-easing-standard),
  bottom var(--l5r4-duration-fast) var(--l5r4-easing-standard);
```

Non-conforming, `scss/features/_traits-rings.scss:172`:

```scss
transition: all 150ms ease-out;
```

### 3. One reduced-motion block zeroes every duration token

`scss/base/_variables.scss` holds the only `@media (prefers-reduced-motion: reduce)` block. It sets each
`--l5r4-duration-*` token to `0ms`. A transition then switches at once; a sprite animation with `forwards` runs for
`0ms` and holds its last frame, so the hovered look still shows. No component writes its own reduced-motion rule.
Enforced by `tests/conventions/styles.test.js` (every `transition` and `animation` reads a `--l5r4-duration-*` token,
and every such token is redefined in the block).

Conforming:

```scss
@media (prefers-reduced-motion: reduce) {
  :root {
    --l5r4-duration-fast: 0ms;
    --l5r4-duration-sprite: 0ms;
  }
}
```

Non-conforming, `scss/components/_animations.scss:45-47` today: the sprite runs at full length for every user, with no
reduced-motion rule anywhere in `scss/`.

### 4. Motion only confirms a state that also shows without it

Every animated change ends in a state that states.md gives a look of its own: hover ends in the hover look, a sprite
ends on its filled frame. A user with reduced motion sees the same end states. Enforced by review, with the gallery
shown under reduced motion (Chrome DevTools rendering emulation).

Conforming: the Trait roll button's sprite ends on the filled button, which is the hovered look.

Non-conforming: an animation that pulses a Void Point dot to say Void Points are left, with no other mark.

### 5. Canvas and Sequencer motion checks the media query when it plays

CSS cannot reach the canvas. A service that plays motion on the canvas reads
`window.matchMedia("(prefers-reduced-motion: reduce)").matches` at the moment it plays and takes the reduced form in
the table above. Floating numbers already honor the system's `floatingNumbers` client setting
(`module/setup/settings/client.js:21-28`) and core's `scrollingStatusText` setting
(`client/canvas/groups/interface.mjs:175`); reduced motion keeps the number and drops the travel. Core's fade-in
scales the text from 0.6 to 1 (`interface.mjs:211-221`); core owns that and the system leaves it. Stage 17 decision
16 sets this: every animation gets a reduced-motion rule, and floating numbers then appear and fade without moving. It
changes what those clients show, so it ships with a failing Quench case first. Enforced by review and that Quench
case.

Conforming, modeled on `module/services/scrolling-text.js:69-82`:

```js
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
canvas.interface.createScrollingText(origin, text, {
  ...style,
  distance: reduced ? 0 : 2 * token.h,
  jitter: reduced ? 0 : 0.25
});
```

Non-conforming: a Sequencer loop that starts with no check, so a user who asked for less motion sees a spinning token
border for the whole encounter.

## Partials and files

| Item          | Where                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tokens        | `scss/base/_variables.scss`                                                                                                  |
| Sprites       | `assets/animation/urban-sprite.webp`, `assets/animation/nature-sprite.webp`; keyframes in `scss/components/_animations.scss` |
| CSS users     | `scss/features/_ranks.scss`, `scss/features/_traits-rings.scss`, `scss/components/_animations.scss`                          |
| Canvas motion | `module/services/scrolling-text.js`, `module/services/animations/`                                                           |
| Markup        | `templates/actor/_partials/_stats.hbs`, `_stats-npc.hbs`, `_ranks.hbs`                                                       |
