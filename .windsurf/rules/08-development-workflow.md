---
trigger: always_on
---

## Purpose
How to approach building features and progressing through development.

---

## Incremental Building

### Core Rule

**Build one complete feature at a time.**

### What This Means

Do not:
- Start multiple features simultaneously
- Leave features half-implemented
- Move to next feature while current one incomplete
- Work on unrelated code during feature development

Do:
- Focus on single feature
- Complete it fully
- Test it works
- Then move to next feature

### Why This Matters

- Partially complete features create technical debt
- Context switching wastes time
- Integration issues compound
- Testing becomes impossible
- Progress is unmeasurable

### Feature Scope

A "feature" is:
- Discrete functionality
- Can be tested independently
- Has clear start and end
- Integrates with existing system

Examples:
- "Skill roll system with XkY dice"
- "Wound tracking in character actor"
- "Character sheet traits tab"
- "Void Point spending service"

Not features (too large):
- "Complete combat system"
- "All character sheet tabs"
- "Entire magic system"

Break large systems into smaller features.

---

## Definition of "Done"

### Feature is Done When

✅ **Implementation complete**
- All code written
- All files created/modified
- Follows architecture patterns

✅ **Functionality works**
- Feature performs as intended
- No console errors
- Expected behavior verified

✅ **Integration successful**
- Works with existing features
- Data flows correctly
- No conflicts with other systems

✅ **Previous functionality intact**
- Nothing broke from prior phases
- Existing features still work
- No regressions introduced

✅ **Defensive coding applied**
- Input validation present
- Error handling implemented
- Edge cases considered
- Optional chaining used

✅ **JSDoc complete**
- All public functions documented
- Parameters described
- Return values documented

✅ **Ready for testing**
- Can be tested by user
- Expected behavior clear
- Test cases obvious

### Feature is NOT Done Until

All items above are complete.

### Partial Completion

If partially done:
- State what's complete
- State what remains
- Don't move to new feature
- Finish current feature first

---

## Documentation Timeline

### Three Types, Three Timings

**1. JSDoc Comments**

**When:** During development
**Required:** Yes, always
**Purpose:** Code understanding and maintenance

Write JSDoc as you write functions:
- Describe purpose
- Document parameters
- Document return values
- Note any side effects

Do not skip. Part of code quality.

**2. External Markdown Files**

**When:** Last, or never unless requested
**Required:** No, unless user asks
**Purpose:** User-facing documentation

Do not write after completing features:
- READMEs
- Changelogs
- User guides
- API documentation

Only create if:
- User explicitly requests
- Specifically needed to proceed
- Required for deliverable

**3. Unit Tests**

**When:** Last, when development mostly complete
**Required:** Yes, but later
**Purpose:** Verification and regression prevention

Testing frameworks:
- Vitest for unit tests
- Quench for Foundry integration tests

Write tests when:
- Core features implemented
- System mostly stable
- User indicates testing phase

Do not write during feature development.

---

## Work Progression

### Feature Development Cycle

**1. Understand Requirements**
- What needs to be built?
- What game rules apply?
- What does "done" look like?

**2. Plan Implementation**
- Which files needed?
- What architecture layer (Document/Sheet/Service/Utils)?
- What dependencies exist?
- What order of operations?

**3. Implement Incrementally**
- Create/modify one file at a time
- Test each piece as you go
- Verify imports work
- Check integration points

**4. Verify Functionality**
- Feature works as expected
- No console errors
- Edge cases handled
- Defensive coding applied

**5. Integration Check**
- Works with existing features
- Data flows correctly
- Nothing broke
- Architecture patterns followed

**6. Mark Complete**
- All checklist items met
- Ready for user testing
- Move to next feature

### Between Features

Before starting next feature:
- Verify current feature complete
- Ensure nothing broken
- Clean up debug code
- Remove unused imports
- Commit mental model

---

## Testing Strategy

### During Development (Now)

**Manual testing:**
- Test each feature as built
- Verify expected behavior
- Check edge cases
- Test integration points

**Console verification:**
- No errors
- No warnings (address as encountered)
- Expected output
- Correct data flow

**User testing:**
- User tests completed features
- Reports issues
- Validates behavior

### Later (When System Stable)

**Automated testing:**
- Vitest for pure functions (Utils)
- Vitest for service logic
- Quench for Foundry integration
- Quench for document/sheet behavior

**Regression testing:**
- Verify fixes don't break features
- Test across features
- Validate game rules still accurate

### Testing Mindset Now

While not writing formal tests yet:
- Think about edge cases
- Consider how you'd test this
- Write code that will be testable
- Keep functions focused and pure (when possible)

---

## Integration Approach

### With Existing Code

When adding new feature:

**Before starting:**
- Understand what exists
- Identify integration points
- Check for conflicts
- Plan data flow

**During implementation:**
- Use existing patterns
- Follow established architecture
- Import from existing modules
- Don't duplicate logic (DRY)

