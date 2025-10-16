# L5R4 Enhancement Implementation Analysis

## Overview

This document provides a thorough analysis of four proposed enhancements for the L5R4 Foundry VTT system. Each section covers scope, complexity, data requirements, and implementation difficulty.

---

## 1. Item Form Enhancements

### Summary

Add keywords, L5R4 pricing (koku/bu/zeni), nemuranai flags, special rules sections, and tabbed interfaces to item sheets (weapons, armor, common items, spells).

### What Needs to Be Done

#### Data Model Changes (`template.json`)

- **Spell Items**: Add `keywords` array field (already exists per line 307)
- **Weapon Items**: Add `keywords` array field
- **Armor Items**: Add `keywords` array field
- **Common Items, Weapons, Armor**: Add pricing object with `koku`, `bu`, `zeni` number fields
- **Common Items, Weapons, Armor**: Add `nemuranai` boolean field
- **Note**: `specialRules` field already exists in `itemDescription` template (line 220)

#### Template Changes

- **Weapon Sheet** (`templates/item/weapon.hbs`):
  - Add keywords input field
  - Add pricing section (koku/bu/zeni number inputs)
  - Add nemuranai checkbox with visual indicator
  - Implement tab system (Technical tab + Description/Pricing tab)
  - Move special rules section to Technical tab
- **Armor Sheet** (`templates/item/armor.hbs`):
  - Add keywords input field
  - Add pricing section
  - Add nemuranai checkbox
  - Implement tab system
- **Common Item Sheet** (`templates/item/commonItem.hbs`):
  - Add pricing section
  - Add nemuranai checkbox
- **Spell Sheet** (`templates/item/spell.hbs`):
  - Keywords already exist in data model, may need UI enhancement

#### Localization Changes (`lang/en.json` + translations)

- Add translation keys for:
  - `l5r4.equipment.keywords`
  - `l5r4.equipment.price.koku`
  - `l5r4.equipment.price.bu`
  - `l5r4.equipment.price.zeni`
  - `l5r4.equipment.nemuranai`
  - Tab labels for weapon/armor sheets

#### Sheet Logic Changes (`module/sheets/item-sheet.js`)

- Implement tab switching logic for weapons and armor
- Add tab state persistence (which tab was last active)
- Ensure enriched content works properly in tabbed interface

### Complexity Assessment

**Difficulty**: ⭐⭐ (Low-Medium)

**Breakdown**:

- **Data Model**: Very simple - adding primitive fields to existing structures
- **Templates**: Straightforward form field additions
- **Tab System**: Moderate - requires tab UI implementation with state management
- **Backward Compatibility**: Good - new fields have sensible defaults

**Time Estimate**: 4-6 hours

**Risks**:

- Tab implementation needs careful CSS and state management
- Multiple language files need updates (de.json, es.json, fr.json, etc.)
- Testing needed across all item types

---

## 2. Skill Mastery Roll Check System

### Summary

Automatically detect when characters meet skill mastery thresholds (ranks 3, 5, 7), display mastery abilities in roll breakdowns, and show which bonuses auto-apply vs require player choice.

### What Needs to Be Done

#### Data Model Changes

- **Skill Items** (`template.json` lines 282-299):
  - Already has `mastery3`, `mastery5`, `mastery7` as string fields
  - Need to expand to structured objects containing:
    - `name`: string
    - `description`: string (full rulebook text)
    - `type`: enum (passive/active/situational/cross-skill)
    - `autoApply`: boolean
    - `bonusType`: string (roll/keep/tn/etc.)
    - `bonusValue`: string

#### Roll Service Changes (`module/services/roll-service.js`)

- Add mastery detection logic:
  - Check character's skill rank when rolling
  - Retrieve relevant mastery abilities at or below current rank
  - Determine which masteries auto-apply based on roll context
  - Calculate mastery bonuses and add to roll formula

#### Dice Service Changes (`module/services/dice/`)

- Modify roll construction to include mastery modifiers
- Track mastery bonus sources for breakdown display

#### Chat Template Changes (`templates/chat/`)

- Add expandable "Roll Breakdown" section to chat cards
- Display:
  - Base calculation (Trait + Skill = XkY)
  - All modifier sources with values
  - Auto-applied mastery bonuses (highlighted)
  - Available but not applied masteries (informational)
- Implement collapse/expand interaction

#### Skill Document Changes (`module/documents/item.js` or skill-specific)

- Add computed properties for active masteries based on rank
- Helper methods to determine mastery applicability

### Data Entry Consideration

**Major Challenge**: 105+ skills × 3 mastery ranks = ~315 mastery entries

- Each entry requires accurate rulebook text
- Type classification (passive/active/situational)
- Auto-apply determination requires rules expertise
- **Recommendation**: Phased approach, starting with common skills

### Complexity Assessment

**Difficulty**: ⭐⭐⭐⭐ (High)

**Breakdown**:

