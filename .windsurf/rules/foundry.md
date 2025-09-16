---
trigger: always_on
---

CRITICAL: Before every MultiEdit tool call, you MUST verify the file_path parameter contains the complete absolute path starting with c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4\ and ending with the specific filename.extension. Never submit a MultiEdit call with a truncated or incomplete path.
Always ignore node_modules, never look in that folder.
We are using Foundry VTT v13.
We are working on the System Legend of the Five Rings 4th edition.
The rules follow Legend of the Five Rings 4th edition TTRPG, when we are discussing rules, reference the doc file in the project files.
Game system is a zip in the project files.
Always reference https://foundryvtt.com/api/ when I'm asking you to do tasks.
Always open the zip on response.
Always deeply review the zip on first chat message.
Only change the things that need to be changed.
No “helpful” refactors unless you ask for them.
Use JSDoc-style block comments in code.
Follow the DRY method when coding.
Never give me downloadable items.
Always provide a diff for any changes.
In the very first message what we start a new chat thread, say "I read all your instructions Ernie." to know that you read through all my instructions.

---Core Mechanics---
Trait Rolls
Roll and keep your Trait: XkX (X = Trait rank).
Tens explode.
You can declare Raises (+5 TN each) for extra precision/effects.
Used for raw ability: resisting, lifting, noticing, Willpower checks.
Spending Void: +1k1 to the roll.

Skill Rolls
Roll (Skill + Trait)k(Trait).
Tens explode.
Declare Raises before rolling (+5 TN each). Raises buy added effect, called shots, or higher difficulty.
Emphasis: re-roll 1s when applicable.
Mastery Abilities unlock at ranks 3/5/7/9.
Untrained rolls usually allowed but may be penalized or forbidden for some High/Low skills.

Spellcasting
Casting roll: (Ring + School Rank)k(Ring) using spell’s Ring.
Must meet or exceed spell’s base TN.
Casting time: often Complex, sometimes Simple; rituals may take longer.
Raises (+5 TN each) may add targets, area, duration, or spell-specific effects.
If disrupted while casting, make Concentration check; fail = wasted action/spell.
Schools may give Affinities (easier) or Deficiencies (harder) for certain Elements.

Character Advancement (XP Spending)
Traits: Cost = 4 × new rank. E.g. Reflexes 2→3 = 12 XP. Rings rise if both Traits increase.
Void: Cost = 6 × new rank. E.g. Void 2→3 = 18 XP.
Skills: Cost = next rank. E.g. 2→3 = 3 XP. New Skill rank 1 = 1 XP. Emphasis = 2 XP.
Advantages: Pay listed XP.
Disadvantages: Gain listed XP, max 10 XP from Disadvantages.
Other Abilities: Some campaigns allow Kata, Kiho, etc., bought with XP.
Limits: Starting characters may begin with Traits or Skills above 4.

PROJECT-WIDE JAVASCRIPT INSTRUCTIONS
Reference: https://foundryvtt.com/api/

CORE RULES FOR ALL MODULES
Separation of concerns:
Documents (Actor/Item) compute and own rules plus derived data.
UI modules (sheets, applications) render and dispatch user actions only.
Services (dice, chat) construct rolls and chat content.
Utilities (utils, config) provide pure helpers and constants.

Imports:
Order imports as: external → shared internal (config, utils) → feature modules → file-local helpers.
Leave one blank line between groups. No duplicate imports.

Side effects:
No side effects at import time except explicit registrations (settings, templates).
Prefer exported setup functions that are called from your system entrypoints.

Flags and settings:
Flags live under flags[SYS_ID].camelCaseKey.
Read game.settings.get(SYS_ID, key) defensively. Provide safe defaults. Never throw if missing.

Naming:
camelCase for variables and functions. UPPER_SNAKE_CASE for constants. Booleans start with is/has/can.
Data attributes in DOM use kebab-case (example: data-action="roll-skill").

JSDoc:
Each file starts with a short banner describing purpose, responsibilities, and relevant Foundry APIs.
Public functions and overrides include @param and @returns. Add small @typedef blocks for the subset of data you touch.

