---
description: This is to test to see if tests actually work.
auto_execution_mode: 1
---

# Single File False Confidence Detector

**Usage:** Type `Analyze Quality` when viewing any file in Windsurf

---

## Core Paradox Mission

```
SUSPICIOUS PATTERN DETECTED:
✓ Extensive test coverage exists
✓ Tests pass consistently  
✗ Almost ZERO bugs found/fixed

CRITICAL QUESTION:
Is the code genuinely robust, or are tests giving FALSE CONFIDENCE?
```

---

## Generated Windsurf Prompt

```
False Confidence Analysis - Current File

FILE: [current file path]
TYPE: [implementation | test]

🚨 PARADOX INVESTIGATION 🚨
This file has tests that pass, but NO bugs have been found.
That's either a miracle, or the tests are lying.

Your mission: Prove the tests wrong OR prove the code is genuinely robust.

---

## PHASE 1: THE FALSE CONFIDENCE TEST

**For Test Files - Ask:**

1. **Execution vs. Behavior**
   ```javascript
   // 🚩 FALSE CONFIDENCE PATTERN:
   it('should update actor', async () => {
     const spy = vi.fn();
     actor.update = spy;
     await handler.adjust();
     expect(spy).toHaveBeenCalled(); // ✓ Passes even if broken
   });
   
   // ✅ REAL VALIDATION:
   it('should clamp void ring to max 10', async () => {
     await adjustVoidRing(actor, 999);
     expect(actor.system.rings.void.rank).toBe(10); // Validates actual outcome
   });
   ```
   
   **SCAN THIS FILE:**
   - Count tests that ONLY check mocks were called
   - Count tests that validate ACTUAL outcomes
   - Ratio = confidence level

2. **Over-Mocking Detection**
   ```javascript
   // 🚩 HIDING REAL ISSUES:
   vi.mock('../../utils/calculations', () => ({
     calculateXP: vi.fn(() => 50),
     getMaxRank: vi.fn(() => 10),
     validateInput: vi.fn(() => true)
   }));
   // Tests pass, but real utils might be broken!
   ```
   
   **COUNT IN THIS FILE:**
   - How many mocks per test? (>3 = red flag)
   - Are real utilities mocked unnecessarily?
   - Are mocks simpler than real code? (hiding bugs)

3. **Happy Path Syndrome**
   ```javascript
   // 🚩 ONLY TESTS SUCCESS:
   it('adjusts void ring', async () => {
     const result = await adjust(validActor, 1);
     expect(result).toBeDefined();
   });
   
   // ❌ NEVER TESTED:
   - What if input is null?
   - What if rank is already at max?
   - What if XP is insufficient?
   - What if actor is undefined?
   ```
   
   **LIST FOR THIS FILE:**
   - What error conditions exist but aren't tested?
   - What edge cases are missing?
   - What boundary conditions are ignored?

**For Implementation Files - Ask:**

1. **Where are the defensive checks?**
   ```javascript
   // 🚩 UNDEFENDED CODE:
   function adjust(actor, amount) {
     const current = actor.system.rings.void.rank; // No null check!
     const xpCost = current * 6;                   // No max check!
     actor.update({ xp: actor.system.xp - xpCost }); // No async safety!
   }
   ```
   
   **SCAN THIS FILE:**
   - Every property access without optional chaining
   - Every calculation without boundary checks  
   - Every async operation without error handling

2. **Game Rules Compliance**
   ```javascript
   // 🚩 NO RULE CITATION:
   const xpCost = rank * 6; // Why 6? Where's the rule?
   const maxRank = 10;      // Says who? Which book?
   ```
   
   **CHECK THIS FILE:**
   - Every magic number lacks rule citation
   - Every formula isn't documented with game rule
   - Every calculation might be wrong

---

## PHASE 2: PROVE THE CODE IS BROKEN

**Thought Experiment - Try to Break It:**

1. **Null/Undefined Injection**
   - Pass null/undefined to every function
   - Pass empty objects/arrays
   - Pass wrong types
   - **Can tests catch this?**

2. **Boundary Exploitation**
   - Pass -999, 0, 999999 to numeric inputs
   - Pass empty strings, very long strings
   - Pass arrays with 0 items, 1 item, 1000 items
   - **Do tests validate boundaries?**

3. **Race Conditions**
   - Multiple rapid updates
   - Async operations completing out of order
   - Concurrent user actions
   - **Can tests detect these?**

4. **Integration Failures**
   - Foundry API returns unexpected data
   - Document structure changes
   - Flags in wrong format
   - **Are tests too isolated to see this?**

**For Each Attack Vector:**
→ Try to make it fail
→ Check if tests would catch it
→ Document what's unprotected

---

## PHASE 3: THE SMOKING GUN CHECKLIST

**Find Evidence of False Confidence:**

```
🔍 IN TEST FILES:

[ ] Tests only assert mocks were called (not outcomes)
[ ] >50% of tests use 3+ mocks
[ ] No edge case tests exist
[ ] No error condition tests exist  
[ ] No boundary tests exist
[ ] Tests re-implement framework logic in mocks
[ ] Tests pass with commented-out implementation
[ ] Only happy paths tested

