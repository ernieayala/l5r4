# Foundry VTT v14 System Development Reference (for `l5r4-enhanced`)

Sources, as of Foundry 14.370 (2026-11-02): official release notes and knowledge base, the v14 API docs, and the
source of three systems that target v14: `foundryvtt/crucible` (official, `minimum: 14.370`),
`MetaMorphic-Digital/draw-steel` branch `1.2.x` (`minimum: "14.370"`), and `foundryvtt/dnd5e` master
(`minimum: "14.367"`). This file is checked against the installed 14.370 source
(`C:\Program Files\Foundry Virtual Tabletop\resources\app`) except where marked UNVERIFIED.

Conventions:
- Every claim carries a source tag `[Sn]` or `[src: path:line]`. The list of sources is at the end.
- `[src: ...]` = a file in the installed 14.370 app directory (`client/`, `common/`, `dist/`, `node_modules/`). `dist/` files are minified, so they are cited by file and identifier instead of line.
- **UNVERIFIED** = not confirmed by a fetched page or the installed source. The reason is given at the item.
- "Observed in X" = the pattern appears in a v14-targeting system's code. It shows working practice, not an official API guarantee.

---

## 1. Version, and what v14 changed from v13

### 1.1 Current build

| Fact | Source |
|---|---|
| Latest release: **14.370**, "Full", **Stable**, dated **November 02, 2026**. It is also the top entry on the releases page | [S1], [S2] |
| 14.370 is "Version 14, Stable 12" | [S2] |
| The API docs at `/api/v14/` document "version 14.370 Stable" | [S20] |
| v14 timeline: Prototype 14.349 (2025-09-26), 14.352, 14.353. Development 14.354, 14.355. Testing 14.356-14.358. First Stable **14.359** (2026-04-01), then updates 14.360-14.369, then 14.370 | [S1] |
| v14 cannot be updated in place from v13. Uninstall and reinstall | [S3] |
| V14 requires Node.js 24 (relevant for a dedicated server); v13 is not compatible with Node 24 | [S9], [S10] |
| Electron upgraded to 40, minimum Node 24 | [S8] |

### 1.2 Removals in v14

| Removed | Notes | Source |
|---|---|---|
| A large set of APIs deprecated in **V12** | Full list in issue #13436 (about 200 items: `ApplicationV2#bringToTop` -> `bringToFront`, Handlebars helpers `colorPicker` and `select`, the `nameAttr` parameter of `selectOptions`, `ActiveEffect#label`, `ChatMessage#user`, `Scene#fogExploration`, `TileDocument#z`, `Math.clamped`, `System#template`, many former globals including the dice term classes) | [S4], [S21] |
| `CONFIG.ActiveEffect.legacyTransferral` | Deprecated in V11 | [S4] |
| **Measured Templates** (`MeasuredTemplate` Document type) | Absorbed by Scene Regions ("template Regions") | [S5], [S9], [S3] |
| TinyMCE | ProseMirror migration complete | [S7] |
| `TextureData` `offsetX/Y`, `rotation` | Unused attributes | [S7] |
| `RegExp.escape` polyfill | Native implementation used | [S8] |
| `TokenDocument#attachments` | Replaced by `RegionDocument#attachment.token` | [S6], [S9] |
| `PlaceablesLayer.SORT_ORDER` | Unused | [S13] |
| Deprecation windows **extended to V16** (not removed): `FormApplication#filepickers`, `#_activateFilePicker`, `#_getFilePickerOptions`, `#_onSelectFile`, `filePicker` helper | | [S21] |

### 1.3 Breaking changes that matter to a new system

