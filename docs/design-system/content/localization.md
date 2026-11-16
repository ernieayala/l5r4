# Localization

How `lang/en.json` is organized: key paths, one key per meaning, placeholders, plurals, key order, and how a key change
reaches the five translations. [voice.md](voice.md) covers how the values read.

| Item                | Detail                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source              | `lang/en.json`. A new key goes here only (CLAUDE.md **Project Context**)                                                                                                                                       |
| Translations        | `lang/de.json`, `es.json`, `fr.json`, `pt-BR.json`, `ru.json`, declared in `system.json` `languages`                                                                                                           |
| Fallback            | Core falls back to the English value for a key a translation lacks [src: client/helpers/localization.mjs:441]                                                                                                  |
| API                 | `T(key)` and `F(key, data)` in `module/utils/localization.js` over `game.i18n.localize(key, data)`; `{{localize "key" name=value}}` in templates. Never `game.i18n.format` (CLAUDE.md **Foundry Integration**) |
| Key path naming     | This page holds the detail; the i18n row of [`docs/code-system/naming.md`](../../code-system/naming.md) points here                                                                                            |
| Tokens and partials | None                                                                                                                                                                                                           |
| Checks              | `tests/lang.test.js`, `tests/conventions/templates.test.js`; "review" where a pattern cannot judge                                                                                                             |

Line numbers below are `lang/en.json` unless a file is named.

## Key paths

**Rule.** Every key sits under `l5r4.` as `l5r4.<area>.<group>.<key>`, with at most one subgroup between group and key
(depth 4 or 5; 792 of 841 leaves today). A plural group adds one level (**Plurals**). The one group outside `l5r4.` is
`TYPES`, which core requires for subtype labels. Settings and status effect names sit under `l5r4.` with the rest (798
of 841 leaves are there already).

| Area        | Holds                                                                                                                                                                     | Example                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `apps`      | One group per window in `module/apps/`, named after the file in camelCase (`armor-config.js` is `apps.armorConfig`): its `title`, labels, and `errors`                    | `l5r4.apps.armorConfig.errors.updateFailed` (`:7`) |
| `ui`        | Strings shared across features, one group per feature: `common`, `tabs`, `check`, `effects`, `rules`, `ruleSummary`, `links`, `combat`, `mechanics`, `statusEffects`, ... | `l5r4.ui.effects.voidLimit` (`:189`)               |
| `character` | Labels for actor data: Skills, ranks, experience, Skill types, Advantage types                                                                                            | `l5r4.character.ranks.statusRank` (`:864`)         |
| `equipment` | Weapon and armor labels and option lists                                                                                                                                  | `l5r4.equipment.armor.types.light` (`:959`)        |
| `magic`     | Spell, maho, and kiho labels and option lists                                                                                                                             | `l5r4.magic.spells.affinity` (`:977`)              |
| `system`    | `settings`, `migration`, and system-wide `errors`                                                                                                                         | `l5r4.system.errors.createEffect` (`:1021`)        |
| `world`     | Campaign data: currency names                                                                                                                                             | `l5r4.world.wealth.koku` (`:1027`)                 |

|                | Example                                                                                                                                                               | Source         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Conforming     | `l5r4.apps.wealthManager.errors.insufficientFunds`                                                                                                                    | `:42`          |
| Conforming     | `TYPES.Item.commonItem` (core reads it)                                                                                                                               | `:1081`        |
| Non-conforming | `SETTINGS.floatingNumbers.hint` (write `l5r4.system.settings.floatingNumbers.hint`)                                                                                   | `:1040`        |
| Non-conforming | `EFFECT.blinded` (write `l5r4.ui.statusEffects.blinded`)                                                                                                              | `:1056`        |
| Non-conforming | `l5r4.ui.wealthManager.addMoney`: a window's strings outside `apps` (write `l5r4.apps.wealthManager.addMoney`)                                                        | `:704`         |
| Non-conforming | `l5r4.ui.browser.*` and `l5r4.ui.effectPanel.*` are the strings of `compendium-browser.js` and `effect-panel.js` (write `apps.compendiumBrowser`, `apps.effectPanel`) | `:298`, `:374` |