🔍 IN IMPLEMENTATION FILES:

[ ] Property access without null checks
[ ] Calculations without boundary validation
[ ] Async without error handling
[ ] No defensive coding patterns
[ ] Magic numbers without rule citations
[ ] Assumptions about data structure
[ ] No input validation
[ ] Direct DOM manipulation without checks

🔍 INTEGRATION CONCERNS:

[ ] No tests verify component interactions
[ ] Mocks isolate too much (can't see real behavior)
[ ] No tests with real Foundry objects
[ ] No tests with real game data structures
[ ] Active Effects completely mocked out
[ ] Database operations completely mocked
```

**Smoking Gun Score:**
- 0-2 checked = Code might be robust
- 3-5 checked = Tests probably missing issues
- 6-10 checked = **FALSE CONFIDENCE CONFIRMED**
- 10+ checked = **TESTS ARE LYING**

---

## PHASE 4: REQUIRED OUTPUT

### 4.1 Verdict
```
FALSE CONFIDENCE ASSESSMENT: [None | Low | Medium | High | Critical]

EVIDENCE:
1. [Specific pattern found with line numbers]
2. [What tests claim vs. what code actually does]
3. [Bugs that SHOULD exist but aren't found]

CONFIDENCE LEVEL IN CURRENT TESTS: [0-100%]
- Reason: [why this rating]
```

### 4.2 Specific False Confidence Patterns
```
PATTERN: Tests Only Check Execution
Lines: [X-Y]
Example:
  expect(mockUpdate).toHaveBeenCalled()
  // ❌ Doesn't validate if update is CORRECT

Should Be:
  expect(actor.system.rings.void.rank).toBe(expectedRank)
  // ✅ Validates actual game state

Impact: [what bugs could hide]
```

### 4.3 Unprotected Code Paths
```
UNDEFENDED CODE:
Line: [X]
Code: actor.system.rings.void.rank
Issue: No null check, will crash if actor malformed
Test Status: ❌ NOT TESTED
Bug Likelihood: HIGH

Proof:
  const actor = { system: null };
  adjust(actor, 1); // 💥 CRASH (but tests pass!)
```

### 4.4 Missing Tests That Would Find Real Bugs
```
CRITICAL MISSING TEST:
Scenario: User enters void ring rank 999
Expected: Should clamp to max 10 per game rules
Current Code: [does it clamp? check the code]
Test Status: ❌ NO TEST EXISTS
If Broken: Users can give themselves infinite ranks

Add This Test:
  it('should clamp void ring to game rule max', async () => {
    await adjustVoidRing(actor, 999);
    expect(actor.system.rings.void.rank).toBe(10);
    // Per L5R4 Core pg. 45: Max ring rank is 10
  });
```

### 4.5 The "It Should Break But Doesn't" List
```
SUSPICIOUS ROBUSTNESS:
These SHOULD break the code, but apparently don't:
1. adjust(null, 5) - should crash, does it?
2. adjust(actor, -999) - should error, does it?
3. adjust({}, 1) - should fail gracefully, does it?
4. Multiple rapid calls - race condition?

If these DON'T break the code:
→ Show me the defensive code that prevents it
→ Show me the tests that validate the defense

If tests don't exist:
→ 🚩 FALSE CONFIDENCE CONFIRMED
```

---

## PHASE 5: THE HARD TRUTH

**Answer These Questions Honestly:**

1. **If I deleted half the tests, would bugs appear?**
   - If NO → Tests aren't finding bugs anyway
   - If YES → Which half? (those are the real tests)

2. **If I removed all mocks and used real code, would tests fail?**
   - If YES → Mocks are hiding real issues
   - If NO → Mocks might be okay

3. **Can you write code that's wrong but makes tests pass?**
   - If YES → Tests validate execution, not correctness
   - Show example of wrong code that passes

4. **What's the worst bug a user could encounter that tests wouldn't catch?**
   - Be specific: [exact scenario]
   - Why tests miss it: [reason]
   - Impact: [what breaks]

---

## SUCCESS CRITERIA

You've completed this analysis when you can answer:

✅ **Is code robust?** 
   → YES: Show defensive code + tests proving it
   → NO: List unprotected paths + missing tests

✅ **Are tests effective?**
   → YES: Show tests that would catch real bugs
   → NO: Show false confidence patterns

✅ **Why no bugs found?**
   → Code genuinely good: Prove it with specific defenses
   → Tests lying: Prove it with gap analysis

✅ **What bugs exist but aren't found?**
   → List specific scenarios with proof

---

**CORE PRINCIPLE:**
"Passing tests" ≠ "Working code"
"High coverage" ≠ "Good tests"  
"No bugs found" ≠ "No bugs exist"

Your job: Find what the tests are missing.
```

---

## Quick Usage

**When viewing any file:**

Say: **"Analyze Quality"**

**The prompt will:**
1. Assume tests might be lying
2. Try to prove code is broken
3. Find what tests are missing
4. Expose false confidence patterns
5. Identify real bugs tests don't catch

**Core mindset:** Thousands of tests, zero bugs = **SUSPICIOUS**