- **Data Model Restructuring**: Medium complexity, need careful migration
- **Roll Integration**: High complexity - touches core roll mechanics
- **Roll Breakdown UI**: Medium complexity - collapsible sections with dynamic data
- **Mastery Logic**: High complexity - context-aware auto-apply detection
- **Data Volume**: Very high - 315 manual entries required

**Time Estimate**: 20-30 hours (code) + 40-60 hours (data entry)

**Risks**:

- Breaking existing roll mechanics
- Incomplete mastery data creates inconsistent experience
- Auto-apply logic may be incorrect for edge cases
- Performance impact on roll calculations
- Chat card complexity may affect mobile rendering

---

## 3. School Package System

### Summary

Implement schools as packaged items containing ring bonuses, skill lists, and all 5 rank techniques. Enable applying schools to characters to grant bonuses and track progression.

### What Needs to Be Done

#### Data Model Changes (`template.json`)

- **School Items** (lines 272-275, currently minimal):
  - Add `clan`: string
  - Add `schoolType`: enum (bushi/shugenja/courtier/monk/ninja/artisan)
  - Add `ringBonus`: string (which ring gets +1)
  - Add `schoolSkills`: array of strings
  - Add `techniques`: array of 5 objects:
    - `rank`: 1-5
    - `name`: string
    - `description`: rich text
  - Add `startingHonor`: object with `min` and `max`
  - Add `startingOutfit`: rich text description
  - Add `isPath`: boolean
  - Add `isAdvanced`: boolean
  - Add `prerequisites`: array of requirement objects

#### Technique Items

- **New or Modified** technique item structure:
  - Add `sourceSchool`: string (school name/ID reference)
  - Add `schoolRank`: 1-5
  - Add `isPath`: boolean
  - Add `isAdvanced`: boolean

#### Actor Document Changes (`module/documents/actor.js`)

- Add methods:
  - `applySchool(schoolItem)`: Apply ring bonus, add school skills, grant rank 1 technique
  - `trackSchoolProgression()`: Monitor which techniques character has by rank
  - `getActiveSchools()`: Return array of character's school items

#### Character Data Model (`template.json` pc actor)

- Line 147 has `school`: string
  - Expand to `schools`: array of school references/IDs
  - Add `schoolRanks`: object mapping school ID to current rank

#### Character Sheet Changes (`module/sheets/`, `templates/actor/pc.hbs`)

- Add school display section showing:
  - Current school(s)
  - School rank progression
  - Techniques by rank with source identification
  - Visual indicators for school skills
- Add "Apply School" workflow/button

#### Optional: Character Generator

- Multi-step wizard application:
  - Step 1: Select Clan
  - Step 2: Select Family
  - Step 3: Select School
  - Step 4: Assign Skill Points
  - Step 5: Select Equipment
- Preview panel showing cumulative selections
- Final "Create Character" button that applies all choices

### Data Entry Consideration

**Major Challenge**: 100+ schools × 5 techniques = 500+ technique entries

- Each technique requires full description text
- Prerequisites for advanced schools/paths
- Accurate school skill lists
- **Recommendation**: Create compendium packs, phased data entry

### Complexity Assessment

**Difficulty**: ⭐⭐⭐⭐⭐ (Very High)

**Breakdown**:

- **Data Model**: High complexity - major additions to school and actor structures
- **School Application Logic**: High complexity - multi-system effects (rings, skills, techniques)
- **Progression Tracking**: Medium-high complexity - rank advancement, multiclassing
- **Character Sheet Integration**: High complexity - new UI sections, visual indicators
- **Character Generator (Optional)**: Very high complexity - full wizard UI with validation
- **Data Volume**: Extreme - 500+ technique descriptions

**Time Estimate**:

- Core system: 30-40 hours
- Character generator: +20-30 hours
- Data entry: 80-120 hours

**Risks**:

- Complex multiclassing scenarios (paths, advanced schools)
- Migration for existing characters with string-based school field
- Character generator scope creep
- Data entry accuracy for 500+ techniques
- Sheet UI complexity for multiple schools
- Backward compatibility challenges

---

## 4. Manual Dice Selection System

### Summary

Allow players to manually choose which dice to keep after rolling, instead of always keeping highest. Support explosion chain visualization and tactical dice selection.

### What Needs to Be Done

#### Dice Service Changes (`module/services/dice-service.js`)

- **Explosion Tracking**:
  - Modify roll execution to track explosion chains
  - Group exploded dice together (e.g., original die + all explosions)
  - Calculate totals for each explosion group
  - Store metadata about which dice are grouped

#### Roll Service Changes (`module/services/roll-service.js`)

- Add manual selection mode toggle (setting or per-roll option)
- Implement async workflow:
  1. Execute roll (generate all dice results)
  2. If manual mode: pause and show selection UI
  3. Wait for player to select exact number of keeps
  4. Calculate final total from selected dice
  5. Continue to chat card display
- Add auto-keep fallback if selection cancelled/times out

#### Selection UI (New Application)

