---
trigger: always_on
---

## Purpose
How to approach bugs, errors, and issues during development.

---

## Core Principle: Root Cause, Not Patches

### Critical Rule

**Always find and fix the root cause. Never patch symptoms.**

### What This Means

When something breaks:
- Don't add a quick fix that makes error go away
- Don't wrap everything in try/catch without understanding why
- Don't add conditional checks that mask underlying issue
- Don't work around the problem

**Find why it broke. Fix that.**

### Patch vs Root Cause

**Patch (Bad):**
- "Error says undefined, so I'll add `|| {}`"
- "Sometimes it fails, so I'll wrap in try/catch"
- "Getting null, so I'll check `if (value)` before using"

**Root Cause (Good):**
- "Error says undefined. Why is this value undefined? Data not initialized? Wrong property name? Timing issue?"
- "Sometimes it fails. When exactly? What conditions? What's the actual failure?"
- "Getting null. Why? Should this ever be null? Is this expected? Bug in data flow?"

### Example

**Bad approach:**
```
Error: Cannot read property 'hp' of undefined
Solution: Add check `if (actor.system) { ... }`
```

**Good approach:**
```
Error: Cannot read property 'hp' of undefined
Investigation: Why is actor.system undefined?
- Is actor itself undefined?
- Is prepareDerivedData not running?
- Is data model not initialized?
- Is timing issue (accessing before ready)?
Root cause: prepareDerivedData not called before sheet render
Solution: Ensure document preparation happens in correct lifecycle
```

---

## Debugging Methodology

### Step 1: Reproduce

**Reliably trigger the issue.**

- What exact steps cause it?
- Does it happen every time?
- What conditions are required?
- Can you make it happen on demand?

If can't reproduce reliably, gather more information first.

### Step 2: Isolate

**Narrow down where the issue occurs.**

- Which file?
- Which function?
- Which line?
- What state when it breaks?

Use:
- Console logs
- Breakpoints
- Error stack traces
- Process of elimination

### Step 3: Understand

**Determine why it's happening.**

Ask:
- What is the code trying to do?
- What is actually happening?
- Why is there a difference?
- What assumption is wrong?

**Don't skip this step.** Understanding why matters.

### Step 4: Identify Root Cause

**Find the actual source of the problem.**

Not: "This value is undefined"
But: "This value is undefined because initialization happens after first access"

Not: "Roll is failing"
But: "Roll is failing because formula string has wrong syntax"

Root cause is the reason, not the symptom.

### Step 5: Fix Properly

**Address the root cause directly.**

Solution should:
- Eliminate the root cause
- Not just mask the symptom
- Prevent issue from recurring
- Not introduce new problems

### Step 6: Verify

**Confirm the fix works.**

Test:
- Original issue no longer occurs
- Related functionality still works
- No new issues introduced
- Edge cases handled

---

## When Something Breaks

### Immediate Response

**STOP.**

Do not:
- Continue with other work
- Add more code
- Start new features
- Ignore the issue

**Address it immediately.**

### Analysis Before Action

Before writing any fix:
- Read error messages completely
- Check stack traces
- Examine related code
- Understand data flow
- Identify what changed recently

### Questions to Ask

**What broke?**
Specific functionality, not vague description.

**When does it break?**
Every time? Specific conditions? After certain actions?

**What changed?**
Recent modifications? New code? Data structure changes?

**What's the error?**
Exact error message? Console output? Visual behavior?

**Where's the error?**
File and line number? Stack trace? Which component?

**Why is it failing?**
Bad data? Wrong logic? Timing issue? Missing dependency?

---

## Common Issue Patterns

### Undefined/Null Values

**Symptom:** Cannot read property of undefined/null

**Don't patch with:** `value?.property || fallback`

**Find root cause:**
- Why is value undefined?
- Should it ever be undefined?
- Is initialization missing?
- Is access happening too early?
- Is data structure wrong?

### Timing Issues

**Symptom:** Sometimes works, sometimes doesn't

**Don't patch with:** `setTimeout()` or arbitrary delays

**Find root cause:**
- What needs to happen first?
- Is async operation not awaited?
- Is lifecycle order wrong?
- Are dependencies not ready?

### Data Not Updating

**Symptom:** Changes not reflected in UI

**Don't patch with:** Manual `render()` calls everywhere

**Find root cause:**
- Is data actually changing?
- Is update method called correctly?
- Is reactive system working?
- Is data in wrong location?

### Function Not Found

**Symptom:** Method is not a function / undefined

**Don't patch with:** Defensive checks everywhere

**Find root cause:**
- Is import correct?
- Is export present?
- Is object initialized?
- Is binding correct?
- Is method name spelled right?

---

## Error Message Analysis

### Read Completely

