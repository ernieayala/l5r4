# Motion

What may move, how long it takes, and what it does when the user asks the system for less motion
(`prefers-reduced-motion: reduce`). Motion confirms a change the user made; it never carries information on its own.

## Tokens

Declared on `:root` in `scss/base/_variables.scss`. Each duration token is set to `0ms` in the one reduced-motion block
(rule 3).

| Token                    | Value      | Use                                                                     | Read at                                                                                                            |
| ------------------------ | ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--l5r4-duration-fast`   | `150ms`    | Hover and press feedback, rank step arrows sliding out                  | `scss/components/_rank-control.scss:20-24`, `scss/features/_traits-rings.scss:49-52`, `:193`                       |
| `--l5r4-duration-sprite` | `500ms`    | One pass of a brush-stroke sprite mask on a roll button or a rank block | `scss/components/_button.scss:45`, `scss/components/_rank-control.scss:83`, `scss/features/_traits-rings.scss:260` |
| `--l5r4-easing-standard` | `ease-out` | Every transition                                                        | Each transition that reads `--l5r4-duration-fast`                                                                  |

A sprite's timing function is `steps(N)`, where N is the sprite file's frame count less one: 29 for
`assets/animation/urban-sprite.webp` (mask size `3000%`), 22 for `assets/animation/nature-sprite.webp` (mask size
`2300%`). N belongs to the file, so it is an SCSS variable beside the sprite's path in `base/_variables.scss`, not a
token.

## What may animate

| Motion                                | Where                                                                                  | Now                                                                                                                        | Reduced motion                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Rank block hover and press            | `scss/components/_rank-control.scss:20-33`                                             | `box-shadow`, `filter`, `outline`, `transform` over `--l5r4-duration-fast`: the hover and pressed looks, core's focus ring | Instant: the hover and pressed looks (states.md) apply with no transition                    |
| Rank step arrows slide out            | `scss/features/_traits-rings.scss:49-52`                                               | `opacity`, `top`, `bottom` over `--l5r4-duration-fast`                                                                     | Instant: the arrows appear at their open position                                            |
| Ring image hover                      | `scss/features/_traits-rings.scss`                                                     | `filter` to the drop shadow plus `--l5r4-state-hover-filter` over `--l5r4-duration-fast`                                   | Instant                                                                                      |
| Trait roll sprite (urban)             | `scss/features/_traits-rings.scss:259-262`                                             | `mask-reverse-urban` over `--l5r4-duration-sprite`, `forwards`; none on a disabled face                                    | The animation runs for `0ms` and holds its last frame, so the hovered look shows at once     |
| Roll button sprite (urban)            | `scss/components/_button.scss:44-46`                                                   | `mask-reverse-urban` over `--l5r4-duration-sprite`, `forwards`; none on a disabled face                                    | As the Trait roll sprite                                                                     |
| Rank block sprite (nature)            | `scss/components/_rank-control.scss:82-85`                                             | `mask-forward-nature` over `--l5r4-duration-sprite`, `forwards`                                                            | As the Trait roll sprite                                                                     |
| Floating Wound and Void Point numbers | `module/services/scrolling-text.js:53-72`                                              | Core's `createScrollingText`: 2000 ms, rises 2 token heights, jitter 0.25                                                  | `distance: 0` and `jitter: 0`, so the number fades in and out where it appears (rule 5)      |
| Stance and condition loops            | `module/services/animations/asset-library.js:54-204`, played by `status-animations.js` | Sequencer persistent effects, when Sequencer and JB2A are active                                                           | Target: not played; the token's status icon carries the state (rule 5)                       |
| Attack animations                     | `module/services/animations/attack-animations.js`                                      | Sequencer one-shot on a hit                                                                                                | Target: not played; the chat card carries the result (rule 5)                                |
| Loading spinner                       | Core's `fa-spin` (states.md, Loading)                                                  | Font Awesome spin                                                                                                          | Font Awesome's own reduced-motion rule stops it (`public/fonts/fontawesome/css/all.min.css`) |

The keyframes are the two the sprites play, each in the file of the component that owns its sprite:
`mask-reverse-urban` in `scss/components/_button.scss` (the Trait roll in `scss/features/_traits-rings.scss` plays it
too) and `mask-forward-nature` in `scss/components/_rank-control.scss`. No duration other than the two tokens exists.

What does not animate: section and item expand and collapse (`scss/components/_section.scss:22-26`,
`scss/components/_item-row.scss:171-181`) switch at once, and inline item controls appear at once on hover
(`scss/components/_item-row.scss:209` sets `transition: none` over core's `transition: 0.5s` on every button,
`foundry2.css:4101`). Both stay instant.

## Rules

### 1. Durations and easing read tokens

A `transition` or `animation` names its duration and easing with the tokens above. Enforced by
`tests/conventions/styles.test.js` (no literal duration or easing keyword outside `base/`; `steps()` allowed with an
SCSS frame-count variable).

Conforming, modeled on `scss/components/_rank-control.scss:20-24`:

```scss
.l5r4-rank-control-value {
  transition:
    filter var(--l5r4-duration-fast) var(--l5r4-easing-standard),
    transform var(--l5r4-duration-fast) var(--l5r4-easing-standard);
}
```

Non-conforming (modeled):

```scss
&:hover {
  animation: mask-reverse-urban 0.5s steps(29) forwards;
}
```

### 2. A transition names its properties

`transition: all` also animates layout properties a later change adds. Enforced by Stylelint
`declaration-property-value-disallowed-list` (`transition: /\ball\b/`, `transition-property: all`) in
`.stylelintrc.json`.

Conforming, `scss/features/_traits-rings.scss:49-52`, which names its three properties:

```scss
transition:
  opacity var(--l5r4-duration-fast) var(--l5r4-easing-standard),
  top var(--l5r4-duration-fast) var(--l5r4-easing-standard),
  bottom var(--l5r4-duration-fast) var(--l5r4-easing-standard);
```

Non-conforming (modeled):

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

Non-conforming (modeled): a component's own `@media (prefers-reduced-motion: reduce)` block that stops one sprite,
leaving the others at full length.

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

Conforming, modeled on `module/services/scrolling-text.js:53-72`:

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

| Item          | Where                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens        | `scss/base/_variables.scss`                                                                                                                                    |
| Sprites       | `assets/animation/urban-sprite.webp`, `assets/animation/nature-sprite.webp`; keyframes in `scss/components/_button.scss`, `scss/components/_rank-control.scss` |
| CSS users     | `scss/components/_button.scss`, `scss/components/_rank-control.scss`, `scss/features/_traits-rings.scss`                                                       |
| Canvas motion | `module/services/scrolling-text.js`, `module/services/animations/`                                                                                             |
| Markup        | `templates/actor/_partials/_stats.hbs`, `_stats-npc.hbs`, `_ranks.hbs`                                                                                         |
