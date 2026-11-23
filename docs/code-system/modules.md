# Modules

The shape of one JavaScript file in `module/` and `dist/l5r4-enhanced.js`: what it imports and in which order, what it declares, what it exports, how large it grows, and where it lives. Names are in `docs/code-system/naming.md`; the member order inside a Foundry class is in `docs/code-system/foundry-patterns.md`; the file header is in `docs/code-system/documentation.md`.

## File layout

A file holds these parts, in this order:

| Order | Part            | Detail                                                                |
| ----- | --------------- | --------------------------------------------------------------------- |
| 1     | Header          | The `@module` JSDoc block (`documentation.md`)                        |
| 2     | Imports         | Static `import` statements, grouped by layer (**Imports**)            |
| 3     | Constants       | Module-level `const` values and module state (**Constants**)          |
| 4     | Exports         | The exported functions, classes, and constants, the file's public API |
| 5     | Private helpers | Unexported functions the exports call                                 |

| Rule | Enforced by |
| --- | --- |
| The parts appear in the order above | `l5r4/module-shape` (`tools/eslint/`) |
| An unexported helper sits below every export, never between two | `l5r4/module-shape` (`tools/eslint/`) |

| Conforming | Non-conforming |
| --- | --- |
| `module/services/effects/apply.js`: the imports, the `APPLY_EFFECT_QUERY` constant, the exports from `buildEffectData` to `registerEffectQueries`, then the private `buildBaseEffectData` | A private helper between two exports (modeled) |

## Imports

### Groups

Imports come in layer order, lowest layer first, then the file's own folder. A group is left out when the file imports nothing from that layer.

| Group | Paths | Example |
| --- | --- | --- |
| 1 Config | `module/config/` | `import { SYS_ID } from "../../config/constants.js";` (`module/services/combat/damage.js`) |
| 2 Utils | `module/utils/` | `import { toInt } from "../../utils/type-coercion.js";` (`module/services/combat/damage.js`) |
| 3 Data | `module/data/` | `import { createRule } from "../../data/rules/rule-models.js";` (`module/documents/actor/rules.js`) |
| 4 Documents | `module/documents/` | `import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";` (`module/sheets/pc-sheet.js`) |
| 5 Services | `module/services/` | `import { rollCheck } from "../dice/check/roll-check.js";` (`module/services/combat/damage-roll.js`) |
| 6 Mixins | `module/mixins/` | `import { DebouncedFieldMixin } from "../mixins/debounced-field-mixin.js";` (`module/apps/armor-config.js`) |
| 7 Apps | `module/apps/` | `import EffectPanelApplication from "../apps/effect-panel.js";` (`module/hooks/register-all.js`) |
| 8 Sheets | `module/sheets/` | `import L5R4ItemSheet from "../module/sheets/item-sheet.js";` (`dist/l5r4-enhanced.js`) |
| 9 Setup | `module/setup/` | `import { migrateWorld } from "../module/setup/migrations.js";` (`dist/l5r4-enhanced.js`) |
| 10 Hooks | `module/hooks/` | `import { registerAllHooks } from "../module/hooks/register-all.js";` (`dist/l5r4-enhanced.js`) |
| 11 Local | A path that starts with `./`: the file's folder and the folders below it | `import { renderCheckCard } from "./card.js";` (`module/services/dice/check/roll-check.js`) |

A path that starts with `../` goes in the group of the layer it reaches, even inside the file's own layer: `module/services/combat/damage-roll.js` imports `rollCheck` from `../dice/check/roll-check.js` in the Services group.

Which layer may import which is CLAUDE.md **Layers**; this page sets only the order.

### Rules