`apps.<app>` is the majority home for a window's strings (23 keys to 18 under `ui.<app>`).

**Check.** `tests/lang.test.js`: every leaf path outside `TYPES` starts with `l5r4.`, its area is one of the seven
above, and its depth is 4 or 5 (6 inside a plural group).

## Segments

**Rule.** A key segment is camelCase made of whole words. "TN" inside a segment is `Tn`. A segment does not repeat its
parent's stem. A segment that mirrors a fixed name keeps that name's spelling, PascalCase and kebab-case included (see
**Fixed names**).

|                | Example                                                                                                                | Source                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Conforming     | `l5r4.ui.mechanics.wounds.armorTnBase`                                                                                 | `:501`                         |
| Conforming     | `l5r4.ui.ruleSummary.TNModifier` (mirrors the rule key)                                                                | `:207`                         |
| Non-conforming | `freeRaisesToTN`, `checkTN` (write `freeRaisesToTn`, `checkTn`)                                                        | `:141`, `:351`                 |
| Non-conforming | `wounds.wounds`, `fear.fearRank` (write `wounds.label`, `fear.rank`)                                                   | `:499`, `:552`                 |
| Non-conforming | `common.init`, `common.mod`, `sheets.bio`, `spells.aoe` (write `initiative`, `modifier`, `background`, `areaOfEffect`) | `:571`, `:573`, `:717`, `:973` |

**Check.** `tests/lang.test.js`: every segment matches `^[a-z][a-zA-Z0-9]*$`, contains no `TN`, and does not start with
its parent's name, unless it is on the fixed-name list.

## Standard leaves and groups

**Rule.** These names mean one thing wherever they appear. Each is the majority form of its split.

| Name          | Holds                                                    | Majority                                               | Conforming                                                 | Non-conforming                                                                                                              |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `title`       | A window or dialog title                                 | 25 of 25 titles                                        | `apps.armorConfig.title` (`:5`)                            | `ui.combat.configuration` (`:606`): a second copy of `apps.combatConfig.title`                                              |
| `errors`      | A feature's failure and refusal messages                 | 8 groups to 1 `error` and 7 `ui.notifications.*Failed` | `apps.wealthManager.errors` (`:38`)                        | `ui.links.error` (`:360`); `ui.notifications.wealthManagerFailed` (`:759`, write `apps.wealthManager.errors.openFailed`)    |
| `<field>Hint` | Help for one field, beside the field's key               | 14, the most-used of seven forms                       | `ui.check.voidSkill` with `voidSkillHint` (`:168-169`)     | `ui.emphasisManager.help` (`:698`); `stances.fullDefenseDescription` (`:549`); `experience.disadvantageCapTooltip` (`:890`) |
| `hint`        | Help for a whole window, section, or setting             | Core's setting field name                              | `ui.rules.hint` (`:193`); `floatingNumbers.hint` (`:1040`) | `SETTINGS.LtException.label` holding the hint (`:1036`; same at `:1048`, `:1052`)                                           |
| `name`        | A setting's name                                         | Core's setting field name                              | `honorRoll.name` (`:1043`)                                 |                                                                                                                             |
| `common`      | Labels shared by many features: Cancel, Save, Edit, Roll | `ui.common` 38 keys to `ui.label` 11                   | `ui.common.cancel` (`:567`)                                | `ui.label.cancel` (`:114`)                                                                                                  |

