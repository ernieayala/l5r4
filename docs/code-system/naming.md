# Naming

One row per identifier kind: its pattern, a conforming and a non-conforming example, and the check that enforces it. An example that names its file is real code; one marked "modeled" is written for this page. "Review" means no check can hold the rule, so a reviewer does. `l5r4/naming` is the local ESLint rule in `tools/eslint/` that checks identifier names. A non-conforming example shows the conforming name after the arrow where one is obvious.

Game concepts inside a name take their stem from [glossary.md](glossary.md) (Armor TN, target number, dice pools, Wound Rank, and the rest). [Fixed names](#fixed-names) are stored in world data or used outside the system: no rule here renames one, and every check exempts them. [Where the code split](#where-the-code-split) lists the rules that pick one of two forms the code used, and the basis for each pick.

## Casing

| Case | Used for | Check |
| --- | --- | --- |
| kebab-case | Files and folders, `data-action` values, `data-*` attributes, CSS classes, custom properties, Quench batch id segments | The rows below |
| camelCase | Functions, variables, methods, `CONFIG.l5r4` keys, i18n key segments, `system` fields, flags, setting keys, GM query names | ESLint `camelcase` |
| PascalCase | Classes | `l5r4/naming` (`tools/eslint/`), ESLint `new-cap` at call sites |
| UPPER_SNAKE_CASE | Module-level and static constants | `l5r4/naming` |

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Acronym inside a name | A word: `Pc`, `Npc`, `Xp`, `Tn`, `Uuid`, `Id`, `Html`. Exceptions: the `L5R4` class prefix, fixed names (`TNModifier`, `ArmorTN`), UPPER constants (`SYS_ID`), and the localization helpers `T`, `F`, `R`, `TEMPLATE` (`new-cap` exceptions in `eslint.config.mjs`) | `PcRollHandler` (`module/sheets/handlers/pc-roll-handler.js`), `getArmorTnPenalty` (`module/utils/armor-penalties.js`) | `ItemCRUDHandler` → `ItemCrudHandler` (modeled); `getArmorTNPenalty` → `getArmorTnPenalty` (modeled) | `l5r4/naming`: no run of two capitals outside the exceptions |

## Files and folders

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Module file | `kebab-case.js`, named for what it holds. A file whose job is one class takes the kebab form of the class name | `module/services/dice/check/roll-check.js`; `module/data/item/skill-data.js` for `SkillData` | `SkillData.js` for `SkillData` (modeled) | `tests/conventions/names.test.js` |
| Folder | Lowercase kebab-case | `module/services/dice/resources/` | `module/services/Dice/` (modeled) | `names.test.js` |
| Redundant name | A file name does not start with its folder's name | `module/services/xp/calculator.js` | `xp-calculator.js` in `module/services/xp/` (modeled) | `names.test.js` |
| Role suffix | `-handler.js` for action routers in `module/sheets/handlers/`; `-system.js` for files in `module/documents/actor/calculations/`. Services take the plain feature name | `module/sheets/handlers/roll-handler.js`, `module/services/combat/grapple.js` | A service file ending in `-service.js` or `-manager.js` (modeled) | `names.test.js` |
| Mixin file | `module/mixins/<name>-mixin.js`, exporting `<Name>Mixin` ([modules.md](modules.md) decides the location) | `module/mixins/field-save-mixin.js` | A mixin in `module/sheets/mixins/` (modeled) | `names.test.js` |
| Tool or script | `tools/<name>.mjs` (ES module); `scripts/<name>.js` (CommonJS) | `tools/pack-sources.mjs`, `scripts/prepare-release.js` | `tools/packSources.js` (modeled) | `names.test.js` |
| Empty folder | None |  | A folder with no files (modeled) | `names.test.js` |

Template, stylesheet, and test files have their own sections below.

## Classes

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Class | PascalCase noun | `RollHandler` (`module/sheets/handlers/roll-handler.js`) | `rollHandler` (modeled) | `l5r4/naming` |
| Foundry subclass registered with core (document, sheet, die term) | `L5R4<Base>` | `L5R4Actor` (`module/documents/actor.js`), `L5R4PcSheet` (`module/sheets/pc-sheet.js`), `L5R4Die` (`module/services/dice/roll-keep-die.js`) | `ActorL5R4` (modeled) | Review |
| Data model | `<Subtype>Data`; a shared base is `<Base>Data` | `SkillData` (`module/data/item/skill-data.js`), `ActorData` | `SkillModel` (modeled) | Review |
| Rule model | `<RuleKey>Rule`, the rule key spelled as stored | `TNModifierRule`, `DiceRuleRule` (`module/data/rules/rule-models.js`) | `TnModifierRule` (modeled): the key `TNModifier` is fixed | Review |
| App window | `<Name>Application` | `XpManagerApplication` (`module/apps/xp-manager.js`), `EffectPanelApplication` (`module/apps/effect-panel.js`) | `EffectPanel`, with no suffix (modeled) | Review |
| Sheet handler | `<Name>Handler`, all-static, named export | `StanceHandler` (`module/sheets/handlers/stance-handler.js`) | `StanceActions` (modeled) | Review |

## Functions

A function name is `<verb><Object>` in camelCase: a verb from the table below, then a glossary stem. A predicate is `<prefix><Condition>` with `is`, `has`, or `can`. A read whose value belongs to its first argument may instead be `<noun>Of`.

`l5r4/naming`, the local ESLint rule in `tools/eslint/`, checks every function declaration, function-valued `const`, and class method in `module/` and `dist/l5r4-enhanced.js`. It exempts methods that override a Foundry method (`defineSchema`, `migrateData`, `prepareDerivedData`, `_prepareContext`, `_onRender`, and the rest keep core's names), getters and setters, constructors, and `T`, `F`, `R`, `TEMPLATE`. Code in `tools/` and `tests/` follows the same table by review.

### Verb vocabulary

`l5r4/naming` reads this table. Each Verb cell holds one prefix, several prefixes separated by `, `, or `*Of` / `*Field` for a suffix form. A name passes when it starts with a listed prefix followed by a capital letter or the end of the name, or ends with a listed suffix. A new verb is a new row here. The rows from `get` to `can` are the Stage 17 decision 15 verbs and predicates; decision 16 keeps the game verbs and allows the rows after them, the verbs the code already uses for those jobs.

| Verb | Meaning | Examples |
| --- | --- | --- |
| `get` | Read or compute a value; no side effects | `getEffectiveTrait` (`module/utils/mechanics.js`) |
| `*Of` | Read a value that belongs to the first argument; no side effects | `effectsOf` (`module/services/effects/apply.js`), `activationOf` (`module/services/effects/activation.js`), `defensesOf` |
| `create` | Make a document, an embedded document, or a data model instance | `createRule` (`module/data/rules/rule-models.js`) |
| `update` | Change stored data | `updateWorldCustomEmphasis` (`module/apps/emphasis-manager.js`) |
| `apply` | Change a document by a game result: damage, an effect, healing | `applyEffect` (`module/services/effects/apply.js`), `applyDamage` (`module/services/combat/damage.js`) |
| `delete` | Remove a document, an entry, or a stored value | `ItemCrudHandler.deleteItem` (`module/sheets/handlers/item-crud-handler.js`), `deleteWorldCustomEmphasis` |
| `roll` | Roll dice | `rollCheck` (`module/services/dice/check/roll-check.js`), `rollContest` |
| `post` | Post a chat card | `postCheckRequest` (`module/services/check-request.js`) |
| `request` | Ask the GM's client to run an operation through a GM query | `requestStep` (`module/services/combat/flow.js`), `requestDamageAction` |
| `emit` | Send a message on the system socket | `emitGmClientMessage` (`module/services/gm-client.js`) |
| `open` | Open a window: an app, a sheet, or a dialog that stays open | `openArmorConfig` (`module/sheets/handlers/app-launcher-handler.js`), `openLedgerDialog` |
| `ask` | Show a dialog and wait for the user's answer | `askChoices` (`module/services/dice/check/dialog.js`), `askChoice` |
| `is` | Predicate: a state | `isDead` (`module/utils/damage.js`), `isLost` |
| `has` | Predicate: owns or contains | `hasOpenChoice` (`module/utils/choices.js`), `hasHonorRollLeft` |
| `can` | Predicate: allowed by permissions or the rules | `canEmbraceTaint` (`module/utils/taint.js`) |
| `spend`, `test`, `start`, `end`, `guard` | Game verb: the action the book names for a game act (spend a Void Point, test Fear, start a duel, end an effect, guard an ally) | `spendVoidPoint` (`module/services/dice/resources/void-points.js`), `testFear` (`module/services/fear.js`), `startDuel` (`module/services/combat/duel.js`), `endConcentration` (`module/services/effects/prompts.js`), `guardFromCanvas` (`module/services/combat/guard.js`) |
| `prepare` | Compute derived data during document preparation | `prepareFear` (`module/documents/actor/calculations/fear-system.js`) |
| `migrate` | Change stored source data to the current shape | `migratePcSource` (`module/data/migrate-source.js`), `migrateArmorType` |
| `register` | Add to a Foundry registry or hook during init | `registerEffectQueries` (`module/services/effects/apply.js`) |
| `bind` | Attach listeners to a rendered chat card or dialog | `bindCheckCard` (`module/services/dice/check/chat-actions.js`) |
| `hide` | Remove from rendered HTML a control the viewer may not use | `hideUnusable` (`module/utils/dom.js`) |
| `on` | Handle a hook or a DOM event | `onPreUpdateActorWounds` (`module/services/effects/automation.js`) |
| `build` | Assemble a plain object or array from its inputs; no side effects | `buildPool` (`module/utils/check.js`) |
| `parse` | Turn text into a value | `parseRulesJson` (`module/utils/rule-json.js`) |
| `format` | Turn a value into display text | `formatXpEntries` (`module/services/xp/formatter.js`) |
| `render` | Render a template to HTML without posting it | `renderCheckCard` (`module/services/dice/check/card.js`) |
| `validate` | Check input at a trust boundary and report the problem | `validateEmphasisName` (`module/utils/validators.js`) |
| `to` | Convert a value to another type | `toInt` (`module/utils/type-coercion.js`) |
| `log` | Write to the console for debugging; no other side effect | `logError` (`module/utils/error-logging.js`) |
| `warn` | Show the user a warning notification; the operation goes ahead | `warnVoidLimit` (`module/services/effects/uses.js`) |
| `export` | Write documents out to a file the browser saves | `exportItemFolder` (`module/services/item-transfer.js`) |
| `settle` | Wait until pending asynchronous work has finished | `settleLoads` (`module/services/animations/status-animations.js`) |
| `refresh` | Bring what this client's canvas shows in line with the current state; no stored data changes | `refreshTokenAnimations` (`module/services/animations/status-animations.js`) |
| `*Field` | Return a new `foundry.data.fields` instance for a schema | `numberField` (`module/data/fields.js`) |

### Names the vocabulary rejects

| Not conforming | Why | Conforming |
| --- | --- | --- |
| `ringRank` (modeled) | A read with no verb | `ringRankOf` (`module/utils/mechanics.js`) |
| `resolveArmorTn` (modeled) | `resolve` is not a verb here | `getArmorTn` (`module/utils/effects.js`) |
| `checkRequestFor` (modeled) | `*For` is not a suffix form | `checkRequestOf` (`module/services/links.js`) |
| `SkillRoll` (modeled) | A function in PascalCase, verb last | `rollSkill` (`module/services/dice/rolls/skill-roll.js`) |
| `promptSaves` (modeled) | Posts cards | `postSavePrompts` (`module/services/effects/prompts.js`) |
| `applyEffectAnywhere` (`module/services/effects/apply.js`) | Asks the GM through a query | `requestEffect` |
| `chooseElement` (modeled) | Shows a dialog and waits | `askElement` (`module/services/dice/rolls/spell-cast-roll.js`) |
| `getUnifiedItemOptions` (`module/services/chat.js`) | `get` with a dialog behind it | `askItemOptions` |
| `removeItem` (modeled) | Remove is `delete` | `ItemCrudHandler.deleteItem` (`module/sheets/handlers/item-crud-handler.js`) |
| `syncProne` (modeled) | Changes data by another verb | `updateProne` (`module/services/effects/automation.js`) |
| `mayActFor` (modeled) | `may` is not a predicate prefix | `canActFor` (`module/services/combat/flow.js`) |
| `needsRetroactiveUpdate` (modeled) | `needs` is not a predicate prefix | `isRetroactiveUpdateDue` (`module/services/xp/versioning.js`) |
| `initializeCombat` (modeled) | Init entries use `register` | `registerCombatQueries` (`module/services/effects/combat-events.js`) |
| `runIconPathMigration` (modeled) | Migrations use `migrate` | `migrateItemIcon` (`module/setup/migrations/icons/icon-paths.js`) |
| `handleFearClick` (modeled) | Event handlers use `on` | `onFearClick` (`module/services/fear.js`) |
| `calculateInsightRank` (modeled) | A read by another verb | `getInsightRank` (`module/documents/actor/calculations/xp-system.js`) |
| `createSkillData` (`tests/fixtures/item-fixtures.js`) | Returns plain data, not a document | `buildSkillData` |

### Function kinds

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Hook or event handler | `on<HookName>` or `on<Thing><Event>` | `onPreUpdateActorWounds` (`module/services/effects/automation.js`) | `handleFearClick` (modeled) | `l5r4/naming` |
| Init entry | `register<Feature>()` | `registerEffectQueries` (`module/services/effects/apply.js`) | `initializeCombat` (modeled) | `l5r4/naming` |
| GM query registration | `register<Feature>Queries()` | `registerEffectQueries` | `setupQueries` (modeled) | `l5r4/naming` |
| Card binding | `bind<Card>Card(message, html)`, singular | `bindCheckCard` (`module/services/dice/check/chat-actions.js`) | `bindDamageCards` (`module/services/combat/damage.js`) | Review |
| Migration step | `migrate<What>`; a source migration in a data model is `migrate<Shape>Source(source)` | `migrateArmorType` (`module/setup/migrations/items/armor-types.js`), `migratePcSource` | `runIconPathMigration` (modeled) | `l5r4/naming` |
| Sheet handler static | `<verb><Object>(context, event, element)`, no `handle` prefix | `ItemCrudHandler.deleteItem` (`module/sheets/handlers/item-crud-handler.js`) | `handleToggleArmorVoid` → `updateArmorVoid` (modeled) | `l5r4/naming` |

## Members

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Foundry protected override | `_name`, exactly as core names it | `CompendiumBrowserApplication#_prepareContext` (`module/apps/compendium-browser.js`) |  | Review |
| The system's own private member (method or field) | `#name` | `CompendiumBrowserApplication#getEntries` (`module/apps/compendium-browser.js`), `L5R4ItemSheet#currentTab` (`module/sheets/item-sheet.js`) | `XpManagerApplication#_calculateTotal` (`module/apps/xp-manager.js`), `L5R4ItemSheet#_getAvailableTabs` (`module/sheets/item-sheet.js`) | `l5r4/naming`: `_name` only in a class that extends a Foundry class; review for the rest |
| Member another class calls | No prefix: it is public | `rollCheck` | `L5R4Actor#_finalizeWoundPenalties` (`module/documents/actor.js`), called from `pc-preparation.js` and `npc-preparation.js` → `finalizeWoundPenalties` | Review |
| Action handler | `static #on<Action>`, the PascalCase form of its `data-action` | `EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`) for `delete-effect` | `_onAddXp` on the prototype for `add-xp` (modeled) | `l5r4/naming` |
| Module-private function | Bare name, not exported | `defensesOf` (`module/services/combat/damage.js`) | `_postRestMessage` → `postRestMessage` (modeled) | `l5r4/naming` |
| Unused parameter | `_name` | `_event` in `EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`) |  | ESLint `no-unused-vars` (`argsIgnorePattern: "^_"`) |
| Derived container on `system` | `system._derived`, `system._xp`: values preparation adds outside the schema | `sys._derived` in `prepareEffectiveTraits` (`module/documents/actor/calculations/shared-traits-rings-system.js`) | `sys.derivedValues` (modeled) | Review |
| Boolean getter or local | `is`, `has`, or `can` prefix | `isLimited` in `L5R4PcSheet#_renderHTML` (`module/sheets/pc-sheet.js`) | `ItemData#rulesActive` (`module/data/item/base-data.js`) → `hasActiveRules` | Review |

