# Modules

The shape of one JavaScript file in `module/` and `dist/l5r4-enhanced.js`: what it imports and in which order, what
it declares, what it exports, how large it grows, and where it lives. Names are in `docs/code-system/naming.md`; the
member order inside a Foundry class is in `docs/code-system/foundry-patterns.md`; the file header is in
`docs/code-system/documentation.md`.

## File layout

A file holds these parts, in this order:

| Order | Part            | Detail                                                                |
| ----- | --------------- | --------------------------------------------------------------------- |
| 1     | Header          | The `@module` JSDoc block (`documentation.md`)                        |
| 2     | Imports         | Static `import` statements, grouped by layer (**Imports**)            |
| 3     | Constants       | Module-level `const` values and module state (**Constants**)          |
| 4     | Exports         | The exported functions, classes, and constants, the file's public API |
| 5     | Private helpers | Unexported functions the exports call                                 |

| Rule                                                            | Enforced by                           |
| --------------------------------------------------------------- | ------------------------------------- |
| The parts appear in the order above                             | `l5r4/module-shape` (`tools/eslint/`) |
| An unexported helper sits below every export, never between two | `l5r4/module-shape` (`tools/eslint/`) |

| Conforming                                                                                                                     | Non-conforming                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module/services/effects/apply.js`: imports at 8-10, the `APPLY_EFFECT_QUERY` constant at 13, then only exports from 33 to 132 | `module/services/combat/damage.js`: exports at 39, 307, 322, 350 with the private `defensesOf`, `applyToActor`, `postResult`, `reduceWithVoid`, `undoResult`, `runDamageAction`, and `requestDamageAction` between them (101-289) |

## Imports

### Groups

Imports come in layer order, lowest layer first, then the file's own folder. A group is left out when the file imports
nothing from that layer.

| Group       | Paths                                                                    | Example                                                                                                                |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1 Config    | `module/config/`                                                         | `import { SYS_ID } from "../../config/constants.js";` (`module/services/combat/damage.js:11`)                          |
| 2 Utils     | `module/utils/`                                                          | `import { toInt } from "../../utils/type-coercion.js";` (`module/services/combat/damage.js:15`)                        |
| 3 Data      | `module/data/`                                                           | `import { createRule } from "../../data/rules/rule-models.js";` (`module/documents/actor/rules.js:20`)                 |
| 4 Documents | `module/documents/`                                                      | `import { enhanceItemSheetData } from "../documents/item/integration/sheet-data.js";` (`module/sheets/pc-sheet.js:55`) |
| 5 Services  | `module/services/`                                                       | `import { rollCheck } from "../dice/check/roll-check.js";` (`module/services/combat/damage.js:23`)                     |
| 6 Mixins    | `module/mixins/`                                                         | `import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";` (`module/apps/armor-config.js:33`)         |
| 7 Apps      | `module/apps/`                                                           | `import EffectPanel from "../apps/effect-panel.js";` (`module/hooks/register-all.js:40`)                               |
| 8 Sheets    | `module/sheets/`                                                         | `import L5R4ItemSheet from "../module/sheets/item-sheet.js";` (`dist/l5r4-enhanced.js:57`)                             |
| 9 Setup     | `module/setup/`                                                          | `import { runMigrations } from "../module/setup/migrations.js";` (`dist/l5r4-enhanced.js:62`)                          |
| 10 Hooks    | `module/hooks/`                                                          | `import { registerAllHooks } from "../module/hooks/register-all.js";` (`dist/l5r4-enhanced.js:70`)                     |
| 11 Local    | A path that starts with `./`: the file's folder and the folders below it | `import { collectCheck } from "./collect.js";` (`module/services/dice/check/roll-check.js:32`)                         |

A path that starts with `../` goes in the group of the layer it reaches, even inside the file's own layer:
`module/services/combat/damage.js:23` lists `../dice/check/roll-check.js` under Services.

Which layer may import which is CLAUDE.md **Layers**; this page sets only the order.

