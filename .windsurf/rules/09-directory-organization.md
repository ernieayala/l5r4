---
trigger: always_on
---

## Purpose
Guidelines for organizing files into subdirectories when breaking down complex modules.

---

## Core Principle

**Organize as you split. Never dump related files into a flat structure.**

When breaking down monolithic files, create logical subdirectory structures that make the codebase scannable and maintainable.

---

## When to Create Subdirectories

### Create a subdirectory when:
- Splitting a monolithic file into 3+ related files
- A feature has multiple specialized modules
- Files share a common prefix (signals they belong together)
- Flat structure makes finding files difficult

### Don't create subdirectories for:
- Only 1-2 files
- Unrelated files that happen to be in same layer
- Overly deep nesting (max 2-3 levels)

---

## Organizing Split Files

### BAD - Flat dump in parent directory
```
documents/
  |-- L5R4Actor.js
  |-- actor-helpers.js
  |-- actor-calculations.js
  |-- actor-validation.js
  |-- actor-modifiers.js
  |-- actor-resources.js
  |-- L5R4Item.js
  +-- item-helpers.js
```

**Problems:** 
- Hard to scan
- Unclear relationships
- Namespace pollution
- Scales poorly

### GOOD - Organized into subdirectories
```
documents/
  |-- actor/
  |   |-- L5R4Actor.js (main class)
  |   |-- calculations.js
  |   |-- validation.js
  |   |-- modifiers.js
  |   +-- resources.js
  +-- item/
      |-- L5R4Item.js
      +-- helpers.js
```

**Benefits:** 
- Clear grouping
- Easy navigation
- Scalable structure
- Related code together

---

## Subdirectory Naming

### Conventions

- **Use singular nouns:** `actor/`, not `actors/`
- **Match main file's purpose:** `actor/` contains `L5R4Actor.js`
- **kebab-case for multi-word:** `status-effects/`
- **Descriptive but concise:** Communicate purpose immediately

### Examples

GOOD names:
- `actor/`
- `dice/`
- `status-effects/`
- `combat/`

BAD names:
- `actors/` (plural)
- `actor-stuff/` (vague)
- `actor_helpers/` (wrong case)
- `a/` (too terse)

---

## Deeper Nesting (When Needed)

### When Subdirectory Gets Complex

If a subdirectory itself has 5+ files, nest further:
```
documents/
  +-- actor/
      |-- L5R4Actor.js
      |-- core/
      |   |-- calculations.js
      |   |-- validation.js
      |   +-- modifiers.js
      +-- systems/
          |-- resources.js
          |-- status-effects.js
          +-- initiative.js
```

### Max Depth: 2-3 Levels

Deeper than that indicates over-complexity. Reconsider organization.

**Signs you're nesting too deep:**
- Path has 4+ segments
- Hard to remember where things are
- Imports become unwieldy
- Opening a file requires mental map

**Solution:** Rethink grouping strategy or split into separate top-level modules.

---

## Main File Location

### Option 1: Keep main file in parent
```
documents/
  |-- L5R4Actor.js (imports from actor/)
  +-- actor/
      |-- calculations.js
      +-- helpers.js
```

**Use when:** Main class is simple and only uses helpers.

### Option 2: Move main file into subdirectory
```
documents/
  +-- actor/
      |-- L5R4Actor.js
      |-- calculations.js
      +-- helpers.js
```

**Use when:** Everything is tightly coupled. **Preferred for complex features.**

### Option 3: Index file pattern
```
documents/
  +-- actor/
      |-- index.js (re-exports L5R4Actor)
      |-- L5R4Actor.js
      +-- helpers.js
```

**Use when:** External imports should be clean: 
```javascript
import { L5R4Actor } from './documents/actor'
```

---

## Import Path Updates

### After Creating Subdirectories

**Always update all imports throughout the codebase.**

**Before:**
```javascript
import { L5R4Actor } from './documents/L5R4Actor.js';
```

**After (Option 2):**
```javascript
import { L5R4Actor } from './documents/actor/L5R4Actor.js';
```

**After (Option 3 with index):**
```javascript
import { L5R4Actor } from './documents/actor/index.js';
// or
import { L5R4Actor } from './documents/actor'; // if using bundler
```

### Verification Checklist

After restructuring:

- [ ] All imports in moved files updated
- [ ] All imports in files that import moved files updated
- [ ] No broken imports remain
- [ ] System still runs without errors
- [ ] Test that features still work

---

## Grouping Strategies

### By Responsibility

Group by what the code does:
```
services/
  +-- dice/
      |-- skill-roll.js
      |-- trait-roll.js
      |-- damage-roll.js
      +-- initiative-roll.js
```

**Best for:** Services and utilities with clear functional separation.

### By Domain

Group by what the code represents:
```
documents/
  +-- actor/
      |-- character/
      |-- npc/
      +-- shared/
```

**Best for:** Documents and sheets with distinct types.

### By System

Group by game system or major feature:
```
module/
  |-- combat/
  |   |-- documents/
  |   |-- services/
  |   +-- utils/
  +-- magic/
      |-- documents/
      |-- services/
      +-- utils/
```

**Use sparingly:** Only for very large, isolated systems that don't interact much.

**Warning:** This can violate separation of concerns. Only use when system is truly independent.

---

## When NOT to Create Subdirectories

### Don't Create For

**Single file:**
Don't create `documents/actor/` for just `L5R4Actor.js`

**Two small files:**
If just main file + one helper, keep flat

**Premature organization:**
Don't create structure before you need it