## Constants and variables

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Module-level or static constant | UPPER_SNAKE_CASE | `TN_PER_RAISE` (`module/config/game-mechanics.js`) | `tnPerRaise` (modeled) | `l5r4/naming` |
| Duration constant | Ends `_MS` | `UPDATE_TIMEOUT_MS` (`tests/quench/helpers.js`) | `UPDATE_TIMEOUT` (modeled) | Review |
| GM query name constant | `<NAME>_QUERY` | `DAMAGE_QUERY` (`module/services/combat/damage.js`) | `damageQueryName` (modeled) | Review |
| Module-level mutable state | camelCase | `actorLocks` (`module/services/dice/resources/void-points.js`) | `FLOWS` → `flows` (modeled) | `l5r4/naming` |
| Variable or parameter | camelCase, glossary stems | `ringKey` in `rollRing` (`module/services/dice/rolls/ring-roll.js`) | `ring_key` (modeled) | ESLint `camelcase`, `tests/conventions/glossary.test.js` |

## Foundry-facing names

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| `CONFIG.l5r4` key | camelCase, holding a Config export | `statusEffects` in `registerSystemConfig` (`dist/l5r4-enhanced.js`) | `CONFIG.l5r4.TRAIT_CHOICES` in `registerSystemConfig` (`dist/l5r4-enhanced.js`) | Review; a rename is listed in `CHANGELOG.MD` |
| `system` field | camelCase noun; a boolean field is an adjective or participle | `armorTn` in `PcData.defineSchema` (`module/data/actor/pc-data.js`), `equipped`, `memorized` | `armor_tn`, the pre-3.0 key `module/data/migrate-source.js` reads | Review. Stored fields are fixed |
| Flag | `flags.l5r4-enhanced.<camelCase>`, read and written with `SYS_ID` | `actor.getFlag(SYS_ID, "xpFreeTraitBase")` (`tests/quench/active-effects.js`) | `actor.getFlag("l5r4-enhanced", "xp_free_trait_base")` (modeled) | Review. Stored flags are fixed |
| Setting key | camelCase, registered under `SYS_ID` | `floatingNumbers` (`module/setup/settings/client.js`) | `floating-numbers` (modeled). `LtException` is fixed | Review |
| GM query name | `` `${SYS_ID}.<camelCase>` `` | `` `${SYS_ID}.applyEffect` ``, the value of `APPLY_EFFECT_QUERY` (`module/services/effects/apply.js`) | `"l5r4-enhanced.apply-effect"` (modeled) | Review. Existing names are fixed |
| `game.system.api` entry | A function name from the verb vocabulary, added in `module/sheets/ui/macros.js` | `rollItem`, `rollTrait`, added by `registerMacroApi` (`module/sheets/ui/macros.js`) | `itemRoll` (modeled) | Review. Existing names are fixed |
| Status effect id | camelCase | `fullDefenseStance` (`module/config/status-effects.js`) | `full-defense-stance` (modeled) | Review. Existing ids are fixed |

