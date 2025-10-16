---
trigger: always_on
---

## Purpose
Structural organization and design decisions for the L5R4 system.

---

## Core Separation of Concerns

### Five Distinct Layers

**Documents/** - Data and computation
**Sheets/** - UI rendering and events
**Services/** - Reusable logic and operations
**Utils/** - Pure helper functions
**Config/** - Constants and configuration

### Strict Boundaries
Each layer has one responsibility. Do not mix.

---

## Layer 1: Documents

### Location
`module/documents/`

### Responsibility
- Extend Foundry's Actor and Item classes
- Compute ALL derived values
- Store game state
- Expose data for sheets
- NO UI logic
- NO DOM access

### What Goes Here
- Trait calculations
- Ring calculations
- Resource tracking (Wounds, Void Points, Honor)
- TN calculations
- Initiative computation
- Derived stats
- Data validation
- State management

### Data Exposure
Store under:
- `actor.system.*` - Core data model
- `actor.flags.l5r4.*` - Custom flags

### Pattern
```javascript
class L5R4Actor extends Actor {
  prepareDerivedData() {
    // Calculate everything here
    // Sheets only read, never compute
  }
}
```

### Files
- `L5R4Actor.js`
- `L5R4Item.js`
- Type-specific documents as needed

---

## Layer 2: Sheets

### Location
`module/sheets/`

### Responsibility
- Render data from documents
- Handle user events
- Delegate to services
- NO calculations
- NO business logic

### What Goes Here
- Template rendering
- Event delegation
- UI state (collapsed sections, tabs)
- Form handling
- Calling services for actions

### What Does NOT Go Here
- Dice rolling logic
- Wound calculation
- Trait/Ring computation
- Data validation
- Game rules

### API Requirements
- Use `ActorSheetV2` or `ItemSheetV2` (Foundry v13)
- Event delegation on sheet root element only
- Use data attributes for actions

### Pattern
```javascript
class L5R4ActorSheet extends foundry.applications.sheets.ActorSheetV2 {
  _prepareContext(options) {
    // Shape data for template
    // Read from document, never compute
  }

  _onRender(context, options) {
    // Attach delegated event listeners
    this.element.addEventListener("click", this._onAction.bind(this));
  }

  _onAction(event) {
    const target = event.target.closest("[data-action]");
    // Route to services
  }
}
```

### Files
- `L5R4ActorSheet.js`
- `L5R4ItemSheet.js`
- Type-specific sheets as needed

---

## Layer 3: Services

### Location
`module/services/`

### Responsibility
- Roll construction and execution
- Chat message creation
- Complex multi-step operations
- Reusable logic
- NO UI assumptions
- NO DOM queries

### What Goes Here
- Dice rolling logic (XkY, exploding 10s)
- Chat message formatting
- Skill checks
- Trait rolls
- Spell casting rolls
- Initiative rolling
- Batch operations

### Input/Output
- Accept plain data (actor, traits, skills, modifiers)
- Return results (Roll, ChatMessage, computed values)
- No sheet or DOM references

### Pattern
```javascript
/**
 * Roll a skill check
 * @param {Object} options
 * @param {Actor} options.actor
 * @param {string} options.skill
 * @param {string} options.trait
 * @param {number} options.bonus
 * @returns {Promise<ChatMessage>}
 */
export async function rollSkill({ actor, skill, trait, bonus = 0 }) {
  // Build roll
  // Execute roll
  // Create chat message
  // Return message
}
```

### Files
- `dice.js` - Dice rolling
- `chat.js` - Chat utilities
- Domain-specific services as needed

---

## Layer 4: Utils

### Location
`module/utils/`

### Responsibility
- Pure helper functions
- Data transformation
- Calculations without side effects
- NO Foundry globals (when possible)
- NO state modification

### What Goes Here
- Math helpers
- String formatting
- Array/Object utilities
- Validation functions
- Type guards

### Pattern
```javascript
/**
 * Calculate Wound penalties based on Earth Ring
 * @param {number} wounds - Current wounds
 * @param {number} earthRing - Earth Ring value
 * @returns {number} Wound penalty
 */
