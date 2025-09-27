# L5R4 System Release Testing Guide

## 🎯 Testing Overview

This guide provides comprehensive testing procedures to validate L5R4 system releases before distribution. All tests should be performed in a clean Foundry environment to ensure accurate results.

## 🧪 Test Environment Setup

### Prerequisites
- **Clean Foundry Installation**: Fresh Foundry v13+ instance
- **No Other Modules**: Disable all modules except core Foundry
- **Clean World**: Create new test world with L5R4 system
- **Multiple Browsers**: Test in Chrome, Firefox, and Safari if possible

### Environment Preparation
1. **Create Test World**
   - Name: "L5R4 Release Test"
   - System: Legend of the Five Rings 4th Edition
   - Description: "Release validation testing"

2. **Configure Basic Settings**
   - Language: English (for consistent testing)
   - Debug Mode: Enabled
   - Console Logging: Enabled

## 📋 Core System Testing

### 1. Installation Testing

#### Manifest URL Installation
- [ ] **Manifest URL loads correctly**
  - URL: `https://github.com/ernieayala/l5r4/releases/latest/download/system.json`
  - No 404 errors
  - JSON validates properly

- [ ] **System installs without errors**
  - Installation completes successfully
  - No console errors during installation
  - System appears in Game Systems list

- [ ] **System information correct**
  - Version number matches release
  - Author information correct
  - Description accurate

#### ZIP Download Installation
- [ ] **ZIP downloads correctly**
  - URL: `https://github.com/ernieayala/l5r4/releases/latest/download/l5r4.zip`
  - File size reasonable (~5-10MB)
  - ZIP extracts without errors

- [ ] **Manual installation works**
  - Extract to systems directory
  - Foundry recognizes system
  - All files present and accessible

### 2. World Creation Testing

- [ ] **World creates successfully**
  - L5R4 system available in dropdown
  - World creation completes without errors
  - World launches properly

- [ ] **Initial world state correct**
  - No console errors on world load
  - Sidebar loads properly
  - System settings accessible

### 3. Language File Testing

Test each supported language:

- [ ] **English (en)**
  - All UI text displays correctly
  - No "l5r4.ui.something" placeholders
  - Character sheet fully translated

- [ ] **Español (es)**
  - Language switches properly
  - All major UI elements translated
  - No missing translation keys

- [ ] **Français (fr)**
  - Language switches properly
  - All major UI elements translated
  - No missing translation keys

- [ ] **Português (Brasil) (pt-BR)**
  - Language switches properly
  - All major UI elements translated
  - No missing translation keys

- [ ] **Deutsch (de)**
  - Language switches properly
  - All major UI elements translated
  - No missing translation keys

- [ ] **Русский (ru)**
  - Language switches properly
  - All major UI elements translated
  - No missing translation keys

## 👤 Actor Testing

### 1. PC Character Creation

- [ ] **Create PC Actor**
  - "Create Actor" button works
  - PC type available
  - Actor creates without errors

- [ ] **Character Sheet Opens**
  - Sheet opens without console errors
  - All sections visible
  - Styling renders correctly

- [ ] **Basic Data Entry**
  - Name field editable
  - Trait values adjustable
  - Changes save properly

### 2. Character Sheet Functionality

