# Foundry patterns

The shapes the system uses where it meets Foundry v14: windows, actions, data models, rule models, GM queries, chat cards, settings, migrations, and registration. API facts come from `roadmap/FOUNDRY-V14-REFERENCE.md` and the installed 14.370 source; check a new API with `/foundry-api` before using it. Each rule names its check; "review" means no tool can check it.

The member-order checks are the local ESLint rule `l5r4/member-order` in `tools/eslint/`, and the preparation check is `l5r4/no-bare-prepare` (**Preparation order**); `l5r4/joined-title` holds a window title to one key (**Window shape**). Names (verbs, `_name` versus `#name`, `data-action` casing) are in `naming.md`.

## ApplicationV2 windows and sheets

### Member order

| # | Member |
| --- | --- |
| 1 | `static DEFAULT_OPTIONS` |
| 2 | `static PARTS` |
| 3 | `static TABS` |
| 4 | Other static fields |
| 5 | Instance fields (`#currentTab`) |
| 6 | `constructor` |
| 7 | Getters (`title`, `actor`) |
| 8 | `_prepareContext`, then `_preparePartContext` |
| 9 | Other Foundry overrides in lifecycle order: `_onFirstRender`, `_onRender`, `_onClose`, drag and drop (`_onDragStart`, `_onDrop*`), `_processFormData` |
| 10 | Public methods, static then instance (`toggle`, `refresh`) |
| 11 | Action and form handlers (`static #onX`) |
| 12 | Private helpers (`#x`) |

Check: `l5r4/member-order`. Picked by majority where the code split: `DEFAULT_OPTIONS` first, constructor and getters before `_prepareContext`.

Conforming, modeled on `EffectPanelApplication` (`module/apps/effect-panel.js`), which keeps this order; the block shows a few of its members under shorter names, and gives the class its `naming.md` name:

```js
export default class EffectPanelApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {/* ... */};
  static PARTS = {/* ... */};

  get actor() {
    /* ... */
  }

  /** @override */
  async _prepareContext(options) {
    /* ... */
  }

  static toggle() {
    /* ... */
  }

  static async #onDeleteEffect(_event, element) {
    /* ... */
  }

  #row(actor, effect) {
    /* ... */
  }
}
```

Not conforming (modeled): `PARTS` comes before `DEFAULT_OPTIONS`, and `DEFAULT_OPTIONS` comes after the action methods.

### Window shape

| Rule | Check |
| --- | --- |
| `classes` starts `["l5r4", "l5r4-<file-name>"]` | review |
| `window.title` is an i18n key ending `.title`; core localizes it | review |
| A window for one document overrides `title` with one `.titleFor` key and its placeholders, never `.title` joined to a name | `l5r4/joined-title` |
| `window.icon` is a `fa-solid fa-*` class | review |
| One part per template; the template path is `` `systems/${SYS_ID}/templates/apps/<file-name>.hbs` `` for an app | review |
| An app opened for one actor takes the actor as the constructor's first argument and throws without it | review |
| An app opened for one actor sets `id` to `` `<file-name>-${actor.id}` ``, so one window opens per actor | review |
| The base is written inline: `foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)` | review |
| `render(true)` opens a window; `render()` redraws one already open. A boolean is the `force` option (§4.3) | review |
| No manual `render()` after `document.update()`; the sheet re-renders itself (CLAUDE.md **Foundry Integration**) | review |
| `_onRender` is idempotent: it may run again on the same element (14.365 detach and reattach, §4.3) | review |

Picked by majority: the literal template path over `TEMPLATE()`, the unprefixed actor-window id, the inline mixin, `render(true)` over `render({ force: true })`.

Conforming, `EffectPanelApplication.DEFAULT_OPTIONS` (`module/apps/effect-panel.js`).

Not conforming, `EffectPanelApplication.openOrClose` (`module/apps/effect-panel.js`): it opens the panel with `render({ force: true })`, not `render(true)`.

A template part renders one root element, or core throws [src: client/applications/api/handlebars-application.mjs:172].

