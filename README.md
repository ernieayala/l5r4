# Legend of the Five Rings 4th Edition - Enhanced

🇺🇸 🇪🇸 🇫🇷 🇧🇷 🇩🇪 🇷🇺

A Foundry VTT system for Legend of the Five Rings 4th Edition. It does the Roll & Keep math, tracks Wounds, Void Points, XP, and spell slots, and applies stances and conditions. You and your GM keep the choices the rules give you.

[![Foundry v14](https://img.shields.io/badge/Foundry-v14-informational)](https://foundryvtt.com/) [![Version 4.0.0](https://img.shields.io/badge/Version-4.0.0-blue)](https://github.com/ernieayala/l5r4/releases) [![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![JB2A Ready](https://img.shields.io/badge/JB2A-Integrated-ff69b4)](https://foundryvtt.com/packages/jb2a_patreon)

**Questions?** Discord: **@erniez**

---

## Table of Contents

- [Installation](#installation)
- [What's Included](#whats-included)
  - [Core Mechanics](#core-mechanics)
  - [Combat](#combat)
  - [Equipment & Items](#equipment--items)
  - [Rules & Effects](#rules--effects)
  - [Visual Effects & Animations](#visual-effects--animations)
  - [Dialogs & Tools](#dialogs--tools)
  - [Table Tools](#table-tools)
  - [Compendium Packs](#compendium-packs)
  - [Long Rest & Healing](#long-rest--healing)
- [System Settings](#system-settings)
- [Recommended Modules](#recommended-modules)
- [Contributing](#contributing)
- [License & Legal](#license--legal)
- [Support](#support)

---

## Installation

**Requires Foundry VTT 14 (14.370 or later).** On Foundry 13, install version 3.2.1 from its manifest URL:

```
https://github.com/ernieayala/l5r4/releases/download/v3.2.1/system.json
```

### Upgrading from 3.2.1

1. Back up your world, then update Foundry to 14.370 or later and the system to 4.0.0
2. Unlock the world compendiums of Actors and Items you want converted
3. Open the world as a GM: the system converts the world's data once, on that first load
4. Check XP totals, Insight Rank, and NPC Wounds and Initiative. 4.0.0 calculates them by the book, so the numbers can change

The [Changelog](CHANGELOG.MD) lists what the upgrade converts and what changed.

### Fresh Install

1. In Foundry VTT, open **Game Systems** → **Install System**
2. Search for "Legend of the Five Rings 4e Enhanced", or paste the manifest URL:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
3. Click **Install**
4. Create a world with the system

### Migrating from the Old L5R4 System

If you come from the original [l5r4 system v12](https://gitlab.com/team-l5r4/l5r4) or a 1.x version, you need the migrator module. The system ID changed from `l5r4` to `l5r4-enhanced`, so Foundry treats the two as different systems.

**Migration Tool:** install this module in your old world and your new one:

```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

**Steps:**

1. Export the old world's data (the module detects its schema)
2. Create a new world with l5r4-enhanced
3. Import the data; the module converts it
4. Check your actors, items, scenes, and journals

**Problems?** See the [Migration Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md) for each step and its troubleshooting.

---

## What's Included

### Core Mechanics

**Roll & Keep Dice**

- XkY rolls: roll X dice and keep the Y highest; a 10 rolls again and adds to its die
- Raises: +5 TN each, up to your Void Ring
- Free Raises from Skills, Techniques, and Advantages, each lowering the TN by 5
- Emphases re-roll 1s once
- Unskilled rolls: no exploding dice, no Raises
- Ten Dice Rule, with the optional Little Truths variant

**Roll Dialog**

- Skill, Trait, Ring, spell, attack, damage, and Initiative rolls share one dialog
- It lists each modifier with its source and a box to leave it off
- Choose Raises, Free Raises, a Void Point (+1k1), an Emphasis, and situational modifiers before you roll
- An attack starts at its target's Armor TN
- Shift-click a roll to skip the dialog and take the defaults
- Right-click a roll in chat for a Contested Roll or "Re-roll, keep the better"

**Characters**

- Eight Traits; each Ring but Void is the lower of its two Traits
- Void Points up to your Void Ring
- Honor, Glory, Status, and Shadowlands Taint
- Insight Rank calculated from your Rings and Skill ranks, or typed in by the GM

**XP**

- Prices Traits, the Void Ring, Skills, Emphases, Advantages, kata, kiho, and memorized spells as the book does
- Family and School bonuses count as free ranks
- Disadvantages give up to 10 XP; the GM sets the cap
- The XP Manager lists each gain and purchase with its date

**Ledger & Taint**

- The Ledger records each Honor, Glory, Status, and Taint change with its reason
- Taint penalties apply at Taint Ranks 3 and 4; Embracing the Taint is a choice in the roll dialog
- Lost characters add their Taint Rank to physical Trait rolls and have no Void Points

**Wealth**

- Koku, bu, and zeni, with conversion between them
- A calculator-style Wealth Manager: add or remove by denomination, convert up or down

### Combat

**Initiative & Movement**

- Initiative rolls (Insight Rank + Reflexes)k(Reflexes), plus modifiers; an NPC with no stored pool counts as Insight Rank 1
- A Void Point gives +10 to one Initiative roll
- Movement: Water Ring × 5 feet on a Free Action, × 10 on a Simple Action, × 20 at most

**Five Stances**

- Attack
- Full Attack: +2k1 on melee attacks, -10 Armor TN
- Defense: Armor TN + Air Ring + Defense rank
- Full Defense: roll Defense / Reflexes at each Turn start; half the total, rounded up, adds to Armor TN
- Center: next Round, +10 Initiative and +1k1 plus your Void Ring on one roll you choose

**Maneuvers & Duels**

- Spend Raises on Called Shot, Disarm, Extra Attack, Feint, Increased Damage, and Knockdown
- Guard from the token controls: Guarding gives -5 Armor TN, Guarded +10
- Iaijutsu duels and grapples run as chat-card flows

**Mounted Combat**

- Toggle Mounted from the token's status menu or the Condition Manager
- +1k0 on attacks against unmounted targets
- The sheet warns before Full Attack while mounted, unless you have Horsemanship 3

**Damage & Wounds**

- The attack card rolls damage from the weapon, Strength, arrow, and Raises, and applies it to the target after Reduction
- "Reduce with Void" takes 10 Wounds off; Undo reverses the damage
- Eight Wound Ranks; each one past Healthy adds its penalty to your TNs
- Healthy holds Earth × 5 Wounds; the later ranks use the campaign's multiplier (×2 by default)
- Invulnerable and Spirit creatures take damage by their own rules

**Fear**

- NPCs carry a Fear Rank
- Resist with a Willpower roll plus Honor Rank against TN 5 + 5 × Fear Rank
- Failing gives Feared: -Xk0 on every roll until the encounter ends
- Test several controlled tokens at once

### Equipment & Items

**Weapons**

- Melee, ranged, and thrown weapons, each with its Skill
- Custom explosion thresholds
- Click a weapon to attack; its chat card carries the damage button
- Bows use their Strength rating and arrow type, with a minimum Strength, mounted and on-foot TNs, and shots into melee

**Armor**

- Armor TN bonus and Reduction while worn
- Equipped toggle

**Skills**

- Several Emphases per Skill
- Mastery Abilities apply once the rank reaches them, where the system can automate them
- School Skills
- Roll, keep, and total bonuses

**Advantages, Disadvantages, Kata, Kiho, Tattoos**

- XP costs tracked, Clan discounts included
- Advantages and Disadvantages ask their choices when added and check the book's limits (one Ancestor, matched sets, Large or Small)
- Kata, kiho, and tattoos work while you activate them with the play button on the sheet: one kata and one tattoo at a time, one kiho of each type but Martial

**Clans, Families, Schools**

- A Family or School gives its Trait bonus as a free rank
- A School grants its Skills and each Technique as its School Rank arrives; a shugenja School also gives Sense, Commune, and Summon
- Dropping a second School asks whether to replace the first or add it beside it

**Spells**

- Spell Casting Rolls: Ring + School Rank, keep Ring, against TN 5 + 5 × Mastery Level
- Affinity and Deficiency move the School Rank by 1
- Casting above your School Rank needs the GM's leave
- Optional spell slots per Ring, and a memorization toggle
- Concentration asks for a Willpower roll after a heavy hit

### Rules & Effects

**Rules**

- Items and Active Effects carry rules (`system.rules`): Trait bonuses, roll modifiers, Armor TN, Reduction, Free Raises, conditions, choices, granted items, and XP prices
- Edit them on an item's Rules tab, as forms or as JSON
- The [Rules and Active Effects Guide](ACTIVE_EFFECTS.md) covers each rule key

**Conditions & Durations**

- Stances and conditions are status effects that carry their rules: Blinded, Dazed, Fatigued, Prone, Stunned, and the rest
- Effects end at the start or end of a Turn, a Round end, the end of a combat or encounter, or a game time; the system then deletes them
- Dazed and Stunned roll their saves in the Reactions stage
- The Condition Manager toggles them from one window

### Visual Effects & Animations

**JB2A Integration** _(requires the Sequencer and JB2A modules)_

- Stance animations for Full Attack, Full Defense, and Center
- Projectiles for ranged attacks, strike effects for melee
- Condition markers on affected tokens
- Works with the free and the Patreon JB2A collections
- Without the modules, the system runs with no animations

**Setup**

1. Install the [Sequencer](https://foundryvtt.com/packages/sequencer) module
2. Install [JB2A - Jules & Ben's Animated Assets](https://foundryvtt.com/packages/jb2a_patreon)
3. Activate both in your world; the animations play from then on

### Dialogs & Tools

**XP Manager**

- Each XP gain and purchase, with its date
- Sort by type, cost, or note
- A Recalculate button rebuilds the totals from the character

**Wealth Manager**

- Calculator layout for koku, bu, and zeni
- Add or remove by denomination
- Convert between denominations
- Refuses a change that would leave you short

**Emphasis Manager**

- Buy several Emphases per Skill, at 2 XP each
- Choose a trained Emphasis in the roll dialog to re-roll 1s

**Wound Config**

- Edit Wound thresholds per character
- Formula or manual modes
- NPCs set how many Wound Ranks they use

**Armor Config**

- Edit Armor TN and Reduction
- Choose whether armor stacks

**Combat Config**

- Initiative modifiers
- Movement multiplier and modifier

**Condition Manager**

- Toggle each condition from one window
- Shows which conditions are on

**NPC Attack Editor**

- Edit attack and damage values
- Choose the action type

### Table Tools

**Text links** (in journals, item descriptions, and chat)

- `@Check[skill=Kenjutsu|trait=agi|tn=20]`, `@Check[trait=ref]`, `@Check[ring=water|tn=15]`: opens the roll dialog for your selected token or character, filled in and still editable
- `@Damage[3k2]`: rolls damage you apply to the selected tokens
- `@Condition[dazed]`: applies a condition to the targeted tokens (else the selected ones)
- `@Fear[2]`: a Fear test for the targeted tokens (else the selected ones)
- Add `{label}` for your own text, as in `@Check[trait=ref]{Dodge}`; a link with a mistake shows what is wrong
- The GM's Check links have a second button that posts a request card: each player rolls it with their own character

**Effect panel** (the hourglass in the token controls)

- The selected token's effects, or your character's: icon, source, and how long each lasts
- Open an effect's source, or remove an effect you own

**Hotbar macros**

- Drag a Skill, weapon, spell, kata, kiho, Trait, or Ring from a sheet to the hotbar to roll it from there

**Floating numbers**

- Changes to Wounds and Void Points float over the token, as "+7 Wounds" or "−1 Void Points"

### Compendium Packs

**Packs** (in the "L5R4 Core Rulebook" compendium folder)

- Clans, Families, Schools (Advanced Schools included), Techniques (Alternate and Ronin Paths included), Skills, Advantages (Ancestors included), Disadvantages, Spells (maho included), Kata, Kiho, Tattoos, Weapons, Armor, and Equipment from the Core Rulebook, poisons included
- Creatures (GM only): the book's animals and monsters as NPCs with their attacks, Wound levels, Fear, Taint, Skills, and special abilities such as Invulnerability, Spirit, Swift, and jade-limited Reduction
- Each entry carries the book's numbers and its page ("Core Rulebook p.204"). The packs leave out the book's text, so keep your copy handy
- An entry's sheet and chat card list what its rules do; a mechanic the system does not automate gets a one-line summary

**Compendium Browser** (the Browse button in the Compendium sidebar)

- The system and world compendiums you can see, in tabs, with filters and a name search
- Drag an entry to a sheet, or click Add to give it to your selected token or your character; prerequisites and choices come up as for a drop
- The GM imports creatures with Import

### Long Rest & Healing

**Rest Button** (on character sheets)

- Heals (Stamina × 2) + Insight Rank Wounds
- Restores Void Points to your Void Ring, unless you are Fasting
- Refills your spell slots
- Removes Fatigued
- Posts a chat card with the result

---

## System Settings

**House Rules** (World)

- Apply Little Truths exception: a pool the Ten Dice Rule converted gets +2 (default: off)
- Optional rule: Honor Roll (default: off); the GM starts each session with the New session token control

Each character sets armor stacking in its Armor Config window (default: off, highest armor only).

**Display** (Client)

- Floating Wound and Void numbers over tokens (default: on)

**Migration** (World)

- Run migrations on startup (default: on)
- Force migration on startup: reruns every migration on the next load, then turns itself off

---

## Recommended Modules

**Dice Visuals**

- [Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice): 3D dice for Roll & Keep

**Visual Effects** _(optional, for combat animations)_

- [Sequencer](https://foundryvtt.com/packages/sequencer): animation framework
- [JB2A - Jules & Ben's Animated Assets](https://foundryvtt.com/packages/jb2a_patreon): visual effects library

**Development** _(for contributors)_

- [Quench](https://foundryvtt.com/packages/quench): integration test runner

---

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) covers:

- Development setup
- Architecture guidelines
- Code standards
- Testing requirements

**Ways to Contribute:**

- Bug fixes
- Features
- Translations (6 languages)
- Documentation

Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4).

---

## License & Legal

**System Code:** MIT License. See [LICENSE](LICENSE).

**L5R Content:** This is an unofficial fan project, not affiliated with or endorsed by Fantasy Flight Games, Edge Studio, or Asmodee. Legend of the Five Rings and L5R are trademarks of Fantasy Flight Games.

**Rulebook Required:** You need the L5R 4th Edition rulebooks to play. This system ships no rulebook text.

**Foundry VTT:** Made under the [Foundry VTT Limited License Agreement](https://foundryvtt.com/article/license/).

---

## Support

**Get Help:**

- Discord: **@erniez**
- [GitHub Issues](https://github.com/ernieayala/l5r4/issues): bug reports

**Support the Project:**

- ⭐ Star the repository
- 🐛 Report bugs
- 💬 Share feedback
- 🌐 Submit translations
- 🔧 Contribute code

---

**Links:** [Releases](https://github.com/ernieayala/l5r4/releases) | [Issues](https://github.com/ernieayala/l5r4/issues)