## Templates and actions

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Template file | `templates/<consumer>/<kebab-case>.hbs`; consumer folders `actor`, `apps`, `cards`, `chat`, `dialogs`, `item`, `links`, `rules` | `templates/apps/effect-panel.hbs` | `templates/Apps/EffectPanel.hbs` (modeled). Subtype-named files (`commonItem.hbs`) are fixed | `names.test.js` |
| Partial-only file | `_<kebab-case>.hbs` in a `_partials/` folder. A template that is also rendered on its own takes no `_` | `templates/actor/_partials/_expand.hbs` | `templates/actor/_partials/expand.hbs` (modeled) | `names.test.js` |
| Partial reference | The full literal path from `systems/l5r4-enhanced/templates/`; a `(concat ...)` path only where the file is chosen by subtype | `{{> "systems/l5r4-enhanced/templates/cards/_partials/_details.hbs" description=system.description}}` (`templates/cards/armor.hbs`) | `{{> controls}}` (modeled) | `tests/conventions/templates.test.js` |
| Dialog template | `templates/dialogs/<name>-dialog.hbs` | `templates/dialogs/ledger-dialog.hbs` | `templates/dialogs/ledger.hbs` (modeled) | `names.test.js` |
| Chat template | `templates/chat/<noun>.hbs`, no `-card` or `-chat` suffix | `templates/chat/damage-result.hbs` | `weapon-chat.hbs`, `check-card.hbs` (modeled) | `names.test.js` |
| Section partial | `_<noun>-section.hbs`, the noun singular | `templates/actor/_partials/_weapon-section.hbs` | `_skills-section.hbs` (modeled) | `names.test.js` |
| `data-action` value | kebab-case `<verb>-<object>`, verb first (Stage 17 decision 16). When the action has one of the verb vocabulary's meanings, the verb comes from it, game verbs included: `open-*` opens a window, `delete-*` removes, `roll-*` rolls, `test-fear` tests Fear. Actions inside posted chat cards are fixed names and keep their word order (`damage-void`) | `roll-trait` (`templates/actor/_partials/_trait.hbs`), `edit-item`, `open-xp-manager` | `rulesDelete` → `delete-rule`; `item-delete` → `delete-item`; `xp-modal` → `open-xp-manager` (modeled) | `tests/conventions/actions.test.js` (casing, every action has a handler); review (word order, verb) |
| `DEFAULT_OPTIONS.actions` key | The `data-action` string, quoted | `"add-money"` (`module/apps/wealth-manager.js`) | `removeEffect` → `"delete-effect"` (modeled) | `actions.test.js` |
| `data-*` attribute | kebab-case words; an index is `data-idx` | `data-sort-by` (`templates/actor/_partials/_sort-header.hbs`) | `data-sortby` (modeled) → `data-sort-by` | Review |
| Form field `name` | `system.<path>` for a schema field; camelCase for any other field | `name="woundMode"` (`templates/apps/wound-config.hbs`) | `name="add-amount"` → `addAmount` (modeled) | Review |

