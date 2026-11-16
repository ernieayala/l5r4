# Initiative block

The sidebar block for a skirmish: the current stance, the Initiative pool with its Void toggle, and movement. It is a compact section over a grid, with a stance select, a computed pool, and a button that switches the movement shown.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_combat.hbs` |
| Parameters | The sheet context: `config.stances`, `currentStance`, `system.initiative`, `system.rings.void.rank`, `system.movement`; C1 adds `initiativeFormula`, which the context does not pass |
| SCSS | None of its own: `section.md` and `grid.md` draw it |
| Block class | `l5r4-combat` on the section |
| Shows in | PC sidebar (`templates/actor/pc.hbs`), NPC sidebar (`templates/actor/npc.hbs`) |
| Game terms | Initiative (`game-rules/31_combat_round.md, p.81`); Stance (`game-rules/36_stances.md, p.84`); Void Point (`game-rules/25_rings_and_traits.md, p.78`) |
| Gallery | Each stance; Void toggle off and on; Void Ring 0 (no toggle); Simple and Free movement |

## Anatomy

| Part | Element | Class | Where the code differs |
| --- | --- | --- | --- |
| Section | `<section>` | `l5r4-section l5r4-combat` |  |
| Title bar | Compact section title with the condition manager and combat configuration icon buttons | `l5r4-section-title -compact` |  |
| Grid | `grid.md` | `l5r4-grid` |  |
| Stance | `<select data-action="apply-stance" aria-label>` in a value cell | none | No `aria-label`: `<select data-action="apply-stance">` (`templates/actor/_partials/_combat.hbs`) |
| Initiative pool | `<span>` with the pool string | `l5r4-combat-initiative` | A bare `div` in the Initiative value cell |
| Void toggle | `<input type="checkbox" name="system.initiative.useVoid" data-action="toggle-initiative-void" data-tooltip aria-label>` after the pool, only with a Void Ring above 0 | none | No `aria-label`: `data-action="toggle-initiative-void"` (`templates/actor/_partials/_combat.hbs`) |
| Movement | Text with the unit, then a core button that switches Simple and Free | none | The text sits in a bare `div`; the button is `data-action="toggle-movement-type"` (`templates/actor/_partials/_combat.hbs`) |
| Maximum | Text with the unit | none | A bare `l5r4-grid-value` div after the `l5r4.character.movement.maximum` (`templates/actor/_partials/_combat.hbs`) label |

## Variants

| Variant | Selects it | Shows |
| --- | --- | --- |
| With Void toggle | `system.rings.void.rank` above 0 | The checkbox after the pool |
| Without | Void Ring 0 | The pool alone |
| Simple movement | `system.movement.showSimple` | Simple Action movement; the button reads Simple |
| Free movement | Not `showSimple` | Free Action movement; the button reads Free |

## States

| State | Look | Markup |
| --- | --- | --- |
| Rest | Grid rest look |  |
| Void on | Checked box; the pool string the context passes includes the Void bonus | `checked` |
| Focus-visible | Core's focus look on the select, the checkbox, and the button | `:focus-visible` |
| Disabled | Core's disabled look on a sheet the viewer cannot edit | Core's `disabled` |
| Movement mode | The button's text names the mode shown: text, not color, carries it | The label |

## Tokens

None of its own. The section and grid tokens apply (`section.md`, `grid.md`). The pool uses tabular figures (`foundations/typography.md` T5).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Title bar buttons, stance select, Void toggle, movement button |
| Arrow keys | Change the stance in the select (core); the sheet applies it on change |
| Space | Toggles Void; presses the movement button |
| Screen reader | The stance select reads its `aria-label` ("Current stance"); the pool reads as text after its label; the checkbox reads its `aria-label` ("Use Void") |

## Long text

Stance names in the select are the book's names and can run long; the select takes its cell's width and shows the full name in its open list. The pool string is short (`5k3+10`). Movement values carry their unit after the number.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| C1 | The Initiative pool arrives as one computed string; the template does no arithmetic | Review (`docs/code-system/templates-and-styles.md`) |
| C2 | The pool follows `content/voice.md` **Numbers and dice**: `XkY`, a lowercase `k`, the bonus signed with no space | `tests/lang.test.js` for strings; review for pools built in code |
| C3 | The stance select and the Void checkbox have accessible names | Review, in the gallery |
| C4 | A toggle with no visible label carries `data-tooltip` and `aria-label` from one key, never `title`; a toggle with a visible label uses a `<label>` | `tests/conventions/templates.test.js`; review |
| C5 | A file that compiles to nothing is removed | `tests/conventions/styles.test.js` |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| C1 | `<span class="l5r4-combat-initiative">{{initiativeFormula}}</span>` (modeled) | `{{system.initiative.roll}}k{{system.initiative.keep}}+{{#if system.initiative.useVoid}}{{math system.initiative.totalMod "+" 10}}{{else}}...`, the Initiative value cell of `templates/actor/_partials/_combat.hbs` |
| C2 | `5k3+2` (`content/voice.md`) | `5k3+-2`, which the template's literal `+` gives for a negative total (the same cell) |
| C3 | `<select data-action="apply-stance" aria-label="{{localize "l5r4.character.stance.current"}}">` (modeled) | `<select data-action="apply-stance">` (`templates/actor/_partials/_combat.hbs`) with no name |
| C4 | `<input type="checkbox" ... data-tooltip="{{localize "l5r4.ui.mechanics.rings.voidInitBoost"}}" aria-label="{{localize "l5r4.ui.mechanics.rings.voidInitBoost"}}" />` (modeled on the Void toggle of `templates/actor/_partials/_combat.hbs`) | The Void toggle, `data-action="toggle-initiative-void"` (`templates/actor/_partials/_combat.hbs`), with `data-tooltip` and no `aria-label` |
| C5 | The block styled by `_section.scss` and `_grid.scss` alone | A stylesheet of the block's own that holds only comments (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Show the pool the actor rolls, Void bonus included when on | Show the parts and leave the sum to the reader |
| Apply a stance on change, as the sheet does | Add an Apply button the select does not need |
| Keep movement in feet with its unit | Drop the unit to save width |

## Names

The stance select's action is `apply-stance` (`apply*` changes, `docs/code-system/naming.md`); the title bar's buttons are `open-condition-manager` and `open-combat-config`. The stance select's name is `l5r4.character.stance.current`, "Current stance" (`content/voice.md` **Letter case**; stance is lowercase when generic).

Fixed (Stage 17 decision 2): `system.initiative.useVoid` and the other `system` fields, the stance status effect ids.
