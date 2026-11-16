# Testing

How tests are laid out, named, cited, and cleaned up. Vitest covers rule math and pure services in Node; Quench covers
behavior inside Foundry (CLAUDE.md **Testing and the Gate**). Each rule names its check; "review" means no tool can
check it. Most checks are in `tests/conventions/tests.test.js`.

## The test system

| Rule                 | Detail                                                                                                                                                                                                                                                          | Check                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| File layout          | Vitest files mirror `module/`: `tests/unit/<path>.test.js` for `module/<path>.js`. Repo-level checks (`lang`, `manifest`, `packs`, `coverage`) in `tests/*.test.js`, convention checks in `tests/conventions/`, fixtures in `tests/fixtures/`. No empty folders | `tests/conventions/tests.test.js`, `tests/conventions/names.test.js` |
| Batch id             | `` `${SYS_ID}.<folder>.<file-stem>` `` built from `SYS_ID`, kebab-case, one batch per file. The file name is the id's last segment and the folder under `tests/quench/` its middle segments; a top-level file has none                                          | `tests/conventions/tests.test.js`                                    |
| Batch display name   | Required on every batch: `L5R4: <Feature in sentence case>`. No stage or phase numbers, no notes in parentheses, no "Tests" suffix, "and" for joins                                                                                                             | `tests/conventions/tests.test.js`                                    |
| `describe`           | The unit or feature under test, as a noun phrase in sentence case, game terms keeping the book's capitals (Stage 17 decision 16): "Spell casting", "Damage and Reduction". A Vitest file's top-level `describe` is the exported name it tests: `buildPool`      | `tests/conventions/tests.test.js`                                    |
| `it`                 | One behavior, readable after "it", starting "should" (Stage 17 decision 15). At most 100 characters (decision 8). Unique within its `describe`                                                                                                                  | `tests/conventions/tests.test.js`                                    |
| Citations            | On the line above the test as `// game-rules/33_wounds.md, p.82` or `// #46`, never in the name. Stage 16's parser reads them from there                                                                                                                        | `tests/conventions/tests.test.js`, `l5r4/doc-format`                 |
| Book examples        | `describe("Book example: <name> (p.<page>)")` for worked examples, so they are findable as a group                                                                                                                                                              | `tests/conventions/tests.test.js`                                    |
| Fixtures and cleanup | Document names prefixed with the batch's display name, one `cleanTest` helper (`tests/quench/helpers.js`), no leftovers in the world                                                                                                                            | review                                                               |

Game terms inside names keep the book's capitals (Void Point, Free Raise, Insight Rank, School Rank, Wound Rank), as
`glossary.md` spells them (`tests/conventions/glossary.test.js`).

## Files

### Vitest

| Rule                                                                                                                        | Check                             |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A `tests/unit/` file imports the module file its path mirrors; a test of a local copy of module code is not a test          | `tests/conventions/tests.test.js` |
| File names are kebab-case `<module-file>.test.js`                                                                           | `tests/conventions/names.test.js` |
| Test functions are imported by name from `"vitest"`, in alphabetical order: `import { describe, expect, it } from "vitest"` | review                            |
| No header block; the path says what the file covers                                                                         | review                            |
| A Foundry global a test needs is stubbed as `global.<Name> = ...` and removed in `afterEach`; Utils need none               | review                            |
| No test of Vitest itself                                                                                                    | review                            |

Picked by majority: alphabetical imports (29 of 42 files), no header (30 of 42), `global.<Name>` stubs (3 of 4).

Conforming, `tests/unit/utils/check.test.js:1-14`: `buildPool` from `module/utils/check.js`, in
`tests/unit/utils/check.test.js`.

Not conforming (modeled): a test that copies the function it checks into the test file and imports no module file;
`tests/unit/services/formatter.test.js` for `module/services/xp/formatter.js`, which drops the `xp/` folder.

### Quench

