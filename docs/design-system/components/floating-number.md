# Floating number

The change to a character's Wounds or Void Points, drawn as text that floats up from each of its tokens on the canvas, such as "+7 Wounds" or "−1 Void Points". It confirms a change the sheet and the chat card already show. Core draws it; the system picks the text, the color, and the size.

| Item | Detail |
| --- | --- |
| Service | `module/services/scrolling-text.js`: `onPreUpdateActorScrollingText` records the values before an update in its options, `onUpdateActorScrollingText` compares them after, on every client |
| Text | `getFloatingChanges` and `formatFloatingText` (`module/utils/floating-text.js`), resources in `FLOATING_RESOURCES` (`module/utils/floating-text.js`) |
| Drawn by | Core's `canvas.interface.createScrollingText`, called by `startScrollingText` (`module/services/scrolling-text.js`) |
| Settings | The system's client setting `floatingNumbers` (a fixed key, registered in `registerClientSettings` (`module/setup/settings/client.js`)), and core's `scrollingStatusText` |
| Template, SCSS | None: canvas text reads no template and no CSS |
| Vitest | `tests/unit/utils/floating-text.test.js` |
| Quench | `l5r4-enhanced.table-tools` |

## Anatomy

| Part | Value | Source |
| --- | --- | --- |
| Sign | `+` for a gain, `−` (U+2212) for a loss | `formatFloatingText` (`module/utils/floating-text.js`) |
| Amount | The change's size | `formatFloatingText` (`module/utils/floating-text.js`) |
| Name | `l5r4.ui.mechanics.wounds.label` "Wounds", `l5r4.ui.floating.void` "Void Points" | `FLOATING_RESOURCES` (`module/utils/floating-text.js`) |
| Fill | Per resource and direction, `COLORS` (`module/services/scrolling-text.js`) | color.md, domain roles |
| Stroke | Black, 4 px | `startScrollingText` (`module/services/scrolling-text.js`) |
| Size | 28 px | `startScrollingText` (`module/services/scrolling-text.js`) |
| Position | The token's center; a second change in the same update starts 0.3 token heights higher | `startScrollingText` (`module/services/scrolling-text.js`) |

## Variants

| Variant | Fill | Contrast with the stroke (color.md) |
| --- | --- | --- |
| Wounds up | `red-400` `0xff6b5a`, `--l5r4-color-float-wounds-up` | 7.50 |
| Wounds down | `green-200` `0x7bd88f`, `--l5r4-color-float-wounds-down` | 12.06 |
| Void Points up | `blue-200` `0x9ecbff`, `--l5r4-color-float-void-up` | 12.44 |
| Void Points down | `violet-200` `0xc9b8ff`, `--l5r4-color-float-void-down` | 11.78 |

## States

| State | Result |
| --- | --- |
| Change to Wounds or Void Points | One number per changed resource, over every visible token of the actor |
| No change | Nothing |
| Token hidden or secret | Nothing for that token (the visibility check in `onUpdateActorScrollingText` (`module/services/scrolling-text.js`)), as core's own status text |
| Setting off | Nothing on that client: `floatingNumbers` off, or core's `scrollingStatusText` off |
| Canvas not ready | Nothing (the guard at the top of `onUpdateActorScrollingText` (`module/services/scrolling-text.js`)) |
| Reduced motion | The number fades in and out where it appears, `distance: 0`, `jitter: 0` (motion.md rule 5) |

## Parameters

| Option                      | Value                                   |
| --------------------------- | --------------------------------------- |
| `anchor`                    | `CONST.TEXT_ANCHOR_POINTS.CENTER`       |
| `direction`                 | `CONST.TEXT_ANCHOR_POINTS.TOP`          |
| `distance`                  | `2 * token.h`; `0` under reduced motion |
| `fontSize`                  | `28`                                    |
| `fill`                      | `COLORS[id][up or down]`                |
| `stroke`, `strokeThickness` | `0x000000`, `4`                         |
| `jitter`                    | `0.25`; `0` under reduced motion        |

## Tokens

Canvas text cannot read custom properties, so the fills are numbers in `COLORS`. color.md lists them as the domain roles `--l5r4-color-float-wounds-up`, `-wounds-down`, `-void-up`, `-void-down`, and `--l5r4-color-float-stroke`, with their palette names, so the contrast check covers them. A change to a fill changes `COLORS` and color.md together.

## Keyboard and screen reader

The number is canvas drawing, with no element and no name. It adds nothing a reader needs: the Wounds and Void Points show on the sheet, and a damage result names the Wounds taken in its title ([damage result](damage-result.md)).

## Long text

The text is one short line: a sign, a number, and one of two names. A translated name may be longer; it draws on one line, centered on the token.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| FN1 | The text carries the sign and the resource's name; color never carries the meaning alone | `tests/unit/utils/floating-text.test.js` | `formatFloatingText(7, "Wounds")` is "+7 Wounds", from `formatFloatingText` (`module/utils/floating-text.js`) | A bare red "7" (modeled) |
| FN2 | Each fill meets 3:1 against the stroke | `tests/conventions/contrast.test.js` | `green-200` on black, 12.06:1 (color.md) | A dark red fill on the black stroke (modeled) |
| FN3 | A token the user cannot see shows nothing | Quench `l5r4-enhanced.table-tools` | The `token.visible` and `token.document.isSecret` check in `onUpdateActorScrollingText` (`module/services/scrolling-text.js`) | Floating a GM-hidden token's Wounds to every player (modeled) |
| FN4 | Motion checks `prefers-reduced-motion` when it plays and drops the travel | Quench `l5r4-enhanced.table-tools` (motion.md rule 5) | `distance: reduced ? 0 : 2 * token.h` in `startScrollingText` (`module/services/scrolling-text.js`) | `distance: 2 * token.h` and `jitter: 0.25` for every user (modeled) |
| FN5 | Both settings can turn it off; the system adds no third switch | Review | `game.settings.get(SYS_ID, "floatingNumbers")` in `onUpdateActorScrollingText` (`module/services/scrolling-text.js`), core's setting in core | A per-actor flag that hides the numbers (modeled) |

FN4 is Stage 17 decision 16 (`foundations/motion.md` rule 5). The Quench case "should float the number in place, without travel or jitter, under reduced motion" covers it.

## Do and don't

| Do | Don't |
| --- | --- |
| Float the change, not the new total | Float the total, which the reader must compare |
| Stack two changes from one update | Draw them over each other |
| Keep the colors in `COLORS` and color.md in step | Add a fill that color.md does not list |