### Actions

| Rule | Check |
| --- | --- |
| A click reaches its handler through `DEFAULT_OPTIONS.actions`, keyed by the `data-action` value in kebab-case; the PC and NPC sheets are the one exception (**Actor-sheet exception**) | `tests/conventions/actions.test.js` |
| A handler is `static #on<Action>(event, element)` with `@this {<Class>}`; core calls it with the app as `this` (§4.2) | `l5r4/member-order` |
| Left and right click: `{ handler: Class.#onX, buttons: [0, 2] }`. Core dispatches `click` and `auxclick` [src: client/applications/api/application.mjs:1891-1892, :1979-1984] | review |
| `change` and other events on a `[data-action]` element: one delegated listener set in `_onRender` | review |
| An action set shared by two classes is one exported frozen object spread into each `actions` (`RULES_EDITOR_ACTIONS`) | review |
| Every `data-action` in a template has a handler | `tests/conventions/actions.test.js` |
| Chat card actions are fixed names, wired in services (see **Chat cards**) | `tests/conventions/actions.test.js` (exempt list) |

A handler is the system's own method, not a Foundry override, so it takes `#`, never `_` (Stage 17 decision 15). Picked by majority: `(event, element)` as parameter names over `target`, `DEFAULT_OPTIONS.actions` over own delegation.

Conforming, modeled on the `actions` of `EffectPanelApplication.DEFAULT_OPTIONS` and on `EffectPanelApplication.#onDeleteEffect` (`module/apps/effect-panel.js`):

```js
static DEFAULT_OPTIONS = {
  actions: {
    "open-source": EffectPanelApplication.#onOpenSource,
    "delete-effect": EffectPanelApplication.#onDeleteEffect
  }
};

/**
 * Delete an effect the user owns.
 * @this {EffectPanelApplication}
 * @param {PointerEvent} _event - The click
 * @param {HTMLElement} element - The button, inside the effect's row
 */
static async #onDeleteEffect(_event, element) {
```

Not conforming (modeled): handlers bound as `XpManagerApplication.prototype._onAddXp`, a `_name` on a method that is not a Foundry override.

#### Actor-sheet exception

The PC and NPC sheets keep their own `data-action` routing (Stage 17 decision 16): `BaseActorSheet._onRender` returns before binding anything when the user does not own the actor, then routes `click`, `contextmenu`, and `change` on `[data-action]` to `_onAction`, `_onActionContext`, and `_onActionChange` (`BaseActorSheet#_onRender` and `BaseActorSheet.#bindActionEvents` (`module/sheets/base-actor-sheet.js`)). `_onAction` looks the action up in the sheet class's `CLICK_ACTIONS` table: the actions both sheets share in `BaseActorSheet.CLICK_ACTIONS` (`module/sheets/base-actor-sheet.js`), spread into each sheet's own table with its own actions. The right-click and change routes stay `switch` statements. A viewer who does not own the actor gets no handler at all, and the right-click steps (Trait ranks, Void Points, spell slots) go through the same routing as the left-click ones. No other class adds routing of its own. `tests/conventions/actions.test.js` takes these two sheets' `CLICK_ACTIONS` keys and `case` labels as their handlers. Their action names follow the same kebab-case, verb-first rule as every other.

### Forms

| Rule | Check |
| --- | --- |
| A document sheet sets `form: { submitOnChange: true }`; each stored value is an input named by its path | review |
| A window with a form sets `form.handler: Class.#onSubmitForm` | review |
| Form values are user input: coerce and validate them in the handler (CLAUDE.md **Defensive coding**) | review |

Picked by majority: `onSubmitForm`.

## Documents

| Rule | Check |
| --- | --- |
| A document class is `L5R4<Document>` and extends the namespaced class: `foundry.documents.Actor` | review |
| Set as `CONFIG.<Document>.documentClass` during `init` in `dist/l5r4-enhanced.js` | review |
| Lifecycle overrides keep core's names and parameters: `_preCreate(data, options, user)` | review |
| Data preparation lives in `module/documents/<document>/` helpers; the class calls them | review |

