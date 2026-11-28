# Localization

How `lang/en.json` is organized: key paths, one key per meaning, placeholders, plurals, key order, and how a key change reaches the five translations. [voice.md](voice.md) covers how the values read.

| Item | Detail |
| --- | --- |
| Source | `lang/en.json`. A new key goes here only (CLAUDE.md **Project Context**) |
| Translations | `lang/de.json`, `es.json`, `fr.json`, `pt-BR.json`, `ru.json`, declared in `system.json` `languages` |
| Fallback | Core falls back to the English value for a key a translation lacks [src: client/helpers/localization.mjs:441] |
| API | `T(key)` and `F(key, data)` in `module/utils/localization.js` over `game.i18n.localize(key, data)`; `{{localize "key" name=value}}` in templates. Never `game.i18n.format` (CLAUDE.md **Foundry Integration**) |
| Key path naming | This page holds the detail; the i18n row of [`docs/code-system/naming.md`](../../code-system/naming.md) points here |
| Tokens and partials | None |
| Checks | `tests/lang.test.js`, `tests/conventions/templates.test.js`; "review" where a pattern cannot judge |

## Key paths

**Rule.** Every key sits under `l5r4.` as `l5r4.<area>.<group>.<key>`, with at most one subgroup between group and key (depth 4 or 5, where every leaf under `l5r4.` sits). A plural group adds one level (**Plurals**). The one group outside `l5r4.` is `TYPES`, which core requires for subtype labels. Settings and status effect names sit under `l5r4.` with the rest.

| Area | Holds | Example |
| --- | --- | --- |
| `apps` | One group per window in `module/apps/`, named after the file in camelCase (`armor-config.js` is `apps.armorConfig`): its `title`, labels, and `errors` | `l5r4.apps.armorConfig.errors.updateFailed` (`lang/en.json`) |
| `ui` | Strings shared across features, one group per feature: `common`, `tabs`, `check`, `effects`, `rules`, `ruleSummary`, `links`, `combat`, `mechanics`, `statusEffects`, ... | `l5r4.ui.effects.voidLimit` (`lang/en.json`) |
| `character` | Labels for actor data: Skills, ranks, experience, Skill types, Advantage types | `l5r4.character.ranks.statusRank` (`lang/en.json`) |
| `equipment` | Weapon and armor labels and option lists | `l5r4.equipment.armor.types.light` (`lang/en.json`) |
| `magic` | Spell, maho, and kiho labels and option lists | `l5r4.magic.spells.affinity` (`lang/en.json`) |
| `system` | `settings`, `migration`, and system-wide `errors` | `l5r4.system.errors.createEffect` (`lang/en.json`) |
| `world` | Campaign data: currency names | `l5r4.world.wealth.koku` (`lang/en.json`) |

|  | Example | Source |
| --- | --- | --- |
| Conforming | `l5r4.apps.wealthManager.errors.insufficientFunds` | `l5r4.apps.wealthManager.errors.insufficientFunds` (`lang/en.json`) |
| Conforming | `TYPES.Item.commonItem` (core reads it) | `TYPES.Item.commonItem` (`lang/en.json`) |
| Non-conforming | `SETTINGS.floatingNumbers.hint` (write `l5r4.system.settings.floatingNumbers.hint`) | modeled on `l5r4.system.settings.floatingNumbers.hint` (`lang/en.json`) |
| Non-conforming | `EFFECT.blinded` (write `l5r4.ui.statusEffects.blinded`) | modeled on `l5r4.ui.statusEffects.blinded` (`lang/en.json`) |
| Non-conforming | `l5r4.ui.wealthManager.addMoney`: a window's strings outside `apps` (write `l5r4.apps.wealthManager.addMoney`) | modeled on `l5r4.apps.wealthManager.addMoney` (`lang/en.json`) |
| Non-conforming | `l5r4.ui.browser.*` and `l5r4.ui.effectPanel.*` as the strings of `compendium-browser.js` and `effect-panel.js` (write `apps.compendiumBrowser`, `apps.effectPanel`) | modeled on `l5r4.apps.compendiumBrowser` (`lang/en.json`), `l5r4.apps.effectPanel` (`lang/en.json`) |