## i18n keys

The key structure lives in [`docs/design-system/content/localization.md`](../design-system/content/localization.md): areas, standard leaves (`title`, `errors`, `<field>Hint`, `hint`, `name`, `common`), the winning option-list trees, placeholders, plurals, key order, and how a rename reaches the translations. The rows below are the naming summary.

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Key path | `l5r4.<area>.<group>.<key>`, camelCase whole-word segments. `TYPES` is the one group outside `l5r4.`, because core reads it | `l5r4.apps.armorConfig.errors.updateFailed`, `TYPES.Actor.pc` (`lang/en.json`) | `EFFECT.prone` → `l5r4.ui.statusEffects.prone` (modeled) | `tests/lang.test.js` |
| Segment that mirrors a fixed name | Keeps the fixed name's spelling, PascalCase and kebab-case included | `l5r4.ui.ruleSummary.RollModifier` (`lang/en.json`), `TYPES.Item.commonItem` | `l5r4.ui.ruleSummary.rollModifier` (modeled): the rule key is `RollModifier` | `tests/lang.test.js` |
| TN inside a key | `Tn` | `l5r4.ui.mechanics.wounds.armorTnBase` (`lang/en.json`) | `l5r4.ui.links.checkTN` → `checkTn` (modeled) | `tests/lang.test.js`, `tests/conventions/glossary.test.js` |
| Placeholder | `{camelCase}`, named for what the value means; the actor a message is about is `{name}` | `{name}` in `l5r4.apps.armorConfig.titleFor` (`lang/en.json`) | `{character}` (modeled) | `tests/lang.test.js` |

