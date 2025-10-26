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

### Test Suite Status ✅

- **440 unit tests** passing
- **~1.5 second** execution time
- **78.55%** coverage of tested modules
- **Zero** circular dependencies

### Testing Philosophy

**Tests exist to find bugs, not achieve metrics.**

✅ **Do:**
- Test behavior, not implementation
- Test edge cases and boundaries
- Test error conditions
- Write independent tests
- Use descriptive test names

❌ **Don't:**
- Test only happy paths
- Test framework code
- Test trivial getters
- Chase coverage metrics
- Create flaky tests

### Frameworks

**Unit Tests (Vitest):**
- Pure functions in `utils/`
- Calculation logic
- Document derived data
- Fast execution (< 5s total)

**Integration Tests (Quench):**
- Foundry-dependent code
- Documents, Services, Sheets
- Complete workflows
- Run in Foundry VTT

### Commands

```bash
# Unit Tests (Vitest)
npm test                # Run all unit tests
npm run test:unit       # Run unit tests
npm run test:watch      # Watch mode
npm run test:ui         # Visual runner
npm run test:coverage   # Coverage report

# Integration Tests (Quench)
# Run in Foundry VTT via Quench module UI
```

### Test Organization

```
tests/
├── unit/                    # Vitest unit tests
│   ├── utils/              # Pure function tests
│   ├── documents/          # Calculation tests
│   └── smoke.test.js       # Basic sanity checks
├── integration/            # Quench integration tests
│   ├── documents/          # Actor/Item lifecycle
│   ├── services/           # Dice, combat, XP
│   ├── sheets/             # UI rendering
│   └── workflows/          # Complete sequences
└── fixtures/               # Shared test data
    ├── actor-fixtures.js
    ├── item-fixtures.js
    ├── test-helpers.js
    └── mock-data.js
```

### Writing Unit Tests

**AAA Pattern (Required):**
```javascript
import { describe, it, expect } from 'vitest';
import { toInt } from '../module/utils/type-coercion.js';

describe('toInt', () => {
  it('should convert valid strings to integers', () => {
    // ARRANGE
    const input = "42";
    
    // ACT
    const result = toInt(input);
    
    // ASSERT
    expect(result).toBe(42);
  });

  it('should return default for invalid values', () => {
    // ARRANGE
    const invalid = "not-a-number";
    const fallback = 10;
    
    // ACT
    const result = toInt(invalid, fallback);
    
    // ASSERT
    expect(result).toBe(10);
  });

  it('should handle null/undefined', () => {
    expect(toInt(null, 5)).toBe(5);
    expect(toInt(undefined, 5)).toBe(5);
  });
});
```

**Test Edge Cases:**
```javascript
describe('valueToRankPoints', () => {
  describe('edge cases', () => {
    it('should handle minimum value', () => {
      expect(valueToRankPoints(0)).toEqual({ rank: 0, points: 0, value: 0 });
    });

    it('should handle maximum value', () => {
      expect(valueToRankPoints(10)).toEqual({ rank: 10, points: 0, value: 10 });
    });

    it('should handle null/undefined', () => {
      expect(valueToRankPoints(null)).toEqual({ rank: 0, points: 0, value: 0 });
    });

    it('should handle points overflow', () => {
      // 9.95 should round to 10.0 (rank 10, points 0)
      expect(valueToRankPoints(9.95)).toEqual({ rank: 10, points: 0, value: 10 });
    });
  });
});
```

### Writing Integration Tests

**Quench Tests (Foundry):**
```javascript
export function registerActorTests(quench) {
  quench.registerBatch(
    'l5r4-enhanced.actor-tests',
    (context) => {
      const { describe, it, assert, before, after } = context;

      describe('Actor Creation', () => {
        let actor;

        before(async () => {
          actor = await Actor.create({
            name: 'Test Character',
            type: 'pc'
          });
        });

        after(async () => {
          await actor.delete();
        });

        it('should calculate Armor TN', () => {
          const armorTN = actor.system.armorTn.current;
          assert.exists(armorTN, 'Armor TN calculated');
          assert.isNumber(armorTN, 'Armor TN is number');
        });
      });
    },
    { displayName: 'L5R4: Actor Tests' }
  );
}
```

**CRITICAL:** Always clean up documents in `after`/`afterEach` hooks.

### Test Priorities

**Tier 1 (Test First):**
- Core mechanics (XP costs, wound calculations)
- Resource calculations (insight, armor TN)
- Critical workflows (combat, advancement)

**Tier 2 (Test When Stable):**
- Secondary mechanics
- Helper functions
- Data transformations

**Tier 3 (Low Priority):**
- Trivial code
- Simple data models
- Configuration

**Don't Test:**
- Framework code
- Foundry APIs
- External libraries
- Constants

### When Adding Features

1. **Identify layer** - Utils, Services, Documents, etc.
2. **Choose test type:**
   - **Utils:** Unit tests (Vitest)
   - **Services:** Integration tests (Quench)
   - **Documents:** Both (unit for calculations, integration for lifecycle)
3. **Write tests** - During or immediately after implementation
4. **Verify bugs caught** - Introduce deliberate bug, test should fail

### Test Patterns

**Pure Function (Utils):**
```javascript
describe('calculateXpCost', () => {
  it('should calculate trait XP cost', () => {
    // Trait XP = 4 × (next rank)
    expect(calculateXpCost('trait', 2)).toBe(12);
    expect(calculateXpCost('trait', 5)).toBe(24);
  });
});
```

**Document Calculation:**
```javascript
describe('Actor Derived Data', () => {
  it('should calculate insight from rings and skills', () => {
    const actor = createTestActor({
      rings: { earth: 3, air: 3 },
      skills: [{ rank: 2 }, { rank: 3 }]
    });
    
    // Insight = sum of rings + sum of skill ranks
    // (3+3) + (2+3) = 11
    expect(actor.system.insight.points).toBe(11);
  });
});
```

**Workflow Test:**
```javascript
describe('Combat Workflow', () => {
  it('should track wound progression', async () => {
    // Create defender
    const defender = await createTestPC();
    const healthyMax = defender.system.woundLevels.healthy.value;

    // Apply damage within healthy range
    await defender.update({ 'system.suffered': 5 });
    const updated = game.actors.get(defender.id);
    
    assert.isTrue(updated.system.woundLevels.healthy.current);

    // Apply damage exceeding healthy
    await defender.update({ 'system.suffered': healthyMax + 2 });
    const wounded = game.actors.get(defender.id);
    
    assert.isTrue(wounded.system.woundLevels.nicked.current);
  });
});
```

### Troubleshooting Tests

**Tests failing after update:**
- Check for stale actor references
- Refresh using `game.actors.get(actor.id)` after updates
- Foundry doesn't auto-refresh local variables

**Tests pass with broken code:**
- Test is worthless, delete it
- Or fix test to actually validate behavior

**Flaky tests:**
- Check for shared state between tests
- Ensure proper cleanup in `afterEach`
- Verify no timing dependencies

**Slow tests:**
- Unit tests should complete in < 5s total
- Integration tests < 5s each
- Minimize document creation
- Use fixtures for test data

### Resources

- **Test README:** `tests/README.md`
- **Fixtures:** `tests/fixtures/`
- **Vitest Docs:** https://vitest.dev
- **Quench Docs:** https://github.com/Ethaks/FVTT-Quench

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
