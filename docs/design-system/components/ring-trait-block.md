# Ring and Trait block

The five Rings and eight Traits of a PC or NPC laid out as one figure: each Ring's medallion with its rank disc, and
its two Traits beside it as a roll button and a rank. The Void Ring sits at the centre with its rank control and, on a
PC, the Void Points below it.

| Item        | Detail                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Partial     | `templates/actor/_partials/_traits-rings.hbs` (target), composed of `templates/actor/_partials/_ring.hbs` (target), five uses, and `templates/actor/_partials/_trait.hbs` (target), eight uses; included by `_stats.hbs` and `_stats-npc.hbs`. Today the block is written out in both files (`_stats.hbs:46-234`, `_stats-npc.hbs:15-207`) |
| Parameters  | `_traits-rings.hbs`: `system`, `traitsEff` (effective Trait ranks), `showVoidPoints`. `_ring.hbs`: `ring` (`earth`, `air`, `water`, `fire`, `void`), `rank`. `_trait.hbs`: `trait` (`sta`, `wil`, `ref`, `awa`, `str`, `per`, `agi`, `int`), `ring`, `rank`                                                                                |
| SCSS        | `scss/features/_traits-rings.scss`                                                                                                                                                                                                                                                                                                         |
| Block class | `l5r4-traits-rings`                                                                                                                                                                                                                                                                                                                        |
| Shows in    | PC sheet header, NPC sheet header                                                                                                                                                                                                                                                                                                          |
| Game terms  | Ring, Trait, Void Ring, Void Point (`game-rules/25_rings_and_traits.md`, pp.76-78); Ring Roll, Trait Roll (`game-rules/29_types_of_rolls.md`, pp.79-80)                                                                                                                                                                                    |
| Composes    | `button.md` (Trait roll, `-roll -<ring>`), `rank-control.md` (Trait ranks, the Void Ring rank), `void-point-dots.md`                                                                                                                                                                                                                       |
| Gallery     | The whole block on a PC and an NPC, light and dark; each part hovered and focused; ranks 1, 5, and 10                                                                                                                                                                                                                                      |

## Anatomy

| Part           | Element                                                                                    | Class                                                 | Class now                                                          |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Block          | `<div>`, a 16-column grid                                                                  | `l5r4-traits-rings`                                   | `traits-rings` (`_stats.hbs:46`)                                   |
| Ring name      | `<h4>`                                                                                     | `l5r4-ring-name -<ring>`                              | `ring-name ring-name-<ring>` (`_stats.hbs:48`)                     |
| Ring medallion | `<div>` placing the image                                                                  | `l5r4-ring -<ring>`                                   | `<ring>-ring` (`_stats.hbs:50`)                                    |
| Ring roll      | `<button type="button" data-action="roll-ring" data-tooltip aria-label>` holding the image | `l5r4-ring-roll draggable`                            | `a.ring-roll.draggable` (`_stats.hbs:51`)                          |
| Ring image     | `<img alt="">`                                                                             | `l5r4-ring-image`                                     | `img.<ring>-ring-img` with `title` and no `alt` (`_stats.hbs:52`)  |
| Ring rank disc | `<span>` holding the face                                                                  | `l5r4-ring-rank -<ring>`                              | `h4.ring-rank.ring-rank-<ring>` (`_stats.hbs:49`)                  |
| Ring rank face | `<span>`                                                                                   | `l5r4-ring-rank-face`                                 | bare `span`                                                        |
| Trait row      | `<div>`                                                                                    | `l5r4-trait -<ring> -<trait>`                         | `trait trait-<name>` (`_stats.hbs:55`)                             |
| Trait roll     | The roll button, Ring variant                                                              | `l5r4-button -roll -<ring>`                           | `div.trait-roll.draggable` with two spans (`_stats.hbs:56-59`)     |
| Trait rank     | The rank control (`rank-control.md`)                                                       | `l5r4-rank-control -trait`                            | `span.trait-rank[role=button]` (`_stats.hbs:60-68`)                |
| Void Ring rank | The Ring rank disc holding a rank control                                                  | `l5r4-ring-rank -void` with `l5r4-rank-control -void` | `div.ring-rank.ring-rank-void[role=button]` (`_stats.hbs:205-213`) |
| Void Points    | `void-point-dots.md`                                                                       | `l5r4-void-points`                                    | `void-points` (`_stats.hbs:219-233`)                               |

