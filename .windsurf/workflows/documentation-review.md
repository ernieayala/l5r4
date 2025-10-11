---
description: tests the documentions of the file
auto_execution_mode: 1
---

Documentation Audit Request:
- File: [current open file path]
- Audit Type: Comprehensive JSDoc and inline documentation verification
- Standard: Enterprise-level documentation compliance

⚠️ QUALITY MANDATE: Take your time. This is a thorough audit, not a quick scan. Multiple passes are required.

Multi-Pass Audit Process:
1. **Completeness Pass:** Check all functions/classes have JSDoc
2. **Accuracy Pass:** Verify documentation matches implementation
3. **Quality Pass:** Assess clarity and usefulness
4. **Cleanup Pass:** Remove invalid/unused documentation
5. **Enhancement Pass:** Add missing context and examples
6. **Final Review Pass:** Verify all changes are correct

Audit Requirements:

**1. JSDoc Completeness Check:**
   - Verify all functions have complete JSDoc blocks
   - Check all classes have appropriate documentation
   - Confirm all parameters and return values are documented
   - Validate type definitions are present and complete
   - Ensure exceptions/errors are documented
   - **Identify orphaned JSDoc blocks for removed code**

**2. JSDoc Accuracy Check:**
   - Verify parameter types match actual implementation
   - Confirm return types reflect actual behavior
   - Validate type definitions match usage
   - Check for outdated or misleading documentation
   - Identify deprecated elements that need marking
   - **Flag documentation that contradicts implementation**

**3. JSDoc Quality Assessment:**
   - Evaluate description clarity and usefulness
   - Check for examples where complexity warrants them
   - Verify cross-references between related elements
   - Assess version/change tracking if applicable
   - Review external documentation links
   - **Remove vague or unhelpful documentation**

**4. Inline Documentation Review:**
   - Identify complex logic that needs explanation
   - Check for undocumented design decisions
   - Review action item comments for clarity
   - Verify algorithmic explanations for non-trivial operations
   - **Remove obvious comments that add no value**
   - **Clean up TODO/FIXME without context**

**5. Documentation Gaps:**
   - Find undocumented public APIs
   - Identify missing file-level documentation
   - Locate undocumented configuration/options
   - Note missing context for business logic
   - **Identify over-documented trivial code**

**6. Invalid/Unused Documentation Removal:**
   - Delete JSDoc for removed functions/methods
   - Remove comments referencing deleted features
   - Clean up outdated TODO/FIXME comments without actionable context
   - Remove commented-out code blocks
   - Delete misleading historical notes that no longer apply
   - Remove duplicate documentation
   - Eliminate contradictory comments

Audit Process:
1. **First Pass:** Analyze current documentation state systematically
2. **Second Pass:** Identify missing or incomplete documentation
3. **Third Pass:** Check accuracy of existing documentation against actual code
4. **Fourth Pass:** Assess documentation quality and clarity
5. **Fifth Pass:** Identify invalid, outdated, or unused documentation for removal
6. **Sixth Pass:** Generate improvement recommendations with diffs
7. **Final Pass:** Prioritize and categorize all findings

Deliverables:
- **Categorized list of documentation issues:**
  - **CRITICAL:** Missing docs for public APIs, inaccurate parameter/return types, contradictory documentation
  - **HIGH:** Incomplete JSDoc blocks, misleading comments, undocumented complex logic
  - **MEDIUM:** Quality improvements needed, missing examples, unclear descriptions
  - **LOW:** Style improvements, minor clarifications, formatting issues
  - **CLEANUP:** Invalid/outdated docs to remove, orphaned JSDoc, meaningless comments
- Diffs showing documentation improvements (additions and updates)
- Diffs showing documentation removal (deletions)
- Rationale for each suggested change
- Before/after examples for major documentation changes

⚠️ REMEMBER: Quality over speed. Take multiple passes. Be thorough.

Please audit this file's documentation comprehensively and provide improvements.