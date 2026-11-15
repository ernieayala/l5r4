# Check dialog

The one dialog every roll opens before it rolls: the pool, each modifier with a toggle, and every choice the rules
leave to the roller (TN, Raises, Free Raises, Void Points, Emphasis, maneuvers, spell slot), then Roll. It is a
`DialogV2.prompt`; its content is a template. `patterns/dialogs.md` places it among the other dialogs.

| Item      | Detail                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Template  | `templates/dialogs/check-dialog.hbs`, `DIALOG_TEMPLATES.check`                                                                                                                                               |
| Extras    | `templates/dialogs/check-extras/ring.hbs`, `spell.hbs`, `maho.hbs`, `slot.hbs` (`DIALOG_TEMPLATES.checkRing`, `checkSpell`, `checkMaho`, `checkSlot`), rendered by the caller and inserted as `{{{extras}}}` |
| Opened by | `askChoices(request, context)` (`module/services/dice/check/roll-check.js:165-184`): width 420, modal, title the roll's label, one button `l5r4.ui.common.roll`; closing returns null and nothing rolls      |
| Read by   | `readForm(form)` (`roll-check.js:155-157`), then every value coerced and bounded as user input (`roll-check.js:303-375`)                                                                                     |
| SCSS      | Now `scss/_chat.scss:64-87`, in the chat file. `scss/components/_check-dialog.scss` (target), styling `.l5r4-check-dialog`                                                                                   |
| Quench    | `l5r4-enhanced.roll-pipeline`                                                                                                                                                                                |

## Anatomy