- **Manual Dice Selector Dialog**:
  - Display all rolled dice visually
  - Show explosion chains grouped (e.g., `[10+6+3]=19`)
  - Make dice clickable for selection
  - Show running total as dice selected
  - Disable exceeding maximum keeps
  - Confirm/Cancel buttons
  - Mobile-friendly touch interface

#### Chat Template Changes

- Update roll result display to show:
  - All rolled dice (with unselected greyed out)
  - Selected dice highlighted
  - Explosion chains clearly grouped
  - Indicator when manual selection was used

#### Settings

- Add system setting: "Manual Dice Selection Mode"
  - Options: Always Auto, Always Manual, Shift-Click for Manual
- Add GM override: "Force Auto for GM rolls"

#### Performance Considerations

- Large dice pools (10k10 = 10+ dice) need efficient rendering
- Mobile/tablet touch targets must be adequate
- Async workflow can't block other players

### Complexity Assessment

**Difficulty**: ⭐⭐⭐⭐⭐ (Very High)

**Breakdown**:

- **Core Roll Mechanics**: Very high complexity - fundamental change to roll workflow
- **Explosion Tracking**: Medium-high complexity - dice relationship tracking
- **Selection UI**: High complexity - interactive dialog with state management
- **Async Workflow**: High complexity - proper async/await with timeouts and cancellation
- **Mobile Support**: High complexity - responsive UI with touch support
- **Integration**: Very high complexity - affects macros, automation, existing code

**Time Estimate**: 35-50 hours

**Risks**:

- **Breaking Changes**: Could break existing macros and automation
- **UX Complexity**: Extra step slows down gameplay for most rolls
- **Mobile Performance**: Touch interface on tablets may be clunky
- **Edge Cases**: Large dice pools, network latency, multiple simultaneous rolls
- **Regression Risk**: Changes to fundamental roll system could introduce bugs
- **User Adoption**: Players may resist added complexity for edge cases

**Critical Consideration**: This is the most invasive change to core system behavior. Requires extensive testing and user feedback before deployment.

---

## Summary Comparison

| Feature           | Difficulty           | Time (Dev) | Time (Data) | Breaking Risk | User Impact   |
| ----------------- | -------------------- | ---------- | ----------- | ------------- | ------------- |
| **Item Forms**    | ⭐⭐ Low-Medium      | 4-6 hrs    | None        | Very Low      | High QoL      |
| **Skill Mastery** | ⭐⭐⭐⭐ High        | 20-30 hrs  | 40-60 hrs   | Medium        | High Value    |
| **School System** | ⭐⭐⭐⭐⭐ Very High | 30-40 hrs  | 80-120 hrs  | High          | Game-Changing |
| **Manual Dice**   | ⭐⭐⭐⭐⭐ Very High | 35-50 hrs  | None        | Very High     | Niche Use     |

---

## Recommended Implementation Order

### Phase 1: Quick Wins

1. **Item Form Enhancements** - Low risk, high QoL improvement, fast implementation

### Phase 2: High Value Features

2. **Skill Mastery System** (code only, phased data entry)
   - Implement infrastructure
   - Populate data for 20-30 most common skills first
   - Community can contribute remaining mastery data

### Phase 3: Major Features

3. **School Package System** (core only, defer character generator)
   - Implement school application and tracking
   - Create 10-15 core rulebook schools as proof of concept
   - Skip character generator wizard (use manual school application)
   - Community/future can expand school library

### Phase 4: Advanced Features (Evaluate After Phase 3)

4. **Manual Dice Selection** - Reconsider necessity after user feedback
   - High complexity, niche use case
   - Consider simpler alternatives (manual roll adjustment, honor system)
   - May not justify development cost vs. impact

---

## Technical Debt & Migration Concerns

### Current System Observations

- Uses Foundry v13 ApplicationV2 architecture ✓
- ItemSheetV2 with HandlebarsApplicationMixin ✓
- Clean separation: Documents compute, Sheets render ✓
- Template scaffolding pattern already established ✓

### Migration Requirements

- **Skill Mastery**: Need migration to convert string fields to structured objects
- **School System**: Need migration for `actor.system.school` string → `schools` array
- **Item Forms**: Backward compatible, no migration needed

### Data Entry Strategy

- Consider creating admin/GM tools for bulk data entry
- Community contribution templates (spreadsheet → JSON converter)
- Incremental compendium releases (core content first, supplements later)

---

## Conclusion

**Feasibility**: All features are technically feasible within the current architecture.

**Effort vs. Value**:

- **Best ROI**: Item Form Enhancements (low effort, high impact)
- **High Value**: Skill Mastery System (medium effort, very high gameplay impact)
- **Game-Changing**: School System (very high effort, transforms character creation)
- **Questionable ROI**: Manual Dice Selection (very high effort, niche benefit)

**Recommended Approach**: Implement in phases, starting with Item Forms, then Skill Mastery with phased data entry, then evaluate resources for School System. Reconsider Manual Dice Selection after gathering user feedback on whether the feature is truly needed.
