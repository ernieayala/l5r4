---
description: This tests the vitest and quench implementation of a file.
auto_execution_mode: 1
---

# Vitest Unit Test Protocol

**TARGET:** [file_path] | **OUTPUT:** Tests + code fixes + @integration-test tags
**LIMITS:** 500 lines/file | 100% coverage mandate | Behavior validation required
**PRIORITY:** Game Rules > Correctness > Behavior > Coverage > Execution

## Critical Mandates
1. **GAME RULES FIRST** - Read ALL game-rules/ folder files, verify implementation correctness
2. **FIX EXISTING TESTS** - Repair ALL non-compliant tests BEFORE writing new ones  
3. **100% COVERAGE** - Test everything: utilities, defensive branches, all edge cases
4. **BEHAVIOR > EXECUTION** - Validate actual outcomes per rules, not just code runs
5. **MINIMAL MOCKING** - Real utilities where possible, mock external APIs only
6. **MARK INTEGRATION** - Add @integration-test JSDoc tags where unit tests insufficient

## False Confidence Warning
**⚠️ COVERAGE ≠ VALIDATION** - Tests must validate **outcomes**, not **execution paths**

```javascript
// ❌ BAD TEST (Execution Coverage Only):
it('should call update', async () => {
  const mockUpdate = vi.fn();
  actor.update = mockUpdate;
  await handler.adjust();
  expect(mockUpdate).toHaveBeenCalled(); // ✓ Passes even if update is broken
});

// ✅ GOOD TEST (Behavior Validation):
it('should clamp value to max per game rules', async () => {
  const result = await handler.adjust(actor, 15); // Input exceeds max
  expect(actor.getData().value).toBe(10); // ✓ Validates actual outcome
  // Per game rule: Void Ring max is 10
});

// ❌ BAD: Re-implementing framework
globalThis.utils = {
  getProperty: vi.fn((obj, path) => { /* custom logic */ })
};

// ✅ GOOD: Simple stub with documented assumption
// ASSUMPTION: getProperty returns undefined for invalid paths
// INTEGRATION: Verify actual framework behavior
globalThis.utils = {
  getProperty: vi.fn((obj, path) => obj[path])
};
```

## Test Classification
```
INPUT: function_to_test

IF (pure_calculation OR data_transformation):
  → UNIT_TEST (no mocks, real data structures)
  
ELSE IF (uses_external_api AND logic_is_separable):
  → UNIT_TEST + MINIMAL_MOCK + DOCUMENT_ASSUMPTION + FLAG_FOR_INTEGRATION
  
ELSE IF (complex_workflow OR requires_real_framework_objects):
  → MINIMAL_UNIT_TEST (test what you can) + FLAG_INTEGRATION
  
ELSE IF (truly_untestable_without_integration):
  → COVERAGE_IGNORE + FULL_JUSTIFICATION + FLAG_INTEGRATION
```

## Mocking Decision Tree
```
QUESTION: Should I mock this dependency?

IF (external_api_you_dont_control):
  → MOCK_MINIMALLY + DOCUMENT_ASSUMPTION
ELSE IF (nondeterministic: random, time, uuid):
  → MOCK_IT
ELSE IF (your_own_utility_function):
  → USE_REAL + TEST_DIRECTLY
ELSE IF (simple_data_structure):
  → USE_REAL

AVOID: Over-mocking (>3 per test), re-implementing framework

PATTERN:
// ASSUMPTION: fromUuid() returns null for invalid UUIDs
// INTEGRATION: Verify actual API behavior 
globalThis.fromUuid = vi.fn(() => null);
const result = await handler.process(invalidUuid);
expect(result).toBe(fallbackValue); // Validate outcome, not mock
```

## Production Code Markers
```javascript
/**
 * @integration-test Scenario: Family item with transfer:true modifies actor
 * @integration-test Reason: Unit tests mock Active Effects completely
 * @integration-test Validates: Effects transfer and modify derived data
 */
async function applyFamilyBonus(actor, familyUuid) {
  // implementation
}
```

## Phase 0: Existing Test Audit & Repair

**AUDIT EACH TEST FOR:**
1. Only checks mock calls? → FALSE CONFIDENCE
2. Over-mocked (>3 dependencies)? → UNNECESSARY COMPLEXITY  
3. Re-implements framework logic? → INVALID TEST
4. Missing game rule citations? → INCOMPLETE
5. Incorrect expectations? → WRONG VALIDATION