| Rule | Enforced by |
| --- | --- |
| Groups appear in the order of the table above | `l5r4/import-order` (`tools/eslint/`) |
| One block: no comment labels and no blank lines between groups | `l5r4/import-order` (`tools/eslint/`) |
| Each import names the file itself with its `.js` extension; no folder barrels | `l5r4/import-order` (`tools/eslint/`) |
| Imports are static. No `await import()` inside a function | ESLint core `no-restricted-syntax` (`ImportExpression`) |
| One exception: the entry file loads `tests/quench/index.js` with `await import()` in `quenchReady`, since the release zip ships without `tests/`; the line carries an `eslint-disable-next-line no-restricted-syntax` comment that says so | review |
| A file imports only the layers CLAUDE.md **Layers** allows it | ESLint `no-restricted-imports` per directory, `npm run deps:circular` |
| Utils read no Foundry global, except `module/utils/localization.js`, which is the `T` / `F` / `R` API over `game.i18n` that `docs/design-system/content/localization.md` names | ESLint `no-restricted-globals` per directory, with that file exempt |
| No file imports itself in a cycle | `npm run deps:circular` |

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Group order | The imports of `module/services/combat/damage.js`: config, utils, then services | A config import after four utils imports (modeled) |
| Group order | The imports of `module/documents/actor/rules.js`: config, utils, data, then local | The data import first, then utils, then the config import last (modeled) |
| One block | The imports of `module/services/combat/damage.js`: no labels, no blank lines | `// Config`, `// Utils`, and `// Local` labels with blank lines between the groups (modeled) |
| Static imports | `module/services/rest.js` imports `CHAT_TEMPLATES` from `config/templates.js` statically | A module loaded with `await import()` inside a function (modeled) |
| Layers | `module/services/dice/check/roll-check.js` imports config, utils, and services only | A service that imports a sheet or an app (modeled) |

## Constants

| Rule | Enforced by |
| --- | --- |
| A module-level value that never changes is `UPPER_SNAKE_CASE` and sits below the imports | ESLint core `camelcase` and `l5r4/naming` (`naming.md`), `l5r4/module-shape` (position) |
| `Object.freeze(...)` wraps every constant object or array, called by that name | `l5r4/module-shape` (`tools/eslint/`) |
| Module state that changes at run time (a `Map` of locks, a running flag) is `camelCase`, never `UPPER_SNAKE_CASE` | Local naming rule (`naming.md`) |
| A number the rules define lives in `module/config/` and is imported, never written as a literal | review |
| `module/config/` holds values only: no functions (CLAUDE.md **Layers**) | `l5r4/module-shape` (`tools/eslint/`) |

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Frozen constant | `DISARM_DAMAGE` (`module/services/combat/damage-roll.js`): `const DISARM_DAMAGE = Object.freeze({ roll: 2, keep: 1 });` | An exported constant object left unfrozen (modeled) |
| Module state | `actorLocks` (`module/services/dice/resources/void-points.js`) | A registry filled at run time and named `FLOWS` (modeled) |
| Rule numbers | `module/services/combat/damage-roll.js` imports `TN_PER_RAISE` | `getTn` (`module/utils/check.js`): the literal `5` per Raise where `TN_PER_RAISE` (`module/config/game-mechanics.js`) holds it |
| Values only | `MANEUVERS` (`module/config/rule-keys.js`) | A function exported from `module/config/` (modeled); `getIconPath` (`module/utils/icons.js`) lives in Utils |

## Exports

A file whose job is one class that Foundry registers (a document class, a data model, a sheet, an ApplicationV2 window, a dice term), or the base class such a class extends, default-exports that class. Every other file uses named exports only: utilities, constants, handler classes of static methods, mixins. The default exports are 30 in `module/data/` and `module/documents/`, data models with their shared bases and document classes; 15 in `module/sheets/` and `module/apps/`, sheets and windows; 1 in `module/services/`, the `L5R4Die` term; none in `module/utils/`, `module/config/`, `module/setup/`, and `module/hooks/`.

| Rule | Enforced by |
| --- | --- |
| Default export only for a registered class or its base; a file never mixes a default and named exports | `l5r4/module-shape` (`tools/eslint/`) |
| A default import takes the class's own name | `l5r4/module-shape` (`tools/eslint/`) |
| Functions export with `export function`, never as an arrow `const` | `l5r4/module-shape` (`tools/eslint/`) |
| Every export has a caller in `module/` or `dist/l5r4-enhanced.js`; an export that only tests import is dead code | review |
| A file that only re-exports another file does not exist | `tests/conventions/names.test.js` |

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Default export | `L5R4Actor` (`module/documents/actor.js`), `XpManagerApplication` (`module/apps/xp-manager.js`), `L5R4Die` (`module/services/dice/roll-keep-die.js`) | A default export beside named exports (modeled); `BaseActorSheet` (`module/sheets/base-actor-sheet.js`): the sheets' base class as a named export |
| Default import name | `import L5R4Actor from "../module/documents/actor.js";` (`dist/l5r4-enhanced.js`) | A default import under a name other than the class's own (modeled) |
| `export function` | `buildPool` (`module/utils/check.js`): `export function buildPool` | A util exported as an arrow constant, `export const T = key => ...` (modeled) |
| Used exports | `effectsOf` (`module/services/effects/apply.js`) | `buildMergedXpHistory` (`module/services/xp/calculator.js`) has no caller |
| No re-export files | `module/setup/settings/register-all.js` registers the settings itself | A one-line file that re-exports another file (modeled) |

