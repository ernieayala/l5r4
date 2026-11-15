# Stage 17: Design System and Code System

**Goal:** the project has two written systems: a **design system** for everything a user sees (foundations, components,
patterns, copy) with a living gallery inside Foundry, and a **code system** for everything a developer writes (a naming
dictionary, a domain glossary, code shapes, a test system). An automated check enforces each rule either system marks
as checkable. A multi-agent review-and-fix pass then brings the whole repo into line without changing behavior.
**Needs:** 1-16. The Stage 16 coverage report and a full Quench run give the behavior baseline this stage must keep;
the Stage 18 playtest then plays the result.

## Rules implemented

None. This stage changes no rule. Every fix keeps behavior, proven by the gate, `npm run coverage:check`, and the full
Quench run staying green with the pre-stage pass count.

## Why this stage exists

Sixteen stages built by feature, on top of a 3.x codebase, left the repo agreeing with itself only in parts. Seen on
2026-11-14 with Stage 15 in the working tree (counts from a read-only survey script over `module/`, `templates/`,
`scss/`, `lang/en.json`, and `tests/`; re-run it when the stage starts):

| Area | Inconsistency |
|------|---------------|
| Written conventions | Naming rules sit in `CONTRIBUTING.md:219-227`, `DEVELOPER.md:321-333`, and `CLAUDE.md` **Presentation**, five lines each, covering files, classes, functions, and constants only. Both contributor docs tell readers to run `npm run madge:check`, which `package.json` does not define (the script is `deps:circular`) |
| Quench batch ids | 87 batches in four schemes: `` `${SYS_ID}.kebab-case` `` (most), camelCase tails (`workflows.armorTNCalculation`, `services.familyBonus`, `workflows.traitFamilyBonus`), the id written out as `"l5r4-enhanced..."` instead of `SYS_ID` (4), and id segments that do not match the folder (`apps.emphasis-manager`, `apps.wound-config`, `apps.xp-manager` live in `tests/quench/sheets/`; `integration.*` and `resources.*` prefixes match no folder). `tests/quench/index.js` registers five batches inline beside the registration code |
| Quench batch labels | "L5R4:" in most, "L5R4 Enhanced:" in two; Title Case in the older batches ("Actor Wound System Tests"), sentence case in the newer ("Character options and rule authoring"); 44 end in "Tests"; notes in parentheses ("(Stage 10)", "(Phase 5)", "(fixture world only)", "(trainedEmphases Array)", "(links, request cards, effect panel, macros, floating numbers)"); "&", "+", and "and" used for the same join |
| Test names | 2441 `it` names in 125 files: 1766 start with "should", the rest with a present-tense verb or a noun; 157 start with a capital; 159 carry a page citation or issue number inside the name; 9 run past 100 characters |
| Test layout | `tests/integration/` holds six empty folders. `tests/unit/` mirrors `module/` only in part (`tests/unit/documents/trait-reading.test.js`, `tests/unit/utils/insight-rank.test.js` name no module file) |
| Rule citations | 306 `p.N`, 46 `pp.N-M`, 33 `Core Rulebook p.N`; only 17 also name the `game-rules/` file that CLAUDE.md **CITE THE RULE** asks for. Stage 16's `tools/coverage/citations.mjs` must accept every form |
| File names | 25 PascalCase files in `module/data/` (`ActorData.js`, `NpcData.js`, `RuleData.js`, ...) against the documented `kebab-case.js`. Mixins in both `module/mixins/` and `module/sheets/mixins/` |
| Function names | Service exports open with verbs (`roll`, `apply`, `spend`, `start`, `post`, `prompt`) and with nouns (`void…`, `skill…`, `ledger…`, `honor…`, `duel…`, `activation…`, `slot…`, `folder…`); predicates use `is` (89), `has` (12), `may` (7), `can` (2), and `needs` (2) with no rule between them |
| Code shape | 155 `_name` methods beside 11 `#name`, with no rule for Foundry's protected overrides versus the system's own private methods; 46 default exports beside 172 files with named exports only; 22 of 139 files import out of the order `CONTRIBUTING.md` documents; 15 of 550 exports have no JSDoc block |
| Identifiers for one concept | `armorTn` (47) and `armorTN` (7); `tn` (84), `TN` (5), and `targetNumber` (3); dice pools as `diceRoll`/`diceKeep` (53), `rollDice`/`keepDice` (14), and `rollKeep` (4) |
| Presentation in JavaScript | 21 HTML strings in 16 files, 5 `innerHTML` / `insertAdjacentHTML` writes, 23 class-based `querySelector` / `closest` calls in 13 files (CLAUDE.md **Presentation**: behavior selects with `[data-action]` and `data-*`), 1 `.style` write, 1 jQuery reference |
| Action names | About 200 kebab-case `data-action` uses in 35 templates, 15 camelCase in 7 (`rules/editor.hbs`, `apps/compendium-browser*.hbs`, `apps/effect-panel.hbs`, `apps/emphasis-manager.hbs`, `item/_partials/_tabs.hbs`, `item/_type-details/skill.hbs`). Core's own actions are camelCase (FOUNDRY-V14-REFERENCE.md §4.2) |
| Template classes | 261 distinct classes in 108 templates: 47 carry `l5r4-` (the newer apps, as `l5r4-effect-panel-row`); the older sheets use bare words (`wounds`, `grid`, `title`, `icon`) with dash modifiers (`-gap-sm`, `-compact`); both mix in core classes (`flexrow`, `form-group`). Font Awesome as `fas`/`far` (73) and `fa-solid` (35) |
| Tokens | 9 custom properties in all of `scss/`: the five Ring colors unprefixed and stored as RGB triplets (`--air-ring-color: 136, 158, 179`), beside `--l5r4-ring-rank-backdrop-*`. 17 hex and 3 `rgb()` literals; 147 `px` and 90 `rem` literals, with nine `rem` steps below 1 (0.1, 0.125, 0.15, 0.2, 0.25, 0.4, 0.5, 0.75, 0.85); 5 literal `z-index` values; 12 transitions and animations, none with `prefers-reduced-motion`; nesting up to six levels; one `[data-action]` selector |
| Stylesheet layout | `scss/_chat.scss` and `scss/_utilities.scss` sit at the top level while `scss/l5r4-enhanced.scss`'s header comment lists `utilities/` and `chat/` folders that do not exist; `components/`, `features/`, `apps/`, `sheets/` have no rule for which holds a new file |
| Copy | 963 keys in `lang/en.json`. Labels in Title Case (136 multi-word values) and sentence case (84); 104 values end with a period with no rule for which kinds do; 118 values repeated under several keys; "Void Point" and "void point", "Wound" and "wound" for the same game terms. Three top-level groups outside `l5r4.` (`SETTINGS`, `EFFECT`, `TYPES`; core requires `TYPES`); 97 PascalCase key segments in a camelCase tree |
| Lint | ESLint 0 errors, 112 warnings (107 `no-unused-vars`, 5 `no-console`). The gate passes on warnings, so those rules check nothing |
| Comments | 222 history words in `module/`, `templates/`, `scss/` (`legacy`, `previously`, `no longer`, `v13`, `3.2.1`); many are correct (the migrations describe 3.2.1 data), the rest break the **Clean Slate Rule** |
| Accessibility | No batch checks accessible names on icon-only buttons, focus styles, or contrast in either theme |

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|--------------------------------------------|
| Gallery window | `HandlebarsApplicationMixin(ApplicationV2)` (§4.1-4.4), as `module/apps/effect-panel.js` and `compendium-browser.js` use it |
| Opening the gallery from settings | `game.settings.registerMenu` (§10.2). Not yet used in this repo: check it with `/foundry-api` first |
| Action names | Keys of `DEFAULT_OPTIONS.actions`, values of `[data-action]` (§4.2) |
| Batch display names | Quench `registerBatch(key, fn, { displayName })` (§12) |
| Light and dark themes | Core's `.theme-light` / `.theme-dark` classes and color variables, as `scss/base/_variables.scss` uses them. Check the v14 variable names in the installed `resources/app/public/css/` with `/foundry-api` before building tokens on them |
| Icons | The Font Awesome version and style prefixes 14.370 ships (`fa-solid` versus `fas`). Check in the installed source |

