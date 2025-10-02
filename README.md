# Legend of the Five Rings 4th Edition for Foundry VTT

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-1.1.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![License](https://img.shields.io/badge/License-GPL%20v3-green)](https://github.com/ernieayala/l5r4/blob/main/COPYING)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4)](https://github.com/ernieayala/l5r4/issues)

An unofficial, comprehensive implementation of the Legend of the Five Rings 4th Edition tabletop RPG for Foundry VTT. Experience the world of Rokugan with complete character management, authentic dice mechanics, and full L5R4e rule support.

## 🙏 Acknowledgments

This system builds upon the foundational work of the original L5R 4th Edition contributors. While significantly refactored and modernized for Foundry v13+, we acknowledge and appreciate their pioneering efforts in bringing Legend of the Five Rings to Foundry VTT. Their original work for Foundry v12 and below can be found at: **https://gitlab.com/team-l5r4/l5r4**

---

## Table of Contents

- [What's New in v1.0.x - Complete System Overhaul](#-whats-new-in-v10x---complete-system-overhaul)
- [Installation](#-installation)
- [Quick Start Guide](#-quick-start-guide)
- [Core Features](#-core-features)
  - [Character Management](#character-management)
  - [Authentic L5R Dice System](#-authentic-l5r-dice-system)
  - [Combat & Equipment](#️-combat--equipment)
  - [Spellcasting System](#-spellcasting-system)
- [Integrated Dice Roller](#-integrated-dice-roller)
- [System Settings](#️-system-settings--configuration)
- [Active Effects Reference](#-active-effects-reference)
- [Localization](#-localization)
- [Recommended Modules](#-recommended-modules)
- [Development & Contributing](#️-development--contributing)
- [Troubleshooting](#-troubleshooting)
- [License & Attribution](#-license--attribution)

---

## ✨ What's New in v1.0.x - Complete System Overhaul

This major release represents a complete architectural modernization for Foundry VTT v13+, transforming the L5R4 system from the ground up.

### NEW FEATURES

#### Modern Architecture
- **ApplicationV2/DialogV2**: Complete rewrite using Foundry v13+ modern APIs
- **Migration System**: Automated data structure updates and schema migrations
- **Services Architecture**: Modular service-oriented design (dice, chat, stance services)
- **Setup System**: Organized initialization with preload templates and centralized settings

#### XP Manager Application
- **Dedicated Interface**: Full-featured XP management window with ApplicationV2
- **Automatic Tracking**: Comprehensive XP breakdown by category (traits, void, skills, advantages, disadvantages, kata, kiho)
- **Cost Calculation**: Automatic L5R4 progression formulas with family/school bonuses
- **Audit Trail**: Complete purchase history with timestamps and descriptions
- **Retroactive Calculation**: Rebuild XP history from current character state
- **v1.0.2**: Added "Recalculate Purchase XP" button for manual refresh

#### Stance Automation Service
- **Active Effects Integration**: Automated combat stance management with real-time bonus application
- **Mutual Exclusion**: Only one stance active at a time per actor
- **Full Attack Stance**: +2k1 to attack rolls, -10 to Armor TN (automated)
- **Defense Stance**: Air Ring + Defense Skill to Armor TN (automated)
- **Full Defense Stance**: Defense/Reflexes roll, half (rounded up) to Armor TN (automated)
- **Status Effect System**: Visual indicators with mechanical automation

#### Active Effects Integration
- **Complete System**: Dynamic trait and skill modifications via Foundry's Active Effects
- **Transferable Effects**: Family, School, Advantage, and Disadvantage bonuses apply automatically
- **Skill Bonuses**: Roll/keep/total bonuses for individual skills
- **Combat Bonuses**: Initiative, Armor TN, damage modifications
- **Wound Penalties**: Automatic wound penalty modifiers

#### Enhanced Systems
- **Base Actor Sheet**: Shared functionality between PC and NPC sheets with consistent UI
- **Icon Path Resolver**: Future-proof asset management with alias support
- **Family Bonuses**: Automated character creation bonuses via Active Effects
- **Wound Configuration**: Dedicated application for NPC wound customization

### ENHANCED FEATURES

#### Dice System Refactor
- **Before**: 21k+ line monolithic file
- **After**: 1.3k line modular service with focused functions
- Improved Ten Dice Rule implementation with Little Truths variant
- Better modifier dialog system with DialogV2
- Enhanced chat card rendering with success/failure evaluation
- Auto-targeting from selected tokens

#### XP Tracking Evolution
- **Before**: Simple XP field with manual calculation
- **After**: Complex cost calculation with automatic progression
- Triangular costs for skills (1+2+3+...+rank)
- Progressive costs for traits (4×new_rank)
- Fixed costs for void (6×new_rank)
- School skill free rank handling
- Emphasis cost tracking (2 XP each)

#### Combat Stances Upgrade
- **Before**: Static status effect definitions
- **After**: Active automation with mutual exclusion
- Automatic bonus application during rolls
- Armor TN modifications during data preparation
- Defense/Reflexes roll for Full Defense stance
- Chat integration for stance notifications

#### Spell Slots Enhancement
- **Before**: Basic checkbox system
- **After**: Integrated with dice service for automatic deduction
- Elemental spell slots (Air, Earth, Fire, Water, Void)
- Validation prevents casting when slots depleted
- Chat message integration shows slot usage

#### Sheet System Modernization
- **Before**: Basic ActorSheet implementation
- **After**: BaseActorSheet with v13+ APIs and advanced UI
- ApplicationV2 architecture throughout
- Improved event handling with action delegation
- Better drag-drop functionality
- Sorting preferences with persistence

#### Template Organization
- **Before**: Mixed partials in flat structure
- **After**: Hierarchically organized by function
- Categorized templates (actor, cards, chat, apps, dialogs)
- Partial templates for reusability
- Consistent naming conventions

#### Comprehensive Localization
- **Before**: Basic UI text coverage
- **After**: Complete coverage including skill names
- Six languages supported (en, es, fr, pt-BR, de, ru)
- All UI elements, settings, and error messages localized

#### Configuration Modernization
- **Before**: Basic objects with mutable state
- **After**: ES6 modules with immutability
- Frozen configuration objects
- Centralized constants (SYS_ID, paths, templates)
- Icon path resolver for future asset reorganization

#### Documentation Enhancement
- **Before**: Minimal comments
- **After**: Comprehensive JSDoc throughout codebase
- Function documentation with parameter types
- Usage examples and integration notes
- Performance considerations documented

### BREAKING CHANGES

- **Foundry v13+ Required**: System no longer compatible with Foundry v12 and below
- **PC Tabs Removed**: Simplified to single-page layout for better maintainability
- **Bow Type Migration**: Legacy "bow" items automatically migrated to weapon type with `isBow` flag

### MIGRATION NOTES

When upgrading from v0.9.x:
1. **Backup your world** before updating
2. Ensure you're running Foundry VTT v13 or later
3. Automatic migrations will run on first world load
4. Review character sheets for any data inconsistencies
5. Use XP Manager's "Recalculate Purchase XP" button if needed
6. Re-apply combat stances using new status effect system

All character data, XP totals, wound configurations, and compendium content are preserved during migration.

---

## 🚀 Installation

### Recommended: Manifest URL Installation
The easiest way to install and receive automatic updates:

1. **Open** Foundry VTT and navigate to the **Game Systems** tab
2. Click **"Install System"** at the bottom
3. **Paste** this manifest URL into the **Manifest URL** field at the bottom:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
4. Click **"Install"**
5. **Create** a new world and select "Legend of the Five Rings 4th Edition" as the game system

> **⚠️ Important:**
> - This system will **NOT** appear in the Foundry browser search because the "l5r4" name is claimed by the previous version
> - You **must** use the manifest URL method above - searching won't work
>
> **✨ Benefits:**
> - Automatic update notifications when new versions are released
> - One-click updates through Foundry's interface
> - No manual file management required

### Alternative: Manual Installation
If you prefer to install manually or need a specific version:

1. **Download** the latest release:
   - Go to [GitHub Releases](https://github.com/ernieayala/l5r4/releases)
   - Download `l5r4.zip` from the latest release
2. **Extract** the ZIP file contents
3. **Copy** the `l5r4` folder to your Foundry systems directory:
   - **Windows**: `%localappdata%\FoundryVTT\Data\systems\`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/systems/`
4. **Restart** Foundry VTT
5. **Create** a new world and select "Legend of the Five Rings 4th Edition" as the game system

> **⚠️ Important Notes:**
> - The system **cannot** be installed through the Foundry VTT System Browser because the name is claimed by the previous version
> - Manual installations won't receive automatic update notifications
> - Always backup your worlds before installing or updating systems

### Development Installation
For developers who want to contribute or test the latest changes:
```bash
cd [foundry-data-path]/systems/
git clone https://github.com/ernieayala/l5r4.git
cd l5r4
npm install
npm run build:css
```

---

## 🎯 Quick Start Guide

### Creating Your First Character

1. **Create a New Actor**
   - Click "Create Actor" in the Actors sidebar
   - Select "PC" (Player Character) type
   - Name your character

2. **Set Basic Traits**
   - Open the character sheet
   - Set your eight traits (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
   - Rings are calculated automatically from trait pairs

3. **Add Family and School**
   - Click "Add Item" in the appropriate section
   - Select "Family" or "School" from the dropdown
   - Create or drag items from compendiums
   - Family trait bonuses apply automatically via Active Effects

4. **Add Skills**
   - Click "Add Item" in the Skills section
   - Create skills with appropriate ranks
   - Mark school skills with the checkbox
   - XP costs are tracked automatically

5. **Make Your First Roll**
   - Click any skill name to roll
   - Modify the roll in the dialog (if enabled)
   - Results appear in chat with success/failure evaluation

### Making Rolls

- **Skill Rolls**: Click skill names on the character sheet
- **Ring Rolls**: Click ring values for elemental tests
- **Trait Rolls**: Ctrl+Click trait values for unskilled rolls
- **Weapon Attacks**: Click weapon names in the equipment section
- **Initiative**: Click the initiative value in combat

---

## 🌟 Core Features

### Character Management

#### Complete PC Sheets
- **Full L5R4e Attributes**: All eight traits, five rings, void points, insight rank
- **Automatic Calculations**: 
  - Rings computed from trait pairs (Air=min(Ref,Awa), Earth=min(Sta,Wil), Fire=min(Agi,Int), Water=min(Str,Per))
  - Initiative: Insight Rank + Reflexes + modifiers
  - Armor TN: 5×Reflexes + 5 + armor bonuses + modifiers
  - Wounds: Earth-based thresholds with customizable multipliers
  - Insight: Rings×10 + Skills×1 with optional auto-rank calculation
- **Wound System**: Dynamic wound level tracking with penalties applied automatically to target numbers
- **Experience Tracking**: Comprehensive XP system with automatic cost calculation for all advancement types
- **Family/School Integration**: Active Effects system for creation bonuses and trait modifications
- **Sorting Preferences**: Per-user, per-actor item sorting with persistent preferences

#### NPC Sheets
- **Streamlined Interface**: Simplified sheets for NPCs with essential stats and rollable attacks
- **Flexible Wound System**: Choose between manual threshold entry or Earth-based formula calculations
- **Quick Combat Stats**: Pre-configured attack and damage rolls for fast combat resolution
- **Shared Mechanics**: Uses same trait/ring calculations as PCs for consistency

#### Insight Rank Tracking
- **Automatic Calculation**: Optional auto-calculation based on total insight points (Rings×10 + Skills×1)
- **Manual Override**: Disable auto-calculation in settings for manual rank management
- **Threshold-Based**: Follows L5R4e insight rank thresholds (150, 175, 200, 225, 250, etc.)

#### Experience Point System
Advanced XP tracking with automatic cost calculation:
- **Trait Advancement**: Progressive costs (4×new_rank XP per step)
- **Void Advancement**: Fixed costs (6×new_rank XP per step)
- **Skill Advancement**: Triangular costs (1+2+3+...+rank XP)
- **School Skills**: First rank free for school skills
- **Emphasis**: 2 XP per emphasis (school skills may get free emphases)
- **Advantages/Disadvantages**: Direct costs from item data
- **Kata/Kiho**: Direct costs from item data
- **Free Bonuses**: Family traits and school skills reduce costs automatically
- **Audit Trail**: Complete log of all XP expenditures with timestamps
- **Retroactive Calculation**: XP Manager can rebuild purchase history from current character state

---

### 🎲 Authentic L5R Dice System

#### Roll & Keep Mechanics
- **Full XkY Implementation**: Roll X dice, keep Y highest
- **Ten Dice Rule**: Automatic enforcement with optional Little Truths variant
  - Dice pools > 10: Excess dice become flat bonuses (+1 per excess die)
  - Keep values > 10: Excess keep becomes flat bonuses (+2 per excess keep)
  - Example: 12k8 becomes 10k8+4 (2 excess roll dice × 1 + 2 excess keep dice × 2)
- **Exploding Dice**: Configurable explosion thresholds for weapons and techniques (default: 10)
- **Emphasis Support**: Reroll 1s on first roll for emphasized skills
- **Unskilled Rolls**: Ctrl+click rings for unskilled rolls (no exploding dice)

#### Roll Modifiers
- **Raises**: Declare raises before rolling for enhanced effects (+5 TN per raise)
- **Void Points**: Spend Void for +1k1 bonus to rolls (deducted automatically)
- **Wound Penalties**: Automatic application of wound penalties to target numbers
- **Active Effects**: Skill-specific and trait-specific bonuses from items and effects
- **Manual Modifiers**: Add custom roll/keep/total bonuses via roll dialog

#### Targeting & Combat Integration
- **Auto-Targeting**: Automatically sets target numbers from selected tokens' Armor TN
- **Success/Failure Evaluation**: Automatic comparison of roll total vs. effective TN
- **Raise Calculation**: Displays number of raises achieved on successful rolls
- **Attack Roll Feedback**: Shows "Missed" instead of "Failure" for failed attack rolls

#### Roll Dialogs
- **Interactive Options**: Customizable roll dialogs for all roll types
- **Configurable Display**: Show/hide dialogs per roll type (trait, skill, spell, weapon)
- **Shift-Click Override**: Hold Shift to bypass dialog and roll immediately
- **Preset Modifiers**: Dialog pre-populates with bonuses from Active Effects

---

### ⚔️ Combat & Equipment

#### Weapon System
- **Rollable Weapons**: Click weapon names to make attack rolls with automatic damage calculation
- **Damage Calculations**: Weapon damage rolls with proper XkY formulas
- **Special Properties**: Custom explosion thresholds, size categories, and special rules
- **Skill Association**: Dynamic skill detection for attack rolls (Kenjutsu, Kyujutsu, etc.)
- **Fallback Traits**: Configurable fallback traits when associated skill is missing

#### Bow System
- **Integrated Bows**: Bows are weapons with `isBow` flag (legacy "bow" type migrated automatically)
- **Strength Rating**: Bow strength limits damage based on character Strength
- **Arrow Types**: Support for specialized arrow types with damage modifiers
  - Willow Leaf: +0k0 (standard)
  - Armor Piercing: +1k0
  - Flesh Cutter: +0k1
  - Humming Bulb: +0k0 (special)
  - Rope Cutter: +0k0 (special)
  - Willow Leaf (Kaiu): +1k0
- **Range Tracking**: Range values stored for reference

#### Armor System
- **Automatic TN Calculations**: Armor TN = 5×Reflexes + 5 + armor bonus + modifiers
- **Damage Reduction**: Armor reduction values tracked and applied
- **Stacking Rules**: Configurable armor stacking (default: only highest applies)
  - **Disabled (default)**: Only highest armor TN bonus and reduction apply
  - **Enabled**: All equipped armor bonuses and reductions stack
- **Equipment Toggle**: Mark armor as equipped/unequipped to apply bonuses

#### Combat Stances
Full stance system with automation and mutual exclusion:
- **Attack Stance**: Visual indicator only (no mechanical effects)
- **Full Attack Stance**: +2k1 to attack rolls, -10 to Armor TN
- **Defense Stance**: Add Air Ring + Defense Skill Rank to Armor TN
- **Full Defense Stance**: Make Defense/Reflexes roll, add half (rounded up) to Armor TN
- **Center Stance**: Visual indicator only (no mechanical effects)
- **Mutual Exclusion**: Only one stance active at a time per actor
- **Automatic Application**: Stance effects applied during data preparation
- **Status Effect Integration**: Stances use Foundry's status effect system

#### Initiative System
- **Automatic Tracking**: Initiative = Insight Rank + Reflexes + modifiers
- **Roll Modifiers**: Support for initiative roll and keep modifiers
- **Total Modifiers**: Flat bonuses to initiative total
- **Combat Integration**: Seamless integration with Foundry's combat tracker

---

### 🔮 Spellcasting System

#### Ring-Based Magic
- **Complete Spell System**: Full spell item type with automatic TN calculations
- **Ring Selection**: Spells associated with elemental rings (Air, Earth, Fire, Water, Void)
- **Multi-Ring Spells**: Support for spells usable with multiple rings
- **Mastery Levels**: Track spell mastery level for prerequisites and effects

#### Spell Casting
- **Ring Rolls**: Cast spells using ring-based rolls
- **Spell Slot Tracking**: Optional spell slot system for resource management
  - **Elemental Slots**: Separate pools for Air, Earth, Fire, Water, Void
  - **Use Spell Slot Checkbox**: Deducts spell slots automatically from the caster
  - **Slot Validation**: Prevents casting when no slots remain
  - **Chat Integration**: Updates chat to reflect slot usage
- **School & Affinity Modifiers**: Applies school rank bonuses and affinity/deficiency modifiers to casting rolls
- **Raise Effects**: Spell-specific raise options for enhanced casting effects

#### Maho Support
- **Maho Toggle**: Mark spells as Maho with appropriate warnings
- **Visual Indicators**: Maho spells clearly marked in UI
- **Special Effects**: Support for Maho-specific mechanics

#### Spell Properties
- **Keywords**: Tag spells with keywords for organization and searching
- **Range**: Track spell range (Personal, Touch, 50', etc.)
- **Area of Effect**: Note AoE dimensions and shapes
- **Duration**: Track spell duration (Instantaneous, Concentration, etc.)
- **Raises**: Document raise effects for spell enhancement

---

## 🎯 Integrated Dice Roller

Built-in L5R4e dice parser that seamlessly converts chat messages into authentic Foundry rolls with beautiful L5R styling.

### Quick Syntax Guide

| Roll Type | Syntax | Example | Description |
|-----------|--------|---------|-------------|
| Standard | `XkY` | `5k3` | Roll 5 dice, keep 3 highest |
| Custom Explosion | `XkYxZ` | `5k3x9` | Explode on 9+ instead of 10 |
| Unskilled | `uXkY` | `u4k2` | No exploding dice |
| Emphasis | `eXkY` | `e5k3` | Reroll 1s once |
| With Modifier | `XkY±A` | `5k3+2` | Add/subtract bonus |

### Foundry Integration

Works seamlessly with all Foundry roll commands:
- `/roll 6k4` - Public roll
- `/gmroll 6k4` - GM-only roll  
- `/selfroll 6k4` - Private roll
- `/blindroll 6k4` - Hidden roll
- `[[6k4]]` - Inline rolls in chat or journals

### Visual Experience

- 📊 Clear success/failure indicators
- 🎯 Automatic raise tracking and TN display

---

## ⚙️ System Settings & Configuration

### Automation Settings

#### Insight Rank Calculation
- **Default**: Enabled
- **Description**: Automatically calculates character insight rank based on total insight points
- **When Disabled**: GMs must manually set character ranks
- **Formula**: Insight Points = (Rings × 10) + (Skills × 1)

### Roll Dialog Settings (Client-Side)

#### Show Trait Roll Options
- **Default**: Enabled
- **Description**: Display modifier dialog when making trait rolls (Ring and Trait rolls)
- **When Disabled**: Rolls use default parameters without prompting

#### Show Skill Roll Options
- **Default**: Enabled
- **Description**: Display modifier dialog when making skill rolls
- **When Disabled**: Skill rolls proceed immediately with default parameters

#### Show Spell Roll Options
- **Default**: Enabled
- **Description**: Display modifier dialog when casting spells
- **When Disabled**: Spell rolls proceed immediately without prompting

#### Show Weapon Roll Options
- **Default**: Enabled
- **Description**: Display modifier dialog when making weapon attacks
- **When Disabled**: Weapon rolls proceed immediately with default parameters

### House Rules Settings

#### Little Truths Ten Dice Rule
- **Default**: Disabled
- **Description**: Enable alternate Ten Dice Rule interpretation from Little Truths
- **Effect**: When Ten Dice Rule reduces kept dice, adds a +2 bonus to compensate
- **Example**: 
  - Normal: 12k8 becomes 10k8+4
  - With LT: 12k8 becomes 10k8+6 (extra +2)

#### Allow NPC Void Points
- **Default**: Disabled
- **Description**: Controls whether NPCs can spend void points on rolls
- **When Enabled**: NPCs gain +1k1 mechanical benefits without resource deduction

#### Allow Armor Stacking
- **Default**: Disabled
- **Description**: Controls whether multiple armor pieces stack their TN bonuses
- **When Disabled**: Only highest armor TN bonus and reduction apply
- **When Enabled**: All equipped armor TN bonuses and reductions stack together

#### Default NPC Wound Mode
- **Default**: Manual
- **Description**: Determines default wound calculation mode for new NPCs
- **Options**:
  - **Manual**: NPCs use direct threshold/penalty entry
  - **Formula**: NPCs use Earth Ring-based wound calculations like PCs
- **Note**: Affects new NPC creation defaults; existing NPCs retain their individual settings

### Migration & Data Management

#### Run Migration
- **Default**: Enabled
- **Description**: Enables/disables automatic data migrations
- **When Disabled**: Migrations are skipped (use with caution)

#### Force Migration
- **Default**: Disabled
- **Description**: Forces migrations to run regardless of version
- **Use Case**: Debugging migration issues or re-running migrations after fixes
- **Note**: Automatically resets to false after migration completes

### Debug Settings (Client-Side)

#### Debug Wound Config
- **Default**: Disabled
- **Description**: Enables detailed logging for Wound Configuration Application
- **Information Logged**:
  - Form element detection and event listener attachment
  - User interaction events (change, input, click)
  - Actor update operations and success/failure status
  - Application lifecycle events (render, close)

---

## 🎯 Active Effects Reference

Active Effects allow you to modify actor and item attributes dynamically. Use these attribute keys when creating Active Effects on items like Family, School, Advantages, Disadvantages, or other sources of bonuses/penalties.

### Actor Attribute Keys

#### Core Traits

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.traits.sta` | Stamina | `3` |
| `system.traits.wil` | Willpower | `2` |
| `system.traits.str` | Strength | `4` |
| `system.traits.per` | Perception | `3` |
| `system.traits.ref` | Reflexes | `3` |
| `system.traits.awa` | Awareness | `2` |
| `system.traits.agi` | Agility | `4` |
| `system.traits.int` | Intelligence | `3` |

#### Rings

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.rings.void.rank` | Void Ring Rank | `2` |
| `system.rings.void.value` | Current Void Points | `1` |

**Note**: Elemental rings (Air, Earth, Fire, Water) are calculated automatically from trait pairs and cannot be directly modified.

#### Character Attributes

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.honor.rank` | Honor Rank | `3` |
| `system.honor.points` | Honor Points | `15` |
| `system.glory.rank` | Glory Rank | `2` |
| `system.glory.points` | Glory Points | `8` |
| `system.status.rank` | Status Rank | `1` |
| `system.status.points` | Status Points | `3` |
| `system.shadowTaint.rank` | Shadow Taint Rank | `0` |
| `system.shadowTaint.points` | Shadow Taint Points | `0` |

#### Combat & Defense

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.initiative.rollMod` | Initiative Roll Modifier | `+2` |
| `system.initiative.keepMod` | Initiative Keep Modifier | `+1` |
| `system.initiative.totalMod` | Initiative Total Modifier | `+3` |
| `system.armorTn.mod` | Armor TN Modifier | `+5` |
| `system.armor.armorTn` | Base Armor TN | `20` |
| `system.armor.reduction` | Damage Reduction | `3` |

#### Wounds & Health

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.wounds.mod` | Wound Threshold Modifier | `+10` |
| `system.woundsMultiplier` | Wound Level Multiplier | `2` |
| `system.woundsMod` | Wound Threshold Additive Modifier | `+5` |
| `system.woundsPenaltyMod` | Wound Penalty Modifier | `-2` |
| `system.suffered` | Damage Suffered | `15` |

#### Experience & Advancement

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.xp` | Experience Points | `45` |
| `system.insight.points` | Insight Points | `150` |
| `system.insight.rank` | Insight Rank | `2` |

#### Spell Casting

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.spellSlots.water` | Water Spell Slots | `3` |
| `system.spellSlots.fire` | Fire Spell Slots | `2` |
| `system.spellSlots.earth` | Earth Spell Slots | `4` |
| `system.spellSlots.air` | Air Spell Slots | `3` |
| `system.spellSlots.void` | Void Spell Slots | `1` |

#### Wealth

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.wealth.koku` | Koku | `10` |
| `system.wealth.bu` | Bu | `5` |
| `system.wealth.zeni` | Zeni | `25` |

### Item Attribute Keys

#### Skills

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.rank` | Skill Rank | `3` |
| `system.rollBonus` | Roll Dice Bonus | `+1` |
| `system.keepBonus` | Keep Dice Bonus | `+1` |
| `system.totalBonus` | Total Bonus | `+2` |
| `system.insightBonus` | Insight Bonus | `+5` |

#### Weapons

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.damageRoll` | Damage Roll Dice | `3` |
| `system.damageKeep` | Damage Keep Dice | `2` |
| `system.explodesOn` | Explosion Threshold | `9` |

#### Bows

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.str` | Bow Strength Rating | `3` |
| `system.range` | Range in feet | `250` |
| `system.damageRoll` | Damage Roll Dice | `2` |
| `system.damageKeep` | Damage Keep Dice | `2` |

#### Armor

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.bonus` | Armor TN Bonus | `+3` |
| `system.reduction` | Damage Reduction | `2` |

#### Spells

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.mastery` | Mastery Level | `3` |

#### Advantages/Disadvantages

| Attribute Key | Description | Example Value |
|---------------|-------------|---------------|
| `system.cost` | Point Cost | `5` |

**Note**: Both advantages and disadvantages store positive costs. Disadvantages grant XP in calculations (handled automatically by the system).

### Usage Examples

#### Family Trait Bonus
Create an Active Effect on a Family item:
- **Attribute Key**: `system.traits.str`
- **Change Mode**: Add
- **Effect Value**: `1`

#### School Skill Bonus
Create an Active Effect on a School item:
- **Attribute Key**: `system.rollBonus` (on embedded skill items)
- **Change Mode**: Add  
- **Effect Value**: `1`

#### Armor TN Modifier
Create an Active Effect on an Advantage item:
- **Attribute Key**: `system.armorTn.mod`
- **Change Mode**: Add
- **Effect Value**: `5`

#### Void Point Bonus
Create an Active Effect on a Technique item:
- **Attribute Key**: `system.rings.void.value`
- **Change Mode**: Add
- **Effect Value**: `1`

### Notes

- Use dot notation for nested properties (e.g., `system.traits.str`)
- Trait bonuses from Family items should use the trait keys above
- School bonuses typically affect skills or provide special abilities
- Some derived values (like elemental rings) are calculated automatically and cannot be directly modified
- Always test Active Effects to ensure they work as intended with your specific use case

---

## 🌍 Localization

Full internationalization support with complete translations:

- 🇺🇸 **English** (en)
- 🇪🇸 **Español** (es) 
- 🇫🇷 **Français** (fr)
- 🇧🇷 **Português (Brasil)** (pt-BR)
- 🇩🇪 **Deutsch** (de)
- 🇷🇺 **Русский** (ru)

*Community translations welcome! Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4).*

---

## 🔧 Recommended Modules

### Essential Companions

- **[Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice)** - Beautiful 3D dice animations that work perfectly with L5R rolls
- **[Token Action HUD](https://foundryvtt.com/packages/token-action-hud)** - Quick access to character actions and rolls

### Quality of Life Enhancements

- **[Drag Ruler](https://foundryvtt.com/packages/drag-ruler)** - Enhanced movement measurement
- **[Combat Utility Belt](https://foundryvtt.com/packages/combat-utility-belt)** - Advanced combat management tools
- **[Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal)** - Better organization for campaign notes

---

## 🛠️ Development & Contributing

### Project Architecture

```
module/
├── documents/     # Actor/Item classes with game rule logic
├── sheets/        # UI rendering with ActorSheetV2/ItemSheetV2  
├── services/      # Dice mechanics, chat rendering, utilities
├── apps/          # XP Manager, Wound Config applications
└── setup/         # Settings, templates, migrations
```

### How to Contribute

We welcome contributions! Here's how to get started:

1. **Fork** the repository on [GitHub](https://github.com/ernieayala/l5r4)
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Follow** our code style:
   - JSDoc comments for functions
   - kebab-case for file names
   - PascalCase for class names
5. **Test** thoroughly with existing worlds
6. **Submit** a pull request with a clear description

### 🐛 Bug Reports

Found an issue? Report it on [GitHub Issues](https://github.com/ernieayala/l5r4/issues) with:
- Foundry VTT version
- System version
- Steps to reproduce
- Console errors (press F12 → Console tab)
- Screenshots if applicable

---

## 🔍 Troubleshooting

### Common Issues

#### System Won't Install
- **Problem**: Can't find system in Foundry browser
- **Solution**: Use the manifest URL installation method (see [Installation](#-installation))
- **Reason**: The "l5r4" name is claimed by the previous version

#### Rolls Not Working
- **Problem**: Clicking skills/weapons doesn't roll
- **Solution**: Check browser console (F12) for errors
- **Common Causes**: Module conflicts, outdated Foundry version

#### XP Not Tracking
- **Problem**: XP purchases not appearing in XP Manager
- **Solution**: Click the "Recalculate Purchase XP" button (calculator icon) in XP Manager
- **Reason**: XP tracking may need refresh after manual data edits

#### Wound Penalties Not Applying
- **Problem**: Wound penalties not affecting rolls
- **Solution**: Ensure "Apply Wound Penalty" is checked in roll dialog
- **Note**: Wound penalties apply to target numbers, not roll results

#### Active Effects Not Working
- **Problem**: Family/School bonuses not applying
- **Solution**: 
  - Verify Active Effect attribute keys match documentation
  - Ensure effects are not disabled
  - Check effect transfer settings on items

#### Migration Issues
- **Problem**: World won't load after system update
- **Solution**: 
  - Check "Run Migration" setting is enabled
  - Try enabling "Force Migration" setting
  - Restore from backup if issues persist

### Performance Tips

- **Disable Unused Modules**: Reduce module conflicts and improve performance
- **Limit Active Effects**: Too many effects can slow data preparation
- **Use Compendiums**: Store unused items in compendiums instead of world items
- **Regular Backups**: Always backup worlds before major updates

### Getting Help

- **GitHub Discussions**: [https://github.com/ernieayala/l5r4/discussions](https://github.com/ernieayala/l5r4/discussions)
- **GitHub Issues**: [https://github.com/ernieayala/l5r4/issues](https://github.com/ernieayala/l5r4/issues)
- **Foundry Discord**: Look for L5R4 community channels

---

## 📄 License & Attribution

### Code License

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html) and complies with the [Foundry Virtual Tabletop EULA](https://foundryvtt.com/article/license/) for system development.

### Assets & Icons

All visual assets are used with proper attribution:
- **Samurai Icons**: [Freepik, shmai, photo3idea_studio, juicy_fish, Flaticon, Handicon, berkahicon, cube29](https://www.flaticon.com/free-icons/samurai)
- **Additional Icons**: [Hey Rabbit from Noun Project (CC BY 3.0)](https://thenounproject.com/browse/icons/term/samurai/)

### Legal Disclaimer

This is an **unofficial fan-made system**. Legend of the Five Rings is a trademark of Fantasy Flight Games. This system is not affiliated with, endorsed by, or sponsored by Fantasy Flight Games.

---

## 🌸 Experience Rokugan

*"In a land where honor is stronger than steel, your story awaits..."*

Ready to begin your journey in the Emerald Empire? Install the system and let the kami guide your dice! 

**Questions?** Join our community discussions on [GitHub](https://github.com/ernieayala/l5r4/discussions) or report issues on our [issue tracker](https://github.com/ernieayala/l5r4/issues).