### Rules

| Rule                                                                                                                                                                                                                                       | Enforced by                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Groups appear in the order of the table above                                                                                                                                                                                              | `l5r4/import-order` (`tools/eslint/`)                                 |
| One block: no comment labels and no blank lines between groups. Area majority: 51 of 55 files in `module/data/` and `module/documents/` and 21 of 34 in `module/sheets/` and `module/apps/` write no labels                                | `l5r4/import-order` (`tools/eslint/`)                                 |
| Each import names the file itself with its `.js` extension; no folder barrels                                                                                                                                                              | `l5r4/import-order` (`tools/eslint/`)                                 |
| Imports are static. No `await import()` inside a function                                                                                                                                                                                  | ESLint core `no-restricted-syntax` (`ImportExpression`)               |
| One exception: the entry file loads `tests/quench/index.js` with `await import()` in `quenchReady`, since the release zip ships without `tests/`; the line carries an `eslint-disable-next-line no-restricted-syntax` comment that says so | review                                                                |
| A file imports only the layers CLAUDE.md **Layers** allows it                                                                                                                                                                              | ESLint `no-restricted-imports` per directory, `npm run deps:circular` |
| Utils read no Foundry global, except `module/utils/localization.js`, which is the `T` / `F` / `R` API over `game.i18n` that `docs/design-system/content/localization.md` names                                                             | ESLint `no-restricted-globals` per directory, with that file exempt   |
| No file imports itself in a cycle                                                                                                                                                                                                          | `npm run deps:circular`                                               |

| Rule           | Conforming                                                                                | Non-conforming                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Group order    | `module/services/combat/damage.js:11-24`: config, utils, then services                    | `module/services/dice/check/collect.js:15`: the config import `game-mechanics.js` after four utils imports                                                |
| Group order    | `module/utils/status-data.js:8-10`                                                        | `module/documents/actor/rules.js:20-33`: the data import first, then utils, then the config import last                                                   |
| One block      | `module/services/combat/damage.js:11-24`: no labels, no blank lines                       | `module/sheets/pc-sheet.js:42-57`: `// Config`, `// Utils`, `// Documents`, and `// Local` labels with blank lines, and services imports under `// Utils` |
| Static imports | `module/services/rest.js:9` imports `config/templates.js` statically                      | A module loaded with `await import()` inside a function (modeled)                                                                                         |
| Layers         | `module/services/dice/check/roll-check.js:13-34` imports config, utils, and services only | A service that imports a sheet or an app (modeled)                                                                                                        |

## Constants

| Rule                                                                                                                                                                                                   | Enforced by                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| A module-level value that never changes is `UPPER_SNAKE_CASE` and sits below the imports                                                                                                               | ESLint core `camelcase` and `l5r4/naming` (`naming.md`), `l5r4/module-shape` (position) |
| `Object.freeze(...)` wraps every constant object or array, called by that name. Majority in `module/utils/`, `module/config/`, and `module/setup/`: 13 direct calls against 8 through a `freeze` alias | `l5r4/module-shape` (`tools/eslint/`)                                                   |
| Module state that changes at run time (a `Map` of locks, a running flag) is `camelCase`, never `UPPER_SNAKE_CASE`. Services majority: 4 against 1                                                      | Local naming rule (`naming.md`)                                                         |
| A number the rules define lives in `module/config/` and is imported, never written as a literal. Majority: 69 rule constants in `module/config/` against 22 in `module/utils/` and `module/services/`  | review                                                                                  |
| `module/config/` holds values only: no functions (CLAUDE.md **Layers**)                                                                                                                                | `l5r4/module-shape` (`tools/eslint/`)                                                   |

