# Contributing to L5R4 Enhanced

**Architecture Status**: ✅ 100% Compliant (Zero circular dependencies)

## Welcome

Contributions welcome:
- Bug fixes
- Feature implementations
- Test coverage (high priority)
- Documentation improvements

**Critical**: Follow architecture rules strictly. Zero tolerance for circular dependencies.

## Setup

### Requirements

- Node.js 18+
- Foundry VTT v13+
- Git
- Editor with EditorConfig support

### Install

```bash
git clone https://github.com/ernieayala/l5r4.git
cd l5r4
npm install
```

Installs dependencies, sets up Husky hooks, configures lint-staged.

### Link to Foundry

**Windows (PowerShell as Admin):**
```powershell
New-Item -ItemType SymbolicLink -Path "$env:LOCALAPPDATA\FoundryVTT\Data\systems\l5r4-enhanced" -Target "path\to\l5r4"
```

**macOS/Linux:**
```bash
ln -s /path/to/l5r4 ~/Library/Application Support/FoundryVTT/Data/systems/l5r4-enhanced
```

## Commands

```bash
# Linting
npm run lint          # Check JS and CSS
npm run lint:js       # Check JS only
npm run lint:css      # Check SCSS only
npm run lint:fix      # Auto-fix issues

# Formatting
npm run format        # Format all files
npm run format:check  # Check without modifying

# CSS
npm run build:css     # Compile SCSS
npm run watch:css     # Watch mode

# Build
npm run build         # Build + lint + format + check dependencies

# Architecture
npm run madge:check   # Check circular dependencies
npm run madge:summary # View statistics

# Tests
npm test              # Run tests
npm run test:ui       # Visual runner
npm run test:coverage # Coverage report
```

## Architecture

### Layer System

```
┌─────────────────────────────────┐
│  SHEETS (UI)                    │  Render UI, handle events
│  ✓ Import: documents, services  │  
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│  SERVICES (Logic)               │  Dice, chat, utilities
│  ✓ Import: utils, config        │  
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│  DOCUMENTS (Data)               │  Data prep, calculations
│  ✓ Import: utils, config        │  
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│  UTILS (Helpers)                │  Pure functions
│  ✓ Import: config only          │  
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│  CONFIG (Constants)             │  System constants
│  ✓ No imports                   │  
└─────────────────────────────────┘
```

### Directory Structure

```
module/
├── config/       # Constants, icons, templates
├── utils/        # Pure functions, no side effects
├── documents/    # Actor/Item data models
├── services/     # Dice rolls, combat, stance
├── sheets/       # UI rendering, event handling
├── apps/         # XP Manager, Wound Config
└── setup/        # Settings, templates, migrations
```

### Layer Rules

**Documents**
- Calculate derived data from actor's own data
- Examples: Armor TN from rings, Wounds from Earth, Insight from ranks
- Prepare display data
- Apply Active Effects
- No dice rolls (use Services)
- No UI (use Sheets)
- No async in `prepareDerivedData()`

**Services**
- Roll dice
- Create chat messages
- Show dialogs
- Manipulate documents
- No sheet rendering (use Sheets)

**Sheets**
- Render HTML
- Handle events
- Coordinate Documents and Services
- No calculations (read from Documents)
- No logic (call Services)

**Utils**
- Pure calculation functions used by multiple layers
- Examples: XP cost formulas, roll modifiers, type coercion
- Localization helpers
- No imports from Documents or Services
- No async operations
- No global state mutations

**Config**
- System IDs and paths
- Game data constants
- Localization keys
- No imports from other modules
- No side effects

### Import Rules

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
// Documents → Services
import { rollSkill } from "../services/dice/index.js";

// Services → Documents
import { preparePcExperience } from "../../documents/actor/calculations/xp-system.js";

// Utils → Anything except Config
import { L5R4Actor } from "../documents/actor.js";
```

### Shared Logic

Need the same function in multiple layers? Extract to Utils.

```javascript
// utils/xp-calculations.js
export function calculateXpStepCostForTrait(rank, freeBonus, discount) {
  return Math.max(0, 4 * (rank + freeBonus) + discount);
}

// Both documents and services import from utils
import { calculateXpStepCostForTrait } from "../../utils/xp-calculations.js";
```

### Import Order

```javascript
// Config
import { SYS_ID } from "../config/constants.js";

// Utils
import { toInt } from "../utils/type-coercion.js";

// Documents/Services
import { L5R4Actor } from "../documents/actor.js";
import { RingRoll } from "../services/dice/rolls/ring-roll.js";

// Local
import { helperFunction } from "./helper.js";
```

## Code Style

### Naming

- Files: `kebab-case.js`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_camelCase`