Conforming, `L5R4Combatant` (`module/documents/combatant.js`): `L5R4Combatant extends foundry.documents.Combatant`.

Not conforming, `L5R4Actor` (`module/documents/actor.js`): `extends Actor`, the global. `L5R4Item#_preCreate` (`module/documents/item.js`) names its third parameter `userId`; core passes a `User`.

### Preparation order

Core prepares a document once per initialization. `reset()` (`common/abstract/data.mjs`, `DataModel#reset`) calls `_initialize`, which builds the system data from `_source`; `ClientDocumentMixin#_initialize` (`client/documents/abstract/client-document.mjs`) then calls `_safePrepareData`, and `prepareData` runs `system.prepareBaseData`, `prepareBaseData`, `prepareEmbeddedDocuments` (the items, then the "initial" Active Effect phase, `Actor#prepareEmbeddedDocuments`), `system.prepareDerivedData`, `prepareDerivedData`, and last the "final" phase (`Actor#prepareData`, `client/documents/actor.mjs`). Core re-prepares an actor the same way, with `this.reset()` (`Actor#_onCreateDescendantDocuments`).

A bare `prepareData()` resets nothing: `Actor#applyActiveEffects` applies each change onto the current value, and the rules add their outputs onto prepared values (`applyDerivedRules`, `module/documents/actor/rules.js`), so a second call adds them twice. Core does not make it idempotent, and the system does not either.

| Rule | Check |
| --- | --- |
| A PC's or NPC's derived data runs in `L5R4Actor.prepareDerivedData` (`module/documents/actor.js`), which calls the subtype's preparation in `module/documents/actor/preparation/`; the data models compute nothing | review |
| A document is re-prepared with `document.reset()`, never a bare `prepareData()` and never `prepareDerivedData()` alone; tests included. An override calls core's method of its own name through `super` | `l5r4/no-bare-prepare` (`module/`, `dist/`, `tests/`), Quench `l5r4-enhanced.documents.actor` |
| Preparation never writes into `_source`, the items, or module state, so a second `reset()` gives the same values | Quench `l5r4-enhanced.documents.actor` |

### Documents and services

Documents import no service (CLAUDE.md **Layers**). Two shapes carry what a document needs from one:

| Need | Shape | Example |
| --- | --- | --- |
| A one-way event the document reports | A system hook: the document calls `Hooks.callAll("l5r4-enhanced.<event>", ...)` with the name from `module/config/`, and `module/hooks/register-all.js` wires the service's handler | `L5R4ActiveEffect._preCreateOperation` fires `IMMUNE_STATUS_HOOK` (`module/config/constants.js`); `registerAllHooks` wires `onImmuneStatus` (`module/services/effects/apply.js`) |
| A value the document needs back | A static slot on the document class that `dist/l5r4-enhanced.js` fills during `init` | `L5R4Combat.askInitiativeBonuses = spendInitiativeVoidPoints` (`module/documents/combat.js`, `module/services/initiative.js`) |

A hook handler's return value is ignored, so anything the document waits for or reads back is a slot.

### Work after a change

Every connected client runs `_onCreate`, `_onUpdate`, `_onDelete`, and the `create*`, `update*`, and `delete*` hooks for each change, and one user can be signed in on several clients, so the user id does not pick one client. Core runs `_preCreate`, `_preUpdate`, `_preDelete`, and the `preCreate*`, `preUpdate*`, and `preDelete*` hooks only on the client that sends the change (`ClientDatabaseBackend`, `client/data/client-backend.mjs`), and every client receives the options they leave. `module/services/change-origin.js` stamps each Actor, Item, Active Effect, and chat message change with the sender's `game.socket.id`; `isOwnChange` (`module/utils/change-origin.js`) reads it back, given the change's options and `game.socket.id`.