export function calculateWoundPenalty(wounds, earthRing) {
  const healthyValue = earthRing * 2;
  if (wounds <= healthyValue) return 0;
  // Calculate penalty based on wound ranks
  return Math.floor((wounds - healthyValue) / earthRing) * 3;
}
```

### Characteristics
- No side effects
- Deterministic (same input = same output)
- Easy to test
- Reusable

### Files
- `calculations.js`
- `validators.js`
- `formatters.js`
- As needed by domain

---

## Layer 5: Config

### Location
`module/config.js` or `module/config/`

### Responsibility
- System-wide constants
- Configuration objects
- ID definitions
- Option lists
- i18n keys
- NO functions
- NO logic

### What Goes Here
- System ID
- Trait keys
- Ring keys
- Skill lists
- Resource types
- Default values
- Enum-like constants

### Naming
- Constants: `UPPER_SNAKE_CASE`
- Config objects: `camelCase`

### Pattern
```javascript
export const SYS_ID = "l5r4";

export const TRAITS = {
  STAMINA: "stamina",
  WILLPOWER: "willpower",
  STRENGTH: "strength",
  PERCEPTION: "perception",
  AGILITY: "agility",
  REFLEXES: "reflexes",
  AWARENESS: "awareness",
  INTELLIGENCE: "intelligence"
};

export const RINGS = {
  EARTH: "earth",
  WATER: "water",
  FIRE: "fire",
  AIR: "air",
  VOID: "void"
};

export const RESOURCE_TYPES = ["wounds", "voidPoints", "honor"];
```

### Files
- `config.js` - If small
- `config/traits.js`, `config/skills.js` - If large

---

## Presentation Layer

### Markup: Templates Only

**Location:** `templates/`

**Rules:**
- All HTML goes in Handlebars (.hbs) files
- JavaScript never contains HTML strings
- No inline HTML in JS
- Use Foundry's template system

**Pattern:**
```javascript
// Good
const html = await renderTemplate("systems/l5r4-enhanced/templates/actor-sheet.hbs", context);

// Bad
const html = `<div class="actor-sheet">...</div>`;
```

### Styles: SCSS Only

**Location:** `styles/`

**Rules:**
- Write in SCSS format
- Use npm sass compiler
- Build process handles compilation
- No complex SCSS features (keep it simple)
- JavaScript never contains inline styles

**Pattern:**
```scss
// styles/actor-sheet.scss
.actor-sheet {
  .header {
    display: flex;
  }
}
```

**Build:** npm scripts compile SCSS to CSS automatically.

### JavaScript: No Class/ID Selectors

**CRITICAL RULE:** JavaScript must NEVER query by class names or IDs.

**Use:** Data attributes only

**Pattern:**
```javascript
// Good
const target = event.target.closest("[data-action='roll']");
const itemId = target.dataset.itemId;

// Bad
const button = document.querySelector(".roll-button");
const itemId = document.getElementById("item-123");
```

**Why:** Separates concerns. CSS classes are for styling. Data attributes are for behavior.

---

## Data Storage Conventions

### Actor/Item Data Model

**Use:** `actor.system.*` for core data
```javascript
actor.system.traits.stamina = 3;
actor.system.rings.earth = 2;
actor.system.resources.wounds.value = 8;
```

**Use:** `actor.flags.l5r4.*` for custom data
```javascript
actor.flags.l5r4.customMechanic = true;
actor.flags.l5r4.glory = 2;
```

### When to Use Flags
- Custom mechanics not in base system
- Temporary states
- Module-specific data
- Non-standard tracking

### When to Use System
- Core game traits
- Standard resources
- Base statistics
- Any data defined in template.json

---

## Import Organization

### Four Groups (in order)

**1. External Libraries**
```javascript
import { externalLib } from 'external-package';
```

**2. Shared Internal (Config/Utils)**
```javascript
import { SYS_ID } from './config.js';
import { calculateWoundPenalty } from './utils/calculations.js';
```

**3. Feature Modules (Documents/Sheets/Services)**
```javascript
import { L5R4Actor } from './documents/L5R4Actor.js';
import { rollSkill } from './services/dice.js';
```

**4. Local Helpers (same directory)**
```javascript
import { helperFunction } from './helper.js';
```

### Why This Order
- Dependencies flow from general to specific
- Easy to identify what's external vs internal
- Groups related imports together

---

## Defensive Coding Techniques

### Optional Chaining
Always assume data might be missing:
```javascript
const stamina = actor?.system?.traits?.stamina?.value;
```

### Nullish Coalescing
Provide fallbacks:
```javascript
const bonus = actor?.system?.bonuses?.skill ?? 0;
const name = item?.name ?? "Unknown";
```

### Try/Catch for Async
Wrap risky operations:
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.warn("L5R4", "Operation failed", error);
  return fallbackValue;
}
```

