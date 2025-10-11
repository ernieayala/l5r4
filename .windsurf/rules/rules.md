---
trigger: always_on
---

# Windsurf AI Instructions - Legend of the Five Rings 4th Edition FoundryVTT System

## Critical Requirements

### Acknowledgment Protocol
- **FIRST MESSAGE ONLY**: Begin with "I read all your instructions Ernie." to confirm instruction comprehension

### File Path Verification
- **CRITICAL**: Before every MultiEdit tool call, verify the file_path parameter contains the complete absolute path:
  - Start: `c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\`
  - End: `filename.extension`
  - Never submit truncated or incomplete paths

### Project Constraints
- **NEVER** examine or modify `node_modules` folder
- **NO** downloadable items - all changes stay in project
- **NO** "helpful" refactors unless explicitly requested
- **ALWAYS** provide diffs for any changes
- Only change what needs to be changed

## Project Context

### Technology Stack
- **FoundryVTT**: Version 13
- **Game System**: Legend of the Five Rings 4th Edition TTRPG
- **API Reference**: https://foundryvtt.com/api/
- **Rules Source**: Documentation file in project files

### Workflow Requirements
1. Deeply review contents on first chat message
2. Reference actual file contents before making changes
3. Use JSDoc-style block comments
4. Follow DRY (Don't Repeat Yourself) methodology

---

## Game Mechanics Reference

### Trait Rolls
- **Formula**: XkX (X = Trait rank)
- **Exploding**: Tens explode (roll again, add result)
- **Raises**: Declare before rolling (+5 TN each) for extra effects
- **Usage**: Raw ability checks (resisting, lifting, noticing, Willpower)
- **Void Spending**: +1k1 to any roll

### Skill Rolls
- **Formula**: (Skill + Trait)k(Trait)
- **Exploding**: Tens explode
- **Raises**: +5 TN each, declared before rolling
- **Emphasis**: Re-roll 1s when applicable
- **Mastery Abilities**: Unlock at ranks 3, 5, 7, 9
- **Untrained**: Usually allowed but may be penalized

### Spellcasting
- **Casting Roll**: (Ring + School Rank)k(Ring) using spell's Ring
- **Target**: Meet or exceed spell's base TN
- **Timing**: Complex action (default), Simple action, or ritual
- **Raises**: Add targets, area, duration, or spell-specific effects
- **Disruption**: Concentration check required if interrupted
- **School Modifiers**: Affinities (easier) or Deficiencies (harder)

### Character Advancement (XP)
- **Traits**: Cost = 4 × new rank (e.g., Reflexes 2→3 = 12 XP)
- **Void**: Cost = 6 × new rank (e.g., Void 2→3 = 18 XP)
- **Skills**: Cost = next rank (e.g., 2→3 = 3 XP), New skill = 1 XP
- **Emphasis**: 2 XP each
- **Advantages**: Pay listed XP cost
- **Disadvantages**: Gain listed XP (max 10 XP total)
- **Ring Advancement**: Rings increase when both component Traits increase

---

## JavaScript Architecture

### Core Principles

#### Separation of Concerns
- **Documents** (Actor/Item): Compute rules and derived data
- **UI Modules** (sheets, applications): Render and dispatch user actions only  
- **Services** (dice, chat): Construct rolls and chat content
- **Utilities** (utils, config): Provide pure helpers and constants

#### Import Organization
```javascript
// External imports
import { someLib } from 'external-library';

// Shared internal (config, utils)  
import { SYS_ID } from './config.js';
import { calculateBonus } from './utils.js';

// Feature modules
import { L5R4Actor } from './L5R4Actor.js';
import { rollSkill } from './dice.js';

// File-local helpers
import { localHelper } from './local-helper.js';
```

#### Side Effects
- **Allowed**: Explicit registrations (settings, templates) at import time
- **Preferred**: Exported setup functions called from system entrypoints
- **Forbidden**: Other side effects at import time

#### Data Management
- **Flags**: Store under `flags[SYS_ID].camelCaseKey`
- **Settings**: Read via `game.settings.get(SYS_ID, key)` with safe defaults
- **Defensive**: Never throw if missing, always provide fallbacks

### Naming Conventions
- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Booleans**: Start with `is`, `has`, `can`
- **DOM Attributes**: `kebab-case` (e.g., `data-action="roll-skill"`)

### Documentation Standards
- **File Headers**: Short banner describing purpose, responsibilities, relevant Foundry APIs
- **Public Functions**: Include `@param` and `@returns`
- **Type Definitions**: Add `@typedef` blocks for data structures

### Error Handling
- **Async Operations**: Always `await` before reading state
- **Risk Management**: Wrap risky awaits in try/catch
- **Logging**: `console.warn("L5R4", message, { context })` for recoverable issues
- **Defensive Coding**: Use optional chaining `obj?.x ?? fallback`
- **Validation**: Check IDs from DOM or drag data before use

---

## Code Style Guidelines

### Formatting Rules
```javascript
// Indentation: 2 spaces
if (condition) {
  doSomething();
}

// Quotes: Double quotes
const message = "Hello world";

// Semicolons: Required
const value = getValue();

// Comma dangle: Never
const obj = {
  prop1: "value1",
  prop2: "value2"
};

// Arrow functions: Parentheses as needed
const single = arg => arg * 2;
const multiple = (a, b) => a + b;

// Object spacing: Always
const config = { setting1: true, setting2: false };

