# Voice

How the system's UI copy reads: letter case, game terms, buttons, notifications, numbers, abbreviations, and tooltips.
Every string a user sees is a key in `lang/en.json`; [localization.md](localization.md) covers the keys, and this page
covers the values.

| Item                 | Detail                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applies to           | Every value in `lang/en.json`: labels, buttons, window titles, tabs, tooltips, hints, notifications, dialog text, chat card text                                        |
| Tokens               | None                                                                                                                                                                    |
| Partials             | None. Templates show copy only through `{{localize}}` (`tests/conventions/templates.test.js`)                                                                           |
| Source of game terms | [`docs/code-system/glossary.md`](../../code-system/glossary.md): each term's spelling, `game-rules/` file, and printed page                                             |
| Checks               | `tests/lang.test.js`, `tests/conventions/glossary.test.js`, `tests/conventions/templates.test.js`, ESLint `no-restricted-syntax`; "review" where a pattern cannot judge |

## Kinds of copy

Each rule names the kinds it covers.

| Kind         | Where it shows                                                    | Key form ([localization.md](localization.md))           | Ends with |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| Label        | Field labels, tabs, section headings, column heads, option values | Any leaf                                                | No period |
| Button       | `<button>` text, dialog buttons, context menu entries             | Any leaf                                                | No period |
| Title        | Window and dialog titles                                          | `title`                                                 | No period |
| Tooltip      | `data-tooltip` and `aria-label`                                   | The control's own label key; no separate `*Tooltip` key | No period |
| Notification | `ui.notifications.info`, `warn`, `error`                          | `errors.*`, `*Failed`, or the feature's group           | No period |
| Hint         | Help text under a field or at the top of a window                 | `<field>Hint`, `hint`                                   | Period    |
| Sentence     | Dialog body, chat card notes, empty states                        | Any leaf                                                | Period    |

## Letter case

**Rule.** Labels, buttons, titles, and tooltips use sentence case: a capital on the first word only. Game terms and
proper names keep their capitals inside the label (next section). Window titles count as labels.

|                | Example                                                         | Source                                                            |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Conforming     | "Add rule"                                                      | `l5r4.ui.rules.add` (`lang/en.json`)                              |
| Conforming     | "Clear filters"                                                 | `l5r4.apps.compendiumBrowser.clear` (`lang/en.json`)              |
| Conforming     | "Floating Wound and Void numbers" (the capitals are game terms) | `l5r4.system.settings.floatingNumbers.name` (`lang/en.json`)      |
| Non-conforming | "Add Custom Emphasis" (write "Add custom Emphasis")             | modeled on `l5r4.apps.emphasisManager.addCustom` (`lang/en.json`) |
| Non-conforming | "Armor Configuration" (write "Armor configuration")             | modeled on `l5r4.apps.armorConfig.title` (`lang/en.json`)         |
| Non-conforming | "Explodes On" (write "Explodes on")                             | modeled on `l5r4.ui.mechanics.rolls.explodesOn` (`lang/en.json`)  |

**Check.** `tests/lang.test.js`: in a value of two to six words with no placeholder and no sentence punctuation, every
capitalized word after the first is a glossary term, a listed proper name, or a word of a Skill or arrow name in
`lang/en.json` (**Names of game things**).

## Game terms

**Rule.** A game term carries the book's capitals everywhere it appears, mid-sentence included, spelled exactly as
`glossary.md` lists it. The capitalized terms include Void Point, Raise, Free Raise, Insight Rank, School Rank, Skill
Rank, Trait, Ring (and each Ring's name), Skill, Wound, Wound Rank (and each rank's name), Armor TN, TN, Honor, Glory,
Status, Taint, Shadowlands Taint, Emphasis, Mastery Level, Initiative, Reduction, Round, Turn, Simple Action, Complex
Action, Free Action, Skill Roll, Trait Roll, Ring Roll, Spell Casting Roll, Contested Roll, and Unskilled Roll. The book
writes these in lowercase, and so does the UI: spell slot, stance (generic), skirmish, attack roll, damage roll.

