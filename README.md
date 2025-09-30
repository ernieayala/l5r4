## 🙏 Acknowledgments

This system builds upon the foundational work of the original L5R 4th Edition contributors. While significantly refactored and modernized for Foundry v13+, we acknowledge and appreciate their pioneering efforts in bringing Legend of the Five Rings to Foundry VTT. Their original work for Foundry v12 and below can be found at: **https://gitlab.com/team-l5r4/l5r4**

# Legend of the Five Rings 4th Edition for Foundry VTT

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![License](https://img.shields.io/badge/License-GPL%20v3-green)](https://github.com/ernieayala/l5r4/blob/main/COPYING)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4)](https://github.com/ernieayala/l5r4/issues)

An unofficial, comprehensive implementation of the Legend of the Five Rings 4th Edition tabletop RPG for Foundry VTT. Experience the world of Rokugan with complete character management, authentic dice mechanics, and full L5R4e rule support.

## ✨ What's New in v1.0.0

This major release represents a complete architectural modernization with:

### NEW FEATURES
- **Migration System**: Automated data structure updates and schema migrations
- **XP Manager Application**: Dedicated experience point management interface with cost calculation and audit trail
- **Stance Automation Service**: Automated combat stance management with Active Effects integration
- **Active Effects Integration**: Complete Active Effects system for dynamic trait and skill modifications
- **Services Architecture**: Modular service-oriented architecture
- **ApplicationV2/DialogV2**: Modern Foundry v13+ APIs throughout the system

### ENHANCED FEATURES
- **Spell Slots**: Enhanced from basic system to improved integration with dice service and better UI
- **XP Tracking**: Evolved from simple field to complex cost calculation with automatic progression
- **Combat Stances**: Upgraded from static definitions to active automation with mutual exclusion
- **Dice System**: Completely refactored from monolithic to modular service
- **Actor System**: Comprehensive derived data and lifecycle management
- **Sheet System**: Modernized with v13+ APIs and advanced UI
- **Template System**: Reorganized hierarchically organized templates
- **Localization**: Comprehensive coverage including skill names
- **Configuration**: Modernized with ES6 modules and immutability
- **Documentation**: Enhanced with comprehensive JSDoc throughout

## Core Features

### Character Management
- **Complete PC Sheets**: Full character sheets with all L5R4e attributes, skills, advantages, disadvantages, and equipment
- **NPC Sheets**: Streamlined sheets for NPCs with essential stats and rollable attacks
- **Automatic Calculations**: Derived attributes (Initiative, Armor TN, Rings, Wound Levels) calculated automatically
- **Insight Rank Tracking**: Automatic insight rank calculation based on total insight points
- **Wound System**: Dynamic wound level tracking with penalties applied automatically
- **Experience Tracking**: Comprehensive XP system with automatic cost calculation for trait/skill advancement
- **Family/School Integration**: Active Effects system for creation bonuses and trait modifications
- **Sorting Preferences**: Per-user, per-actor item sorting with persistent preferences

### 🎲 Authentic L5R Dice System
- **Roll & Keep Mechanics**: Full implementation of the iconic XkY system
- **Ten Dice Rule**: Automatic enforcement with Little Truths variant support
- **Exploding Dice**: Configurable explosion thresholds for weapons and techniques
- **Emphasis Support**: Reroll 1s on first roll for emphasized skills
- **Unskilled Rolls**: Ctrl+click rings for unskilled rolls (especially useful for Void)
- **Raises**: Declare raises before rolling for enhanced effects (+5 TN each)
- **Void Points**: Spend Void for +1k1 bonus to rolls
- **Auto-Targeting**: Automatically sets target numbers from selected tokens' Armor TN
- **Modifier Dialogs**: Interactive roll option dialogs with customizable settings
- **Wound Penalties**: Automatic application of wound penalties to target numbers

### ⚔️ Combat & Equipment
- **Weapon Integration**: Rollable weapons with damage calculations and special properties
- **Armor System**: Automatic TN calculations with proper stacking rules
- **Stance Management**: Mutually exclusive stance status effects with automation
- **Initiative System**: Automated initiative tracking with proper modifiers
- **Combat Stances**: Full Attack (+2k1 attack, -10 Armor TN), Defense (Air+Defense to TN), Full Defense (roll for TN bonus)
- **Weapon-Skill Association**: Dynamic skill detection and attack roll calculation
- **Arrow Types**: Support for specialized arrow types with damage modifiers

### 🔮 Spellcasting System
- **Ring-Based Magic**: Complete spell system with automatic TN calculations
- **Maho Support**: Toggle for maho spells with appropriate warnings and effects
- **Multi-Ring Spells**: Support for spells usable with multiple rings
- **Raise Effects**: Spell-specific raise options for enhanced casting
 - **Spell Slots**: Optional "Use Spell Slot" checkbox deducts spell slots automatically from the caster. Prevents casting when no slots remain and updates chat to reflect slot usage
 - **Void Slots**: Supports spending and tracking Void spell slots alongside elemental slots
 - **School & Affinity Modifiers**: Applies school rank bonuses and affinity/deficiency modifiers to casting rolls

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
- 🎨 Custom L5R4e-themed roll cards
- ✨ Exploding dice animations and effects
- 📊 Clear success/failure indicators
- 🎯 Automatic raise tracking and TN display

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

## 🌍 Localization

Full internationalization support with complete translations:
- 🇺🇸 **English** (en)
- 🇪🇸 **Español** (es) 
- 🇫🇷 **Français** (fr)
- 🇧🇷 **Português (Brasil)** (pt-BR)

*Community translations welcome! Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4).*

