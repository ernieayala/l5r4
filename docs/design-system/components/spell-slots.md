# Spell slots

A shugenja's spell slots left for each Ring, shown in the Spells section title: the Ring's image with the count over
it. A press adds a slot, a right-press uses one; the count stays between 0 and 9
(`module/sheets/handlers/pc-adjustment-handler.js:141`).

| Item        | Detail                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/actor/_partials/_spell-slot.hbs` (target), five uses in `_spell-section.hbs`. Today written out five times (`_spell-section.hbs:6-50`)    |
| Parameters  | `ring` (`water`, `air`, `fire`, `earth`, `void`), `count` (`system.spellSlots.<ring>`)                                                               |
| SCSS        | `scss/features/_spell-slots.scss` (target), holding `_sections.scss:39-70`                                                                           |
| Block class | `l5r4-spell-slots` on the group; `l5r4-spell-slot -<ring>` on each slot                                                                              |
| Handler     | `PcAdjustmentHandler.adjustSpellSlot` (`module/sheets/handlers/pc-adjustment-handler.js:126-154`), routed by `module/sheets/pc-sheet.js:211`, `:288` |
| Shows in    | The Spells section title on the PC sheet                                                                                                             |
| Game terms  | spell slot, lowercase in the book and the UI (`game-rules/66_magic_and_spell_casting.md, p.163`); Ring (`game-rules/25_rings_and_traits.md, p.76`)   |
| Gallery     | Counts 0, 1, and 9 per Ring; a slot hovered and focused; light and dark                                                                              |

## Anatomy

| Part  | Element                                                                                                   | Class                              | Class now                                                  |
| ----- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Group | `<div>` in the section title's tools                                                                      | `l5r4-spell-slots flexrow -gap-sm` | `flexrow -gap-sm spells` (`_spell-section.hbs:4`)          |
| Label | `<span>`, "Spell slots" and a colon                                                                       | `l5r4-spell-slots-label`           | bare `span` (`_spell-section.hbs:5`)                       |
| Slot  | `<div>`                                                                                                   | `l5r4-spell-slot -<ring>`          | `slots` (`_spell-section.hbs:6`)                           |
| Image | `<img alt="">`                                                                                            | `l5r4-spell-slot-image`            | `img` with `title` and no `alt` (`_spell-section.hbs:7`)   |
| Count | `<button type="button" data-action="adjust-spell-slot" data-path data-tooltip aria-label>` over the image | `l5r4-spell-slot-count`            | `span[data-action=spell-slot]` (`_spell-section.hbs:8-13`) |

## Variants

| Variant | Selects it                                   |
| ------- | -------------------------------------------- |
| Ring    | `-water`, `-air`, `-fire`, `-earth`, `-void` |

Order on the sheet: Water, Air, Fire, Earth, Void, as today.

## States

| State         | Look                                                                                     | Markup            |
| ------------- | ---------------------------------------------------------------------------------------- | ----------------- |
| Rest          | The count in the title bar's text color with a dark halo, on a scrim over the Ring image |                   |
| Hover         | `--l5r4-state-hover-filter`; pointer cursor                                              | `:hover`          |
| Focus-visible | Core's focus ring around the slot                                                        | `:focus-visible`  |
| Active        | `--l5r4-state-pressed-filter`, `--l5r4-state-pressed-transform`                          | `:active`         |
| Empty (0)     | The count reads `0`; the image stays                                                     | Text `0`          |
| At 0 or 9     | Nothing changes and the press does nothing, as today                                     | None              |
| Read-only     | Core disables the button on a sheet the viewer cannot edit (`button.md` B8)              | Core's `disabled` |

The cursor reads core's pointer, not the Shift-held cursor (`--conditional-cursor`), because a slot steps without Shift.

## Tokens

| Token                         | Use                                  |
| ----------------------------- | ------------------------------------ |
| `--l5r4-size-item-icon`       | Image and count box                  |
| `--l5r4-radius-round`         | Image and count box                  |
| `--l5r4-color-scrim`          | Overlay that keeps the count legible |
| `--l5r4-color-text-on-header` | Count text, from the title bar       |
| `--l5r4-shadow-text-halo`     | Halo around the count                |
| `--l5r4-space-gap-tight`      | Gap between slots (`-gap-sm`)        |
| `--l5r4-state-*`              | Hover, press, focus                  |

## Keyboard and screen reader

| Input                             | Result                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| Tab                               | Water, Air, Fire, Earth, Void                                               |
| Enter or Space                    | +1 slot                                                                     |
| Shift+F10 or the context menu key | -1 slot, through the same context action a right-click runs                 |
| Screen reader                     | Reads the `aria-label`: "Water spell slots: 3 (click: +1, right-click: -1)" |

## Long text

The count is one digit in a 32 px circle. The label "Spell slots" stays on one line in the title bar
(`foundations/typography.md` T7); at 420 px the heading, label, and five slots must fit beside the title buttons, which
the gallery checks.

## Rules

| #   | Rule                                                                                                                                         | Enforced by                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| P1  | Each count is a `<button type="button">` whose `data-tooltip` and `aria-label` read one key that names the Ring, the count, and the gestures | `tests/conventions/templates.test.js`; review for "one key"  |
| P2  | The image is decorative, `alt=""`; the count's `aria-label` names the Ring                                                                   | `tests/conventions/templates.test.js` (`alt` present)        |
| P3  | The slot is one partial                                                                                                                      | `tests/conventions/templates.test.js` (markup used twice)    |
| P4  | Colors and the halo read tokens                                                                                                              | Stylelint `color-no-hex`; `tests/conventions/styles.test.js` |
| P5  | "spell slot" is lowercase in copy, except as the first word of a label                                                                       | `tests/conventions/glossary.test.js`                         |

| #   | Conforming                                                                                                                                              | Non-conforming                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | `data-tooltip` and `aria-label` both `{{localize "l5r4.ui.sheets.spellSlotsOf" ring=(localize "l5r4.ui.mechanics.rings.water") count=count}}` (modeled) | `title="{{localize "l5r4.ui.mechanics.rings.water"}} ({{localize "l5r4.ui.hints.leftRightToAdjust"}})"`, two keys joined (`templates/actor/_partials/_spell-section.hbs:11`) |
| P2  | `<img class="l5r4-spell-slot-image" src="{{iconPath 'water.webp'}}" alt="" />` (modeled)                                                                | `<img src="{{iconPath 'water.webp'}}" title="..." />` with no `alt` (`templates/actor/_partials/_spell-section.hbs:7`)                                                       |
| P3  | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_spell-slot.hbs" ring="water" count=system.spellSlots.water}}` (modeled)                          | Five copies of the slot (`templates/actor/_partials/_spell-section.hbs:6-50`)                                                                                                |
| P4  | `background: var(--l5r4-color-scrim); text-shadow: var(--l5r4-shadow-text-halo);` (modeled)                                                             | `background: rgb(0 0 0 / 40%); text-shadow: 1px 1px 1px #000, -1px -1px 1px #000;` (`scss/components/_section.scss:55-66`)                                                   |
| P5  | "All spell slots restored to maximum" (`lang/en.json:988`)                                                                                              | "Spell Slots" (`lang/en.json:747`)                                                                                                                                           |

## Do and don't

| Do                                                     | Don't                                                 |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Keep the slots in the Spells title, where casters look | Move them into the spell rows                         |
| Let a cast use a slot through the check dialog         | Make the slot count the only place a cast is recorded |

## Names

| Current                    | Target                            | Why                                       |
| -------------------------- | --------------------------------- | ----------------------------------------- |
| `spells`                   | `l5r4-spell-slots`                | Decision 15                               |
| `slots`                    | `l5r4-spell-slot -<ring>`         | Decision 15; Ring as a modifier           |
| `data-action="spell-slot"` | `data-action="adjust-spell-slot"` | Verb first (`docs/code-system/naming.md`) |

Fixed (Stage 17 decision 2): `system.spellSlots.<ring>`, which `data-path` names.

## Keys this page needs

| Key                           | Value                                                    | For                                  |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `l5r4.ui.sheets.spellSlotsOf` | {ring} spell slots: {count} (click: +1, right-click: -1) | P1's `data-tooltip` and `aria-label` |

`l5r4.ui.sheets.spellSlots` keeps its key; its value becomes "Spell slots" (P5).