**REPAIR ACTIONS:**
```
IF (only_checks_mock_calls):
  → REFACTOR to behavior validation
  → REPLACE: expect(mock).toHaveBeenCalled() 
     WITH: expect(actual_outcome).toBe(expected_per_rules)
  
IF (over_mocked: count > 3):
  → REDUCE mocking to essentials
  → IMPORT and use real utilities
  
IF (missing_game_rule_citations):
  → ADD game rule references to comments
  → CITE specific rules in assertions
```

## Phase 1: Function Analysis & Game Rules Research

**1.1 Identify Testable Logic:**
- What calculations/transformations does function perform?
- What are inputs, outputs, return values?
- What dependencies exist (are they mockable)?
- What side effects occur (flag for integration)?
- What edge cases and boundaries exist?

**1.2 Read Game Rules Documentation:**
- REVIEW: ALL relevant files in game-rules/ folder
- DOCUMENT: Expected outputs per game mechanics
- NOTE: Edge cases, boundary conditions, special rules
- IDENTIFY: Correctness criteria from game system

**1.3 Audit Function Implementation vs Game Rules:**
- VERIFY: Does function implement game rules correctly?
- CHECK: Are formulas accurate per rules documentation?
- CHECK: Are edge cases handled per game system?

IF (violations_found):
  → FIX_FUNCTION_CODE_FIRST
  → VERIFY_FIX_AGAINST_RULES
  → THEN_WRITE_TESTS

## Phase 2: Test Implementation

### Test Organization
**Single File (<500 Lines):**
- Organize describe blocks by function/scenario
- Group related test cases together
- Reference game rules in comments

**Multi-File (>500 Lines):**
```
SPLIT STRATEGIES:
  1. BY FUNCTION GROUP: Related utilities together
  2. BY FEATURE AREA: One game mechanic per file

MONITORING:
  400 lines → ASSESS potential split points
  450 lines → PLAN split strategy
  500 lines → EXECUTE SPLIT IMMEDIATELY

SHARED UTILITIES (DRY):
  - Extract reusable test data factories
  - Extract mock configurations
  - Document with JSDoc
```

### Writing Tests

**STEP 1: Verify Function Correctness Against Game Rules**
```
QUESTION: What should this function do per game rules?
VERIFY: Does it actually implement those rules correctly?

IF (NO - function is incorrect):
  → FIX_FUNCTION_FIRST
  → VERIFY_FIX_AGAINST_RULES
  → THEN_PROCEED_TO_TESTING
```

**STEP 2: Write Behavior Validation Tests**
```javascript
describe('VoidRingAdjustment', () => {
  // SCOPE: Void ring rank adjustment with XP tracking
  // MOCKS: actor.update (external API)
  // GAME_RULES: void-ring-advancement.md, xp-costs.md
  
  describe('when increasing void ring rank', () => {
    it('should increment rank and deduct XP per game rules', async () => {
      // ARRANGE: Actor with void 2, sufficient XP
      const actor = createTestActor({
        voidRank: 2,
        xp: 12
      });
      
      // ACT
      await adjustVoidRing(actor, 1);
      
      // ASSERT: Validates outcome per game rules
      expect(actor.system.rings.void.rank).toBe(3); // Per void-ring-advancement.md
      expect(actor.system.xp).toBe(0); // Cost: rank * 6 = 12 XP
    });
    
    it('should handle max rank boundary per game rules', async () => {
      const actor = createTestActor({ voidRank: 10, xp: 100 });
      
      await adjustVoidRing(actor, 1);
      
      expect(actor.system.rings.void.rank).toBe(10); // Max is 10 per rules
      expect(actor.system.xp).toBe(100); // No XP spent when at max
    });
  });
  
  // 🚩 INTEGRATION_NEEDED:
  // - Scenario: Concurrent updates from multiple clients
  // - Reason: Race conditions cannot be unit tested
  // - Unit_coverage: Single-client logic, XP calculations, boundary checks
});
```

**Test Naming:** "should [outcome] when [condition] per [game_rule]"

**Test Data:**
- Simple primitives and plain objects
- Realistic game data per rules
- Isolated data (no shared state)
- Constants for game mechanic values

**Assertions:**
- Return values match game rules exactly
- State changes correct per game mechanics
- Error outcomes handled appropriately

