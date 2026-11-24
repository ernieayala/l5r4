# Check dialog

The one dialog every roll opens before it rolls: the pool, each modifier with a toggle, and every choice the rules leave to the roller (TN, Raises, Free Raises, Void Points, Emphasis, maneuvers, spell slot), then Roll. It is a `DialogV2.prompt`; its content is a template. `patterns/dialogs.md` places it among the other dialogs.

| Item | Detail |
| --- | --- |
| Template | `templates/dialogs/check-dialog.hbs`, `DIALOG_TEMPLATES.check` |
| Extras | `templates/dialogs/check-extras/ring.hbs`, `spell.hbs`, `maho.hbs`, `slot.hbs` (`DIALOG_TEMPLATES.checkRing`, `checkSpell`, `checkMaho`, `checkSlot`), rendered by the caller and inserted as `{{{extras}}}` |
| Opened by | `askChoices` (`module/services/dice/check/dialog.js`): width 420, modal, title the roll's label, one button `l5r4.ui.common.roll`; closing returns null and nothing rolls |
| Live parts | The Void Point uses: `bindVoidUses` (`module/services/dice/check/dialog.js`). An attack's maneuvers: `bindManeuverCost` (`module/services/dice/check/maneuver-cost.js`), from the same terms the roll settles |
| Read by | `formDataOf` (`module/services/dice/check/dialog.js`), then every value coerced and bounded as user input (`buildChosenTerms` (`module/services/dice/check/terms.js`)) |
| SCSS | `scss/components/_check-dialog.scss`, styling `.l5r4-check-dialog` |
| Quench | `l5r4-enhanced.roll-pipeline` |

## Anatomy