### JSDoc

Required for all public functions:

```javascript
/**
 * Brief description.
 *
 * Detailed explanation:
 * - Game mechanics
 * - Side effects
 * - Integration points
 *
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @throws {Error} When error occurs
 * @async
 * @example
 * const result = functionName(param);
 */
```

### Comments

Explain WHY, not WHAT. Document game mechanics. Note non-obvious behavior.

**Good:**
```javascript
// L5R4 uses XkY for skill rolls where X = skill+trait, Y = trait
const roll = new Roll(`${rollDice}d10k${keepDice}x10`);

// Void Ring costs 6× next rank XP
if (ring === "void") return nextRank * 6;
```

**Bad:**
```javascript
// Get the actor's name
const name = actor.name;

// Increment counter
counter++;
```

## Code Quality

### Tools

- **ESLint** - JS linting
- **Stylelint** - SCSS/CSS linting
- **Prettier** - Code formatting
- **Madge** - Circular dependency detection
- **EditorConfig** - Consistent formatting

### EditorConfig

Configures editors for:
- 2-space indentation (JS/JSON/SCSS/HTML)
- UTF-8 encoding
- LF line endings
- Trim trailing whitespace
- Insert final newline

Install EditorConfig extension for your editor.

### Pre-commit Hooks

Runs automatically on commit:

**JS files (*.js):**
- ESLint auto-fix
- Prettier formatting

**Style files (*.scss, *.css):**
- Stylelint auto-fix
- Prettier formatting

**Other files (*.json, *.md):**
- Prettier formatting

Only staged files checked. Bypass with `git commit --no-verify` (not recommended).

## Testing

### Status

Test coverage minimal. Contributing tests highly valuable.

### When Adding Features

**Always write tests for:**
- Utils (pure functions - easiest to test)
- Services (business logic)
- Document calculations (derived data)

**Test priority:**
1. Utils layer (highest ROI)
2. Services layer
3. Document calculations

### Framework

- Vitest - Unit tests
- happy-dom - DOM testing
- @vitest/ui - Visual runner

### Test Organization

```
tests/
├── integration/  # Foundry integration tests
└── unit/         # Unit tests (create as needed)
```

### Example

```javascript
import { describe, it, expect } from 'vitest';
import { toInt } from '../module/utils/type-coercion.js';

describe('toInt', () => {
  it('converts strings to integers', () => {
    expect(toInt("42")).toBe(42);
  });

  it('returns fallback for invalid values', () => {
    expect(toInt("invalid", 10)).toBe(10);
  });
});
```

## Submitting Changes

### Pre-Submit Checklist

1. Run `npm run build`
2. Test in Foundry:
   - Create test actors/items
   - Verify functionality
   - Check console for errors
3. Write or update tests
4. Update documentation:
   - JSDoc for all new/modified public functions (required)
   - README.md if adding user-facing features
   - CHANGELOG.md for notable changes

### Pull Request Process

1. Fork repository
2. Create feature branch: `git checkout -b feature/your-feature-name`
3. Make changes:
   - Follow code style
   - Add JSDoc
   - Keep commits focused
4. Commit:
   ```
   feat: Add stance damage bonuses
   fix: Correct XP calculation for Void Ring
   docs: Update README
   refactor: Extract skill roll logic
   ```
5. Push: `git push origin feature/your-feature-name`
6. Open Pull Request:
   - Describe changes
   - Reference issues
   - Include screenshots for UI

### PR Requirements

- ✅ Automated checks pass
- ✅ Code follows style guide
- ✅ JSDoc added
- ✅ No console.log statements
- ✅ Tested in Foundry
- ✅ Documentation updated

## Troubleshooting

### Circular Dependency

Run `npm run madge:check` to find cycle. Extract shared logic to Utils or use events/hooks.

**Fix example:**

```javascript
// ❌ Circular
import { applyStanceAutomation } from "../services/stance/index.js";

// ✅ Fixed: Extract to utils or documents
export function applyStanceEffects(actor, sys) {
  /* ... */
}
```

### Wrong Layer Import

Documents importing Services (or vice versa)? Extract to Utils.

## Resources

### Foundry VTT

- [API Documentation](https://foundryvtt.com/api/)
- [Application v2 Guide](https://foundryvtt.com/article/application-v2/)

### L5R4 Rules

- Core Rulebook (required)
- `game-rules/` directory

### Help

- Questions: [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)
- Bugs: [GitHub Issues](https://github.com/ernieayala/l5r4/issues)

## Code of Conduct

- Be respectful and constructive
- Focus on code, not person
- Create welcoming environment
