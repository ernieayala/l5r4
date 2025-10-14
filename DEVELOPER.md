# Developer Guide

**Status**: ✅ 100% Architecture Compliant  
**Last Updated**: 2025-10-04

This guide explains the system architecture and how to contribute.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#project-architecture)
- [Guidelines](#development-guidelines)
- [Contributing](#how-to-contribute)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Setup

```bash
cd [foundry-data-path]/systems/
git clone https://github.com/ernieayala/l5r4.git
cd l5r4
npm install
npm run build:css
```

### Verify Architecture

```bash
npm run madge:check    # Check for circular dependencies
npm run madge:summary  # View statistics
npm run madge:json     # Export graph
```

---

## Project Architecture

### Layer System

The system uses strict layers for clean, maintainable code:

```
┌───────────────────────────────────┐
│  SHEETS (UI)                      │
│  → Render UI, handle events       │
│  ✓ Can import: documents, services│
└─────────────┬─────────────────────┘
              │
┌─────────────▼─────────────────────┐
│  SERVICES (Logic)                 │
│  → Dice, chat, utilities          │
│  ✓ Can import: utils, config      │
└─────────────┬─────────────────────┘
              │
┌─────────────▼─────────────────────┐
│  DOCUMENTS (Data)                 │
│  → Data prep, calculations        │
│  ✓ Can import: utils, config      │
└─────────────┬─────────────────────┘
              │
┌─────────────▼─────────────────────┐
│  UTILS (Helpers)                  │
│  → Pure functions                 │
│  ✓ Can import: config only        │
└─────────────┬─────────────────────┘
              │
┌─────────────▼─────────────────────┐
│  CONFIG (Constants)               │
│  → System constants               │
│  ✓ No imports                     │
└───────────────────────────────────┘
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

**Status**: ✅ 100% Compliant (Zero circular dependencies)

- Automatic verification ensures code quality
- Layer separation strictly enforced


---

## Development Guidelines

### Import Rules

Follow the layer flow (top to bottom):

**✅ Allowed**
```javascript
// Sheets → Services
import { rollSkill } from "../services/dice/index.js";

// Services → Utils
import { toInt } from "../../../utils/index.js";

// Documents → Utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

**❌ Forbidden**
```javascript
// Documents → Services (WRONG!)
import { rollSkill } from "../services/dice/index.js";

// Services → Documents (WRONG!)
import { preparePcExperience } from "../../documents/actor/calculations/xp-system.js";

// Utils → Anything except Config (WRONG!)
import { L5R4Actor } from "../documents/actor.js";
```

### Shared Logic

**Need the same function in multiple layers?**  
Extract it to Utils!

```javascript
// utils/xp-calculations.js
export function calculateXpStepCostForTrait(rank, freeBonus, discount) {
  return Math.max(0, 4 * (rank + freeBonus) + discount);
}

// Both documents and services can import from utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

---

## Layer Responsibilities

### Documents (`module/documents/`)
**Purpose**: Calculate derived data

**Do**:
- Calculate stats (Armor TN, wounds, insight)
- Prepare data for display
- Apply Active Effects

**Don't**:
- Roll dice (use Services)
- Show UI (use Sheets)
- Use async in `prepareDerivedData()`

### Services (`module/services/`)
**Purpose**: Business logic with side effects

**Do**:
- Roll dice
- Create chat messages
- Show dialogs
- Manipulate documents

**Don't**:
- Calculate derived data (use Documents)
- Render sheets (use Sheets)

### Sheets (`module/sheets/`)
**Purpose**: UI rendering and interaction

**Do**:
- Render HTML
- Handle events
- Coordinate Documents and Services

**Don't**:
- Calculate data (read from Documents)
- Implement logic (call Services)

### Utils (`module/utils/`)
**Purpose**: Pure helper functions

**Do**:
- Type coercion
- Localization helpers
- Math functions
- Game mechanics calculations

**Don't**:
- Import from Documents or Services
- Use async operations
- Mutate global state

### Config (`module/config/`)
**Purpose**: Constants only

**Do**:
- System IDs and paths
- Game data constants
- Localization keys

**Don't**:
- Import from other modules
- Have side effects

---

## Common Patterns

### Pattern 1: Separation of Concerns

**Rolling a skill check:**

```javascript
// ❌ BAD: Document handles presentation
class L5R4Actor extends Actor {
  prepareDerivedData() {
    this.rollSkill("kenjutsu");  // WRONG!
  }
}

// ✅ GOOD: Document computes, Service presents
class L5R4Actor extends Actor {
  prepareDerivedData() {
    sys.skills = this.items.filter(i => i.type === "skill");
  }
}

export async function rollSkill(actor, skillId) {
  const roll = new Roll(formula);
  await roll.evaluate();
  await ChatMessage.create({ /* ... */ });
}
```

### Pattern 2: Shared Functions

**When multiple layers need the same function:**

```javascript
// ✅ Extract to utils
export function calculateXpStepCostForTrait(rank, freeBonus, discount) {
  return Math.max(0, 4 * (rank + freeBonus) + discount);
}

// Both Documents and Services import from utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

---

## Troubleshooting

### Circular Dependency Error

**Problem**: Modules import from each other

**Solution**:
1. Run `npm run madge:check` to see the cycle
2. Extract shared logic to Utils
3. Use events/hooks instead of direct imports

**Example Fix**:
```javascript
// ❌ Circular
import { applyStanceAutomation } from "../services/stance/index.js";

// ✅ Fixed: Extract to documents layer
export function applyStanceEffects(actor, sys) { /* ... */ }
```

### Wrong Layer Import

**Problem**: Documents importing from Services (or vice versa)

**Solution**: Extract shared logic to Utils layer

### Architecture Benefits

- **Maintainability** - Clear responsibilities per layer
- **Organization** - Easy to find where logic lives
- **Reusability** - Utils work anywhere, Documents compute once
- **Debugging** - No circular dependencies, clear data flow
- **Performance** - Efficient calculations, no redundancy

---

## How to Contribute

1. **Fork** the repo on [GitHub](https://github.com/ernieayala/l5r4)
2. **Clone** your fork
3. **Create** a feature branch (`git checkout -b feature/name`)
4. **Follow** code style:
   - JSDoc comments for functions
   - kebab-case for files
   - PascalCase for classes
   - Run `npm run madge:check` before committing
5. **Test** thoroughly
6. **Submit** a pull request

### Code Style

- JSDoc for all functions
- Follow layer architecture
- Verify with `npm run madge:check`

### Report Bugs

[GitHub Issues](https://github.com/ernieayala/l5r4/issues)

Include:
- Foundry VTT version
- System version
- Steps to reproduce
- Console errors (F12)
- Screenshots

---

## Quick Reference

### Import Cheat Sheet

| Layer | Can Import | Cannot Import |
|-------|-----------|---------------|
| **Sheets** | documents, services, utils, config | - |
| **Services** | utils, config | documents, sheets |
| **Documents** | utils, config | services, sheets |
| **Utils** | config only | documents, services, sheets |
| **Config** | nothing | anything |