## Phase 3: When Tests Fail

**RESOLUTION:**
```
IF (function_violates_game_rules):
  → FIX_FUNCTION_IMPLEMENTATION
  → VERIFY_FIX_AGAINST_RULES
  
ELSE IF (test_expectations_wrong):
  → FIX_TEST_EXPECTATIONS
  → VERIFY_AGAINST_GAME_RULES
  
ELSE IF (edge_case_unhandled):
  → ADD_DEFENSIVE_CODE
  → UPDATE_TEST
```

## Phase 4: Coverage Analysis & Integration Flagging

**Coverage Loop:**
```
REPEAT UNTIL (coverage == 100% OR all_gaps_justified):
  
  1. RUN coverage report (vitest --coverage)
  2. IDENTIFY all gaps (untested lines, branches, functions)
  3. CATEGORIZE gaps:
     - Testable with behavior validation?
     - Requires integration test?
     - Truly untestable?
  
  4. FOR testable_gaps:
     → WRITE behavior validation tests
  
  5. FOR integration_gaps:
     → MOCK what's possible
     → ADD @integration-test tag to production code
  
  6. FOR truly_untestable:
     → ADD coverage ignore with justification
```

**Integration Flagging Formats:**

Test files:
```javascript
// 🚩 INTEGRATION_NEEDED:
// - Scenario: [specific behavior to validate]
// - Reason: [why unit tests are insufficient]
// - Validates: [expected real behavior]
// - Unit_coverage: [what unit tests already cover]
```

Production code:
```javascript
/**
 * @integration-test Scenario: [what needs testing]
 * @integration-test Reason: [why unit insufficient]
 * @integration-test Validates: [expected behavior]
 */
```

Coverage ignores:
```javascript
// COVERAGE_IGNORE: Framework lifecycle hook
// Reason: Requires real document context
/* c8 ignore next 5 */
```

## Quality Requirements

**Test Isolation:**
- No shared state between tests
- Independent test execution order
- Clean mocks (minimal, documented)
- beforeEach/afterEach for setup/teardown

**Mocking Quality:**
- Mock external dependencies only
- Keep mocks simple and focused
- Document all assumptions
- Reset mocks between tests
- Never re-implement framework logic

**Coverage Goals:**
- 100% line/branch/function coverage
- All edge cases per game rules
- All error conditions
- All defensive branches

**Documentation Standards:**
- EVERY test file: Scope, rules, strategy, mocks
- EVERY test block: Rule/edge case validated
- EVERY assertion: Cite game rule
- HELPERS: JSDoc, params, rule refs

**File Size Enforcement:**
- Monitor continuously
- Assess at 400 lines
- Plan at 450 lines
- Execute split at 500 lines

## 17-Step Methodology

1. Audit tests → false confidence patterns
2. FIX non-compliant → behavior, mocks, rules
3. Analyze function → logic, deps, effects
4. Research game rules → ALL game-rules/ files
5. Audit vs rules → violations
6. Fix function → verify → doc
7. Coverage report → gaps
8. Classify → pure|mock|flagged
9. Behavior tests → outcomes per rules
10. Real utilities → minimize mocks
11. Strategic mocks → external, document
12. 100% coverage → test testable
13. Ignores → justified only
14. Flag integration → tests + @tags
15. Monitor size → split at 500
16. Extract shared → DRY
17. Re-run → 100% OR justified

## Critical Rules

- **FIX EXISTING FIRST** - repair before new
- **GAME RULES PARAMOUNT** - read game-rules/, verify always
- **100% COVERAGE** - behavior validation not execution
- **MINIMAL MOCKING** - real utils, external APIs only
- **VERIFY RULES FIRST** - fix function if violates
- **FLAG INTEGRATION** - but still cover what's possible
- **500 LINE MAX** - split at limit
- **CITE RULES** - everywhere
- **MARK CODE** - @integration-test tags

## Success Checklist

✅ Existing tests fixed (behavior, minimal mocks, rules)
✅ 100% coverage OR justified ignores
✅ Behavior validated (outcomes per rules)
✅ Mocking minimal + documented
✅ Integration flagged (tests + @tags)
✅ Files <500 lines
✅ Shared extracted (DRY)
✅ Rules cited everywhere
✅ Functions fixed before testing
✅ Coverage proves rules compliance