# Documentation

How code explains itself: one JSDoc template, one citation format, and the comment rules. Each rule names its check. "Review" means no tool can check it.

ESLint runs the JSDoc checks through `eslint-plugin-jsdoc` (approved, Stage 17 decision 14) and one local rule, `l5r4/doc-format` in `tools/eslint/`. Both are configured in `eslint.config.mjs`.

## JSDoc template

Every exported function, class, and constant carries this block. Unexported helpers carry it when the name does not say what they return.

```js
/**
 * <Summary: what it returns or does, one sentence.>
 * <More sentences only for why, edge cases, or a recorded deviation.>
 * game-rules/<file>.md, p.<pages>
 * @param {<type>} <name> - <Description>
 * @param {object} [options] - <Description>
 * @param {boolean} [options.<key>=<default>] - <Description>
 * @returns {<type>} <Description>
 */
```

| Part | Rule | Check |
| --- | --- | --- |
| Block present | On every export | `jsdoc/require-jsdoc` (`publicOnly: true`) |
| Summary line | First line, one sentence, ends with a period | `jsdoc/require-description`, `jsdoc/require-description-complete-sentence` |
| Citation line | On rule code only; last line of the description, before the tags (see **Citations**) | `l5r4/doc-format` |
| `@param` | One per parameter, named as in the code, hyphen before the description | `jsdoc/require-param`, `jsdoc/check-param-names`, `jsdoc/require-hyphen-before-param-description` |
| `@returns` | On every function that returns a value; a `Promise<T>` for an async one | `jsdoc/require-returns`, `jsdoc/require-returns-check` |
| Types | Lowercase primitives and `object`, never `Object`; Foundry classes by name (`Actor`, `ChatMessage`) | `jsdoc/check-types` |
| `@override` | On every Foundry override (`defineSchema`, `_prepareContext`, `_preCreate`, ...) | `jsdoc/check-tag-names`, review for presence |
| `@typedef` | For an options object used by two or more functions | review |
| `@this` | On a static action handler that core calls with the app as `this` | review |
| Tags not used | `@private`, `@protected`, `@async`, `@function`, `@static`, `@requires`, `@example`, `@fileoverview`, `@file` | `jsdoc/check-tag-names` with `tagNamePreference` set to `false` for each |

`#name` and `_name` carry access in the language and in the naming rule (`naming.md`), so `@private` and `@protected` repeat nothing. `async` is in the signature. `@requires` names a Foundry version, which `system.json` states.

Picked by majority where the code split: the hyphen form of `@param`, and `{object}` for object types.

Conforming, modeled on `applyEffect` (`module/services/effects/apply.js`), whose block has no `@param` descriptions:

```js
/**
 * Create an effect on an actor the user owns.
 * @param {Actor} actor - The actor to change
 * @param {string} id - A status or system effect id
 * @param {EffectOptions} [options] - Level, name, rules, and start
 * @returns {Promise<ActiveEffect|undefined>} The created effect
 */
export async function applyEffect(actor, id, { turnOf, ...options } = {}) {
```

Not conforming (modeled): a static field documented with `@static` and `{Object}`, which the template drops.

```js
/**
 * This class's own options: ...
 *
 * @static
 * @type {Object}
 */
static DEFAULT_OPTIONS = {
```

## File header

A file under `module/`, `tools/`, or `dist/l5r4-enhanced.js` opens with one block before its imports: `@module` with the path under `module/` (or `tools/`) without `.js`, then `@description`. The description says what the file is for, in present tense.

| Rule                                      | Check                           |
| ----------------------------------------- | ------------------------------- |
| `@module` on the first tag line           | `l5r4/doc-format` (header form) |
| `@module` path matches the file's path    | `l5r4/doc-format` (header form) |
| No prose sections (`**Game Mechanics:**`) | review                          |

Picked as the largest single form: `@module` plus `@description` (74 files in `utils/`, `services/`, and `apps/`, and every `tools/*.mjs` file; the other 145 `module/` files split across four prose-title forms). The `@module` value is the path form (76 files) over the bare name (38).

