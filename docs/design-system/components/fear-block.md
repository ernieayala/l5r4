# Fear block

The NPC sidebar block for a creature's Fear: its Fear Rank as a number the GM types, and, when the rank is above 0, a button that posts a Fear [flow card](flow-card.md) for the selected tokens.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_fear.hbs` |
| Parameters | The sheet context: `system.fear.rank` |
| SCSS | None of its own: `section.md`, `grid.md`, and `button.md` draw it |
| Block class | `l5r4-fear` on the section |
| Shows in | NPC sidebar (`templates/actor/npc.hbs`) |
| Handler | `NpcActionsHandler.testFear` (`module/sheets/handlers/npc-actions-handler.js`), then `onFearClick` (`module/services/fear-card.js`) |
| Game terms | Fear, Fear Rank (`game-rules/42_fear.md, p.90`) |
| Gallery | Rank 0 (no button), rank 3, rank 10; the button hovered and focused |

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Section | `<section>` | `l5r4-section l5r4-fear` |
| Title bar | Compact section title, "Fear" | `l5r4-section-title -compact` |
| Body | `<div>` holding the grid and the test | `flexcol -gap-sm l5r4-fear-body` |
| Grid | One row: "Fear Rank" and the input | `l5r4-grid` |
| Rank input | `<input type="number" name="system.fear.rank" min="0" max="10" data-type="Number" aria-label>` | none |
| Fear test | Core `<button type="button" data-action="test-fear" data-fear-rank data-tooltip>` | `button l5r4-fear-test`, core's `button` beside the block's class |

The test button's label reads "Fear {rank}" (`l5r4.ui.mechanics.fear.label`), so the rank it rolls is on the button.

## Variants

| Variant      | Selects it                 | Shows                    |
| ------------ | -------------------------- | ------------------------ |
| With test    | `system.fear.rank` above 0 | The input and the button |
| Without test | Rank 0                     | The input only           |

## States

| State | Look | Markup |
| --- | --- | --- |
| Rest | Grid and core button rest looks |  |
| Hover | Core's button hover | `:hover` |
| Focus-visible | Core's focus ring on the button; core's field outline on the input | `:focus-visible` |
| No target | The button stays enabled; a press with no token selected warns `l5r4.ui.mechanics.fear.noTargets` from `startFearTest` (`module/services/fear-card.js`) | None |
| Read-only | Core disables the input and the button on a sheet the viewer cannot edit (`button.md` B8) | Core's `disabled` |

## Tokens

None of its own. The test button is core's; it takes the block's full width, as a chat card button does (`foundations/space-and-size.md` **Density**).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Rank input, then the test button |
| Enter or Space | On the button: posts the Fear card for the selected tokens |
| Screen reader | The input reads "Fear Rank"; the button reads its label, "Fear 3"; its `data-tooltip` shows sighted users what it does |

## Long text

The button label is short ("Fear 3") and wraps inside the button if a translation runs long. The title bar is one line.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| R1 | The test is a `<button type="button">` | `tests/conventions/templates.test.js` |
| R2 | Its `data-tooltip` names the action without a gesture; no `title` | `tests/lang.test.js` ("Click to" fails); `tests/conventions/templates.test.js` (no `title`) |
| R3 | The rank input names itself with the label cell's key | Review, in the gallery |
| R4 | The section heading and the grid label do not repeat each other | Review |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| R1 | `<button type="button" class="l5r4-fear-test" data-action="test-fear" data-fear-rank="{{system.fear.rank}}" ...>` (modeled) | `<a class="button fear-test" data-action="test-fear" ...>` (modeled) |
| R2 | "Post a Fear test for the selected tokens": `l5r4.ui.mechanics.fear.rollForSelected` (`lang/en.json`) | "Click to test Fear against selected characters" (modeled) |
| R3 | `aria-label="{{localize "l5r4.ui.mechanics.fear.rank"}}"` on the input (`templates/actor/_partials/_fear.hbs`) | The input with no `aria-label` (modeled) |
| R4 | Heading `l5r4.ui.mechanics.fear.title`, "Fear", over the grid label `l5r4.ui.mechanics.fear.rank`, "Fear Rank" (`templates/actor/_partials/_fear.hbs`) | Heading "Fear Rank" over a grid label "Rank" (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Show the test only when the creature has a Fear Rank | Show a disabled test at rank 0 |
| Keep the rank on the button's label | Label the button "Test" and leave the rank to the input above |

## Names

`data-action="test-fear"`: "test" is a game verb, and the name is verb first (Stage 17 decision 16, `docs/code-system/naming.md`).

Fixed (Stage 17 decision 2): `system.fear.rank`; the `@Fear[...]` text link and its `data-link-type` value `Fear` (`inline-link.md`).