Trait to Ring: Stamina and Willpower, Earth; Reflexes and Awareness, Air; Strength and Perception, Water; Agility and
Intelligence, Fire, as the sheet places them today (Trait keys in `module/config/reference-data.js:34`). Earth and Water
sit left of centre, roll then rank; Air and Fire sit right, mirrored, rank then roll. The rank is always the end
nearest its Ring.

## Variants

| Variant | Selects it                                                                                                   | Look                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Ring    | `-air`, `-water`, `-earth`, `-fire`, `-void`                                                                 | The Ring's hue on its rank disc, Trait roll, Trait rank, and the Trait row's band |
| Trait   | `-stamina`, `-willpower`, `-reflexes`, `-awareness`, `-strength`, `-perception`, `-agility`, `-intelligence` | The Trait row's grid position                                                     |
| PC      | `showVoidPoints` true                                                                                        | Void Points under the Void Ring                                                   |
| NPC     | `showVoidPoints` from `showNpcVoidPoints`                                                                    | Void Points only when the setting shows them (`_stats-npc.hbs:190`)               |

## States

| State           | Look                                                                                           | Markup                        |
| --------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| Rest            | As the captures show                                                                           |                               |
| Hover (Ring)    | `--l5r4-state-hover-filter` on the image                                                       | `:hover` on `l5r4-ring-roll`  |
| Focus-visible   | Core's focus ring around the medallion; on a Trait roll, its face (`button.md`)                | `:focus-visible`              |
| Active          | `--l5r4-state-pressed-filter` and `--l5r4-state-pressed-transform`                             | `:active`                     |
| Ring rank       | Read-only: a Ring other than Void derives from its Traits, so its disc is text with no control | Text in `l5r4-ring-rank-face` |
| Read-only sheet | Core disables the rolls and steps; that viewer has no actions bound today (`button.md` B8)     | Core's `disabled`             |

## Tokens

| Token                                                                                               | Use                                                                  |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `--l5r4-color-ring-air`, `-water`, `-earth`, `-fire`, `-void`                                       | Rank face border, Trait row band, Trait rank border                  |
| `--l5r4-color-ring-<ring>-tint`                                                                     | Ring rank face background                                            |
| `--l5r4-color-ring-<ring>-fill`                                                                     | Trait rank background                                                |
| `--l5r4-color-ring-text`                                                                            | Trait rank number, Trait roll label                                  |
| `--l5r4-color-ring-rank-face`, `--l5r4-color-ring-rank-backdrop`, `--l5r4-image-ring-rank-backdrop` | Ring rank disc and its parchment halo                                |
| `--l5r4-color-text`, `--l5r4-color-line`                                                            | Ring rank number, disc border                                        |
| `--l5r4-size-medallion`, `--l5r4-size-ring-rank`, `--l5r4-size-trait-rank`, `--l5r4-size-target`    | Image, disc and grid columns, Trait row, Ring name height            |
| `--l5r4-border-width-thin`, `--l5r4-border-width-thick`, `--l5r4-border-width-band`                 | Disc border, face ring, the Trait row's Ring band                    |
| `--l5r4-radius-round`                                                                               | Image, disc, face                                                    |
| `--l5r4-shadow-raised`, `--l5r4-shadow-drop`                                                        | Face, image                                                          |
| `--l5r4-layer-medallion`, `--l5r4-layer-raised`                                                     | Disc over image, face over halo                                      |
| `--l5r4-font-display`, `--l5r4-font-size-medallion`                                                 | Ring rank number                                                     |
| `--l5r4-space-8`, `calc(-1 * var(--l5r4-space-12))`                                                 | Second Trait offset, disc overlap on the Water, Fire, and Void Rings |
| `--l5r4-duration-fast`, `--l5r4-easing-standard`, `--l5r4-state-*`                                  | Hover and press                                                      |