| Rule            | Conforming                                                                                          | Non-conforming                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frozen constant | `module/services/combat/damage.js:30`: `const DISARM_DAMAGE = Object.freeze({ roll: 2, keep: 1 });` | `module/config/sort-keys.js:44`: an exported constant object left unfrozen                          |
| Module state    | `module/services/dice/resources/void-points.js:18`: `actorLocks`                                    | `module/services/combat/flow.js:52`: the `FLOWS` registry, filled at run time by `defineFlow`       |
| Rule numbers    | `module/services/combat/damage.js:13` imports `TN_PER_RAISE`                                        | `module/utils/check.js:149`: the literal `5` per Raise beside the `TN_PER_RAISE` constant           |
| Values only     | `module/config/rule-keys.js:77`: `MANEUVERS`                                                        | A function exported from `module/config/` (modeled); `getIconPath` lives in `module/utils/icons.js` |

## Exports

A file whose job is one class that Foundry registers (a document class, a data model, a sheet, an ApplicationV2
window, a dice term), or the base class such a class extends, default-exports that class. Every other file uses named
exports only: utilities, constants, handler classes of static methods, mixins. The code agrees almost everywhere: 30
default exports in `module/data/` and `module/documents/`, data models with their shared bases and document classes;
14 in `module/sheets/` and `module/apps/`, sheets and windows; 1 in `module/services/`, the `L5R4Die` term; 0 in
`module/utils/`, `module/config/`, `module/setup/`, and `module/hooks/`.

| Rule                                                                                                             | Enforced by                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Default export only for a registered class or its base; a file never mixes a default and named exports           | `l5r4/module-shape` (`tools/eslint/`) |
| A default import takes the class's own name                                                                      | `l5r4/module-shape` (`tools/eslint/`) |
| Functions export with `export function`, never as an arrow `const`. Utils majority: 145 against 5                | `l5r4/module-shape` (`tools/eslint/`) |
| Every export has a caller in `module/` or `dist/l5r4-enhanced.js`; an export that only tests import is dead code | review                                |
| A file that only re-exports another file does not exist                                                          | `tests/conventions/names.test.js`     |

| Rule                | Conforming                                                                                                                           | Non-conforming                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Default export      | `module/documents/actor.js:43` (`L5R4Actor`), `module/apps/xp-manager.js:44`, `module/services/dice/roll-keep-die.js:14` (`L5R4Die`) | A default export beside named exports (modeled); `module/sheets/base-actor-sheet.js:29`: the sheets' base class as a named export |
| Default import name | `dist/l5r4-enhanced.js:53`: `import L5R4Actor from "../module/documents/actor.js";`                                                  | A default import under a name other than the class's own (modeled)                                                                |
| `export function`   | `module/utils/check.js:51`: `export function buildPool`                                                                              | `module/utils/localization.js:51`, `77`, `137`: `T`, `F`, `R` as arrow constants                                                  |
| Used exports        | `module/services/effects/apply.js:108` (`effectsOf`)                                                                                 | `module/services/xp/calculator.js:27`: `buildMergedXpHistory` has no caller                                                       |
| No re-export files  | `module/setup/settings/register-all.js` registers the settings itself                                                                | A one-line file that re-exports another file (modeled)                                                                            |

## One responsibility per file

A file does one job its layer owns. A second job, not a line count, is the reason to split (decision 3).

| Rule                                                              | Enforced by |
| ----------------------------------------------------------------- | ----------- |
| One job per file, named by the file name                          | review      |
| The same logic lives in one file; a second copy imports the first | review      |

