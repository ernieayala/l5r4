# Developer Guide

How the code is laid out and where to put a change. Setup and the gate are in [CONTRIBUTING.md](CONTRIBUTING.md); the full rules are in [docs/code-system/](docs/code-system/README.md).

## Layers

Each folder under `module/` has one job. Imports flow downward, and `npm run deps:circular` finds no cycle. ESLint's `no-restricted-imports` and `no-restricted-globals` enforce the boundaries per folder.

| Layer | Path | Does | Never does |
| --- | --- | --- | --- |
| Data models | `module/data/` | One `TypeDataModel` per subtype: schema, `migrateData`, derived values | UI, DOM, rolling |
| Rule models | `module/data/rules/` | One `DataModel` per rule key in `system.rules`: validation only | Computing outputs |
| Documents | `module/documents/` | Actor, Item, Combat, Combatant: data preparation, lifecycle hooks | Rolling, UI, DOM |
| Services | `module/services/` | Rolls, roll dialogs, chat messages, effects, multi-step operations | Sheet references, derived data |
| Sheets | `module/sheets/` | Render document data; `handlers/` route actions to services and documents | Calculations, rules, rolling |
| Apps | `module/apps/` | Standalone ApplicationV2 windows | Rules the utils can hold |
| Hooks | `module/hooks/` | Foundry hook registration that wires events to services | Logic beyond routing |
| Setup | `module/setup/` | Settings, template registration, Handlebars helpers, world migrations | Rules |
| Utils | `module/utils/` | Pure functions: rule math, validation, formatting | Side effects, Foundry globals |
| Config | `module/config/` | Constants, keys, option lists | Functions, logic |

Sheets and apps may import services, documents, utils, and config, and sheets may import apps to open the system's windows; services and documents import utils and config, never each other; utils import config only. [docs/code-system/modules.md](docs/code-system/modules.md) has the full table and the import order.

`dist/l5r4-enhanced.js` is the entry module, written by hand: it registers the data models, sheets, settings, and hooks during `init` and runs migrations during `ready`. `dist/l5r4-enhanced.css` is compiled from `scss/`.

## Where a change goes

| Change | Where |
| --- | --- |
| A rule's math | A pure function in `module/utils/`, with the book's worked examples in `tests/unit/` |
| A value derived from actor data | The subtype's data model or `module/documents/actor/` |
| What a rule key in `system.rules` does | `module/utils/rule-engine.js`; its validation in `module/data/rules/rule-models.js` |
| A roll, a chat card, a dialog | `module/services/`, its markup in `templates/` |
| A sheet control | A `data-action` in the template, routed in the sheet; see [foundry-patterns.md](docs/code-system/foundry-patterns.md) |
| Stored data outside the schema | `flags.l5r4-enhanced.*` |
| A schema change | The data model with `migrateData`, or a world migration in `module/setup/migrations/` |
| Text a user reads | A key in `lang/en.json`; see [docs/design-system/content/](docs/design-system/content/) |
| Markup and looks | `templates/` and `scss/`, on the tokens in [docs/design-system/foundations/](docs/design-system/foundations/) |

## Tests

Vitest runs in Node for pure code (`tests/unit/`, mirroring `module/`) and for the repo-level checks (`tests/*.test.js`, `tests/conventions/`). Quench runs in Foundry for documents, sheets, services, and workflows (`tests/quench/`, registered by `tests/quench/index.js`). [docs/code-system/testing.md](docs/code-system/testing.md) has the naming and structure rules.

## Foundry APIs

The target is Foundry VTT 14.370. Check an API against the installed source before using it; `roadmap/FOUNDRY-V14-REFERENCE.md` lists the ones the system uses with their sources.
