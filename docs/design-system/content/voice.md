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

Line numbers below are `lang/en.json` unless a file is named.

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

|                | Example                                                         | Source  |
| -------------- | --------------------------------------------------------------- | ------- |
| Conforming     | "Add rule"                                                      | `:196`  |
| Conforming     | "Clear filters"                                                 | `:302`  |
| Conforming     | "Floating Wound and Void numbers" (the capitals are game terms) | `:1039` |
| Non-conforming | "Add Custom Emphasis" (write "Add custom Emphasis")             | `:24`   |
| Non-conforming | "Armor Configuration" (write "Armor configuration")             | `:5`    |
| Non-conforming | "Explodes On" (write "Explodes on")                             | `:475`  |

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

|                | Example                                                           | Source |
| -------------- | ----------------------------------------------------------------- | ------ |
| Conforming     | "Spend a Void Point (+1k1)"                                       | `:167` |
| Conforming     | "All spell slots restored to maximum"                             | `:988` |
| Non-conforming | "No actor available for void point spending" (write "Void Point") | `:755` |
| Non-conforming | "Wound Levels" (the term is Wound Rank: write "Wound Ranks")      | `:746` |
| Non-conforming | "Shadowland Taint" (write "Shadowlands Taint", as `:344` does)    | `:865` |
| Non-conforming | "Use Spell Slot" (write "Use spell slot")                         | `:986` |
| Non-conforming | "Damage Roll" (write "Damage roll")                               | `:480` |

The stored field for a Wound Rank is `woundLevel` (a fixed name, decision 2); only the copy says Wound Rank. The rank
labels on the sheet read "Honor Rank" and "Glory Rank" (Stage 17 decision 16), as `glossary.md` lists them, in place of
"Honor" and "Glory" (`:862-863`).

**Check.** `tests/conventions/glossary.test.js`: each glossary term in `lang/en.json` values has the glossary's letter
case, and no value uses a banned synonym.

## Names of game things

**Rule.** The name of a Skill, stance, school, spell, arrow, armor type, or maneuver is a proper name and keeps the
book's capitals, as an option value or inside a sentence. A generic word beside it follows sentence case.

