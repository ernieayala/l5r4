# Legend of the Five Rings 4th Edition - Enhanced

🇺🇸 🇪🇸 🇫🇷 🇧🇷 🇩🇪 🇷🇺

A Foundry VTT system for L5R 4th Edition. Handles the Roll & Keep mechanics, character progression, combat, spellcasting, and everything else you need to run games in Rokugan.

[![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)](https://foundryvtt.com/)
[![Version 3.2.0](https://img.shields.io/badge/Version-3.2.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JB2A Ready](https://img.shields.io/badge/JB2A-Integrated-ff69b4)](https://foundryvtt.com/packages/jb2a_patreon)

**Questions?** Discord: **@erniez**

---

## Table of Contents

- [Installation](#installation)
- [What's Included](#whats-included)
  - [Core Mechanics](#core-mechanics)
  - [Combat](#combat)
  - [Equipment & Items](#equipment--items)
  - [Automation & Effects](#automation--effects)
  - [Visual Effects & Animations](#visual-effects--animations)
  - [Dialogs & Tools](#dialogs--tools)
  - [Long Rest & Healing](#long-rest--healing)
- [System Settings](#system-settings)
- [Recommended Modules](#recommended-modules)
- [Contributing](#contributing)
- [License & Legal](#license--legal)
- [Support](#support)

---

## Installation

### Fresh Install

1. Open Foundry VTT → **Game Systems** → **Install System**
2. Search for "Legend of the Five Rings 4e Enhanced" or install via manifest URL:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
3. Click **Install**
4. Create a world with the system

### Migrating from Old L5R4 System

If you're coming from the original [l5r4 system v12](https://gitlab.com/team-l5r4/l5r4) or any 1.x version, you'll need to migrate. The system ID changed from `l5r4` to `l5r4-enhanced`, which means Foundry treats it as a completely different system.

**Migration Tool:** Install this module in both your old and new worlds:
```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

**Steps:**
1. Export data from old world (the module auto-detects your schema)
2. Create new world with l5r4-enhanced
3. Import data (auto-converts to new format)
4. Check your actors, items, scenes, journals

**Problems?** See the [Migration Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md) for detailed instructions and troubleshooting.

---

## What's Included

### Core Mechanics

**Roll & Keep Dice**
- Full XkY notation with exploding 10s
- Raises (declared before rolling, +5 TN each)
- Free Raises (from advantages/techniques, reduce TN without penalty)
- Emphasis (reroll 1s once)
- Unskilled rolls (no explosions, no raises)
- Ten Dice Rule with optional Little Truths variant

**Characters**
- Eight traits that auto-calculate five rings
- Void Points with tracking
- Honor, Glory, Status, Shadow Taint
- Insight Rank (auto-calculated from skills and rings)

**XP System**
- Tracks everything: traits, skills, emphases, advantages, disadvantages, kata, kiho
- Auto-calculates costs (triangular for skills, progressive for traits)
- School skills
- Disadvantage cap (default 10 XP)
- XP Manager shows full audit trail

**Wealth**
- Koku, Bu, Zeni with proper conversion
- Calculator-style manager modal
- Add/remove by denomination
- Convert up or down between currencies

### Combat

**Initiative & Movement**
- Initiative = Insight Rank + Reflexes + modifiers
- Movement = Water Ring × 5 feet per action
- Void Point spending option on initiative rolls

**Five Stances**
- Attack (baseline)
- Full Attack (+2k1 attack, -10 Armor TN)
- Defense (+Air Ring to Armor TN, +Defense Skill if present)
- Full Defense (roll Defense+Reflexes, add half to Armor TN)
- Center

**Mounted Combat**
- Toggle mounted status via Active Effects
- +1k0 attack bonus vs unmounted opponents
- Works with all stances

**Damage & Wounds**
- One-click damage application from chat cards
- Automatic armor reduction
- Void Point reduction option (-10 damage)
- Eight wound levels with penalties
- Wound thresholds = Earth Ring × multiplier (default 2)

**Guard Maneuver**
- Guarding status (-5 Armor TN while protecting)
- Guarded status (+10 Armor TN while protected)

**Fear System**
- NPC Fear Rank (1-10) with auto TN calculation
- Resistance: Willpower + Honor Rank vs Fear TN
- Failure applies -XkY penalty via Active Effects
- Multi-target testing for controlled tokens

### Equipment & Items

**Weapons**
- Melee and ranged with associated skills
- Custom explosion thresholds
- Click to attack, rolls appear in chat with damage buttons
- Bows use strength rating + arrow types

**Armor**
- TN bonus and damage reduction
- Equipped toggle

**Skills**
- Multiple emphases per skill
- Mastery abilities at ranks 3, 5, 7
- School skill flag for XP discount
- Roll/keep/total bonuses

**Advantages, Disadvantages, Kata, Kiho**
- XP costs tracked automatically
- Active Effects for stat modifications

**Families, Schools, Clans**
- Family grants +1 trait via Active Effects

**Techniques**
- Shugenja techniques track affinity/deficiency
- All use Active Effects for bonuses

**Spells**
- Ring-based magic (Air, Earth, Fire, Water, Void)
- Mastery levels 1-9
- Optional spell slots per ring
- Memorization toggle

### Automation & Effects

**Active Effects**
- Modify any actor attribute (traits, rings, Armor TN, initiative, etc.)
- Transfer from Family, School, Advantages, Disadvantages, Techniques, Kata, Kiho
- Effects apply when items are added to characters
- See [Active Effects Guide](ACTIVE_EFFECTS.md) for full documentation

**Conditions**
- Full status effect library (Blinded, Dazed, Fatigued, Prone, Stunned, etc.)
- Condition Manager dialog for quick toggling
- Automatic penalties (Blinded reduces Water Ring for movement)

### Visual Effects & Animations

**JB2A Integration** *(requires Sequencer + JB2A modules)*
- Stance animations when entering Full Attack, Full Defense, or Center
- Attack projectiles for ranged weapons (arrows, kunai, shuriken)
- Melee weapon strike effects
- Persistent condition markers on affected tokens
- Works with both free and Patreon versions of JB2A
- Graceful degradation if modules not installed

**Setup**
1. Install [Sequencer](https://foundryvtt.com/packages/sequencer) module
2. Install [JB2A - Jules & Ben's Animated Assets](https://foundryvtt.com/packages/jb2a_patreon)
3. Animations activate automatically

### Dialogs & Tools

**XP Manager**
- View all XP gains and expenditures
- Sort by type, cost, or note
- Recalculate button rebuilds from character state
- Timestamped audit trail

**Wealth Manager**
- Calculator UI for currency management
- Add/remove by denomination
- Convert between koku/bu/zeni
- Prevents invalid operations

**Emphasis Manager**
- Purchase multiple emphases per skill
- Each emphasis costs 2 XP
- Checkbox in roll dialog to use emphasis

**Wound Config**
- Edit wound thresholds per character
- Formula or manual modes
- Active wound level count (NPCs)

**Armor Config**
- Edit armor TN and reduction
- Configure stacking rules

**Combat Config**
- Initiative modifiers
- Movement adjustments

**Condition Manager**
- Toggle all conditions from one dialog
- Visual status indicators

**NPC Attack Editor**
- Edit attack and damage values
- Action type selection

### Long Rest & Healing

**Rest Button** (on character sheets)
- Heals (Stamina × 2) + Insight Rank wounds
- Restores Void Points to Void Ring rank
- Refills all spell slots to ring values
- Removes Fatigued condition
- Chat card shows summary

---

## System Settings

**House Rules** (World)
- Little Truths Ten Dice Rule (excess dice grant +2, default: off)
- Allow Armor Stacking (default: off, highest only)

**Migration** (World)
- Auto-run migrations on version updates (default: on)
- Force migration (use with caution)

---

## Recommended Modules

**Dice Visuals**
- [Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice) - 3D dice animations for Roll & Keep

**Visual Effects** *(optional, enables combat animations)*
- [Sequencer](https://foundryvtt.com/packages/sequencer) - Animation framework
- [JB2A - Jules & Ben's Animated Assets](https://foundryvtt.com/packages/jb2a_patreon) - Visual effects library

**Development** *(for contributors)*
- [Quench](https://foundryvtt.com/packages/quench) - Integration test runner

---

## Contributing

Want to help? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Architecture guidelines
- Code standards
- Testing requirements

**Ways to Contribute:**
- Bug fixes
- Feature implementations
- Translations (6 languages supported)
- Documentation improvements

Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4).

---

## License & Legal

**System Code:** MIT License - See [LICENSE](LICENSE) for details.

**L5R Content:** This is an unofficial fan project. Not affiliated with or endorsed by Fantasy Flight Games, Edge Studio, or Asmodee. Legend of the Five Rings and L5R are trademarks of Fantasy Flight Games.

**Rulebook Required:** You need the L5R 4th Edition rulebooks to play. This system doesn't include copyrighted rulebook content.

**Foundry VTT:** Created under [Foundry VTT Limited License Agreement](https://foundryvtt.com/article/license/).

---

## Support

**Get Help:**
- Discord: **@erniez**
- [GitHub Issues](https://github.com/ernieayala/l5r4/issues) - Bug reports

**Support the Project:**
- ⭐ Star the repository
- 🐛 Report bugs
- 💬 Share feedback
- 🌐 Submit translations
- 🔧 Contribute code

---

**Links:** [Releases](https://github.com/ernieayala/l5r4/releases) | [Issues](https://github.com/ernieayala/l5r4/issues)