| Rule | Check |
| --- | --- |
| Work a change starts that writes to the world, opens a dialog, or plays an animation runs where `isOwnChange(options, game.socket.id)` holds; never on `userId === game.user.id` | Quench `l5r4-enhanced.workflows.change-origin` |
| Work only a GM may do runs on `game.users.activeGM?.isSelf`, or through a GM query (**GM queries**) | review |
| A change made with `noHook` carries no stamp, so no client runs work after it | review |

Conforming, `L5R4Item#_onCreate` (`module/documents/item.js`): grants and the XP history's stale mark run only where `isOwnChange` holds.

Not conforming (modeled): an `_onCreate` that writes a flag on every client that receives the creation; a second client's write then runs its own grants beside the sender's.

## Data models

One `foundry.abstract.TypeDataModel` per subtype in `module/data/<document>/`, registered in `DATA_MODELS` (`module/data/models.js`) and assigned to `CONFIG.<Document>.dataModels` during `init` by `registerDataModels` (`dist/l5r4-enhanced.js`). A core type such as the ActiveEffect `base` goes in `CORE_TYPE_DATA_MODELS` and never in `system.json` `documentTypes` [src: common/packages/sub-types.mjs:45-47].

### Member order

| #   | Member                                     |
| --- | ------------------------------------------ |
| 1   | Static fields (`VOID_RANK`)                |
| 2   | `static defineSchema()`                    |
| 3   | `static migrateData(source)`               |
| 4   | `prepareBaseData()`                        |
| 5   | `prepareDerivedData()`                     |
| 6   | Getters                                    |
| 7   | Other methods, then private helpers (`#x`) |

Check: `l5r4/member-order`.

| Rule | Check |
| --- | --- |
| `defineSchema` spreads `super.defineSchema()` and builds fields with the `module/data/fields.js` helpers (`numberField(0)`) | review |
| `migrateData` calls one `migrate<Shape>Source(source)` from `module/data/migrate-source.js`, then returns `super.migrateData(source)` | review |
| `migrateData` may see a partial update delta, so it changes only keys present in `source` (§3.3) | review |
| `prepareDerivedData` calls `super.prepareDerivedData()` first, then Utils functions; it never reads the DOM or rolls | review |
| Each override carries `/** @override */` | review |
| A member a subclass overrides is public and unprefixed; `#name` does not inherit | review |
| A schema field present by schema needs no `?? 0` or guard (CLAUDE.md **Defensive coding**) | review |
| Every subtype in `system.json` `documentTypes` has a model, and every model a subtype | `tests/manifest.test.js` |
| Subtype keys and `system` field names are fixed (Stage 17 decision 2): a rename ships a migration Ernie approves | review |

Picked by majority: the `fields.js` helpers over inline `new StringField(...)`.

Conforming, `module/data/actor/pc-data.js` (`PcData`); its derived data is the actor's (**Preparation order**):

```js
export default class PcData extends ActorData {
  static VOID_RANK = 2;

  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), xp: numberField(0) /* ... */ };
  }

  /** @override */
  static migrateData(source) {
    migratePcSource(source);
    return super.migrateData(source);
  }

  get insightRank() {
    /* ... */
  }
}
```

Not conforming (modeled): a getter that sits before `migrateData`. Not conforming, `module/data/actor/base-data.js` (`ActorData._initiativeFields`): the system's own method with a `_` prefix; a subclass overrides it (`module/data/actor/npc-data.js`, `NpcData._initiativeFields`), so it is public and unprefixed.

## Rule models

One `DataModel` per rule key in `module/data/rules/` (CLAUDE.md **Layers**). A rule model validates; it computes nothing.

| Rule | Check |
| --- | --- |
| The class is `<RuleKey>Rule` and extends the rule base in `module/data/rules/` | review |
| It has one member, `static defineSchema()`, which spreads `super.defineSchema()` | `l5r4/member-order` |
| Shared fields come from the base file's factories: `valueField`, `selectorField`, `typeField` | review |
| It is registered in the frozen `RULE_MODELS` by its key, and the key is in `RULE_KEYS` (`module/config/rule-keys.js`) | `tests/quench/rules.js` ("every rule key has a model") |
| What a rule produces is in `module/utils/rule-engine.js`; collecting and applying rules is in `module/documents/actor/rules.js` | review |
| Rules are user-authored JSON: built with `strict: true`, a rule that fails validation is skipped | `tests/quench/rules.js` |
| Rule keys and rule field names are fixed (Stage 17 decision 2) | review |
| The JSDoc says what the rule changes, and its citation line names the page the rule models | `l5r4/doc-format` |