**After completion:**
- Verify existing features work
- Test integration points
- Check data consistency
- Validate no breaking changes

### With Previous Phases

**Current phase work must not break prior phases.**

If previous implementation was wrong:
- You are FREE to fix it
- Don't leave broken code
- Correct implementation preferred

If previous implementation was right:
- Don't break it
- Build on top of it
- Integrate with it
- Preserve functionality

---

## Moving Forward Criteria

### When to Proceed to Next Feature

**All must be true:**
✅ Current feature definition of "done" met
✅ Feature tested and working
✅ Nothing broken from previous work
✅ User satisfied with feature (if testing occurred)
✅ No outstanding bugs in current feature
✅ Integration verified

### When NOT to Proceed

If any issue remains:
- Debug and fix first
- Complete current work
- Verify functionality
- Then move forward

**Never leave broken/incomplete work behind.**

---

## Phase Development

### Structured Implementation

When working on a development phase:

**1. Review Phase Definition**
- Read complete phase objectives
- Understand all mechanics required
- Identify dependencies
- Note any concerns

**2. Question Approach**
- Is this the right way to implement?
- Does it align with game rules?
- Are there potential issues?
- Should clarification be requested?

**3. Assess Current State**
- Review code from previous phases
- Verify nothing will break
- Identify what needs fixing
- Note integration points

**4. Plan Phase Implementation**
- Break into logical features
- Determine implementation order
- Identify testable milestones
- Consider dependencies

**5. Execute Feature by Feature**
- One complete feature at a time
- Follow incremental building rules
- Test as you go
- Integrate continuously

**6. Continuous Validation**
- After each feature: "Is this correct?"
- Verify against game rules
- Test with existing features
- Question implementation approach

**7. Phase Completion**
- All objectives met
- All features working
- Previous functionality intact
- Ready for next phase

### Freedom to Fix

During phase development:
- Fix previous implementations if wrong
- Improve architecture if needed
- Correct misunderstandings
- Refactor if beneficial

**But:**
- Don't break working functionality without reason
- Don't refactor unnecessarily
- Don't change what's correct
- Focus on current phase objectives

---

## Progress Measurement

### Good Progress

Signs of healthy development:
- Features complete before starting next
- No accumulation of bugs
- Existing features keep working
- Code quality consistent
- Integration smooth

### Warning Signs

Problems to address:
- Multiple incomplete features
- Growing bug list
- Breaking previous work
- Skipping testing
- Rushing through implementation

If seeing warning signs:
- Stop adding new work
- Complete what's started
- Fix what's broken
- Return to methodical approach

---

## Quality Maintenance

### Code Quality Standards

Throughout development:
- Follow architecture patterns
- Use defensive coding
- Write JSDoc for public functions
- Keep files focused and modular
- Maintain import organization
- Handle errors properly

### Preventing Technical Debt

Do not:
- Skip validation "for now"
- Leave TODOs in code
- Postpone known issues
- Accumulate quick fixes
- Ignore warnings

Quality maintained throughout > cleanup phase later.

---

## Communication During Development

### Status Updates

When reporting progress:
- State what's complete
- State what remains
- Note any issues found
- Keep it factual

**Not:**
"Making great progress on the combat system!"

**Instead:**
"Skill roll system complete. Damage calculation next."

### Issue Reporting

When encountering problems:
- Describe issue clearly
- State what you tried
- Ask specific questions
- Provide context

**Not:**
"Something's wrong with the actor."

**Instead:**
"L5R4Actor.prepareDerivedData() not calculating Wounds correctly. Expected 15, getting 12. Earth Ring is 3. Formula: Earth × 5 should equal 15."

---

## Workflow Summary

### Daily/Session Approach

1. **Review current state** - What's done? What's next?
2. **Select one feature** - Focus area for this session
3. **Plan implementation** - What files? What approach?
4. **Build incrementally** - One piece at a time
5. **Test continuously** - Verify as you go
6. **Complete fully** - Meet definition of "done"
7. **Verify integration** - Nothing broke
8. **Move to next feature** - Only when current done

### Long-term Approach

1. **Phase planning** - Understand phase objectives
2. **Feature breakdown** - Divide into implementable pieces
3. **Sequential development** - One feature after another
4. **Continuous integration** - Keep system working
5. **Testing later** - Automated tests when stable
6. **Documentation last** - External docs only if needed

---

## Checklist for Every Feature

Before marking feature complete:

✅ Implementation finished
✅ Functionality verified
✅ Integration tested
✅ Previous features working
✅ JSDoc written
✅ Defensive coding applied
✅ No console errors/warnings
✅ Edge cases handled
✅ Ready for user testing
✅ Definition of "done" met

---

## Remember

One feature at a time, completely. JSDoc during, tests later, external docs last. Never leave incomplete work. Always verify integration. Quality throughout, not cleanup later. Slow and steady builds solid systems.