The dialog is not a posted card, so every class may change. Classes follow `l5r4-<block>-<element>` ([naming.md](../../code-system/naming.md#stylesheets)).

| Part | Markup | Class | Target, where the class differs |
| --- | --- | --- | --- |
| Root | `<div data-check-dialog>` with core's `standard-form` | `l5r4-check-dialog` |  |
| Pool | `<p>` with the pool in `<strong>` | `l5r4-check-dialog-pool` |  |
| Modifiers | `<fieldset>` with a legend; one `<label>` row per modifier | `l5r4-check-dialog-group` |  |
| Modifier row | `<label>` wrapping a checkbox, the label, and the value | `l5r4-check-dialog-modifier` |  |
| Modifier label | `<span>` | `l5r4-check-dialog-modifier-label` |  |
| Modifier value | `<span>`, monospace | `l5r4-check-dialog-modifier-value` |  |
| Substitutions | `<fieldset>` as modifiers | `l5r4-check-dialog-group` |  |
| Field | Core's `div.form-group` with a `<label>` and one control | `form-group` (core) |  |
| Hint | `<p>` | `hint` (core) |  |
| Maneuvers | `<fieldset>` of attack maneuvers | `l5r4-check-dialog-group` |  |
| Maneuver cost | `<p aria-live="polite">`, hidden while no maneuver costs Raises: the cost, what pays it, and the TN (`l5r4.ui.combat.maneuverCost`) | `hint` (core) | `[data-maneuver-cost]` |
| Maneuvers not paid | Warning line holding `l5r4.ui.combat.notEnoughRaises`, hidden while the Raises pay | `l5r4-check-dialog-warning` | `[data-maneuver-short]` |
| Extras | `<fieldset>` from an extras template; the slot extra is one `form-group` | `l5r4-check-dialog-group`; `l5r4-check-dialog-slot form-group` |  |
| Warning | `<p role="note">` led by an `inert` `fa-triangle-exclamation` icon: the Void-spent line, the maho blood warning | `l5r4-check-dialog-warning`, icon `l5r4-check-dialog-warning-icon` |  |

## Variants

Each part renders only when the roll offers it (`buildDialogContext` (`module/services/dice/check/terms.js`)).

| Variant | Adds |
| --- | --- |
| Every roll | Pool; manual roll, keep, and total modifiers; Keep only |
| With modifiers | The modifiers fieldset; substitutions when a Substitute rule applies |
| Not damage | TN, TN changes as a hint, wound penalty toggle, Void Point toggle |
| Raises allowed | Raises, with their range as a hint under the field; Free Raises spent on the TN, with what they do and how many as a hint (`game-rules/28_raises.md, p.79`) |
| Unskilled Roll | The Unskilled hint in place of Raises; the Void Point to count as Rank 1 |
| Trained Emphases | Emphasis select (`game-rules/58_skills_overview.md, p.133`) |
| Attack | Ranged toggle; maneuvers when Raises are allowed, Grapple always |
| Skill Roll or attack | Social resistance toggle |
| Embrace the Taint | Its toggle, when the rules allow it |
| Ring Roll | Casting toggle, Affinity, Deficiency, spell slot (`ring.hbs`) |
| Spell | Spell slot (`spell.hbs`) |
| Maho | Blood warning, blood source, extra blood (`maho.hbs`) |

## States

| State | Look | Markup |
| --- | --- | --- |
| Modifier on or off | Native checkbox | `{{checked enabled}}` |
| No Void Points | Void toggles disabled, with the reason in `data-tooltip` (states.md rule 5, key `l5r4.ui.check.noVoidPoints`) | `{{disabled (not voidPoints)}}` and the tooltip while `voidPoints` is 0 (`templates/dialogs/check-dialog.hbs`) |
| Void Point already spent this Round | Warning line: `fa-triangle-exclamation` in the warning color, the words in the text color (states.md Warning) | A `<p>` of class `l5r4-check-dialog-warning` holding `l5r4.ui.effects.voidSpentThisRound` (`templates/dialogs/check-dialog.hbs`) |
| Maho | Warning line, as above | A `<p>` of class `l5r4-check-dialog-warning` (`templates/dialogs/check-extras/maho.hbs`) |
| Out of range | The number field's `min` and `max` stop the spinner; the pipeline bounds whatever is typed | `min`, `max` on Raises, Free Raises, Keep only |
| Maneuver picked | The declared Raises rise to cover what the Free Raises do not, up to the cap; the roller may change them after | `updateRaisesToCover` (`module/services/dice/check/maneuver-cost.js`) |
| Maneuver over the cap | The checkbox or Called Shot option disabled, with the reason (`l5r4.ui.combat.maneuverOverCap`) in `data-tooltip`, or `title` on an option; a picked one stays enabled | `updateManeuverChoices` (`module/services/dice/check/maneuver-cost.js`) |
| Not enough Raises | The warning line shows and Roll is disabled, so the dialog stays open with its input; a roll made without the dialog warns with the same key and does not roll | `updateManeuverCost` (`module/services/dice/check/maneuver-cost.js`), `askCheck` (`module/services/dice/check/roll-check.js`) |

## Parameters

Context from `buildDialogContext` (`module/services/dice/check/terms.js`):

| Name | Type | Meaning |
| --- | --- | --- |
| `pool` | string | The pool before choices, `XkY` with any bonus |
| `modifiers` | `{ label, text, enabled, range }[]` | Toggleable modifiers |
| `substitutes` | `{ label, text }[]` | Trait substitutions, `text` as `from → to` |
| `hasTn`, `tn`, `tnModifiers`, `woundPenalty` | boolean, number, `{ label, value }[]`, number | TN fields |
| `raisesAllowed`, `maxRaises`, `minRaises`, `freeRaises` | boolean, numbers | Raise fields |
| `unskilled`, `voidSkill` | boolean | Unskilled hint; Void Point as Rank 1 |
| `voidAllowed`, `voidPoints`, `voidOverLimit` | boolean, number, boolean | Void Point fields |
| `emphases` | string[] | Trained Emphases |
| `isAttack`, `ranged` | boolean | Attack fields |
| `socialResistance`, `honorRank` | boolean, number | Social resistance |
| `embraceTaint` | boolean | Taint toggle |
| `extras` | HTML string | The caller's extras template |

Form field names are read back by `formDataOf` and are not stored, so they follow camelCase with the `Tn` stem (`freeRaisesToTn`). The stored field they fill, `tn.freeRaisesToTN` on the `roll` message, is a fixed name.

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap-tight` | `gap` | Each group's rows (`.l5r4-check-dialog-group` (`scss/components/_check-dialog.scss`)) |
| `--l5r4-space-gap` | `gap` | Inside a modifier row (`.l5r4-check-dialog-modifier` (`scss/components/_check-dialog.scss`)) |
| `--l5r4-font-code` | `font-family` | Modifier value (`.l5r4-check-dialog-modifier-value` (`scss/components/_check-dialog.scss`)) |
| `--l5r4-color-warning` | `color` | Warning line's icon (`.l5r4-check-dialog-warning-icon` (`scss/components/_check-dialog.scss`)) |
| `--l5r4-color-text` | `color` | Warning line's words (`.l5r4-check-dialog-warning` (`scss/components/_check-dialog.scss`)) |

T5 in typography.md asks for tabular figures in the pool and the modifier values.

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Focus | Tab walks the fields in template order, then the Roll button. Core's `DialogV2` owns submit and close; a close returns null, so nothing rolls |
| Names | A modifier's `<label>` wraps its checkbox, so the row is its name. A `form-group` field's `<label>` carries `for`, and its control an `id` built from `formId`, which `askChoices` (`module/services/dice/check/dialog.js`) makes once per open dialog and gives the extras too |
| Groups | Each `<fieldset>` has a `<legend>`, so a reader hears the group before its toggles |
| Disabled | A disabled toggle carries its reason in `data-tooltip` |
| Warnings | A warning line has `role="note"` and an `inert` icon |

## Long text

Modifier labels take the row's free space and wrap (`.l5r4-check-dialog-modifier-label` (`scss/components/_check-dialog.scss`) is `flex: 1`); the value stays on the right. The dialog is 420 px wide and grows in height with the parts a roll offers; an attack with every maneuver is the tallest. Review checks that case in the gallery.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| CD1 | Every choice the rules leave to the roller is a control here, never decided for them | Review (CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**) | The Void Point is a toggle the roller sets (`name="void"` (`templates/dialogs/check-dialog.hbs`)) | Spending a Void Point whenever one is left (modeled) |
| CD2 | Every value read back is bounded as user input | Review; Quench `l5r4-enhanced.roll-pipeline` | `Math.min(Math.max(min, toInt(choices.raises ?? min)), max)` in `buildChosenTerms` (`module/services/dice/check/terms.js`) | Using `choices.raises` as typed (modeled) |
| CD3 | One key per label; a range or count is a placeholder, never a fragment | `tests/lang.test.js`, review | The label "Raises" and, under the field, the hint `{{localize "l5r4.ui.mechanics.rolls.raisesHint" max=maxRaises}}`, "Up to {max}." (`name="raises"` (`templates/dialogs/check-dialog.hbs`)), so the label keeps one line | `{{localize "…raises"}} ({{localize "l5r4.ui.check.max"}} {{maxRaises}}…)` from fragments, with "max", in the label (modeled) |
| CD4 | A label is one key: never two keys joined | `tests/conventions/templates.test.js` (`joined-localize`; [localization.md](../content/localization.md#one-key-per-meaning)) | `{{localize "l5r4.ui.check.rollModifier"}}` (`templates/dialogs/check-dialog.hbs`) | `{{localize "l5r4.ui.common.roll"}} {{localize "l5r4.ui.common.modifier"}}` (modeled) |
| CD5 | A warning is a warning line, not a hint | Review (states.md rule 7) | `<p class="l5r4-check-dialog-warning" role="note">` with its `inert` icon, holding `l5r4.ui.effects.voidSpentThisRound` (`templates/dialogs/check-dialog.hbs`) | `<p class="hint">{{localize "l5r4.ui.effects.voidSpentThisRound"}}</p>` (modeled) |
| CD6 | A disabled toggle says why | Review (states.md rule 5) | `data-tooltip="{{localize "l5r4.ui.check.noVoidPoints"}}"` while disabled, on `name="void"` (`templates/dialogs/check-dialog.hbs`) | `{{disabled (not voidPoints)}}` alone (modeled) |
| CD7 | The dialog's styles live in its own file under `.l5r4-check-dialog` | `tests/conventions/styles.test.js` (one component per file) | `scss/components/_check-dialog.scss` | The dialog's rules at the end of the chat card stylesheet (modeled) |
| CD8 | Every field has an accessible name | Quench `l5r4-enhanced.design-gallery`, review | The TN's `<label for="{{formId}}-tn">` beside `name="tn"` (`templates/dialogs/check-dialog.hbs`) | A `<label>` with no `for` beside its control (modeled) |
| CD9 | The roller can't choose more Void Point uses than they have points; the roll takes them all or none | Quench `l5r4-enhanced.roll-pipeline`, `l5r4-enhanced.services.void-points` | With one point, ticking `name="void"` disables `name="voidSkill"` with `l5r4.ui.check.voidPointsChosen` (`bindVoidUses`, `module/services/dice/check/dialog.js`); `spendVoidPoint(actor, count)` checks every point first (`module/services/dice/resources/void-points.js`) | Spending the points one at a time and stopping after the first, the point gone and no roll (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Show the pool before any choice | Hide a modifier that applies; show it, toggled on |
| Add a roll's own fields through an extras template | Add a second dialog before or after this one |
| Rename a form field and its reader in one change | Rename the stored `tn.freeRaisesToTN` field |