Adding a rule key touches, in order: `RULE_KEYS`, the model class and its `RULE_MODELS` entry, the output in `rule-engine.js`, a Vitest case in `tests/unit/utils/rule-engine.test.js`, and the rules editor's field list.

Conforming, `TNModifierRule` (`module/data/rules/rule-models.js`).

Not conforming, `RollModifierRule` (`module/data/rules/rule-models.js`): `new BooleanField({ initial: false })` written inline where `fields.js` has `booleanField(false)`.

## GM queries

A player's client asks the active GM to change a document the player does not own.

| Rule | Check |
| --- | --- |
| The name is an exported constant, `` <NAME>_QUERY = `${SYS_ID}.<camelCase>` ``, in the service that owns the change | review |
| One `register<Feature>Queries()` per service assigns `CONFIG.queries[<NAME>_QUERY]`; `init` calls it | review |
| The handler treats its payload as untrusted: it resolves documents by UUID, checks ids against known lists, and throws on bad input | review |
| The caller changes the document itself when `document.isOwner`; otherwise it calls `game.users.activeGM.query(...)`, and warns with an i18n key when no GM is active | review |
| The caller is named `request*` (`naming.md`) | Local ESLint verb rule (`naming.md`) |
| Payloads are JSON-serializable: UUIDs and plain values, never documents (§10.5) | review |
| Query names are fixed (Stage 17 decision 2) | review |

Conforming, `module/services/effects/apply.js`: `APPLY_EFFECT_QUERY`, the owner-or-GM caller `applyEffectAnywhere`, and `registerEffectQueries` checking the actor and effect id before it applies anything.

Not conforming, `endConcentration` (`module/services/effects/prompts.js`) calls `activeGM?.query` inline inside a domain verb instead of a `request*` caller.

## Chat cards

| Step | Rule | Check |
| --- | --- | --- |
| 1 | A message subtype is declared in `system.json` `documentTypes.ChatMessage`, has a model in `DATA_MODELS.ChatMessage`, and a `TYPES.ChatMessage.<type>` label | `tests/manifest.test.js`, `tests/lang.test.js` |
| 2 | The card's template path is an entry in `CHAT_TEMPLATES` (`module/config/templates.js`) | review |
| 3 | A `post*` service renders it with `foundry.applications.handlebars.renderTemplate` and creates the message with `type`, `system`, `content`, and `speaker: ChatMessage.getSpeaker(...)` | review |
| 4 | Behavior reads `message.system` and flags, never values parsed from the card's HTML | review |
| 5 | `bind<Name>Card(message, html)` returns at once for another type, then finds each button with `[data-action='<name>']` | review |
| 6 | `module/hooks/register-all.js` wires each binder: `Hooks.on("renderChatMessageHTML", bind<Name>Card)` | ESLint `no-restricted-properties` (`Hooks.on` outside `module/hooks/` and `dist/`) |
| 7 | The card's `data-action` names and CSS classes are fixed once posted: the message stores its HTML (Stage 17 decision 2) | `tests/conventions/actions.test.js` (exempt list) |

Hooks register in one place (Stage 17 decision 16, CLAUDE.md **Layers**): a service exports the handler, and `module/hooks/register-all.js` wires it with `Hooks.on`. No service, sheet, or app calls `Hooks.on` itself. Picked by majority: `bind<Name>Card` over `bind<Name>Cards`.

Conforming, `postCheckRequest` and `bindCheckRequestCard` (`module/services/check-request.js`), wired by `registerChatCardHooks` (`module/hooks/register-all.js`).

