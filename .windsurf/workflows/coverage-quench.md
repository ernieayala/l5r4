---
description: This is for the Quench testing.
auto_execution_mode: 1
---

# Quench Integration Test Coverage & Workflow Validation

**TARGET FILE: [specify file path to test]**

**CRITICAL CONSTRAINTS:**
- NO markdown reports/documentation - just fix code and write tests
- Quench = INTEGRATION TESTS ONLY (real Foundry environment, real components)
- Pure logic/unit testing → FLAG FOR VITEST
- Game rules compliance FIRST - code correctness before test coverage
- **MAX 500 LINES per test file** - split intelligently if exceeded
- **EXTREME DOCUMENTATION** maintained across all files (JSDoc, comments, rule citations)

---

## Scope: Quench vs Vitest

### ✅ QUENCH (Integration):
- User workflows (complete action → final result)
- Cross-component data flow (Actor → Sheet → Chat → World)
- Foundry environment (real rendering, hooks, game objects)
- Event cascades, state persistence, DOM interactions

### ❌ FLAG FOR VITEST (Unit):
- Pure calculations (isolated formulas, mocked dependencies)
- Data transformations (simple input → output)
- Single function logic (isolated, mockable)

**Decision:** Can mock everything? → VITEST. Need real Foundry/multiple components? → QUENCH

---

## Phase 0: Existing Test Audit (START HERE)

1. **Inventory:** List all Quench batches for target workflow
2. **Categorize:** Valid integration | Unit (flag for Vitest) | Obsolete | Duplicate
3. **Organization Check:** DRY? Readable? Best practices? File size under 500 lines?
4. **Document:** Test counts and coverage gaps

---

## Phase 1: Workflow Mapping & Rules Research

### 1.1 Map Complete Data Flow
- All components involved
- All integration points (boundaries)
- Data transformations across boundaries
- State changes and persistence
- Async operations and event flows
- Foundry hooks and dependencies

### 1.2 Read Game Rules
- Review ALL relevant game-rules files
- Understand complete rule set
- Cross-reference workflow against rules
- Document expected end-to-end behavior per rules
- Note edge cases and boundaries

### 1.3 Audit Integration Against Rules
- Does integration match game rules end-to-end?
- Do components communicate correctly?
- Do state changes persist properly?
- Do events cascade correctly?
- **IF VIOLATIONS:** Fix INTEGRATION code FIRST → verify → then test

---

## Phase 2: Integration Points Analysis (Go Slow)

For each integration point:

**ANALYZE:**
1. What data flows across boundary?
2. How is data transformed?
3. What events/hooks trigger?
4. What state changes occur?
5. Any async operations?
6. Database persistence?

**DECISION:**
- IF (testable in isolation with mocks) → FLAG FOR VITEST
- ELSE IF (requires real Foundry objects/events) → Quench integration test
- ELSE IF (complete user workflow) → Quench end-to-end test

**Coverage Gaps:**
- List all user workflows for target feature
- Identify untested workflows
- Map data flow, verify against rules
- Fix integration if incorrect
- Add to test plan

---

## Phase 3: Test Implementation

### 3.1 Organization

**Single File (Under 500 Lines):**
- Batches by major system/workflow
- Describe blocks for scenarios
- before/after hooks for test data
- Async test blocks for integration points
- All rule references commented

**Multi-File (When Exceeding 500 Lines):**

**WHEN TO SPLIT:**
- File approaches 500 lines → plan split NOW
- Natural boundaries exist (workflows, components, features)

**SPLITTING STRATEGIES:**
1. BY WORKFLOW (Preferred): Each major user workflow gets own file
2. BY COMPONENT BOUNDARY: Integration points between components
3. BY FEATURE AREA: Related game mechanics grouped
4. BY SCENARIO TYPE: Happy path | Edge cases | Error handling

**SHARED UTILITIES (DRY):**
- Extract reusable test data creation to helpers
- Extract common cleanup to helpers
- Document helper usage with JSDoc and cross-references
- Maintain extreme documentation in helpers

**CROSS-FILE DOCUMENTATION:**
- Each file: Header explaining scope and relationships
- Shared helpers: Full JSDoc with @see tags linking related files
- Cross-references between related test files
- Clear documentation flow across split files

### 3.2 Writing Tests

**STEP 1: Verify Integration Against Rules**
- What should the complete workflow do per rules?
- Does integration currently do this?
- If NO → Fix integration code first, then test

**STEP 2: Write Integration Test**
- Create test data in before() (real Foundry objects)
- Execute complete workflow (user action → final state)
- Verify each integration point
- Assert final state matches rules
- Clean up ALL test data in after()

**Test Categories:**
- User Workflows: Action → result
- Cross-Component Flow: Data propagation
- State Persistence: Across sessions
- Event Cascades: Trigger chains
- Error Propagation: Graceful handling

**Naming Convention:**
- "should complete [action] workflow per [rule]"
- "should propagate [change] from [A] to [B]"
- "should handle [error] gracefully in [workflow]"