|                | Example                                                           | Source                                                             |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Conforming     | "Spend a Void Point (+1k1)"                                       | `l5r4.ui.check.void` (`lang/en.json`)                              |
| Conforming     | "All spell slots restored to maximum"                             | `l5r4.magic.spells.slotsRestored` (`lang/en.json`)                 |
| Non-conforming | "No actor available for void point spending" (write "Void Point") | modeled on `l5r4.ui.notifications.noActorForVoid` (`lang/en.json`) |
| Non-conforming | "Wound Levels" (the term is Wound Rank: write "Wound Ranks")      | modeled on `l5r4.ui.sheets.woundLevels` (`lang/en.json`)           |
| Non-conforming | "Shadowland Taint" (write "Shadowlands Taint")                    | modeled on `l5r4.character.ranks.taintRank` (`lang/en.json`)       |
| Non-conforming | "Use Spell Slot" (write "Use spell slot")                         | modeled on `l5r4.magic.spells.useSpellSlot` (`lang/en.json`)       |
| Non-conforming | "Damage Roll" (write "Damage roll")                               | modeled on `l5r4.ui.mechanics.rolls.damageRoll` (`lang/en.json`)   |

The stored field for a Wound Rank is `woundLevel` (a fixed name, decision 2); only the copy says Wound Rank. The rank
labels on the sheet read "Honor Rank" and "Glory Rank" (Stage 17 decision 16), as `glossary.md` lists them:
`l5r4.character.ranks.honorRank` (`lang/en.json`) and `l5r4.character.ranks.gloryRank` (`lang/en.json`).

**Check.** `tests/conventions/glossary.test.js`: each glossary term in `lang/en.json` values has the glossary's letter
case, and no value uses a banned synonym.

## Names of game things

**Rule.** The name of a Skill, stance, school, spell, arrow, armor type, or maneuver is a proper name and keeps the
book's capitals, as an option value or inside a sentence. A generic word beside it follows sentence case.

