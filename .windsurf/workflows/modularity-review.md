---
description: review the modularity of files
auto_execution_mode: 1
---

## Modularity Review Template
**Usage:** Type `Modularity Review` followed by file path and focus areas

Modularity Review & Restructure:
- Target File: [complete file path]
- Current Size: [lines of code, if known]
- Concerns: [specific issues - too large, multiple responsibilities, hard to maintain, etc.]

CRITICAL OPERATING PRINCIPLES:
⚠️ GO SLOW - Take your time to understand before changing
⚠️ BE THOROUGH - Review the entire file and its dependencies completely
⚠️ PRESERVE FUNCTIONALITY - Do NOT break existing features unless absolutely necessary
⚠️ ANALYZE FIRST, ACT SECOND - Complete analysis before making any changes
⚠️ DO NOT CREATE ANY NEW MARKDOWN FILES UNLESS I TELL YOU

You have FULL AUTHORITY to:
- Create new folders/directories as needed
- Reorganize file structure
- Propose new architectural patterns
- Refactor across multiple files
- Establish new module boundaries
- Determine optimal organization

However, you MUST:
- Understand current functionality completely before restructuring
- Preserve all existing behavior unless there's a critical reason not to
- Test your understanding by explaining what the code does
- Identify all dependencies and side effects before moving code
- Work methodically through each change

---

Phase 1 - Deep Analysis (DO NOT SKIP):

1. **Current State Investigation:**
   - Read the ENTIRE file carefully
   - What does this file actually do? Explain it in detail
   - What are ALL its responsibilities?
   - What other files depend on this one?
   - What does this file depend on?
   - Where is it imported/used in the project?

2. **Problem Identification:**
   - What makes this file difficult to work with?
   - Where are responsibilities mixed?
   - What would break if we split this incorrectly?
   - What are the risks of restructuring?
   - What parts are tightly coupled?

3. **Architecture Review:**
   - Does this follow the project's architectural patterns?
   - Where does it deviate and why?
   - Is the deviation justified or problematic?

---

Phase 2 - Proposal (Think Before You Build):

1. **Restructure Vision:**
   - How should this file be organized?
   - What new folders/structure make sense for this project?
   - How will modules interact?
   - What are the logical boundaries?

2. **Risk Assessment:**
   - What could break during restructure?
   - How do we mitigate those risks?
   - What's the safest order of operations?
   - Where should we be extra careful?

3. **Design Rationale:**
   - WHY is this structure better?
   - How does it improve maintainability?
   - What trade-offs are we making?

---

Phase 3 - Implementation Strategy (Plan the Work):

1. **Step-by-Step Plan:**
   - What order should changes happen in?
   - What gets created first?
   - What gets modified when?
   - How do we verify each step?

2. **Dependency Management:**
   - What import changes are needed where?
   - How do we ensure nothing breaks?
   - What files need updating?

3. **Validation Strategy:**
   - How will we verify functionality is preserved?
   - What should be tested at each step?
   - What are the success criteria?

---

Phase 4 - Implementation (Execute Carefully):

1. **Create Structure:**
   - Build new folders/files as proposed
   - Provide complete code for new files
   - Explain what each new file does

2. **Migrate Code:**
   - Move code to new locations methodically
   - Update all imports and exports
   - Show complete diffs for all changes
   - Verify dependencies at each step

3. **Project Standards Compliance:**
   - Follow the project's existing architectural patterns
   - Maintain separation of concerns
   - Use appropriate module patterns
   - Ensure compatibility with project dependencies
   - Respect existing coding conventions

---

Required Deliverables:
✓ Thorough analysis showing you understand the current code
✓ Clear explanation of problems with current structure
✓ Proposed structure with reasoning
✓ Risk assessment and mitigation plan
✓ Complete implementation with all files
✓ All diffs for modified files
✓ Updated imports across entire project
✓ Verification that functionality is preserved
✓ Documentation of changes

Operating Constraints:
- DEFAULT: Preserve all existing functionality
- Only break functionality if you can justify it as absolutely necessary
- Follow project's architectural patterns and conventions
- Use appropriate module syntax for the project
- Maintain or provide migration path for public APIs
- Document any breaking changes clearly

Remember:
🐌 SLOW AND STEADY - Rush leads to broken code
🔍 UNDERSTAND FIRST - Don't restructure what you don't understand
🛡️ PROTECT FUNCTIONALITY - Breaking things is easy, preserving them requires care
📋 DOCUMENT REASONING - Explain WHY, not just WHAT

Please analyze this file thoroughly, propose a well-reasoned modular restructure, and implement it carefully while preserving all existing functionality unless absolutely necessary.