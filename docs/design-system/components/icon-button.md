# Icon button

A button that shows only an icon and names its action in a tooltip. It sits where space is short and the action is
common: a section title's add, configure, and heal controls, the PC header's XP control, an app's toolbar.

| Item        | Detail                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Partial     | None for the general case: one element. `templates/actor/_partials/_unified-item-create.hbs` is the add-item instance, used 11 times |
| Parameters  | `_unified-item-create.hbs`: none; it reads the section from the enclosing `data-scope`                                               |
| SCSS        | None of its own: core's `.inline-control.icon` (`foundry2.css`, `--button-size: 24px`) draws it; the enclosing block sets its color  |
| Block class | None. Core's `inline-control icon`; the enclosing block's element class when that block styles it                                    |
| Shows in    | Section titles (`_combat.hbs`, `_armor.hbs`, `_wounds.hbs`, `_item-section.hbs`, every `*-section.hbs`), the PC header, apps         |
| Gallery     | One per meaning in `foundations/iconography.md` rule 3, in every state below, light and dark                                         |

## Anatomy

| Part   | Element                                                                                    | Class                 | Class now                                |
| ------ | ------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------- |
| Button | `<button type="button" data-tooltip="{{localize "..."}}" aria-label="{{localize "..."}}">` | `inline-control icon` | `<a class="button inline-control icon">` |
| Icon   | `<i class="fa-solid fa-<name>" inert>`                                                     | core Font Awesome     | `fas fa-<name>` with no `inert`          |

## Variants

| Variant      | Where                                 | Visible                      |
| ------------ | ------------------------------------- | ---------------------------- |
| Section tool | Inside `l5r4-section-title`           | Always                       |
| Field tool   | After a value in the PC header (XP)   | Always                       |
| Row tool     | Inside a row: see `inline-control.md` | On hover and `:focus-within` |

A row tool follows this page for its element, name, and icon, and `inline-control.md` for when it shows.

## States

| State         | Look                                                                                      | Markup                         |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| Rest          | Core's transparent inline control; the icon in the enclosing text color                   |                                |
| Hover         | Core's hover                                                                              | `:hover`                       |
| Focus-visible | Core's focus ring: `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow`              | `:focus-visible`               |
| Active        | Core's pressed look                                                                       | `:active`                      |
| Disabled      | Core's disabled `.inline-control` (`opacity: 0.75`, subtle text); `data-tooltip` says why | `disabled`                     |
| Read-only     | Core disables it on a sheet the viewer cannot edit (`button.md` B8)                       | Core's `disabled`              |
| Loading       | The icon becomes `fa-spinner fa-spin` and the button is disabled until the action ends    | `aria-busy="true"`, `disabled` |

## Tokens

| Token                                                     | Use                                                   |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `--l5r4-color-text-on-header`                             | Icon color inside a section title (the title sets it) |
| `--l5r4-size-target`                                      | The 24 px minimum, which core's `--button-size` meets |
| `--l5r4-state-focus-outline`, `--l5r4-state-focus-shadow` | Focus ring where core's does not reach                |

## Keyboard and screen reader

| Input          | Result                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Tab            | Focuses the button                                                     |
| Enter or Space | Runs the action                                                        |
| Screen reader  | Reads `aria-label` as the button's name: "Add item", "Configure armor" |

## Long text

The button has no visible text. Its tooltip is a short verb phrase (`content/voice.md` **Tooltips**); core's tooltip
wraps a long translation.

## Rules

| #   | Rule                                                                                                                                       | Enforced by                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| I1  | An icon-only control is a `<button type="button">` with `data-tooltip` and `aria-label` from one key, never `title` (Stage 17 decision 16) | `tests/conventions/templates.test.js`; `tests/quench/design-gallery.js` (accessible names) |
| I2  | The icon is `fa-solid`, its canonical Font Awesome 7 name, and `inert`                                                                     | `tests/conventions/templates.test.js`                                                      |
| I3  | One icon per meaning, as `foundations/iconography.md` rule 3 lists                                                                         | `tests/conventions/design-system.test.js`; review                                          |
| I4  | The tooltip is a verb phrase in sentence case with no period and no gesture ("Click to")                                                   | `tests/lang.test.js`; review                                                               |
| I5  | The button is at least 24 by 24 px: core's `inline-control` size, never shrunk                                                             | Review, in the gallery                                                                     |