## Stylesheets

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| SCSS file | `scss/<folder>/_<block>.scss`, named for the block it styles without `l5r4-`. A chat card whose root block is a fixed name takes its design-system page's name instead (`_request-card.scss` styles `.l5r4-check-request`; [components/README.md](../design-system/components/README.md)). The entry is `scss/l5r4-enhanced.scss`; folders: [templates-and-styles.md](templates-and-styles.md) | `scss/apps/_effect-panel.scss` styles `.l5r4-effect-panel` | `_xp-manager.scss` styling `.xp-modal-dialog` (modeled) | `names.test.js`, `tests/conventions/styles.test.js` |
| Block or element class | `l5r4-<block>` or `l5r4-<block>-<element>`, kebab-case | `.l5r4-effect-panel-row` (`scss/apps/_effect-panel.scss`) | `.grid`, `.title` (modeled) | Stylelint `selector-class-pattern`, `styles.test.js`, `templates.test.js` |
| State class | `is-<state>`, on an element that also carries its `l5r4-` block class; the state itself rides on an attribute ([states.md](../design-system/foundations/states.md)). Core's `active` stays where core's CSS reads it | `&.is-collapsed` (`scss/components/_section.scss`) | `&.-filled` → `.is-filled` (modeled) | `templates.test.js`, `styles.test.js` |
| Variant class | `-<variant>`, on an element that also carries its `l5r4-` block class | `l5r4-section-title{{#if compact}} -compact` (`templates/actor/_partials/_section-title.hbs`) | `.ring-rank-fire`: the variant folded into the name (modeled) | `styles.test.js` |
| Ring variant | `l5r4-<block>-<element>.-<ring>` | `.l5r4-ring-name.-earth` (modeled) | `.earth-ring`, `.ring-name-earth` (modeled) | `styles.test.js` |
| Window root class | `l5r4-<file-name>` for the app in `module/apps/<file-name>.js` | `l5r4-effect-panel` in `EffectPanelApplication.DEFAULT_OPTIONS` (`module/apps/effect-panel.js`) | `xp-modal-dialog` → `l5r4-xp-manager` (modeled) | Review |
| Custom property | `--l5r4-{category}-{name}`; categories and names are the tokens in [`docs/design-system/foundations/`](../design-system/README.md) | `--l5r4-color-surface` (modeled) | `--air-ring-color`, `--controls` (modeled) | Stylelint `custom-property-pattern`, `styles.test.js` |
| SCSS variable | `$kebab-case`, declared only in `scss/base/_variables.scss`. A color, size, space, duration, easing, or layer value is a custom property, never a `$variable` | `$air-ring-img` (`scss/base/_variables.scss`), an asset path | `$mask-animation-duration`: a duration is a token (modeled) | Stylelint `scss/dollar-variable-pattern`; review |