## ⚙️ System Requirements

- **Foundry VTT**: v13.x or later
- **Architecture**: Modern Foundry v13 ActorSheetV2/ItemSheetV2 framework
- **Migration**: Automatic world data migration from previous versions

## 🔧 System Settings & Configuration

### Automation Settings
- **Stance Automation**: Toggle automatic stance effect application
- **Roll Dialog Visibility**: Control when modifier dialogs appear
- **Little Truths Ten Dice Rule**: Enable alternate Ten Dice Rule interpretation
- **Insight Rank Calculation**: Automatic vs manual insight rank management
- **Multiple Armor Stacking**: Allow multiple armor pieces for technique bonuses

### Migration & Data Management
- **Automatic Migration**: Seamless world data upgrades with safety controls
- **Schema Updates**: Field name normalization and structure improvements
- **Icon Path Management**: Organized asset structure with backward compatibility

## 🔧 Recommended Modules

### Essential Companions
- **[Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice)** - Beautiful 3D dice animations that work perfectly with L5R rolls
- **[Token Action HUD](https://foundryvtt.com/packages/token-action-hud)** - Quick access to character actions and rolls

### Quality of Life Enhancements  
- **[Drag Ruler](https://foundryvtt.com/packages/drag-ruler)** - Enhanced movement measurement
- **[Combat Utility Belt](https://foundryvtt.com/packages/combat-utility-belt)** - Advanced combat management tools
- **[Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal)** - Better organization for campaign notes

## 🔄 Migration & Upgrading

### From Previous Versions
- ✅ **Automatic Migration**: World data seamlessly upgraded on first load
- 💾 **Backup Recommended**: Always backup your world before major updates  
- 🛑 **Safety Controls**: Migration can be disabled in system settings if needed
- 🔒 **Data Preservation**: Existing characters and items remain fully functional

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
| `system.cost` | Point Cost | `5` (Both types stored as positive; disadvantages grant XP) |

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

## 🛠️ Development & Contributing

### Project Architecture
```
module/
├── documents/     # Actor/Item classes with game rule logic
├── sheets/        # UI rendering with ActorSheetV2/ItemSheetV2  
├── services/      # Dice mechanics, chat rendering, utilities
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
