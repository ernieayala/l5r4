# Button

A control with a visible label that does one thing when pressed. Two variants: core's button, for every labelled
action (Simple and Free movement, the Fear test, dialog and chat card buttons), and the roll button, which shows a dice
pool and rolls it, drawn with the brush-stroke sprite mask.

| Item        | Detail                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | Core button: none, one element. Roll button: `templates/cards/_partials/_roll-button.hbs`, used by the Skill, weapon, and spell rows, the Trait rows, and the NPC attacks                                                                                                                                 |
| Parameters  | `action` (the `data-action` value), `pool` (the label, an `XkY` string the context computes, or a Trait's name), `tooltip` (localized roll kind), `ring` (the Ring variant), `draggable` (core's hotbar drag), `data` (the face's other `data-*` attributes, an `(object ...)` whose keys follow `data-`) |
| SCSS        | `scss/components/_button.scss` (the roll button); the Ring roll variant in `scss/features/_traits-rings.scss:216-264`                                                                                                                                                                                     |
| Block class | `l5r4-button` on the roll button's root; core's button takes no system class                                                                                                                                                                                                                              |
| Shows in    | Item rows (Skills, weapons, spells), NPC attacks, Trait rows, sidebar blocks, dialogs, chat cards                                                                                                                                                                                                         |
| Game terms  | Skill Roll, Trait Roll (`game-rules/29_types_of_rolls.md, p.79`); dice pool `XkY` (`game-rules/26_special_dice_rules.md, p.77`)                                                                                                                                                                           |
| Gallery     | Each variant in every state below, light and dark                                                                                                                                                                                                                                                         |

## Anatomy

Core button:

| Part   | Element                                                     | Class | Class now                   |
| ------ | ----------------------------------------------------------- | ----- | --------------------------- |
| Button | `<button type="button">`                                    | none  | `a.button` (`_fear.hbs:21`) |
| Icon   | `<i class="fa-solid ..." inert>` before the label, optional | none  | `fas`                       |
| Label  | Text from `{{localize}}`                                    | none  |                             |

Roll button:

| Part        | Element                  | Class               | Class now               |
| ----------- | ------------------------ | ------------------- | ----------------------- |
| Root        | `<div>`                  | `l5r4-button -roll` | `button-mask-container` |
| Under-label | `<span inert>`           | `l5r4-button-under` | `mas`                   |
| Face        | `<button type="button">` | `l5r4-button-face`  | `a.button`              |

The root is a wrapper because the sprite mask cuts the face, and the under-label shows through the cut. The
under-label repeats the face's text for sight only, so it is `inert` and read once.

## Variants

| Variant   | Selects it                                                                              | Look                                                                                                                                                                                                        | Used at                                                                    |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Core      | A `<button>` with no system class                                                       | Core's button: border, hover background, focus ring                                                                                                                                                         | `_combat.hbs:54-62`, `_fear.hbs:20-27`, dialogs, chat cards                |
| Roll      | `l5r4-button -roll`                                                                     | Square corners, a thin frame in `header`, face in `action` with `action-text`, urban sprite mask                                                                                                            | `cards/skill.hbs`, `cards/weapon.hbs`, `cards/spell.hbs`, `_stats-npc.hbs` |
| Ring roll | `l5r4-button -roll -<ring>` (`-air`, `-water`, `-earth`, `-fire`), the `ring` parameter | The roll look with the Ring's hue on the face and frame, `ring-text` label. The hue comes from the Trait row's `-<ring>` (`scss/features/_traits-rings.scss`); the button's own `-<ring>` names the variant | Trait rows (`_trait.hbs`), see `ring-trait-block.md`                       |

## States

| State         | Look                                                                                                                                                                                                                                                                                             | Markup                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Rest          | Core: core's button. Roll: the sprite's first frame covers the face                                                                                                                                                                                                                              |                                    |
| Hover         | Core: core's hover. Roll: the sprite plays once over `--l5r4-duration-sprite` and holds its last frame                                                                                                                                                                                           | `:hover`                           |
| Focus-visible | Core's focus ring (`--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow`) on the face; the roll sprite holds its last frame as on hover                                                                                                                                                      | `:focus-visible` on the `<button>` |
| Active        | `--l5r4-state-pressed-filter` and `--l5r4-state-pressed-transform` on the face                                                                                                                                                                                                                   | `:active`                          |
| Disabled      | Core's disabled look; on a roll face, `--l5r4-state-disabled-opacity`. `data-tooltip` says why                                                                                                                                                                                                   | `disabled`                         |
| Read-only     | On a sheet the viewer cannot edit, core disables every `<button>` in the form (`client/applications/api/document-sheet.mjs:212-227`). The actor sheets bind their actions only for an owner (`module/sheets/base-actor-sheet.js:113-115`), so that viewer loses no control that works today (B8) | Core's `disabled`                  |
| Loading       | Not shown: a roll opens the check dialog or posts at once                                                                                                                                                                                                                                        |                                    |

## Tokens

| Token                                                                                                                                                       | Use                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `--l5r4-color-action`, `--l5r4-color-action-text`                                                                                                           | Roll face and its label          |
| `--l5r4-color-header`                                                                                                                                       | Roll frame                       |
| `--l5r4-color-text`                                                                                                                                         | Under-label                      |
| `--l5r4-color-ring-air`, `-water`, `-earth`, `-fire`; `--l5r4-color-ring-text`                                                                              | Ring roll face, frame, and label |
| `--l5r4-border-width-thin`                                                                                                                                  | Roll frame                       |
| `--l5r4-space-control-inline`                                                                                                                               | Ring roll inline padding         |
| `--l5r4-duration-sprite`, `--l5r4-duration-fast`, `--l5r4-easing-standard`                                                                                  | Sprite pass, frame transition    |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow`, `--l5r4-state-pressed-filter`, `--l5r4-state-pressed-transform`, `--l5r4-state-disabled-opacity` | States                           |

The urban sprite's path and frame count are SCSS variables in `scss/base/_variables.scss` (`foundations/motion.md`).

Contrast (`foundations/color.md` **Contrast fixes**): `action-text` on `action` is 3.80:1 today and 4.51:1 at the
`action` target `#ba4d34`; `ring-text` on `ring-air` is 2.77:1 today and 4.51:1 at the Air target `#64798d`.

## Keyboard and screen reader

| Input               | Result                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Tab                 | Focuses the button (the roll face)                                                                           |
| Enter or Space      | Presses it: a roll opens the check dialog                                                                    |
| Shift+Enter         | A roll skips the dialog, as Shift+click does: the click event carries the Shift key                          |
| Drag (pointer only) | A Trait roll or Ring roll drags to the hotbar through core's `draggable` class                               |
| Screen reader       | Reads the face's text (the pool, "6k3"); its `data-tooltip` shows sighted users the roll kind ("Skill Roll") |

## Long text

A core button's label wraps inside the button; chat card buttons run full width, one per row
(`foundations/typography.md`). A roll face holds a pool and an optional signed bonus (`10k10+15`) and stays on one line
in its column (`--l5r4-size-column-80` and up); the pool string is short by design. A Ring roll label is the Trait's
name on one line; a translation longer than the column truncates with an ellipsis and the name stays in
`data-tooltip`.

## Rules

| #   | Rule                                                                                                                                                                                                                                                                                                                                       | Enforced by                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| B1  | A button is a `<button type="button">`; never an `<a>` with no `href` or a `<div>` with `data-action`                                                                                                                                                                                                                                      | `tests/conventions/templates.test.js`                                              |
| B2  | A label starts with a verb (`content/voice.md` **Buttons**). A roll face is the exception: its label is the pool it rolls                                                                                                                                                                                                                  | Review                                                                             |
| B3  | An icon in a labelled button comes before the label and is `inert` (`foundations/iconography.md` rules 5 and 6)                                                                                                                                                                                                                            | `tests/conventions/templates.test.js` (`inert`); review                            |
| B4  | The roll button is one partial; a card or sheet never copies its three elements. The coverage check reads the `action` a card passes it as the card's action (`tools/coverage/actions.mjs`)                                                                                                                                                | `tests/conventions/templates.test.js` (markup used twice)                          |
| B5  | The pool string arrives computed in the context; the template never joins dice and bonus with helpers                                                                                                                                                                                                                                      | Review                                                                             |
| B6  | The sprite holds its last frame on `:focus-visible` as on `:hover`, so keyboard and pointer see one look                                                                                                                                                                                                                                   | Review, in the gallery's state section                                             |
| B7  | Styles sit under `.l5r4-button`; nothing selects `a.button` or `[data-action]`                                                                                                                                                                                                                                                             | Stylelint `selector-class-pattern`, `selector-attribute-name-disallowed-list`      |
| B8  | A sheet control converted from an `<a>` or `<div>` to a `<button>` takes core's read-only disabling. On an actor sheet that keeps behavior, because a viewer who cannot edit has no actions bound. In a locked compendium core disables the buttons for an owner too, where today's `<a>` controls fire; Stage 17 decision 16 accepts that | The sheet's Quench batch, in an Observer view and a locked compendium view; review |

| #   | Conforming                                                                                                                                                                                                  | Non-conforming                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| B1  | `<button type="button" data-action="toggle-movement-type" ...>` (`templates/actor/_partials/_combat.hbs:54`)                                                                                                | `<a class="button fear-test" data-action="test-fear" ...>` (`templates/actor/_partials/_fear.hbs:20-25`)                       |
| B2  | "Remove this effect" (`lang/en.json:383`)                                                                                                                                                                   | "Honor Roll" as a button (`lang/en.json:395`; write "Make an Honor Roll")                                                      |
| B3  | `<i class="fa-solid fa-plus" inert></i> {{localize "l5r4.ui.browser.add"}}` (`templates/apps/compendium-browser-results.hbs:17`)                                                                            | `<i class="fas fa-plus"></i> {{localize "l5r4.ui.common.new"}}` (`templates/item/_partials/_tab-effects.hbs:6`)                |
| B4  | `{{> "systems/l5r4-enhanced/templates/cards/_partials/_roll-button.hbs" action="roll-skill" pool=system.rollFormula tooltip=(localize "l5r4.ui.mechanics.rolls.skillRoll")}}` (`templates/cards/skill.hbs`) | The container, label, and face written out in a card or sheet (modeled)                                                        |
| B5  | `pool=attackFormula` (`templates/cards/weapon.hbs`), `pool=attackPool` (the NPC sheet context, `module/sheets/npc-sheet.js`)                                                                                | `{{system.damageRoll}}k{{system.damageKeep}}` (modeled)                                                                        |
| B6  | `.l5r4-button-face:hover, .l5r4-button-face:focus-visible { animation: ... }` (modeled)                                                                                                                     | `&:hover { animation: mask-reverse-urban $mask-animation-duration steps(29) forwards; }` alone (modeled)                       |
| B7  | `.l5r4-button.-roll { border: var(--l5r4-border-width-thin) solid var(--l5r4-color-header); }` (`scss/components/_button.scss`)                                                                             | `.l5r4.pc .button-mask-container .button { ... }` (modeled)                                                                    |
| B8  | The roll face as a `<button>` on the PC sheet: an Observer sees it disabled, where today the `<a>` has no handler for them (`module/sheets/base-actor-sheet.js:113-115`)                                    | A `_toggleDisabled` override that re-enables the buttons core disabled, so a viewer presses controls that do nothing (modeled) |

## Do and don't

| Do                                                                    | Don't                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Use core's button for every labelled action that does not roll a pool | Style a core button to look like a roll button                      |
| Name the roll kind in `data-tooltip` ("Skill Roll", "Damage roll")    | Put the gesture in a tooltip ("Click to roll"), or use `title`      |
| Keep the pool string the context computed                             | Build `XkY` in the template, or show a pool in proportional figures |
| Keep one roll button per row cell                                     | Put a second action (edit, post) on a roll face                     |

## Names

| Current                              | Target                              | Why                                        |
| ------------------------------------ | ----------------------------------- | ------------------------------------------ |
| `button-mask-container`              | `l5r4-button -roll`                 | Decision 15: system classes carry `l5r4-`  |
| `mas`                                | `l5r4-button-under`                 | Decision 15                                |
| `a.button` face                      | `<button class="l5r4-button-face">` | B1                                         |
| `data-action="roll-weapon"` (damage) | `data-action="roll-weapon-damage"`  | Verb first, says what it rolls (naming.md) |

`data-action="test-fear"` stays: a game verb, already verb first (Stage 17 decision 16).

Fixed (Stage 17 decision 2): buttons inside posted chat cards keep their classes and actions, including
`l5r4-damage-button`, `apply-wounds-btn`, `reduce-wounds-btn`, `damage-actions`, `flow-actions`, and the card actions
listed in `docs/code-system/naming.md` **Fixed names**. They take core's button look and their own chat card pages.

Picked by majority: `<button type="button">` (35 of 36 buttons carry `type="button"`).