## Tests

Test names (`describe`, `it`), citations, and fixtures: [testing.md](testing.md).

| Kind | Pattern | Conforming | Not conforming | Check |
| --- | --- | --- | --- | --- |
| Vitest unit file | `tests/unit/<path>.test.js` for `module/<path>.js` | `tests/unit/utils/check.test.js` for `module/utils/check.js` | A unit file with no module file at its mirror path (modeled) | `tests/conventions/tests.test.js` |
| Repo and convention checks | `tests/<name>.test.js` for repo-level checks; `tests/conventions/<name>.test.js` for convention checks | `tests/lang.test.js` | `tests/unit/lang.test.js` (modeled) | `tests.test.js` |
| Quench file | `tests/quench/<folder>/<kebab-case>.js`, no `.test` suffix; the folder is the layer of the code under test, `workflows/` for flows across layers | `tests/quench/services/fear.js` | `tests/quench/sheets/emphasis-manager.js` (tests `module/apps/emphasis-manager.js`) | `tests.test.js` (id against path); review (folder) |
| Quench batch id | `` `${SYS_ID}.<folders>.<file-stem>` `` | `` `${SYS_ID}.services.fear` `` in `registerFearTests` (`tests/quench/services/fear.js`) | `"l5r4-enhanced.integration.condition-manager"` (modeled) | `tests.test.js` |
| Quench display name | `L5R4: <Feature in sentence case>`; no "Tests" suffix, no note in parentheses, "and" for a join | `L5R4: Rule engine` (`tests/quench/rules.js`) | `L5R4: Fear System Tests`, `L5R4 Enhanced: Status Effects Workflow` (modeled) | `tests.test.js` |
| Quench register function | `register<Feature>Tests(quench)`, one per file | `registerFearTests` (`tests/quench/services/fear.js`) | `registerSmokeBatch`, a bare `register` (modeled) | Review |
| Fixture helper | `create*` makes a world document; `build*` returns plain data | `createShugenja` (`tests/fixtures/actor-fixtures.js`) | `createSkillData` (`tests/fixtures/item-fixtures.js`) → `buildSkillData` | Review |

