# Git

Branches, what a commit holds, commit messages, attribution, pull requests, and releases. Each rule names its check, or "review" when no check can.

## Branches

| Branch                  | Holds                                                                                                                                            | Check                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `main`                  | Released code. Changes arrive by pull request                                                                                                    | `.github/workflows/gate.yml` runs on every push to `main` and every pull request into it |
| `release/4.0.0`         | Every roadmap stage in `roadmap/00-OVERVIEW.md`, one stage at a time, until the 4.0.0 release. Draft PR #39 merges it into `main` after Stage 19 | Review                                                                                   |
| `feature/<kebab-topic>` | A contribution from a fork, opened as a pull request into `main`                                                                                 | Review                                                                                   |

| Rule                | Detail                                                                         | Check  |
| ------------------- | ------------------------------------------------------------------------------ | ------ |
| One stage at a time | A stage is finished and verified before the next one starts on `release/4.0.0` | Review |
| Foundry 13 line     | 3.2.1 is the last Foundry 13 release; 4.0.0 and later target Foundry 14        | Review |

Conforming: Stage 16 committed on `release/4.0.0` as `e81e5f9`. Not conforming: a stage committed to `main`, or a stage split across a second branch.

## What a commit holds

| Rule                             | Detail                                                                                                                                                            | Check                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| One change                       | One roadmap stage, one fix, or one docs or chore change. A rule bug found during other work becomes a GitHub issue with its printed page, fixed in its own commit | Review                                                                                                 |
| Gate green                       | `npm run test`, `npm run build:css`, `npm run lint`, `npm run format:check`, and `npm run deps:circular` pass at the commit                                       | `.github/workflows/gate.yml` on the pull request; `.husky/pre-commit` runs lint-staged on staged files |
| Generated CSS with its source    | `dist/l5r4-enhanced.css` is rebuilt by `npm run build:css` and committed with the SCSS change that caused it, never edited by hand                                | Review                                                                                                 |
| Schema change with its migration | A change to a `system` schema ships its `migrateData` or `module/setup/migrations/` step in the same commit                                                       | Review                                                                                                 |
| Never committed                  | `content/`, `game-rules/`, `tools/coverage/report.md`, `/packs/`, `/coverage/`, `.claude/`, `CLAUDE.md`                                                           | `.gitignore`                                                                                           |
| No book text                     | Commit messages, issues, and pull requests cite printed page numbers, never the book's wording                                                                    | Review                                                                                                 |
| Lockfile by npm only             | `package-lock.json` changes only through `npm install` or `npm ci`                                                                                                | Review                                                                                                 |
| Hooks run                        | No `--no-verify`                                                                                                                                                  | `.husky/pre-commit`                                                                                    |

Conforming: `2297a12` removes one unread field with its migration and its tests. Not conforming: a commit that hand-edits `dist/l5r4-enhanced.css`, or one that adds a schema field without its migration.

## Commit messages

### Subject

`<type>: <Subject>`, or `<type>: <Subject> (Stage N)` for a roadmap stage.

| Part         | Rule                                                                                                             | Check  |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Type         | One of the types below, lowercase, no scope in parentheses                                                       | Review |
| Subject      | Starts with a capitalized verb in the imperative ("Add", "Remove", "Run"), says what changed, no trailing period | Review |
| Length       | Under 72 characters, the stage marker included                                                                   | Review |
| Stage marker | ` (Stage N)` closes the subject of the commit that delivers a roadmap stage                                      | Review |
| Numbers      | Issue and pull request numbers go in the body, not the subject                                                   | Review |

| Type       | Use                                       |
| ---------- | ----------------------------------------- |
| `feat`     | A user-visible feature or a roadmap stage |
| `fix`      | A bug fix                                 |
| `docs`     | Documentation only                        |
| `perf`     | A speed change with no behavior change    |
| `refactor` | A code change with no behavior change     |
| `test`     | Tests only                                |
| `chore`    | Tooling, configuration, dependencies      |

| Conforming                                                                     | Not conforming                                                                                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `feat: Add a repeatable coverage audit to the gate (Stage 16)` (`e81e5f9`)     | `fix(skills): bridge skill-item bonuses to weapon attacks (#34) (#36)` (`51a2874`): a scope, a lowercase subject, numbers in the subject |
| `fix: End a status animation only after Sequencer has loaded it` (`17ffd9f`)   | `fix: removed the bonus field.` (modeled): past tense, lowercase, trailing period                                                        |
| `docs: Match ACTIVE_EFFECTS.md to the Foundry 14.370 effect sheet` (`e525bdb`) |                                                                                                                                          |

The commit-msg hook (`.husky/commit-msg`) rejects an empty message only, so the subject rules are held by review.

### Body

| Rule            | Detail                                                                                                         | Check  |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| Shape           | A blank line after the subject, then a bullet list of what changed for a user or a developer, in present tense | Review |
| Wrap            | Lines wrapped at 72 characters                                                                                 | Review |
| Roadmap changes | A `Roadmap:` bullet names any change to `roadmap/`; the same change goes in PR #39's body                      | Review |
| Issues          | `Fixes #N` at the end; each closed issue gets its own `Fixes` keyword, so GitHub closes every one              | Review |
| No history      | The body says what the commit changes and why, not the attempts that led to it                                 | Review |

Conforming: the body of `2297a12`, bullets then `Fixes #75`. Not conforming: a body that narrates a debugging session step by step.

## Attribution

| Rule                     | Detail                                                                                                                                                                                       | Check        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| No assistant attribution | Commits carry no `Co-Authored-By:` trailer naming an AI assistant; pull request bodies carry no "Generated with" line. This repository is public, and Ernie keeps tool attribution out of it | Review       |
| No assistant files       | Assistant configuration (`.claude/`, `CLAUDE.md`) stays on the developer's machine                                                                                                           | `.gitignore` |

Not conforming: `c349256` and `6cd48d3`, whose messages end with an assistant `Co-Authored-By:` trailer.

## Pull requests

| Rule               | Detail                                                                                                                                                        | Check                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| PR #39             | The draft pull request for `release/4.0.0`. Its body holds the stage checklist and every roadmap change, updated when a stage finishes or the roadmap changes | Review                       |
| Fork pull requests | Into `main`, from a `feature/<kebab-topic>` branch: what changed, the issues it addresses, screenshots for a UI change                                        | Review                       |
| Gate               | The pull request passes `.github/workflows/gate.yml` before it merges                                                                                         | `.github/workflows/gate.yml` |

## Releases

| Rule              | Detail                                                                                                                                                                                                      | Check                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Tags              | `v<major>.<minor>.<patch>`, or `v<major>.<minor>.<patch>-<pre>` for a pre-release, created by `.github/workflows/create-release.yml`                                                                        | `create-release.yml` validates the format and refuses an existing tag |
| Version commit    | `create-release.yml` commits the version change to `package.json`, `package-lock.json`, `system.json`, and `dist/l5r4-enhanced.css`, with the subject the workflow writes; no one makes that commit by hand | Review                                                                |
| Release workflows | `create-release.yml` and `release.yml` tag, commit, and publish, so they change only in the release stage or when Ernie asks                                                                                | Review                                                                |