**Over-nesting:**
Avoid: `documents/actor/core/base/calculations/helpers/math.js`

### Principle

Create structure when it helps. Don't create it "just in case."

Wait until complexity requires organization, then organize.

---

## Decision Flowchart
```
Splitting a monolithic file?
  |
  v
Will there be 3+ related files?
  |
  +-- YES -> Create subdirectory
  |           |
  |           v
  |         Choose naming (singular noun)
  |           |
  |           v
  |         Move/create files in subdirectory
  |           |
  |           v
  |         Update all imports
  |           |
  |           v
  |         Verify nothing broke
  |
  +-- NO -> Keep in parent directory
```

---

## Refactoring Existing Flat Structure

### Process

If you inherit or create a messy flat structure:

**1. Identify groups**
- Which files belong together?
- What are the natural clusters?
- What prefixes appear repeatedly?

**2. Create subdirectories**
- One per group
- Follow naming conventions
- Plan structure before moving

**3. Move files**
- Preserve names unless improving them
- Remove redundant prefixes (e.g., `actor-` not needed in `actor/`)
- Move related files together

**4. Update imports**
- In moved files
- In files that import them
- Check entire codebase

**5. Test**
- Verify system still works
- Test affected features
- Check for broken imports

**6. Clean naming**
- Remove redundant prefixes
- Ensure consistency
- Update any documentation

---

## Example Refactor

### Before
```
services/
  |-- dice-skill-roll.js
  |-- dice-trait-roll.js
  |-- dice-damage.js
  |-- dice-initiative.js
  |-- chat-format.js
  +-- chat-templates.js
```

**Problems:**
- Prefixes indicate grouping
- All files in one flat directory
- Scales poorly as more services added

### After
```
services/
  |-- dice/
  |   |-- skill-roll.js
  |   |-- trait-roll.js
  |   |-- damage.js
  |   +-- initiative.js
  +-- chat/
      |-- format.js
      +-- templates.js
```

**Improvements:**
- Clear grouping by purpose
- Removed redundant prefixes
- Scalable structure
- Related code together

**File content doesn't change** - just location and imports.

---

## Integration with Architecture Layers

### Documents Layer
```
documents/
  |-- actor/
  |   |-- L5R4Actor.js
  |   +-- [actor helpers]
  +-- item/
      |-- L5R4Item.js
      +-- [item helpers]
```

### Sheets Layer
```
sheets/
  |-- actor/
  |   |-- L5R4ActorSheet.js
  |   +-- [sheet helpers]
  +-- item/
      |-- L5R4ItemSheet.js
      +-- [sheet helpers]
```

### Services Layer
```
services/
  |-- dice/
  |   +-- [roll services]
  |-- chat/
  |   +-- [chat services]
  +-- combat/
      +-- [combat services]
```

### Utils Layer
```
utils/
  |-- calculations.js
  |-- validators.js
  +-- formatters.js
```

**Note:** Utils often stay flat unless very large. Pure functions don't need deep organization.

### Config Layer
```
config/
  |-- traits.js
  |-- skills.js
  +-- constants.js
```

**Or:** Single `config.js` file if small.

---

## Common Mistakes

### Mistake 1: Dumping Split Files

**Wrong:**
```
documents/
  |-- actor.js
  |-- actor-part1.js
  |-- actor-part2.js
  +-- actor-part3.js
```

**Right:**
```
documents/
  +-- actor/
      |-- actor.js
      |-- part1.js
      |-- part2.js
      +-- part3.js
```

### Mistake 2: Unnecessary Prefixes

**Wrong:**
```
actor/
  |-- actor-calculations.js
  |-- actor-validation.js
  +-- actor-helpers.js
```

**Right:**
```
actor/
  |-- calculations.js
  |-- validation.js
  +-- helpers.js
```

Context already provided by directory.

### Mistake 3: Over-Nesting

**Wrong:**
```
documents/
  +-- actor/
      +-- core/
          +-- base/
              +-- calculations/
                  +-- helpers/
                      +-- math.js
```

**Right:**
```
documents/
  +-- actor/
      +-- calculations/
          +-- math.js
```

Or even:
```
documents/
  +-- actor/
      +-- math-helpers.js
```

### Mistake 4: Premature Structure

**Wrong:**
Creating subdirectories for 1-2 files "for future growth."

**Right:**
Keep flat until actually need organization. Add structure when complexity demands it.

---

## Best Practices Summary

### Do

- Create subdirectories when splitting into 3+ files
- Use singular, descriptive directory names
- Group related files together
- Update all imports after restructuring
- Remove redundant prefixes in subdirectories
- Keep max nesting to 2-3 levels
- Test after restructuring

### Don't

- Dump split files in flat structure
- Create subdirectories for 1-2 files
- Use plural directory names
- Nest deeper than 3 levels
- Leave redundant prefixes
- Forget to update imports
- Create structure before needed

---

## Checklist for Directory Organization

When breaking down a monolithic file:

- [ ] Identified all files that will be created
- [ ] Determined if 3+ related files
- [ ] Created subdirectory with singular name
- [ ] Moved/created files in subdirectory
- [ ] Removed redundant prefixes from filenames
- [ ] Updated all imports in moved files
- [ ] Updated all imports in files that import moved files
- [ ] Tested system still works
- [ ] Verified no broken imports
- [ ] Structure is scannable and logical

---

## Remember

Organization is not premature optimization - it's essential maintainability. Create clear structure when splitting files. Group related code together. Keep it scannable. Update imports thoroughly. Don't over-nest. Structure should make code easier to find, not harder.