|                | Example                                                                     | Source                                             |
| -------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| Conforming     | "Sleight of Hand"                                                           | `:836`                                             |
| Conforming     | "You cannot Guard in the Full Attack Stance"                                | `:654` (without its period, per **Notifications**) |
| Conforming     | "Armor Piercing arrow ignores armor" (the arrow's name, then generic words) | `:630`                                             |
| Non-conforming | "Sleight of hand" (sentence case applied to a Skill's name)                 | modeled on `:836`                                  |

**Check.** `tests/conventions/glossary.test.js` for names the glossary lists; review for the rest.

## Buttons

**Rule.** A button label starts with a verb that names what happens: "Roll", "Apply", "Remove", "Add as another
School". A confirmation dialog's buttons name the action again ("Remove", "Replace"), never "Yes", "OK", or "Confirm".
"Cancel" closes without acting.

|                | Example                                               | Source            |
| -------------- | ----------------------------------------------------- | ----------------- |
| Conforming     | "Remove this effect"                                  | `:383`            |
| Conforming     | "Replace" and "Add as another School" for a choice    | `:431-432`        |
| Non-conforming | "Honor Roll" as a button (write "Make an Honor Roll") | `:395`            |
| Non-conforming | "OK" as the button that removes an item               | modeled on `:118` |

**Check.** Review. A label cannot be tested for being a verb.

## Remove, not Delete

**Rule.** Copy uses "Remove" for taking anything away: an item from a character, an effect, a rule, an attack, money.
Stage 17 decision 16 sets it, and it is the majority form (5 values to 3 for "Delete"). Code keeps the `delete*` verb
(decision 15 verb vocabulary); core's own document dialogs keep core's wording.

|                | Example                               | Source         |
| -------------- | ------------------------------------- | -------------- |
| Conforming     | "Remove this rule"                    | `:197`         |
| Conforming     | "Remove" in the Wealth Manager        | `:709`         |
| Non-conforming | "Delete Item?" (write "Remove item?") | `:779`         |
| Non-conforming | "Delete" as a shared label            | `:115`, `:583` |

**Check.** `tests/lang.test.js`: no `lang/en.json` value holds the word "Delete".

## Notifications

**Rule.** A notification is one sentence with no trailing period (decision 15). It states what happened or what is
missing, then what to do, joined with a colon or "or". A failure reads "Failed to <verb> <object>". A notification
names the character with `{name}`, never "this actor".

|                | Example                                                                                                          | Source                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Conforming     | "Failed to update armor configuration"                                                                           | `:7`                                                  |
| Conforming     | "No Void Points available to reduce damage"                                                                      | `:541`                                                |
| Non-conforming | "{name} has already spent a Void Point this Round." (drop the period)                                            | `:189`, shown by `module/services/effects/uses.js:83` |
| Non-conforming | "No token selected. Select a token to apply wounds." (write "No token selected: select a token to apply Wounds") | `:540`                                                |
| Non-conforming | A literal string: `ui.notifications?.warn("Token has no actor")`                                                 | `module/services/combat/legacy-damage.js:48`          |

**Check.** `tests/lang.test.js` collects the keys passed to `ui.notifications.*` in `module/` and fails a value that
ends with a period. ESLint `no-restricted-syntax` (the presentation-in-JavaScript selectors in `eslint.config.mjs`)
fails a string or template literal passed to `ui.notifications.*`.

## Hints and sentences

**Rule.** Hints, dialog body text, chat card notes, and empty states are full sentences and end with a period. Labels,
buttons, titles, and tooltips never end with a period. No value ends with "!" and no value is in capitals.

|                | Example                                                                     | Source |
| -------------- | --------------------------------------------------------------------------- | ------ |
| Conforming     | "Unskilled Roll: dice do not explode, and no Raises or Free Raises apply."  | `:166` |
| Conforming     | "Nothing matches." as an empty state                                        | `:304` |
| Non-conforming | "No emphases in list" as an empty state (write "No Emphases in this list.") | `:699` |
| Non-conforming | "CATASTROPHIC FAILURE! ..."                                                 | `:558` |
| Non-conforming | "Fully healed!"                                                             | `:530` |

**Check.** `tests/lang.test.js`: every `hint` and `<field>Hint` value ends with a period; no `title` key and no value
in the `tabs` or `common` groups ends with one; no value ends with "!" or holds two words in a row written in
capitals.

## Voice and confirmations

**Rule.** Copy speaks to the user as "you" about the user's own action or permission, and names the character with
`{name}` otherwise. Full forms, no contractions: "cannot", "do not" (the majority, 6 values to 3). A confirmation asks
the action as a question and then states the consequence. The system's name never prefixes a value.

|                | Example                                                                                               | Source  |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| Conforming     | "End the encounter? Fear and every other effect lasting until the encounter ends will end now."       | `:177`  |
| Conforming     | "You cannot Guard in the Full Attack Stance"                                                          | `:654`  |
| Non-conforming | "You don't have permission to roll damage for this actor" (write "You cannot roll damage for {name}") | `:752`  |
| Non-conforming | "Are you sure you want to delete {name}?" (write "Remove {name}?")                                    | `:780`  |
| Non-conforming | "L5R4 Migration: Updated {count} world image path(s)."                                                | `:1016` |

**Check.** `tests/lang.test.js` fails `n't` and a leading "L5R4" in values; review for the rest.

## Placeholders

**Rule.** `{name}` is the character or actor the message is about. A second actor in the same value takes its role:
`{target}`, `{giver}`. Item, effect, and spell names use their kind: `{item}`, `{effect}`, `{spell}`. The full naming
rules for placeholders are in [localization.md](localization.md#interpolation).

|                | Example                                                                      | Source |
| -------------- | ---------------------------------------------------------------------------- | ------ |
| Conforming     | "{name} is knocked Prone."                                                   | `:638` |
| Conforming     | "{name} gains {item} from {giver} (School Rank {rank})."                     | `:420` |
| Non-conforming | "{character} has no Willpower trait" (write "{name} has no Willpower Trait") | `:560` |
| Non-conforming | "{actor} is immune to {effect}."                                             | `:183` |
| Non-conforming | "vs {creature}"                                                              | `:562` |

**Check.** `tests/lang.test.js`: `{character}`, `{actor}`, and `{creature}` are not placeholder names.

## Numbers and dice

**Rule.** Numbers are digits. A modifier carries its sign (`+5`, `-5`); a TN, a rank, or a count does not. A dice pool
is `XkY`: rolled dice, a lowercase `k`, kept dice, no spaces (`game-rules/26_special_dice_rules.md`, p.77). A pool
modifier is signed (`+1k1`, `+0k1`); a flat bonus joins the pool with its sign and no space (`5k3+2`). Multiplication is
`×`, a change is `→`, a range is "1 to 10", a ratio of current to maximum is `{current}/{max}`.

|                | Example                                                 | Source                                     |
| -------------- | ------------------------------------------------------- | ------------------------------------------ |
| Conforming     | "Spend a Void Point (+1k1)"                             | `:167`                                     |
| Conforming     | "up to 5 × Insight Rank"                                | `:618`                                     |
| Conforming     | "{label} {from}→{to}"                                   | `:884`                                     |
| Conforming     | `signed(roll)` + `k` + `keep`, then the bonus: "+0k1+5" | `module/utils/rule-summary.js:55-60`       |
| Non-conforming | "-{penalty}kO" (the letter O; write "-{penalty}k0")     | `:557`                                     |
| Non-conforming | "x 2 +" (write "× 2 +")                                 | `:508`                                     |
| Non-conforming | "gains two Free Raises" (write "gains 2 Free Raises")   | `:688`                                     |
| Non-conforming | Parts joined with a space: "+1k1 +5"                    | `module/services/dice/check/card.js:79-87` |

`×` is the pick for multiplication (one value each way): the letter x reads as a variable beside `XkY`.

**Check.** `tests/lang.test.js` fails `k` followed by a letter after a digit or placeholder, and `x` between numbers
or placeholders. Review for pools built in code.

## Abbreviations

**Rule.** The allowed abbreviations are TN, XP, NPC, PC, GM, and DR (the book's weapon tables), and `ft` after a
number. Every other word is written out: "maximum", "minimum", "against", "for example". A value never spells out an
allowed abbreviation.

|                | Example                                                          | Source |
| -------------- | ---------------------------------------------------------------- | ------ |
| Conforming     | "Attack TN on foot"                                              | `:921` |
| Conforming     | "DR {pool}"                                                      | `:338` |
| Non-conforming | "Max Wounds" (write "Maximum Wounds")                            | `:505` |
| Non-conforming | "e.g., Samurai, Peasant" (write "for example, Samurai, Peasant") | `:965` |
| Non-conforming | "Experience Points" where every other value says XP              | `:593` |
| Non-conforming | "vs"                                                             | `:494` |

Syntax a user types, such as the text link keys in the link error messages (`sta`, `wil`, ...), appears as typed.

**Check.** `tests/lang.test.js`: "Max", "Min", "e.g.", "vs", and "Experience Points" are banned forms in
`lang/en.json` values. The glossary's Experience Points row shows "XP" as its label.

## Punctuation

**Rule.** A colon joins a label to its value or a cause to its result. No spaced hyphen as a dash; use a colon or a
semicolon. Key and mouse hints name keys with a capital and join them with `+`: "Shift+click", "Shift+right-click". A
page citation in copy reads "(p.N)" or "(pp.N, M)".

|                | Example                                                                                        | Source |
| -------------- | ---------------------------------------------------------------------------------------------- | ------ |
| Conforming     | "Wounds: {current}/{max} (suffered: {suffered})"                                               | `:529` |
| Conforming     | "(pp.231, 259)"                                                                                | `:599` |
| Non-conforming | "targets - TN not auto-set" (write "Several targets: set the TN by hand")                      | `:495` |
| Non-conforming | "Shift+Left click: +1, Shift+Right click: -1" (write "Shift+click: +1, Shift+right-click: -1") | `:771` |

**Check.** `tests/lang.test.js` fails " - " between words; review for key hints.

## Tooltips

**Rule.** An icon-only control's tooltip is its label: a verb phrase in sentence case, no period, the same key in
`data-tooltip` and `aria-label` (Stage 17 decision 16). A control with visible text carries a tooltip, such as the
reason it is disabled, in `data-tooltip` alone. No control uses `title`. A tooltip names the action, not the gesture:
no "Click to". A tooltip that needs a sentence of explanation belongs in a hint.

|                | Example                                                                                                     | Source                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Conforming     | `data-tooltip` and `aria-label` both `l5r4.ui.effectPanel.remove` ("Remove this effect")                    | `templates/apps/effect-panel.hbs:18-19`     |
| Non-conforming | Icon-only button with `data-tooltip` "Delete" and no `aria-label`                                           | `templates/apps/emphasis-manager.hbs:35-41` |
| Non-conforming | "Click to change the maximum XP gained from disadvantages" (write "Change the XP limit from Disadvantages") | `:890`                                      |
| Non-conforming | "Click to test Fear against selected characters"                                                            | `:555`                                      |

**Check.** `tests/conventions/templates.test.js`: every icon-only button carries `data-tooltip` and `aria-label`, and
no element carries `title`. `tests/lang.test.js` fails a value starting "Click to". Review for wording.

## Fixed names

Copy itself is not stored, with two exceptions where a change reaches only new documents:

| Stored copy                         | Why it stays                                                                                                         | Consequence of a rewording                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Chat card HTML                      | A posted card's HTML is stored in the message (decision 2)                                                           | Cards already posted keep their old text        |
| Status effect names                 | Core localizes the name when it creates the effect and stores the text [src: client/documents/active-effect.mjs:131] | Effects already on actors keep their old name   |
| `TYPES.<Document>.<subtype>` labels | Core requires the `TYPES` group                                                                                      | The key path stays; the value follows this page |