**Check.** `tests/lang.test.js`: every leaf path outside `TYPES` starts with `l5r4.`, its area is one of the seven above, and its depth is 4 or 5 (6 inside a plural group).

## Segments

**Rule.** A key segment is camelCase made of whole words. "TN" inside a segment is `Tn`. A segment does not repeat its parent's stem. A segment that mirrors a fixed name keeps that name's spelling, PascalCase and kebab-case included (see **Fixed names**).

|  | Example | Source |
| --- | --- | --- |
| Conforming | `l5r4.ui.mechanics.wounds.armorTnBase` | `l5r4.ui.mechanics.wounds.armorTnBase` (`lang/en.json`) |
| Conforming | `l5r4.ui.ruleSummary.TNModifier` (mirrors the rule key) | `l5r4.ui.ruleSummary.TNModifier` (`lang/en.json`) |
| Non-conforming | `freeRaisesToTN`, `checkTN` (write `freeRaisesToTn`, `checkTn`) | modeled on `l5r4.ui.check.freeRaisesToTnNote` (`lang/en.json`), `l5r4.ui.links.checkTn` (`lang/en.json`) |
| Non-conforming | `wounds.wounds`, `fear.fearRank` (write `wounds.label`, `fear.rank`) | modeled on `l5r4.ui.mechanics.wounds.label` (`lang/en.json`), `l5r4.ui.mechanics.fear.rank` (`lang/en.json`) |
| Non-conforming | `common.init`, `common.mod`, `sheets.bio`, `spells.aoe` (write `initiative`, `modifier`, `background`, `areaOfEffect`) | modeled on `l5r4.ui.common.initiative` (`lang/en.json`), `l5r4.ui.common.modifier` (`lang/en.json`), `l5r4.ui.sheets.background` (`lang/en.json`), `l5r4.magic.spells.areaOfEffect` (`lang/en.json`) |

**Check.** `tests/lang.test.js`: every segment matches `^[a-z][a-zA-Z0-9]*$`, contains no `TN`, and does not start with its parent's name, unless it is on the fixed-name list.

## Standard leaves and groups

**Rule.** These names mean one thing wherever they appear. `hint` and `name` are core's setting field names.

| Name | Holds | Conforming | Non-conforming |
| --- | --- | --- | --- |
| `title` | A window or dialog title | `l5r4.apps.armorConfig.title` (`lang/en.json`) | `ui.combat.configuration`: a second copy of `apps.combatConfig.title` (modeled) |
| `errors` | A feature's failure and refusal messages | `l5r4.apps.wealthManager.errors` (`lang/en.json`) | `ui.links.error`; `ui.notifications.wealthManagerFailed` (write `apps.wealthManager.errors.openFailed`) (modeled) |
| `<field>Hint` | Help for one field, beside the field's key | `ui.check.voidSkill` with `voidSkillHint`; `experience.breakdown.cap` with `capHint` | `ui.emphasisManager.help`; `stances.fullDefenseDescription`; `experience.disadvantageCapTooltip` (modeled) |
| `hint` | Help for a whole window, section, or setting | `l5r4.ui.rules.hint` (`lang/en.json`); `l5r4.system.settings.floatingNumbers.hint` (`lang/en.json`) | `SETTINGS.LtException.label` holding the hint (modeled) |
| `name` | A setting's name | `l5r4.system.settings.honorRoll.name` (`lang/en.json`) |  |
| `common` | Labels shared by many features: Cancel, Save, Edit, Roll | `l5r4.ui.common.cancel` (`lang/en.json`) | `ui.label.cancel` (modeled) |