### 3.3 Test Data
- Create in before() using real Foundry objects
- Use realistic game data
- Clean up ALL in after() (no pollution)
- Isolate tests (no shared state)
- Handle async properly with await
- Extract to helpers if used across files

### 3.4 File Size Management

**CONTINUOUS MONITORING:**
- Track line count as you write
- At 400 lines → assess if splitting needed
- At 450 lines → MUST plan split strategy
- At 500 lines → STOP, split immediately

**SPLIT CHECKLIST:**
- Identify logical boundaries (workflows, components, features)
- Create new files with descriptive names
- Move related tests to new files
- Extract shared code to helpers
- Add cross-reference headers to all files
- Verify all imports/exports work
- Ensure shared cleanup still works
- Update documentation in all files
- Verify each file < 500 lines
- Verify extreme documentation maintained

---

## Phase 4: When Integration Tests Fail

**TRACE DATA FLOW:**
1. Which integration point failed?
2. What should happen per rules?
3. What is integration code doing?
4. What does test expect?

**GROUND TRUTH = Rulebook**

**RESOLUTION:**
- IF (integration violates rules) → Fix INTEGRATION CODE → verify → document
- ELSE IF (test expectations wrong) → Fix TEST assertions → verify → document
- ELSE IF (boundary unclear) → Refactor separation → update integration → update test
- ELSE IF (rules ambiguous) → Implement logical interpretation → document assumption

Document: failed integration point, resolution, verified rule, assumptions

---

## Phase 5: Vitest Flagging

**Flag for Vitest when:**
- Pure calculation (no Foundry needed)
- Data transformation (mockable)
- Utility function (no real objects)
- Boundary logic (isolatable)

**Document:** Logic to unit test, why no integration needed, rule it validates, location

---

## Phase 6: Quench Requirements

### Batch Organization
- Group related tests logically
- Descriptive batch names (workflow-based)
- One batch per major system/feature
- Split into multiple files if exceeding 500 lines

### Test Data Management
- Real Foundry document creation
- Realistic game scenarios
- Clean up ALL in after() hooks
- Complete isolation between tests
- Extract shared test data to helpers for reuse

### Foundry Context
- Run in actual Foundry environment
- Test real rendering and interactions
- Test actual game mechanics in context
- Test real hooks/events
- Verify real database persistence

### Async Handling
- All tests async functions
- Properly await operations
- Handle timing issues
- Use waitFor for UI updates

---

## Coverage Requirements

✅ All critical user workflows end-to-end
✅ All component boundaries
✅ All state changes verified
✅ All async operations
✅ All error conditions
✅ All game rules in context
✅ Performance where relevant

---

## CRITICAL RULES

- NO reports/docs - just fix code and write tests
- Go SLOW - integration is complex
- ALWAYS verify workflow against rules FIRST
- Test REAL Foundry, not mocked simulations
- Every test validates complete user workflow
- Fix INTEGRATION CODE first if broken, then test
- Clean up ALL test data
- Cite game rules in comments
- NO test passes incorrect integration
- Unit testable? → FLAG FOR VITEST
- **MAX 500 LINES per test file - split intelligently**
- **EXTREME DOCUMENTATION across all files (JSDoc, comments, cross-references)**
- **Extract shared code to helpers for DRY**
- **Maintain clarity when splitting - clear file relationships**

---

## Documentation Standards

### File Size Enforcement
1. Monitor continuously - check line count as you write
2. Plan at 400 lines - identify split strategy
3. Act at 450 lines - begin splitting process
4. Hard stop at 500 lines - must split before continuing
5. Never exceed 500 lines in any single test file

### Extreme Documentation Requirements
- **Every test file:** Comprehensive header explaining scope, relationships, rules covered
- **Every test block:** Comment explaining what workflow/integration it validates
- **Every assertion:** Inline comment citing specific game rule
- **Shared helpers:** Full JSDoc with param descriptions, rule references
- **Cross-references:** Use @see tags to link related files and rules
- **Splitting maintains docs:** Documentation flows logically across files

### Split File Documentation Pattern
Each split file needs header with:
- Primary purpose
- Part of larger test suite (which one)
- Why this file was separated
- What this file covers (specific workflows/integrations)
- Related files and what they cover
- Shared utilities used
- Game rules validated (@see tags)

---

## Methodology

1. Audit existing tests → validate/consolidate/remove/improve
2. Map complete workflow + integration points
3. Research game rules for workflow
4. Audit integration code vs rules
5. Fix broken integrations before tests
6. Determine boundaries (integration vs unit)
7. Write Quench tests in real Foundry
8. **Monitor file size - split at 500 lines**
9. **Extract shared code to helpers (DRY)**
10. **Maintain extreme documentation across all files**
11. Verify in actual environment
12. Clean up test data
13. Flag unit needs for Vitest
14. Document in code comments only

Proceed methodically through each phase.