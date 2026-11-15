# Armor TN block

The sidebar block that shows how hard the actor is to hit and how much damage armor stops: Armor TN and Reduction. On
a PC both are computed and the Armor TN has a Void toggle; on an NPC both are typed in.

| Item        | Detail                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/actor/_partials/_armor.hbs`, with a PC branch (`:1-30`) and an NPC branch (`:31-52`)                                       |
| Parameters  | The sheet context: `actor.type`, `system.armorTn` (PC, computed), `system.armor` (NPC, stored), `voidArmor`, `system.rings.void.rank` |
| SCSS        | None of its own: `section.md` and `grid.md` draw it                                                                                   |
| Block class | `l5r4-armor` on the section                                                                                                           |
| Shows in    | PC sidebar (`pc.hbs:10`), NPC sidebar (`npc.hbs:7`)                                                                                   |
| Game terms  | Armor TN (`game-rules/32_attack_and_defense.md, p.82`); Reduction (`game-rules/73_armor.md, p.198`)                                   |
| Gallery     | PC with and without the Void toggle, Void on; NPC with values; light and dark                                                         |

## Anatomy

| Part        | Element                                                                                                          | Class                         | Class now                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------- |
| Section     | `<section>`                                                                                                      | `l5r4-section l5r4-armor`     | `armor` (`_armor.hbs:2`)                     |
| Title bar   | Compact section title; on a PC the armor configuration icon button (`fa-gear`)                                   | `l5r4-section-title -compact` | `section-title` with `h4.title.-compact`     |
| Grid        | `grid.md`                                                                                                        | `l5r4-grid`                   | `grid`                                       |
| Armor TN    | PC: text, then the Void toggle. NPC: `<input type="number" name="system.armor.armorTn" aria-label>`              | none                          | `span` / `input` (`_armor.hbs:16`, `:38-43`) |
| Void toggle | `<input type="checkbox" data-action="toggle-armor-void" data-tooltip aria-label>`, only with a Void Ring above 0 | none                          | same, with `title` (`_armor.hbs:17-25`)      |
| Reduction   | PC: text. NPC: `<input type="number" name="system.armor.reduction" aria-label>`                                  | none                          | `span` / `input` (`_armor.hbs:28`, `:45-50`) |

## Variants

| Variant | Selects it            | Values                                                                  |
| ------- | --------------------- | ----------------------------------------------------------------------- |
| PC      | `actor.type` is `pc`  | Computed text; the configuration window sets the armor worn and bonuses |
| NPC     | `actor.type` is `npc` | Number inputs the GM types                                              |

## States

| State         | Look                                                                                               | Markup            |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------- |
| Rest          | Grid rest look                                                                                     |                   |
| Void on       | Checked box; the Armor TN shown includes the Void bonus the context computes                       | `checked`         |
| Focus-visible | Core's focus look on the inputs, the checkbox, the icon button                                     | `:focus-visible`  |
| Read-only     | PC values are text. On a sheet the viewer cannot edit, core disables the NPC inputs and the toggle | Core's `disabled` |

## Tokens

None of its own. The section and grid tokens apply. Values use tabular figures (`foundations/typography.md` T5).

## Keyboard and screen reader

| Input         | Result                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| Tab           | Armor configuration button (PC), Void toggle or the NPC inputs                    |
| Space         | Toggles Void                                                                      |
| Screen reader | "Armor TN", then the value; the toggle and the NPC inputs read their `aria-label` |

## Long text

Labels wrap in their cell; values are two digits.

## Rules

| #   | Rule                                                                                                  | Enforced by                             |
| --- | ----------------------------------------------------------------------------------------------------- | --------------------------------------- |
| A1  | "Armor TN" is spelled as the glossary spells it, in the label and the code stem (`armorTn`)           | `tests/conventions/glossary.test.js`    |
| A2  | A PC's computed values are text, never disabled inputs                                                | Review (`foundations/states.md` rule 6) |
| A3  | The configuration icon button's `data-tooltip` and `aria-label` name its action                       | Review                                  |
| A4  | NPC inputs carry `aria-label` with their label cell's key                                             | Review, in the gallery                  |
| A5  | One partial serves both actor types; the two branches share the grid, never copy it into two partials | Review                                  |

| #   | Conforming                                                                                                                     | Non-conforming                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| A1  | `l5r4.ui.mechanics.wounds.armorTn`, "Armor TN" (`lang/en.json:500`)                                                            | `getArmorTNPenalty` (`module/utils/armor-penalties.js:56`), which `docs/code-system/glossary.md` renames `getArmorTnPenalty` |
| A2  | `<span>{{system.armorTn.current}}</span>` (`templates/actor/_partials/_armor.hbs:16`)                                          | A disabled input for the PC's Armor TN (modeled)                                                                             |
| A3  | `data-tooltip` and `aria-label` both `{{localize "l5r4.ui.sheets.configureArmor"}}` (modeled; `icon-button.md`)                | `title="{{localize 'l5r4.ui.common.armor'}}"`, which names a thing, not the action, in `title` (`_armor.hbs:8`)              |
| A4  | `<input type="number" name="system.armor.armorTn" aria-label="{{localize "l5r4.ui.mechanics.wounds.armorTn"}}" ...>` (modeled) | The same input with no name (`templates/actor/_partials/_armor.hbs:38-43`)                                                   |
| A5  | `{{#if (eq actor.type "pc")}}` around the value cells only (modeled)                                                           | The whole section written twice, title bar included (`templates/actor/_partials/_armor.hbs:1-53`)                            |

## Do and don't

| Do                                                  | Don't                                           |
| --------------------------------------------------- | ----------------------------------------------- |
| Show the Armor TN the actor is attacked against     | Show the base and the bonuses as separate cells |
| Send armor changes through the configuration window | Make the PC's computed Armor TN an input        |

## Names

| Current                      | Target                            | Why                                 |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| `armor`                      | `l5r4-armor`                      | Decision 15                         |
| `data-action="armor-config"` | `data-action="open-armor-config"` | `open-*` opens a window (naming.md) |
| `fa-cog`                     | `fa-gear`                         | `foundations/iconography.md` rule 2 |

Fixed (Stage 17 decision 2): the stored `system.armor.armorTn` and `system.armor.reduction` fields and the `voidArmor`
effect id.