The Ring images come from the `$<ring>-ring-img` SCSS variables (`scss/base/_variables.scss:27-31`). The 8 px gutter
columns and the 2 px divider row of the grid belong to this component only and stay literals.

Contrast (`foundations/color.md` **Contrast fixes**): `ring-text` on `ring-air` is 2.77:1 today and on
`ring-air-fill` in light 2.59:1; the Air target `#64798d` gives 4.51:1 and 3.97:1.

## Keyboard and screen reader

| Input          | Result                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tab            | Earth, Air, Water, Fire, Void in source order; for each Ring its roll, then each Trait's roll and rank controls       |
| Enter or Space | On a Ring or Trait roll: rolls with the check dialog                                                                  |
| Shift+Enter    | Rolls without the dialog, as Shift+click does                                                                         |
| Screen reader  | Ring name (level 4 heading); rank as text; Ring roll by its `aria-label` ("Roll Earth"); each Trait roll by its label |

## Long text

Ring names are one line within three grid columns (96 px). A Trait name is one line on its roll button; a translation
longer than its row truncates with an ellipsis and stays readable in the button's `data-tooltip`. Ranks are one or two digits
in a fixed box (`foundations/typography.md` **Numbers**).

## Rules

| #   | Rule                                                                                                                      | Enforced by                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| K1  | A Ring and a Trait are each one partial; the block is written once and both sheets include it                             | `tests/conventions/templates.test.js` (markup used twice)                      |
| K2  | The Ring is a modifier class (`-earth`), never part of the name (`ring-name-earth`, `earth-ring`)                         | `tests/conventions/styles.test.js` (`docs/code-system/naming.md` Ring variant) |
| K3  | Ring colors read the Ring's role tokens; transparency comes from the `-fill` and `-tint` tokens, never `rgb(var(...), a)` | `tests/conventions/styles.test.js` (`foundations/color.md` C5)                 |
| K4  | The Ring roll is a `<button>` named by `aria-label`, with the same key in `data-tooltip`; its image is `alt=""`           | `tests/conventions/templates.test.js`                                          |
| K5  | A Ring rank other than Void is text with no control                                                                       | Review                                                                         |
| K6  | Nesting stays at four levels or fewer; grid lines stay inside the 16 by 9 template                                        | Stylelint `max-nesting-depth`; review for grid lines                           |
| K7  | Comments in the markup are `{{!-- --}}`                                                                                   | `tests/conventions/templates.test.js`                                          |
| K8  | Hover uses the state tokens, not a scale of its own                                                                       | `tests/conventions/styles.test.js` (`foundations/states.md` rule 1)            |