|                | Example                                                                     | Source                                                                  |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Conforming     | "Sleight of Hand"                                                           | `l5r4.character.skills.names.sleightOfHand` (`lang/en.json`)            |
| Conforming     | "You cannot Guard in the Full Attack Stance"                                | `l5r4.ui.combat.guardFullAttack` (`lang/en.json`)                       |
| Conforming     | "Armor Piercing arrow ignores armor" (the arrow's name, then generic words) | `l5r4.ui.combat.arrowArmor.armor` (`lang/en.json`)                      |
| Non-conforming | "Sleight of hand" (sentence case applied to a Skill's name)                 | modeled on `l5r4.character.skills.names.sleightOfHand` (`lang/en.json`) |

**Check.** `tests/conventions/glossary.test.js` for names the glossary lists; review for the rest.

## Buttons

**Rule.** A button label starts with a verb that names what happens: "Roll", "Apply", "Remove", "Add as another
School". A confirmation dialog's buttons name the action again ("Remove", "Replace"), never "Yes", "OK", or "Confirm".
"Cancel" closes without acting.

|                | Example                                               | Source                                                                                           |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Conforming     | "Remove this effect"                                  | `l5r4.apps.effectPanel.remove` (`lang/en.json`)                                                  |
| Conforming     | "Replace" and "Add as another School" for a choice    | `l5r4.ui.purchase.schoolReplace` (`lang/en.json`), `l5r4.ui.purchase.schoolAdd` (`lang/en.json`) |
| Non-conforming | "Honor Roll" as a button (write "Make an Honor Roll") | `l5r4.ui.honorRoll.button` (`lang/en.json`)                                                      |
| Non-conforming | "OK" as the button that removes an item               | modeled on `l5r4.ui.dialogs.deleteItem` (`lang/en.json`)                                         |

**Check.** Review. A label cannot be tested for being a verb.

## Remove, not Delete

**Rule.** Copy uses "Remove" for taking anything away: an item from a character, an effect, a rule, an attack, money.
Stage 17 decision 16 sets it, and it is the majority form (5 values to 3 for "Delete"). Code keeps the `delete*` verb
(decision 15 verb vocabulary); core's own document dialogs keep core's wording.

|                | Example                               | Source                                                         |
| -------------- | ------------------------------------- | -------------------------------------------------------------- |
| Conforming     | "Remove this rule"                    | `l5r4.ui.rules.delete` (`lang/en.json`)                        |
| Conforming     | "Remove" in the Wealth Manager        | `l5r4.apps.wealthManager.remove` (`lang/en.json`)              |
| Non-conforming | "Delete Item?" (write "Remove item?") | modeled on `l5r4.ui.dialogs.deleteItem.title` (`lang/en.json`) |
| Non-conforming | "Delete" as a shared label            | modeled on `l5r4.ui.common.delete` (`lang/en.json`)            |

**Check.** `tests/lang.test.js`: no `lang/en.json` value holds the word "Delete".

## Notifications

**Rule.** A notification is one sentence with no trailing period (decision 15). It states what happened or what is
missing, then what to do, joined with a colon or "or". A failure reads "Failed to <verb> <object>". A notification
names the character with `{name}`, never "this actor".

|                | Example                                                                                                          | Source                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Conforming     | "Failed to update armor configuration"                                                                           | `l5r4.apps.armorConfig.errors.updateFailed` (`lang/en.json`)                                                          |
| Conforming     | "No Void Points available to reduce damage"                                                                      | `l5r4.ui.mechanics.wounds.noVoidPoints` (`lang/en.json`)                                                              |
| Non-conforming | "{name} has already spent a Void Point this Round." (drop the period)                                            | modeled on `l5r4.ui.effects.voidLimit` (`lang/en.json`), shown by `warnVoidLimit` (`module/services/effects/uses.js`) |
| Non-conforming | "No token selected. Select a token to apply wounds." (write "No token selected: select a token to apply Wounds") | modeled on `l5r4.ui.mechanics.wounds.noTokenSelected` (`lang/en.json`)                                                |
| Non-conforming | A literal string: `ui.notifications?.warn("Token has no actor")`                                                 | modeled on `l5r4.ui.notifications.tokenNoActor` (`lang/en.json`)                                                      |

**Check.** `tests/lang.test.js` collects the keys passed to `ui.notifications.*` in `module/` and fails a value that
ends with a period. ESLint `no-restricted-syntax` (the presentation-in-JavaScript selectors in `eslint.config.mjs`)
fails a string or template literal passed to `ui.notifications.*`.

## Hints and sentences

**Rule.** Hints, dialog body text, chat card notes, and empty states are full sentences and end with a period. Labels,
buttons, titles, and tooltips never end with a period. No value ends with "!" and no value is in capitals.

|                | Example                                                                     | Source                                                                  |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Conforming     | "Unskilled Roll: dice do not explode, and no Raises or Free Raises apply."  | `l5r4.ui.check.unskilled` (`lang/en.json`)                              |
| Conforming     | "Nothing matches." as an empty state                                        | `l5r4.apps.compendiumBrowser.none` (`lang/en.json`)                     |
| Non-conforming | "No emphases in list" as an empty state (write "No Emphases in this list.") | modeled on `l5r4.apps.emphasisManager.noEmphases` (`lang/en.json`)      |
| Non-conforming | "CATASTROPHIC FAILURE! ..."                                                 | modeled on `l5r4.ui.mechanics.fear.catastrophicSuffix` (`lang/en.json`) |
| Non-conforming | "Fully healed!"                                                             | modeled on `l5r4.ui.mechanics.wounds.fullyHealed` (`lang/en.json`)      |

**Check.** `tests/lang.test.js`: every `hint` and `<field>Hint` value ends with a period; no `title` key and no value
in the `tabs` or `common` groups ends with one; no value ends with "!" or holds two words in a row written in
capitals.

## Voice and confirmations

**Rule.** Copy speaks to the user as "you" about the user's own action or permission, and names the character with
`{name}` otherwise. Full forms, no contractions: "cannot", "do not" (the majority, 6 values to 3). A confirmation asks
the action as a question and then states the consequence. The system's name never prefixes a value.

|                | Example                                                                                                | Source                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Conforming     | "End the encounter? Fear and every other effect lasting until the encounter ends will end now."        | `l5r4.ui.effects.endEncounterConfirm` (`lang/en.json`)           |
| Conforming     | "You cannot Guard in the Full Attack Stance"                                                           | `l5r4.ui.combat.guardFullAttack` (`lang/en.json`)                |
| Non-conforming | "You do not have permission to roll damage for this actor" (write "You cannot roll damage for {name}") | `l5r4.ui.notifications.noPermissionDamage` (`lang/en.json`)      |
| Non-conforming | "Are you sure you want to delete {name}?" (write "Remove {name}?")                                     | modeled on `l5r4.ui.dialogs.deleteItem.content` (`lang/en.json`) |
| Non-conforming | "L5R4 Migration: Updated {count} world image path(s)."                                                 | modeled on `l5r4.system.migration.iconsUpdated` (`lang/en.json`) |

**Check.** `tests/lang.test.js` fails `n't` and a leading "L5R4" in values; review for the rest.

## Placeholders

**Rule.** `{name}` is the character or actor the message is about. A second actor in the same value takes its role:
`{target}`, `{giver}`. Item, effect, and spell names use their kind: `{item}`, `{effect}`, `{spell}`. The full naming
rules for placeholders are in [localization.md](localization.md#interpolation).

|                | Example                                                                      | Source                                                           |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Conforming     | "{name} is knocked Prone."                                                   | `l5r4.ui.combat.knockedDown` (`lang/en.json`)                    |
| Conforming     | "{name} gains {item} from {giver} (School Rank {rank})."                     | `l5r4.ui.grants.granted` (`lang/en.json`)                        |
| Non-conforming | "{character} has no Willpower trait" (write "{name} has no Willpower Trait") | modeled on `l5r4.ui.mechanics.fear.noWillpower` (`lang/en.json`) |
| Non-conforming | "{actor} is immune to {effect}."                                             | modeled on `l5r4.ui.effects.immune` (`lang/en.json`)             |
| Non-conforming | "vs {creature}"                                                              | modeled on `l5r4.ui.mechanics.fear.testLabel` (`lang/en.json`)   |

**Check.** `tests/lang.test.js`: `{character}`, `{actor}`, and `{creature}` are not placeholder names.

## Numbers and dice

**Rule.** Numbers are digits. A modifier carries its sign (`+5`, `-5`); a TN, a rank, or a count does not. A dice pool
is `XkY`: rolled dice, a lowercase `k`, kept dice, no spaces (`game-rules/26_special_dice_rules.md`, p.77). A pool
modifier is signed (`+1k1`, `+0k1`); a flat bonus joins the pool with its sign and no space (`5k3+2`). Multiplication is
`×`, a change is `→`, a range is "1 to 10", a ratio of current to maximum is `{current}/{max}`.

|                | Example                                                       | Source                                                                 |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Conforming     | "Spend a Void Point (+1k1)"                                   | `l5r4.ui.check.void` (`lang/en.json`)                                  |
| Conforming     | "up to 5 × Insight Rank"                                      | `l5r4.ui.combat.feintNote` (`lang/en.json`)                            |
| Conforming     | "{label} {from}→{to}"                                         | `l5r4.character.experience.traitChange` (`lang/en.json`)               |
| Conforming     | `formatSigned(roll)` + `k` + `keep`, then the bonus: "+0k1+5" | `formatPool` (`module/utils/rule-summary.js`)                          |
| Non-conforming | "-{penalty}kO" (the letter O; write "-{penalty}k0")           | modeled on `l5r4.ui.mechanics.fear.penaltySuffix` (`lang/en.json`)     |
| Non-conforming | "x 2 +" (write "× 2 +")                                       | modeled on `l5r4.ui.mechanics.wounds.healRateFormula` (`lang/en.json`) |
| Non-conforming | "gains two Free Raises" (write "gains 2 Free Raises")         | modeled on `l5r4.ui.combat.grapple.weaponLost` (`lang/en.json`)        |
| Non-conforming | Parts joined with a space: "+1k1 +5"                          | `formatModifier` (`module/services/dice/check/card.js`)                |

`×` is the pick for multiplication (one value each way): the letter x reads as a variable beside `XkY`.

**Check.** `tests/lang.test.js` fails `k` followed by a letter after a digit or placeholder, and `x` between numbers
or placeholders. Review for pools built in code.

## Abbreviations

**Rule.** The allowed abbreviations are TN, XP, NPC, PC, GM, and DR (the book's weapon tables), and `ft` after a
number. Every other word is written out: "maximum", "minimum", "against", "for example". A value never spells out an
allowed abbreviation.

|                | Example                                                          | Source                                                                   |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Conforming     | "Attack TN on foot"                                              | `l5r4.equipment.weapons.tnOnFoot` (`lang/en.json`)                       |
| Conforming     | "DR {pool}"                                                      | `l5r4.apps.compendiumBrowser.numbers.weapon` (`lang/en.json`)            |
| Non-conforming | "Max Wounds" (write "Maximum Wounds")                            | modeled on `l5r4.ui.mechanics.wounds.maxWounds` (`lang/en.json`)         |
| Non-conforming | "e.g., Samurai, Peasant" (write "for example: Samurai, Peasant") | modeled on `l5r4.equipment.general.keywordsPlaceholder` (`lang/en.json`) |
| Non-conforming | "Experience Points" where every other value says XP              | modeled                                                                  |
| Non-conforming | "vs" (write "against")                                           | modeled on `l5r4.ui.combat.vs` (`lang/en.json`)                          |

Syntax a user types, such as the text link keys in the link error messages (`sta`, `wil`, ...), appears as typed.

**Check.** `tests/lang.test.js`: "Max", "Min", "e.g.", "vs", and "Experience Points" are banned forms in
`lang/en.json` values. The glossary's Experience Points row shows "XP" as its label.

## Punctuation

**Rule.** A colon joins a label to its value or a cause to its result. No spaced hyphen as a dash; use a colon or a
semicolon. Key and mouse hints name keys with a capital and join them with `+`: "Shift+click", "Shift+right-click". A
page citation in copy reads "(p.N)" or "(pp.N, M)".

|                | Example                                                                                        | Source                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Conforming     | "Wounds: {current}/{max} (suffered: {suffered})"                                               | `l5r4.ui.mechanics.wounds.status` (`lang/en.json`)                       |
| Conforming     | "(pp.231, 259)"                                                                                | `l5r4.ui.sheets.masteryHint` (`lang/en.json`)                            |
| Non-conforming | "targets - TN not auto-set" (write "Several targets: set the TN by hand")                      | modeled on `l5r4.ui.combat.multipleTargets` (`lang/en.json`)             |
| Non-conforming | "Shift+Left click: +1, Shift+Right click: -1" (write "Shift+click: +1, Shift+right-click: -1") | modeled on `l5r4.ui.hints.leftClickPlusRightClickMinus` (`lang/en.json`) |

**Check.** `tests/lang.test.js` fails " - " between words; review for key hints.

## Tooltips

**Rule.** An icon-only control's tooltip is its label: a verb phrase in sentence case, no period, the same key in
`data-tooltip` and `aria-label` (Stage 17 decision 16). A control with visible text carries a tooltip, such as the
reason it is disabled, in `data-tooltip` alone. No control uses `title`. A tooltip names the action, not the gesture:
no "Click to". A tooltip that needs a sentence of explanation belongs in a hint.

|                | Example                                                                                                     | Source                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Conforming     | `data-tooltip` and `aria-label` both `l5r4.apps.effectPanel.remove` ("Remove this effect")                  | `data-action="delete-effect"` (`templates/apps/effect-panel.hbs`)                  |
| Non-conforming | Icon-only button with `data-tooltip` "Delete" and no `aria-label`                                           | modeled on `data-action="delete-emphasis"` (`templates/apps/emphasis-manager.hbs`) |
| Non-conforming | "Click to change the maximum XP gained from disadvantages" (write "Change the XP limit from Disadvantages") | modeled on `l5r4.character.experience.breakdown.capHint` (`lang/en.json`)          |
| Non-conforming | "Click to test Fear against selected characters"                                                            | modeled on `l5r4.ui.mechanics.fear.rollForSelected` (`lang/en.json`)               |

**Check.** `tests/conventions/templates.test.js`: every icon-only button carries `data-tooltip` and `aria-label`, and
no element carries `title`. `tests/lang.test.js` fails a value starting "Click to". Review for wording.

## Fixed names

Copy itself is not stored, with two exceptions where a change reaches only new documents:

| Stored copy                         | Why it stays                                                                                                         | Consequence of a rewording                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Chat card HTML                      | A posted card's HTML is stored in the message (decision 2)                                                           | Cards already posted keep their old text        |
| Status effect names                 | Core localizes the name when it creates the effect and stores the text [src: client/documents/active-effect.mjs:131] | Effects already on actors keep their old name   |
| `TYPES.<Document>.<subtype>` labels | Core requires the `TYPES` group                                                                                      | The key path stays; the value follows this page |
