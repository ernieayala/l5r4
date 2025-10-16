---
trigger: always_on
---

## Purpose
Technical protocols for reading, writing, and modifying files.

---

## Critical Path Requirement

### Absolute Paths Only

**CRITICAL:** Every file operation must use complete absolute paths.

**Format:**
```
c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\[rest of path]
```

**Examples:**
```
c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\module\documents\L5R4Actor.js
c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\templates\actor\character-sheet.hbs
c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\styles\actor-sheet.scss
```

### Never Use

❌ Relative paths: `module/documents/L5R4Actor.js`
❌ Truncated paths: `l5r4-enhanced\module\documents\L5R4Actor.js`
❌ Partial paths: `\Data\systems\l5r4-enhanced\module\documents\L5R4Actor.js`

### Why This Matters

File operations will fail silently or affect wrong files if paths are incomplete.

### Verification Before Submission

Before any file operation:
1. Check path starts with `c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4-enhanced\`
2. Verify rest of path is complete
3. Confirm no truncation

---

## Read Before Write Protocol

### Mandatory Reading

**NEVER modify a file without reading it first.**

### Process

**Step 1: Read the file**
Get actual current contents.

**Step 2: Understand structure**
Identify where changes need to be made.

**Step 3: Plan modifications**
Determine exact changes required.

**Step 4: Make changes**
Apply modifications based on actual content.

### Why This Matters

- Prevents assumptions about file contents
- Ensures diffs are accurate
- Avoids breaking existing code
- Catches outdated mental models

### When File Doesn't Exist

If file doesn't exist yet:
- State that file will be created
- Show complete new file contents
- No need to read non-existent file

If file should exist but doesn't:
- Stop and report issue
- Ask for clarification
- Don't guess at structure

---

### CRITICAL: No Truncation

**NEVER truncate file contents when reading or searching.**

**This means:**
- Read complete files, not partial content
- Return full search results, not abbreviated
- Show entire sections when referencing code
- Display complete error messages and stack traces

**Why This Matters:**
- Truncated reads lead to incorrect diffs
- Partial context causes wrong assumptions
- Missing code causes incomplete modifications
- Abbreviated errors hide root causes

**If Content is Large:**
- Still read it completely
- Process the full content
- Reference specific sections as needed
- But always work from complete data

**This applies to:**
- File reading operations
- Search results from grep/find
- Code inspection
- Error message display
- Stack trace analysis
- Documentation references

## Diff Accuracy Requirement

### Critical Rule

**Red lines in diffs must exist in the actual current file.**

### What This Means

When showing changes:
- Red lines (removed) = exact text currently in file
- Green lines (added) = new text to replace it
- Context lines = surrounding unchanged text

### Verification

Before presenting a diff:
1. Confirm red lines match file exactly
2. Check indentation matches
3. Verify line breaks match
4. Ensure no extra/missing whitespace

### Common Mistakes

❌ Red lines showing code that doesn't exist
❌ Red lines with wrong indentation
❌ Red lines missing whitespace
❌ Red lines from memory, not actual file

### If You Realize Diff is Wrong

**Stop immediately.**

1. State: "Previous diff was incorrect"
2. Re-read the actual file
3. Show corrected diff with accurate red lines
4. Continue with correct information

---

## MultiEdit Protocol

### When to Use

MultiEdit for making changes to multiple files or multiple locations in one file.

### Requirements

**Every path must be:**
- Complete absolute path
- Verified before submission
- Pointing to correct file

**Every change must:**
- Be based on actual file contents
- Have accurate red lines
- Include necessary context

### Before Submitting MultiEdit

1. Verify all paths are absolute
2. Confirm all files have been read
3. Check all diffs are accurate
4. Ensure changes won't conflict

---

## Protected Files and Folders

### Never Touch

**Absolutely forbidden:**
- `node_modules/` - Never read, write, or reference
- `package-lock.json` - Don't modify directly
- `.git/` - Don't interact with git internals
- Build output folders (if they exist)

### System-Managed Files

**Modify with caution:**
- `package.json` - Only when explicitly requested
- `system.json` - Core system definition
- `template.json` - Data model definition

If changes needed to these files:
- Read carefully first
- Show exact diffs
- Explain why change is needed
- Verify syntax is correct

### Safe to Modify

**Normal development:**
- `module/` - All custom code
- `templates/` - All template files
- `styles/` - All style files
- `lang/` - Localization files

---

## File Reading Strategies

### When to Read

**Always read before:**
- Modifying existing file
- Referencing file structure
- Importing from file
- Integrating with file's code

**No need to read:**
- Creating entirely new file
- File is empty placeholder
- User provided complete file contents

### How to Read

Read complete file, not just sections.
Understand full context.
Note dependencies and imports.
Identify patterns used.

### After Reading

Mental model should match reality.
References should be accurate.
Diffs should be possible.

---

## File Creation

### New Files

When creating a new file:

**Requirements:**
- Complete absolute path
- Show entire file contents
- Include all necessary imports
- Follow project structure conventions
- Use existing patterns from similar files

**Don't:**
- Create file in wrong location
- Use inconsistent patterns
- Skip imports
- Forget file-level JSDoc

### File Organization

Before creating file, verify:
- Correct folder for responsibility (Documents/Sheets/Services/Utils/Config)
- Name follows conventions
- Location makes sense in project structure

---

## File Modification

### Single Change

For one small change:
- Read file first
- Show accurate diff
- Explain what changed and why (brief)

### Multiple Changes

For multiple changes in one file:
- Read file first
- Show all diffs together
- Ensure changes are compatible
- Don't break existing functionality

### Large Refactors

For major restructuring:
- Get explicit user approval first
- Show complete before/after
- Explain benefits
- Ensure no functionality lost

---

## File Deletion

### When to Delete

Only delete files when:
- User explicitly requests deletion
- File is truly unused
- Replacement is in place

### Before Deleting

1. Search for imports of the file
2. Check if any code references it
3. Verify it's safe to remove
4. Get user confirmation if unsure

### Never Delete

- Files you're unsure about
- Files that might be referenced
- Core system files without explicit instruction

---

## Import Verification

### After Creating/Moving Files

If file creates new imports or is imported elsewhere:

**Verify:**
- Import paths are correct
- Imported items exist and are exported
- No circular dependencies created
- Imports follow project organization rules

### Before Modifying Exports

If changing what a file exports:

**Check:**
- What other files import this?
- Will changes break imports?
- Need to update importing files?

---

## Path Conventions

### Project Structure

Standard locations:
- Documents: `module/documents/`
- Sheets: `module/sheets/`
- Services: `module/services/`
- Utils: `module/utils/`
- Config: `module/config.js` or `module/config/`
- Templates: `templates/`
- Styles: `styles/`
- Localization: `lang/`

### File Naming

- PascalCase for classes: `L5R4Actor.js`
- kebab-case for templates: `character-sheet.hbs`
- kebab-case for styles: `actor-sheet.scss`
- lowercase for utilities: `calculations.js`
- Match content: file name reflects what's inside

---

## Error Prevention

### Common File Operation Errors

**Wrong path:**
Solution: Always use absolute paths, verify before submission

**File doesn't exist:**
Solution: Read file first to confirm existence

**Incorrect diff:**
Solution: Base diffs on actual file contents, not memory

**Breaking imports:**
Solution: Verify import paths after creating/moving files

**Overwriting unread files:**
Solution: Never modify without reading first

---

## Workflow Summary

### For Every File Operation

1. **Determine** absolute path
2. **Verify** path completeness
3. **Read** file (if exists)
4. **Understand** current structure
5. **Plan** changes based on actual content
6. **Show** accurate diffs
7. **Execute** modification
8. **Verify** imports and references still work

---

## Checklist

Before any file operation:

✅ Path is complete absolute path
✅ File has been read (if exists)
✅ Diffs show actual current content
✅ Changes won't break imports
✅ File is not in protected folder
✅ Follows project structure conventions
✅ Verification step completed

---

## Remember

Files are truth. Memory is unreliable. Always read before writing. Always verify paths. Always show accurate diffs. Never touch node_modules.