### Input Validation
Check before processing:
```javascript
if (!actorId || typeof actorId !== "string") {
  console.warn("Invalid actor ID", actorId);
  return;
}
```

### Array Safety
```javascript
const items = actor?.items ?? [];
items.forEach(item => processItem(item));
```

---

## File Complexity Limits

### Maximum File Size
- **Documents:** ~300 lines
- **Sheets:** ~400 lines  
- **Services:** ~200 lines per service
- **Utils:** ~150 lines

### When to Split
If file exceeds limits:
- Extract helper functions to Utils
- Split large services into multiple files
- Create domain-specific sub-modules
- Move constants to Config

### Signs File is Too Complex
- More than 3 levels of nesting
- Multiple unrelated responsibilities
- Difficult to understand purpose
- Hard to find specific functionality

### Solution
Create focused files with single responsibility.

---

## Responsibility Matrix

| Layer | Computes | Reads | Writes | Renders | Events | Calls |
|-------|----------|-------|--------|---------|--------|-------|
| Documents | ✅ | ✅ | ✅ | ❌ | ❌ | Utils |
| Sheets | ❌ | ✅ | ❌ | ✅ | ✅ | Services |
| Services | ✅ | ✅ | ✅ | ❌ | ❌ | Utils, Foundry API |
| Utils | ✅ | ✅ | ❌ | ❌ | ❌ | Nothing |
| Config | ❌ | ❌ | ❌ | ❌ | ❌ | Nothing |

---

## Architecture Violations

### Common Mistakes

❌ Sheets computing derived values
❌ Documents accessing DOM
❌ Services assuming UI structure
❌ Utils with side effects
❌ Config containing functions
❌ JavaScript with inline HTML
❌ JavaScript querying by class/ID
❌ Markup not in templates
❌ Styles not in SCSS files

### How to Fix
- Move computation to Documents
- Move rendering to Sheets
- Move logic to Services
- Extract to Utils if pure function
- Move to Config if constant

---

## Module Structure Example
```
l5r4-enhanced/
├── module/
│   ├── documents/
│   │   ├── L5R4Actor.js
│   │   └── L5R4Item.js
│   ├── sheets/
│   │   ├── L5R4ActorSheet.js
│   │   └── L5R4ItemSheet.js
│   ├── services/
│   │   ├── dice.js
│   │   └── chat.js
│   ├── utils/
│   │   ├── calculations.js
│   │   └── validators.js
│   ├── config.js
│   └── l5r4.js (entry point)
├── templates/
│   ├── actor/
│   │   └── character-sheet.hbs
│   └── item/
│       └── weapon-sheet.hbs
├── styles/
│   ├── actor-sheet.scss
│   └── item-sheet.scss
└── system.json
```

---

## Key Principles

1. **Separation**: Each layer has one job
2. **No mixing**: Documents don't render, sheets don't compute
3. **Data attributes**: JavaScript behavior selection
4. **SCSS only**: No inline styles
5. **Templates only**: No inline HTML
6. **Defensive**: Assume failure, provide fallbacks
7. **Modular**: Small, focused files
8. **Organized imports**: External → Shared → Feature → Local

---

## Remember

Architecture exists to keep code maintainable. Follow these patterns strictly. When tempted to mix responsibilities, create a new file instead.