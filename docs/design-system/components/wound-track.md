# Wound track

The actor's Wound Ranks as a table: each rank's name, its penalty, the Wounds it holds up to, and a mark on the rank the actor is at now. On a sheet the track is read-only; in the wound configuration window an NPC's manual track is edited in place.

| Item | Detail |
| --- | --- |
| Partial | `templates/actor/_partials/_wound-track.hbs`, included by `_wounds.hbs` and `templates/apps/wound-config.hbs` |
| Parameters | `levels` (`system.woundLevels`, or `system.visibleWoundLevels` on an NPC), `editable` (the wound configuration window's manual track) |
| SCSS | `scss/features/_wound-track.scss` |
| Block class | `l5r4-wound-track` |
| Shows in | The Wounds section of the PC and NPC sidebar (`_wounds.hbs`), inside a full-row grid cell (`grid.md`); the wound configuration window |
| Game terms | Wound, Wound Rank (`game-rules/33_wounds.md, p.82`; `game-rules/34_ambush_falling_drowning.md, p.84`) |
| Gallery | A PC track at Healthy, at a middle rank, and at the last rank; an NPC track; the editable track; light and dark |

The section around the track is a compact section (`section.md`) and a grid (`grid.md`): Wounds suffered, the heal rate on a PC, and maximum Wounds on an NPC with a manual track.

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Track | `<div role="table" aria-label>`, named "Wound Ranks" (`l5r4.ui.sheets.woundLevels`) | `l5r4-grid-value -full l5r4-wound-track`: a full grid row |
| Header row | `<div role="row">`, `display: contents` | `l5r4-wound-track-row -head` |
| Column head | `<span role="columnheader">` | `l5r4-wound-track-head` |
| Row | `<div role="row">`, `display: contents`; `aria-current="true"` on the actor's rank | `l5r4-wound-track-row`; `is-current` mirrors it |
| Cell | `<div role="cell">` | `l5r4-wound-track-cell` |
| Current mark | `<i class="fa-solid fa-check" inert>` in the last cell of the current row | core Font Awesome |

`display: contents` lets the row element group its cells for assistive technology while the four-column grid lays the cells out.

Columns: Wound Rank, penalty, threshold, current. Rank names come from `l5r4.ui.mechanics.wounds.<rank>`.

## Variants

| Variant | Selects it | Cells |
| --- | --- | --- |
| Sheet | `editable` false | Text; the current mark on one row |
| Editable | `editable` true | Penalty and threshold are number inputs, the last column an "active" checkbox (the `{{#if editable}}` branch of `templates/actor/_partials/_wound-track.hbs`) |

## States

| State | Look | Markup |
| --- | --- | --- |
| Rest | Column heads on `--l5r4-color-panel`; a line under every row |  |
| Current rank | The rank's name in bold and the check mark in its last cell: weight and an icon, not color alone | `aria-current="true"`; `is-current` for CSS |
| Healthy | Its penalty cell shows `0`: Healthy carries no penalty (CLAUDE.md **Domain Invariants**, Wound Ranks) | Text |
| Focus-visible | Editable variant: the focused input shows core's field outline | `:focus` |
| Read-only | Sheet variant is text; a sheet the viewer cannot edit changes nothing here | Text |
| Empty | Not shown: an actor always has its Wound Ranks |  |

## Tokens

| Token                                           | Use                    |
| ----------------------------------------------- | ---------------------- |
| `--l5r4-color-panel`                            | Column head background |
| `--l5r4-color-line`, `--l5r4-border-width-thin` | Row lines              |
| `--l5r4-color-text`                             | Cell text              |
| `--l5r4-font-label`, `--l5r4-font-size-label`   | Column heads           |
| `--l5r4-space-4`                                | Cell padding           |

Numbers in the penalty and threshold columns use tabular figures (`foundations/typography.md` T5).

Two exceptions Ernie kept, each for its look (Stage 17 decision 9; `foundations/space-and-size.md`):

| Exception | Why |
| --- | --- |
| Rows are 25 px high, a literal in place of `--l5r4-size-target` (24 px) | The token would take 1 px off each of the eight rows, 8 px off the track |
| The wound configuration window's manual table keeps its own look, outside the grid's frame (`scss/components/_grid.scss`) | The frame would make each row 3 px shorter and its text 2 px larger |

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Sheet: the track takes no focus. Editable: penalty, threshold, then active, row by row |
| Screen reader | "Wound Ranks, table, 4 columns." Each row reads its cells; the current row adds "current". An editable input reads its row's rank and its column ("Nicked penalty") from `aria-label` |

## Long text

Rank names wrap inside the first column, which takes the free width (`1fr`); the number columns are as wide as their content (`min-content`). Column heads stay on one line.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| W1 | The current rank shows by weight and an icon, and states itself with `aria-current` | Review, in the gallery (`docs/design-system/README.md` principle 4) |
| W2 | A computed cell is text; the sheet track holds no disabled inputs | Review (`foundations/states.md` rule 6) |
| W3 | The UI says Wound Rank; code and keys keep the stored `woundLevel` stem | `tests/conventions/glossary.test.js` |
| W4 | A penalty above 0 carries its sign (`+5`); a threshold does not | Review (`content/voice.md` **Numbers and dice**) |
| W5 | The track is one partial, used by the sheet and the wound configuration window | `tests/conventions/templates.test.js` (markup used twice) |
| W6 | A formula a tooltip shows is one localized key with placeholders, never text or fragments joined in the markup | `tests/conventions/templates.test.js` (no text outside `{{localize}}`), review |
| W7 | Each input in the editable track has a name built from its row and column | Review, in the gallery |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| W1 | `aria-current="true"` on the current row, with `is-current` for the bold name and `fa-check` in its last cell (`templates/actor/_partials/_wound-track.hbs`) | A disabled checked checkbox as the mark (modeled) |
| W2 | `<div class="l5r4-wound-track-cell" role="cell">{{lvl.value}}</div>` (`templates/actor/_partials/_wound-track.hbs`) | A disabled checkbox as the current mark (modeled) |
| W3 | Column head "Wound Rank" from `l5r4.ui.mechanics.wounds.woundLevel` (`lang/en.json`) | A column head "Level" or "Wound Levels" (modeled) |
| W4 | `+3` in the penalty column: `{{numberFormat lvl.penaltyEff sign=true}}`, Healthy's `0` left unsigned (`templates/actor/_partials/_wound-track.hbs`) | `3` with no sign, the bare number `prepareWoundPenalties` (`module/documents/actor/calculations/wound-system.js`) gives (modeled) |
| W5 | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_wound-track.hbs" levels=system.woundLevels editable=false}}` (`templates/actor/_partials/_wounds.hbs`) | The PC and NPC loops written out in the sheet partial and again in the wound configuration window (modeled) |
| W6 | The heal rate label's tooltip in `templates/actor/_partials/_wounds.hbs`: one key, `l5r4.ui.mechanics.wounds.healRateBreakdown` (`lang/en.json`), with `{sta}`, `{rank}`, and `{mod}` | The same formula written out in the template, `× 2 +` between two values (modeled) |
| W7 | `aria-label="{{localize "l5r4.ui.mechanics.wounds.penaltyOf" rank=(localize (concat "l5r4.ui.mechanics.wounds." name))}}"` (`templates/actor/_partials/_wound-track.hbs`) | The penalty input with no `aria-label` (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Show every Wound Rank the actor has, Healthy first | Hide ranks above the current one |
| Mark one current rank | Mark the ranks already passed |
| Keep the penalty the context computed | Compute a penalty or threshold in the template |

## Names

Fixed (Stage 17 decision 2): the stored `woundLevels`, `woundLevel`, and `manualWoundLevels` fields and the wound setting keys. The copy says Wound Rank; the code keeps `woundLevel` (Stage 17 decision 15).

The editable inputs' names are `l5r4.ui.mechanics.wounds.penaltyOf`, `thresholdOf`, and `activeOf` ("{rank} penalty"); the current row states itself through `aria-current`, so its inert check mark needs no name.

`fa-check` is the "Current Wound Rank" row in `foundations/iconography.md` rule 3.