## Where the code split

Each row is a rule above that picks one of the forms the code used. "Ernie" marks his pick; "majority" marks the form most of that area's code already used.

| Split | Rule | Basis |
| --- | --- | --- |
| Verb vocabulary and predicate prefixes | The decision 15 verbs and `is`, `has`, `can` | Ernie |
| Game verbs and the verbs past decision 15 | Kept: `spendVoidPoint`, `testFear`, `startDuel`; `prepare`, `migrate`, `register`, `bind`, `on`, `build`, `parse`, `format`, `render`, `validate`, `to*`, `*Field` allowed | Ernie (decision 16) |
| `data-action` casing | kebab-case | Ernie |
| Template CSS classes | `l5r4-` on every system class | Ernie |
| `_name` versus `#name` | `_` for Foundry overrides only, `#` for the system's own members | Ernie |
| Data model file names | kebab-case | Ernie |
| Custom property names | `--l5r4-{category}-{name}` | Ernie |
| TN inside a name | `Tn` | Ernie |
| Acronyms in identifiers | Camel-cased words | Majority |
| App class suffix | `Application` | Majority |
| Service file suffixes | None | Majority |
| Calculation file suffix in `documents/actor/calculations/` | `-system` | Majority |
| `register` versus `initialize` for init entries | `register` | Even split; `register` is Foundry's verb (`registerSheet`, `registerBatch`, `game.settings.register`) |
| Card binding | `bind<Card>Card`, singular | Majority |
| Migration step verb | `migrate` | Majority |
| `handle` prefix on handlers | None | Majority |
| Module-private function prefix | None (`#` exists only inside a class) | Majority |
| Module-level mutable state | camelCase | Majority |
| `create` for plain data | `build`; `create` makes documents and model instances, as Foundry's `create` does | The decision 15 meaning of create |
| Boolean `system` fields | Adjective or participle | Majority |
| `data-action` word order | Verb first; posted chat-card actions keep theirs | Ernie (decision 16) |
| State and variant classes | `is-<state>` for a state, `-<variant>` for a variant | Majority of each: `is-` among template state classes, the leading dash among variants |
| Ring class word order | Block, element, then the Ring as a modifier | Even split; the block-modifier rule decides |
| Chat template suffix | None | Majority |
| Section partial noun | Singular | Majority |
| Partial reference | Full literal path | Majority |
| `data-*` word breaks and index | kebab-case words, `data-idx` | Majority |
| Form field names outside `system` | camelCase | Majority |
| Quench register function | `register<Feature>Tests` | Majority |
| i18n key splits | See localization.md, which records each pick and its basis | Majority, recorded there |

## Fixed names

Names stored in world data or used outside the system. They keep their spelling, and every check exempts them. A change to one needs a migration Ernie approves.