Async and errors:
Always await async helpers and document updates before reading state.
Wrap risky awaits in try/catch. Use console.warn("L5R4", message, { context }) for recoverable issues.

Defensive coding:
Use optional chaining and defaults (example: obj?.x ?? fallback).
Validate IDs from DOM or drag data before use.
Never assume a flag or setting exists.

LINT AND FORMATTING (APPLIES EVERYWHERE)
indent: 2 spaces
quotes: "double"
semicolons: required
comma-dangle: never
arrow-parens: as-needed
brace-style: 1tbs
curly: all
eqeqeq: always
no-var; prefer-const
keyword-spacing: enabled
object-curly-spacing: always
array-bracket-spacing: never
eol-last: always
no-trailing-spaces: enforced
linebreak-style: unix
no unused imports or vars; prefix intentionally unused args as _arg

MODULE GUIDELINES BY FILE TYPE
Documents (e.g., module/L5R4Actor.js, module/L5R4Item.js):
Compute all rules and derived values in _preCreate and prepareDerivedData (or _prepareData on older patterns).
Expose everything sheets need under document.system or flags[SYS_ID].
No DOM access. No sheet-specific logic.

Sheets (e.g., module/sheets/*.js):
Base classes: ActorSheetV2 or ItemSheetV2 (Foundry v13).

Override only:
static DEFAULT_OPTIONS for title, classes, tabs, size
_prepareContext(context) to shape safe data for templates
_onRender(context, options) to wire delegated events on the root element
_prepareSubmitData(formData) or _processSubmitData(submission) to coerce outgoing data

Event delegation:
Delegate on the sheet root element; do not bind individual buttons.
Use data-action, data-id, data-type attributes.
Do not recompute stats. If a value is missing, add it to the document class first and then read it in the sheet.
Dice and Chat (e.g., module/dice.js, module/chat.js):
Centralize roll construction, TN math, raises, exploding dice, and chat card rendering.
Accept plain inputs { actor, itemId, trait, skill, options }. Return results and render chat.
No DOM queries. No sheet assumptions. All user-visible strings must go through i18n.
Config and Utils (e.g., module/config.js, module/utils.js):
config.js holds constants, ids, option lists, and i18n key bases. Avoid runtime logic.
utils.js contains pure helpers. If a helper touches Foundry globals, document it clearly.
Preload and Registration (e.g., module/preload-templates.js, system init):
Registrations are the only allowed import side effects:
Settings via game.settings.register(SYS_ID, ...)
Template preloading called from your init hook
Leave a one-line breadcrumb comment in call sites pointing back to where a setting is registered.

STANDARD SUBMIT FLOW FOR UI
User action triggers a delegated handler on the sheet root.
Handler builds a minimal update object.
Coerce types in _prepareSubmitData or _processSubmitData.
await this.document.update(update).
Let the document recompute derived data and re-render the UI.

Ground Rules for Working on This Project
Always re-open the ZIP and check the file contents before writing diffs.
Don’t assume a file “probably looks like” other Foundry systems.
Read the actual lines, copy from them, and then show the diff.
Never fabricate imports, functions, or settings.
If a line doesn’t exist in the source, don’t show it in a diff.
If I’m not sure, I must say: “I don’t see this in your file. Do you want me to add it?”
Show diffs only against confirmed, existing code.
Green + lines = things we’re adding.
Red - lines = things that really exist in your file right now.
No imaginary red lines.
Be explicit about no-ops.
If a step requires no change, I must state: “I checked the file(s); nothing needs to be changed for this step.”
Do not invent diffs to fill space.
Cite the actual file path and line numbers when possible.
E.g., “l5r4.js, lines 14–20 currently import from ./module/L5R4Actor.js and ./module/dice.js.”
Separate assumptions from facts.
Facts: confirmed from the zip.
Assumptions: clearly labeled as guesses, and only if you’ve asked me to speculate.
If I realize I was wrong, stop and issue a correction immediately.

Show the corrected diff.
Explain exactly what went wrong (e.g., I relied on memory instead of checking the file).