## Deliverables

### 1. Design system (`docs/design-system/`)

A user-facing rule set, one file per section. Every page states the rule, shows a conforming and a non-conforming
example, names the tokens and partials involved, and names the check that enforces it, or says "review" when no check
can.

| File | Contents |
|------|----------|
| `README.md` | Principles (the L5R look the system has now, built on core's themes; readable first; the book's terms as the UI's terms; every state visible without color alone; works in light and dark), how the tiers fit together, how to add a component |
| `foundations/color.md` | Palette primitives named by hue and step, never by role, and role tokens built on them: surface, panel, line, text, muted text, accent, success, danger, info, and the domain roles (the five Rings, Wound Ranks, Void Points, Honor, Glory, Status, Taint, stance and condition colors). Each defined for both themes on top of core's variables. Every text/surface pairing with its contrast ratio in both themes (`tests/conventions/contrast.test.js`) |
| `foundations/typography.md` | The faces the system uses (core's `--font-h1` to `--font-h4`, body, monospace) and their jobs; a named type scale with size, line height, letter case, and when to use each; numbers (tabular figures for XkY pools, TNs, and Wound totals), truncation, wrapping |
| `foundations/space-and-size.md` | One space scale with even steps replacing the nine sub-`rem` values, one size scale (portraits, Ring medallions, icons, item rows), semantic spacing (gap, control, section, card padding), density for sheets, cards, and dialogs, the 24 px minimum target |
| `foundations/frames.md` | Borders, dividers, shadows, the parchment backdrop, and elevation levels (flat, raised, window, overlay); how a focused, selected, or disabled frame looks |
| `foundations/iconography.md` | The icon sets (Font Awesome in core's version and prefix, the Ring and asset icons in `assets/`), icon sizes as tokens, icon-only versus labelled controls, the icon core already uses for the same meaning, one icon per meaning across the system |
| `foundations/motion.md` | Durations and easing as tokens, what may animate (floating Wound and Void numbers, section expand, status masks), `prefers-reduced-motion` behavior for each |
| `foundations/layers.md` | Stacking-order tokens for the effect panel, floating text, and dialogs against core's layers, replacing the five literal `z-index` values |
| `foundations/states.md` | One look per state across all components: hover, focus-visible, active, selected, checked, disabled, read-only, invalid, warning, loading, empty, locked |
| `components/<name>.md` | One page per component (inventory below): purpose, anatomy, variants, every state, partial name and parameters, SCSS file, tokens it reads, keyboard and screen-reader contract, long-text behavior, do / don't |
| `patterns/sheets.md` | Sheet anatomy for PC, NPC, and item sheets: header, portrait, name, tabs, sections and their expand control, sort headers, empty sections, the Limited views (`pc-limited.hbs`, `npc-limited.hbs`), Observer views |
| `patterns/chat-cards.md` | Card anatomy: speaker, title, dice row with kept and dropped dice, TN and Raises, outcome, results per target, action buttons (damage, apply, Reduce with Void, undo), GM-only parts, whispered variants, request cards |
| `patterns/dialogs.md` | `DialogV2` dialogs, the check dialog with its modifier toggles, choice prompts, pickers with a route that needs no drag, confirmation and destructive actions |
| `patterns/panels-and-browsers.md` | The effect panel, the compendium browser, the rules editor, the managers (XP, wealth, emphasis, wound, armor, combat, condition) |
| `patterns/feedback.md` | Notifications (info, warning, error), inline warnings, empty states, disabled-with-reason tooltips, floating numbers |
| `content/voice.md` | UI copy: one letter case for labels and buttons (decision 4), the book's capitalized game terms (Void Points, Armor TN, Wound Rank, Insight Rank, School Rank, Free Raise) exactly as the glossary spells them, button labels as verbs, notification sentence shape, numbers and XkY notation, allowed abbreviations (TN, XP, NPC, PC), tooltips |
| `content/localization.md` | `lang/en.json` key structure (see the code system's naming), one key per meaning, interpolation names, plural forms, how a key rename reaches the five translations |

Component inventory to document (from `scss/components/`, `scss/features/`, and the partials in `templates/`, completed
by the survey): button, icon button, inline control, form field, grid, section and section title, expand control, item
row and item list, sort header, tabs, item header, Ring and Trait block, rank control, Void Point dots, Wound track,
Initiative block, Armor TN block, Fear block, spell slots, chat card, dice row, check card, request card, damage
result, effect prompt, flow card, item summary card, check dialog, ledger dialog, rules editor, effect panel, compendium
browser, inline link, floating number.

### 2. Living gallery (in Foundry)

| File | Does |
|------|------|
| `module/apps/design-gallery.js` | A GM-only ApplicationV2 window, opened from a settings menu button, rendering every component in every variant and state from fixture data, plus every foundation (swatches with contrast ratios in both themes, type scale, space scale, icons, frames) and one sample of each pattern (a sheet section, a chat card, a dialog, a panel row) |
| `module/config/design-gallery.js` | The fixture data: plain objects, no functions |
| `templates/apps/design-gallery/*.hbs` | One part per section. Composes the real partials, never copies their markup, so the gallery shows what the system ships |
| `module/setup/settings/` | The `registerMenu` entry that opens the gallery |
| `lang/en.json` | The gallery's strings |
| `tests/quench/design-gallery.js` | Batch `l5r4-enhanced.design-gallery`: the gallery opens, every registered partial and every `scss/components/` file has a gallery entry, every icon-only control has an accessible name, every focusable element shows a focus style, in light and dark themes |
| Gallery captures | Claude in Chrome captures each section, the PC, NPC, and item sheets, and one of each chat card, in light and dark themes, at the sheets' default width and at 420 px, **before the fix waves start**. Those captures are the reference: the pass may make the look consistent, never different in direction (decision 9) |

### 3. Code system (`docs/code-system/`)

| File | Contents |
|------|----------|
| `README.md` | How the parts fit; `CLAUDE.md`, `CONTRIBUTING.md`, and `DEVELOPER.md` keep one-line rules and point here for detail (decision 6) |
| `naming.md` | The naming dictionary: one row per identifier kind with its pattern, examples, and counter-examples. Files and directories per layer; classes; functions with a fixed verb vocabulary (decision 4: which verbs mean create, read, change, remove, roll, post a card, ask the GM, open a dialog, and which predicate prefix means what); `_name` for Foundry's protected overrides versus `#name` for the system's own private members; action handlers; constants; Config keys; `system` field names; flags; setting keys; GM query names; `data-action` names; `game.system.api` names; i18n key paths; SCSS files, classes, and tokens (`--l5r4-{category}-{name}`); template files and partial names; Quench batch ids and display names; test file names. The fixed names (decision 2) listed with why each stays |
| `glossary.md` | One row per game concept: the book's term and its `game-rules/` file and page (looked up with `/rule`, never from memory), the identifier stem in code, the i18n key, the UI label, and banned synonyms (for example, one stem for Armor TN, one for the target number, one pair for rolled and kept dice). Terms and page numbers only, never a definition from the book (CLAUDE.md **Licensed material**). Read by the glossary check |
| `modules.md` | Module shape: the import groups in layer order, then constants, then exports, then private helpers; one responsibility per file; size limits per layer; when a folder splits; default versus named exports per layer; where mixins live |
| `functions.md` | Parameters (an options object past two), return shapes for "result or problem", async rules, early returns, no flag parameters that switch behavior |
| `documentation.md` | One JSDoc template: summary line, `@param`, `@returns`, and one citation line in one format, `game-rules/<file>.md, p.<pages>` (Stage 16's parser narrows to it; pack data keeps its "Core Rulebook p.N" citation). Comment rules: why, never what; recorded deviations; Foundry source references as `[src: path:line]`; no history (**Clean Slate Rule**) |
| `foundry-patterns.md` | Member order in an ApplicationV2 class (`DEFAULT_OPTIONS`, `PARTS`, `TABS`, getters, `_prepareContext`, `_preparePartContext`, `_onRender`, actions, private helpers); data model order (`defineSchema`, `migrateData`, `prepareBaseData`, `prepareDerivedData`, getters); rule model shape (`module/data/rules/`); service shape for GM queries; chat card registration; settings registration; migrations |
| `templates-and-styles.md` | Template structure (root element, partial parameters, `data-*` for behavior, classes for CSS only, no inline styles, no HTML built in JavaScript), SCSS file layout (what goes in `base/`, `components/`, `features/`, `apps/`, `sheets/`; one component per file; nesting depth; selector order), where a new style goes |
| `testing.md` | The test system (below) |
| `git.md` | The release branch and stage commits, conventional commit subjects, what a commit holds, no Claude attribution (memory `no-claude-attribution-in-l5r4`) |

The test system (`testing.md`):

| Rule | Detail |
|------|--------|
| File layout | Vitest files mirror `module/`: `tests/unit/<path>.test.js` for `module/<path>.js`. Repo-level checks (`lang`, `manifest`, `packs`) in `tests/*.test.js`, convention checks in `tests/conventions/`. No empty folders |
| Batch id | `l5r4-enhanced.<kebab-case>` built from `SYS_ID`, one batch per file, the file name the id's last segment, the folder its middle segments |
| Batch display name | Required on every batch: `L5R4: <Feature in sentence case>`. No stage or phase numbers, no notes in parentheses, no "Tests" suffix, "and" for joins |
| `describe` | The unit or feature under test, as a noun phrase: "Spell casting", "Damage and Reduction" |
| `it` | One behavior, readable after "it", in the form decision 4 picks ("should …" or a present-tense verb). At most 100 characters (decision 8) |
| Citations | On the line above the test as `// game-rules/33_wounds.md, p.82` or `// #46`, never in the name. Stage 16's parser reads them from there |
| Book examples | `describe("Book example: <name> (p.<page>)")` for worked examples, so they are findable as a group |
| Fixtures and cleanup | Document names prefixed with the batch's display name, one `cleanTest` helper (`tests/quench/helpers.js`), no leftovers in the world |

### 4. Checks

Each check runs inside an existing gate script (`npm run test` or `npm run lint`), so CI needs no new step. Each check
ships with a fixture it fails on. No check adds a dependency (decision 5).

| Check | Tool | Enforces |
|-------|------|----------|
| Names on disk | Vitest `tests/conventions/names.test.js` | `naming.md` file and directory rules, the `_` partial prefix in `scss/` and template `_partials/`, nesting depth, redundant prefixes, no empty folders |
| File size | Vitest `tests/conventions/size.test.js` | Per-layer soft limits; an over-limit file needs a reason in `tests/conventions/exceptions.json` |
| Layer boundaries | ESLint `no-restricted-imports` / `no-restricted-globals` per directory, beside `npm run deps:circular` | CLAUDE.md **Layers** and its import rules |
| Import order, module shape, member order | Local ESLint rules in `tools/eslint/` | `modules.md`, `foundry-patterns.md` |
| Identifier names and verb vocabulary | ESLint core `camelcase`, `new-cap`, plus a local rule reading the verb list from `naming.md`'s source table | `naming.md` |
| Glossary | Vitest `tests/conventions/glossary.test.js` | Banned synonyms absent from identifiers, i18n keys, and `lang/en.json` values; glossary terms capitalized as the book does |
| Deprecated Foundry APIs | ESLint `no-restricted-properties` / `no-restricted-syntax` | CLAUDE.md **Foundry Integration** "Not" column (global `Dialog`, `renderTemplate`, `mergeObject`, `game.i18n.format`, `CHAT_MESSAGE_TYPES`, `rollMode`) |
| Presentation in JavaScript | ESLint `no-restricted-syntax` | No HTML strings, no `innerHTML` or `insertAdjacentHTML`, no `.style` writes, no class or id selectors in `querySelector*` / `closest`, no jQuery |
| JSDoc and citation format | Local ESLint rule | `documentation.md`: JSDoc on every export, one citation format |
| Templates | Vitest `tests/conventions/templates.test.js` | No `style=` or `on*=`; no text outside `{{localize}}`; system classes carry `l5r4-` (decision 4); markup used twice is a registered partial; interactive elements carry `data-action` or are native controls; icon-only buttons carry an accessible name; one Font Awesome prefix |
| Action names | Vitest `tests/conventions/actions.test.js`, reusing Stage 16's collector (`tools/coverage/actions.mjs`) | One casing for every `data-action` and `DEFAULT_OPTIONS.actions` key; every template action has a handler; fixed card actions exempt by name |
| Stylesheets | Stylelint (`.stylelintrc.json`) plus Vitest `tests/conventions/styles.test.js` | Selectors on `l5r4-` classes, none on `[data-action]`; one component per file; class names per `naming.md`; no literal colors, `z-index`, or off-scale spacing outside `base/`; every token used is declared, every declared token is used and documented in `docs/design-system/foundations/`; every animation has a `prefers-reduced-motion` rule |
| Contrast | Vitest `tests/conventions/contrast.test.js` | Every documented text/surface pairing meets its ratio in both themes |
| Design system completeness | Vitest `tests/conventions/design-system.test.js` | Every registered partial and every `scss/components/` file has a `components/<name>.md` page and a gallery entry; every page names only partials and tokens that exist |
| Copy | `tests/lang.test.js` (extend) | `voice.md` rules a pattern can test: the chosen letter case on labels, no trailing period on buttons and labels, the period on notifications, keys sorted in a group, key paths per `naming.md`, every translation key present in `en.json` |
| Tests | Vitest `tests/conventions/tests.test.js` | Batch id and display name pattern, `it` names in the chosen form and under the limit, no citation inside a test name, Vitest file mirrors a module file |
| Lint warnings | `eslint.config.mjs` | Every rule set to `warn` moves to `error` once its count is zero (decision 12) |
| Whitespace | `.editorconfig`, Prettier (`npm run format:check`) | Already enforced |

### 5. Multi-agent review and fix pass

Run with the Workflow tool. Ernie asked for this stage to use as many agents as can work without breaking things
(2026-11-14). Parallelism is bounded by file ownership, not by agent count; the test-name and template work splits
into many small disjoint partitions.

| Wave | Agents | Writes | Output |
|------|--------|--------|--------|
| 1 Survey | One read-only agent per area: each `module/` layer (`data`, `documents`, `services`, `sheets`, `apps`, `utils` with `config`, `setup` with `hooks`), `templates/`, `scss/`, `lang/`, `tests/quench/`, `tests/unit/` and repo tests, `tools/` with `scripts/` and the docs | Nothing | Conventions the code follows, with counts; every departure. Feeds the two systems' first drafts |
| 2 Decide | The coordinator | `docs/` drafts | Split conventions listed for Ernie (decision 4) before any fix |
| 3 Review | One read-only agent per area and dimension (naming, glossary, structure, documentation, presentation, copy, tests, accessibility), given the systems and the check output, not the survey's conclusions | Nothing | Findings with file, line, rule, and proposed fix |
| 4 Verify | One adversarial agent per finding batch | Nothing | Each finding confirmed, rejected, or flagged as behavior-changing (dropped and sent to Ernie) |
| 5 Fix | One agent per ownership partition, in parallel, each in its own git worktree | Only its partition's files | A diff per partition with its scoped Vitest and ESLint clean |
| 6 Gate | The coordinator, alone | Reverts a failing partition | Full gate after each merge; a breaking partition is reverted and redone serially |
| 7 Diff review | One read-only agent per partition diff | Nothing | Any change to behavior, a fixed name, or a public API is reverted |
| 8 Visual review | One agent per gallery section and sheet, comparing new captures with the pre-stage captures and the design system | Nothing | Visual findings fed back into wave 5 |

| Ownership rule | Detail |
|----------------|--------|
| Disjoint files | Each partition is a set of files no other partition touches in that wave |
| Shared files have one owner | All six `lang/*.json` files (one owner, so a key rename reaches every translation), `scss/base/_variables.scss`, `scss/l5r4-enhanced.scss`, `module/config/`, `module/config/templates.js` with `module/setup/preload-templates.js`, `eslint.config.mjs`, `.stylelintrc.json`, `system.json`, `package.json`, `CLAUDE.md`, each `docs/` file, the Stage 16 coverage manifest. Others send change requests; the owner applies them next wave |
| Cross-file moves are serial | A rename or move updates every import, template path, `DEFAULT_OPTIONS.actions` key, Quench `runEveryAction` list, and coverage manifest entry, so the coordinator makes them one at a time between waves, each followed by the gate |
| Test files are their own partitions | Each Quench batch file and each Vitest folder is a partition, so test renaming runs widest |
| Generated files are never edited | `dist/l5r4-enhanced.css` is rebuilt by `npm run build:css` after the SCSS partitions merge; `packs/` by `npm run build:packs` |

### 6. Run to green

| Step | Result |
|------|--------|
| Baseline | Before wave 1: gate output, `npm run coverage` report, full Quench pass count with Sequencer and JB2A active, and the pre-stage captures, recorded in the PR #39 checklist |
| Checks in report mode | Each check lists violations without failing; first-run counts go in the PR #39 checklist |
| Fix waves | Waves 3-8 repeat until every check reports zero or a recorded exception |
| Checks enforce | Each check switches to failing the gate |
| Behavior proof | Gate, `npm run coverage:check` with zero gaps, one full Quench run across all batches with the pre-stage pass count plus the new batch, zero console errors and deprecation warnings from `l5r4-enhanced`, the `world-upgrade` batch in the 3.2.1 fixture world |

## Automation boundary

| Checked by the tools | Left to review or to Ernie |
|----------------------|----------------------------|
| Names, sizes, layer imports, module and member order, deprecated APIs, JSDoc and citation format, template and SCSS structure, token use, contrast, glossary terms, copy rules a pattern can test, test names, design-system completeness, accessible names on icon-only controls | Whether a name is clear, whether a component looks right, whether two near-duplicates should merge, tone of copy, history in comments that the migrations need |
| That fixes leave the gate, coverage, and Quench results unchanged | Every split convention (decision 4); every exception in `exceptions.json`; visual sign-off on the gallery and the sheets |

## Acceptance

### Vitest

| Case | Source |
|------|--------|
| Each check fails on its violating fixture and passes on a conforming one | Decision 1 |
| `size.test.js`: an over-limit file listed in `exceptions.json` passes; removing the entry fails | Decision 3 |
| `tests.test.js`: a batch without a display name, an `it` name in the wrong form, and a citation inside a name each fail | `testing.md` |
| `glossary.test.js`: an identifier using a banned synonym fails | `glossary.md` |
| `design-system.test.js`: a component file with no page fails | Decision 7 |
| `actions.test.js`: an action in the wrong casing fails; a fixed card action passes | Decision 2 |
| `contrast.test.js`: a pairing under its ratio in either theme fails | `foundations/color.md` |
| `lang.test.js`: a key renamed in `en.json` but not in a translation fails | `content/localization.md` |

### Run

- [ ] Baseline recorded: gate, coverage report, Quench pass count, pre-stage captures.
- [ ] Survey done; every split convention decided by Ernie.
- [ ] `docs/design-system/` and `docs/code-system/` written; every component in the inventory has a page.
- [ ] Gallery opens from settings and shows every component, state, and foundation in both themes;
  `l5r4-enhanced.design-gallery` passes.
- [ ] Every check built with a failing fixture; first-run violation counts in the PR #39 checklist.
- [ ] Every check at zero or a recorded exception, and enforcing in the gate; ESLint and Stylelint at zero warnings.
- [ ] Every Quench batch has an id and display name per `testing.md`; no test name over the limit or carrying a
  citation.
- [ ] `CONTRIBUTING.md`, `DEVELOPER.md`, and `CLAUDE.md` point to `docs/` and name no script `package.json` lacks.
- [ ] Gate passes locally and in CI; `npm run coverage:check` shows zero gaps.
- [ ] Full Quench run: pre-stage pass count plus the gallery batch, zero console errors from `l5r4-enhanced`;
  `world-upgrade` passes in the fixture world.
- [ ] Captures reviewed against the pre-stage captures; Ernie signs off the look.
- [ ] No fixed name changed, or each change ships a migration Ernie approved.
- [ ] `CHANGELOG.MD` lists every renamed CSS class, token, and `game.system.api` name a module or world CSS could use.

## Decisions

1. Every check is proven by a fixture it fails on (CLAUDE.md **Testing and the Gate**).
2. Names stored in world data or used outside the system stay as they are: `system` fields, flags, setting keys
   (`LtException` included), document and chat message subtypes (`commonItem`, `bow`, `roll`, `checkRequest`) and the
   template files named after them, status effect ids, rule keys, pack ids and entry ids, GM query names, the
   `game.system.api` names hotbar macros call, the text link syntax stored in journals (`@Check[...]` and the rest),
   and the `data-action` names and CSS classes inside chat cards already posted, whose HTML is stored in the message.
   The system id stays (X1). The code system records them as fixed names and the checks exempt them. Token names,
   other CSS classes, file names, function names, i18n keys (carried to every translation), and test names are not
   stored and may change.
3. Soft limits stay soft: a file over its limit is allowed with a written reason. A split happens for a second
   responsibility, not to meet a number.
4. The systems describe what the code already does where it agrees with itself. Where it splits, Ernie picks before
   the fix waves start. Known splits: `data-action` casing (kebab-case in about 200 uses, camelCase in 15 and in
   core); template class scheme (`l5r4-` prefixed blocks versus bare words with dash modifiers); `it` names ("should
   …" in 1766, a present-tense verb in the rest); label letter case (Title Case versus sentence case); the verb
   vocabulary and predicate prefixes; the identifier stems for Armor TN, target number, and dice pools; token names
   and the space scale.
5. No new dependency without Ernie's approval (CLAUDE.md **Change Control**). Checks use ESLint core rules, local
   rules in `tools/eslint/`, Stylelint with its approved plugins, and Vitest; Still open items 1, 2, and 4 ask about
   the rest.
6. The systems live in `docs/`, not `roadmap/`: they describe the code that ships and carry no book text. `CLAUDE.md`,
   `CONTRIBUTING.md`, and `DEVELOPER.md` keep one-line rules and point to `docs/` for detail; a rule's detail lives in
   one place. `docs/` stays off the Stage 19 release allowlist.
7. The gallery composes the real partials, so a component without a gallery entry or a page fails the gate. The
   gallery ships, GM-only, from the settings menu.
8. Test names: at most 100 characters, so names fit the Quench runner at its default width; the citation moves to a
   comment above the test.
9. The system has no mock-up to design toward, so the pre-stage captures are the visual reference: the pass unifies
   tokens, spacing, states, and icons, and changes no layout or visual direction. Visual review is by eye against
   committed captures until Still open item 4 is answered.
10. The pass changes no behavior (CLAUDE.md **PORT KEEPS BEHAVIOR** applied to this stage). A finding that needs a
    behavior change, or a rule bug a reviewer finds, becomes a GitHub issue with its printed page, fixed in its own
    change with a failing test first.
11. Agent count follows the ownership partitions. The coordinator alone runs the gate, applies shared-file requests,
    and makes cross-file moves.
12. A rule enforced as a warning enforces nothing, because the gate passes on warnings; once a rule's count is zero
    it becomes an error. Basis: the 112 ESLint warnings the gate passes today.
13. The stage runs after the Stage 16 coverage audit, so the coverage manifest and a full Quench run give the
    behavior baseline, and before the Stage 18 playtest, so play exercises the result. Basis: Ernie, 2026-11-14.

### Still open

1. Approve `eslint-plugin-jsdoc` (Crucible's choice, FOUNDRY-V14-REFERENCE.md §13) for the JSDoc and citation check,
   instead of a local rule in `tools/eslint/`?
2. Approve `@html-eslint/eslint-plugin` with its parser (Draw Steel's choice for `.hbs`) for the template check,
   instead of the Vitest scan?
3. Raise the Workflow size setting ("Dynamic workflow size" in `/config`) for this stage, or keep the default (under
   10 agents) and run more waves?
4. Approve `pixelmatch` and `pngjs` as dev dependencies for automated visual diffs of the captures, with baselines
   committed under `tests/visual/`?

## Out of scope

| Item | Where |
|------|-------|
| Behavior changes, rule fixes, new features | Their own issues, filed as findings (decision 10) |
| Rule coverage and citation correctness | Stage 16 (this stage narrows the citation format only) |
| Playing the system end to end | Stage 18 |
| A new visual direction | Not planned (decision 9) |
| Book-text sweep and release allowlist | Stage 19 |
| Renaming fixed names | Not planned (decision 2) |
