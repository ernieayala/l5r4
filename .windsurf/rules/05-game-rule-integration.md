---
trigger: always_on
---

## Purpose
How to integrate Legend of the Five Rings 4th Edition game rules into the digital system.

---

## Rules Source

### Location
Game rules are documented in the game-rules/ folder and official L5R4 rulebooks.

### Accessing Rules
Before implementing any mechanic:
1. Review the game mechanics section in game-rules/
2. Consult official L5R4 rulebooks if needed
3. Understand the tabletop implementation
4. Translate to digital automation

---

## Vision: Full Automation

### Long-term Goal
Transform L5R4 TTRPG into a fully automated digital system.

**Almost a video game.**

### What This Means
- Rules enforced automatically
- Calculations done by system
- Validation built-in
- No manual math
- No rule lookups during play

### Design Implications
When implementing mechanics, ask:
- Can this be automated?
- Should the system prevent invalid actions?
- What calculations can be hidden from users?
- How can we reduce manual work?

### Current Focus vs Future Vision

**Current Focus:**
- Core mechanics implementation
- Accurate rule translation
- Functional automation
- Stable foundation

**Future Vision (not current scope):**
- Guided character creation wizards
- NPC generation tools
- Encounter builders
- Item creation assistants
- Content generation prompts
- Interactive tutorials

**Do not implement future features now.** Focus on core mechanics. Vision provides context for architectural decisions.

---

## Rule Reference Process

### Before Implementing Any Mechanic

**Step 1: Locate the Rule**
Find the relevant section in rules.md or official L5R4 rulebooks.

**Step 2: Read Thoroughly**
Understand the complete rule, not just one aspect.

**Step 3: Identify Components**
- What traits/rings/skills involved?
- What calculations required?
- What conditions or modifiers apply?
- What edge cases exist?
- What are the valid ranges?

**Step 4: Map to Code Architecture**
- Computation → Documents
- Display → Sheets
- Complex operations → Services
- Validation → Utils

**Step 5: Implement**
Translate tabletop mechanic to digital automation.

### During Implementation

Keep rules.md open.
Reference specific sections as you code.
Verify implementation matches rules exactly.

### After Implementation

Test against rule examples.
Verify edge cases handled.
Ensure automation matches tabletop results.

---

## Where Mechanics Belong

### Documents (Actor/Item)
**Rules that define state or derived values:**
- Trait values
- Ring calculations
- Wound tracking
- Void Point tracking
- TN calculations
- Initiative modifiers
- Armor bonuses
- Status effect impacts
- Equipment bonuses

**Example Mechanics:**
- "Ring value equals lowest of its two component Traits"
- "Wound penalties apply at Earth Ring increments"
- "TN to be Hit equals Reflexes × 5 + Armor"

### Services
**Rules that define actions or operations:**
- Skill roll resolution
- Trait roll resolution
- Spell casting
- Damage calculation
- Initiative rolling
- Raise declaration and effects
- Status application

**Example Mechanics:**
- "Skill check: roll (Skill + Trait)k(Trait) vs TN"
- "Damage: weapon damage + Strength, keep extra dice from Raises"
- "Spell casting: roll (Ring + School Rank)k(Ring) vs spell TN"

### Utils
**Rules that define pure calculations:**
- Formula computations
- Value transformations
- Range validations
- Type checking

**Example Mechanics:**
- "Calculate Wound penalties based on Earth Ring"
- "Clamp trait value between 1 and 10"
- "Validate Ring is 1-10"

### Configuration
**Rules that define constants:**
- Trait ranges
- Ring ranges
- Resource types
- Valid options
- Fixed values

**Example Mechanics:**
- "Traits range from 1 to 10"
- "Rings range from 1 to 10"
- "Resources are Wounds, Void Points, Honor, Glory, Status"

---

## Translating Tabletop to Digital

### Tabletop Pattern
Player consults rules → performs calculation → records result → GM validates

### Digital Pattern
System enforces rules → performs calculation automatically → updates data → validates in real-time

### Translation Guidelines

**Automate Everything Possible**
If a rule involves math, automate it.
If a rule checks conditions, validate it.
If a rule has prerequisites, enforce them.

**Enforce Constraints**
Tabletop relies on player honesty.
Digital systems enforce limits.

