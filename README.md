# Legend of the Five Rings 4th Edition - Enhanced

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-2.1.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4)](https://github.com/ernieayala/l5r4/issues)

**Play Legend of the Five Rings 4th Edition in Foundry VTT with automatic character management, authentic dice mechanics, and full rule support.**

Built for Foundry VTT v13+ with modern features like automatic XP tracking, combat stance automation, and six language options.

> **⚠️ Migrating from an older version?** This system uses a new ID (`l5r4-enhanced`). See the [Migration Guide](#-migration-guide) for help transferring your data.

---

## Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start-guide)
- [Features](#-features)
- [Dice System](#-dice-system)
- [Combat & Equipment](#️-combat--equipment)
- [Spells](#-spellcasting)
- [Settings](#️-settings)
- [Active Effects](#-active-effects-guide)
- [Languages](#-languages)
- [Migration Guide](#-migration-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#️-contributing)
- [License](#-license)

---

## 🚀 Installation

### Using Manifest URL (Recommended)

1. Open Foundry VTT and go to **Game Systems**
2. Click **Install System**
3. Paste this URL:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
4. Click **Install**
5. Create a new world and select **Legend of the Five Rings 4th Edition - Enhanced**

### Manual Installation

1. Download `l5r4-enhanced.zip` from [GitHub Releases](https://github.com/ernieayala/l5r4/releases)
2. Extract to your Foundry systems folder:
   - **Windows**: `%localappdata%\FoundryVTT\Data\systems\`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/systems/`
3. Restart Foundry VTT
4. Create a new world with the system

---

## 🎯 Quick Start

### Create Your Character

1. **Create Actor** → Select "PC" → Name your character
2. **Set Traits** → Enter your eight traits (Rings calculate automatically)
3. **Add Family/School** → Drag from compendiums or create new (bonuses apply automatically)
4. **Add Skills** → Create skills, set ranks, mark school skills (XP tracks automatically)
5. **Make Rolls** → Click any skill, trait, or weapon

### How to Roll

- **Skills** - Click skill name
- **Rings** - Click ring value
- **Traits** - Ctrl+Click trait value
- **Weapons** - Click weapon name
- **Initiative** - Click initiative value

---

## 🌟 Features

### Character Management

**Player Characters**

- All L5R4e stats (traits, rings, void, insight rank)
- Automatic calculations (rings, initiative, armor TN, wounds, insight)
- Dynamic wound tracking with automatic penalties
- Complete XP tracking with automatic cost calculation
- Family and School bonuses apply automatically

**NPCs**

- Streamlined interface with essential stats
- Flexible wound system (manual or formula-based)
- Quick combat stats for fast resolution

**XP System**

- Automatic cost tracking for all advancement types
- Family and school bonuses reduce costs automatically
- Complete audit trail with timestamps
- Recalculate feature to rebuild XP history from current state

---

### 🎲 Dice System

### Roll & Keep Mechanics

- **XkY System** - Roll X dice, keep Y highest
- **Ten Dice Rule** - Automatic enforcement (excess dice become flat bonuses)
- **Exploding Dice** - Dice explode on 10 (configurable)
- **Emphasis** - Reroll 1s for emphasized skills
- **Unskilled Rolls** - Ctrl+click rings (no exploding dice)

### Roll Modifiers

- **Raises** - Declare before rolling (+5 TN each)
- **Void Points** - Spend for +1k1 bonus (deducted automatically)
- **Wound Penalties** - Applied automatically to target numbers
- **Active Effects** - Bonuses from items apply automatically
- **Custom Modifiers** - Add via roll dialog

### Combat Integration

- **Auto-Targeting** - Uses selected token's Armor TN
- **Success Evaluation** - Automatic comparison vs. TN
- **Raise Display** - Shows raises achieved on success

### Chat Dice Commands

Use L5R4e dice in chat:

- `/roll 5k3` - Standard roll
- `/roll 5k3x9` - Custom explosion on 9+
- `/roll u4k2` - Unskilled roll
- `/roll e5k3` - Emphasis roll
- `/roll 5k3+2` - Roll with bonus

---

## ⚔️ Combat & Equipment

### Weapons

- **Rollable Attacks** - Click weapon name for attack and damage rolls
- **Damage Formulas** - Proper XkY damage calculations
- **Special Properties** - Custom explosion thresholds and rules
- **Skill Detection** - Automatic skill association (Kenjutsu, Kyujutsu, etc.)

### Bows

- **Strength Rating** - Bow strength limits damage based on character Strength
- **Arrow Types** - Support for specialized arrows with damage modifiers
- **Range Tracking** - Range values stored for reference

### Armor

- **Auto TN Calculation** - Armor TN = 5×Reflexes + 5 + armor bonus + modifiers
- **Damage Reduction** - Reduction values tracked and applied
- **Stacking Rules** - Configure whether multiple armors stack (default: highest only)

### Combat Stances

- **Attack** - Visual indicator only
- **Full Attack** - +2k1 to attacks, -10 to Armor TN
- **Defense** - Add Air Ring + Defense Skill to Armor TN
- **Full Defense** - Roll Defense/Reflexes, add half (rounded up) to Armor TN
- **Center** - Visual indicator only
- **Auto Application** - Stance effects apply automatically
- **Mutual Exclusion** - Only one stance active at a time

### Initiative

- **Auto Calculation** - Insight Rank + Reflexes + modifiers
- **Combat Tracker** - Integrates with Foundry's combat tracker

---

## 🔮 Spellcasting

### Ring-Based Magic

- **Spell System** - Full spell support with automatic TN calculations
- **Ring Selection** - Spells use elemental rings (Air, Earth, Fire, Water, Void)
- **Multi-Ring Spells** - Spells can use multiple rings
- **Mastery Levels** - Track prerequisites and effects

### Casting

- **Ring Rolls** - Cast using ring-based rolls
- **Spell Slots** - Optional resource management (Air, Earth, Fire, Water, Void)
- **Auto Deduction** - Slots deducted automatically when used
- **School Modifiers** - Affinity/deficiency bonuses apply automatically
- **Raises** - Spell-specific raise options

### Maho Support

- **Maho Toggle** - Mark spells as Maho with warnings
- **Visual Indicators** - Clearly marked in UI

### Spell Properties

Track keywords, range, area of effect, duration, raises, and casting time

---

## ⚙️ Settings

### Automation

- **Insight Rank Calculation** - Auto-calculate insight rank (default: enabled)

### Roll Dialogs (Per-User)

- **Show Trait Roll Options** - Display dialog for trait rolls (default: enabled)
- **Show Skill Roll Options** - Display dialog for skill rolls (default: enabled)
- **Show Spell Roll Options** - Display dialog for spell rolls (default: enabled)
- **Show Weapon Roll Options** - Display dialog for weapon rolls (default: enabled)

### House Rules

- **Little Truths Ten Dice Rule** - Alternate Ten Dice Rule with +2 compensation (default: disabled)
- **Allow NPC Void Points** - NPCs can spend void without resource deduction (default: disabled)
- **Allow Armor Stacking** - Multiple armors stack bonuses (default: disabled, highest only)
- **Default NPC Wound Mode** - Manual or formula-based for new NPCs (default: manual)

### Migration & Debug

- **Run Migration** - Enable automatic data migrations (default: enabled)
- **Force Migration** - Force migrations to run (default: disabled)
- **Debug Wound Config** - Enable detailed logging (default: disabled)

---

## 🎯 Active Effects Guide

Active Effects let you modify character stats dynamically. Use these keys when creating effects on Family, School, Advantages, or Disadvantages.

### Actor Attribute Keys

#### Core Traits

| Attribute Key       | Description  | Example Value |
| ------------------- | ------------ | ------------- |
| `system.traits.sta` | Stamina      | `3`           |
| `system.traits.wil` | Willpower    | `2`           |
| `system.traits.str` | Strength     | `4`           |
| `system.traits.per` | Perception   | `3`           |
| `system.traits.ref` | Reflexes     | `3`           |
| `system.traits.awa` | Awareness    | `2`           |
| `system.traits.agi` | Agility      | `4`           |
| `system.traits.int` | Intelligence | `3`           |

#### Rings

| Attribute Key             | Description         | Example Value |
| ------------------------- | ------------------- | ------------- |
| `system.rings.void.rank`  | Void Ring Rank      | `2`           |
| `system.rings.void.value` | Current Void Points | `1`           |

**Note**: Elemental rings (Air, Earth, Fire, Water) are calculated automatically from trait pairs and cannot be directly modified.

#### Character Attributes

| Attribute Key               | Description         | Example Value |
| --------------------------- | ------------------- | ------------- |
| `system.honor.rank`         | Honor Rank          | `3`           |
| `system.honor.points`       | Honor Points        | `15`          |
| `system.glory.rank`         | Glory Rank          | `2`           |
| `system.glory.points`       | Glory Points        | `8`           |
| `system.status.rank`        | Status Rank         | `1`           |
| `system.status.points`      | Status Points       | `3`           |
| `system.shadowTaint.rank`   | Shadow Taint Rank   | `0`           |
| `system.shadowTaint.points` | Shadow Taint Points | `0`           |

#### Combat & Defense

| Attribute Key                | Description               | Example Value |
| ---------------------------- | ------------------------- | ------------- |
| `system.initiative.rollMod`  | Initiative Roll Modifier  | `+2`          |
| `system.initiative.keepMod`  | Initiative Keep Modifier  | `+1`          |
| `system.initiative.totalMod` | Initiative Total Modifier | `+3`          |
| `system.armorTn.mod`         | Armor TN Modifier         | `+5`          |
| `system.armor.armorTn`       | Base Armor TN             | `20`          |
| `system.armor.reduction`     | Damage Reduction          | `3`           |

#### Wounds & Health

| Attribute Key             | Description                       | Example Value |
| ------------------------- | --------------------------------- | ------------- |
| `system.wounds.mod`       | Wound Threshold Modifier          | `+10`         |
| `system.woundsMultiplier` | Wound Level Multiplier            | `2`           |
| `system.woundsMod`        | Wound Threshold Additive Modifier | `+5`          |
| `system.woundsPenaltyMod` | Wound Penalty Modifier            | `-2`          |
| `system.suffered`         | Damage Suffered                   | `15`          |

#### Experience & Advancement

| Attribute Key           | Description       | Example Value |
| ----------------------- | ----------------- | ------------- |
| `system.xp`             | Experience Points | `45`          |
| `system.insight.points` | Insight Points    | `150`         |
| `system.insight.rank`   | Insight Rank      | `2`           |

#### Spell Casting

| Attribute Key             | Description       | Example Value |
| ------------------------- | ----------------- | ------------- |
| `system.spellSlots.water` | Water Spell Slots | `3`           |
| `system.spellSlots.fire`  | Fire Spell Slots  | `2`           |
| `system.spellSlots.earth` | Earth Spell Slots | `4`           |
| `system.spellSlots.air`   | Air Spell Slots   | `3`           |
| `system.spellSlots.void`  | Void Spell Slots  | `1`           |

#### Wealth

| Attribute Key        | Description | Example Value |
| -------------------- | ----------- | ------------- |
| `system.wealth.koku` | Koku        | `10`          |
| `system.wealth.bu`   | Bu          | `5`           |
| `system.wealth.zeni` | Zeni        | `25`          |

### Item Attribute Keys

#### Skills

| Attribute Key         | Description     | Example Value |
| --------------------- | --------------- | ------------- |
| `system.rank`         | Skill Rank      | `3`           |
| `system.rollBonus`    | Roll Dice Bonus | `+1`          |
| `system.keepBonus`    | Keep Dice Bonus | `+1`          |
| `system.totalBonus`   | Total Bonus     | `+2`          |
| `system.insightBonus` | Insight Bonus   | `+5`          |

#### Weapons

| Attribute Key       | Description         | Example Value |
| ------------------- | ------------------- | ------------- |
| `system.damageRoll` | Damage Roll Dice    | `3`           |
| `system.damageKeep` | Damage Keep Dice    | `2`           |
| `system.explodesOn` | Explosion Threshold | `9`           |

#### Bows

| Attribute Key       | Description         | Example Value |
| ------------------- | ------------------- | ------------- |
| `system.str`        | Bow Strength Rating | `3`           |
| `system.range`      | Range in feet       | `250`         |
| `system.damageRoll` | Damage Roll Dice    | `2`           |
| `system.damageKeep` | Damage Keep Dice    | `2`           |

#### Armor

| Attribute Key      | Description      | Example Value |
| ------------------ | ---------------- | ------------- |
| `system.bonus`     | Armor TN Bonus   | `+3`          |
| `system.reduction` | Damage Reduction | `2`           |

#### Spells

| Attribute Key    | Description   | Example Value |
| ---------------- | ------------- | ------------- |
| `system.mastery` | Mastery Level | `3`           |

#### Advantages/Disadvantages

| Attribute Key | Description | Example Value |
| ------------- | ----------- | ------------- |
| `system.cost` | Point Cost  | `5`           |

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

## 🌍 Languages

Complete translations available:

- 🇺🇸 English
- 🇪🇸 Español
- 🇫🇷 Français
- 🇧🇷 Português (Brasil)
- 🇩🇪 Deutsch
- 🇷🇺 Русский

_Want to help translate? Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4)!_

---

## 🔧 Recommended Modules

**Essential**

- **[Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice)** - 3D dice animations for L5R rolls
- **[Token Action HUD](https://foundryvtt.com/packages/token-action-hud)** - Quick access to actions

**Quality of Life**

- **[Drag Ruler](https://foundryvtt.com/packages/drag-ruler)** - Enhanced movement
- **[Combat Utility Belt](https://foundryvtt.com/packages/combat-utility-belt)** - Combat management
- **[Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal)** - Better journals

---

## 🔄 Migration Guide

**Using an older `l5r4` version?** You'll need to migrate your data.

### Why Migration is Needed

Foundry doesn't allow changing system IDs. Since this system uses `l5r4-enhanced` instead of `l5r4`, you need to:

1. Create a new world with `l5r4-enhanced`
2. Transfer your data using our migration tool

### Migration Tool

Install the automated migration tool:

```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

**Features:**

- Automatic schema detection
- Complete backup system
- Step-by-step UI
- Preserves all actors, items, scenes, and journals

**Full Guide:** [Migration Documentation](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md)

**Quick Steps:**

1. Install migration module in both worlds
2. Export data from old world
3. Create new `l5r4-enhanced` world
4. Import data (auto-transforms to new format)
5. Verify your data

**Need Help?**

- [Troubleshooting](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#troubleshooting)
- [FAQ](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#faq)
- [Report Issues](https://github.com/ernieayala/l5r4-migrator/issues)

---

## 🔍 Troubleshooting

### Common Issues

**System Won't Install**

- Use the manifest URL installation method
- Verify you're using the correct URL for L5R4-Enhanced

**Rolls Not Working**

- Check browser console (F12) for errors
- Check for module conflicts

**XP Not Tracking**

- Click "Recalculate Purchase XP" button in XP Manager

**Wound Penalties Not Applying**

- Check "Apply Wound Penalty" in roll dialog
- Note: Penalties apply to target numbers, not roll results

**Active Effects Not Working**

- Verify attribute keys match documentation
- Ensure effects are not disabled
- Check transfer settings on items

**Migration Issues**

- Use the automated migration tool
- See [Migration Guide](#-migration-guide)

### Performance Tips

- Disable unused modules
- Limit Active Effects
- Use compendiums for storage
- Backup worlds before updates

### Getting Help

- [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)
- [GitHub Issues](https://github.com/ernieayala/l5r4/issues)
- Foundry Discord L5R4-Enhanced channels

---

## 🛠️ Contributing

Want to help improve L5R4-Enhanced?

**For Developers:** See [`DEVELOPER.md`](DEVELOPER.md) for architecture docs and guidelines.

**Report Bugs:** [GitHub Issues](https://github.com/ernieayala/l5r4/issues)

Include:

- Foundry VTT version
- System version
- Steps to reproduce
- Console errors (F12 → Console)
- Screenshots

---

## 📄 License

### Code

MIT License. See [LICENSE](LICENSE) for details.

### L5R Content

**Unofficial fan-made system.** Not affiliated with or endorsed by Fantasy Flight Games, Edge Studio, or Asmodee.

**Legend of the Five Rings** and **L5R** are trademarks of Fantasy Flight Games. All rights reserved.

**You must own the L5R 4th Edition rulebooks** to use this system. This package does not include copyrighted rulebook content.

### Foundry VTT

Created under [Foundry VTT Limited License Agreement](https://foundryvtt.com/article/license/). Foundry VTT © Foundry Gaming LLC.

### Disclaimer

Software provided "as is" without warranty. Always backup worlds before updates.

---

_"In a land where honor is stronger than steel, your story awaits..."_

Ready to experience Rokugan? Install and let the kami guide your dice!

**Questions?** [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions) | [Issues](https://github.com/ernieayala/l5r4/issues)