Not conforming, `startNewSession` (`module/services/session.js`): `ChatMessage.create` with no `speaker`. Not conforming (modeled): a service that registers its own `Hooks.on`.

## Settings

| Rule | Check |
| --- | --- |
| One file per scope in `module/setup/settings/` (`world.js`, `client.js`, `migration.js`), each exporting `register<Scope>Settings()` | review |
| `module/setup/settings/register-all.js` `registerSettings()` calls them during `init` | review |
| Each setting is `game.settings.register(SYS_ID, "<key>", { ... })`; `name` and `hint` are i18n keys (`naming.md`) | review |
| A hidden setting (`config: false`) has no `name` or `hint` | review |
| A settings button opening a window is `game.settings.registerMenu(SYS_ID, "<key>", { type, restricted })` with an ApplicationV2 `type`; `restricted: true` limits it to GMs [src: client/helpers/client-settings.mjs:166-194] | review |
| Reading a setting a user can change is a trust boundary: validate the value (CLAUDE.md **Defensive coding**) | review |
| Setting keys are fixed, `LtException` included (Stage 17 decision 2) | review |
| Each register call has one comment saying what the setting changes and why it defaults as it does | review |

Conforming, the `honorRoll` call in `registerWorldSettings` (`module/setup/settings/world.js`).

Not conforming, the `customEmphases` call in `registerWorldSettings` (`module/setup/settings/world.js`): a four-line comment restating the setting.

## Migrations

Two kinds, each with one job.

| Kind | Where | Runs | Shape |
| --- | --- | --- | --- |
| Source shape | `module/data/migrate-source.js`, called from `migrateData` | Each time stored data is read; changes nothing on disk | `migrate<Shape>Source(source)`, changes `source` in place |
| World data | `module/setup/migrations/<actors\|items\|icons\|schema>/<name>.js` | Once per version, from `migrateWorld` in `module/setup/migrations.js`, in `ready` | `async migrate<What>(docs, label)` |

| Rule | Check |
| --- | --- |
| A schema change ships with its migration in the same change (CLAUDE.md **Change Control**) | review |
| A world step reads `document._source`, skips documents it does not match, and updates with `{ render: false }` | review |
| A world step runs for world documents and for each pack, listed in both `migrateWorldDocuments` and `migratePackDocuments` | review |
| Stored world data is a trust boundary: a step may guard and catch per document, and logs one count line | review |
| History words that describe the old stored shape are allowed in migration code (`documentation.md` **Comments**) | review |
| Old stored keys a migration reads are fixed names | review |
| Each step has a Vitest case for the shape it changes and runs in the `world-upgrade` Quench batch in the 3.2.1 fixture world | `tests/unit/data/migrate-source.test.js`, `tests/quench/world-upgrade.js` |

Conforming, `migrateNpcInitiative` (`module/setup/migrations/actors/npc-initiative.js`).

Not conforming (modeled): a parameter documented as "unused but kept for API compatibility".

## Registration in `init`

`dist/l5r4-enhanced.js` is the one place that wires the system into Foundry during `init`, in this order: dice terms, `CONFIG` values, GM queries, data models, `CONFIG.l5r4`, status effects, sheets, templates and helpers, enrichers, hooks (`registerAllHooks`).

| Rule | Check |
| --- | --- |
| Sheets register with `foundry.applications.apps.DocumentSheetConfig.registerSheet(..., { types, makeDefault: true })`; core 14.370 registers none, so nothing is unregistered (§4.6) | review |
| `CONFIG.statusEffects` entries are replaced in place, never by assigning the property (`registerSystemConfig` (`dist/l5r4-enhanced.js`)) | review |
| An async call in `init` is awaited, or its errors are caught where it runs | review |

Conforming, `registerSheets` (`dist/l5r4-enhanced.js`) (the PC and NPC sheets).

Not conforming, `registerTemplates` (`dist/l5r4-enhanced.js`): `registerTemplates()` is async and the `init` hook does not await it, so a failure becomes an unhandled rejection.
