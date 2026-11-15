# Floating number

The change to a character's Wounds or Void Points, drawn as text that floats up from each of its tokens on the canvas,
such as "+7 Wounds" or "−1 Void Points". It confirms a change the sheet and the chat card already show. Core draws it;
the system picks the text, the color, and the size.

| Item           | Detail                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service        | `module/services/scrolling-text.js`: `onPreUpdateActor` records the values before an update in its options, `onUpdateActor` compares them after, on every client (`:44-85`) |
| Text           | `floatingChanges` and `floatingText` (`module/utils/floating-text.js:22-41`), resources in `FLOATING_RESOURCES` (`:8-11`)                                                   |
| Drawn by       | Core's `canvas.interface.createScrollingText` (`scrolling-text.js:69-82`)                                                                                                   |
| Settings       | The system's client setting `floatingNumbers` (a fixed key, `module/setup/settings/client.js:21-28`), and core's `scrollingStatusText`                                      |
| Template, SCSS | None: canvas text reads no template and no CSS                                                                                                                              |
| Vitest         | `tests/unit/utils/floating-text.test.js`                                                                                                                                    |
| Quench         | `l5r4-enhanced.table-tools`                                                                                                                                                 |

## Anatomy

| Part     | Value                                                                                  | Source                    |
| -------- | -------------------------------------------------------------------------------------- | ------------------------- |
| Sign     | `+` for a gain, `−` (U+2212) for a loss                                                | `floating-text.js:40`     |
| Amount   | The change's size                                                                      | `floating-text.js:40`     |
| Name     | `l5r4.ui.floating.wounds` "Wounds", `l5r4.ui.floating.void` "Void Points"              | `floating-text.js:9-10`   |
| Fill     | Per resource and direction, `COLORS` (`scrolling-text.js:19-22`)                       | color.md, domain roles    |
| Stroke   | Black, 4 px                                                                            | `scrolling-text.js:78-79` |
| Size     | 28 px                                                                                  | `scrolling-text.js:76`    |
| Position | The token's center; a second change in the same update starts 0.3 token heights higher | `scrolling-text.js:70`    |

## Variants

| Variant          | Fill                                                     | Contrast with the stroke (color.md) |
| ---------------- | -------------------------------------------------------- | ----------------------------------- |
| Wounds up        | `red-400` `0xff6b5a`, `--l5r4-color-float-wounds-up`     | 7.50                                |
| Wounds down      | `green-200` `0x7bd88f`, `--l5r4-color-float-wounds-down` | 12.06                               |
| Void Points up   | `blue-200` `0x9ecbff`, `--l5r4-color-float-void-up`      | 12.44                               |
| Void Points down | `violet-200` `0xc9b8ff`, `--l5r4-color-float-void-down`  | 11.78                               |

## States

| State                           | Result                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Change to Wounds or Void Points | One number per changed resource, over every visible token of the actor                                                                                 |
| No change                       | Nothing                                                                                                                                                |
| Token hidden or secret          | Nothing for that token (`scrolling-text.js:64-66`), as core's own status text                                                                          |
| Setting off                     | Nothing on that client: `floatingNumbers` off, or core's `scrollingStatusText` off                                                                     |
| Canvas not ready                | Nothing (`scrolling-text.js:56`)                                                                                                                       |
| Reduced motion                  | Target: the number fades in and out where it appears, `distance: 0`, `jitter: 0` (motion.md rule 5). Now it travels two token heights with jitter 0.25 |

## Parameters

| Option                      | Value now                                        |
| --------------------------- | ------------------------------------------------ |
| `anchor`                    | `CONST.TEXT_ANCHOR_POINTS.CENTER`                |
| `direction`                 | `CONST.TEXT_ANCHOR_POINTS.TOP`                   |
| `distance`                  | `2 * token.h`; `0` under reduced motion (target) |
| `fontSize`                  | `28`                                             |
| `fill`                      | `COLORS[id][up or down]`                         |
| `stroke`, `strokeThickness` | `0x000000`, `4`                                  |
| `jitter`                    | `0.25`; `0` under reduced motion (target)        |

## Tokens

Canvas text cannot read custom properties, so the fills are numbers in `COLORS`. color.md lists them as the domain
roles `--l5r4-color-float-wounds-up`, `-wounds-down`, `-void-up`, `-void-down`, and `--l5r4-color-float-stroke`, with
their palette names, so the contrast check covers them. A change to a fill changes `COLORS` and color.md together.

## Keyboard and screen reader

The number is canvas drawing, with no element and no name. It adds nothing a reader needs: the Wounds and Void
Points show on the sheet, and a damage result names the Wounds taken in its title ([damage result](damage-result.md)).

## Long text

The text is one short line: a sign, a number, and one of two names. A translated name may be longer; it draws on one
line, centered on the token.

## Rules

| #   | Rule                                                                                     | Enforced by                                                    | Conforming                                                                                      | Non-conforming                                                                            |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| FN1 | The text carries the sign and the resource's name; color never carries the meaning alone | `tests/unit/utils/floating-text.test.js`                       | `floatingText(7, "Wounds")` is "+7 Wounds" (`floating-text.js:36`)                              | A bare red "7" (modeled)                                                                  |
| FN2 | Each fill meets 3:1 against the stroke                                                   | `tests/conventions/contrast.test.js`                           | `green-200` on black, 12.06:1 (color.md)                                                        | A dark red fill on the black stroke (modeled)                                             |
| FN3 | A token the user cannot see shows nothing                                                | Quench `l5r4-enhanced.table-tools`                             | `if (!token.visible \|\| token.document.isSecret) continue` (`scrolling-text.js:64-66`)         | Floating a GM-hidden token's Wounds to every player (modeled)                             |
| FN4 | Motion checks `prefers-reduced-motion` when it plays and drops the travel                | Review, and the Quench case the change adds (motion.md rule 5) | motion.md rule 5 conforming example                                                             | `distance: 2 * token.h` and `jitter: 0.25` for every user (`scrolling-text.js:75`, `:80`) |
| FN5 | Both settings can turn it off; the system adds no third switch                           | Review                                                         | `game.settings.get(SYS_ID, "floatingNumbers")` (`scrolling-text.js:56`), core's setting in core | A per-actor flag that hides the numbers (modeled)                                         |

FN4 is Stage 17 decision 16. It changes what those clients see, so it ships with a failing Quench case first
(`foundations/motion.md` rule 5).

## Do and don't

| Do                                               | Don't                                          |
| ------------------------------------------------ | ---------------------------------------------- |
| Float the change, not the new total              | Float the total, which the reader must compare |
| Stack two changes from one update                | Draw them over each other                      |
| Keep the colors in `COLORS` and color.md in step | Add a fill that color.md does not list         |