| Rule                                                                                                                                                                                                                                                              | Check                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Plain `.js` with no `.test` suffix, so Vitest never collects it                                                                                                                                                                                                   | `tests/conventions/names.test.js` |
| Folder: the `module/` layer of the code under test (`apps/`, `sheets/`, `services/`, `documents/`); `workflows/` for a feature driven through several layers; the top level for system-wide batches (`smoke`, `deprecations`, `world-upgrade`, `rules`, `combat`) | `tests/conventions/tests.test.js` |
| The file exports one `register<Feature>Tests(quench)`, which `tests/quench/index.js` imports and calls                                                                                                                                                            | `tests/conventions/tests.test.js` |
| `tests/quench/index.js` registers no batch itself                                                                                                                                                                                                                 | `tests/conventions/tests.test.js` |
| The file opens with a block comment saying what the batch covers, before the imports; no `@fileoverview`                                                                                                                                                          | review                            |
| Flags and settings are read with `SYS_ID`, never the literal `"l5r4-enhanced"`                                                                                                                                                                                    | review                            |
| Controls are found by `[data-action]`, `[data-*]`, or `[name]`, never by class (`templates-and-styles.md`)                                                                                                                                                        | ESLint `no-restricted-syntax`     |

Picked by majority: `register<Feature>Tests` (66 of 82 files), a header block before the imports (56 of 85 files).

## Batch ids and display names

