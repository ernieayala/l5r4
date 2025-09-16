# Unofficial L5R 4th Edition System for Foundry VTT

![Banner](banner.webp)
[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/License-GPL%20v3-green)]()

A comprehensive implementation of the Legend of the Five Rings 4th Edition TTRPG for Foundry VTT. Features complete character sheets for PCs and NPCs, integrated dice mechanics, and full L5R4e rule support.

## Version 1.0.0 - Major System Refactor

This version introduces a complete architectural overhaul with improved code organization, Foundry v13 compatibility, and enhanced maintainability.

## Core Features

### Character Management
- **Complete PC Sheets**: Full character sheets with all L5R4e attributes, skills, advantages, disadvantages, and equipment
- **NPC Sheets**: Streamlined sheets for NPCs with essential stats and rollable attacks
- **Automatic Calculations**: Derived attributes (Initiative, Armor TN, Rings, Wound Levels) calculated automatically
- **Insight Rank Tracking**: Automatic insight rank calculation based on total insight points
- **Wound System**: Dynamic wound level tracking with penalties applied automatically

### Dice & Rolling System
- **L5R4e Dice Mechanics**: Full implementation of the Roll & Keep system (XkY)
- **Ten Dice Rule**: Automatic enforcement with Little Truths variant support
- **Exploding Dice**: Configurable explosion thresholds for weapons and techniques
- **Emphasis Support**: Reroll 1s on first roll for emphasized skills
- **Unskilled Rolls**: Ctrl+click rings for unskilled rolls (especially useful for Void)
- **Raises**: Declare raises before rolling for enhanced effects (+5 TN each)
- **Void Points**: Spend Void for +1k1 bonus to rolls

### Spellcasting
- **Complete Spell System**: Ring-based spellcasting with TN calculations
- **Maho Support**: Toggle for maho spells with appropriate warnings
- **Multi-Ring Spells**: Support for spells usable with multiple rings
- **Raise Effects**: Spell-specific raise options for enhanced casting

### Combat & Equipment
- **Weapon Integration**: Rollable weapons with damage, special properties
- **Armor System**: Automatic TN calculations with stacking options
- **Stance Management**: Mutually exclusive stance status effects
- **Initiative System**: Automated initiative with proper modifiers

## Integrated Dice Roller

Built-in L5R4e dice parser that automatically converts chat messages to proper Foundry rolls with L5R styling.

### Syntax Support
- **Standard Rolls**: `XkY` (e.g., `5k3` = roll 5 dice, keep 3)
- **Custom Explosion**: `XkYxZ` (e.g., `5k3x9` = explode on 9+)
- **Unskilled Rolls**: `uXkY` (e.g., `u4k2` = no explosions)
- **Emphasis Rolls**: `eXkY` (e.g., `e5k3` = reroll 1s once)
- **Modifiers**: Add `+A` or `-A` for bonuses (e.g., `5k3+2`)

### Roll Integration
Works with all Foundry roll commands:
- `/roll 6k4` or `/r 6k4`
- `/gmroll 6k4` (GM only)
- `/selfroll 6k4` (self only) 
- `/blindroll 6k4` (hidden)
- Inline: `Rolling [[6k4]] for initiative`
- Chat: `[[6k4]]` (auto-converted)

### Visual Features
- Custom L5R4e roll cards with clan styling
- Exploding dice animations
- Success/failure indicators
- Raise tracking and TN display

![L5R Dice Roll Example](assets/roll-l5r.gif)

## System Requirements & Compatibility

- **Foundry VTT**: v13.x (fully compatible)
- **Architecture**: Built on Foundry v13 ActorSheetV2/ItemSheetV2
- **Migration Safe**: Automatic world data migration from previous versions

## Localization

Full internationalization support with complete translations:
- **English** (en)
- **Español** (es) 
- **Français** (fr)
- **Português (Brasil)** (pt-BR)

*Community translations welcome via GitLab merge requests.* 

## Installation

### Recommended Method
Install directly through Foundry VTT's system browser:
1. Launch Foundry VTT
2. Go to "Game Systems" tab
3. Click "Install System"
4. Search for "Legend of the Five Rings 4th Edition"
5. Click "Install"

### Manual Installation
**Manifest URL**: `https://gitlab.com/team-l5r4/l5r4/-/raw/master/system.json`

### Development Installation
Clone directly to your Foundry systems directory:
```bash
cd [foundry-data-path]/systems/
git clone https://gitlab.com/team-l5r4/l5r4.git
```

## Recommended Modules

### Essential
- **[Dice So Nice!](https://gitlab.com/riccisi/foundryvtt-dice-so-nice)**: Beautiful 3D dice animations for L5R rolls

### Quality of Life
- **Token Action HUD**: Quick access to character actions
- **Drag Ruler**: Measure movement with terrain consideration
- **Combat Utility Belt**: Enhanced combat management

## Migration & Compatibility

### Upgrading from v0.9.x
- **Automatic Migration**: World data automatically migrated on first load
- **Backup Recommended**: Always backup your world before major updates
- **Kill Switch**: Migration can be disabled in system settings if issues arise
- **Backwards Compatible**: Existing characters and items remain functional


## Development & Contributing

### Architecture (v1.0.0+)
- **`module/documents/`**: Actor/Item classes with pure rule logic
- **`module/sheets/`**: UI rendering with ActorSheetV2/ItemSheetV2
- **`module/services/`**: Dice mechanics, chat rendering, game services
- **`module/setup/`**: Settings, templates, migrations
- **Separation of Concerns**: Documents handle rules, sheets handle UI
- **Migration Safe**: Robust upgrade system for world compatibility

### Contributing
Contributions welcome! Please:
1. Fork the repository on GitLab
2. Follow the established code style (JSDoc, kebab-case files, PascalCase classes)
3. Test thoroughly with existing worlds
4. Submit merge requests with clear descriptions

### Bug Reports
Report issues on [GitLab Issues](https://gitlab.com/team-l5r4/l5r4/-/issues) with:
- Foundry version
- System version  
- Steps to reproduce
- Console errors (F12)

## License & Attribution

### Code License
This work is licensed under [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html) and [Foundry Virtual Tabletop EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).

### Art & Icons
All icons and images are property of their respective owners:
- [Samurai icons by Freepik, shmai, photo3idea_studio, juicy_fish, Flaticon, Handicon, berkahicon, cube29](https://www.flaticon.com/free-icons/samurai)
- [Samurai icons by Hey Rabbit from Noun Project (CC BY 3.0)](https://thenounproject.com/browse/icons/term/samurai/)

### Original Project
This system is a major refactor of the original L5R 4th Edition system developed by the contributors at [team-l5r4 on GitLab](https://gitlab.com/team-l5r4/l5r4). While this version includes a significant overhaul, it is built upon the foundational work and features they created. We extend our gratitude for their pioneering efforts in bringing Legend of the Five Rings to Foundry VTT.

### Disclaimer
This is an unofficial fan-made system. Legend of the Five Rings is a trademark of Fantasy Flight Games. This system is not affiliated with or endorsed by Fantasy Flight Games.



