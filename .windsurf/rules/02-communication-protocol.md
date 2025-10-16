---
trigger: always_on
---

## Purpose
How AI communicates with user and produces documentation.

---

## Response Format

### Structure
1. **Acknowledge** what you understood from the request
2. **Ask clarifying questions** if needed (max 2-3)
3. **Execute** the task
4. **Report** what was done (facts only, no narrative)

### Acknowledgment Examples
- "I'll implement the skill roll system"
- "Fixing the sheet rendering bug"
- "Adding Void Point tracking to character actor"

Not:
- "Great idea! I'll implement this awesome feature..."
- "Let me help you with that..."

### Execution Reporting
State what changed:
- "Added rollSkill() to dice.js"
- "Modified L5R4Actor.prepareDerivedData()"
- "Created character-sheet.hbs template"

Not:
- "I've successfully implemented the feature and it should work great now!"
- "Everything is working perfectly after these changes!"

---

## Documentation Types

### Three Distinct Types

**1. Inline JSDoc Comments**
- Written DURING development
- Required for all public functions
- Explains parameters, returns, purpose
- Part of code quality

**2. External MD Files**
- Written LAST or NEVER (unless user requests)
- Includes: READMEs, changelogs, guides
- Not written after completing features
- Only created when explicitly needed

**3. Unit Tests**
- Written LAST (when development mostly complete)
- Uses Vitest + Quench
- Not written during feature development

### When to Write What

| Type | When | Why |
|------|------|-----|
| JSDoc | During development | Code needs documentation for understanding |
| MD Files | Last or never | User will request if needed |
| Tests | Last | Written when system mostly stable |

---

## What NOT to Document

### No Mistake Breadcrumbs
Do not create documentation about:
- Errors that were made
- Bugs that were fixed
- Wrong approaches that were tried
- Historical problems

### No Process Documentation
Do not document:
- "First I tried X, then Y worked"
- "The issue was caused by..."
- "After debugging, I found..."

### Clean Slate Principle
Each response should present the correct solution. Do not reference the journey to get there.

---

## Writing Style for Documentation

### Rule: Write Like a Human

**Characteristics:**
- Short, simple sentences
- Direct facts, no justification
- No narrative flow
- No filler words
- No explanations of why things matter (unless asked)
- No selling facts
- No connecting everything into a story

### Filler Words to Avoid
- "basically"
- "actually" 
- "plus"
- "essentially"
- "importantly"
- "notably"

### Bad Examples
❌ "This feature is important because it helps users manage their characters more efficiently by providing better organization."

❌ "I used it for documentation, which made the codebase more accessible, and it also helped me focus on building features."

❌ "The system now works great and users will love the improved experience!"

### Good Examples
✅ "Organizes character data. Faster access to traits."

✅ "Used for documentation. Also generated icons."

✅ "System tracks Wounds, Void Points, Honor."

### Test: If It Sounds Like Selling
If writing sounds like convincing or selling, it's over-explained. Cut it down.

---

## Question Guidelines

### When to Ask
- Missing critical information
- Multiple valid approaches exist
- Unclear user intent
- Potential conflicts with architecture

### How to Ask
- **Specific**: "Should this go in Documents or Services?"
- **Options**: "Two approaches: A or B?"
- **Context**: "I understand X, need clarification on Y"
- **Focused**: One question at a time (max 2-3 total)

### When NOT to Ask
- Answer is in existing documentation
- Framework docs provide clear answer
- Standard pattern applies
- Would unnecessarily delay work

---

## Code Comments

### When Writing Code Comments

**Function-level (JSDoc):**
```javascript
/**
 * Calculates Wound penalties based on current wounds
 * @param {number} wounds - Current wound total
 * @param {number} earthRing - Earth Ring value
 * @returns {number} Penalty to rolls
 */
```

**Inline comments:**
Only when logic is non-obvious:
```javascript
// L5R4 uses XkY for skill rolls where X = skill+trait, Y = trait
const roll = new Roll("@kept d10x10", { kept: traitValue });
```

**Not needed for obvious code:**
```javascript
// Bad: Get the actor's name
const name = actor.name;

// Good: No comment needed - code is self-explanatory
const name = actor.name;
```

---

## Commit Messages (If Applicable)

### Format
```
[Type] Brief description

- Fact 1
- Fact 2
- Fact 3
```

### Types
- `[Feature]` - New functionality
- `[Fix]` - Bug repair
- `[Refactor]` - Code reorganization
- `[Docs]` - Documentation only

### Example
```
[Feature] Add skill roll system

- Created rollSkill() in dice.js
- Added chat message template
- Integrated with character sheet
```

Not:
```
[Feature] Implemented the new skill roll system

I've added a comprehensive skill roll system that allows 
users to roll XkY+modifier which will make gameplay much 
better and more efficient...
```

---

## Response Length

### Be Concise
- Short responses for simple tasks
- Detailed responses for complex work
- Never pad responses with unnecessary explanation

### What to Include
- What changed
- Where it changed
- What to test (if needed)

### What to Exclude
- Why you made certain choices (unless asked)
- How you debugged it
- What you learned
- Narrative flow

---

## Success Checklist

✅ Acknowledged request clearly
✅ Asked only necessary questions
✅ Executed task completely
✅ Reported facts without narrative
✅ No mistake documentation
✅ JSDoc written for code
✅ No MD files unless requested
✅ Writing is direct and simple
✅ No filler words or selling

---

## Remember

Communication should be clear, direct, and factual. User wants results, not stories. Save tokens and user time by getting to the point.