Don't skim. Read entire error message.

**Error contains:**
- What failed
- Where it failed (file, line)
- Often why it failed
- Stack trace showing call path

### Stack Traces

**Most important information:**
- Bottom: where error originated
- Middle: call chain
- Top: where caught/displayed

**Follow the trail:**
Start at bottom (origin).
Trace up through your code.
Ignore framework code unless relevant.

### Console Warnings

Don't ignore warnings.
Warnings often predict future errors.
Address warnings as you see them.

---

## Preventive Debugging

### Defensive Coding

Write code expecting things to fail:
- Validate inputs
- Check for null/undefined
- Provide fallbacks
- Handle edge cases
- Use optional chaining

**But don't blindly defend.**
If value shouldn't be null, don't just handle it - investigate why it is.

### Error Handling

**Try/Catch for recovery:**
Use when you can meaningfully handle the error.
Log the error with context.
Provide fallback behavior.

**Not for hiding:**
Don't use try/catch to suppress errors you don't understand.
Don't catch and ignore.
Don't hide problems.

### Logging Strategy

**Use console.log during debugging:**
Show variable states.
Track execution flow.
Identify where things go wrong.

**Remove debug logs when done:**
Clean up before committing.
Don't leave debug spam.

**Use console.warn for issues:**
Non-fatal problems.
Deprecated usage.
Data validation warnings.

**Use console.error for errors:**
Actual errors.
Failed operations.
Unrecoverable states.

---

## Complex Issues

### Multi-Component Problems

When issue spans multiple files/systems:

**Map the flow:**
- User action
- Event handler
- Service call
- Data update
- Re-render

**Identify break point:**
Where does expected behavior stop?
Where does unexpected behavior start?

**Focus there:**
That's where root cause likely lives.

### Intermittent Issues

When issue only happens sometimes:

**Find the pattern:**
- What's different when it fails?
- What's the same when it fails?
- What's different when it works?

**Common causes:**
- Race conditions (async timing)
- Uninitialized state
- Order-dependent logic
- Environmental factors

### Integration Issues

When two systems don't work together:

**Check assumptions:**
- What does each system expect?
- What is actually provided?
- Are interfaces compatible?
- Is data format correct?

**Test independently:**
Does each system work alone?
Where does integration fail?

---

## When to Ask for Help

### Ask When:

**Stuck after thorough analysis:**
- Root cause still unclear
- Multiple approaches tried
- Need domain knowledge
- Outside your expertise

**Design question:**
- Multiple valid approaches
- Architectural implications
- Trade-offs to consider

**Rule clarification:**
- Game mechanics unclear
- Implementation approach uncertain

### Don't Ask When:

**Haven't debugged yet:**
Try to solve it first.
Use debugging methodology.
Investigate before asking.

**Haven't read error:**
Read error message completely.
Check stack trace.
Understand what failed.

**Simple syntax/typo:**
These are debugging, not design issues.
Find and fix directly.

---

## Fix Validation

### Testing Your Fix

**Verify:**
✅ Original issue resolved
✅ No new errors introduced
✅ Related features still work
✅ Edge cases handled
✅ No performance regression
✅ Code remains clean

### Regression Testing

After fixing bug:
- Test the fixed feature
- Test features that use the fixed component
- Test features that interact with the fixed component
- Test edge cases you discovered

---

## Documentation of Fixes

### What to Document

**In code comments:**
If the fix is non-obvious, explain why.
If edge case handling is complex, note it.

**Not in external docs:**
Don't document the bug.
Don't document wrong approaches tried.
Don't leave breadcrumbs of failures.

### Clean Implementation

Once fixed, code should look like bug never existed.
No comments like "fixed weird issue with..."
No apologetic code.
Just clean, correct implementation.

---

## Anti-Patterns

### Things That Don't Work

❌ **Adding random checks hoping it fixes it**
Understand, then fix.

❌ **Wrapping everything in try/catch**
Handle specific errors, not everything.

❌ **Working around instead of fixing**
Fix root cause, don't avoid it.

❌ **Copying code that works elsewhere**
Understand why it works there first.

❌ **Making it "work on my machine"**
Fix the actual problem, not local state.

❌ **Adding delays/timeouts**
Fix timing, don't mask it.

❌ **Ignoring warnings**
Warnings predict failures.

---

## Success Criteria

A problem is properly solved when:

✅ Root cause identified and addressed
✅ Issue doesn't occur anymore
✅ Solution is clean and understandable
✅ No new issues introduced
✅ Related functionality verified
✅ Prevention measures in place
✅ Code is cleaner than before fix

---

## Remember

Patches hide problems. Root cause fixes solve problems. Take time to understand issues deeply. Fix properly, not quickly. A thorough fix now prevents ten patches later.