## One responsibility per file

A file does one job its layer owns. A second job, not a line count, is the reason to split (decision 3).

| Rule                                                              | Enforced by |
| ----------------------------------------------------------------- | ----------- |
| One job per file, named by the file name                          | review      |
| The same logic lives in one file; a second copy imports the first | review      |

| Conforming | Non-conforming |
| --- | --- |
| `module/services/effects/apply.js`: applies status effects and registers the GM query that does it for players | A file in `module/hooks/` that applies Wounds, spends Void Points, and posts notifications itself, which is Services work (modeled) |
| `module/services/dice/resources/void-points.js`: one `updateUnderLock` | `updateUnderLock` (`module/services/dice/check/spell-slots.js`): a copy of `updateUnderLock` (`module/services/dice/resources/void-points.js`) with its own lock map |

## Size

Each layer has a soft limit in lines. A file over its limit passes only with a written reason in `tests/conventions/exceptions.json` (decision 3). Each limit names its layer's outliers, not its typical file.

| Layer | Limit | Largest | Over the limit |
| --- | --- | --- | --- |
| `module/config/` | 300 | `status-effects.js` 290 | none |
| `module/utils/` | 300 | `rule-summary.js` 414 | `rule-summary.js`, `rule-engine.js` 389 |
| `module/data/` | 200 | `rules/rule-models.js` 609 | `rules/rule-models.js` |
| `module/documents/` | 300 | `actor/calculations/npc-wound-system.js` 300 | none |
| `module/services/` | 350 | `combat/duel.js` 396 | `combat/duel.js`, `dice/check/collect.js` 392 |
| `module/mixins/` | 200 | `keyboard-behavior-mixin.js` 180 | none |
| `module/apps/` | 400 | `xp-manager.js` 437 | `xp-manager.js` |
| `module/sheets/` | 500 | `base-actor-sheet.js` 684 | `base-actor-sheet.js`, `item-sheet.js` 578 |
| `module/setup/` | 250 | `migrations/items/emphasis.js` 243 | none |
| `module/hooks/` | 150 | `register-all.js` 154 | `register-all.js` |
| `dist/l5r4-enhanced.js` | 300 | 264 | none |

| Rule | Enforced by |
| --- | --- |
| A file over its layer's limit has an entry in `tests/conventions/exceptions.json` with the reason | `tests/conventions/size.test.js` |
| The reason names one responsibility the file keeps whole (a registry of every rule model, a sheet's whole action table) | review |

| Conforming | Non-conforming |
| --- | --- |
| `module/data/rules/rule-models.js` at 609 lines with an `exceptions.json` entry: one registry of every rule model, split by nothing but size | A file over its layer's limit with no `exceptions.json` entry (modeled) |

## Folders

| Rule | Enforced by |
| --- | --- |
| A feature with three or more files in a layer gets its own folder (`services/combat/`, `services/xp/`) | review |
| A folder holds no index or barrel file; each feature's init function sits in the file that owns the feature | `tests/conventions/names.test.js` |
| A folder holds files; an empty folder does not exist | `tests/conventions/names.test.js` |
| Constants live in `module/config/`, never in a `constants/` folder of another layer | `tests/conventions/names.test.js` |

No feature folder has an entry file: a service exports its hook handlers and `module/hooks/register-all.js` wires them (Stage 17 decision 16).

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Feature folder | `module/services/xp/`: `calculator.js`, `disadvantage-cap.js`, `formatter.js`, `versioning.js` | none found |
| No entry file | `module/services/effects/automation.js` exports its handlers; `module/hooks/register-all.js` wires them | An `index.js` that registers a feature's hooks (modeled) |
| Constants in Config | `module/config/rule-keys.js`, `module/config/item-types.js` | A `constants/` folder under `module/documents/` (modeled) |

## Mixins

A mixin is a function that takes a class and returns a subclass. Every mixin lives in `module/mixins/<name>-mixin.js` and exports `<Name>Mixin`, whichever layer uses it.

| Rule | Enforced by |
| --- | --- |
| Mixin files live in `module/mixins/` and end in `-mixin.js` | `tests/conventions/names.test.js` |
| A mixin's import goes in the Mixins group | `l5r4/import-order` (`tools/eslint/`) |

| Conforming | Non-conforming |
| --- | --- |
| `module/mixins/debounced-field-mixin.js`, `module/mixins/keyboard-behavior-mixin.js` | A mixin in a layer's own `mixins/` folder (modeled) |