An icon-only control's tooltip reads the control's label key ([voice.md](voice.md#tooltips)); there is no separate
tooltip key.

**Check.** `tests/lang.test.js`: no group is named `error`, `label`, or `help`; no leaf ends in `Tooltip` or
`Description`; a `<field>Hint` has a sibling `<field>`.

## One key per meaning

**Rule.** A meaning has one key, and every template and module reads that key. Two meanings that share an English word
keep two keys, because a translation may need two words. A sentence is one key with placeholders, never fragments
joined in code or in a template.

|                | Example                                                                                   | Source                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Conforming     | "{name} takes {wounds} Wounds from {damage} damage" as one key                            | `:643`                                                                                |
| Non-conforming | `ui.emphasisManager.addCustom` repeats `apps.emphasisManager.addCustom`                   | `:696`, `:24`                                                                         |
| Non-conforming | `ui.mechanics.wounds.woundConfiguration` repeats `apps.woundConfig.title`                 | `:512`, `:47`                                                                         |
| Non-conforming | `` `${T("l5r4.ui.check.damageFor")} ${spec.label}` `` joins a fragment to a name          | `module/services/combat/damage.js:84`, `module/services/dice/rolls/weapon-roll.js:42` |
| Non-conforming | `({{localize "l5r4.ui.check.of"}} {{freeRaises}})` builds a phrase from the fragment "of" | `templates/dialogs/check-dialog.hbs:55`                                               |

### Duplicate trees

The option lists exist twice. The tree the templates read and the translations carry wins; `l5r4.mechanics` goes, and
the constants in `module/config/localization.js` point at the winners. Basis: all five translations translate the
winning trees and none carries `l5r4.mechanics`, and templates read the winners in about 150 places against 33 lines
in one config file.

| Meaning                  | Wins                                                           | Removed                                                                               |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ring names               | `l5r4.ui.mechanics.rings` (`:449`)                             | `l5r4.mechanics.rings` (`:77`)                                                        |
| Trait names              | `l5r4.ui.mechanics.traits` (`:461`)                            | `l5r4.mechanics.traits` (`:99`)                                                       |
| Stance names             | `l5r4.ui.mechanics.stances` (`:543`)                           | `l5r4.mechanics.stances` (`:92`)                                                      |
| Skill types              | `l5r4.character.skillTypes` (`:847`)                           | `l5r4.mechanics.skills.types` (`:85`)                                                 |
| Advantage types          | `l5r4.character.advantages` (`:853`)                           | `l5r4.mechanics.advantages.types` (`:60`)                                             |
| Kiho types               | `l5r4.magic.kiho` (`:1007`)                                    | `l5r4.mechanics.magic.kiho` (`:70`)                                                   |
| Shared labels            | `l5r4.ui.common` (`:565`), which takes `add`, `all`, `complex` | `l5r4.ui.label` (`:111`): its 8 copies go                                             |
| Emphasis Manager strings | `l5r4.apps.emphasisManager` (`:22`)                            | `l5r4.ui.emphasisManager` (`:694`)                                                    |
| Wealth Manager strings   | `l5r4.apps.wealthManager` (`:36`)                              | `l5r4.ui.wealthManager` (`:701`)                                                      |
| Window titles            | `l5r4.apps.<app>.title`                                        | `ui.combat.configuration` (`:606`), `ui.mechanics.wounds.woundConfiguration` (`:512`) |

**Check.** `tests/lang.test.js`: the removed trees above do not exist. Review for other repeated values (two meanings
may share a word) and for fragments.

## Interpolation

**Rule.** A placeholder is `{camelCase}` and names what the value means, not its type: `{tn}`, `{rank}`, `{pool}` (an
`XkY` string), `{count}` (a number that picks a plural), `{value}`. `{name}` is the actor the message is about
([voice.md](voice.md#placeholders)). Code passes a value for every placeholder: core writes "undefined" for a
placeholder with no data [src: client/helpers/localization.mjs:444]. A translation uses the same placeholders as the
English value.

|                | Example                                                                  | Source                           |
| -------------- | ------------------------------------------------------------------------ | -------------------------------- |
| Conforming     | "{roll} roll against TN {tn}."                                           | `:185`                           |
| Conforming     | `F("l5r4.ui.purchase.unmet", { name: data.name, list })`                 | `module/services/purchase.js:96` |
| Non-conforming | `{character}` for the actor (write `{name}`)                             | `:560`                           |
| Non-conforming | `F("l5r4.ui.mechanics.fear.noWillpower", { character: character.name })` | `module/services/fear.js:45`     |

All 129 values with placeholders use camelCase or one lowercase word.

**Check.** `tests/lang.test.js`: every placeholder matches `^\{[a-z][a-zA-Z0-9]*\}$`, and each translation value holds
the same set of placeholders as its `en.json` value. Review that code passes each one.

## Plurals

**Rule.** A value whose noun changes with a count is a group of Intl plural categories, selected with
`game.i18n.pluralRules.select(count)` [src: client/helpers/localization.mjs:62]. `en.json` defines `one` and `other`;
a translation adds the categories its language needs (`ru` uses `one`, `few`, `many`, `other`). Core uses the same
shape (`SUPPORT.UnavailableDocuments` [src: public/lang/en.json:3978], read at
[src: client/applications/sidebar/document-directory.mjs:422]). A value that reads the same for every count, such as
"Entries: {count}" (`:303`), stays one leaf.

|                | Example                                                                                                     | Source            |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- |
| Conforming     | `"exported": { "one": "Exported 1 item from {folder}.", "other": "Exported {count} items from {folder}." }` | modeled on `:442` |
| Non-conforming | "Exported {count} items from {folder}." as one leaf (reads "1 items")                                       | `:442`            |
| Non-conforming | "Updated {count} world image path(s)."                                                                      | `:1016`           |

**Check.** `tests/lang.test.js`: no value contains `(s)`; a group with a `one` leaf has an `other` leaf; a translation's
plural category that `en.json` leaves out is accepted under a group with `one` and `other`, and its placeholders match
`other`'s. The existing
unused-key check accepts the built key `` `${prefix}.${category}` `` (`tests/lang.test.js:49-74`).

## Key order

**Rule.** The keys of every group, leaves and subgroups together, are sorted with `a.localeCompare(b, "en")`. Each
translation keeps the same order as `en.json` for the keys it has. Sorting is the rule for every group (32 groups are
sorted today, 96 are not).

|                | Example                                                      | Source       |
| -------------- | ------------------------------------------------------------ | ------------ |
| Conforming     | `EFFECT`: `blinded`, `concentration`, `dazed`, ... `stunned` | `:1055-1069` |
| Conforming     | `TYPES.Item`: `advantage`, `armor`, `bow`, ... `weapon`      | `:1076-1091` |
| Non-conforming | `ui.label`: `save`, then `simple`, `complex`, `free`         | `:119-122`   |
| Non-conforming | `ui.common`: `roll`, `cancel`, `ok`, `none`, ...             | `:566-569`   |

**Check.** `tests/lang.test.js`: each group's keys equal their sorted copy, in `en.json` and in each translation.

## Keys built at run time

**Rule.** A key built in code ends in a segment that mirrors a fixed name or a Config key: a Trait or Ring key, a rule
key, a tab id. Its group exists in `en.json`, and every value in it is reachable from the code that builds it.

|                | Example                                                                        | Source                        |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| Conforming     | ``T(`l5r4.ui.mechanics.traits.${trait}`)`` where `trait` is a stored Trait key | `module/services/links.js:28` |
| Non-conforming | A built key whose last segment is user text, such as an item name              | modeled                       |

**Check.** `tests/lang.test.js`: the group under every template-literal key exists (`tests/lang.test.js:76-83`), and
no key goes unused (`tests/lang.test.js:49-74`).

## How a key change reaches the translations

**Rule.** One change edits all six `lang/*.json` files together, so a key never moves in `en.json` alone.

| Change                                                              | `en.json`                                             | Each of the five translations                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| New key                                                             | Add it                                                | Nothing; the English value shows until a translator adds one                                   |
| Rename or move a key                                                | Rename it                                             | Rename it in the same commit, carrying the translated value                                    |
| Remove a key                                                        | Remove it                                             | Remove it in the same commit                                                                   |
| Reword with the same meaning (case, punctuation, a term's spelling) | Change the value                                      | Nothing; the key and the translation stay                                                      |
| Change the meaning                                                  | Give the new meaning a new key and remove the old one | Remove the old key, so no stale translation shows; the new key falls back to English           |
| Merge a duplicate tree                                              | Remove the losing tree                                | Move each translated value to the winning path if it is not there, then remove the losing tree |

A translation omits a key it has not translated instead of copying the English text (review).

|                | Example                                                                                                                                                                         | Source                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Conforming     | `ui.mechanics.rings.fire` exists at the same path in `en.json` and every translation                                                                                            | `:451`, `lang/de.json:13` |
| Non-conforming | A top-level `conditions` group of `*.restrictions` keys that `en.json` does not have, in all five translations                                                                  | `lang/de.json:488`        |
| Non-conforming | `ui.wealthManager.insufficientFunds` and `insufficientForConversion` left behind after `en.json` moved them to `apps.wealthManager.errors` (`:41-42`), in all five translations | `lang/de.json:190-191`    |

**Check.** `tests/lang.test.js`: every key in a translation exists in `en.json` with the same type (string or group),
with the same placeholders, and in the same order. A key renamed in `en.json` but not in a translation fails.

## Fixed names

i18n keys are not stored, so any key may change (decision 2). These segments mirror stored or external names and keep
their spelling:

| Segment                                                                                                                                                                                                                                                  | Where                                                                             | Why it is fixed                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `TYPES.<Document>.<subtype>`: `Actor` `pc`, `npc`; `Item` `advantage`, `armor`, `bow`, `clan`, `commonItem`, `disadvantage`, `family`, `kata`, `kiho`, `school`, `skill`, `spell`, `tattoo`, `technique`, `weapon`; `ChatMessage` `roll`, `checkRequest` | `:1071`                                                                           | Core reads the labels at this path; the subtypes are stored on every document |
| Setting keys `LtException`, `floatingNumbers`, `honorRoll`, `runMigration`, `forceMigration`                                                                                                                                                             | `l5r4.system.settings.<key>`                                                      | Setting keys are stored in world and client settings                          |
| Status effect ids `blinded`, `concentration`, `dazed`, `dead`, `entangled`, `fasting`, `fatigued`, `feared`, `grappled`, `guarded`, `guarding`, `mounted`, `prone`, `stunned`                                                                            | `l5r4.ui.statusEffects.<id>`                                                      | Ids are stored in each effect's `statuses`                                    |
| Rule keys (`RollModifier`, `TNModifier`, `ArmorTN`, ... `GrantItem`)                                                                                                                                                                                     | `l5r4.ui.ruleSummary.<key>` (`:206-234`), built in `module/utils/rule-summary.js` | Rule keys are stored in `system.rules`                                        |
| Rule selector kinds `any`, `skill`, `trait`, `ring`, `attack`, `damage`, `spell`, `maho`, `skill-type`, `skill-tag`                                                                                                                                      | `l5r4.ui.ruleSummary.selector.<kind>` (`:254-266`)                                | Stored in `system.rules`                                                      |
| Rule field values: `range` `melee`, `ranged`; `armorTn` `base`, `total`; `per` `turn`, `round`, `skirmish`, `day`; `maneuver`, `action`, `direction` values                                                                                              | `l5r4.ui.ruleSummary.<field>.<value>` (`:246-288`)                                | Stored in `system.rules`                                                      |
| Trait keys `sta`, `wil`, `str`, `per`, `ref`, `awa`, `agi`, `int`; Ring keys `air`, `earth`, `fire`, `water`, `void`; Advantage, kiho, and Skill `system.type` values; currency `koku`, `bu`, `zeni`                                                     | The option-list groups                                                            | `system` field names and values stored on actors and items                    |