| Kind | Names | Why fixed |
| --- | --- | --- |
| System id | `l5r4-enhanced` (`SYS_ID`) | Worlds store it |
| Document subtypes | Actor `pc`, `npc`; Item `advantage`, `armor`, `bow`, `clan`, `commonItem`, `disadvantage`, `family`, `kata`, `kiho`, `school`, `skill`, `spell`, `tattoo`, `technique`, `weapon`; ChatMessage `roll`, `checkRequest` | Each document stores its `type`; `system.json` declares them |
| Templates named after subtypes | `templates/item/_type-details/<type>.hbs`, `templates/item/_type-modifiers/<type>.hbs`, `templates/cards/<type>.hbs` (with `advantage-disadvantage.hbs`), `templates/chat/check-request.hbs` | Loaded by subtype name |
| `system` fields | Every field a `defineSchema` in `module/data/` declares, and the pre-3.0 and 3.2.1 keys the migrations read (`armor_tn`, `wound_lvl`, `insight_bonus`, `equiped`, `specialRues`, and the rest in `module/data/migrate-source.js` and `module/setup/migrations/schema/map.js`) | Stored in world data |
| Flags | Every key under `flags.l5r4-enhanced` the code reads or writes, for example `xpFreeTraitBase`, `xpRetroactiveVersion`, `grants`, `damageResult`, `flow`, `ledger`, `migratedVersion`, `macro` | Stored in world data |
| Setting keys | `LtException`, `customEmphases`, `honorRoll`, `session`, `floatingNumbers`, `runMigration`, `forceMigration`, `lastMigratedVersion` | Stored in world and client settings |
| Status and system effect ids | `attackStance`, `fullAttackStance`, `defenseStance`, `fullDefenseStance`, `centerStance`, `blinded`, `concentration`, `dazed`, `dead`, `entangled`, `fasting`, `fatigued`, `feared`, `grappled`, `guarded`, `guarding`, `mounted`, `prone`, `stunned`; effect ids `centered`, `fullDefense`, `voidArmor`; effect groups `stance`, `kata`, `tattoo`, `kiho-<type>` | Stored on Active Effects and tokens |
| Rule data | Rule keys (`RollModifier`, `TNModifier`, `ArmorTN`, `Reduction`, `Wounds`, `Initiative`, `FreeRaise`, `DiceRule`, `Substitute`, `TraitAdjust`, `Note`, `RollOption`, `Movement`, `ApplyCondition`, `ConditionImmunity`, `PeriodicSave`, `Resource`, `DamageSource`, `Invulnerability`, `Spirit`, `OpponentModifier`, `RaiseRule`, `UnskilledAs`, `ActionCost`, `Cost`, `Ledger`, `Prerequisite`, `ChoiceSet`, `GrantItem`), their field names, selector kinds, roll-option strings, and field values (`module/config/rule-keys.js`, `module/data/rules/rule-models.js`) | Stored in `system.rules` on Items and Active Effects |
| Packs | Pack ids `clans`, `families`, `schools`, `techniques`, `advantages`, `disadvantages`, `skills`, `kata`, `spells`, `kiho`, `tattoos`, `weapons`, `armor`, `equipment`, `creatures`, and their entry ids | Worlds and `@UUID` links reference them |
| GM query names | `l5r4-enhanced.applyEffect`, `.damage`, `.settleCenter`, `.endConcentration`, `.answerPrompt`, `.flow` | Clients send them to the GM's client by name |
| `game.system.api` | `rollItem`, `rollTrait` | Hotbar macros store the call in their command |
| Text link syntax | `@Check[...]`, `@Damage[...]`, `@Condition[...]`, `@Fear[...]`, their parameters `skill`, `trait`, `ring`, `tn`, and the `data-link-type` values `Check`, `Damage`, `Condition`, `Fear` | Stored in journals and descriptions |
| Chat card actions and attributes | `data-action` `apply-wounds`, `reduce-wounds-void`, `check-damage`, `apply-condition`, `honor-roll`, `combat-contest`, `grapple-start`, `damage-apply-target`, `damage-apply-selected`, `damage-void`, `damage-undo`, `effect-prompt`, `check-request-roll`; `data-flow-action` `control`, `hit`, `throw`, `break`, `pass`, `roll`, `concede`; `data-side`, `data-duelist`, `data-index`, `data-item-id`, `data-document-id`, `data-document-type`, and the pre-4.0.0 `data-attack-raises`, `data-damage-roll`, `data-damage-keep`, `data-weapon-name`, `data-weapon-id`, `data-actor-id`, `data-damage` | Posted messages store their HTML |
| Chat card classes | `chat-card`, `card-content`, `dice-flavor`, `check-note`, `check-applied`, `check-free-raises`, `check-conditions`, `damage-actions`, `flow-actions`, `healing-card`, `weapon`, `l5r4-roll`, `l5r4-check`, `l5r4-tn-result`, `l5r4-check-damage`, `l5r4-check-request`, `l5r4-check-request-text`, `l5r4-damage-result`, `l5r4-effect-prompt`, `l5r4-flow-card`, `l5r4-contest`, `l5r4-item-summary`, `l5r4-item-summary-heading`, `l5r4-rule-lines`, `l5r4-citation`, `l5r4-damage-button`, `l5r4-damage-roll`, `l5r4-chat-note`, `apply-wounds-btn`, `reduce-wounds-btn`, `-undone`, `-gap-sm`; on posted item cards `item`, `title`, `-bio`, `-expandable`, and `-<type>` for each Item subtype | Posted messages store their HTML; the styles stay |
| Item transfer format | `l5r4-enhanced.items` (`TRANSFER_FORMAT`) | Exported files carry it |
| Dice | The `xa` modifier and `L5R4Die` as `CONFIG.Dice.terms.d` | Stored in roll formulas |
| Animation names | `l5r4-enhanced.<statusId>.<tokenId>` | Sequencer stores persistent effects by name |
| Core-owned names | `TYPES`, core classes (`flexrow`, `flexcol`, `flex0`, `flex1`, `flex2`, `flex3`, `form-group`, `form-fields`, `standard-form`, `hint`, `active`, `theme-light`, `theme-dark`, `window-content`, `dialog-form`, `dialog-content`, `form-footer`, `scrollable`, `draggable`, `button`, `inline-control`, `icon`, `tabs`, `sheet-tabs`, `tab`, `editor`, `editor-content`, `chat-message`, `message-content`; on core's dice row `roll`, `discarded`, `rerolled`), and the names of Foundry methods a class overrides | Core defines them |