| #   | Conforming                                                                                                                                                                                                                                                       | Non-conforming                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | `<button type="button" class="inline-control icon" data-action="apply-healing" data-tooltip="{{localize "l5r4.ui.mechanics.wounds.applyHealingTitle"}}" aria-label="{{localize "l5r4.ui.mechanics.wounds.applyHealingTitle"}}">` (modeled on `_wounds.hbs:4-10`) | `<a class="button inline-control icon" data-action="xp-modal"><i class="fas fa-chart-line"></i></a>` (`templates/actor/_partials/_stats.hbs:35`): no name, no focus |
| I2  | `<i class="fa-solid fa-gear" inert></i>`                                                                                                                                                                                                                         | `<i class="fas fa-cog"></i>` (`templates/actor/_partials/_wounds.hbs:16`)                                                                                           |
| I3  | `fa-gear` for every configuration window: armor, wounds, combat                                                                                                                                                                                                  | `fa-scroll` for the ledger (`_ranks.hbs:64`), which iconography gives `fa-book-bookmark`                                                                            |
| I4  | "Post to chat" (`lang/en.json:774`)                                                                                                                                                                                                                              | "Click to test Fear against selected characters" (`lang/en.json:555`)                                                                                               |
| I5  | Core's `--button-size: 24px` on `.inline-control`                                                                                                                                                                                                                | A rule that sets `width: 16px` on an icon button (modeled)                                                                                                          |

## Do and don't

| Do                                                          | Don't                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| Use an icon button only for a meaning iconography.md lists  | Invent an icon for a one-off action; give it a label instead |
| Put one key in both `data-tooltip` and `aria-label`         | Leave the name to the icon, or use `title`                   |
| Keep the icon button's place in its row when it is disabled | Remove a disabled icon button, shifting its neighbours       |

## Names

| Current                                                                                | Target                                                                                   | Why                                                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `<a class="button inline-control icon">`                                               | `<button type="button" class="inline-control icon">`                                     | I1; core's `button` class styles an `<a>` as a button, which a `<button>` does not need |
| `data-action="xp-modal"`                                                               | `data-action="open-xp-manager"`                                                          | `docs/code-system/naming.md`                                                            |
| `data-action="armor-config"`, `wound-config`, `combat-config`, `condition-manager`     | `open-armor-config`, `open-wound-config`, `open-combat-config`, `open-condition-manager` | `open-*` opens a window (naming.md)                                                     |
| `data-action="item-create"`                                                            | `data-action="create-item"`                                                              | Verb first (naming.md)                                                                  |
| `title` on the icon buttons that have a name (`_wounds.hbs:4-10`, `_armor.hbs:8`, ...) | `data-tooltip` and `aria-label`                                                          | I1                                                                                      |
| `data-tooltip` alone (`_item-section.hbs:19`)                                          | `data-tooltip` and `aria-label`                                                          | I1                                                                                      |

The tooltip form is Stage 17 decision 16, in place of the `title` most templates use today (102 against 7
`data-tooltip`).

## Keys this page needs

| Key                             | Value               | For                                                    |
| ------------------------------- | ------------------- | ------------------------------------------------------ |
| `l5r4.ui.sheets.openXpManager`  | Open the XP manager | `_stats.hbs:35`, which has no name                     |
| `l5r4.ui.sheets.configureArmor` | Configure armor     | `_armor.hbs:5-11`, whose title "Armor" names no action |

`l5r4.ui.sheets.addItem` keeps its key; its value becomes "Add item" (`content/voice.md` **Letter case**).
