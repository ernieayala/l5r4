# Windsurf Instructions: L5R4 Comprehensive Code Review

## Comprehensive Code Review & Documentation Audit

**Project Location:** `c:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4\`

**Objective:** Conduct an exhaustive line-by-line review of the entire L5R4 Foundry VTT system to identify:
1. Code optimization opportunities
2. Documentation gaps and redundancies
3. Localization (lang) missing/unused entries
4. Architecture violations or inconsistencies
5. Performance bottlenecks
6. Dead code or unused features
7. Missing error handling
8. API misusage or deprecated patterns
9. Stale code and outdated patterns

---

## COMPLETE FILE INVENTORY - EVERY FILE MUST BE REVIEWED

**YOU MUST REVIEW ALL 86 FILES LISTED BELOW. NO EXCEPTIONS. NO SKIPPING.**

This will take a very long time. **THAT IS EXPECTED AND CORRECT.**

---

### CORE SYSTEM FILES (4 files)
- [ ] `system.json`
- [ ] `template.json`
- [ ] `l5r4.js`
- [ ] `l5r4.css`

---

### LANGUAGE FILES (6 files)
- [ ] `lang/de.json`
- [ ] `lang/en.json`
- [ ] `lang/es.json`
- [ ] `lang/fr.json`
- [ ] `lang/pt-BR.json`
- [ ] `lang/ru.json`

---

### MODULE - APPS (2 files)
- [ ] `module/apps/wound-config.js`
- [ ] `module/apps/xp-manager.js`

---

### MODULE - DOCUMENTS (2 files)
- [ ] `module/documents/actor.js`
- [ ] `module/documents/item.js`

---

### MODULE - SERVICES (4 files)
- [ ] `module/services/chat.js`
- [ ] `module/services/dice.js`
- [ ] `module/services/index.js`
- [ ] `module/services/stance.js`

---

### MODULE - SETUP (4 files)
- [ ] `module/setup/migrations.js`
- [ ] `module/setup/preload-templates.js`
- [ ] `module/setup/register-settings.js`
- [ ] `module/setup/sheets.js`

---

### MODULE - CORE (2 files)
- [ ] `module/config.js`
- [ ] `module/utils.js`

---

### SCSS FILES (12 files)
- [ ] `scss/actor-sheet.scss`
- [ ] `scss/actor/item-list.scss`
- [ ] `scss/actor/ranks.scss`
- [ ] `scss/actor/stats.scss`
- [ ] `scss/actor/wound.scss`
- [ ] `scss/apps/wound-config.scss`
- [ ] `scss/apps/xp-manager.scss`
- [ ] `scss/chat.scss`
- [ ] `scss/config.scss`
- [ ] `scss/global.scss`
- [ ] `scss/item-sheet.scss`
- [ ] `scss/l5r4.scss`

---

### TEMPLATES - ACTOR (4 files)
- [ ] `templates/actor/npc.hbs`
- [ ] `templates/actor/npc-limited.hbs`
- [ ] `templates/actor/pc.hbs`
- [ ] `templates/actor/pc-limited.hbs`

---

### TEMPLATES - ACTOR PARTIALS (20 files)
- [ ] `templates/actor/_partials/_advantage-section.hbs`
- [ ] `templates/actor/_partials/_armor.hbs`
- [ ] `templates/actor/_partials/_armor-section.hbs`
- [ ] `templates/actor/_partials/_bio.hbs`
- [ ] `templates/actor/_partials/_disadvantage-section.hbs`
- [ ] `templates/actor/_partials/_expand.hbs`
- [ ] `templates/actor/_partials/_initiative.hbs`
- [ ] `templates/actor/_partials/_item-section.hbs`
- [ ] `templates/actor/_partials/_kata-section.hbs`
- [ ] `templates/actor/_partials/_kiho-section.hbs`
- [ ] `templates/actor/_partials/_ranks.hbs`
- [ ] `templates/actor/_partials/_skills-section.hbs`
- [ ] `templates/actor/_partials/_spell-section.hbs`
- [ ] `templates/actor/_partials/_stats.hbs`
- [ ] `templates/actor/_partials/_stats-npc.hbs`
- [ ] `templates/actor/_partials/_tattoo-section.hbs`
- [ ] `templates/actor/_partials/_technique-section.hbs`
- [ ] `templates/actor/_partials/_unified-item-create.hbs`
- [ ] `templates/actor/_partials/_weapon-section.hbs`
- [ ] `templates/actor/_partials/_wounds.hbs`

---

### TEMPLATES - APPS (2 files)
- [ ] `templates/apps/wound-config.hbs`
- [ ] `templates/apps/xp-manager.hbs`

---

### TEMPLATES - CARDS (14 files)
- [ ] `templates/cards/advantage-disadvantage.hbs`
- [ ] `templates/cards/armor.hbs`
- [ ] `templates/cards/clan.hbs`
- [ ] `templates/cards/commonItem.hbs`
- [ ] `templates/cards/family.hbs`
- [ ] `templates/cards/kata.hbs`
- [ ] `templates/cards/kiho.hbs`
- [ ] `templates/cards/school.hbs`
- [ ] `templates/cards/skill.hbs`
- [ ] `templates/cards/spell.hbs`
- [ ] `templates/cards/tattoo.hbs`
- [ ] `templates/cards/technique.hbs`
- [ ] `templates/cards/weapon.hbs`
- [ ] `templates/cards/_partials/_expand.hbs`

---

### TEMPLATES - CHAT (3 files)
- [ ] `templates/chat/full-defense-roll.hbs`
- [ ] `templates/chat/simple-roll.hbs`
- [ ] `templates/chat/weapon-chat.hbs`

---

### TEMPLATES - DIALOGS (2 files)
- [ ] `templates/dialogs/roll-modifiers-dialog.hbs`
- [ ] `templates/dialogs/unified-item-create-dialog.hbs`

---

### TEMPLATES - ITEM (15 files)
- [ ] `templates/item/advantage.hbs`
- [ ] `templates/item/armor.hbs`
- [ ] `templates/item/clan.hbs`
- [ ] `templates/item/commonItem.hbs`
- [ ] `templates/item/disadvantage.hbs`
- [ ] `templates/item/family.hbs`
- [ ] `templates/item/kata.hbs`
- [ ] `templates/item/kiho.hbs`
- [ ] `templates/item/school.hbs`
- [ ] `templates/item/skill.hbs`
- [ ] `templates/item/spell.hbs`
- [ ] `templates/item/tattoo.hbs`
- [ ] `templates/item/technique.hbs`
- [ ] `templates/item/weapon.hbs`
- [ ] `templates/item/_partials/_rules-summary.hbs`
- [ ] `templates/item/_partials/_scaffold.hbs`

---

### BUILD SCRIPT (1 file)
- [ ] `scripts/prepare-release.js`

---

## TOTAL: 86 FILES TO REVIEW

**THIS IS ACCEPTABLE. QUALITY OVER SPEED.**

---

## CRITICAL: METHODICAL REVIEW APPROACH

**⚠️ SPEED IS NOT THE GOAL - ACCURACY IS THE GOAL ⚠️**

**YOU MUST GO SLOWLY AND DELIBERATELY. RUSHING CREATES MISTAKES.**

### Multi-Pass Review Methodology

**FOR EVERY SINGLE FILE, YOU MUST COMPLETE ALL PASSES:**

**PASS 1: UNDERSTANDING PASS (Read Only)**
- Read the entire file start to finish
- Do NOT analyze yet, just understand what the code does
- Map out the flow and purpose
- Identify all functions, classes, and their relationships
- Note any initial confusion or unclear sections
- **DO NOT MOVE TO PASS 2 UNTIL YOU FULLY UNDERSTAND THE FILE**

**PASS 2: PATTERN RECOGNITION PASS**
- Read the file again, this time looking for patterns
- Identify coding style (modern vs old)
- Note API usage patterns (v13 vs older)
- Look for architectural patterns (Document/Sheet/Service separation)
- Compare this file's patterns to other similar files you've reviewed
- **TAKE NOTES ON PATTERN INCONSISTENCIES**

**PASS 3: DETAILED ANALYSIS PASS**
- Read the file line by line, slowly
- Check each line against the review criteria
- Flag issues with exact line numbers
- Don't skip lines because they "look fine"
- **THIS IS WHERE YOU FIND THE BUGS AND ISSUES**

**PASS 4: CROSS-REFERENCE PASS**
- Check if functions are called elsewhere
- Verify imports are used
- Check if lang keys exist
- Verify data structures match usage
- **THIS IS WHERE YOU FIND DEAD CODE AND STALE REFERENCES**

**PASS 5: OPTIMIZATION PASS**
- Look for performance issues
- Identify redundant computations
- Check for unnecessary complexity
- Look for missed DRY opportunities
- **THIS IS WHERE YOU FIND EFFICIENCY IMPROVEMENTS**

**PASS 6: VERIFICATION PASS**
- Re-read your findings for this file
- Double-check line numbers are correct
- Verify your recommendations make sense
- Ensure you haven't missed obvious issues
- **THIS IS WHERE YOU CATCH YOUR OWN MISTAKES**

---

## EXECUTION PACE REQUIREMENTS

**TIME INVESTMENT PER FILE:**
- Small file (< 100 lines): Minimum 5-10 minutes across all passes
- Medium file (100-300 lines): Minimum 15-25 minutes across all passes  
- Large file (> 300 lines): Minimum 30-60 minutes across all passes

**DO NOT RUSH. IF YOU FEEL RUSHED, SLOW DOWN.**

**BREAK SCHEDULE:**
- After every 5 files reviewed, take a mental break
- Re-read the review criteria before continuing
- Verify your last batch of findings for accuracy

---

## QUALITY CONTROL CHECKPOINTS

**After Every File:**
- Did I complete all 6 passes?
- Did I read every line, or did I skim?
- Are my line numbers exact?
- Are my recommendations specific and actionable?
- Did I verify my findings are correct?

**After Every 10 Files:**
- Review all findings for consistency
- Check that similar issues are categorized the same way
- Verify no duplicate issue reports
- Ensure recommendations don't conflict

**Before Final Report:**
- Re-review all critical and high-priority findings
- Verify every line number reference
- Test that recommended fixes make sense
- Cross-check localization references
- Ensure no false positives

---

## MISTAKE PREVENTION PROTOCOLS

**COMMON MISTAKES TO AVOID:**

1. **Assuming code works because it looks right**
   - ALWAYS trace the actual execution path
   - ALWAYS verify data structures match usage
   - ALWAYS check if referenced things exist

2. **Skipping "boring" or "obvious" sections**
   - EVERY line matters
   - Bugs hide in "obvious" code
   - Stale code looks normal until you check it

3. **Not verifying line numbers**
   - ALWAYS count lines exactly
   - ALWAYS include context (a few lines before/after)
   - Wrong line numbers make fixes impossible

4. **Making assumptions about localization**
   - ALWAYS search for actual key usage
   - DON'T assume a key is used just because it exists
   - DON'T assume a key doesn't exist just because you didn't see it

5. **Recommending fixes without understanding context**
   - ALWAYS understand why code exists before suggesting removal
   - ALWAYS check if "dead" code is called dynamically
   - ALWAYS verify your fix doesn't break something else

6. **Batch processing instead of individual focus**
   - DO NOT try to review multiple files simultaneously
   - DO NOT switch between files mid-review
   - FINISH one file completely before starting another

---

## ACCURACY VALIDATION

**Before Marking Any Issue:**

✓ Can I explain exactly what's wrong?
✓ Do I have the correct line number?
✓ Have I verified this is actually a problem?
✓ Is my recommended fix correct and complete?
✓ Will this fix break anything else?
✓ Have I provided enough context for implementation?

**If you answer NO to any of these, GO BACK AND RE-REVIEW.**

---

## REVIEW REQUIREMENTS

**YOU MUST COMPLETE ALL 6 PASSES ON EVERY SINGLE ONE OF THE 86 FILES LISTED ABOVE.**

### 1. FILE-BY-FILE CODE ANALYSIS

**For Each JavaScript File (18 total JS files):**
- Read the ENTIRE file line by line
- Check for:
  - Unused variables/functions (dead code)
  - **Stale code** (outdated logic, old patterns, unmaintained sections)
  - Missing JSDoc comments
  - Incorrect error handling (missing try/catch, wrong console patterns)
  - Non-defensive coding (missing optional chaining, no fallbacks)
  - var usage instead of const/let
  - == instead of ===
  - Hard-coded strings that should be localized
  - Direct DOM manipulation in Document classes
  - Computation in Sheet classes
  - Deprecated Foundry APIs (stale API usage)
  - Missing `SYS_ID` constant usage
  - Inconsistent naming conventions (indicates code written at different times)
  - Code duplication (DRY violations)
  - Performance issues (unnecessary loops, repeated computations)
  - Missing data validation
  - **Workarounds for bugs that may no longer exist**
  - **Temporary solutions that became permanent**
  - **Code comments that no longer match implementation** (stale comments)

**For Each File, Provide:**
- Line numbers of issues
- Severity (CRITICAL, HIGH, MEDIUM, LOW)
- Specific fix recommendations with code diffs
- Performance impact assessment

---

### 2. TEMPLATE FILES ANALYSIS

**For Each Handlebars Template (60 total HBS files):**
- Check for:
  - Unused partials
  - Duplicate HTML structures
  - Missing localization calls ({{localize}})
  - Hard-coded text
  - Inefficient structure (excessive nesting)
  - Missing data-action attributes
  - Incorrect event binding patterns
  - Missing accessibility attributes
  - Dead conditionals
  - Unused CSS classes

---

### 3. DOCUMENTATION AUDIT

**Check Code Comments for:**
- Outdated comments (stale comments referencing old implementations)
- Misleading comments (code changed but comments didn't)
- **Comments with timestamps/versions** (e.g., "Fixed in v1.2" but we're on v2.0)
- Missing comments for complex logic
- Over-commented obvious code
- TODO/FIXME items that need addressing
- **Commented-out code blocks** (stale experiments or old approaches)
- **References to removed features or deprecated patterns**
- **Bug workaround comments for issues that may be fixed**

---

### 4. LOCALIZATION (LANG) COMPREHENSIVE AUDIT

**For `lang/en.json`:**

**Phase 1: Find Unused Entries**
- List every key in en.json
- Search entire codebase for each key usage
- Flag keys NEVER referenced anywhere
- Flag keys only referenced in templates but template is unused
- Provide DELETE recommendations with line numbers

**Phase 2: Find Missing Entries**
- Search all .js files for localized strings: `game.i18n.localize(`, `game.i18n.format(`
- Search all .hbs files for: `{{localize "`, `{{localize "`
- List all localization calls
- Cross-reference with en.json keys
- Flag missing keys with recommendations for key names and default text

**Phase 3: Consistency Check**
- Flag inconsistent naming patterns (L5R4.actor.* vs L5R4.Actor.*)
- Flag redundant keys with identical values
- Flag keys that should be consolidated
- Check for proper nesting structure

**Phase 4: Content Quality**
- Flag placeholder text
- Flag inconsistent terminology (e.g., "Character" vs "PC" vs "Actor")
- Flag missing punctuation
- Flag grammatical errors
- Flag overly technical language for user-facing strings

**Provide:**
- Complete list of unused keys (candidates for deletion)
- Complete list of missing keys (need to add)
- Reorganization recommendations
- Consolidated diff for lang file updates

---

### 5. CSS/SCSS REVIEW

**For Each Style File (12 total SCSS files):**
- Check for:
  - Unused selectors
  - Duplicate rules
  - Overly specific selectors
  - Missing SCSS variables
  - Hard-coded colors/sizes that should be variables
  - !important overuse
  - Non-responsive patterns
  - Missing vendor prefixes for compatibility
  - Performance issues (expensive selectors)
  - **Stale SCSS nesting patterns** (overly deep nesting from old practices)
  - **Unused mixins or functions**
  - **Hard-coded values that should use SCSS variables**
  - **Identify old LESS syntax if any migration artifacts remain**

---

### 6. ARCHITECTURE COMPLIANCE CHECK

**Verify Every File Follows L5R4 Patterns:**

**Documents (Actors/Items):**
- ✓ All computation in prepareDerivedData()
- ✓ No direct sheet access
- ✓ Flags under flags.l5r4.*
- ✓ Proper embedded document handling
- ✗ Flag any violations with line numbers
- ✗ **Flag stale patterns** (old document structure, deprecated methods)

**Sheets:**
- ✓ NO computation, only rendering
- ✓ Event delegation on sheet root
- ✓ data-action attributes for all events
- ✓ Uses getData() for context preparation
- ✓ ActorSheetV2/ItemSheetV2 patterns
- ✗ Flag any violations with line numbers
- ✗ **Flag mixed patterns** (some sheets modernized, others not - stale inconsistency)

**Services:**
- ✓ Pure functions where possible
- ✓ Async handling for dice rolls
- ✓ Chat message creation properly structured
- ✓ No direct actor/item modification
- ✗ Flag any violations with line numbers
- ✗ **Flag legacy service patterns** (old API calls, outdated logic)

**Cross-File Pattern Consistency:**
- Check if similar functionality uses consistent patterns across files
- Flag files that use outdated patterns when others have been modernized
- Identify half-completed architecture migrations
- **Detect temporal drift** (newer files use better patterns than older files)

**Provide:**
- Architecture violation report by file
- Pattern inconsistency report (stale vs modern)
- Refactoring recommendations
- Migration diffs for fixes
- Prioritized modernization plan

---

### 7. PERFORMANCE AUDIT

**Identify Performance Issues:**

**Computational Hotspots:**
- Flag methods called frequently (prepareDerivedData, render loops)
- Check for O(n²) or worse complexity
- Identify unnecessary recomputation
- Find missing caching opportunities
- Check for expensive DOM queries in loops

**Memory Leaks:**
- Check for missing event listener cleanup
- Check for unclosed intervals/timeouts
- Check for circular references
- Check for large objects not garbage collected

**Render Performance:**
- Check for forced reflows
- Check for excessive re-renders
- Check for large template renders
- Check for inefficient Handlebars helpers

**Provide:**
- Performance issue list with severity
- Optimization recommendations with code diffs
- Expected performance improvements

---

### 8. ERROR HANDLING & DEFENSIVE CODING

**Review Every Function:**

**Check for:**
- Missing try/catch blocks around async operations
- Missing null/undefined checks
- Missing array/object existence checks
- Missing type validation
- Poor error messages
- Incorrect console usage (should be console.warn("L5R4", ...))
- Missing error recovery
- No fallback values

**Provide:**
- List of unprotected code paths
- Recommended error handling patterns
- Diffs for defensive coding additions

---

### 9. FOUNDRY V13 API COMPLIANCE

**Check All Foundry API Usage:**

**Flag Stale API Usage:**
- Any V1 patterns still in use (stale architecture)
- Deprecated API calls (stale methods)
- Old hook names that have replacements
- Outdated data paths (e.g., actor.data.data vs actor.system)
- Legacy roll formulas
- Old permission check patterns
- Deprecated helper methods
- **Version checks for Foundry versions < v11** (stale compatibility code)
- **Workarounds for bugs fixed in earlier Foundry versions**
- **Mixed API versions** (some calls use v13, others use v10 patterns - stale inconsistency)
- **Half-migrated modules** (started migration but didn't finish)

**Provide:**
- API migration report
- Deprecation warnings with severity
- Stale API usage inventory
- Update diffs prioritized by risk

---

### 10. DEAD CODE & UNUSED FEATURES

**Identify:**
- Functions never called
- Variables declared but never used
- Imported modules never referenced
- Commented-out code blocks
- Deprecated features still in code
- Unused event handlers
- Unused template partials
- Unused CSS classes

**Provide:**
- Complete dead code inventory
- Safe-to-delete recommendations
- Cleanup diffs

---

### 11. STALE CODE & OUTDATED PATTERNS

**Stale Code Definition:** Code that still runs but is based on outdated assumptions, old patterns, or hasn't been updated when related systems changed.

**Identify Stale Code Indicators:**

**Pattern Inconsistencies:**
- Mixed use of old and new patterns in same file
- Functions that handle data structures that no longer exist
- Validation logic for removed features
- Conditional checks for conditions that can't occur anymore

**Temporal Markers:**
- Comments with dates (e.g., "// Added 2023-05-15")
- Comments referencing specific Foundry versions (e.g., "// For Foundry v10")
- Version checks in code that reference old versions
- Comments like "temporary fix" or "TODO: refactor later"

**Abandoned Workarounds:**
- Code working around Foundry bugs that are now fixed
- Polyfills for features now natively supported
- Compatibility shims for old browsers/versions no longer supported
- Redundant null checks after defensive coding was added elsewhere

**Mismatched Implementations:**
- Functions with similar names doing things differently (old vs new approach)
- Duplicate logic using different patterns (one updated, one not)
- Half-migrated features (some files updated to new pattern, others not)
- API calls using old methods when new methods exist

**Orphaned Features:**
- Setup code for features that were removed
- Migration code for versions no longer supported
- Backwards compatibility code for ancient versions
- Settings that no longer do anything

**Stale Data Structures:**
- Properties set but never read
- Flags created for old features
- Data migrations for deprecated schema versions
- Embedded documents that are never used

**Outdated Logic:**
- Calculations based on old game rules
- Wound penalties using old formulas
- Skill checks using deprecated mechanics
- Combat logic for removed subsystems

**Stale Code Categories to Check:**

1. **Version-Specific Code**
   - Check git history/comments for Foundry version references
   - Flag code written for Foundry v9/v10 still running in v13
   - Identify migration code for old versions

2. **Workaround Code**
   - Search for comments: "workaround", "hack", "temporary", "fix for bug"
   - Cross-reference Foundry changelog to see if bugs are fixed
   - Identify polyfills for old browsers

3. **Half-Migrated Features**
   - Compare similar functions across files for pattern consistency
   - Flag files using old patterns when others use new patterns
   - Identify incomplete refactors

4. **Assumption-Based Code**
   - Check for hardcoded values that should be dynamic
   - Identify logic based on old game mechanics
   - Flag calculations using deprecated formulas

5. **Abandoned Experiments**
   - Search for commented code blocks
   - Check for unused feature flags
   - Identify debug code left in production

**Provide:**
- Complete stale code inventory categorized by type
- Risk assessment for each instance
- Modernization recommendations with diffs
- Priority order for updates (high-risk stale code first)

---

## OUTPUT FORMAT

**Deliver Results in This Structure:**

### Summary Report
- Total files reviewed: [number]
- Total issues found: [number]
- Critical issues: [number]
- High priority: [number]
- Medium priority: [number]
- Low priority: [number]
- Lines of code analyzed: [number]
- Unused lang keys: [number]
- Missing lang keys: [number]
- Dead code identified: [number]
- **Stale code instances: [number]**
- **Stale API usage: [number]**
- **Outdated patterns: [number]**
- Performance issues: [number]
- Architecture violations: [number]

### Detailed Findings by Category

**For Each Issue:**
```
ISSUE #[number]: [Title]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
File: [exact file path]
Line(s): [line numbers]
Category: [Architecture/Performance/Localization/etc.]

Current Code:
```
[exact code snippet]
```

Problem:
[detailed explanation]

Recommended Fix:
```
[fixed code]
```

Impact:
[what this fixes/improves]

Priority: [1-5, 1 being highest]
```

### Consolidated Action Plan

**Phase 1 (Critical):**
1. [Issue #] - [Brief description]
2. [Issue #] - [Brief description]

**Phase 2 (High Priority):**
1. [Issue #] - [Brief description]

**Phase 3 (Medium Priority):**
1. [Issue #] - [Brief description]

**Phase 4 (Low Priority/Cleanup):**
1. [Issue #] - [Brief description]

### Multi-Edit Ready Diffs

**Provide ready-to-apply diffs for:**
1. lang/en.json cleanup (remove unused, add missing)
2. Critical architecture fixes
3. Performance optimizations
4. Error handling additions
5. Dead code removal

---

## DETAILED EXECUTION INSTRUCTIONS

**⚠️ READ THIS SECTION CAREFULLY BEFORE STARTING ⚠️**

**GOLDEN RULE: It is better to take 10 hours and be thorough than to take 2 hours and miss critical issues.**

---

### Step 1: System initialization and core files (SLOW AND METHODICAL)
- [ ] Review `system.json` - verify all metadata, file references
- [ ] Review `template.json` - verify all data templates for actors/items
- [ ] Review `l5r4.js` entry point with ALL 6 PASSES
  - Map all registered hooks - verify each one is necessary
  - Identify initialization flow - trace it completely
  - Document module dependencies - check every import
  - **Check for version-specific initialization code** (stale compatibility checks)
- [ ] Review `l5r4.css` compiled output
- [ ] Review `scripts/prepare-release.js` build script
- **DO NOT PROCEED until you fully understand the system initialization**

### Step 2: Configuration and utilities
- [ ] Review `module/config.js` - ALL 6 PASSES
  - Verify all constants are used
  - Check for stale configuration options
  - Verify naming consistency
- [ ] Review `module/utils.js` - ALL 6 PASSES
  - Check if all utility functions are used
  - Look for dead code
  - Verify error handling

### Step 3: Document classes deep dive (MULTIPLE PASSES PER FILE)
- [ ] Review `module/documents/actor.js` - SPEND TIME HERE, this is critical
  - Pass 1: Understand the entire actor data model
  - Pass 2: Identify all derivation patterns
  - Pass 3: Check every prepareDerivedData line
  - Pass 4: Verify all computed properties are used
  - Pass 5: Look for optimization opportunities
  - Pass 6: Double-check your findings
- [ ] Review `module/documents/item.js` - SAME RIGOR as actor
  - All 6 passes
  - Check all item type handling
  - Verify embedded document handling - test edge cases mentally
- **Compare implementation patterns for temporal drift** (identify old vs new patterns)
- **VERIFY every flag usage is correct and current**

### Step 4: Services review (CRITICAL SYSTEMS)
- [ ] Review `module/services/index.js` - ALL 6 PASSES
- [ ] Review `module/services/dice.js` - ALL 6 PASSES
  - Understand the roll formula system completely
  - Trace every dice calculation path
  - Verify edge cases are handled
  - Check for race conditions in async code
- [ ] Review `module/services/chat.js` - ALL 6 PASSES
  - Understand message creation flow
  - Verify template rendering
  - Check permission handling
- [ ] Review `module/services/stance.js` - ALL 6 PASSES
- **Check for workarounds and temporary fixes** (stale workarounds)
- **Verify async/await patterns are correct throughout**

### Step 5: Apps review
- [ ] Review `module/apps/wound-config.js` - ALL 6 PASSES
- [ ] Review `module/apps/xp-manager.js` - ALL 6 PASSES
- Check V2 Application patterns
- Verify event handling
- Check data flow

### Step 6: Setup files review
- [ ] Review `module/setup/migrations.js` - ALL 6 PASSES
  - Check for stale migrations (for very old versions)
  - Verify migration logic is correct
  - Check for missing migrations
- [ ] Review `module/setup/preload-templates.js` - ALL 6 PASSES
  - Verify all listed templates exist
  - Check for missing templates
- [ ] Review `module/setup/register-settings.js` - ALL 6 PASSES
  - Verify all settings are used
  - Check for stale settings
- [ ] Review `module/setup/sheets.js` - ALL 6 PASSES
  - Verify sheet registration is correct
  - Check for missing sheets

### Step 7: All SCSS files (DON'T RUSH THESE)
- [ ] Review `scss/l5r4.scss` - main entry point
- [ ] Review `scss/global.scss`
- [ ] Review `scss/config.scss`
- [ ] Review `scss/actor-sheet.scss`
- [ ] Review `scss/actor/item-list.scss`
- [ ] Review `scss/actor/ranks.scss`
- [ ] Review `scss/actor/stats.scss`
- [ ] Review `scss/actor/wound.scss`
- [ ] Review `scss/item-sheet.scss`
- [ ] Review `scss/chat.scss`
- [ ] Review `scss/apps/wound-config.scss`
- [ ] Review `scss/apps/xp-manager.scss`
- **Check for duplication across files**
- **Verify variable usage**
- **Check for LESS remnants**

### Step 8: All actor templates (VISUAL ACCURACY MATTERS)
- [ ] Review `templates/actor/pc.hbs` - ALL 6 PASSES
- [ ] Review `templates/actor/pc-limited.hbs` - ALL 6 PASSES
- [ ] Review `templates/actor/npc.hbs` - ALL 6 PASSES
- [ ] Review `templates/actor/npc-limited.hbs` - ALL 6 PASSES

### Step 9: All actor partial templates (20 FILES)
- [ ] Review `templates/actor/_partials/_advantage-section.hbs`