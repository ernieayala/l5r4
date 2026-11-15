# Wound track

The actor's Wound Ranks as a table: each rank's name, its penalty, the Wounds it holds up to, and a mark on the rank
the actor is at now. On a sheet the track is read-only; in the wound configuration window an NPC's manual track is
edited in place.

| Item        | Detail                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/actor/_partials/_wound-track.hbs` (target), included by `_wounds.hbs` and `templates/apps/wound-config.hbs`. Today written out in `_wounds.hbs:43-71` and `wound-config.hbs:63-76` |
| Parameters  | `levels` (`system.woundLevels`, or `system.visibleWoundLevels` on an NPC), `editable` (the wound configuration window's manual track)                                                         |
| SCSS        | `scss/features/_wound-track.scss` (target), the rename of `scss/features/_wounds.scss`                                                                                                        |
| Block class | `l5r4-wound-track`                                                                                                                                                                            |
| Shows in    | The Wounds section of the PC and NPC sidebar (`_wounds.hbs`), inside a full-row grid cell (`grid.md`); the wound configuration window                                                         |
| Game terms  | Wound, Wound Rank (`game-rules/33_wounds.md, p.82`; `game-rules/34_ambush_falling_drowning.md, p.84`)                                                                                         |
| Gallery     | A PC track at Healthy, at a middle rank, and at the last rank; an NPC track; the editable track; light and dark                                                                               |

The section around the track is a compact section (`section.md`) and a grid (`grid.md`): Wounds suffered, the heal
rate on a PC, and maximum Wounds on an NPC with a manual track.

## Anatomy

| Part         | Element                                                                            | Class                                           | Class now                                      |
| ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Track        | `<div role="table" aria-label>`                                                    | `l5r4-wound-track`                              | `wound-grid` (`_wounds.hbs:43`)                |
| Header row   | `<div role="row">`, `display: contents`                                            | `l5r4-wound-track-row -head`                    | none: the four `<span>` are grid children      |
| Column head  | `<span role="columnheader">`                                                       | `l5r4-wound-track-head`                         | bare `span` (`_wounds.hbs:44-47`)              |
| Row          | `<div role="row">`, `display: contents`; `aria-current="true"` on the actor's rank | `l5r4-wound-track-row`; `is-current` mirrors it | none                                           |
| Cell         | `<div role="cell">`                                                                | `l5r4-wound-track-cell`                         | bare `div` (`_wounds.hbs:50-57`)               |
| Current mark | `<i class="fa-solid fa-check" inert>` in the last cell of the current row          | core Font Awesome                               | a disabled checked checkbox (`_wounds.hbs:55`) |

`display: contents` lets the row element group its cells for assistive technology while the four-column grid lays
the cells out as it does now.

Columns: Wound Rank, penalty, threshold, current. Rank names come from `l5r4.ui.mechanics.wounds.<rank>`.

## Variants

| Variant  | Selects it       | Cells                                                                                                    |
| -------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Sheet    | `editable` false | Text; the current mark on one row                                                                        |
| Editable | `editable` true  | Penalty and threshold are number inputs, the last column an "active" checkbox (`wound-config.hbs:71-73`) |

## States

| State         | Look                                                                                                            | Markup                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Rest          | Column heads on `--l5r4-color-panel`; a line under every row                                                    |                                             |
| Current rank  | The rank's name in bold and the check mark in its last cell: weight and an icon, not color alone                | `aria-current="true"`; `is-current` for CSS |
| Healthy       | Its penalty cell shows `0`, as today: Healthy carries no penalty (CLAUDE.md **Domain Invariants**, Wound Ranks) | Text                                        |
| Focus-visible | Editable variant: the focused input shows core's field outline                                                  | `:focus`                                    |
| Read-only     | Sheet variant is text; a sheet the viewer cannot edit changes nothing here                                      | Text                                        |
| Empty         | Not shown: an actor always has its Wound Ranks                                                                  |                                             |

## Tokens

| Token                                           | Use                    |
| ----------------------------------------------- | ---------------------- |
| `--l5r4-color-panel`                            | Column head background |
| `--l5r4-color-line`, `--l5r4-border-width-thin` | Row lines              |
| `--l5r4-color-text`                             | Cell text              |
| `--l5r4-font-label`, `--l5r4-font-size-label`   | Column heads           |
| `--l5r4-size-target`                            | Row height             |
| `--l5r4-space-4`                                | Cell padding           |

Numbers in the penalty and threshold columns use tabular figures (`foundations/typography.md` T5). The row height
reads `--l5r4-size-target` (24 px), the nearest size to today's 25 px (`foundations/space-and-size.md`).

## Keyboard and screen reader

| Input         | Result                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab           | Sheet: the track takes no focus. Editable: penalty, threshold, then active, row by row                                                                                                |
| Screen reader | "Wound Ranks, table, 4 columns." Each row reads its cells; the current row adds "current". An editable input reads its row's rank and its column ("Nicked penalty") from `aria-label` |

## Long text

Rank names wrap inside the first column, which takes the free width (`1fr`); the number columns are as wide as their
content (`min-content`). Column heads stay on one line.

## Rules

| #   | Rule                                                                                | Enforced by                                                            |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| W1  | The current rank shows by weight and an icon, and states itself with `aria-current` | Review, in the gallery (`docs/design-system/README.md` principle 4)    |
| W2  | A computed cell is text; the sheet track holds no disabled inputs                   | Review (`foundations/states.md` rule 6)                                |
| W3  | The UI says Wound Rank; code and keys keep the stored `woundLevel` stem             | `tests/conventions/glossary.test.js`                                   |
| W4  | A penalty above 0 carries its sign (`+5`); a threshold does not                     | Review (`content/voice.md` **Numbers and dice**)                       |
| W5  | The track is one partial, used by the sheet and the wound configuration window      | `tests/conventions/templates.test.js` (markup used twice)              |
| W6  | No formula in the markup: a tooltip never restates how a value is worked out        | `tests/conventions/templates.test.js` (no text outside `{{localize}}`) |
| W7  | Each input in the editable track has a name built from its row and column           | Review, in the gallery                                                 |

| #   | Conforming                                                                                                                           | Non-conforming                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| W1  | `<div role="row" class="l5r4-wound-track-row is-current" aria-current="true">` with bold name and `fa-check` (modeled)               | `<input type="checkbox" disabled {{checked current}} data-type="Boolean" />` (`templates/actor/_partials/_wounds.hbs:55`)         |
| W2  | `<div role="cell" class="l5r4-wound-track-cell">{{value}}</div>` (modeled on `_wounds.hbs:52`)                                       | A disabled checkbox as the current mark (`_wounds.hbs:65-67`)                                                                     |
| W3  | Column head "Wound Rank" from `l5r4.ui.mechanics.wounds.woundLevel` (key kept, value rewritten)                                      | Its value today, "Level" (`lang/en.json:503`); "Wound Levels" (`lang/en.json:746`)                                                |
| W4  | `+3` in the penalty column (modeled)                                                                                                 | `3` with no sign: `{{penaltyEff}}` (`_wounds.hbs:51`) is a bare number (`module/documents/actor/calculations/wound-system.js:93`) |
| W5  | `{{> "systems/l5r4-enhanced/templates/actor/_partials/_wound-track.hbs" levels=system.woundLevels}}` (modeled)                       | The PC and NPC loops written out twice in `_wounds.hbs:48-70` and a third time in `templates/apps/wound-config.hbs:64-75`         |
| W6  | `<span>{{localize "l5r4.ui.mechanics.wounds.woundHealRate"}}</span>` (`_wounds.hbs:29`)                                              | `title="(Stamina × 2) + Insight Rank + Modifier = ..."` in English in the template (`templates/actor/_partials/_wounds.hbs:29`)   |
| W7  | `aria-label="{{localize "l5r4.ui.mechanics.wounds.penaltyOf" rank=(localize (concat "l5r4.ui.mechanics.wounds." name))}}"` (modeled) | `<input type="number" name="manualWoundLevels.{{name}}.penalty" ...>` with no name (`templates/apps/wound-config.hbs:71`)         |

W6's tooltip goes; whether the heal rate explains itself in a hint is a copy question for `content/voice.md`.

## Do and don't

| Do                                                 | Don't                                          |
| -------------------------------------------------- | ---------------------------------------------- |
| Show every Wound Rank the actor has, Healthy first | Hide ranks above the current one               |
| Mark one current rank                              | Mark the ranks already passed                  |
| Keep the penalty the context computed              | Compute a penalty or threshold in the template |

## Names

| Current                                     | Target                                     | Why                                                    |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `wounds` (section root)                     | `l5r4-section -compact` around the grid    | `section.md`                                           |
| `wound-grid`                                | `l5r4-wound-track`                         | Decision 15                                            |
| `scss/features/_wounds.scss`                | `scss/features/_wound-track.scss` (target) | The file takes its block's name                        |
| `wound-config-app` scope (`_wounds.scss:8`) | none: the track's block class scopes it    | One block, styled the same in the sheet and the window |

Fixed (Stage 17 decision 2): the stored `woundLevels`, `woundLevel`, and `manualWoundLevels` fields and the wound
setting keys. The copy says Wound Rank; the code keeps `woundLevel` (Stage 17 decision 15).

## Keys this page needs

| Key                                    | Value              | For                                       |
| -------------------------------------- | ------------------ | ----------------------------------------- |
| `l5r4.ui.mechanics.wounds.penaltyOf`   | {rank} penalty     | Editable penalty input name (W7)          |
| `l5r4.ui.mechanics.wounds.thresholdOf` | {rank} threshold   | Editable threshold input name             |
| `l5r4.ui.mechanics.wounds.activeOf`    | {rank} active      | Editable active checkbox name             |
| `l5r4.ui.mechanics.wounds.current`     | Current Wound Rank | `aria-label` context for the current mark |

`fa-check` is the "Current Wound Rank" row in `foundations/iconography.md` rule 3.
