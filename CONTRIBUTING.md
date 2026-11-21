# Contributing to L5R4 Enhanced

Bug fixes, rule corrections with their page, tests, and translations are welcome. This page covers setup, the gate a change must pass, and where each rule lives. The rules themselves live in `docs/`, once each.

## Setup

Requirements: Node.js 24 or later, Foundry VTT 14.370 or later, Git.

```bash
git clone https://github.com/ernieayala/l5r4.git
cd l5r4
npm install
npm run build:css
```

`npm install` also sets up the Husky pre-commit hook, which runs lint-staged on the files you commit.

Link the repo into Foundry's data folder so the system loads from your clone. Windows (PowerShell):

```powershell
New-Item -ItemType Junction -Path "$env:LOCALAPPDATA\FoundryVTT\Data\systems\l5r4-enhanced" -Target "C:\path\to\l5r4"
```

macOS or Linux:

```bash
ln -s /path/to/l5r4 "<Foundry data folder>/Data/systems/l5r4-enhanced"
```

## The gate

Every change passes these, run from the repo root; `.github/workflows/gate.yml` runs the same on each push and pull request.

| Script | Checks |
| --- | --- |
| `npm run test` | Vitest: unit tests, the convention checks in `tests/conventions/`, copy rules in `tests/lang.test.js` |
| `npm run build:css` | Compiles `scss/` to `dist/l5r4-enhanced.css`, which is committed |
| `npm run lint` | ESLint and Stylelint |
| `npm run format:check` | Prettier |
| `npm run deps:circular` | No circular imports in `module/` |
| `npm run coverage:check` | Every rule page classified, every citation covered, every action, setting, and pack entry tested (`tools/coverage/`) |

In-Foundry behavior is tested with [Quench](https://github.com/Ethaks/FVTT-Quench): with the module active, open the Quench window and run the `l5r4-enhanced.*` batches (`tests/quench/`). A new test must fail without the change it covers.

Other scripts: `npm run lint:fix`, `npm run format`, `npm run watch:css`, `npm run test:watch`, `npm run test:ui`, `npm run test:coverage`, `npm run coverage` (writes `tools/coverage/report.md`), `npm run build:packs` (needs Foundry stopped), `npm run packs:verify`.

## Where the rules live

| Topic | Page |
| --- | --- |
| Layers, module shape, import order | [docs/code-system/modules.md](docs/code-system/modules.md) |
| Names: files, identifiers, verbs, i18n keys, fixed names | [docs/code-system/naming.md](docs/code-system/naming.md) |
| Game terms and the identifier stems for them | [docs/code-system/glossary.md](docs/code-system/glossary.md) |
| Functions | [docs/code-system/functions.md](docs/code-system/functions.md) |
| JSDoc and the one citation format | [docs/code-system/documentation.md](docs/code-system/documentation.md) |
| Foundry classes: sheets, apps, data models, member order | [docs/code-system/foundry-patterns.md](docs/code-system/foundry-patterns.md) |
| Templates and SCSS | [docs/code-system/templates-and-styles.md](docs/code-system/templates-and-styles.md) |
| Tests | [docs/code-system/testing.md](docs/code-system/testing.md) |
| Commits and branches | [docs/code-system/git.md](docs/code-system/git.md) |
| Look: color, type, space, frames, icons, motion, layers, states | [docs/design-system/foundations/](docs/design-system/foundations/) |
| Components and patterns | [docs/design-system/components/](docs/design-system/components/), [patterns/](docs/design-system/patterns/) |
| UI copy and translations | [docs/design-system/content/](docs/design-system/content/) |

The checks in `tests/conventions/` and the local ESLint rules in `tools/eslint/` enforce what a pattern can test. `docs/code-system/README.md` and `docs/design-system/README.md` index the rest. A GM can open the design gallery from Configure Settings > System to see every component in both themes.

## Game rules

The system automates the Legend of the Five Rings 4th Edition Core Rulebook. A change to a rule cites the printed page in its JSDoc and checks the book's worked examples as Vitest cases. The repository is public: never paste the book's text into code, comments, commits, issues, or pull requests. Cite pages instead.

## Pull requests

1. Branch from `main`.
2. Make the change, with tests that fail without it.
3. Run the gate. For anything a player sees, run the Quench batches and check it in Foundry in both themes.
4. Write commits in the conventional form (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), present tense.
5. Open the pull request with what changed and why, and the issue it closes.

Report bugs on [GitHub Issues](https://github.com/ernieayala/l5r4/issues) with the Foundry and system versions, the steps to reproduce, and any console errors.