| #   | Conforming                                                                                                                                                                                                                                                                                                                                                                                              | Non-conforming                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_trait.hbs" trait="sta" ring="earth" rank=@root.traitsEff.sta}}` (modeled)                                                                                                                                                                                                                                                                        | The Trait row written out eight times in `_stats.hbs:55-201` and again in `_stats-npc.hbs`                                              |
| K2  | `.l5r4-ring-name.-earth { grid-column: 5/8; }` (modeled on `_traits-rings.scss:393-397`)                                                                                                                                                                                                                                                                                                                | `.ring-name-earth` and `.earth-ring` (`scss/features/_traits-rings.scss:393`, `:399`)                                                   |
| K3  | `background-color: var(--l5r4-color-ring-earth-tint);` (`foundations/color.md` C5)                                                                                                                                                                                                                                                                                                                      | `background-color: rgb(var(--earth-ring-color), 0.1);` (`scss/features/_traits-rings.scss:116`)                                         |
| K4  | `<button type="button" class="l5r4-ring-roll draggable" data-action="roll-ring" data-system-ring="earth" data-tooltip="{{localize "l5r4.ui.mechanics.rolls.rollRing" ring=(localize "l5r4.ui.mechanics.rings.earth")}}" aria-label="{{localize "l5r4.ui.mechanics.rolls.rollRing" ring=(localize "l5r4.ui.mechanics.rings.earth")}}"><img class="l5r4-ring-image" src=... alt="" /></button>` (modeled) | `<a class="ring-roll draggable" data-action="roll-ring" ...><img ... title="..." /></a>` (`templates/actor/_partials/_stats.hbs:51-53`) |
| K5  | `<span class="l5r4-ring-rank -earth"><span class="l5r4-ring-rank-face">{{system.rings.earth}}</span></span>` (modeled)                                                                                                                                                                                                                                                                                  | A step control on the Earth rank (modeled)                                                                                              |
| K6  | `.l5r4-traits-rings .l5r4-trait.-air .l5r4-rank-control` (three levels)                                                                                                                                                                                                                                                                                                                                 | Six levels at `scss/features/_traits-rings.scss:235`; `grid-column: 1/18` in a 16-column grid (`:555`)                                  |
| K7  | `{{!-- Earth --}}`                                                                                                                                                                                                                                                                                                                                                                                      | `<!-- Earth ring -->` (`templates/actor/_partials/_stats.hbs:47`), which ships into the DOM                                             |
| K8  | `&:hover .l5r4-ring-image { filter: var(--l5r4-state-hover-filter); }` (modeled)                                                                                                                                                                                                                                                                                                                        | `&:hover img { transform: scale(1.1); }` (`scss/features/_traits-rings.scss:163-165`)                                                   |

## Do and don't

| Do                                                         | Don't                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| Keep the figure's layout as the captures show              | Rearrange Rings into a list; the figure is the sheet's identity |
| Show the effective Trait rank, as `traitsEff` gives it     | Show the stored base rank where players read the rank they roll |
| Give every Ring hue its pairings in `foundations/color.md` | Add a Ring-colored element without checking its contrast        |

## Names

| Current                                     | Target                                                               | Why                                       |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `traits-rings`                              | `l5r4-traits-rings`                                                  | Decision 15                               |
| `ring-name ring-name-<ring>`                | `l5r4-ring-name -<ring>`                                             | K2                                        |
| `<ring>-ring`, `<ring>-ring-img`            | `l5r4-ring -<ring>`, `l5r4-ring-image`                               | K2                                        |
| `ring-rank ring-rank-<ring>`                | `l5r4-ring-rank -<ring>`                                             | K2                                        |
| `trait trait-<name>`                        | `l5r4-trait -<ring> -<name>`                                         | K2                                        |
| `trait-awarness`                            | `-awareness`                                                         | Spelling                                  |
| `trait-reflex`                              | `-reflexes`                                                          | The Trait's name                          |
| `--air-ring-color` and the four others      | `--l5r4-color-ring-air` and the rest                                 | `foundations/color.md` **Renamed tokens** |
| `--l5r4-ring-rank-backdrop-color`, `-image` | `--l5r4-color-ring-rank-backdrop`, `--l5r4-image-ring-rank-backdrop` | `foundations/color.md` **Renamed tokens** |

`data-action="roll-ring"` and `roll-trait` already follow `docs/code-system/naming.md` and stay. Every class rename is
listed in `CHANGELOG.MD`.

## Keys this page needs

| Key                                | Value       | For                                     |
| ---------------------------------- | ----------- | --------------------------------------- |
| `l5r4.ui.mechanics.rolls.rollRing` | Roll {ring} | The Ring roll's name, one per Ring (K4) |
