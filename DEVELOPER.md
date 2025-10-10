# Developer Guide

**Status**: ✅ **100% Compliant** (Verified with Madge)  
**Last Updated**: 2025-10-04

This guide covers the architecture, development guidelines, and contribution process for the L5R4-Enhanced system.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Guidelines](#development-guidelines)
- [How to Contribute](#how-to-contribute)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Development Installation

For developers who want to contribute:

```bash
cd [foundry-data-path]/systems/
git clone https://github.com/ernieayala/l5r4.git
cd l5r4
npm install
npm run build:css
```

### Architecture Verification

```bash
npm run madge:check    # Check for circular dependencies
npm run madge:summary  # View dependency statistics
npm run madge:json     # Export dependency graph to JSON
```

---

## Project Architecture

### Layer Architecture

The L5R4 system follows strict layer separation to maintain clean, maintainable code:

```
┌─────────────────────────────────────┐
│  SHEETS (UI Layer)                  │
│  Location: module/sheets/           │
│  ✓ Can import: documents, services  │
│  Purpose: Render UI, handle events  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  SERVICES (Business Logic)          │
│  Location: module/services/         │
│  ✓ Can import: utils, config        │
│  ❌ Cannot: documents, sheets        │
│  Purpose: Dice, chat, utilities     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  DOCUMENTS (Data/Computation)       │
│  Location: module/documents/        │
│  ✓ Can import: utils, config        │
│  ❌ Cannot: services, sheets         │
│  Purpose: Data prep, calculations   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  UTILS (Shared Pure Functions)      │
│  Location: module/utils/            │
│  ✓ Can import: config               │
│  ❌ Cannot: anything else            │
│  Purpose: Pure helper functions     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  CONFIG (Constants)                 │
│  Location: module/config/           │
│  ✓ Can import: nothing              │
│  Purpose: System constants          │
└─────────────────────────────────────┘
```

### Directory Structure

```
module/
├── documents/     # Actor/Item classes with game rule logic
├── sheets/        # UI rendering with ActorSheetV2/ItemSheetV2  
├── services/      # Dice mechanics, chat rendering, utilities
├── apps/          # XP Manager, Wound Config applications
├── utils/         # Shared pure functions
├── config/        # System constants
└── setup/         # Settings, templates, migrations
```

**Architecture Status**: ✅ **100% Compliant** (Zero circular dependencies, zero boundary violations)

- **Automatic Verification**: Architecture checks ensure code quality
- **Layer Separation**: Documents → Services → Sheets hierarchy strictly enforced

---

## Architecture Verification

### Running Checks

Verify the architecture with these commands:

### Manual Checks

```bash
# Check for circular dependencies
npm run madge:check

# View dependency statistics
npm run madge:summary

# Export dependency graph to JSON
npm run madge:json
```

### What Gets Checked

- ✅ **No circular dependencies** across all modules
- ✅ **Documents don't import from Services**
- ✅ **Documents don't import from Sheets**
- ✅ **Services don't import from Documents**
- ✅ **Services don't import from Sheets**
- ✅ **Proper layer separation maintained**

---

## Development Guidelines

### Adding New Code

**Rule of Thumb**: Follow the import flow (top to bottom in diagram above)

#### ✅ Good Examples

```javascript
// Sheets can import from Services
// module/sheets/pc-sheet.js
import { rollSkill } from "../services/dice/index.js";

// Services can import from Utils
// module/services/dice/rolls/skill-roll.js
import { toInt } from "../../../utils/index.js";

// Documents can import from Utils
// module/documents/actor.js
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

#### ❌ Bad Examples (Will Fail Madge Check)

```javascript
// ❌ Documents importing from Services
// module/documents/actor.js
import { rollSkill } from "../services/dice/index.js"; // FORBIDDEN!

// ❌ Services importing from Documents
// module/services/xp/xp-calculator.js
import { preparePcExperience } from "../../documents/actor/calculations/xp-system.js"; // FORBIDDEN!

// ❌ Utils importing from anything except config
// module/utils/mechanics.js
import { L5R4Actor } from "../documents/actor.js"; // FORBIDDEN!
```

### Shared Logic Between Layers

**Question**: What if both Documents and Services need the same calculation function?

**Answer**: Extract it to the Utils layer!

**Example**: XP calculations needed by both actor documents and XP calculator service:

```javascript
// ✅ Extract to utils/xp-calculations.js
export function calculateXpStepCostForTrait(rank, freeBonus, discount) {
  return Math.max(0, 4 * (rank + freeBonus) + discount);
}

// ✅ Documents import from utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";

// ✅ Services import from utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

---

## Layer Responsibilities

### Documents Layer (`module/documents/`)

**Purpose**: Compute all derived data for actors and items

**Responsibilities**:
- Calculate derived statistics (Armor TN, wounds, insight, etc.)
- Prepare data for display (wound levels, XP totals, etc.)
- Track data changes (XP expenditure logging, etc.)
- Apply Active Effects to base values

**Rules**:
- ✅ Pure data computation only
- ✅ No UI rendering logic
- ✅ No async operations in `prepareDerivedData()`
- ❌ No dice rolling (that's Services)
- ❌ No chat messages (that's Services)
- ❌ No sheet rendering (that's Sheets)

**Example Structure**:
```
documents/
├── actor.js                    # Main actor document
├── item.js                     # Main item document
├── actor/
│   ├── calculations/           # Derived data calculations
│   │   ├── wound-system.js
│   │   ├── xp-system.js
│   │   └── stance-effects.js
│   ├── constants/              # Actor-specific constants
│   └── creation/               # Character creation logic
└── item/
    ├── preparation/            # Item derived data
    └── lifecycle/              # Item CRUD hooks
```

---

### Services Layer (`module/services/`)

**Purpose**: Business logic and operations with side effects

**Responsibilities**:
- Dice rolling and roll parsing
- Chat message creation
- Active Effect lifecycle (async operations)
- External integrations

**Rules**:
- ✅ Can be async
- ✅ Can show dialogs
- ✅ Can create chat messages
- ✅ Can manipulate documents
- ❌ Don't compute derived data (that's Documents)
- ❌ Don't render sheets (that's Sheets)

**Example Structure**:
```
services/
├── dice/
│   ├── rolls/                  # Roll implementations
│   ├── dialogs/                # Roll dialogs
│   └── core/                   # Roll utilities
├── stance/
│   ├── core/                   # Effect templates
│   └── hooks/                  # Effect lifecycle
├── chat.js
└── initiative.js
```

---

### Sheets Layer (`module/sheets/`)

**Purpose**: User interface rendering and interaction

**Responsibilities**:
- Render HTML templates
- Handle user events (clicks, drags, etc.)
- Coordinate between documents and services
- Manage sheet state

**Rules**:
- ✅ Can import from Documents (read data)
- ✅ Can import from Services (trigger actions)
- ✅ Event delegation on sheet root
- ❌ Don't compute derived data (read from Documents)
- ❌ Don't implement business logic (call Services)

**Example Structure**:
```
sheets/
├── pc-sheet.js                 # Player character sheet
├── npc-sheet.js                # NPC sheet
├── base-actor-sheet.js         # Shared actor logic
├── handlers/                   # Event handlers (delegated)
├── mixins/                     # Reusable behaviors
└── ui/                         # UI components
```

---

### Utils Layer (`module/utils/`)

**Purpose**: Pure helper functions shared across all layers

**Responsibilities**:
- Type coercion and validation
- Localization helpers
- DOM manipulation utilities
- Pure math functions
- Shared game mechanics calculations

**Rules**:
- ✅ Must be pure functions (no side effects)
- ✅ Must be framework-agnostic where possible
- ✅ Can import from Config only
- ❌ No Foundry document dependencies
- ❌ No async operations
- ❌ No global state mutation

**Example Structure**:
```
utils/
├── index.js                    # Barrel export
├── localization.js             # i18n helpers
├── type-coercion.js            # Safe type conversion
├── dom.js                      # DOM utilities
├── mechanics.js                # L5R4 game mechanics
├── xp-calculations.js          # XP cost formulas
└── sorting.js                  # Sorting helpers
```

---

### Config Layer (`module/config/`)

**Purpose**: System constants and configuration

**Responsibilities**:
- System IDs and paths
- Game data constants (traits, skills, etc.)
- Icon paths
- Localization key mappings
- Template paths

**Rules**:
- ✅ Only exports constants
- ✅ No functions (except pure getters)
- ❌ No dependencies on other modules
- ❌ No side effects at import time

**Example Structure**:
```
config/
├── index.js                    # Barrel export
├── constants.js                # System IDs, paths
├── game-data.js                # L5R4 game constants
├── icons.js                    # Icon path resolution
└── localization.js             # i18n key mappings
```

---

## Common Patterns

### Pattern 1: Documents Compute, Services Present

**Scenario**: Rolling a skill check

```javascript
// ❌ BAD: Document doing presentation
class L5R4Actor extends Actor {
  prepareDerivedData() {
    // ... calculations ...
    
    // ❌ Don't do this in documents!
    this.rollSkill("kenjutsu");
    ChatMessage.create({ content: "Rolling..." });
  }
}

// ✅ GOOD: Document computes, service presents
// documents/actor.js
class L5R4Actor extends Actor {
  prepareDerivedData() {
    // ✅ Just compute derived data
    sys.skills = this.items.filter(i => i.type === "skill");
  }
}

// services/dice/rolls/skill-roll.js
export async function rollSkill(actor, skillId) {
  // ✅ Service handles rolling and chat
  const roll = new Roll(formula);
  await roll.evaluate();
  await ChatMessage.create({ /* ... */ });
}
```

### Pattern 2: Shared Calculations in Utils

**Scenario**: XP cost calculation needed by both documents and services

```javascript
// ✅ GOOD: Extract to utils
// utils/xp-calculations.js
export function calculateXpStepCostForTrait(rank, freeBonus, discount) {
  return Math.max(0, 4 * (rank + freeBonus) + discount);
}

// documents/actor/calculations/xp-system.js
import { calculateXpStepCostForTrait } from "../../../utils/xp-calculations.js";

export function preparePcExperience(actor, sys) {
  // Use shared function
  const cost = calculateXpStepCostForTrait(newRank, bonus, discount);
}

// services/xp/xp-calculator.js
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";

export function buildXpHistory(actor) {
  // Use same shared function
  const cost = calculateXpStepCostForTrait(rank, bonus, discount);
}
```

### Pattern 3: Backward Compatibility via Re-exports

**Scenario**: Moved function to new location, need backward compatibility

```javascript
// ✅ GOOD: Re-export from old location
// documents/actor/creation/creation-bonuses.js (old location)
/**
 * @deprecated Import from utils/xp-calculations.js instead
 */
export { getCreationFreeBonus, getCreationFreeBonusVoid } from "../../../utils/xp-calculations.js";

// Old code still works
import { getCreationFreeBonus } from "./documents/actor/creation/creation-bonuses.js";

// New code uses correct location
import { getCreationFreeBonus } from "./utils/xp-calculations.js";
```

---

## Troubleshooting

### "Madge check failed: Circular dependency found"

**Cause**: Two or more modules import from each other, creating a cycle.

**Fix**:
1. Run `npm run madge:check` to see the circular chain
2. Extract shared logic to a common module (usually Utils)
3. Use events/hooks instead of direct imports where appropriate

**Example**:
```javascript
// ❌ Circular dependency
// actor.js
import { applyStanceAutomation } from "../services/stance/index.js";

// services/stance/index.js
import { L5R4Actor } from "../documents/actor.js";

// ✅ Break the cycle: Extract to documents layer
// documents/actor/calculations/stance-effects.js
export function applyStanceEffects(actor, sys) { /* ... */ }

// actor.js
import { applyStanceEffects } from "./actor/calculations/stance-effects.js";

// services/stance/index.js (re-export for backward compat)
export { applyStanceEffects as applyStanceAutomation } from "../../documents/actor/calculations/stance-effects.js";
```

### "Documents layer importing from Services"

**Cause**: Actor or Item document is importing from services layer.

**Fix**: Move pure calculation logic to documents layer, keep async/presentation logic in services.

### "Services layer importing from Documents"

**Cause**: Service is importing calculation functions from documents.

**Fix**: Extract shared calculations to Utils layer, have both import from there.

---

## Migration Guide

### From Monolithic to Layered

If you have a large function that violates layer separation:

**Before**:
```javascript
// documents/actor.js
import { rollDice } from "../services/dice.js"; // ❌ Violation!

class L5R4Actor extends Actor {
  prepareDerivedData() {
    // Calculate AND present (❌ bad!)
    const bonus = this.calculateBonus();
    rollDice(bonus); // ❌ Don't do this here!
  }
}
```

**After**:
```javascript
// documents/actor.js
class L5R4Actor extends Actor {
  prepareDerivedData() {
    // ✅ Only calculate
    sys._rollBonus = this.calculateBonus();
  }
}

// sheets/pc-sheet.js
import { rollWithBonus } from "../services/dice.js";

class L5R4PCSheet extends ActorSheetV2 {
  _onRollSkill(event) {
    // ✅ Sheet coordinates between document and service
    const bonus = this.actor.system._rollBonus;
    rollWithBonus(this.actor, bonus);
  }
}
```

---

## Benefits of This Architecture

### 1. **Maintainability**
- Each layer has clear responsibilities
- Pure functions in Utils are framework-agnostic
- Documents have no UI or service dependencies

### 2. **Code Organization**
- Clear separation of concerns
- Easy to find where logic lives
- No unexpected side effects

### 3. **Reusability**
- Utils functions can be used anywhere
- Services can be called from any UI context
- Documents compute data once, use everywhere

### 4. **Debugging**
- No circular dependencies to navigate
- Clear data flow (top to bottom)
- Easier to trace bugs to their source

### 5. **Performance**
- Documents compute derived data efficiently
- No redundant calculations across layers
- Services can be async without blocking data prep

---

## How to Contribute

We welcome contributions! Here's how to get started:

1. **Fork** the repository on [GitHub](https://github.com/ernieayala/l5r4)
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Follow** our code style:
   - JSDoc comments for functions
   - kebab-case for file names
   - PascalCase for class names
5. **Verify** thoroughly with existing worlds
6. **Submit** a pull request with a clear description

### Code Style Guidelines

- Use JSDoc comments for all functions
- Use kebab-case for file names
- Use PascalCase for class names
- Follow the layer architecture strictly
- Run `npm run madge:check` before committing

### 🐛 Bug Reports

Found an issue? Report it on [GitHub Issues](https://github.com/ernieayala/l5r4/issues) with:
- Foundry VTT version
- System version
- Steps to reproduce
- Console errors (press F12 → Console tab)
- Screenshots if applicable

---

## Reference

### Quick Architecture Check

```bash
# Before committing
npm run madge:check    # Verify architecture compliance

# Detailed analysis
npm run madge:summary  # View dependency statistics
```

### Import Cheat Sheet

| From Layer | Can Import | Cannot Import |
|------------|------------|---------------|
| **Sheets** | documents, services, utils, config | - |
| **Services** | utils, config | documents, sheets |
| **Documents** | utils, config | services, sheets |
| **Utils** | config | documents, services, sheets |
| **Config** | - | anything |

---

**Last Architecture Audit**: 2025-10-04  
**Architecture Grade**: A+ (100%)  
**Circular Dependencies**: 0  
**Boundary Violations**: 0
