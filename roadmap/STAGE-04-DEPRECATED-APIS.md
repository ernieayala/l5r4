# Stage 4: Deprecated APIs

**Goal:** the system calls no API that 14.370 marks deprecated outside Active Effects and Combat, and the
deprecated-globals list in `eslint.config.mjs` is empty.
**Needs:** 1.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md, or installed source) |
|------|---------------------------------------------------------------|
| Dialogs | `foundry.applications.api.DialogV2` (`confirm`, `prompt`, `wait`) §4.1 |
| Message visibility | `messageMode`, `core.messageMode` setting; `core.rollMode` deprecated `{since: 14, until: 16}` (`client/game.mjs:1225-1244`) |
| Localization | `game.i18n.localize(key, data)` §10.3 |
| ContextMenu entries | `label`, `onClick`, `visible`; `name`, `callback`, `condition` deprecated `{since: 14, until: 16}` (`client/applications/ux/context-menu.mjs:382`, `:410`, `:629`) |
| Templates and file picker | `foundry.applications.handlebars.renderTemplate`; `foundry.applications.apps.FilePicker.implementation` §11 |

## Audit

| Grep | Sites |
|------|-------|
| `rg -n "\bDialog\.confirm" module` | `module/sheets/handlers/item-crud-handler.js:190`, `module/sheets/handlers/pc-actions-handler.js:157` (and `module/services/initiative.js:73`, which moves in Stage 5) |
| `rg -n "rollMode" module` | `module/documents/item/integration/chat-cards.js:64` |
| `rg -n "i18n\.format" module` | 25 sites: `module/utils/localization.js:91`, `rest.js`, `fear.js`, `xp/xp-calculator.js`, `wound-prone-automation.js`, `dice/rolls/ring-roll.js`, `spell-cast-roll.js`, `maho-cast-roll.js`, `dice/dialogs/spell-dialog.js`, `maho-dialog.js`, `dice/resources/spell-slot-manager.js`, `sheets/handlers/item-crud-handler.js:192`, `setup/migrations/icons/icon-paths.js:213`, `:334` |
| ContextMenu entries | `module/sheets/ui/context-menu-builder.js:73-94` |
| Global `FilePicker` | `module/setup/migrations/icons/icon-paths.js:42` |
| Global `renderTemplate` | `tests/quench/workflows/chat-system-workflow.js:194`, `:664`, `:688`, `:710` |

## Deliverables

- Each site above uses the v14 API. `game.i18n.format` keeps working in 14.370 (a non-enumerable alias with no warning), but the project uses `localize` (CLAUDE.md).
- `eslint.config.mjs`: `DEPRECATED_GLOBALS` removed; `npm run lint` passes without it.

## Acceptance

- Gate passes with the deprecated globals undeclared.
- Quench: the item CRUD, PC actions, chat-card, and context-menu paths run with no compatibility warning; `deprecations` lists none from these areas.
- Manual: delete an item from a sheet (confirm dialog), right-click an item row (menu) in Chrome and in Firefox (closed #3 was Firefox-only), post an item card in each message mode.

## Out of scope

| Item | Stage |
|------|-------|
| `Dialog.confirm` in the Initiative patch | 5 |
| Active Effect shape | 3 |