#### Traits Section
- [ ] **Trait Display**
  - All 8 traits visible (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
  - Values display correctly
  - Increment/decrement buttons work

- [ ] **Ring Calculations**
  - Rings calculate automatically from traits
  - Earth = min(Stamina, Willpower)
  - Air = min(Reflexes, Awareness)
  - Fire = min(Agility, Intelligence)
  - Water = min(Strength, Perception)
  - Void displays separately

- [ ] **Trait Rolling**
  - Click trait to roll
  - Roll dialog appears (if enabled)
  - Dice roll executes properly
  - Results display in chat

#### Skills Section
- [ ] **Skill Management**
  - Add new skills works
  - Skill sheets open properly
  - Rank adjustments work
  - School/Emphasis toggles function

- [ ] **Skill Rolling**
  - Click skill to roll
  - Proper trait + skill calculation
  - Emphasis rerolls work
  - Unskilled rolls function (Ctrl+click)

#### XP Manager
- [ ] **XP Manager Opens**
  - Click XP value opens manager
  - No console errors
  - All sections visible

- [ ] **XP Calculations**
  - Trait advancement costs correct
  - Skill advancement costs correct
  - Manual adjustments work
  - Purchase history displays

- [ ] **XP Manager Features**
  - Add manual XP works
  - Delete entries works
  - Sorting functions properly
  - Form state management correct

### 3. NPC Character Testing

- [ ] **Create NPC Actor**
  - NPC type available
  - Creates without errors
  - NPC sheet opens properly

- [ ] **NPC Sheet Functionality**
  - Basic stats editable
  - Attack entries work
  - Limited sheet view functions

## 🎲 Dice System Testing

### 1. Basic Roll Mechanics

- [ ] **Standard Rolls**
  - `/roll 5k3` works
  - `/gmroll 6k4` works
  - `/selfroll 4k2` works
  - `/blindroll 7k5` works

- [ ] **Roll Variations**
  - Emphasis: `e5k3` (rerolls 1s)
  - Unskilled: `u4k2` (no exploding)
  - Custom explosion: `5k3x9` (explodes on 9+)
  - Modifiers: `5k3+2` and `5k3-1`

### 2. Ten Dice Rule

- [ ] **Standard Ten Dice Rule**
  - Rolls >10 dice convert properly
  - 11k5 becomes 10k6
  - 13k5 becomes 10k6 (with Little Truths: +2)

- [ ] **Little Truths Variant**
  - Enable in system settings
  - Odd dice above 10 become +2 bonus
  - 13k5 becomes 10k6+2

### 3. Chat Integration

- [ ] **Roll Display**
  - L5R4 styling applied
  - Dice results clearly shown
  - Success/failure indicated
  - Exploding dice highlighted

- [ ] **Inline Rolls**
  - `[[5k3]]` in chat works
  - `[[5k3]]` in journal entries works
  - Results calculate properly

## ⚔️ Combat Testing

### 1. Initiative System

- [ ] **Initiative Rolls**
  - Initiative formula correct
  - Modifiers apply properly
  - Combat tracker integration

### 2. Attack Rolls

- [ ] **Weapon Attacks**
  - Weapon sheets function
  - Attack rolls work
  - Damage calculations correct
  - Target number detection

- [ ] **Target Number Handling**
  - TN visibility rules work
  - GM sees all TNs
  - Players see appropriate info
  - "Missed" displays correctly

### 3. Stance System

- [ ] **Stance Effects**
  - Stance automation works (if enabled)
  - Mutual exclusion functions
  - Status effects apply correctly

## 🔮 Spellcasting Testing

### 1. Spell Management

- [ ] **Spell Creation**
  - Add spells works
  - Spell sheets function
  - Ring selection works
  - Maho toggle functions

### 2. Spell Casting

- [ ] **Spell Rolls**
  - Spell casting rolls work
  - TN calculations correct
  - School bonuses apply
  - Affinity/deficiency modifiers

- [ ] **Spell Slots**
  - Slot tracking works
  - Slot consumption functions
  - Void slots separate
  - Slot restoration

## 🛠️ System Settings Testing

### 1. Core Settings

- [ ] **Stance Automation**
  - Toggle works
  - Effects apply when enabled
  - No effects when disabled

- [ ] **Insight Rank Calculation**
  - Auto-calculation works
  - Manual override functions
  - Rank thresholds correct

- [ ] **Roll Dialog Settings**
  - Always show works
  - Never show works
  - Conditional show works

### 2. Advanced Settings

- [ ] **Ten Dice Rule Variant**
  - Little Truths toggle works
  - Calculations change appropriately

- [ ] **Multiple Armor Stacking**
  - Toggle functions
  - Armor calculations adjust

## 📊 Performance Testing

### 1. Load Testing

- [ ] **Large Character Sheets**
  - Create character with many items
  - Sheet loads in reasonable time (<3 seconds)
  - No performance degradation

- [ ] **Multiple Actors**
  - Create 10+ actors
  - System remains responsive
  - Memory usage reasonable

### 2. Browser Compatibility

- [ ] **Chrome/Chromium**
  - All features work
  - No console errors
  - Performance acceptable

- [ ] **Firefox**
  - All features work
  - No console errors
  - Performance acceptable

- [ ] **Safari** (if available)
  - All features work
  - No console errors
  - Performance acceptable

## 🔄 Migration Testing

### 1. Version Upgrade Testing

- [ ] **Migration System**
  - Create world with previous version
  - Upgrade to new version
  - Migration runs automatically
  - Data preserved correctly

- [ ] **Backward Compatibility**
  - Existing characters work
  - Existing items function
  - No data loss

## 🐛 Error Handling Testing

### 1. Invalid Data Testing

- [ ] **Malformed Data**
  - System handles invalid trait values
  - Graceful degradation for missing data
  - Error messages helpful

- [ ] **Edge Cases**
  - Zero values handled
  - Negative values handled
  - Very large values handled

### 2. Network Issues

- [ ] **Offline Functionality**
  - System works without internet
  - Local assets load properly
  - No network dependencies for core features

## 📝 Documentation Testing

### 1. README Accuracy

- [ ] **Installation Instructions**
  - Manifest URL works
  - Installation steps accurate
  - Screenshots current

- [ ] **Feature Documentation**
  - All features documented
  - Examples work as described
  - Active Effects reference accurate

### 2. Changelog Accuracy

- [ ] **Version Information**
  - Version number correct
  - Changes accurately described
  - Breaking changes noted

## ✅ Release Approval Checklist

### Critical Requirements (Must Pass)
- [ ] System installs without errors
- [ ] Character sheets open and function
- [ ] Dice rolling works correctly
- [ ] No critical console errors
- [ ] All languages load properly
- [ ] XP Manager functions correctly

### Important Requirements (Should Pass)
- [ ] All combat features work
- [ ] Spellcasting system functions
- [ ] Migration system works
- [ ] Performance acceptable
- [ ] Documentation accurate

### Nice-to-Have (May Pass)
- [ ] All browsers tested
- [ ] Edge cases handled gracefully
- [ ] Advanced features tested
- [ ] Stress testing completed

## 🚨 Failure Response

### Critical Failures
If any critical requirement fails:
1. **Stop release process**
2. **Document the issue**
3. **Create GitHub issue**
4. **Fix before proceeding**

### Non-Critical Failures
If non-critical tests fail:
1. **Document in release notes**
2. **Create GitHub issues for tracking**
3. **Consider delaying if multiple failures**

## 📊 Test Results Template

```markdown
# L5R4 v[VERSION] Release Test Results

**Test Date**: [DATE]
**Tester**: [NAME]
**Environment**: Foundry v[VERSION] on [OS/BROWSER]

## Summary
- ✅ Critical Tests: [X/Y] passed
- ✅ Important Tests: [X/Y] passed  
- ✅ Nice-to-Have Tests: [X/Y] passed

## Critical Issues Found
- [List any critical issues]

## Non-Critical Issues Found
- [List any non-critical issues]

## Recommendation
- [ ] ✅ APPROVE for release
- [ ] ❌ REJECT - critical issues found
- [ ] ⚠️ CONDITIONAL - minor issues noted

## Notes
[Additional testing notes]
```

---

*Thorough testing ensures a quality release for the L5R4 community!* 🎯