```js
export function registerFearTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.services.fear`,
    context => {
      /* ... */
    },
    { displayName: "L5R4: Fear" }
  );
}
```

Conforming id, `tests/quench/services/fear.js:25`. Conforming display name, `tests/quench/rules.js:884`:
`"L5R4: Rule engine"`.

| Not conforming                                 | Where                                                   | Why                                                        |
| ---------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `` `${SYS_ID}.workflows.armorTNCalculation` `` | `tests/quench/workflows/armor-tn-calculation.js:32`     | camelCase segment; the file stem is `armor-tn-calculation` |
| `"l5r4-enhanced.wealth-manager"`               | `tests/quench/apps/wealth-manager.js:17`                | Literal id, and the `apps` segment missing                 |
| `` `${SYS_ID}.resources.void-points` ``        | `tests/quench/services/void-points.js:31`               | `resources` matches no folder                              |
| `` `${SYS_ID}.services.rolls.skill` ``         | `tests/quench/services/skill-rolls.js:26`               | The last segment is not the file stem                      |
| `"L5R4: Fear System Tests"`                    | `tests/quench/services/fear.js:278`                     | Title Case and a "Tests" suffix                            |
| `"L5R4: Combat loop (Stage 10)"`               | `tests/quench/combat.js:1003`                           | A stage number in parentheses                              |
| `"L5R4: Rest & Healing Tests"`                 | `tests/quench/services/rest.js:272`                     | `&` for a join                                             |
| `"L5R4 Enhanced: ..."`                         | `tests/quench/workflows/status-effects-workflow.js:228` | The prefix is `L5R4:`                                      |

## `describe` and `it`

| Rule                                                                                               | Check                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `it` starts with lowercase "should", then a verb: "should spend the slot from the stored count"    | `tests/conventions/tests.test.js`           |
| At most 100 characters                                                                             | `tests/conventions/tests.test.js`           |
| No page, issue, stage, decision, backlog tag (`B2`), plan number (`4.1.1`), or note in parentheses | `tests/conventions/tests.test.js`           |
| No history: no "regression", "Bug Report", "bug fix"                                               | `tests/conventions/tests.test.js`           |
| Unique within its `describe`                                                                       | `tests/conventions/tests.test.js`           |
| `describe` in sentence case, game terms capitalized as the book does                               | `tests/conventions/tests.test.js`           |
| No `it.only`, `it.skip`, `describe.only`, `describe.skip`                                          | `tests/conventions/tests.test.js`           |
| Arrow callbacks; `async function ()` only where the body calls `this.timeout()`                    | review                                      |
| A timeout is a literal with numeric separators: `this.timeout(30_000)`                             | review                                      |
| Name strings in double quotes, never a template literal                                            | Prettier, `tests/conventions/tests.test.js` |

Sentence case for Quench `describe` names is Stage 17 decision 16, against the Quench majority (369 Title Case
against 64 sentence case), so they match the display names. The Vitest top-level identifier form is that area's majority (about 100 of 122 top-level
`describe` names). Picked by majority: arrow callbacks (1399 of 1429), literal timeouts (55 of 76).

Conforming, `tests/quench/services/fear.js:30`:

```js
it("should calculate TN for Fear Rank 1", () => {
```

Not conforming:

| Name                                                                              | Where                                                    | Why                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `"rolls Skill + Trait and keeps the Trait (p.79: Kyujutsu 4, Reflexes 3 is 7k3)"` | `tests/unit/utils/check.test.js:15`                      | No "should"; a citation and a worked example in the name |
| `"12k4 becomes 10k5"`                                                             | `tests/unit/utils/ten-dice.test.js:6`                    | Not readable after "it"                                  |
| A 114-character name ending "(Ernie's ruling)"                                    | `tests/quench/combat.js:384`                             | Over 100 characters, a note in parentheses               |
| `"should handle negative modifiers"` twice                                        | `tests/quench/documents/combat-modifiers.js:206`, `:303` | Not unique                                               |

## Citations

A test of a rule cites the rule on a comment line above the `it` or `describe`, in the format of `documentation.md`
**Citations**. An issue a test pins is cited the same way.

Conforming, modeled on `tests/unit/utils/check.test.js:58`:

```js
// game-rules/26_special_dice_rules.md, p.77
it("should apply the Ten Dice Rule after every modifier", () => {
```

Not conforming, `tests/unit/utils/check.test.js:49`: `it("adds a Void Point as +1k1 (p.78)", ...)`.

## Book examples

Every worked example the book prints for a rule the code implements is a test (CLAUDE.md **Game Rule Integration**),
grouped in one `describe` per example.

Conforming, modeled on `tests/unit/utils/ten-dice.test.js:5-6`:

```js
describe("Book example: the Ten Dice Rule (p.77)", () => {
  it("should turn 12k4 into 10k5", () => {
```

Not conforming, `tests/unit/utils/ten-dice.test.js:5`: `describe("the book's examples (Core Rulebook p.77)")`.

## Fixtures and cleanup

| Rule                                                                                                                                                                                          | Check  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Actors come from `createTestPC` / `createTestNPC` (`tests/fixtures/actor-fixtures.js`), items from `tests/fixtures/item-fixtures.js`                                                          | review |
| A document's name starts with the feature in the batch's display name: `"Rule engine: shugenja"`                                                                                              | review |
| A test that touches the world runs inside `cleanTest(assert)` (`tests/quench/helpers.js:258`), which fails it on a console error or warning, an error notification, or an unhandled rejection | review |
| Every document a test creates is tracked and deleted in `afterEach` or `after`, never at the end of the test body                                                                             | review |
| Chat messages are deleted after `settleChatNotifications()` (`tests/quench/helpers.js:208`)                                                                                                   | review |
| Roll dialogs are answered through `answerCheckDialog`, `autoAnswerRolls`, or `guardRolls` (`tests/quench/helpers.js`), not a per-file copy                                                    | review |
| A full Quench run leaves no world document it made                                                                                                                                            | review |
| A new test fails without the change it covers (CLAUDE.md **Testing and the Gate**)                                                                                                            | review |

Picked by majority: the fixture factories (66 files against 4 calling `Actor.create`), the `helpers.js` dialog
answerers (36 uses against 8 local copies).

Conforming, `tests/quench/rules.js:112-121`: `cleanTest`, a tracked list, and an `afterEach` that deletes it.

```js
const clean = cleanTest(assert);
const actors = [];
const track = actor => (actors.push(actor), actor);

afterEach(async () => {
  for (const actor of actors.splice(0)) {
    await actor.delete();
  }
});
```

Not conforming, `tests/quench/workflows/melee-damage-strength.js:77`: the actor is deleted at the end of the test body,
so a failed assertion leaves it in the world.