The dialog is not a posted card, so every class may change. Targets follow `l5r4-<block>-<element>`
([naming.md](../../code-system/naming.md#stylesheets)).

| Part           | Markup                                                     | Class now                     | Target class                                                |
| -------------- | ---------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| Root           | `<div>` with core's `standard-form`                        | `l5r4-check-dialog`           | Same                                                        |
| Pool           | `<p>` with the pool in `<strong>`                          | `check-pool`                  | `l5r4-check-dialog-pool`                                    |
| Modifiers      | `<fieldset>` with a legend; one `<label>` row per modifier | `check-modifiers`             | `l5r4-check-dialog-group`                                   |
| Modifier row   | `<label>` wrapping a checkbox, the label, and the value    | `check-modifier`              | `l5r4-check-dialog-modifier`                                |
| Modifier label | `<span>`                                                   | `check-modifier-label`        | `l5r4-check-dialog-modifier-label`                          |
| Modifier value | `<span>`, monospace                                        | `check-modifier-value`        | `l5r4-check-dialog-modifier-value`                          |
| Substitutions  | `<fieldset>` as modifiers                                  | `check-substitutes`           | `l5r4-check-dialog-group`                                   |
| Field          | Core's `div.form-group` with a `<label>` and one control   | `form-group` (core)           | Same                                                        |
| Hint           | `<p>`                                                      | `hint` (core)                 | Same                                                        |
| Maneuvers      | `<fieldset>` of attack maneuvers                           | `check-maneuvers`             | `l5r4-check-dialog-group`                                   |
| Extras         | `<fieldset>` from an extras template                       | `check-extras`, `maho-dialog` | `l5r4-check-dialog-group`                                   |
| Warning        | `<p>` with a bold title                                    | `warning-text` (no style)     | `l5r4-check-dialog-warning`, the Warning state of states.md |

## Variants

Each part renders only when the roll offers it (`roll-check.js:274-297`).

| Variant              | Adds                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------- |
| Every roll           | Pool; manual roll, keep, and total modifiers; Keep only                                |
| With modifiers       | The modifiers fieldset; substitutions when a Substitute rule applies                   |
| Not damage           | TN, TN changes as a hint, wound penalty toggle, Void Point toggle                      |
| Raises allowed       | Raises with their range, Free Raises spent on the TN (`game-rules/28_raises.md, p.79`) |
| Unskilled Roll       | The Unskilled hint in place of Raises; the Void Point to count as Rank 1               |
| Trained Emphases     | Emphasis select (`game-rules/58_skills_overview.md, p.133`)                            |
| Attack               | Ranged toggle; maneuvers when Raises are allowed, Grapple always                       |
| Skill Roll or attack | Social resistance toggle                                                               |
| Embrace the Taint    | Its toggle, when the rules allow it                                                    |
| Ring Roll            | Casting toggle, Affinity, Deficiency, spell slot (`ring.hbs`)                          |
| Spell                | Spell slot (`spell.hbs`)                                                               |
| Maho                 | Blood warning, blood source, extra blood (`maho.hbs`)                                  |

## States

| State                               | Look                                                                                                          | Markup                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Modifier on or off                  | Native checkbox                                                                                               | `{{checked enabled}}`                                                   |
| No Void Points                      | Void toggles disabled, with the reason in `data-tooltip` (states.md rule 5, key `l5r4.ui.check.noVoidPoints`) | `{{disabled (not voidPoints)}}`; the reason is the target, none today   |
| Void Point already spent this Round | Warning line: `fa-triangle-exclamation`, bold label, warning color (states.md Warning)                        | Target. Now a `p.hint` (`check-dialog.hbs:75`)                          |
| Maho                                | Warning line, as above                                                                                        | Target. Now `p.warning-text`, which no stylesheet styles (`maho.hbs:3`) |
| Out of range                        | The number field's `min` and `max` stop the spinner; the pipeline bounds whatever is typed                    | `min`, `max` on Raises, Free Raises, Keep only                          |
| Not enough Raises                   | Warning notification `l5r4.ui.combat.notEnoughRaises`; nothing rolls                                          | `roll-check.js:395-397`                                                 |

## Parameters

Context from `rollCheck` (`roll-check.js:274-297`):

| Name                                                    | Type                                          | Meaning                                       |
| ------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `pool`                                                  | string                                        | The pool before choices, `XkY` with any bonus |
| `modifiers`                                             | `{ label, text, enabled, range }[]`           | Toggleable modifiers                          |
| `substitutes`                                           | `{ label, text }[]`                           | Trait substitutions, `text` as `from → to`    |
| `hasTN`, `tn`, `tnModifiers`, `woundPenalty`            | boolean, number, `{ label, value }[]`, number | TN fields. Target name `hasTn` (decision 15)  |
| `raisesAllowed`, `maxRaises`, `minRaises`, `freeRaises` | boolean, numbers                              | Raise fields                                  |
| `unskilled`, `voidSkill`                                | boolean                                       | Unskilled hint; Void Point as Rank 1          |
| `voidAllowed`, `voidPoints`, `voidOverLimit`            | boolean, number, boolean                      | Void Point fields                             |
| `emphases`                                              | string[]                                      | Trained Emphases                              |
| `isAttack`, `ranged`                                    | boolean                                       | Attack fields                                 |
| `socialResistance`, `honorRank`                         | boolean, number                               | Social resistance                             |
| `embraceTaint`                                          | boolean                                       | Taint toggle                                  |
| `extras`                                                | HTML string                                   | The caller's extras template                  |

Form field names are read back by `readForm` and are not stored, so they follow camelCase with the `Tn` stem
(`freeRaisesToTn`). The stored field they fill, `tn.freeRaisesToTN` on the `roll` message, is a fixed name.

## Tokens

| Token                    | Property      | Part                                       |
| ------------------------ | ------------- | ------------------------------------------ |
| `--l5r4-space-gap-tight` | `gap`         | Each group's rows (`_chat.scss:66-72`)     |
| `--l5r4-space-gap`       | `gap`         | Inside a modifier row (`_chat.scss:74-78`) |
| `--l5r4-font-code`       | `font-family` | Modifier value (`_chat.scss:84-86`)        |
| `--l5r4-color-warning`   | `color`       | Warning line's icon (target)               |
| `--l5r4-color-text`      | `color`       | Warning line's words (target)              |

T5 in typography.md asks for tabular figures in the pool and the modifier values.

## Keyboard and screen reader

| Contract | Detail                                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus    | Tab walks the fields in template order, then the Roll button. Core's `DialogV2` owns submit and close; a close returns null, so nothing rolls                                                                                                                                                              |
| Names    | A modifier's `<label>` wraps its checkbox, so the row is its name. A `form-group` field's `<label>` is a sibling with no `for`, so the control has no accessible name today. Target: each `form-group` label carries `for` and its control an `id` built from a `formId` parameter, unique per open dialog |
| Groups   | Each `<fieldset>` has a `<legend>`, so a reader hears the group before its toggles                                                                                                                                                                                                                         |
| Disabled | A disabled toggle carries its reason in `data-tooltip` (target)                                                                                                                                                                                                                                            |
| Warnings | A warning line has `role="note"` and an `inert` icon (target)                                                                                                                                                                                                                                              |

## Long text

Modifier labels take the row's free space and wrap (`check-modifier-label` is `flex: 1`); the value stays on the right.
The dialog is 420 px wide and grows in height with the parts a roll offers; an attack with every maneuver is the
tallest. Review checks that case in the gallery.

## Rules

| #   | Rule                                                                                 | Enforced by                                                                | Conforming                                                                                                                | Non-conforming                                                                                                                |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| CD1 | Every choice the rules leave to the roller is a control here, never decided for them | Review (CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**)                         | The Void Point is a toggle the roller sets (`check-dialog.hbs:63-67`)                                                     | Spending a Void Point whenever one is left (modeled)                                                                          |
| CD2 | Every value read back is bounded as user input                                       | Review; Quench `l5r4-enhanced.roll-pipeline`                               | `Math.min(Math.max(minimum, toInt(choices.raises ?? minimum)), maximum)` (`roll-check.js:367-369`)                        | Using `choices.raises` as typed (modeled)                                                                                     |
| CD3 | One key per label; a range or count is a placeholder, never a fragment               | `tests/lang.test.js`, review                                               | One key "Raises (maximum {max}, minimum {min})" (modeled)                                                                 | `{{localize "…raises"}} ({{localize "l5r4.ui.check.max"}} {{maxRaises}}…)` from fragments, with "max" (`check-dialog.hbs:49`) |
| CD4 | A label is one key: never two keys joined                                            | Review ([localization.md](../content/localization.md#one-key-per-meaning)) | `{{localize "l5r4.ui.check.keepFewer"}}` (`check-dialog.hbs:170`)                                                         | `{{localize "l5r4.ui.common.roll"}} {{localize "l5r4.ui.common.mod"}}` (`check-dialog.hbs:158`)                               |
| CD5 | A warning is a warning line, not a hint                                              | Review (states.md rule 7)                                                  | `<p class="l5r4-check-dialog-warning" role="note"><i class="fa-solid fa-triangle-exclamation" inert></i> …</p>` (modeled) | `<p class="hint">{{localize "l5r4.ui.effects.voidSpentThisRound"}}</p>` (`check-dialog.hbs:75`)                               |
| CD6 | A disabled toggle says why                                                           | Review (states.md rule 5)                                                  | `data-tooltip="{{localize "l5r4.ui.check.noVoidPoints"}}"` when disabled (states.md, modeled)                             | `{{disabled (not voidPoints)}}` alone (`check-dialog.hbs:66`)                                                                 |
| CD7 | The dialog's styles live in its own file under `.l5r4-check-dialog`                  | `tests/conventions/styles.test.js` (one component per file)                | `scss/components/_check-dialog.scss` (target)                                                                             | The rules at the end of `scss/_chat.scss:64-87`                                                                               |
| CD8 | Every field has an accessible name                                                   | Quench `l5r4-enhanced.design-gallery`, review                              | `<label class="check-modifier"><input type="checkbox" …/>…</label>` (`check-dialog.hbs:8-12`)                             | `<label>…TN</label><input type="number" name="tn" />` with no `for` (`check-dialog.hbs:32-33`)                                |

## Do and don't

| Do                                                 | Don't                                             |
| -------------------------------------------------- | ------------------------------------------------- |
| Show the pool before any choice                    | Hide a modifier that applies; show it, toggled on |
| Add a roll's own fields through an extras template | Add a second dialog before or after this one      |
| Rename a form field and its reader in one change   | Rename the stored `tn.freeRaisesToTN` field       |