| Change | Source |
|---|---|
| **`template.json` entered its deprecation period.** System types must have no schema or a schema from a `TypeDataModel` | [S5] |
| **`ActiveEffect#changes` moved to `ActiveEffect#system#changes`** | [S6] |
| `EffectChangeData#mode` (number) is now a string **`type`**; `EffectChangeData#value` is stored as the JSON-parsed value of what was entered | [S5] |
| Active Effect changes have application **`phase`s** | [S5] |
| Active Effect changes can reference actor data (`@` expressions) | [S6] |
| Active Effect durations use time units other than seconds; expiry events can end effects early | [S6] |
| `ActiveEffect#origin` is a `DocumentUUIDField`; core no longer assigns `origin` (fully up to the system) | [S4], [S5] |
| **Roll modes replaced by Chat Message Visibility Modes** ("messageMode"), applicable to any message; new "In-Character" mode. Old roll modes stay backward-compatible **until V16** | [S8] |
| `ChatLog.MESSAGE_PATTERNS` deprecated for `ChatLog.CHAT_COMMANDS`, removed in V16 | [S8] |
| `@readonly` class members are enforced as read-only | [S8] |
| `DocumentStatsField#createdTime` / `#modifiedTime` required | [S8] |
| `foundry.documents.modifyBatch` key `documentType` renamed `documentName` | [S6] |
| `game.i18n.format()` merged into `game.i18n.localize()`; `format` remains as a non-enumerable alias of `localize` with no deprecation warning. New global `_loc`, bound to `game.i18n.localize` | [S6], [src: client/helpers/localization.mjs:481], [src: client/game.mjs:74] |
| `DataModel.updateSource` operator keys `-=` and `==` deprecated for `DataFieldOperator` values (globals `_del`, `_replace` appear in Draw Steel's ESLint globals) | [S4], [S36] |
| `foundry.utils.objectsEqual` redesigned as `foundry.utils.equals()` | [S4] |
| `parseHTML` returns `null` instead of `undefined` | [S4] |
| Rolls: boolean values evaluate as `0`/`1` | [S4] |
| `DataModel#updateSource` always clones its input | [S4] |
| `CONFIG.statusEffects` changed from an array to `{[id]: StatusEffectConfig}` (with backwards compatibility). In 14.370 it is a Proxy over an array that is also indexed by id (see 6.4) | [S5], [src: client/config.mjs:1690-1738] |
| `Document.create` uses `this.implementation` | [S5] |
| Handlebars: the order of `preSync` and `sync` for nested template parts changed | [S4] |
| The `ready` hook fires after scene transitions finish | [S8] |
| `<file-picker>` and `<formula-input>` `change` events target the custom element, not the inner input | [S15] |
| User names must be unique | [S15] |
| `CalendarData#onUpdateWorldTime` now receives `deltaTime` (labeled breaking in 14.370) | [S2] |
| Font Awesome updated to 7.2.0 | [S3] |
| `ContextMenu`: constructing one without a `jQuery` option, or with a jQuery container, logs a deprecation `{since: 13, until: 15}`. Pass `jQuery: false` and an `HTMLElement` container | [S3], [src: client/applications/ux/context-menu.mjs:78-92] |
| Package update checks use the website package repository instead of the upstream manifest | [S15] |

### 1.4 New deprecations (still working in v14)

| Deprecated | Replacement | Source |
|---|---|---|
| `Roll#toMessage` `rollMode` option, `Roll._mapLegacyRollMode` | `messageMode` (keys of `CONFIG.ChatMessage.modes`). Draw Steel's own shim logs `{since: 14, until: 16}` | [S8], [S26], [S33] |
| `foundry.prosemirror.defaultPlugins` | `foundry.applications.ux.ProseMirrorEditor.buildDefaultPlugins()` | [S5] |
| `layerClass` on canvas-document `CONFIG` entries | (to be removed) | [S5] |
| `RegionShape` | client-side mixins of `BaseShapeData` subclasses | [S4] |
| `PlaceableObject#clear` | protected `_clear` | [S9] |
| `Tile.createPreview` | none | [S9] |
| `TokenFindMovementPathOptions#ignoreWalls/#ignoreCost/#history` | `#constrainOptions` | [S10] |
| `ImageHelper#createThumbnail` return `properties`, `src`, `texture` | | [S7] |
| `Region#testPoint` | | [S14] |
| `Actor#getDependentTokens` will default to `concreteOnly` in V15 | | [S12] |

### 1.5 New v14 features a system can use

- Native multi-level scenes (`Level` documents, a blessed global) [S3], [S9].
- Active Effects V2: expiry events and registry, token-changing effects, storage in compendiums (pack `type: "ActiveEffect"`) [S3], [S4].
- `CombatantGroup` documents with their own subtypes (`documentTypes.CombatantGroup`) [S34], [S39].
- `Combat#name` field [S11].
- `ApplicationV2` pop-out windows; `renderChild`, `attachWindow`/`detachWindow`; `openDetachedWindow` hook [S4], [S25], [S33].
- `ApplicationV2#_getFrameButtons` for header buttons [S11].
- Queries: `User#query`, `User.queryMany`, handlers in `CONFIG.queries` [S5], [S47].
- `FormulaEditor`, `HTMLFormulaInputElement`, Autocompletion API, `<autocomplete-tags>` [S6], [S15].
- `DataModel#getNearestDocument`, `DataModel#getFieldForProperty`, `SchemaField#extendFields/#removeFields` [S4], [S6], [S16b].
- Preliminary 3%-25% speedups in core Document/data handling [S3].

### 1.6 Removal status of ApplicationV1 in v14

- AppV1 classes exist in 14.370 under `foundry.appv1.api.*` and `foundry.appv1.sheets.*` [src: client/appv1/_module.mjs:3-4]. `foundry.appv1.sheets.ActorSheet` is tagged `@deprecated since v13` [src: client/appv1/sheets/actor-sheet.mjs:18].
- Constructing any AppV1 application logs, once: "The V1 Application framework is deprecated, and will be removed in a later core software version. Please use the V2 version of the Application framework available under foundry.applications.api.ApplicationV2." with `{since: 13, until: 16}` [src: client/appv1/api/application-v1.mjs:59-63]. AppV1 is scheduled for removal in v16.
- Core registers **no** default Actor or Item sheet in 14.370. `_registerDefaultSheets` registers core sheets for Folder, JournalEntry, Macro, Playlist, RollTable, Scene, User and embedded types, and omits Actor and Item [src: client/applications/sheets/_module.mjs:83-128]. dnd5e and Crucible still call `DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet)` [S30], [S38]; in 14.370 there is nothing registered under that id to remove.
- `DocumentSheetConfig.registerSheet` accepts `typeof Application | typeof ApplicationV2` [S24], [src: client/applications/apps/document-sheet-config.mjs:410-465].
- The v13 global aliases (`renderTemplate`, `loadTemplates`, `getTemplate`, `Actors`, `Items`, `ActorSheet`, `ItemSheet`, `TextEditor`, `DragDrop`, `DocumentSheetConfig`, and the rest of that list) still resolve in 14.370 through getters that log a compatibility warning `{since: 13, until: 15}` [src: client/client.mjs:213-640, getter at :655-672]. They are scheduled for removal in v15. See section 11. Build on AppV2 and namespaced paths only.
- **jQuery is bundled in 14.370.** The server's `CORE_VIEW_SCRIPTS` list starts with `scripts/jquery.min.js`, served from `node_modules/jquery/dist` [src: dist/server/express.mjs, `CORE_VIEW_SCRIPTS`], jQuery 3.7.1 [src: node_modules/jquery/package.json:5]. Core still calls `$` for ContextMenu jQuery mode and the deprecated `renderChatMessage` hook [src: client/applications/ux/context-menu.mjs:388, :631], [src: client/documents/chat-message.mjs:456]. The BRP claim that v14 removed jQuery [S50] is wrong for 14.370. AppV2 hands you `HTMLElement`; write no jQuery.

---

## 2. `system.json` manifest

### 2.1 Fields (v14 API types)

From `PackageManifestData` [S27] and `_SystemManifestData` [S28]:

| Field | Required | Type / meaning |
|---|---|---|
| `id` | **Yes** | Lower-case, no spaces or special characters. Must match the folder name [S27], [S18] |
| `title` | **Yes** | Human-readable title |
| `version` | **Yes** | Plain dot-separated numbers, no leading "v"; compared with `isNewerVersion` |
| `type` | `"system"` (schema `required`, `initial: "system"`) | v14 added an explicit `type: system \| module` field to manifests, "initially optional" [S8]. The system schema is `StringField({required: true, choices: ["system"], initial: "system"})`, so an omitted `type` cleans to `"system"` [src: common/packages/base-system.mjs:19]. Crucible sets `"type": "system"` [S38]. **Set it** |
| `media` | No (omission passes) | `SetField` of `{type, url, caption, loop, thumbnail, flags}` [src: common/packages/base-package.mjs:347-354]. An omitted required array field cleans to `[]` [src: common/data/fields.mjs:238, :2436-2438], so a manifest without `media` validates. dnd5e and Draw Steel include a `setup` entry; Crucible omits it [S38] |
| `description` | No | May contain HTML |
| `authors` | No | `{name, email, discord, url, flags}` |
| `url`, `bugs`, `changelog`, `license`, `readme` | No | URLs or relative paths |
| `compatibility` | No | `{minimum, verified, maximum}` strings: "will not function before", "verified compatible up to", "will not function after" [S29] |
| `manifest` | No (needed for updates) | Public URL of the latest manifest |
| `download` | No (needed for install) | Public URL of the zip |
| `esmodules` | No | ES module entry points |
| `scripts` | No | Legacy script includes |
| `styles` | No | CSS files. v13+ accepts objects `{src, layer}`; plain string arrays are migrated (`_migrateStyles`, deprecated since v13) [S31], [S36]. Draw Steel uses layers `system`, `variables`, `elements` [S36] |
| `languages` | No | `{lang, name, path}` |
| `packs` | No | `PackageCompendiumData[]` (see 2.3) |
| `packFolders` | No | Folders created once per world |
| `relationships` | No | `PackageRelationshipsData` (`requires`, `recommends`, `conflicts`, `systems`); entries have `id`, `type`, `manifest`, `compatibility` [S18] |
| `socket` | No | Boolean; reserves the `system.<id>` socket namespace [S18] |
| `flags` | No | Free key/value, namespaced by package id [S27] |
| `protected`, `exclusive`, `persistentStorage` | No | Premium content, free exclusive pack, keep `/storage` across updates |
| `background` | No | Default world background banner [S28] |
| `documentTypes` | No | Subtypes this system provides (see 2.2) |
| `grid` | No | `{diagonals?, distance?, type?, units?}` defaults for new Scenes [S28] |
| `initiative` | No | Default initiative formula [S28] |
| `primaryTokenAttribute`, `secondaryTokenAttribute` | No | Actor data path for token bars; must point to an object with `value` and `max` [S18], [S28] |

- Unknown top-level keys: `_initializeSource` collects every top-level manifest key the schema does not define, except the legacy keys `name`, `author`, `minimumCoreVersion`, `compatibleCoreVersion`, `maximumCoreVersion`, `systems` when their replacement is present [src: common/packages/base-package.mjs:267-274, :419-426]. The server then adds a package warning "manifest contained the following unknown keys" with no flag check [src: dist/packages/package.mjs, `_unknownKeys`]. The release notes mention manifest flags that suppress these warnings [S8]; the 14.370 source has no such flag. Keep custom data under `flags`.
- `strictDataCleaning` is still a `BaseSystem` property tied to `template.json` type checking [S31].

### 2.2 `documentTypes` and `template.json`

- `template.json` is deprecated in v14 [S5]. A system that ships one gets the package warning "System template.json is deprecated ... Support for template.json will be removed in V16." [src: dist/packages/system.mjs, `loadDataTemplate`]. Declare subtypes in `documentTypes` and give each a `TypeDataModel` [S5], [S18], [S19].
- `documentTypes` tells the server which subtypes exist so they are not flagged invalid [S18].
- Per-subtype options observed in v14 systems: `htmlFields` (sanitized HTML paths), `filePathFields` (`{"path": ["IMAGE", ...]}`), `gmOnlyFields` [S30], [S35], [S19]. 14.365 notes fixed creation of "Document subtypes with `gmOnly` fields" [S11].
- Subtypes can be declared for `Actor`, `Item`, `ActiveEffect`, `ChatMessage`, `Combat`, `CombatantGroup`, `JournalEntryPage`, `RegionBehavior` (all observed) [S30], [S35], [S38].
- A core type (`metadata.coreTypes`, e.g. ActiveEffect and Combat `base`) must not be declared: validation throws "is a reserved core type", which invalidates the whole `documentTypes` field [src: common/packages/sub-types.mjs:45-47]. Give a core type a model by assigning `CONFIG.ActiveEffect.dataModels.base` in `init` only (fabula-ultima `fabula-ultima.js:82-84`).
- Document types can declare metadata controlling whether "base" type documents can be created or shown in creation dialogs [S8].

### 2.3 `packs` and `packFolders`

- Pack entry fields observed: `name`, `label` (may be an i18n key), `path`, `type`, `system`, `ownership` (`{PLAYER: "OBSERVER", ASSISTANT: "OWNER"}`), `private`, `flags`, `banner` [S30], [S35].
- Valid `type`s: `CONST.COMPENDIUM_DOCUMENT_TYPES` = ActiveEffect, Actor, Adventure, Cards, Item, JournalEntry, Macro, Playlist, RollTable, Scene [src: common/constants.mjs:431-442]. Packs of type ActiveEffect, Actor, or Item must declare `system` [src: common/constants.mjs:1828], [src: common/packages/base-package.mjs:619-624]; in a system manifest it is filled with the system id when omitted [src: common/packages/base-package.mjs:569-581]. Crucible and dnd5e ship ActiveEffect packs [S30], [S38]; Crucible also ships `Adventure` [S38].
- Without `path`, a pack's path defaults to `packs/<name>`; a trailing `.db` is stripped from an explicit path [src: common/packages/base-package.mjs:164-169]. Setting `path` explicitly is still clearer.
- `packFolders` entries: `name`, `color`, `sorting` (`"m"` manual), `packs`, nested `folders` [S30]. 14.369 fixed manual sorting order [S17].

### 2.4 Example skeleton

Assembled from the fields above; values are placeholders.

```json
{
  "type": "system",
  "id": "<system-id>",
  "title": "<System Title>",
  "description": "...",
  "version": "0.1.0",
  "compatibility": { "minimum": "14.370", "verified": "14", "maximum": "14" },
  "authors": [{ "name": "..." }],
  "esmodules": ["<entry>.mjs"],
  "styles": [{ "src": "styles/<system>.css", "layer": "system" }],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "documentTypes": {
    "Actor": { "character": { "htmlFields": ["biography"] }, "npc": { "htmlFields": ["description"] } },
    "Item": { "weapon": {}, "armor": {}, "shield": {}, "accessory": {}, "class": {}, "skill": {}, "spell": {} },
    "ChatMessage": { "check": {} }
  },
  "packs": [],
  "socket": true,
  "grid": { "type": 1, "distance": 1, "units": "sq" },
  "primaryTokenAttribute": "resources.hp",
  "secondaryTokenAttribute": "resources.mp",
  "media": [],
  "url": "...", "manifest": "...", "download": "..."
}
```

- Compatibility string style: Draw Steel uses strings `"14.370"`/`"14"`; Crucible uses numbers `14.370`/`14` [S35], [S38]; dnd5e uses `"14.367"`/`"14"` [S30]. The versioning article does not specify the format [S48].
- `initiative`: L5R4 rolls Initiative through its own Combatant roll (Insight Rank + Reflexes, keep Reflexes; `game-rules/31_combat_round.md`, p.81), so the manifest formula is unused (see section 7).

---

## 3. Data models

### 3.1 Core API

- `foundry.abstract.TypeDataModel` is "intended to represent a Document's type-specific data" and should be subclassed for subtypes [S40].
- Register per subtype: `CONFIG.Actor.dataModels.character = CharacterData` in `init` [S19]. Also `CONFIG.Item.dataModels`, `CONFIG.ActiveEffect.dataModels`, `CONFIG.ChatMessage.dataModels`, `CONFIG.Combat.dataModels`, `CONFIG.JournalEntryPage.dataModels`, `CONFIG.RegionBehavior.dataModels` [S30], [S38].
- `static defineSchema()` returns an object of `foundry.data.fields` instances [S19].
- Field classes in `foundry.data.fields` (v14): `AlphaField`, `AngleField`, `AnyField`, `ArrayField`, `BooleanField`, `ColorField`, `DataField`, `DataModelSchemaField`, `DocumentAuthorField`, `DocumentFlagsField`, `DocumentIdField`, `DocumentOwnershipField`, `DocumentStatsField`, `DocumentTypeField`, `DocumentUUIDField`, `EmbeddedCollectionDeltaField`, `EmbeddedCollectionField`, `EmbeddedDataField`, `EmbeddedDocumentField`, `ExtendedNumberField`, `FilePathField`, `ForeignDocumentField`, `GridOffsetField`, `GridOffsetsField`, `HTMLField`, `HueField`, `IntegerSortField`, `JavaScriptField`, `JSONField`, `NumberField`, `ObjectField`, `SceneLevelsSetField`, `SchemaField`, `SetField`, `ShaderField`, `ShapesField`, `StringField`, `TypeDataField`, `TypedObjectField`, `TypedSchemaField` [S41].
- `DataField#placeholder` added, localized via `LOCALIZATION_PREFIXES` [S5].
- `static LOCALIZATION_PREFIXES` gives field `label`/`hint` from i18n paths instead of setting them per field [S40]. Draw Steel uses `["DRAW_STEEL.ActiveEffect.base"]` [S34]. `foundry.helpers.Localization.localizeDataModel(model, {prefixes, prefixPath})` localizes a model manually [S42].

### 3.2 Preparation order

- `TypeDataModel#prepareBaseData`: "Prepare data related to this DataModel itself, before any derived data (including Active Effects) is computed. Called before ClientDocument#prepareBaseData in ClientDocument#prepareData." [S40]
- `TypeDataModel#prepareDerivedData`: "Called before ClientDocument#prepareDerivedData in ClientDocument#prepareData." [S40]
- Actor exposes `prepareData()`, `prepareBaseData()`, `prepareEmbeddedDocuments()`, `applyActiveEffects(phase)` [S43], [src: client/documents/actor.mjs:212].
- The two core phases are `CONST.ACTIVE_EFFECT_CHANGE_PHASES = ["initial", "final"]` [src: common/constants.mjs:101]. Packages add phases in `CONFIG.ActiveEffect.phases` (default `{}`) and must call `applyActiveEffects` for them themselves [src: client/config.mjs:2061-2066]. `ActiveEffect.CHANGE_PHASES` merges both into `{[phase]: {label, hint}}` [src: client/documents/active-effect.mjs:43-54].
- Core call sites. `ClientDocument#prepareData` [src: client/documents/abstract/client-document.mjs:313-320]:
  ```js
  prepareData() {
    const isTypeData = this.system instanceof foundry.abstract.TypeDataModel;
    if ( isTypeData ) this.system.prepareBaseData();
    this.prepareBaseData();
    this.prepareEmbeddedDocuments();
    if ( isTypeData ) this.system.prepareDerivedData();
    this.prepareDerivedData();
  }
  ```
  `Actor#prepareEmbeddedDocuments` calls `super.prepareEmbeddedDocuments()` then `this.applyActiveEffects("initial")` [src: client/documents/actor.mjs:471-474]. `Actor#prepareData` calls `super.prepareData()` then `this.applyActiveEffects("final")` [src: client/documents/actor.mjs:428-436]. `TokenDocument` repeats the same two calls for `token.` changes [src: client/documents/token.mjs:440-444, :474-478].
- Order for an Actor, as executed: `system.prepareBaseData` -> `Actor#prepareBaseData` (runs `_clearData`: resets `overrides`, `tokenActiveEffectChanges`, `statuses`, completed phases) -> `prepareEmbeddedDocuments` (each owned Item and effect runs its own full `prepareData`) -> `applyActiveEffects("initial")` -> `system.prepareDerivedData` -> `Actor#prepareDerivedData` -> `applyActiveEffects("final")` [src: client/documents/abstract/client-document.mjs:313-320, :338-344], [src: client/documents/actor.mjs:428-474].
  - `system.prepareBaseData` runs before `_clearData`, so `actor.statuses` there still holds the previous cycle's statuses. Statuses are collected during the `"initial"` phase [src: client/documents/actor.mjs:254-256].
  - Crucible: "Owned Item preparation happens prior to the initial active effect application phase" [S46]; this matches the source.
- `applyActiveEffects` guards [src: client/documents/actor.mjs:215-231]: a non-string `phase` logs a deprecation `{since: 14, until: 16}` and picks `"initial"` or `"final"`; an unregistered phase logs an error and is still applied; a phase that already ran this cycle logs "has already completed and cannot be run again" through `Hooks.onError` and returns without applying. `Hooks.onError` logs and calls the `error` hook; it does not throw [src: client/helpers/hooks.mjs:182-188].
- Default `ActiveEffect#shouldApplyChange` returns `change.phase === options.phase` [src: client/documents/active-effect.mjs:500].
- Pitfall: an `Actor#prepareBaseData` override that skips `super` skips `_clearData` [src: client/documents/actor.mjs:451-466]. The completed-phase set then survives into the next cycle, so both phases log an error and apply nothing from the second preparation on, and `overrides` / `statuses` are never reset. It does not throw. Call `super`.

L5R4 mapping: Active Effect changes to Traits use `phase: "initial"`, so the Rings, Wounds, Initiative, and Armor TN derived from them in data preparation see the change. A change to a `system.*` schema field is cleaned and validated against that field; a result the field rejects is discarded with a console warning (see 6.2).

### 3.3 Migration

- `static migrateData(source)` migrates source data; it runs when source is first read from disk and on update deltas, so `source` may be only the delta [S18], [S19].
- 14.370: `migrateData` implementations must handle `ForcedReplacement` operators [S2]. Draw Steel reads possibly-wrapped values with `foundry.data.operators.DataFieldOperator.get(...)` [S34].
- `foundry.abstract.Document._addDataFieldMigration(data, oldKey, newKey, apply)` is used by Draw Steel [S34]. It is tagged `@internal` in core [src: common/abstract/document.mjs:1254-1264]: not public API. Write the rename inside `migrateData` instead.
- `DataModel.cleanData` consolidates cleaning, `DataField#clean` handles migrations in its recursion [S4], [S6].

### 3.4 Other data-model hooks

- `TypeDataModel` has `_preCreate`/`_onCreate`/`_preUpdate`/`_onUpdate`/`_preDelete`/`_onDelete`, `toEmbed`, `onEmbed`, `getNearestDocument`, `getFieldForProperty` [S40], [S16], [S5].
- `_preCreate` returning `false` excludes the document from creation [S40].
- Embedded CRUD: `Document#createEmbeddedDocuments(embeddedName, data=[], operation={})`, `updateEmbeddedDocuments(embeddedName, updates=[], operation={})`, `deleteEmbeddedDocuments(embeddedName, ids, operation={})`, each returning `Promise<Document[]>` [src: common/abstract/document.mjs:857-902].
- Embedded structured data: `EmbeddedDataField(Model)` for one nested model; `ArrayField(new SchemaField(...))`; `TypedObjectField` for keyed maps [S41]. 14.358: data models are initialized when Active Effects apply to an `EmbeddedDataField` [S16].
- `prepareDerivedData()` reading its own schema fields is internal: schema defaults guarantee presence (project rule, consistent with [S19]).

---

## 4. Sheets (ApplicationV2)

### 4.1 Classes and namespaces (v14)

| Use | Namespace | Source |
|---|---|---|
| `ApplicationV2`, `DocumentSheetV2`, `DialogV2`, `CategoryBrowser`, `HandlebarsApplicationMixin` | `foundry.applications.api` | [S23] |
| `ActorSheetV2`, `ItemSheetV2`, `ActiveEffectConfig`, `CombatantConfig`, `TokenConfig`, ... | `foundry.applications.sheets` | [S25b] |
| `DocumentSheetConfig` | `foundry.applications.apps` | [S24] |
| `DragDrop`, `TextEditor`, `ContextMenu`, `Tabs`, `FormDataExtended`, `ProseMirrorEditor`, `SearchFilter`, `FilterMenu`, `Autocomplete`, `Draggable`, `HTMLSecret` | `foundry.applications.ux` | [S51] |
| `CombatTracker` | `foundry.applications.sidebar.tabs` | [S53] |
| AppV1 sheets (`ActorSheet`, `ItemSheet`) | `foundry.appv1.sheets` (deprecated since v13) | [S22] |

Draw Steel extends `api.DocumentSheet` and spreads `sheets.ActorSheet.DEFAULT_OPTIONS.actions` [S37]. Both are re-export aliases of the V2 classes: `api` exports `ApplicationV2 as Application`, `DialogV2 as Dialog`, `DocumentSheetV2 as DocumentSheet` [src: client/applications/api/_module.mjs:1-3], and `sheets` exports `ActorSheetV2 as ActorSheet`, `ItemSheetV2 as ItemSheet` [src: client/applications/sheets/_module.mjs:38-39, :52-53]. They are the same classes, not the AppV1 ones at `foundry.appv1.*`. This project writes the `V2` names so the AppV1 / AppV2 distinction stays visible.

Standard base, as Crucible does it [S52]:

```js
const { api, sheets } = foundry.applications;
export default class FUActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) { /* ... */ }
```

### 4.2 `DEFAULT_OPTIONS`

- `ApplicationConfiguration`: `id`, `uniqueId`, `classes`, `tag`, `window`, `actions`, `form`, `position` [S54].
- `actions`: `Record<string, handler | {buttons: number[], handler}>`. A bare handler responds to left-click only; the object form matches `event.button` [S54]. Crucible: `resourcePip: {handler: ..., buttons: [0, 2]}` [S52].
- Handler signature `(event: PointerEvent, target: HTMLElement)`; `target` is the element carrying `[data-action]` [S25]. Handlers are static methods with `this` bound to the app instance: core invokes `handler?.call(this, event, target)` [src: client/applications/api/application.mjs:1984], [S37].
- `ApplicationV2` supports click actions on `auxclick` (middle-click) [S4].
- `form`: `{handler, submitOnChange, closeOnSubmit}` [S55]. Crucible and Draw Steel set `submitOnChange: true` on document sheets [S52], [S37]. `submitOnClose` is not an AppV2 option [S13].
- `DocumentSheetV2.DEFAULT_OPTIONS` includes `canCreate`, `canImport`, `editPermission: 3`, `viewPermission: 1`, `sheetConfig`, `ownershipConfig`, `window.controls` [S56].
- `ActorSheetV2.DEFAULT_OPTIONS` adds actions `configurePrototypeToken`, `configureToken`, `showPortraitArtwork`, `showTokenArtwork` [S25a].
- `window.controls`: `{action, icon, label, ownership, visible}` entries (header kebab menu) [S25a], [S37]. `_getFrameButtons(options)` adds header buttons [S11], [S37].

### 4.3 `PARTS` and rendering

- `static PARTS: Record<string, HandlebarsTemplatePart>` [S57].
- `HandlebarsTemplatePart` options, complete list [src: client/applications/api/handlebars-application.mjs:12-28]:
  - `template` (string, required): the entry-point template.
  - `id` (string): CSS id for the part's top-level element, prefixed with the application id.
  - `root` (boolean, default `false`): the part's rendered contents replace the children of the application root element. A root part must be first in `PARTS` or the constructor throws [src: ...handlebars-application.mjs:42-44]; requesting a root part in `render({parts})` renders all parts [src: ...handlebars-application.mjs:76].
  - `classes` (string[]): CSS classes for the part's top-level element.
  - `templates` (string[]): extra templates (partials) the part needs; preloaded with `template` [src: ...handlebars-application.mjs:101-103].
  - `scrollable` (string[]): selectors whose scroll position persists across re-render; `""` is the part root.
  - `forms` (`Record<selector, ApplicationFormConfiguration>`): forms inside the part and their submission handlers.
  Crucible and Draw Steel use `template`, `templates`, `scrollable`, `root` [S52], [S58].
- `_configureRenderParts(options)` returns a deep clone of PARTS you can prune per render [S57], [S58].
- `_preparePartContext(partId, context, options)` prepares per-part context [S57].
- `_attachPartListeners(partId, htmlElement, options)` attaches listeners per part [S57].
- `_prepareContext(options)` on `DocumentSheetV2` returns `{document, editable, fields, model, rootId, source, user, ...}` [S25a].
- Lifecycle methods: `_configureRenderOptions`, `_prepareContext`, `_preRender`, `_renderHTML`, `_replaceHTML`, `_onFirstRender`, `_onRender`, `_postRender`, `_onClose` [S25]. The page does not state the order explicitly.
- `render(options)`: a boolean is the `force` option. Partial render: `render({parts: ["stats"]})` (observed) [S25], [S34b].
- 14.365: detach/reattach re-renders parts, which can cause duplicate inserts in `_onRender` code that appends DOM [S12]. Keep `_onRender` idempotent.

### 4.4 Tabs

- `static TABS: Record<group, ApplicationTabsConfiguration>` with `{tabs: [{id, label?, icon?, cssClass?, tooltip?}], initial?, labelPrefix?}`. With `labelPrefix`, labels are `${labelPrefix}.${tabId}` [S59].
- `tabGroups: Record<string, string|null>` tracks the active tab per group; `changeTab(tab, group, options)` [S25].
- `_prepareTabs(group)` returns `Record<string, ApplicationTab>`; `_prepareContext` prepares tabs automatically when exactly one tab group is configured [S25]. Crucible passes `tabs: this._prepareTabs("sheet")` into context [S52].
- 14.370 fix: `changeTab` calls made during rendering no longer block the tab [S2].

### 4.5 Drag and drop

- `ActorSheetV2` exposes protected `_dragDrop`, `_onDragStart`, `_onDragOver`, `_onDrop`, `_onDropDocument`, `_onDropItem`, `_onDropActor`, `_onDropActiveEffect`, `_onDropFolder`, `_onSortItem`, `_canDragStart`, `_canDragDrop` [S25a]. These are the override points for dropping Items (weapons, Skills, Spells) on an actor sheet.
- For other apps, create `new foundry.applications.ux.DragDrop.implementation({dragSelector, dropSelector, permissions: {dragstart, drop}, callbacks: {dragstart, dragover, drop, ...}})` and call `.bind(this.element)` in `_onRender` [S60], [S37], [S58].
- Read drop data with `foundry.applications.ux.TextEditor.implementation.getDragEventData(event)` (returns `{}` if not JSON) [S61], [S37]. Resolve documents with `getDocumentClass(data.type).fromDropData(data)` [S37]. Dropped data is a trust boundary.

### 4.6 Sheet registration

- `foundry.applications.apps.DocumentSheetConfig.registerSheet(documentClass, scope, sheetClass, options)` and `unregisterSheet(documentClass, scope, sheetClass, {types})` [S24].
- `foundry.documents.collections.Actors.registerSheet(...args)` / `Items.registerSheet` forward to `DocumentSheetConfig` and are not marked deprecated [S62], [src: client/documents/abstract/world-collection.mjs:156-174].
- Both forms are in use on v14: Draw Steel uses `Actors.registerSheet` and `DocumentSheetConfig.registerSheet` [S33]; Crucible and dnd5e use `DocumentSheetConfig` for everything [S38], [S30]. `DocumentSheetConfig` covers every document class (ActiveEffect, CombatantGroup, JournalEntryPage), so it is the one API that works everywhere.

### 4.7 What a document sheet is, as the user meets it

A sheet is a live form over one Document, inside a window Foundry draws. Mock-ups and templates follow this list.

| Part | Behavior | Source |
|---|---|---|
| Window frame | Foundry renders it: header with icon, title `"<type label>: <name>"`, kebab button opening the `window.controls` menu, frame buttons, close button; then `.window-content`; a resize handle when `window.resizable`. Dragging the header moves the window. The system styles the frame; it never draws its own | [src: client/applications/api/application.mjs:851-863], [src: client/applications/api/document-sheet.mjs:80-85] |
| Header menu and buttons | DocumentSheetV2: Configure Sheet, Ownership (GM), Copy UUID (left-click UUID, right-click ID, draggable), Import (compendium copies). ActorSheetV2 adds Token / Prototype Token and show portrait / token art | [src: client/applications/api/document-sheet.mjs:51-63, :171-184], [src: client/applications/sheets/actor-sheet.mjs:20-56] |
| Fields | The window element is a `<form>`. Each stored value is an input named by its path (`name`, `system.hp.value`); with `submitOnChange` a change validates against the schema and calls `document.update()`, and the sheet re-renders | [src: client/applications/api/document-sheet.mjs:31, :457-537] |
| Derived values | Shown as text or disabled inputs, never named inputs: a derived value has no stored field to update. Crucible and PF2e show the sum behind a number in a hover tooltip | Crucible `base-actor-sheet.mjs:820-831`; PF2e `templates/actors/character/partials/sidebar.hbs:4-7, :23-33` |
| Schema-driven inputs | `{{formInput field value=...}}` and `{{formGroup field value=...}}` render the input a `DataField` defines (choices become a select, numbers get min/step) | [src: client/applications/handlebars.mjs:509, :531]; Crucible `hero-header.hbs:21`, `hero-biography.hbs:11-16` |
| Relative entry | Crucible turns number inputs to text on focus and accepts `+N`, `-N`, `=N`; PF2e marks inputs `data-allow-delta`. A system feature, not core | Crucible `base-actor-sheet.mjs:947-975`; PF2e `sidebar.hbs:14, :20` |
| Rich text | `<prose-mirror toggled>` shows enriched HTML with an edit button; clicking opens the editor in place, saving closes it. Secret blocks reveal per owner | [src: client/applications/elements/prosemirror-editor.mjs:11-44, :150-204]; Crucible `hero-biography.hbs:8, :25` |
| Image | `<img data-edit="img" data-action="editImage">` opens the FilePicker and submits | [src: client/applications/api/document-sheet.mjs:376-402] |
| Permissions | Visible from LIMITED, editable at OWNER. A non-editable sheet has every form element disabled on render, and drops are refused | [src: client/applications/api/document-sheet.mjs:33-34, :105-111, :212-227, :251-254], [src: client/applications/sheets/actor-sheet.mjs:212-214] |
| Embedded lists | Each Item / effect row is an element with `data-item-id` (or `data-effect-id`) and class `draggable`, holding the image, name, tags, and buttons (`data-action`) for use, equip, edit, delete. Dropping an Item from the sidebar or a compendium creates a copy; dropping within the same actor re-sorts | [src: client/applications/sheets/actor-sheet.mjs:81-94, :224-238, :341-403]; Crucible `templates/sheets/actor/inventory.hbs:9-25` |
| Create and delete | A `+` per section creates (often `Item.createDialog` with allowed types); delete goes through `document.deleteDialog()` | Crucible `base-actor-sheet.mjs:1035-1052` |
| Pips and toggles | Buttons with `data-action` and `buttons: [0, 2]`: left-click sets or fills, right-click empties | Crucible `base-actor-sheet.mjs:40, :1234-1243` |
| Edit and play mode | Draw Steel: a header lock button switches modes. Play shows values, roll buttons, and use controls; edit shows inputs and add / delete controls. A new document opens in edit mode; a user who cannot edit stays in play | Draw Steel `src/module/applications/api/document-sheet.mjs:48-120, :159-165` |
| Tabs | `static TABS` plus `data-tab` / `data-group` sections; each tab is a PART, so one tab re-renders alone | §4.3, §4.4; Crucible `templates/sheets/actor/main.hbs:1-8` |

PF2e 8.7.0's actor and item sheets still extend the AppV1 `foundry.appv1.sheets.ActorSheet` / `ItemSheet` (`pf2e.mjs:17213`, `:50353`); only one sheet uses `ActorSheetV2`, rendered with Svelte (`pf2e.mjs:54952`). Read PF2e for what a full sheet offers; read core, Crucible, and Draw Steel for how AppV2 builds it.
- Options observed: `types`, `makeDefault`, `label` (i18n key) [S33], [S38]. 14.369 fixed invalid entries for undefined types [S17].
- dnd5e and Crucible unregister the core AppV1 sheets with `unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet)` and `(Item, "core", foundry.appv1.sheets.ItemSheet)` [S30], [S38]. 14.370 registers no core Actor or Item sheet (see 1.6) [src: client/applications/sheets/_module.mjs:83-128], so these calls remove nothing. Register the system sheets with `makeDefault: true` and skip the unregister.

---

## 5. Rolls and chat

### 5.1 `Roll`

- `foundry.dice.Roll(formula, data, options)` [S26].
- `evaluate(options)` returns `Promise<Roll>`; options `minimize`, `maximize`, `allowStrings`, `allowInteractive` [S26].
- `evaluateSync({strict})` exists for deterministic rolls; throws under `strict` with non-deterministic terms [S26]. Use `await roll.evaluate()` for dice.
- `toMessage(messageData, {create, messageMode})` [S26]. `rollMode` is not in the v14 signature [S26]; old roll modes are back-compatible until V16 [S8].
- `render({isPrivate, template, flavor})`, `CHAT_TEMPLATE` (`templates/dice/roll.hbs`), `TOOLTIP_TEMPLATE` (`templates/dice/tooltip.hbs`), `fromData`, `replaceFormulaData`, `validate`, `_prepareChatRenderContext` [S26].
- `total`, `result`, `dice`, `terms`, `isDeterministic` [S26]. New `DiceTerm#minValue`, `#minResult`, `#maxResult` [S2].
- Custom Roll classes: subclass `foundry.dice.Roll` and register in `CONFIG.Dice.rolls` so chat messages rehydrate them. Draw Steel replaces the array; dnd5e assigns it; Crucible pushes onto it [S33], [S30], [S38]. `Roll.fromData` redirects to the class whose `name` matches `data.class` in `CONFIG.Dice.rolls` and throws if none is registered [src: client/dice/roll.mjs:1067-1071].
- Replacing a die result after evaluation (a reroll):
  - `Roll#total` returns the cached `_total` [src: client/dice/roll.mjs:193-195]; editing `DiceTerm#results` does not change it. `DiceTerm#total` sums the `active` results [src: client/dice/terms/dice.mjs:232-241]. `roll.dice` lists every `DiceTerm` [src: client/dice/roll.mjs:158-165].
  - `Roll.fromTerms(terms, options)` builds a Roll from `RollTerm` instances and, when all are evaluated, recomputes the total with `_evaluateTotal()` [src: client/dice/roll.mjs:1124-1144]. Use it to rebuild a roll after swapping a term's results.
  - `Roll.fromData(data)` restores `data.total` as stored, without recomputing, and marks the roll evaluated unless `data.evaluated` is `false` [src: client/dice/roll.mjs:1087-1092]. Editing `roll.toJSON()` and calling `fromData` therefore needs `total` updated by hand.
  - An evaluated roll throws on `alter` ("You may not alter a Roll which has already been evaluated") [src: client/dice/roll.mjs:229].
- `Roll.create` now invokes `defaultImplementation` [S11].
- New core setting for the default dice fulfillment method [S8].

L5R4 note: Roll & Keep rolls are `XdYkZx10` (keep the highest, tens explode); the Ten Dice Rule is applied before the formula is built (`module/services/dice/core/ten-dice-rule.js`). Read kept dice from `roll.dice` after evaluation; the rule logic lives in Utils and Services.

### 5.2 Chat messages

- `ChatMessage` schema: `author`, `blind`, `content`, `emote`, `flavor`, `rolls`, `sound`, `speaker`, `style`, `system`, `timestamp`, `title`, `type`, `whisper` [S63].
- `CONST.CHAT_MESSAGE_STYLES = {OTHER: 0, OOC: 1, IC: 2, EMOTE: 3}` [S64]. `CONST.CHAT_MESSAGE_TYPES` is gone: no such export in `common/constants.mjs` (grep, 14.370).
- Permissions [src: common/documents/chat-message.mjs:33-36, :74-78, :94-98], [src: common/abstract/document.mjs:135-140]: create requires GM, or a user with the PLAYER role creating a message whose `author` is themselves; update uses the Document default `"OWNER"`; delete is `"OWNER"`. The message `author` always has OWNER level, so the author can update their own message's `rolls`, `system`, `content`, and `flags` without a GM. `rolls` entries must be evaluated rolls ("Roll objects added to ChatMessage documents must be evaluated") [src: common/documents/chat-message.mjs:62, :86-89].
- Visibility: `ChatMessage.applyMode(chatData, mode)` (static, on data) and `message.applyMode(mode)` (instance) [S63]. Modes are the keys of `CONFIG.ChatMessage.modes: Record<string, {handler, icon, label}>` [S65]. Observed values: `"public"`, `"blind"`; default from `game.settings.get("core", "messageMode")` [S33b], [S32].
- `ChatMessage.getSpeaker({actor, token, ...})` [S63].
- `renderHTML(options): Promise<HTMLElement>`, `isContentVisible`, `isRoll`, `visible`, `isAuthor` [S63].
- `CONFIG.ChatMessage`: `batchSize`, `collection`, `dataModels`, `documentClass`, `modes`, `popoutClass`, `template`, `typeHints`, `typeIcons`, `typeLabels` [S65].
- Message subtypes: declare in `documentTypes.ChatMessage`, register `CONFIG.ChatMessage.dataModels.<type>`, create with `type: "<type>"` and `system: {...}` [S30], [S38], [S34].

### 5.3 Chat card buttons

- Hook: **`renderChatMessageHTML(message, html: HTMLElement, context?)`**, fires per message rendered into the ChatLog; `context` only when the core template renders [S66].
- `renderChatMessage` (jQuery) was deprecated in v13 in favor of `renderChatMessageHTML` [S67], and is not listed in the v14 hook index [S68]. 14.370 still calls it, with a jQuery-wrapped element, when a listener exists, and logs `{since: 13, until: 15}` [src: client/documents/chat-message.mjs:449-457].
- Pattern used by Draw Steel and Crucible: one `Hooks.on("renderChatMessageHTML", ...)` that delegates to the message's data model (`message.system.alterMessageHTML(html)`, `message.system.addListeners(html)`), guarded by `message.isContentVisible` [S33], [S34c], [S38].
- Button data read back from a rendered card is a trust boundary: re-resolve documents by UUID.
- `getChatMessageContextOptions` hook adds context-menu entries [S30], [S38].

---

## 6. Active Effects (v14 "Active Effects V2")

### 6.1 Data shape

- Schema: `_id`, `_stats`, `description`, `disabled`, `duration`, `flags`, `folder`, `img`, `name`, `origin`, `showIcon`, `sort`, `start`, `statuses`, `system`, `tint`, `transfer`, `type` [S69].
- Changes live in **`system.changes`**, defined by `foundry.data.ActiveEffectTypeDataModel`: "A single ArrayField is defined for EffectChangeData. A system can override the changes SchemaField but must preserve definitions for type, phase, and priority." [S70]
- `EffectChangeData`: `key`, `value`, `type`, `phase`, `priority` (`null` -> default priority). "Each phase is its own priority group; application of a change in an earlier phase will occur before a change in a later phase, regardless of priority. A pair of phases are preconfigured" [S44].
- Core change types and default priorities (`CONST.ACTIVE_EFFECT_CHANGE_TYPES`): `custom` 0, `multiply` 10, `add` 20, `subtract` 20, `downgrade` 30, `upgrade` 40, `override` 50. "Other arbitrary string types can be used by systems and modules" [S71], [src: common/constants.mjs:103-107]. `CONST.ACTIVE_EFFECT_MODES` is legacy: a Proxy that logs a warning on access [S12a], [src: common/constants.mjs:2354-2365].
- Phases: `"initial"` and `"final"` are core; see 3.2 for where each runs [src: common/constants.mjs:101].
- Custom change types: `CONFIG.ActiveEffect.changeTypes.<key> = {label, defaultPriority, handler}` (Crucible) [S38]. dnd5e merges its own into `CONFIG.ActiveEffect.changeTypes` [S30].
- Additional phases: `CONFIG.ActiveEffect.phases: Record<string, {hint, label}>`; you must call `Actor#applyActiveEffects(phase)` yourself at the right point [S72].
- Subtype data models: subclass `foundry.data.ActiveEffectTypeDataModel`; register in `CONFIG.ActiveEffect.dataModels`; declare a system-defined subtype in `documentTypes.ActiveEffect` [S34], [S38], [S30]. Core's `base` type takes a model through `CONFIG` only and is never declared (§2.2). Crucible registers `base` [S38].

### 6.2 Applying effects

- `ActiveEffect.applyChange(targetDoc, change, options)`, `applyChangeField(...)`, protected handlers `_applyChangeAdd/Custom/Multiply/Override/Subtract/Upgrade/Unguided` [S69], [S73]. `_applyChangeUnguided` infers types from the current value or `template.json` default [S73].
- `ActiveEffect#shouldApplyChange(change, options)`: "Systems and modules may override" to decide per phase [S69]. dnd5e calls it with `{replacementData, phase: change.phase}` [S45].
- `ActiveEffect#getReplacementData(baseData)` supplies data for `@` expressions in string values [S69], [S15].
- How a change is applied [src: client/documents/active-effect.mjs:526-556]: a handler registered in `CONFIG.ActiveEffect.changeTypes` runs first if present. Otherwise, for a `system.*` key, core resolves the field with `system.getFieldForProperty(...)` and calls `DataField#applyChange`; for any other key, or a `system.*` path with no schema field (a derived property), it falls back to `_applyChangeUnguided`, which infers the type from the current value [src: ...active-effect.mjs:593-673].
- `DataField#applyChange` casts the value (resolving `@` references), applies the type, then cleans and validates the result against the field; a result that fails validation is discarded with a console warning and the original value kept [src: common/data/fields.mjs:685-734].
- `add` on a `SetField` is `value.union(delta)`; `subtract` is `value.difference(delta)`; the delta is cast to a Set [src: common/data/fields.mjs:2786-2802]. `add` on an `ArrayField` concatenates; `subtract` splices out equal elements [src: common/data/fields.mjs:2696-2713]. The unguided path does the same for Set and Array values [src: client/documents/active-effect.mjs:760-765, :804-808].
- Item targets: core applies effect changes only to Actors (and to TokenDocuments for `token.` keys). The only core callers of `ActiveEffect.applyChange` are `Actor#applyActiveEffects` and `TokenDocument#applyActiveEffects` [src: client/documents/actor.mjs:266], [src: client/documents/token.mjs:3871]; `Item` has no `applyActiveEffects` (client/documents/item.mjs). A non-transfer effect on an Item has that Item as its `target` [src: client/documents/active-effect.mjs:199-203], but nothing in core applies its changes. Transfer effects reach the owning Actor through `allApplicableEffects()` [src: client/documents/actor.mjs:305-314]. A system that wants an effect to modify its own Item must call `ActiveEffect.applyChange(item, change)` in Item data preparation itself; the signature accepts an Item target [src: client/documents/active-effect.mjs:516-526].
- `Actor#overrides`, `Actor#appliedEffects`, `Actor#allApplicableEffects()` (includes transferred Item effects), `Actor#statuses`, `Actor#temporaryEffects`, `Actor#tokenActiveEffectChanges` keyed by phase [S43].
- Token changes: keys prefixed `token.` (`token.name`, `token.width`, `token.texture.src`, ...) apply to the token (Draw Steel docs) [S74]. `Actor` gained `tokenOverrides` [S6].
- `applyActiveEffect` hook fires for `custom` changes and for unknown change types without a registered handler, on both paths: `Hooks.call("applyActiveEffect", model, change, value, delta, {})` [src: common/data/fields.mjs:870-875] and `Hooks.call("applyActiveEffect", targetDoc, change, current, delta, changes)` [src: client/documents/active-effect.mjs:900-902], [S68].

### 6.3 Duration and expiry

- `duration` supports non-second time units and `duration.expiry` events; `ActiveEffect.registry` (an `ActiveEffectRegistry`) tracks embedded durations and expiry; `registry.refresh(event, context)` announces events [S6], [S69].
- `CONFIG.ActiveEffect.expiryEvents: Record<string, string>` registers custom events, which "must be triggered through the registry's `refresh` method" [S72]. Draw Steel adds `save` and `respite` and calls `ActiveEffect.registry.refresh("turnEnd" | "roundEnd" | "roundStart" | "turnStart", {..., combat})` [S33], [S32].
- `CONFIG.ActiveEffect.expiryAction: "update" | "delete" | null`; `update` sets `duration.expired` [S72]. Crucible uses `"delete"` [S38].
- `isExpiryEvent(event, context)`, `isSuppressed`, `isTemporary`, `active`, `modifiesActor`, `target`, `updateDuration(context)`, static `getEffectStart(combat)` [S69].
- 14.368: expired effects with no expiry events are removed immediately [S16b].

L5R4 note: stances and conditions last until a player, the GM, or the automation the rules call for removes them; endings the rules leave to the GM stay manual.

### 6.4 Status effects

- `StatusEffectConfig` = `_StatusEffectConfig & Partial<ActiveEffectData>` [src: client/config.mjs:1669-1684]. `_StatusEffectConfig` fields: `id` (string, required), `order` (number, default 0), `hud` (`boolean | {actorTypes?: string[]}`, default `true`; with `actorTypes` the status is selectable in the Token HUD only for those Actor subtypes), `label` (deprecated alias of `name`), `icon` (deprecated alias of `img`). Any ActiveEffect data can be added: `_id`, `name`, `img`, `statuses`, `system.changes`, ... [S33], [S30].
- `CONFIG.statusEffects` is a Proxy over an array that is also keyed by each entry's `id` [src: client/config.mjs:1690-1738]. Assigning `CONFIG.statusEffects = {...}` replaces the contents with `Object.values(value)` [src: client/client.mjs:29-39], so every entry needs its own `id` property; the object key is not used.
- `ActiveEffect.fromStatusEffect(statusId, options)` throws for an unknown id, and throws for a status with extra `statuses` but no static `_id`; it localizes `name` with `_loc` and defaults `showIcon` to `ALWAYS` [src: client/documents/active-effect.mjs:127-138]. Override protected `_fromStatusEffect` to customize [S69], [S34].
- `Actor#toggleStatusEffect(statusId, {active, overlay=false})` returns `ActiveEffect | boolean | undefined` [S43]. It throws `Invalid status ID "..." provided to Actor#toggleStatusEffect` for ids not in `CONFIG.statusEffects` [src: client/documents/actor.mjs:547-549].
- `CONFIG.specialStatusEffects` maps special roles to ids (dnd5e) [S30].
- Certain effects can show as status icons without a finite duration [S4].

---

## 7. Combat

### 7.1 Documents

- `Combat` schema: `active`, `combatants`, `groups`, `name`, `round`, `scene`, `sort`, `system`, `turn`, `type` [S75].
- `Combat` methods: `rollInitiative(ids, {formula, messageMode, messageOptions, updateTurn})`, `rollAll`, `rollNPC`, `setupTurns()`, protected `_sortCombatants(a, b)` (default: descending initiative, ties by id), `setInitiative`, `resetAll`, `startCombat`, `nextTurn`, `previousTurn`, `nextRound`, `previousRound`, `endCombat`, protected `_canChangeRound(user)`, `_canChangeTurn(user)` [S75].
- Turn events: protected `_onStartTurn`, `_onEndTurn`, `_onStartRound`, `_onEndRound`, run only for one designated GM; `_manageTurnEvents()` runs End Turn, End Round, Begin Round, Begin Turn [S75].
- `turns`, `current`, `previous`, `combatant`, `nextCombatant`, `started`, `getCombatantsByActor(actor)` (returns an array) [S75].
- `Combatant` schema: `actorId`, `defeated`, `group`, `hidden`, `img`, `initiative`, `name`, `roundJoined`, `sceneId`, `system`, `tokenId`, `type`. Methods `getInitiativeRoll(formula)`, `rollInitiative(formula)`, protected `_getInitiativeFormula()`, `_prepareGroup()`; getters `actor`, `token`, `players`, `isDefeated`, `isNPC`, `turnNumber`, `resource` [S76].
- `CombatantGroup`: `img`, `initiative`, `name`, `ownership`, `system`, `type`, `members: Set<Combatant>`, `defeated`, `hidden` [S39].
- `CONFIG.Combat`: `collection`, `dataModels`, `documentClass`, `fallbackTurnMarker`, `initiative: {decimals, formula}`, `initiativeIcon`, `settings`, `sounds`, `typeLabels`... [S77]. Also `CONFIG.Combatant` and `CONFIG.CombatantGroup` document classes (dnd5e) [S30].
- `initializeCombatConfiguration` is a startup hook [S68].
- Combat hooks: `combatStart`, `combatTurn`, `combatRound`, `combatTurnChange` [S68].
- 14.358: combat-based effect durations stay accurate across multiple combats [S16]. 14.357: `Combatant#turnNumber` set at combat start [S10]. 14.369: `Combat#previous` restored [S17].

### 7.2 Alternating sides and multiple NPC turns

L5R4 Initiative is individual, so side alternation is not needed. Draw Steel 1.2.x shows how a v14 system subclasses Combat for its own turn order [S32b], [S32], [S58]:

- `Combatant#initiative` is used as **remaining turns this round**, not a rolled score. `nextRound()` resets it to the actor's turn count (`c.actor?.system.combat.turns ?? 1`).
- `_sortCombatants(a, b)` sorts by disposition first (players, neutral, hostile), then initiative, name, id.
- `endTurn()` sets `turn: null` so no combatant is active between activations; a tracker action "activates" the combatant a player picks, decrementing its count and setting `turn` to its index.
- `_canChangeRound(user)` limited to GM.
- `_manageTurnEvents()` is overridden because core "does not proc turn events when going in 'reverse' order ... *does* proc turn events of 'skipped' tokens" (core issue #13983). The override calls `_onEndTurn`, `_onEndRound`, `_onStartRound`, `_onStartTurn`, `ActiveEffect.registry.refresh(...)`, and region events itself.
- `ActiveEffect.getEffectStart(combat)` overridden because the source combatant's turn does not determine durations.
- Initiative to decide who goes first is a separate roll posted with `roll.toMessage({flavor}, {messageMode: "public"})`.

For L5R4, a `Combatant` subclass overriding `getInitiativeRoll` replaces patching `Combatant.prototype`, and a `Combat` subclass overriding `rollInitiative` holds the Void Point prompt. That is a design inference; the API pieces are confirmed above.

### 7.3 Combat tracker

- `foundry.applications.sidebar.tabs.CombatTracker` (AppV2, Handlebars). `PARTS`: `header`, `tracker` (scrollable), `footer`. Actions: `activateCombatant`, `createCombat`, `cycleCombat`, `editName`, `panToCombatant`, `pingCombatant`, `rollInitiative`, `toggleDefeated`, `toggleHidden`, `trackerSettings`. Methods `_prepareCombatContext` (footer), `_prepareTrackerContext`, `_prepareTurnContext(combat, combatant, index)`, `_getEntryContextOptions`, `_getCombatContextOptions`; getter `viewed` [S53].
- Replace it with `CONFIG.ui.combat = MyTracker` in `init` [S33], [S30], [S38].
- Draw Steel adds its own PARTS and prunes core parts in `_configureRenderParts`, extends `_prepareTurnContext`, and removes `rollAll`/`rollNPC` buttons in `_onRender` [S58].
- `renderCombatTracker` hook is used by dnd5e and Crucible [S30], [S38].

---

## 8. Tokens, resources, scenes

- `CONFIG.Actor.trackableAttributes: Record<string, ActorTrackableAttributes>` keyed by actor type, shape `{bar: string[], value: string[]}` (paths relative to `system`) (dnd5e) [S78], [S30]. Configure it in `setup` (dnd5e) [S30]. The KB says it controls which attributes appear as token bars [S18].
- When `CONFIG.Actor.trackableAttributes` is empty (the default `{}` [src: client/config.mjs:165]), core infers trackable attributes from each Actor type's data model schema [src: client/documents/token.mjs:3980-4003, :4090-4093]: a `SchemaField` or `EmbeddedDataField` whose schema has both `value` and `max` is a bar; every `NumberField` is a value [src: client/documents/token.mjs:4061-4080]. Only schema fields count, so a `max` computed in `prepareDerivedData` and absent from the schema does not make a bar. When `trackableAttributes` is set but has no entry for a type, the union of all configured entries is used [src: client/documents/token.mjs:4095-4107].
- `primaryTokenAttribute` / `secondaryTokenAttribute` set defaults [S28], [src: common/packages/base-system.mjs:31-32].
- Targets: `game.user.targets` is a `UserTargets`, which extends `Set<Token>` (Token placeables, not TokenDocuments); its `ids` getter returns the token ids [src: client/documents/user.mjs:41-45], [src: client/canvas/placeables/tokens/targets.mjs:13, :24-26]. Reach the actor with `token.actor` and the document with `token.document`.
- `Actor#modifyTokenAttribute(attribute, value, isDelta, isBar)` handles bar edits; override to route damage (Draw Steel routes stamina through temp stamina) [S43], [S32].
- Token bar colors factored out for systems (property names not given) [S14].
- Scene Levels: native multi-level scenes; Level deletion deletes its tokens and level-only placeables; tokens changing level arrive at the destination's base elevation [S3], [S11].
- Regions replace Measured Templates; `CONFIG.Region.templateModeConfig` (with `gridBased`) configures template mode [S2], [S33].
- Token movement API: `CONFIG.Token.movement.actions`, `TokenDocument#move`, `Scene#moveTokens`, `token.planMovement()` [S5], [S10].

---

## 9. Compendium packs

- Packs are LevelDB directories at `packs/<name>` (manifest `path`) [S30], [S35].
- `@foundryvtt/foundryvtt-cli`, npm latest **3.0.5** (modified 2026-10-09), `engines.node > 17` [S79]. CLI: `fvtt configure`, `fvtt package workon`, `fvtt package pack`, `fvtt package unpack`; see `--help` for flags [S80].
- API: `compilePack(src, dest, {nedb, yaml, log, recursive, transformEntry})`; `extractPack(src, dest, {nedb, yaml, yamlOptions, log, folders, documentType, transformEntry, transformName, transformFolderName, transformSerialized, expandAdventures, omitVolatile, jsonOptions})`. `omitVolatile` drops `_stats.createdTime`, `modifiedTime`, `lastModifiedBy`, `systemVersion`, `coreVersion` [S80].
- Crucible (`build.mjs`): YAML sources in `_source/<pack>/`, compiled to `packs/<pack>/`; `extractPack(..., {yaml: true, clean: true, omitVolatile: true})`; scripts `npm run compile` / `npm run extract` [S81], [S82]. The `clean` option is not in the README [S80], but CLI 3.0.5 has it: "Delete the destination directory before unpacking" [src: node_modules/@foundryvtt/foundryvtt-cli/lib/package.mjs:48, 492].
- Draw Steel: JSON sources in `src/packs/<pack>/`, `compilePack(src, dest, {yaml: false, recursive: true, transformEntry})` [S83].
- Commit the source JSON/YAML; build `packs/` in CI (both systems build packs in their release workflow) [S84], [S85]. Packs cannot be compiled while a running world has them open: `compilePack` fails with `LEVEL_DATABASE_NOT_OPEN`, cause `LEVEL_LOCKED` on the pack's `LOCK` file, and writes nothing (observed with 14.370 and CLI 3.0.5, `npm run build:packs` against a running world).
- v14: compendium "replace" imports preserve ownership; Active Effects in compendiums are indexed; pack indexes no longer polluted by embedded paths [S2], [S11].
- `CONFIG.<Doc>.compendiumIndexFields` adds index fields (dnd5e, Crucible, Draw Steel) [S30], [S38], [S33].

---

## 10. Settings, hooks, localization, CONFIG, utils, sockets

### 10.1 Startup hooks

- Once hooks in order: `init`, `i18nInit`, `setup`, `ready`; also `initializeDynamicTokenRingConfig`, `initializeCombatConfiguration`, `canvasConfig` [S68].
- `init`: set `CONFIG.*.documentClass`, `dataModels`, register sheets, settings, `CONFIG.Dice.rolls`, `CONFIG.ui.*`, `loadTemplates` (all three systems) [S30], [S33], [S38].
- `i18nInit`: pre-localize config objects; `localizeDataModel` for non-document models [S33], [S30].
- `setup`: trackable attributes (dnd5e) [S30].
- `ready`: world migrations (Draw Steel `migrateWorld()` in `ready`) [S33]. `ready` fires after scene transitions [S8].
- 14.370: `adventureImports` and select core settings are exposed before `init` [S2].
- `hotReload` hook and manifest `flags.hotReload: {extensions, paths}` (dnd5e, Draw Steel) [S30], [S35].

### 10.2 Settings

- `game.settings.register(namespace, key, {name, hint, scope: "world"|"user"|"client", config, type, default, choices, requiresReload, onChange})`; `registerMenu(namespace, key, {..., restricted})`; `get(ns, key, {document})`; `set(ns, key, value, {document})` [S86].
- `type` must be a DataField instance, a DataModel, or a callable; anything else throws "Setting ... type must be a DataField, DataModel, or callable function" [src: client/helpers/client-settings.mjs:133-137]. A DataField `type` supplies the default from `getInitialValue()` and takes `label`/`hint` from the setting [src: ...client-settings.mjs:140-145]. A DataModel subclass as `type` is supported: its default becomes `{}` [src: ...client-settings.mjs:148] and stored values are built with `type.fromSource(value || {}, {strict: true})` [src: ...client-settings.mjs:349-350]. Draw Steel registers DataModel-typed settings (`data/settings/*.mjs`) [S87].
- `SettingsConfig` V2 `input` functions work (14.356 fix) [S9].
- `game.settings.get` for a user-changeable setting is a trust boundary (project rule).

### 10.3 Localization

- `game.i18n.localize(stringId, data?)` fills `{}` placeholders from `data` [S42]. `_loc(...)` global alias [S6], [S42].
- `game.i18n.has`, `getListFormatter`, `lang`, static `localizeDataModel` [S42].
- `game.i18n.format` exists in 14.370 as a non-enumerable alias of `localize`, with no deprecation warning [src: client/helpers/localization.mjs:481]. It is not on the v14 API page [S42]. Use `localize(key, data)`: placeholders are `{name}` and are replaced from `data` [src: client/helpers/localization.mjs:400, :435-445].
- Notifications: `ui.notifications.warn(key, {localize: true, format: {...}})` (Draw Steel) [S34]; 14.367 fixed `NotificationOptions#localize` [S88].

### 10.4 `CONFIG`, `game.system`, utils

- System config object: this system uses `CONFIG.l5r4`, set in `init`, following `CONFIG.DND5E` / `CONFIG.DRAW_STEEL` [S30], [S33].
- `game.system` is the system package; dnd5e and Crucible assign their API onto it (`globalThis.dnd5e = game.dnd5e = Object.assign(game.system, ...)`) [S30], [S38].
- `foundry.utils`: `mergeObject`, `deepClone`, `getProperty`, `setProperty`, `hasProperty`, `isSubclass`, `parseUuid`, `fromUuidSync`, `randomID`, `invertObject`, `getType`, `isNewerVersion`, `logCompatibilityWarning` (all used in v14 code) [S32], [S33], [S34]. New: `equals`, `isPlainObject`, `buildRelativeUuid`, `closestPointToPath`; `diffObject` `bidirectional`; `debounce().cancel()` [S4], [S5], [S6], [S10]. 14.369: `setProperty` sets `undefined` values for missing keys; `expandObject` keeps `undefined` [S17].
- Globals still used unqualified in v14 code: `CONFIG`, `CONST`, `Hooks`, `game`, `ui`, `canvas`, `foundry`, `Roll`, `fromUuid`, `fromUuidSync`, `getDocumentClass`, `_loc`, `_del`, `_replace` (Draw Steel ESLint globals) [S36].

### 10.5 Sockets and queries

- Manifest `"socket": true`, then `game.socket.on("system.<id>", handler)` (Crucible) [S38], [S18].
- Prefer queries for request/response: register `CONFIG.queries.<name> = handler`; call `user.query(name, data, {timeout})` or `User.queryMany(users, name, data)`. Data must be JSON-serializable [S47], [S38]. Handlers receive the sender [S5].
- `game.user.isActiveGM` selects one GM for authoritative writes (Draw Steel, Combat turn events) [S47], [S32].

---

## 11. Deprecated globals and replacements

| Old | v14 replacement | Status in v14 | Source |
|---|---|---|---|
| `renderTemplate`, `loadTemplates`, `getTemplate` | `foundry.applications.handlebars.renderTemplate` / `loadTemplates` / `getTemplate` | Namespaced functions documented [S89]. Globals resolve with a warning, `{since: 13, until: 15}` [src: client/client.mjs:223-225, :640] |
| `Actors`, `Items`, `Journal` | `foundry.documents.collections.Actors` / `Items` / `Journal` | Namespaced classes documented [S90]. Globals resolve with a warning, `{since: 13, until: 15}` [src: client/client.mjs:585-591, :640] |
| `ActorSheet`, `ItemSheet` | `foundry.applications.sheets.ActorSheetV2` / `ItemSheetV2` | The globals resolve, with a warning `{since: 13, until: 15}`, to the **AppV1** classes `foundry.appv1.sheets.ActorSheet` / `ItemSheet` [src: client/client.mjs:330-332, :640]. Do not confuse them with the V2 aliases `foundry.applications.sheets.ActorSheet` / `ItemSheet` (see 4.1) |
| `DocumentSheet`, `Application`, `FormApplication`, `Dialog` (globals) | `foundry.applications.api.*V2` | Plain globals for the AppV1 classes, `@deprecated since v13 until v16`, no access warning [src: client/client.mjs:167-174] |
| `TextEditor` | `foundry.applications.ux.TextEditor.implementation` | Namespaced class documented [S61]. Global resolves with a warning, `{since: 13, until: 15}` [src: client/client.mjs:327, :640]. `enrichHTML` returns a Promise; no `async` option [S61], [S50] |
| `DragDrop` | `foundry.applications.ux.DragDrop.implementation` | [S60]. Global resolves with a warning, `{since: 13, until: 15}` [src: client/client.mjs:320, :640] |
| `mergeObject`, `duplicate`, etc. | `foundry.utils.*` | **Removed as globals** in 14.370: nothing in `client/` or `common/` assigns them to `globalThis` [src: client/client.mjs:52-186, :213-640]. `foundry.utils.mergeObject`, `duplicate`, `deepClone` exist [src: common/utils/helpers.mjs:1131, :440, :253] |
| `CONST.CHAT_MESSAGE_TYPES` | `CONST.CHAT_MESSAGE_STYLES` + subtypes | Absent from v14 docs [S64] and from `common/constants.mjs` |
| `renderChatMessage` hook | `renderChatMessageHTML` | Deprecated v13 [S67]; absent from v14 hook index [S68]; still called with a warning `{since: 13, until: 15}` [src: client/documents/chat-message.mjs:451-457] |
| Roll `rollMode` | `messageMode` | Back-compat until V16 [S8] |
| `CONST.ACTIVE_EFFECT_MODES` (numeric `mode`) | string `type` in `CONST.ACTIVE_EFFECT_CHANGE_TYPES` | Legacy [S5], [S12a] |
| `ActiveEffect#changes` | `ActiveEffect#system.changes` | Moved [S6] |
| `ApplicationV2#bringToTop` | `bringToFront` | Removed [S21] |
| `{{select}}` / `{{colorPicker}}` Handlebars helpers | `{{selectOptions}}`, `{{formGroup}}`, `{{formInput}}` | Removed [S21]; v14 handlebars helpers listed in [S89] |
| `foundry.utils.objectsEqual` | `foundry.utils.equals` | Redesigned [S4] |
| `ChatLog.MESSAGE_PATTERNS` | `ChatLog.CHAT_COMMANDS` | Until V16 [S8] |

The v13-era global aliases are registered by `addBackwardsCompatibilityReferences(..., {since: 13, until: 15})`: each is a `globalThis` getter that logs "You are accessing the global "X" which is now namespaced under foundry.Y" once and returns the namespaced value [src: client/client.mjs:213-214, :640, :655-672]. The V12-era utility globals (`mergeObject`, `duplicate`, ...) are gone. Globals still assigned without a warning: `CONFIG`, `CONST`, `game`, `ui`, `foundry`, the Document classes (`Actor`, `Item`, `ChatMessage`, ...), `Roll`, `Hooks`, `fromUuid`, `fromUuidSync`, `getDocumentClass`, `Color`, `Collection`, `_del`, `_replace`, `_loc` [src: client/client.mjs:52-186], [src: client/game.mjs:74]. Write namespaced paths everywhere.

---

## 12. Testing

- **Quench**: upstream latest 0.10.0 (2025-04-30), package page lists minimum 13.341, **verified 13**, no maximum [S92], [S93]. Its only v14-relevant call is the global `FilePicker`, a deprecated alias in 14.370 until v15 [src: client/client.mjs:230]. The fork `DimitroffVodka/FVTT-Quench` (GPL-3.0, one commit `a70c9c9`, 2026-06-22) replaces it with `foundry.applications.apps.FilePicker` and sets `verified: "14"`; it has no release and its manifest URLs still point at upstream [S106]. Running a batch on 14.370 is the remaining check. API: `Hooks.on("quenchReady", quench => quench.registerBatch(key, ctx => {...}, {displayName}))`; context gives Mocha `describe/it/before/after...`, Chai `assert/expect/should`, fast-check `fc` [S94].
- **Vitest with stubs**: pf2e (v14 era) runs `vitest run` with `environment: "node"`, `setupFiles: ["./tests/setup.ts"]`, and a setup that assigns stub globals (`game` with `settings.get` and `i18n.localize`, `CONFIG`, mock `Actor`/`Item`/`Token`, `Roll`, `Hooks`, `_loc`) [S95], [S96], [S97]. pf2e also loads Foundry's utils into Node via its build lib [S97].
- A Utils layer of pure functions (no Foundry globals) needs no Vitest stubs.
- Official Foundry testing guidance: none found. **UNVERIFIED** that any exists; guidance would live in the knowledge base, not in the installed source.

---

## 13. Repo layout and tooling in current v14 systems

| System | Language | Bundler | CSS | Lint | Types |
|---|---|---|---|---|---|
| Crucible (official) | JS `.mjs` | Rollup for the release bundle (`esmodules.0` swapped to `crucible-compiled.mjs` in CI) | LESS (`lessc`) | ESLint 10 + `eslint-plugin-jsdoc` + `globals` | JSDoc | [S82], [S85] |
| Draw Steel | JS `.mjs` | Rollup (`build:code`) | PostCSS via Rollup | ESLint 9 flat config, `@stylistic`, `@html-eslint` for `.hbs` | JSDoc + `jsconfig.json` paths to a symlinked Foundry `client`/`common` | [S98], [S36], [S99], [S100] |
| dnd5e | JS `.mjs` | (not checked) | ships `dnd5e.css` | (not checked) | JSDoc | [S30] |
| pf2e | TypeScript + Svelte | Vite | Sass | ESLint + oxlint + Prettier | TS | [S95] |

- Unbundled ES modules work: Crucible's source `crucible.mjs` imports `./module/...` without a bundler, which it uses for release builds alone [S38], [S85]. **Inference**: a no-bundler setup with `esmodules: ["<entry>.mjs"]` is valid.
- SCSS: no v14 system checked uses SCSS without a bundler; compiling with the `sass` CLI to the CSS path listed in `styles` matches what the manifest needs [S27]. pf2e uses `sass` [S95].
- `fvtt-types`: npm dist-tags `beta: 14.370.0-beta.20261107215328`, `prerelease: 14.366.0-beta...`, `latest: 13.346.0-beta...` [S101]. The repo README still describes v13 as in progress [S102]. Alternative: Draw Steel's symlink of the installed Foundry `client/` and `common/` into `foundry/` with `jsconfig.json` `paths` `@client/*`, `@common/*` [S99], [S100].
- ESLint globals for Foundry: see 10.4 [S36].
- User data path (for linking the repo into `Data/systems/`): the server takes the first of `--dataPath=<path>`, the `FOUNDRY_VTT_DATA_PATH` environment variable, `dataPath` in `%LOCALAPPDATA%\FoundryVTT\Config\options.json`, then the default `%LOCALAPPDATA%\FoundryVTT` on Windows (`~/AppData/Local/FoundryVTT` if `LOCALAPPDATA` is unset). Packages live under `<user data>\Data` [src: dist/paths.mjs, `userDataPaths`, `getEnvDataPath`, `configurePaths`]. On this machine `options.json` sets `"dataPath": "C:/Users/teafo/AppData/Local/FoundryVTT"` and `Data\systems` exists, so the junction target is `%LOCALAPPDATA%\FoundryVTT\Data\systems\l5r4-enhanced`.
- Boilerplate: `asacolips-projects/boilerplate` is pinned to v11 (search result); `foundryvtt/worldbuilding` is `verified: "11"` [S103]. Neither is a v14 reference.
- Layout precedent: `module/{applications,data,documents,dice,canvas,...}`, `templates/`, `lang/`, `packs/` + `_source/` or `src/packs/`, `styles/` [S82], [S98]. The project's own CLAUDE.md layer rules (Documents / Data models / Sheets / Services / Utils / Config) fit this.

---

## 14. Publishing

- Installs: Foundry fetches the manifest, reads `download`, downloads and unzips. Each version's manifest should point at a zip of that version [S104].
- Updates: listed packages check the website listing; others compare `version` with `isNewerVersion` from the `manifest` URL [S104]. v14 update checks use the website package repository [S15].
- Submission: after approval you get a Package Management site; a package with no versions is not listed [S104].
- **Package Release API**: `POST https://foundryvtt.com/_api/packages/release_version/`, headers `Content-Type: application/json`, `Authorization: fvttp_...`; body `{id, "dry-run"?, release: {version, manifest, notes?, compatibility: {minimum, verified, maximum}}}`; 429 with `Retry-After` when releasing too often within 60 s [S105].
- GitHub release workflow (both Crucible and Draw Steel): on `release: published`, `npm ci`, build packs and code, rewrite `system.json` (`version`, `manifest`, `download`, and Draw Steel sets `flags.hotReload: false`) with `microsoft/variable-substitution@v1`, zip, upload `system.json` + `system.zip` with `ncipollo/release-action@v1` [S84], [S85].
- Manifest URL pattern: `https://github.com/<owner>/<repo>/releases/latest/download/system.json`; download pattern `https://github.com/<owner>/<repo>/releases/download/<tag>/system.zip` [S85], [S35].
- 14.369: cleaned manifest data is used for signature generation [S17].
- Project constraint: the repo is public, so `game-rules/` and `content/` (the licensed rulebook) are gitignored and never published (project CLAUDE.md).

---

## UNVERIFIED summary

Items the installed 14.370 source cannot settle:

1. Quench running a batch on 14.370 (section 12): the fork that fixes the deprecated call is built and installed (Stage 1 §Quench); nothing has been run in a world yet.
2. Any official Foundry testing guidance. Would be in the knowledge base, not the source (section 12).

## Verified against installed 14.370

- Active Effect phases `"initial"` / `"final"`, their call sites, and the full Actor preparation order (3.2).
- jQuery 3.7.1 is bundled and loaded as a core script (1.6).
- AppV1 deprecation `{since: 13, until: 16}`; v13 global aliases resolve with warnings `{since: 13, until: 15}`; `mergeObject` / `duplicate` globals removed (1.6, 11).
- No core Actor or Item sheet is registered (1.6, 4.6).
- `api.DocumentSheet` and `sheets.ActorSheet` / `ItemSheet` are aliases of the V2 classes (4.1).
- Complete `HandlebarsTemplatePart` options (4.3); action handler `this` binding (4.2).
- Manifest: `media` optional, `type` defaults to `"system"`, no flag suppresses unknown-key warnings, pack `path` defaults to `packs/<name>` (2.1, 2.3).
- `trackableAttributes` inference from schema (8); `game.user.targets` (8).
- `game.i18n.format` alias; DataModel as a setting `type` (10.2, 10.3).
- `StatusEffectConfig` fields and `CONFIG.statusEffects` assignment (6.4).
- ChatMessage permissions for authors (5.2); embedded CRUD signatures (3.4).
- `add` / `subtract` on `SetField`; Item effects are not applied to their Item by core (6.2).
- Roll result replacement: `fromTerms` recomputes the total, `fromData` does not (5.1).
- `_addDataFieldMigration` is `@internal` (3.3).
- Default Windows user data path (13).

---

## Sources (every URL fetched)

Release notes:
- [S1] https://foundryvtt.com/releases/
- [S2] https://foundryvtt.com/releases/14.370
- [S3] https://foundryvtt.com/releases/14.359
- [S4] https://foundryvtt.com/releases/14.349
- [S5] https://foundryvtt.com/releases/14.352
- [S6] https://foundryvtt.com/releases/14.353
- [S7] https://foundryvtt.com/releases/14.354
- [S8] https://foundryvtt.com/releases/14.355
- [S9] https://foundryvtt.com/releases/14.356
- [S10] https://foundryvtt.com/releases/14.357
- [S16] https://foundryvtt.com/releases/14.358
- [S12a] https://foundryvtt.com/releases/14.360
- [S11] https://foundryvtt.com/releases/14.361
- [S13] https://foundryvtt.com/releases/14.362
- https://foundryvtt.com/releases/14.363
- [S14] https://foundryvtt.com/releases/14.364
- [S12] https://foundryvtt.com/releases/14.365
- [S15] https://foundryvtt.com/releases/14.366
- [S88] https://foundryvtt.com/releases/14.367
- [S16b] https://foundryvtt.com/releases/14.368
- [S17] https://foundryvtt.com/releases/14.369
- [S67] https://foundryvtt.com/releases/13.340
- https://foundryvtt.com/releases/13.338
- https://foundryvtt.com/releases/13.333

Knowledge base:
- [S18] https://foundryvtt.com/article/system-development/
- [S19] https://foundryvtt.com/article/system-data-models/
- https://foundryvtt.com/article/manifest/ (404)
- https://foundryvtt.com/article/active-effects/ (no v14 detail)
- [S48] https://foundryvtt.com/article/versioning/
- [S104] https://foundryvtt.com/article/package-management/
- [S105] https://foundryvtt.com/article/package-release-api/
- https://foundryvtt.com/article/package-submission/ (404)

API docs v14:
- [S20] https://foundryvtt.com/api/v14/
- [S22] https://foundryvtt.com/api/v14/classes/foundry.appv1.sheets.ActorSheet.html
- [S25a] https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
- https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html
- [S25] https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
- [S24] https://foundryvtt.com/api/v14/classes/foundry.applications.apps.DocumentSheetConfig.html
- https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheet.html (404)
- [S25b] https://foundryvtt.com/api/v14/modules/foundry.applications.sheets.html
- [S23] https://foundryvtt.com/api/v14/modules/foundry.applications.api.html
- [S31] https://foundryvtt.com/api/v14/classes/foundry.packages.BaseSystem.html
- https://foundryvtt.com/api/v14/modules/foundry.packages.types.html
- [S27] https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageManifestData.html
- [S28] https://foundryvtt.com/api/v14/interfaces/foundry.packages.types._SystemManifestData.html
- [S29] https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompatibilityData.html
- [S69] https://foundryvtt.com/api/v14/classes/foundry.documents.ActiveEffect.html (read in two parts)
- [S73] same page, offset 100000
- [S70] https://foundryvtt.com/api/v14/classes/foundry.data.ActiveEffectTypeDataModel.html
- https://foundryvtt.com/api/v14/modules/CONFIG.html
- [S72] https://foundryvtt.com/api/v14/variables/CONFIG.ActiveEffect.html
- [S77] https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html
- [S65] https://foundryvtt.com/api/v14/variables/CONFIG.ChatMessage.html
- [S78] https://foundryvtt.com/api/v14/variables/CONFIG.Actor.html
- [S63] https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html
- [S26] https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html
- [S75] https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
- [S76] https://foundryvtt.com/api/v14/classes/foundry.documents.Combatant.html
- [S39] https://foundryvtt.com/api/v14/classes/foundry.documents.CombatantGroup.html
- [S43] https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html
- [S44] https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.EffectChangeData.html
- [S71] https://foundryvtt.com/api/variables/CONST.ACTIVE_EFFECT_CHANGE_TYPES.html
- [S53] https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.CombatTracker.html
- [S40] https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
- [S41] https://foundryvtt.com/api/v14/modules/foundry.data.fields.html
- [S57] https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html
- [S54] https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationConfiguration.html
- https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.HandlebarsTemplatePart.html (404)
- [S55] https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationFormConfiguration.html
- [S59] https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationTabsConfiguration.html
- [S56] https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html
- [S64] https://foundryvtt.com/api/v14/variables/CONST.CHAT_MESSAGE_STYLES.html
- https://foundryvtt.com/api/v14/interfaces/_StatusEffectConfig.html (404)
- [S51] https://foundryvtt.com/api/v14/modules/foundry.applications.ux.html
- [S90] https://foundryvtt.com/api/v14/modules/foundry.documents.collections.html
- [S62] https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html
- [S60] https://foundryvtt.com/api/v14/classes/foundry.applications.ux.DragDrop.html
- [S61] https://foundryvtt.com/api/v14/classes/foundry.applications.ux.TextEditor.html
- [S42] https://foundryvtt.com/api/v14/classes/foundry.helpers.Localization.html
- [S86] https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html
- [S47] https://foundryvtt.com/api/v14/classes/foundry.documents.User.html
- [S66] https://foundryvtt.com/api/v14/functions/hookEvents.renderChatMessageHTML.html
- [S68] https://foundryvtt.com/api/v14/modules/hookEvents.html
- [S89] https://foundryvtt.com/api/v14/modules/foundry.applications.handlebars.html

GitHub (official / systems / tools):
- [S21] https://github.com/foundryvtt/foundryvtt/issues/13436
- [S30] https://raw.githubusercontent.com/foundryvtt/dnd5e/master/system.json and https://github.com/foundryvtt/dnd5e/blob/master/dnd5e.mjs (via `gh api`)
- [S45] https://github.com/foundryvtt/dnd5e/blob/master/module/documents/actor/actor.mjs (via `gh api` / `gh search code`)
- https://raw.githubusercontent.com/MetaMorphic-Digital/draw-steel/main/system.json (main branch, still v13)
- https://raw.githubusercontent.com/MetaMorphic-Digital/draw-steel/main/package.json
- [S35] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/system.json
- [S33] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/draw-steel.mjs
- [S32] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/documents/actor.mjs
- [S32b] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/documents/combat.mjs
- [S34b] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/documents/combatant.mjs
- [S34] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/documents/active-effect.mjs and .../src/module/data/effect/base-effect.mjs
- [S34c] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/applications/hooks/chatMessageHTML.mjs and .../src/module/data/message/base.mjs
- [S33b] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/rolls/base.mjs
- [S37] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/applications/api/document-sheet.mjs and .../applications/sheets/actor-sheet.mjs
- [S58] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/module/applications/sidebar/tabs/combat-tracker.mjs
- [S74] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/src/docs/Active-Effects.md
- [S83] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/tools/pullJSONtoLDB.mjs
- [S98] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/package.json
- [S99] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/tools/create-symlinks.mjs
- [S100] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/jsconfig.json
- [S36] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/eslint.config.mjs
- [S84] https://github.com/MetaMorphic-Digital/draw-steel/blob/1.2.x/.github/workflows/release.yml
- Draw Steel branch list and tree: `gh api repos/MetaMorphic-Digital/draw-steel/branches`, `.../git/trees/1.2.x?recursive=1`
- [S38] https://github.com/foundryvtt/crucible/blob/HEAD/system.json and .../crucible.mjs
- [S46] https://github.com/foundryvtt/crucible/blob/HEAD/module/documents/actor.mjs (+ `gh search code "phase"` results incl. module/documents/active-effect.mjs, module/const/effects.mjs)
- [S52] https://github.com/foundryvtt/crucible/blob/HEAD/module/applications/sheets/base-actor-sheet.mjs
- [S81] https://github.com/foundryvtt/crucible/blob/HEAD/build.mjs
- [S82] https://github.com/foundryvtt/crucible/blob/HEAD/package.json
- [S85] https://github.com/foundryvtt/crucible/blob/HEAD/.github/workflows/release.yml
- Crucible tree: `gh api repos/foundryvtt/crucible/git/trees/HEAD?recursive=1`
- [S103] https://github.com/foundryvtt/worldbuilding/blob/master/system.json
- [S95] https://github.com/foundryvtt/pf2e/blob/master/package.json (+ branch list)
- [S96] https://github.com/foundryvtt/pf2e/blob/master/vitest.config.ts
- [S97] https://github.com/foundryvtt/pf2e/blob/master/tests/setup.ts
- [S80] https://github.com/foundryvtt/foundryvtt-cli
- [S79] `npm view @foundryvtt/foundryvtt-cli version time.modified engines`
- [S94] https://github.com/Ethaks/FVTT-Quench
- [S92] `gh api repos/Ethaks/FVTT-Quench/releases/latest`
- [S106] `gh api repos/Ethaks/FVTT-Quench/compare/master...DimitroffVodka:master` and `gh api repos/DimitroffVodka/FVTT-Quench/commits/a70c9c9`
- [S93] https://foundryvtt.com/packages/quench
- [S102] https://github.com/League-of-Foundry-Developers/foundry-vtt-types
- [S101] `npm view @league-of-foundry-developers/foundry-vtt-types dist-tags`
- [S50] https://github.com/RevCivic/brp/pull/1

Third-party / search only (not authoritative):
- [S91] https://gitlab.com/fvtt-modiphius/foundryvtt-conan2d20/-/issues/466 (title only)
- https://redlib.groet-infra.nl/r/SWN/duplicates/1v8okvr (502, not read)
- [S49 search] WebSearch "foundryvtt api v14 ActiveEffect change phase ..." result snippets
- https://github.com/Ethaks/FVTT-Quench/releases/download/v0.10.0/module.json (redirect, not followed)
