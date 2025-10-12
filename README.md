# Legend of the Five Rings 4th Edition - Enhanced

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Downloads](https://img.shields.io/github/downloads/ernieayala/l5r4/total?label=Downloads&color=brightgreen)](https://github.com/ernieayala/l5r4/releases)
[![GitHub Stars](https://img.shields.io/github/stars/ernieayala/l5r4?style=flat&label=Stars)](https://github.com/ernieayala/l5r4)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4)](https://github.com/ernieayala/l5r4/issues)

**The actively maintained L5R4 system with automatic XP tracking, combat stance automation, and modern sheet design.**

Built exclusively for Foundry VTT v13+ with ApplicationV2 architecture, comprehensive rule automation, and active development. Experience the world of Rokugan with complete character management, authentic dice mechanics, and full L5R4e rule support.

---

## ⚠️ BREAKING: New System ID - Migration Required

**This is NOT the same system as `l5r4`**. This system uses the ID `l5r4-enhanced` and requires migration from existing `l5r4` worlds.

### Critical Information

❌ **You CANNOT switch an existing world to this system** - Foundry does not allow changing system IDs

✅ **You MUST migrate your data** - Use our migration tool to transfer your world data

✅ **Your data is safe** - The migration tool creates a new world without touching your original

**Why the Name Change?**
- System ID change enables clean architectural modernization
- Separates actively maintained version from legacy implementations
- Allows independent versioning and release cycles
- Provides clear distinction for module compatibility

**Why Migrate?**
- ✅ Built for Foundry v13+ with ApplicationV2 architecture
- ✅ Automatic XP tracking with progression formulas
- ✅ Combat stance automation with Active Effects
- ✅ Modern 60+ module architecture for maintainability
- ✅ Active development and community support
- ✅ Six languages with complete localization

---

## Table of Contents

- [Migration Guide](#-migration-guide)
- [What's New - Complete System Overhaul](#-whats-new---complete-system-overhaul)
- [Installation](#-installation)
- [Quick Start Guide](#-quick-start-guide)
- [Core Features](#-core-features)
- [Integrated Dice Roller](#-integrated-dice-roller)
- [System Settings](#️-system-settings--configuration)
- [Active Effects Reference](#-active-effects-reference)
- [Localization](#-localization)
- [Recommended Modules](#-recommended-modules)
- [Development & Contributing](#️-development--contributing)
- [Troubleshooting](#-troubleshooting)
- [License & Attribution](#-license--attribution)

---

## 🔄 Migration Guide

### Understanding the System ID Change

**Why Can't I Just Switch Systems?**

Foundry VTT treats `l5r4` and `l5r4-enhanced` as completely different game systems due to their different system IDs. The engine **does not allow** changing a world's system ID - this is a core Foundry limitation, not a module restriction.

**What This Means:**
- ✅ Your existing `l5r4` world will continue to work (unchanged)
- ❌ You cannot "switch" your world to `l5r4-enhanced`
- ✅ You must **create a NEW world** and migrate your data
- ✅ The migration tool handles the export → new world → import process safely

### Automated Migration Tool (Recommended)

We've built a comprehensive migration tool that handles all the complexity:

**Installation:**
```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

**Key Features:**
- ✅ Automatic schema detection (detects Original v12/v13 vs New v13)
- ✅ Intelligent import routing (transformation vs as-is)
- ✅ Complete backup system
- ✅ Step-by-step UI with visual feedback
- ✅ Validation with detailed readiness reports
- ✅ Preserves all data: actors, items, scenes, journals, folders

**Complete Migration Instructions:**

📖 **[Full Migration Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md)**

The migration guide includes:
- Step-by-step instructions (5 phases)
- Schema detection explained
- Troubleshooting for common issues
- FAQ section
- Emergency recovery procedures

**Quick Overview:**
1. Install migration module in both worlds
2. Export data from your `l5r4` world
3. Create NEW `l5r4-enhanced` world
4. Import data (tool auto-detects schema and transforms)
5. Verify your data

### What Gets Migrated

✅ **Fully Migrated:**
- All actors (PCs and NPCs) with complete system data
- All items with embedded items and Active Effects
- Scenes with tokens, walls, lights, and other scene data
- Journal entries with full content
- Folders and organization structure
- Document permissions and ownership

⚠️ **Requires Manual Migration:**
- Compendium packs (export/import manually)
- Module-specific settings
- Macros (may need API updates)

❌ **Not Migrated:**
- Chat history
- World-level settings (reconfigure in new world)

### How Migration Works

The migration tool uses **intelligent schema detection** to automatically determine the correct import strategy:

**Schema Detection:**
- Automatically detects **Original v12/v13** (snake_case) vs **New v13** (camelCase)
- Confidence scoring ensures accurate detection
- Routes to appropriate import path:
  - **With Transform**: Converts snake_case → camelCase, adds new fields
  - **As-Is**: Preserves New v13 data exactly, no transformation

**What Gets Transformed:**
- 18+ field renames (e.g., `heal_rate` → `healRate`, `mastery_3` → `mastery3`)
- Bow items converted to weapons with `isBow` flag
- New fields added for v2.0.0 features (mounted combat, fear system, etc.)

For complete technical details, see the [Migration Tool README](https://github.com/ernieayala/l5r4-migrator#readme).

### Migration Support

**Having Issues?**
- 📖 [Troubleshooting Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#troubleshooting) - 20+ common scenarios with solutions
- 📖 [FAQ](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#faq) - Answers to frequently asked questions
- 🐛 [Report Issues](https://github.com/ernieayala/l5r4-migrator/issues)
- 💬 [Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)

### Option: Fresh Start

If you prefer to start fresh or have a small world:

1. Create a new world with **l5r4-enhanced**
2. Manually recreate characters using the enhanced features
3. Use your old world as reference

This approach lets you experience the new architecture from scratch.

---

## ✨ What's New - Complete System Overhaul

This system represents a complete architectural modernization for Foundry VTT v13+, transforming the L5R4 experience from the ground up.

### Why L5R4-Enhanced?

Unlike compatibility patches for older systems, L5R4-Enhanced is built exclusively for modern Foundry:

- 🏗️ **Modern Architecture:** ApplicationV2, DialogV2, and v13+ APIs throughout
- 🤖 **Real Automation:** XP costs, stance effects, and wound penalties calculated automatically
- 🧪 **Quality Assured:** 100% architecture compliance with zero circular dependencies
- 📱 **Actively Maintained:** Regular updates and community support
- 🌍 **Global Ready:** Six languages with complete localization

### v2.0.0 - Latest Features

#### Mounted Combat System
- **Mounted/Higher Ground Bonuses**: +1k0 to attack rolls when mounted or on higher ground
- **Stance Restrictions**: Full Attack stance requires Horsemanship 3+ when mounted
- **Visual Feedback**: Clear indicators for restricted stances in dropdown
- **Automatic Application**: Bonuses apply to both PC and NPC attack rolls
- **Combat Integration**: Works seamlessly with existing stance system

#### Enhanced Interaction System
- **Shift+Click for Chat**: Item titles require Shift+Click to post, preventing accidental posting
- **Hover Tooltips**: Keyboard hints show on interactive elements
- **Fade-In Controls**: Inline item actions appear on hover for cleaner interface
- **Visual Feedback**: Interactive elements have clear hover animations and scaling

#### Icon System Migration
- **WebP Format**: All system icons migrated from PNG to WebP (60% file size reduction)
- **Automatic Token Migration**: Actor prototype token images update with icon migration
- **Bow Icon Fix**: Special migration logic corrects bow weapons with incorrect icons
- **Enhanced FilePicker**: Improved compatibility for Foundry v13+

#### Full Defense Improvements
- **3D Dice Integration**: Full Defense roll chat cards now show actual dice roll
- **Improved Rendering**: Better HTML structure for roll displays
- **Visual Consistency**: Matches other roll types in chat

### Core System Features

#### Modern Foundation (v1.0.0+)
- **ApplicationV2/DialogV2**: Complete rewrite using Foundry v13+ modern APIs
- **Migration System**: Automated data structure updates and schema migrations
- **Services Architecture**: Modular service-oriented design (dice, chat, stance, mounted combat)
- **Setup System**: Organized initialization with preload templates and centralized settings
- **60+ Module Architecture**: Complete refactoring from 4 monolithic files into focused modules

#### XP Manager Application
- **Dedicated Interface**: Full-featured XP management window with ApplicationV2
- **Automatic Tracking**: Comprehensive XP breakdown by category (traits, void, skills, advantages, disadvantages, kata, kiho)
- **Cost Calculation**: Automatic L5R4 progression formulas with family/school bonuses
- **Audit Trail**: Complete purchase history with timestamps and descriptions
- **Retroactive Calculation**: Rebuild XP history from current character state
- **Manual Refresh**: "Recalculate Purchase XP" button for on-demand updates

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

### System Evolution Highlights

Key improvements from previous implementations:

**Dice System**: 1,343-line monolithic file → 18 focused modules with improved Ten Dice Rule and DialogV2 integration

**XP Tracking**: Manual calculation → Automatic progression with triangular costs, family bonuses, and complete audit trail

**Combat Stances**: Static definitions → Active automation with mutual exclusion and real-time bonus application

**Spell Slots**: Basic checkboxes → Integrated resource management with validation and automatic deduction

**Sheet System**: Basic ActorSheet → Modern BaseActorSheet with ApplicationV2, event delegation, and persistent sorting

**Localization**: Basic UI text → Complete coverage in 6 languages including skill names and error messages

**Architecture**: 4 monolithic files (3,016 lines) → 60+ focused modules organized by domain

---

## 🚀 Installation

### Recommended: Manifest URL Installation
The easiest way to install and receive automatic updates:

1. **Open** Foundry VTT and navigate to the **Game Systems** tab
2. Click **"Install System"** at the bottom
3. **Paste** this manifest URL into the **Manifest URL** field:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
4. Click **"Install"**
5. **Create** a new world and select "Legend of the Five Rings 4th Edition - Enhanced" as the game system

> **✨ Benefits:**
> - Automatic update notifications when new versions are released
> - One-click updates through Foundry's interface
> - No manual file management required

### Alternative: Manual Installation
If you prefer to install manually or need a specific version:

1. **Download** the latest release:
   - Go to [GitHub Releases](https://github.com/ernieayala/l5r4/releases)
   - Download `l5r4-enhanced.zip` from the latest release

2. **Extract** the ZIP file contents

3. **Copy** the `l5r4-enhanced` folder to your Foundry systems directory:
   - **Windows**: `%localappdata%\FoundryVTT\Data\systems\`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/systems/`

4. **Restart** Foundry VTT

5. **Create** a new world and select "Legend of the Five Rings 4th Edition - Enhanced" as the game system

> **⚠️ Important:** Always backup your worlds before installing or updating systems

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

#### Chat Dice Roller

Built-in L5R4e dice parser for chat commands:

**Quick Syntax:**
- `XkY` - Standard roll (e.g., `5k3` = roll 5 dice, keep 3 highest)
- `XkYxZ` - Custom explosion (e.g., `5k3x9` = explode on 9+)
- `uXkY` - Unskilled (e.g., `u4k2` = no exploding dice)
- `eXkY` - Emphasis (e.g., `e5k3` = reroll 1s once)
- `XkY±A` - With modifier (e.g., `5k3+2` = add bonus)

**Foundry Commands:**
- `/roll 6k4` - Public roll
- `/gmroll 6k4` - GM-only roll
- `/selfroll 6k4` - Private roll
- `[[6k4]]` - Inline rolls in chat or journals

---

### ⚔️ Combat & Equipment

#### Weapon System
- **Rollable Weapons**: Click weapon names to make attack rolls with automatic damage calculation
- **Damage Calculations**: Weapon damage rolls with proper XkY formulas
- **Special Properties**: Custom explosion thresholds, size categories, and special rules
- **Skill Association**: Dynamic skill detection for attack rolls (Kenjutsu, Kyujutsu, etc.)
- **Fallback Traits**: Configurable fallback traits when associated skill is missing

#### Bow System
- **Integrated Bows**: Bows are weapons with `isBow` flag
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
- **Casting Time**: Track spell casting time (Instantaneous, 1 Action, 1 Minute, etc.)

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

Interested in contributing to L5R4-Enhanced? We welcome pull requests and bug reports!

**For developers**: See [`DEVELOPER.md`](DEVELOPER.md) for:
- Complete architecture documentation
- Layer separation guidelines
- Testing and quality standards
- Code style guidelines
- Contribution workflow

**Architecture Status**: ✅ **100% Compliant** (Zero circular dependencies, zero boundary violations)

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
{{ ... }}
#### System Won't Install
- **Problem**: Installation fails or system doesn't appear
- **Solution**: Use the manifest URL installation method (see [Installation](#-installation))
- **Check**: Ensure you're using the correct manifest URL for L5R4-Enhanced

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
- **Problem**: World won't load after system change
- **Solution**: 
  - Restore from backup
  - Use the automated migration tool
  - Check migration documentation

### Performance Tips

- **Disable Unused Modules**: Reduce module conflicts and improve performance
- **Limit Active Effects**: Too many effects can slow data preparation
- **Use Compendiums**: Store unused items in compendiums instead of world items
- **Regular Backups**: Always backup worlds before major updates

### Getting Help

- **GitHub Discussions**: [https://github.com/ernieayala/l5r4/discussions](https://github.com/ernieayala/l5r4/discussions)
- **GitHub Issues**: [https://github.com/ernieayala/l5r4/issues](https://github.com/ernieayala/l5r4/issues)
- **Foundry Discord**: Look for L5R4-Enhanced community channels

---

## 📄 License & Attribution

### Code License

This project is licensed under the [MIT License](LICENSE).

### Legend of the Five Rings Intellectual Property

This is an **unofficial, fan-made system implementation**.

**Legend of the Five Rings**, **L5R**, **Rokugan**, and all associated names, characters, locations, artwork, game mechanics, rules, and other intellectual property are trademarks and copyrights of **Fantasy Flight Games**, **Edge Studio**, and/or **Asmodee**. All rights reserved.

This system is **NOT** affiliated with, endorsed by, or sponsored by Fantasy Flight Games, Edge Studio, Asmodee, or any of their subsidiaries or affiliates.

**You must own the Legend of the Five Rings 4th Edition rulebooks to use this system effectively.** This software package does not include copyrighted game content from the L5R rulebooks.

### Visual Assets & Attribution

All visual assets are used with proper attribution:

- **Samurai Icons**: [Freepik, shmai, photo3idea_studio, juicy_fish, Flaticon, Handicon, berkahicon, cube29](https://www.flaticon.com/free-icons/samurai) (Flaticon License)
- **Additional Icons**: [Hey Rabbit from Noun Project](https://thenounproject.com/browse/icons/term/samurai/) (CC BY 3.0)

### Foundry Virtual Tabletop

This system was created under the terms of the [Foundry Virtual Tabletop Limited License Agreement](https://foundryvtt.com/article/license/) for package development. Foundry VTT and all related properties are copyright © Foundry Gaming LLC.

### Project History

This system is an independent implementation developed specifically for Foundry VTT v13+. While L5R4 implementations have existed for earlier Foundry versions, this is a ground-up rewrite with modern architecture and comprehensive automation.

### Disclaimer

This software is provided "as is" without warranty of any kind. The authors make no warranties about fitness for any particular purpose and are not liable for any damages arising from use of this software. Always backup your worlds before installing or updating systems.

---

## 🌸 Experience Rokugan

*"In a land where honor is stronger than steel, your story awaits..."*

Ready to begin your journey in the Emerald Empire? Install the system and let the kami guide your dice! 

**Questions?** Join our community discussions on [GitHub](https://github.com/ernieayala/l5r4/discussions) or report issues on our [issue tracker](https://github.com/ernieayala/l5r4/issues).

---

## 🙏 Acknowledgments

Previous L5R4 implementations for Foundry VTT v12 and below exist at various repositories. This v1.0+ version is an independent ground-up implementation for Foundry v13+.