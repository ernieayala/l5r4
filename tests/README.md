# L5R4 Enhanced Test Suite

## Overview

This directory contains the complete test suite for the L5R4 Enhanced system, implementing a two-tier testing strategy:

- **Vitest** - Fast unit tests for pure functions and calculations
- **Quench** - Integration tests for Foundry-dependent code

## Directory Structure

```
tests/
├── unit/                    # Vitest unit tests (fast, isolated)
│   ├── utils/              # Utils layer tests
│   ├── documents/          # Document calculation tests
│   └── services/           # Service logic tests
├── integration/            # Quench integration tests (Foundry environment)
│   ├── documents/          # Document lifecycle tests
│   ├── services/           # Service integration tests
│   ├── sheets/             # Sheet interaction tests
│   └── workflows/          # End-to-end workflow tests
└── fixtures/               # Shared test data and helpers
    ├── test-helpers.js     # Common test utilities
    ├── actor-fixtures.js   # Actor test data (future)
    └── item-fixtures.js    # Item test data (future)
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests once
npm run test

# Run only unit tests
npm run test:unit

# Watch mode - reruns on file changes
npm run test:watch

# Open Vitest UI in browser
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Integration Tests (Quench)

Integration tests run inside Foundry VTT:
1. Launch Foundry VTT
2. Open the L5R4 Enhanced system
3. Open Quench UI (module must be enabled)
4. Select test batches to run
5. Click "Run Selected Tests"

## Testing Philosophy

### Tests Must Find Real Bugs

- Tests exist to catch broken code, not validate working code
- Focus on edge cases, boundaries, and error conditions
- If a test passes on broken code, it's worthless
- Quality over quantity - one good test beats ten useless ones

### What to Test

**High Priority (Test First):**
- Core mechanics (wound system, XP calculations, Roll and Keep)
- Ring and trait calculations
- Critical game rules
- Data transformations with edge cases

**Medium Priority:**
- Common operations
- Item lifecycle
- Service integrations

**Low Priority (Don't Test):**
- Simple getters/setters
- Framework code
- Trivial utilities
- Configuration constants

### What Makes a Good Test

✅ **Good tests:**
- Find bugs when code breaks
- Test behavior, not implementation
- Cover edge cases and boundaries
- Run fast (unit tests < 1s)
- Independent and deterministic
- Have clear failure messages

❌ **Bad tests:**
- Only test happy paths
- Test implementation details
- Are flaky or non-deterministic
- Break on every refactor
- Don't catch actual bugs

## Writing Tests

### AAA Pattern (Required)

Every test must follow Arrange-Act-Assert:

```javascript
import { describe, it, expect } from 'vitest';

describe('calculateWoundCapacity', () => {
  it('should calculate capacity for Earth Ring 2', () => {
    // ARRANGE - Set up test data
    const earthRing = 2;
    const multiplier = 2;
    
    // ACT - Execute the function
    const result = calculateWoundCapacity(earthRing, multiplier);
    
    // ASSERT - Verify the result
    expect(result).toBe(4);
  });
});
```

### Test Organization

```javascript
describe('functionName', () => {
  describe('valid inputs', () => {
    it('should handle typical case', () => {});
    it('should handle another case', () => {});
  });
  
  describe('boundary cases', () => {
    it('should handle minimum value', () => {});
    it('should handle maximum value', () => {});
  });
  
  describe('edge cases', () => {
    it('should handle null input', () => {});
    it('should handle undefined input', () => {});
    it('should handle invalid type', () => {});
  });
  
  describe('error conditions', () => {
    it('should throw error when invalid', () => {});
  });
});
```

### Descriptive Test Names

Format: "should [expected behavior] when [condition]"

✅ Good:
```javascript
it('should return 10 when calculating armor TN for Reflexes 2', () => {})
it('should throw error when Ring value exceeds 10', () => {})
it('should return default value when input is null', () => {})
```

❌ Bad:
```javascript
it('test armor TN', () => {})
it('works', () => {})
it('handles edge case', () => {})
```

## Test Helpers

Use shared test helpers from `fixtures/test-helpers.js`:

```javascript
import { 
  createMockActorData,
  createMockItemData,
  getValidRingValues,
  getInvalidRingValues
} from '../fixtures/test-helpers.js';

// Create test actor
const actor = createMockActorData({ 
  rings: { earth: { value: 5 } }
});

// Get test data sets
const validValues = getValidRingValues(); // [1, 2, 3, ... 10]
const invalidValues = getInvalidRingValues(); // [0, -1, 11, null, ...]
```

## Mutation Testing

Validate every test by introducing bugs:

1. Write test
2. Test passes ✅
3. Break the code (introduce bug)
4. Test should FAIL ❌
5. If test still passes → DELETE or FIX the test

Example:
```javascript
// Original
function add(a, b) {
  return a + b;
}

// Test
expect(add(2, 3)).toBe(5); // Passes ✅

// Break it
function add(a, b) {
  return a * b; // BUG!
}

// Test should fail ❌
// If test still passes, the test is worthless
```

## Coverage

### Coverage is NOT the Goal

Don't chase coverage percentages. Focus on:
- Critical code is tested thoroughly
- Edge cases are validated
- Tests find bugs when code breaks

Coverage tells you which lines were executed, not:
- If tests are good
- If edge cases are covered
- If tests find bugs
- If code is correct

## Anti-Patterns to Avoid

❌ **Testing implementation details**
```javascript
expect(actor._internalCache).toBeDefined(); // Don't test private details
```

❌ **Testing only happy paths**
```javascript
expect(add(2, 3)).toBe(5); // Missing edge cases
```

❌ **Excessive mocking**
```javascript
vi.mock('./module1');
vi.mock('./module2');
vi.mock('./module3');
// Now not testing anything real
```

❌ **Shared state between tests**
```javascript
let shared;
it('test 1', () => { shared = 5; }); // Don't do this
it('test 2', () => { expect(shared).toBe(5); }); // Fails if run alone
```