Conforming, the file header of `module/apps/effect-panel.js`:

```js
/**
 * @module apps/effect-panel
 * @description A floating panel listing the effects on the controlled token's actor, else the user's character
 * ...
 */
```

Not conforming (modeled): a prose title, section lists, `@module` last, and `@requires Foundry VTT v13+`.

Test files follow `testing.md` **Files**.

## Citations

Rule code cites the book page it implements (CLAUDE.md **CITE THE RULE**) on one line in one format:

```text
game-rules/<file>.md, p.<pages>
```

| Rule | Check |
| --- | --- |
| `<file>` is a file in `game-rules/` (`33_wounds.md`); `<pages>` is a page list: `82`, `86-87`, `82, 89` | `l5r4/doc-format` |
| One line per `game-rules/` file the code depends on | `l5r4/doc-format` |
| Outside a JSDoc block, the citation is its own `//` comment line above the code it covers | `l5r4/doc-format` |
| A page number appears only on a citation line, never inside a sentence (`(p.84)`, `pp.86-87`, `Core Rulebook p.N`) | `l5r4/doc-format` |
| Printed page numbers, looked up with `/rule`, never from memory | review |
| No book text: a citation names the file and page, never a sentence from the book (CLAUDE.md **Licensed material**) | review |

Stage 16's citation parser (`tools/coverage/citations.mjs`) reads the page list after `p.` on these lines. Pack data in `src/packs/` keeps its `Core Rulebook p.N` citation (`roadmap/STAGE-15-COMPENDIUM-PACKS.md` **Content policy**); the rule does not apply there. Tests put the citation on a comment line above the test (`testing.md` **Citations**).

Conforming, `PcData#insightRank` (`module/data/actor/pc-data.js`):

```js
/**
 * The Insight Rank rules read: the prepared rank.
 * game-rules/49_improving_your_character.md, p.104
 * @type {number}
 */
get insightRank() {
```

Not conforming (modeled): the page sits inside the sentence and names no file.

```js
/**
 * The Insight Rank rules read (p.104): the prepared rank.
 */
```

## Citations in docs

A page in `docs/` cites the repo's code by the symbol it means and the file that holds it, never by a line number: lines move with every edit, and a check can find a symbol (Stage 17, Ernie's rulings, "Code citations in `docs/`").

```text
`<symbol>` (`<path>`)
```

| Code | Symbol | Example |
| --- | --- | --- |
| JavaScript | A function, class, or exported constant | `` `applyEffect` (`module/services/effects/apply.js`) `` |
| JavaScript | A method or member: `Class#method`, `Class.staticMember` | `` `PcData#insightRank` (`module/data/actor/pc-data.js`) `` |
| Template | A `data-action` value, a class, or a `{{> partial}}` path, as the file writes it | `` `data-action="create-item"` (`templates/actor/_partials/_unified-item-create.hbs`) `` |
| SCSS | A selector as the file writes it | `` `.l5r4-section-title` (`scss/components/_section.scss`) `` |
| JSON | A key path | `` `l5r4.apps.armorConfig.title` (`lang/en.json`) `` |
| Markdown | A heading or a phrase of the page | `` `Citations in docs` (`docs/code-system/documentation.md`) `` |
| A whole file | No symbol: the path alone | `` `module/apps/effect-panel.js` `` |
| A part of a symbol | The symbol, and words for the part | the PC skip in `` `migrateNpcInitiative` (`module/setup/migrations/actors/npc-initiative.js`) `` |

| Rule | Check |
| --- | --- |
| A repo path is never followed by `:<line>`, and a bare `:<line>` span never continues one | `docs/citation-line` (`tests/conventions/docs.test.js`) |
| The symbol occurs in the file: in JavaScript each name of it as an identifier or member, in JSON as a key path, elsewhere as written | `docs/citation-symbol` (`tests/conventions/docs.test.js`) |
| The symbol is what the sentence means, read from the current code | review |
| An example the code no longer holds is marked "(modeled)", or "modeled on" the current code it varies, cited by symbol | review |
| Foundry's installed source keeps its lines, as `[src: <path>:<line>]` (**Comments**): 14.370 is pinned and does not drift | review |