An icon-only control's tooltip reads the control's label key ([voice.md](voice.md#tooltips)); there is no separate tooltip key.

**Check.** `tests/lang.test.js`: no group is named `error`, `label`, or `help`; no leaf ends in `Tooltip` or `Description`; a `<field>Hint` has a sibling `<field>`.

## One key per meaning

**Rule.** A meaning has one key, and every template and module reads that key. Two meanings that share an English word keep two keys, because a translation may need two words. A sentence is one key with placeholders, never fragments joined in code or in a template.

|  | Example | Source |
| --- | --- | --- |
| Conforming | "{name} takes {wounds} Wounds from {damage} damage" as one key | `l5r4.ui.combat.resultTitle` (`lang/en.json`) |
| Non-conforming | `ui.emphasisManager.addCustom` repeats `apps.emphasisManager.addCustom` | modeled on `l5r4.apps.emphasisManager.addCustom` (`lang/en.json`) |
| Non-conforming | `ui.mechanics.wounds.woundConfiguration` repeats `apps.woundConfig.title` | modeled on `l5r4.apps.woundConfig.title` (`lang/en.json`) |
| Conforming | `F("l5r4.ui.check.damageLabel", { weapon: spec.label })`: "Damage for {weapon}" | `rollDamageFromAttack` (`module/services/combat/damage-roll.js`) |
| Non-conforming | `` `${T("l5r4.ui.check.damageFor")} ${spec.label}` `` joins a fragment to a name | modeled |
| Non-conforming | `({{localize "l5r4.ui.check.of"}} {{freeRaises}})` builds a phrase from the fragment "of" | modeled |

### Duplicate trees

Each meaning below has one tree: the one the templates read and the translations carry. The constants in `module/config/localization.js` point at the winning trees, and no removed tree exists in any `lang/*.json` file.

| Meaning | Wins | Removed |
| --- | --- | --- |
| Ring names | `l5r4.ui.mechanics.rings` (`lang/en.json`) | `l5r4.mechanics.rings` |
| Trait names | `l5r4.ui.mechanics.traits` (`lang/en.json`) | `l5r4.mechanics.traits` |
| Stance names | `l5r4.ui.mechanics.stances` (`lang/en.json`) | `l5r4.mechanics.stances` |
| Skill types | `l5r4.character.skillTypes` (`lang/en.json`) | `l5r4.mechanics.skills.types` |
| Advantage types | `l5r4.character.advantages` (`lang/en.json`) | `l5r4.mechanics.advantages.types` |
| Kiho types | `l5r4.magic.kiho` (`lang/en.json`) | `l5r4.mechanics.magic.kiho` |
| Shared labels | `l5r4.ui.common` (`lang/en.json`) | `l5r4.ui.label` |
| Emphasis Manager strings | `l5r4.apps.emphasisManager` (`lang/en.json`) | `l5r4.ui.emphasisManager` |
| Wealth Manager strings | `l5r4.apps.wealthManager` (`lang/en.json`) | `l5r4.ui.wealthManager` |
| Window titles | `l5r4.apps.<app>.title` | `ui.combat.configuration`, `ui.mechanics.wounds.woundConfiguration` |

**Check.** `tests/lang.test.js`: the removed trees above do not exist. ESLint `l5r4/joined-copy` (`tools/eslint/`) fails a localized string in `module/` or `dist/` joined to other text with `+` or in a template literal, and `l5r4/joined-title` names the same fault in a window, dialog, or card title. A suffix added to a label goes through `l5r4.ui.check.labelWithSuffix` ("{label} {suffix}"). `tests/conventions/templates.test.js` (`joined-localize`) fails two or more localize calls joined in one text node or attribute value of a template. Review for other repeated values (two meanings may share a word) and for a key joined to a value in a template.

## Interpolation

**Rule.** A placeholder is `{camelCase}` and names what the value means, not its type: `{tn}`, `{rank}`, `{pool}` (an `XkY` string), `{count}` (a number that picks a plural), `{value}`. `{name}` is the actor the message is about ([voice.md](voice.md#placeholders)). Code passes a value for every placeholder: core writes "undefined" for a placeholder with no data [src: client/helpers/localization.mjs:444]. A translation uses the same placeholders as the English value.

|  | Example | Source |
| --- | --- | --- |
| Conforming | "{roll} roll against TN {tn}." | `l5r4.ui.effects.saveText` (`lang/en.json`) |
| Conforming | `F("l5r4.ui.purchase.unmet", { name: data.name, list })` | `canAddItem` (`module/services/purchase.js`) |
| Non-conforming | `{character}` for the actor (write `{name}`) | modeled on `l5r4.ui.mechanics.fear.noWillpower` (`lang/en.json`) |
| Non-conforming | `F("l5r4.ui.mechanics.fear.noWillpower", { character: character.name })` | modeled |

All 188 values with placeholders use camelCase or one lowercase word.

**Check.** `tests/lang.test.js`: every placeholder matches `^\{[a-z][a-zA-Z0-9]*\}$`, and each translation value holds the same set of placeholders as its `en.json` value. Review that code passes each one.

## Plurals

**Rule.** A value whose noun changes with a count is a group of Intl plural categories, selected with `game.i18n.pluralRules.select(count)` [src: client/helpers/localization.mjs:62]. `en.json` defines `one` and `other`; a translation adds the categories its language needs (`ru` uses `one`, `few`, `many`, `other`). Core uses the same shape (`SUPPORT.UnavailableDocuments` [src: public/lang/en.json:3978], read at [src: client/applications/sidebar/document-directory.mjs:422]). A value that reads the same for every count, such as "Entries: {count}" (`l5r4.apps.compendiumBrowser.count` (`lang/en.json`)), stays one leaf.

|  | Example | Source |
| --- | --- | --- |
| Conforming | `"migrated": { "one": "Brought {count} document up to date with this version", "other": "Brought {count} documents up to date with this version" }` | `l5r4.system.migration.migrated` (`lang/en.json`) |
| Conforming | `"exported": { "one": "Exported {count} item from {folder}", "other": "Exported {count} items from {folder}" }`, read through `pluralKeyOf` | `l5r4.ui.transfer.exported` (`lang/en.json`), `exportItemFolder` (`module/services/item-transfer.js`) |
| Non-conforming | "Exported {count} items from {folder}" as one leaf (reads "1 items") | modeled on `l5r4.ui.transfer.exported` (`lang/en.json`) |
| Non-conforming | "Brought {count} document(s) up to date." | modeled on `l5r4.system.migration.migrated` (`lang/en.json`) |

**Check.** `tests/lang.test.js`: no value contains `(s)`; a group with a `one` leaf has an `other` leaf; a translation's plural category that `en.json` leaves out is accepted under a group with `one` and `other`, and its placeholders match `other`'s. The existing unused-key check, `should hold no key the system never uses` (`tests/lang.test.js`), accepts the built key `` `${prefix}.${category}` ``.

## Key order

**Rule.** The keys of every group, leaves and subgroups together, are sorted with `a.localeCompare(b, "en")`. Each translation keeps the same order as `en.json` for the keys it has. All 134 groups of `en.json` are sorted.

|  | Example | Source |
| --- | --- | --- |
| Conforming | `ui.statusEffects`: `blinded`, `concentration`, `dazed`, ... `stunned` | `l5r4.ui.statusEffects` (`lang/en.json`) |
| Conforming | `TYPES.Item`: `advantage`, `armor`, `bow`, ... `weapon` | `TYPES.Item` (`lang/en.json`) |
| Non-conforming | `ui.label`: `save`, then `simple`, `complex`, `free` | modeled |
| Non-conforming | `ui.common`: `roll`, `cancel`, `ok`, `none`, ... | modeled on `l5r4.ui.common` (`lang/en.json`) |

**Check.** `tests/lang.test.js`: each group's keys equal their sorted copy, in `en.json` and in each translation.

## Keys built at run time

**Rule.** A key built in code ends in a segment that mirrors a fixed name or a Config key: a Trait or Ring key, a rule key, a tab id. Its group exists in `en.json`, and every value in it is reachable from the code that builds it.

|  | Example | Source |
| --- | --- | --- |
| Conforming | ``T(`l5r4.ui.mechanics.traits.${trait}`)`` where `trait` is a stored Trait key | `formatTraitName` (`module/services/links.js`) |
| Non-conforming | A built key whose last segment is user text, such as an item name | modeled |

**Check.** `tests/lang.test.js`: the group under every template-literal key exists (`should define the group under every key built from a template literal` (`tests/lang.test.js`)), and no key goes unused (`should hold no key the system never uses` (`tests/lang.test.js`)).

## How a key change reaches the translations

**Rule.** One change edits all six `lang/*.json` files together, so a key never moves in `en.json` alone.

| Change | `en.json` | Each of the five translations |
| --- | --- | --- |
| New key | Add it | Nothing; the English value shows until a translator adds one |
| Rename or move a key | Rename it | Rename it in the same commit, carrying the translated value |
| Remove a key | Remove it | Remove it in the same commit |
| Reword with the same meaning (case, punctuation, a term's spelling) | Change the value | Nothing; the key and the translation stay |
| Change the meaning | Give the new meaning a new key and remove the old one | Remove the old key, so no stale translation shows; the new key falls back to English |
| Merge a duplicate tree | Remove the losing tree | Move each translated value to the winning path if it is not there, then remove the losing tree |

A translation omits a key it has not translated instead of copying the English text (review).

|  | Example | Source |
| --- | --- | --- |
| Conforming | `ui.mechanics.rings.fire` exists at the same path in `en.json` and every translation | `l5r4.ui.mechanics.rings.fire` (`lang/en.json`), `l5r4.ui.mechanics.rings.fire` (`lang/de.json`) |
| Non-conforming | A top-level `conditions` group of `*.restrictions` keys that `en.json` does not have, in all five translations | modeled |
| Non-conforming | `ui.wealthManager.insufficientFunds` and `insufficientForConversion` left behind in all five translations after `en.json` moved them to `apps.wealthManager.errors` | modeled on `l5r4.apps.wealthManager.errors` (`lang/en.json`) |

**Check.** `tests/lang.test.js`: every key in a translation exists in `en.json` with the same type (string or group), with the same placeholders, and in the same order. A key renamed in `en.json` but not in a translation fails.

## Fixed names

i18n keys are not stored, so any key may change (decision 2). These segments mirror stored or external names and keep their spelling:

| Segment | Where | Why it is fixed |
| --- | --- | --- |
| `TYPES.<Document>.<subtype>`: `Actor` `pc`, `npc`; `Item` `advantage`, `armor`, `bow`, `clan`, `commonItem`, `disadvantage`, `family`, `kata`, `kiho`, `school`, `skill`, `spell`, `tattoo`, `technique`, `weapon`; `ChatMessage` `roll`, `checkRequest` | `TYPES` (`lang/en.json`) | Core reads the labels at this path; the subtypes are stored on every document |
| Setting keys `LtException`, `floatingNumbers`, `honorRoll`, `runMigration`, `forceMigration` | `l5r4.system.settings.<key>` | Setting keys are stored in world and client settings |
| Status effect ids `blinded`, `concentration`, `dazed`, `dead`, `entangled`, `fasting`, `fatigued`, `feared`, `grappled`, `guarded`, `guarding`, `mounted`, `prone`, `stunned` | `l5r4.ui.statusEffects.<id>` | Ids are stored in each effect's `statuses` |
| Rule keys (`RollModifier`, `TNModifier`, `ArmorTN`, ... `GrantItem`) | `l5r4.ui.ruleSummary.<key>`, built in `module/utils/rule-summary.js` | Rule keys are stored in `system.rules` |
| Rule selector kinds `any`, `skill`, `trait`, `ring`, `attack`, `damage`, `spell`, `maho`, `skill-type`, `skill-tag` | `l5r4.ui.ruleSummary.selector.<kind>` | Stored in `system.rules` |
| Rule field values: `range` `melee`, `ranged`; `armorTn` `base`, `total`; `per` `turn`, `round`, `skirmish`, `day`; `maneuver`, `action`, `direction` values | `l5r4.ui.ruleSummary.<field>.<value>` | Stored in `system.rules` |
| Trait keys `sta`, `wil`, `str`, `per`, `ref`, `awa`, `agi`, `int`; Ring keys `air`, `earth`, `fire`, `water`, `void`; Advantage, kiho, and Skill `system.type` values; currency `koku`, `bu`, `zeni` | The option-list groups | `system` field names and values stored on actors and items |