// Array spacing: Never  
const items = [1, 2, 3];
```

### Modern JavaScript
- **No `var`**: Use `const` (preferred) or `let`
- **Equality**: Always use `===` and `!==`
- **Unused**: No unused imports or variables
- **Unused Parameters**: Prefix with underscore `_unusedParam`

---

## Module-Specific Guidelines

### Documents (L5R4Actor.js, L5R4Item.js)
**Purpose**: Compute all rules and derived values

```javascript
/**
 * L5R4 Actor Document
 * Handles character data, trait/skill calculations, and derived stats
 * API: Actor, ActorDataModel
 */
class L5R4Actor extends Actor {
  /** @override */
  _preCreate(data, options, userId) {
    // Set initial values, validate data
  }
  
  /** @override */ 
  prepareDerivedData() {
    // Compute all derived values here
    // Expose everything sheets need under this.system or flags[SYS_ID]
  }
}
```

**Rules**:
- **NO** DOM access
- **NO** sheet-specific logic
- Expose all sheet data under `document.system` or `flags[SYS_ID]`

### Sheets (sheets/*.js)
**Purpose**: Render UI and handle user interactions only

```javascript
/**
 * L5R4 Character Sheet
 * Renders character data and handles user input
 * API: ActorSheetV2 (Foundry v13)
 */
class L5R4ActorSheet extends foundry.applications.sheets.ActorSheetV2 {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "sheet", "actor"],
    position: { width: 800, height: 900 },
    window: { title: "L5R4.sheets.character" }
  };

  /** @override */
  async _prepareContext(options) {
    // Shape safe data for templates
    // Don't recompute - read from document
  }

  /** @override */
  _onRender(context, options) {
    // Wire delegated events on root element only
  }

  /** @override */
  async _prepareSubmitData(formData) {
    // Coerce outgoing data types
  }
}
```

**Rules**:
- Use **ActorSheetV2** or **ItemSheetV2** (Foundry v13)
- **Event Delegation**: Delegate on sheet root, use `data-action`, `data-id`, `data-type`
- **NO** individual button binding
- **NO** stat recomputation (add to document class instead)

### Services (dice.js, chat.js)
**Purpose**: Centralize roll construction and chat rendering

```javascript
/**
 * L5R4 Dice System
 * Handles roll construction, TN calculations, and exploding dice
 * API: Roll, ChatMessage
 */

/**
 * @typedef {Object} RollOptions
 * @property {L5R4Actor} actor - The acting character
 * @property {string} itemId - Item ID if applicable  
 * @property {number} trait - Trait value
 * @property {number} skill - Skill value
 * @property {Object} options - Additional roll options
 */

export async function rollSkill({ actor, itemId, trait, skill, options }) {
  // Build roll, handle raises, exploding dice
  // Return results and render chat
}
```

**Rules**:
- Accept plain inputs, return structured results
- **NO** DOM queries or sheet assumptions
- All user strings through `game.i18n.localize()`

### Config and Utils (config.js, utils.js)
**Purpose**: Constants and pure helper functions

```javascript
// config.js - Constants and configuration
export const SYS_ID = "l5r4";
export const TRAITS = {
  STAMINA: "stamina",
  WILLPOWER: "willpower"
  // ... etc
};

// utils.js - Pure helper functions
/**
 * Calculate trait bonus based on L5R4 rules
 * @param {number} traitValue - The trait value
 * @returns {number} The calculated bonus
 */
export function calculateTraitBonus(traitValue) {
  // Pure function - no Foundry globals
  return Math.floor(traitValue / 2);
}
```

**Rules**:
- **config.js**: Constants, IDs, option lists, i18n keys only
- **utils.js**: Pure helpers (document Foundry global usage clearly)

---

## Standard UI Flow

### User Interaction Pattern
1. **User Action** → Delegated handler on sheet root
2. **Handler** → Build minimal update object  
3. **Coercion** → Type coercion in `_prepareSubmitData`
4. **Update** → `await this.document.update(update)`
5. **Recompute** → Document recalculates derived data
6. **Re-render** → UI updates automatically

```javascript
// Example delegated event handler
async _onAction(event, target) {
  const action = target.dataset.action;
  
  switch (action) {
    case "roll-skill":
      const skill = target.dataset.skill;
      await rollSkill({ actor: this.document, skill });
      break;
  }
}
```

---

## Ground Rules for Development

### File Verification Protocol
1. **Never** assume files "probably look like" other systems
2. **Always** read actual lines, copy from them, show accurate diffs
3. **Never** fabricate imports, functions, or settings

### Diff Standards
- **Green `+` lines**: Things being added
- **Red `-` lines**: Things that actually exist in current file  
- **No imaginary red lines** - only show actual existing code being removed
- If unsure about existing code: "I don't see this in your file. Do you want me to add it?"

### Explicit Communication
- **Facts vs Assumptions**: Clearly separate confirmed information from speculation
- **No-ops**: Explicitly state when no changes needed: "I checked the file(s); nothing needs to be changed for this step"
- **Citations**: Reference actual file paths and line numbers when possible
- **Corrections**: If wrong, stop immediately, issue correction with accurate diff

### Error Recovery
- If mistake discovered, immediately:
  1. Stop current explanation
  2. State what went wrong (e.g., "I relied on memory instead of checking the file")
  3. Show corrected diff based on actual file contents
  4. Continue with accurate information