A citation quoted as an example, as in the tables above, sits in a double-backtick span or a fenced block; the checks skip both.

Conforming: the sentence names the part of the function it means.

```markdown
The first check in the loop of `migrateNpcInitiative` (`module/setup/migrations/actors/npc-initiative.js`) skips every actor that is not an NPC.
```

Not conforming (modeled): a line range, which points at other code after the next edit above it.

```markdown
The first check in the loop (`module/setup/migrations/actors/npc-initiative.js:22-24`) skips every actor that is not an NPC.
```

## Comments

| Rule | Check |
| --- | --- |
| A comment says why, never what the next line does | review |
| No history: no "previously", "no longer", "legacy", "v13", "removed", "fixed", "Bug Fix", dated notes (Clean Slate Rule) | review |
| History words describing stored data a migration reads are allowed (`module/setup/migrations/`, `migrate-source.js`) | review |
| A recorded deviation names what differs from the book and its basis: "Ernie's ruling" or the Foundry limit with its `[src:]` | review |
| Foundry source as `[src: <path>:<line>]` or `[src: <path>:<start>-<end>]`, the path under `resources/app/` | `l5r4/doc-format` |
| No `@see` links to `foundryvtt.com/api/`; the installed source is the reference (`roadmap/FOUNDRY-V14-REFERENCE.md`) | `l5r4/doc-format` |
| A roadmap reference names the decision that explains the behavior: `roadmap/STAGE-NN decision N` | review |
| An issue reference is `#N`, and only where the issue explains why the code is as it is | review |
| Templates use `{{!-- --}}`, never `<!-- -->`, which ships into the DOM | `tests/conventions/templates.test.js` |

A roadmap reference that only says when code was written (`(roadmap/STAGE-14)` in a file header) is history.

Conforming, the `honorRoll` setting in `registerWorldSettings` (`module/setup/settings/world.js`): the reference explains why the setting starts off.

```js
// The optional Honor Roll, off unless the GM turns it on (roadmap/STAGE-11 decision 3)
```

Not conforming (modeled): a parenthetical source path.

```js
 * ... ApplicationV2 merges every class's DEFAULT_OPTIONS up the chain and concatenates arrays
 * (client/applications/api/application.mjs:437-484), ...
```

Conforming form of the same reference, in the JSDoc of `BaseActorSheet.DEFAULT_OPTIONS` (`module/sheets/base-actor-sheet.js`):

```js
 * ... ApplicationV2 merges every class's DEFAULT_OPTIONS up the chain and concatenates arrays
 * [src: client/applications/api/application.mjs:437-484], so a class lists only its own entries; ...
```

Conforming deviation, modeled on the NPC Initiative ruling in CLAUDE.md **Domain Invariants**: the code site states what the code does where the book is silent, and its basis.

```js
// An NPC with no stored pool counts as Insight Rank 1 (Ernie's ruling).
// game-rules/31_combat_round.md, p.81
```

Not conforming (modeled): an issue number and the old version stand in for the reason, and a date stamps the ruling.

```js
// Fixed in 3.2.1 (#30); ruling of 2025-06-01.
```

## Where documentation lives

| What                              | Where                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| How one function or class behaves | Its JSDoc                                                    |
| Why one line is unusual           | An inline comment above it                                   |
| A project-wide rule               | `docs/code-system/` or `docs/design-system/`, in one place   |
| User-facing behavior              | `README.md`, `CHANGELOG.MD`, `ACTIVE_EFFECTS.md`             |
| A rule from the book              | Nowhere in the repo: cite `game-rules/` and the printed page |

`CLAUDE.md`, `CONTRIBUTING.md`, and `DEVELOPER.md` keep one-line rules and point here (Stage 17 decision 6).