| Conforming                                                                                                     | Non-conforming                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module/services/effects/apply.js`: applies status effects and registers the GM query that does it for players | `module/hooks/chat-damage-buttons.js:36-168`: hook routing and applying Wounds, spending Void Points, and posting notifications, which is Services work |
| `module/services/dice/resources/void-points.js`: one `updateUnderLock`                                         | `module/services/dice/resources/spell-slots.js:164`: `updateUnderLock` copied from `void-points.js:207` with its own lock map                           |

## Size

Each layer has a soft limit in lines. A file over its limit passes only with a written reason in
`tests/conventions/exceptions.json` (decision 3). The limits sit near each layer's 90th percentile today, so they
name the outliers and nothing else.

| Layer                   | Limit | Largest today                            | Over the limit today                                                              |
| ----------------------- | ----- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `module/config/`        | 300   | `localization.js` 277                    | none                                                                              |
| `module/utils/`         | 300   | `mechanics.js` 420                       | `mechanics.js`, `rule-engine.js` 407, `rule-summary.js` 364                       |
| `module/data/`          | 200   | `rules/rule-models.js` 580               | `rules/rule-models.js`                                                            |
| `module/documents/`     | 300   | `actor/calculations/wound-system.js` 469 | `actor/calculations/wound-system.js`                                              |
| `module/services/`      | 350   | `dice/check/roll-check.js` 646           | `dice/check/roll-check.js`, `combat/damage.js` 352                                |
| `module/mixins/`        | 200   | `debounced-field-mixin.js` 191           | none                                                                              |
| `module/apps/`          | 400   | `xp-manager.js` 491                      | `xp-manager.js`                                                                   |
| `module/sheets/`        | 500   | `npc-sheet.js` 719                       | `npc-sheet.js`, `base-actor-sheet.js` 678, `pc-sheet.js` 619, `item-sheet.js` 531 |
| `module/setup/`         | 250   | `migrations/icons/icon-paths.js` 334     | `migrations/icons/icon-paths.js`                                                  |
| `module/hooks/`         | 150   | `chat-damage-buttons.js` 228             | `chat-damage-buttons.js`                                                          |
| `dist/l5r4-enhanced.js` | 300   | 258                                      | none                                                                              |

| Rule                                                                                                                    | Enforced by                      |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| A file over its layer's limit has an entry in `tests/conventions/exceptions.json` with the reason                       | `tests/conventions/size.test.js` |
| The reason names one responsibility the file keeps whole (a registry of every rule model, a sheet's whole action table) | review                           |

| Conforming                                                                                                                                   | Non-conforming                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `module/data/rules/rule-models.js` at 580 lines with an `exceptions.json` entry: one registry of every rule model, split by nothing but size | `module/services/dice/check/roll-check.js` at 646 lines with no entry; `rollCheck` alone spans 192-561 |

## Folders

| Rule                                                                                                        | Enforced by                       |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A feature with three or more files in a layer gets its own folder (`services/combat/`, `services/xp/`)      | review                            |
| A folder holds no index or barrel file; each feature's init function sits in the file that owns the feature | `tests/conventions/names.test.js` |
| A folder holds files; an empty folder does not exist                                                        | `tests/conventions/names.test.js` |
| Constants live in `module/config/`, never in a `constants/` folder of another layer                         | `tests/conventions/names.test.js` |

No feature folder has an entry file: a service exports its hook handlers and `module/hooks/register-all.js` wires
them (Stage 17 decision 16).

| Rule                | Conforming                                                                                              | Non-conforming                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Feature folder      | `module/services/xp/`: `xp-calculator.js`, `xp-formatter.js`, `xp-versioning.js`                        | none found                                                |
| No entry file       | `module/services/effects/automation.js` exports its handlers; `module/hooks/register-all.js` wires them | An `index.js` that registers a feature's hooks (modeled)  |
| Constants in Config | `module/config/rule-keys.js`, `module/config/item-types.js`                                             | A `constants/` folder under `module/documents/` (modeled) |

## Mixins

A mixin is a function that takes a class and returns a subclass. Every mixin lives in `module/mixins/<name>-mixin.js`
and exports `<Name>Mixin`, whichever layer uses it.

| Rule                                                        | Enforced by                           |
| ----------------------------------------------------------- | ------------------------------------- |
| Mixin files live in `module/mixins/` and end in `-mixin.js` | `tests/conventions/names.test.js`     |
| A mixin's import goes in the Mixins group                   | `l5r4/import-order` (`tools/eslint/`) |

| Conforming                                                                           | Non-conforming                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `module/mixins/debounced-field-mixin.js`, `module/mixins/keyboard-behavior-mixin.js` | A mixin in a layer's own `mixins/` folder (modeled) |
