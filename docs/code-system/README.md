# Code system

The rules for everything a developer writes in this repo: JavaScript in `module/`, `dist/l5r4-enhanced.js`, `tools/`, and `scripts/`; Handlebars templates; SCSS; `lang/` keys; tests; commits. What a user sees (look, components, copy) is the design system in [`docs/design-system/`](../design-system/README.md).

## Pages

| Page                                               | Holds                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [naming.md](naming.md)                             | The naming dictionary: one row per identifier kind, the verb vocabulary the local ESLint rule reads, and the fixed names       |
| [glossary.md](glossary.md)                         | One row per game concept: the book's term and printed page, the identifier stem, the i18n key, the UI label, banned synonyms   |
| [modules.md](modules.md)                           | Module shape: import groups, constants, exports, private helpers, size limits, default versus named exports, where mixins live |
| [functions.md](functions.md)                       | Parameters, return shapes for "result or problem", async rules, early returns, flag parameters                                 |
| [documentation.md](documentation.md)               | The JSDoc template, the citation format, comment rules                                                                         |
| [foundry-patterns.md](foundry-patterns.md)         | Member order in ApplicationV2 classes and data models, rule models, GM query services, chat cards, settings, migrations        |
| [templates-and-styles.md](templates-and-styles.md) | Template structure, SCSS file layout, where a new style goes                                                                   |
| [testing.md](testing.md)                           | The test system: file layout, batch ids and display names, `describe` and `it` names, citations, fixtures                      |
| [git.md](git.md)                                   | Branches, what a commit holds, commit messages, attribution, pull requests, releases                                           |

## How the parts fit

| Question                                                              | Page                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| What do I call this file, class, function, key, class name, or token? | naming.md                                                  |
| Which word names this game concept in code and copy?                  | glossary.md, read by naming.md's rows                      |
| Where does this string's key go in `lang/en.json`?                    | `docs/design-system/content/localization.md`               |
| What goes in this file, and in which order?                           | modules.md, then foundry-patterns.md for a Foundry class   |
| What does this function take and return?                              | functions.md                                               |
| What does the comment above it say?                                   | documentation.md                                           |
| Where does this markup or style go?                                   | templates-and-styles.md; how it looks is the design system |
| How is it tested, and what is the test called?                        | testing.md                                                 |
| How does it land?                                                     | git.md                                                     |

A rule lives on one page. Another page that needs it links to it and does not restate it.

## Where rules live

| Source                                         | Holds                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/code-system/`                            | The detail of every code convention                                                           |
| `CLAUDE.md`, `CONTRIBUTING.md`, `DEVELOPER.md` | One-line rules that link here                                                                 |
| The Core Rulebook, then `game-rules/`          | Game rules. A page here names a game term and a printed page number, never the book's wording |

`docs/` describes the code that ships and stays out of the release zip.

## Enforcement

Every rule names how it is enforced: a check below, or "review" when no check can. Each check runs inside `npm run test` or `npm run lint`, so the gate and `.github/workflows/gate.yml` run it with no extra step. Each check ships with a fixture it fails on. ESLint and Stylelint rules are set to `error`: the gate passes on warnings, so a warning enforces nothing.

| Check                                                                                                  | Runs in                        | Enforces                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/conventions/names.test.js`                                                                      | `npm run test`                 | naming.md file and folder rules, the `_` partial prefix, nesting depth, redundant names, no empty folders                                                                               |
| `tests/conventions/size.test.js`                                                                       | `npm run test`                 | modules.md size limits; an over-limit file is listed in `tests/conventions/exceptions.json` with its reason                                                                             |
| ESLint `no-restricted-imports` and `no-restricted-globals` per directory, with `npm run deps:circular` | `npm run lint`                 | The layer rules in `CLAUDE.md` **Layers**                                                                                                                                               |
| Local ESLint rules in `tools/eslint/`                                                                  | `npm run lint`                 | modules.md import order and module shape, foundry-patterns.md member order, naming.md identifier names and verb vocabulary                                                              |
| ESLint `camelcase` and `new-cap`                                                                       | `npm run lint`                 | naming.md casing                                                                                                                                                                        |
| `tests/conventions/glossary.test.js`                                                                   | `npm run test`                 | glossary.md stems and banned synonyms in identifiers, i18n keys, and `lang/en.json` values                                                                                              |
| ESLint `no-restricted-properties` and `no-restricted-syntax`                                           | `npm run lint`                 | The deprecated Foundry APIs in `CLAUDE.md` **Foundry Integration**; no HTML strings, `innerHTML`, `insertAdjacentHTML`, `.style` writes, class or id selectors, or jQuery in JavaScript |
| `eslint-plugin-jsdoc` and a local ESLint rule                                                          | `npm run lint`                 | documentation.md: JSDoc on every export, one citation format                                                                                                                            |
| `tests/conventions/templates.test.js`                                                                  | `npm run test`                 | templates-and-styles.md template rules                                                                                                                                                  |
| `tests/conventions/actions.test.js`                                                                    | `npm run test`                 | naming.md `data-action` casing; every template action has a handler                                                                                                                     |
| Stylelint (`.stylelintrc.json`) and `tests/conventions/styles.test.js`                                 | `npm run lint`, `npm run test` | naming.md class and token names, templates-and-styles.md SCSS layout, design-system token use                                                                                           |
| `tests/lang.test.js`                                                                                   | `npm run test`                 | i18n key paths (design-system `content/localization.md`), design-system copy rules a pattern can test, translation keys present in `en.json`                                            |
| `tests/conventions/tests.test.js`                                                                      | `npm run test`                 | testing.md batch ids, display names, `it` names, citations, file mirroring                                                                                                              |
| Prettier (`npm run format:check`) and `.editorconfig`                                                  | gate                           | Whitespace and formatting                                                                                                                                                               |

## Exceptions

| Case                                                                                                                        | Handling                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed name ([naming.md](naming.md#fixed-names))                                                                           | Every check exempts it by name. Renaming one needs a migration Ernie approves                                                         |
| A file over its size limit                                                                                                  | Allowed with a written reason in `tests/conventions/exceptions.json`. A file splits for a second responsibility, not to meet a number |
| A rename a module, macro, or world stylesheet could depend on (CSS class, token, `CONFIG.l5r4` key, `game.system.api` name) | Listed in `CHANGELOG.MD`                                                                                                              |

## Changing a rule

| Step | Action                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | Change the page and its check in the same commit; the check's fixture shows the new rule                                     |
| 2    | Where the code follows two forms, Ernie picks one before any fix                                                             |
| 3    | A new verb is a new row in naming.md's verb vocabulary table; the local ESLint rule reads the table, so no rule code changes |
| 4    | A new fixed name goes in naming.md's fixed names table and in the exempt list of every check that reads that kind of name    |