**Examples:**
- Trait values must be 1-10 → validation in document
- Can't spend more Void Points than available → check before allowing
- Wound penalties apply automatically → track and calculate automatically

**Preserve Player Choice**
Automation ≠ removing decisions.
Automate math and validation.
Preserve meaningful choices.

**Examples:**
- Automate damage calculation → player still chooses attack
- Automate TN calculation → player still chooses equipment
- Automate Wound tracking → player still chooses how to spend Void

**Handle Edge Cases**
Tabletop: GM adjudicates edge cases.
Digital: System must handle programmatically.

**Ask when unclear:**
"Rule says X. What happens if Y condition occurs?"

---

## When to Ask for Clarification

### Ask When:

**Rule is Ambiguous**
"Rule says 'add half your Insight Rank'. Round up or down?"

**Multiple Interpretations Exist**
"Does 'at the start of turn' mean before or after initiative?"

**Edge Case Unclear**
"What if both conditions trigger simultaneously?"

**Automation Approach Uncertain**
"Should system auto-deduct Void Points or require confirmation?"

**Rule Conflicts with Another Rule**
"Rule A says X, Rule B says Y. Which takes precedence?"

### Don't Ask When:

**Rule is Explicit**
Rule clearly states the mechanic. Implement as written.

**Standard Pattern Applies**
Similar mechanic already implemented. Follow same pattern.

**Calculation is Obvious**
Simple math clearly defined. Implement formula.

---

## Rule Accuracy Priority

### Accuracy Matters
The system should faithfully represent L5R4 rules.

### When in Doubt
- Favor accurate rule implementation over convenience
- Prefer explicit validation over permissiveness
- Choose faithful automation over simplified approximation

### Acceptable Deviations
Only deviate from rules when:
- User explicitly requests modification
- Digital medium requires it (e.g., simultaneous resolution)
- Rule creates technical impossibility

Document any deviations and why they exist.

---

## Testing Against Rules

### Verification Process

**Unit-level:**
Does calculation match rule formula?

**Integration-level:**
Do mechanics interact correctly?

**Edge-case-level:**
Do boundary conditions work as expected?

**Example-level:**
Run through examples from rulebook. Do results match?

### When Implementation Differs from Rules

**Stop immediately.**
Determine root cause:
- Misunderstood rule?
- Bug in implementation?
- Rule conflict?

Fix before proceeding.

---

## Common Rule Types

### Static Rules
Fixed values, ranges, constraints.
**Implementation:** Constants in Config.

### Derived Rules
Values calculated from other values.
**Implementation:** Computed properties in Documents.

### Action Rules
Player-initiated actions with resolution.
**Implementation:** Methods in Services.

### Validation Rules
Constraints on what's allowed.
**Implementation:** Validation in Documents/Utils.

### Modification Rules
Effects that alter other values.
**Implementation:** Modifiers applied in Documents.

### State Rules
Conditions that persist over time.
**Implementation:** Flags or system data in Documents.

---

## Rule Implementation Checklist

Before marking a mechanic complete:

✅ Rule fully understood from rules.md or rulebook
✅ Implementation matches rule exactly
✅ Edge cases handled
✅ Validation applied
✅ Calculation accurate
✅ Data stored appropriately
✅ UI displays correctly (if applicable)
✅ Integration tested
✅ Examples from rules produce correct results

---

## Documentation References

### In Code Comments
Reference which rule is being implemented:
- JSDoc can mention rule section
- Inline comments for complex rule logic
- Note any deviations from rules

### Not in External Docs
Don't create separate rule documentation.
rules.md and official rulebooks are source of truth.
Code should implement rules, not redocument them.

---

## Automation Philosophy

### Goal
Reduce cognitive load on players and GM.
Handle bookkeeping automatically.
Let users focus on story and decisions.

### Means
- Auto-calculate derived values
- Validate actions before allowing
- Track resources automatically
- Apply effects without manual tracking
- Enforce rule constraints

### Limits
- Don't remove meaningful choices
- Don't hide important information
- Don't automate interpretation (GM's role)
- Don't eliminate flexibility when rules allow it

---

## Remember

Game rules are in game-rules/ folder and official L5R4 rulebooks. Reference them constantly. Implement accurately. Automate thoroughly. Ask when unclear. The system should feel like a video game while preserving the TTRPG experience.