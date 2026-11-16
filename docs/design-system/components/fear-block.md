# Fear block

The NPC sidebar block for a creature's Fear: its Fear Rank as a number the GM types, and, when the rank is above 0, a
button that rolls Fear for the selected tokens.

| Item        | Detail                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Partial     | `templates/actor/_partials/_fear.hbs`                                                                                          |
| Parameters  | The sheet context: `system.fear.rank`                                                                                          |
| SCSS        | None of its own: `section.md`, `grid.md`, and `button.md` draw it                                                              |
| Block class | `l5r4-fear` on the section                                                                                                     |
| Shows in    | NPC sidebar (`templates/actor/npc.hbs`)                                                                                        |
| Handler     | `NpcActionsHandler.testFear` (`module/sheets/handlers/npc-actions-handler.js`), then `onFearClick` (`module/services/fear.js`) |
| Game terms  | Fear, Fear Rank (`game-rules/42_fear.md, p.90`)                                                                                |
| Gallery     | Rank 0 (no button), rank 3, rank 10; the button hovered and focused                                                            |

## Anatomy

| Part       | Element                                                                                        | Class                         | Class now                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Section    | `<section>`                                                                                    | `l5r4-section l5r4-fear`      | the target                                                                                                      |
| Title bar  | Compact section title, "Fear Rank"                                                             | `l5r4-section-title -compact` | `l5r4-section-title` with `h4.l5r4-section-heading.-compact`                                                    |
| Grid       | One row: "Rank" and the input                                                                  | `l5r4-grid`                   | the target                                                                                                      |
| Rank input | `<input type="number" name="system.fear.rank" min="0" max="10" data-type="Number" aria-label>` | none                          | same, no `aria-label`: `name="system.fear.rank"` (`templates/actor/_partials/_fear.hbs`)                        |
| Fear test  | Core `<button type="button" data-action="test-fear" data-fear-rank data-tooltip>`              | `l5r4-fear-test`              | the target, with core's `button` class: `class="button l5r4-fear-test"` (`templates/actor/_partials/_fear.hbs`) |

The test button's label reads "Fear {rank}" (`l5r4.ui.mechanics.fear.label`), so the rank it rolls is on the button.

## Variants

| Variant      | Selects it                 | Shows                    |
| ------------ | -------------------------- | ------------------------ |
| With test    | `system.fear.rank` above 0 | The input and the button |
| Without test | Rank 0                     | The input only           |

## States

| State         | Look                                                                                                                                             | Markup            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Rest          | Grid and core button rest looks                                                                                                                  |                   |
| Hover         | Core's button hover                                                                                                                              | `:hover`          |
| Focus-visible | Core's focus ring on the button; core's field outline on the input                                                                               | `:focus-visible`  |
| No target     | The button stays enabled; a press with no token selected warns `l5r4.ui.mechanics.fear.noTargets` from `onFearClick` (`module/services/fear.js`) | None              |
| Read-only     | Core disables the input and the button on a sheet the viewer cannot edit (`button.md` B8)                                                        | Core's `disabled` |

## Tokens

None of its own. The test button is core's; it takes the block's full width, as a chat card button does
(`foundations/space-and-size.md` **Density**).

## Keyboard and screen reader

| Input          | Result                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tab            | Rank input, then the test button                                                                                       |
| Enter or Space | On the button: rolls Fear for the selected tokens                                                                      |
| Screen reader  | The input reads "Fear Rank"; the button reads its label, "Fear 3"; its `data-tooltip` shows sighted users what it does |

## Long text

The button label is short ("Fear 3") and wraps inside the button if a translation runs long. The title bar is one line.

## Rules

| #   | Rule                                                              | Enforced by                                                                                 |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R1  | The test is a `<button type="button">`                            | `tests/conventions/templates.test.js`                                                       |
| R2  | Its `data-tooltip` names the action without a gesture; no `title` | `tests/lang.test.js` ("Click to" fails); `tests/conventions/templates.test.js` (no `title`) |
| R3  | The rank input names itself with the label cell's key             | Review, in the gallery                                                                      |
| R4  | The section heading and the grid label do not repeat each other   | Review                                                                                      |

| #   | Conforming                                                                                                                  | Non-conforming                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `<button type="button" class="l5r4-fear-test" data-action="test-fear" data-fear-rank="{{system.fear.rank}}" ...>` (modeled) | `<a class="button fear-test" data-action="test-fear" ...>` (modeled)                                                                            |
| R2  | "Roll Fear for the selected tokens": `l5r4.ui.mechanics.fear.rollForSelected` (`lang/en.json`)                              | "Click to test Fear against selected characters" (modeled)                                                                                      |
| R3  | `aria-label="{{localize "l5r4.ui.mechanics.fear.rank"}}"` on the input (modeled)                                            | The input, `name="system.fear.rank"` (`templates/actor/_partials/_fear.hbs`), with no `aria-label`                                              |
| R4  | Heading "Fear", grid label "Fear Rank" (modeled)                                                                            | Heading "Fear Rank" over a grid label "Rank": `l5r4.ui.mechanics.fear.rank`, then `l5r4.ui.common.rank` (`templates/actor/_partials/_fear.hbs`) |

## Do and don't

| Do                                                   | Don't                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Show the test only when the creature has a Fear Rank | Show a disabled test at rank 0                                |
| Keep the rank on the button's label                  | Label the button "Test" and leave the rank to the input above |

## Names

| Current     | Target           | Why         |
| ----------- | ---------------- | ----------- |
| `fear`      | `l5r4-fear`      | Decision 15 |
| `fear-test` | `l5r4-fear-test` | Decision 15 |

`data-action="test-fear"` stays: "test" is a game verb, and the name is already verb first (Stage 17 decision 16,
`docs/code-system/naming.md`).

Fixed (Stage 17 decision 2): `system.fear.rank`; the `@Fear[...]` text link and its `data-link-type` value `Fear`
(`inline-link.md`).

## Keys this page needs

| Key                            | Value | For                      |
| ------------------------------ | ----- | ------------------------ |
| `l5r4.ui.mechanics.fear.title` | Fear  | The section heading (R4) |

`l5r4.ui.mechanics.fear.clickToTest` is renamed `l5r4.ui.mechanics.fear.rollForSelected`, value "Roll Fear for the
selected tokens" (R2); the rename reaches every translation (`content/localization.md`).
