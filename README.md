# Legend of the Five Rings 4th Edition - Enhanced

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-3.0.0-blue)](https://github.com/ernieayala/l5r4/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4)](https://github.com/ernieayala/l5r4/issues)

Complete Legend of the Five Rings 4th Edition implementation for Foundry VTT v13+. Authentic Roll & Keep mechanics with raises and free raises, automated character management, one-click damage application with armor reduction, XP tracking, combat stances, mounted combat, fear system, spell casting, and comprehensive L5R4 rule support.

---

## ⚠️ Migration Required for Existing Users

**Moving from [https://gitlab.com/team-l5r4/l5r4](https://gitlab.com/team-l5r4/l5r4) or version 1.x?** You must migrate your data.

This system uses ID `l5r4-enhanced` instead of `l5r4`. Foundry doesn't allow system ID changes, so worlds using the old system cannot directly upgrade.

### Migration Tool (Automated)

Install the migration module in both old and new worlds:

```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

**Process:**
1. Export data from old world (automatic schema detection)
2. Create new world with `l5r4-enhanced` system
3. Import data (auto-transforms to new format)
4. Verify actors, items, scenes, journals

**Full Migration Guide:** [GitHub Migration Documentation](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md)

**Need Help?**
- [Troubleshooting Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#troubleshooting)
- [Migration FAQ](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md#faq)
- [Report Issues](https://github.com/ernieayala/l5r4-migrator/issues)

---

## Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Character Management](#-character-management)
- [XP System](#-xp-system)
- [Dice System](#-dice-system)
- [Combat System](#️-combat-system)
- [Equipment](#️-equipment)
- [Spellcasting](#-spellcasting)
- [Long Rest & Healing](#-long-rest--healing)
- [Item Types](#-item-types)
- [Active Effects](#-active-effects)
- [Settings](#️-settings)
- [Languages](#-languages)
- [Recommended Modules](#-recommended-modules)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#️-contributing)
- [License](#-license)
- [Support This Project](#-support-this-project)

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

1. Download `l5r4.zip` from [GitHub Releases](https://github.com/ernieayala/l5r4/releases)
2. Extract to your Foundry systems folder:
   - **Windows**: `%localappdata%\FoundryVTT\Data\systems\`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/systems/`
3. Restart Foundry VTT
4. Create a new world with the system

---

## 🎯 Quick Start

1. **Create Actor** → Select "PC" or "NPC"
2. **Set Traits** → Enter eight traits (rings calculate automatically)
3. **Add Family/School** → Drag from compendiums (bonuses apply via Active Effects)
4. **Add Skills** → Create skills, set ranks (XP auto-calculates)
5. **Roll** → Click skills, traits, rings, weapons, initiative

---

## 👤 Character Management

### Player Characters

**Core Stats**
- Eight Traits (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
- Five Rings (Earth, Air, Fire, Water, Void) - auto-calculated from trait pairs
- Void Points with maximum tracking
- Honor, Glory, Status with ranks and points
- Shadow Taint tracking
- Insight Rank (auto-calculated or manual)
- Wealth (Koku, Bu, Zeni)

**Automatic Calculations**
- Rings derive from lowest trait pair (Earth = min(Stamina, Willpower))
- Initiative = Insight Rank + Reflexes + modifiers
- Armor TN = (Reflexes × 5) + 5 + armor bonus + modifiers
- Wound levels based on Earth Ring × multiplier (default 2)
- Insight Rank from total Insight Points (skills × 1, rings × 10)

**Character Sheet Features**
- Collapsible sections with per-user state persistence
- Drag-drop item management
- Item sorting (name, rank, type) with per-actor preferences
- Shift+Click items to post to chat
- Inline editing for all stats
- Combat stance selector
- Rest button for long rest healing

### NPCs

**Streamlined Interface**
- Essential combat stats (Initiative, Attacks, Damage, Armor TN)
- Two attack slots with independent roll/keep values
- Fear Rank with automatic TN calculation
- Simplified or formula-based wound tracking
- Configure active wound levels (1-8 levels)

**Wound Modes**
- **Manual**: Set wound thresholds directly per level
- **Formula**: Auto-calculate from Earth Ring like PCs

**Fear System**
- Fear Rank 1-10 on NPC sheet
- Automatic TN = 5 + (Fear Rank × 5)
- Fear test button targets all controlled tokens
- Test results post to chat with penalties applied

---

## 📊 XP System

### Automatic XP Tracking

**Manual XP** (GM Awards)
- Add XP entries with notes and amounts
- Timestamped audit trail
- Positive or negative adjustments

**Spent XP** (Auto-Calculated)
- Traits: 4 × new rank (Void: 6 × new rank)
- Skills: Triangular cost (Rank 1 = 1 XP, Rank 2 = 2 XP, etc.)
- New skills: 1 XP to acquire
- Emphases: 2 XP each
- Advantages/Disadvantages: Variable cost (disadvantages grant XP, max 10 total)
- Kata/Kiho: Variable cost by mastery level

**Family & School Bonuses**
- Family trait bonuses reduce starting trait cost
- School skills cost half (rounded up)
- Bonuses apply automatically via Active Effects

**XP Manager Application**
- View all XP gains and expenditures
- Sort by type, cost, or note
- Recalculate button rebuilds spent XP from character state
- Disadvantage cap configuration (default: 10 XP max)
- Complete purchase history

**Retroactive Recalculation**
- System detects character changes via content hash
- Auto-rebuilds XP history from current state
- Ensures XP costs always match actual progression

---

## 🎲 Dice System

### Roll & Keep Mechanics

**Core System**
- **XkY notation**: Roll X dice, keep Y highest
- **Exploding Dice**: Dice showing 10 explode (roll again and add)
- **Ten Dice Rule**: Roll maximum 10 dice (excess become +2 per die)
- **Little Truths variant** (optional): Excess dice add +2 instead of penalty

**Roll Types**
- **Standard Roll**: Normal XkY with explosions
- **Unskilled Roll**: No explosions on 10s
- **Emphasis Roll**: Reroll all 1s once
- **Custom Explosion**: Configure explosion threshold per weapon

### Roll Modifiers

**Automatic Modifiers**
- Active Effects from Family, School, Advantages, Disadvantages
- Weapon properties (explosion thresholds, damage bonuses)
- Stance effects (Full Attack: +2k1, Defense: +Air Ring to TN)
- Wound penalties (applied to TN, not roll)
- Mounted combat bonuses (+1k0 vs unmounted)
- Free Raises from items, advantages, techniques (reduce TN by 5 each)

**Player-Declared Modifiers**
- **Raises**: +5 TN each, declared before rolling (maximum = Void Ring rank)
- **Free Raises**: Reduce TN by 5 each without increasing difficulty (no Void Ring limit)
- **Void Points**: +1k1 to roll (auto-deducted from character)
- **Custom Bonus**: Free-form modifier in roll dialog
- **Circumstance**: Situational bonuses (lighting, terrain, etc.)

**Raise Mechanics**
- Declared raises increase TN by 5 per raise
- Maximum raises = character's Void Ring rank
- Unskilled rolls cannot declare raises
- Free Raises provide raise benefits without TN increase
- Free Raises don't count toward Void Ring maximum
- Affinity grants 1 free raise for spell casting
- TN cannot go below 0 (floor enforced)

### Roll Dialogs

**Skill Rolls**
- Display skill rank + trait + bonuses
- Emphasis checkbox (reroll 1s)
- Raise declaration input (validated against Void Ring)
- Free Raises display (calculated from items/effects)
- Void Point spending
- Custom modifiers
- Target number input

**Trait/Ring Rolls**
- Raw trait tests
- Ring checks for spells, conditions
- Raise declaration support
- Free Raises display
- Unskilled option available in roll dialog

**Weapon Rolls**
- Attack roll (skill + trait vs Armor TN)
- Damage roll (automatic after hit)
- Target selection (uses token's Armor TN)
- Raise declaration for special effects
- Free Raises from advantages/techniques
- Interactive damage application buttons in chat

### Combat Integration

**Targeting**
- Auto-detects selected token's Armor TN
- Compares roll total vs TN
- Calculates raises achieved (every 5 over TN)
- Success/failure displayed in chat

**Roll Results**
- Dice visuals (3D with Dice So Nice! module)
- Formula breakdown
- Total vs TN comparison
- Raises achieved
- Effect information (wound penalties, stance bonuses)

### Chat Commands

Direct L5R4 dice rolls in chat:

```
/roll 5k3          Standard roll
/roll 5k3x9        Custom explosion threshold (9+)
/roll u4k2         Unskilled (no explosions)
/roll e5k3         Emphasis (reroll 1s)
/roll 5k3+5        Roll with flat bonus
/roll 7k4-2        Roll with penalty
```

### Ten Dice Rule

**Standard Rule** (default)
- Maximum 10 rolled dice
- Excess dice: No benefit
- Example: 12k5 rolls 10 dice, keeps 5

**Little Truths Variant** (optional setting)
- Maximum 10 rolled dice
- Excess dice: +2 per die
- Example: 12k5 rolls 10 dice, keeps 5, adds +4

---

## ⚔️ Combat System

### Initiative

**Calculation**
- Formula: Insight Rank + Reflexes + modifiers
- Modifiers from Active Effects, items, conditions
- Roll/Keep modifiers separate (for special abilities)
- Void Point spending option for initiative rolls

**Combat Tracker Integration**
- Click initiative value to roll
- Integrates with Foundry combat tracker
- Initiative cards show in tracker
- Void Point expenditure tracked

### Movement

**Movement Calculation**
- Base movement: Water Ring × 5 feet
- Displayed in Combat section on character sheet
- Automatic calculation from Water Ring value
- Condition penalties apply (Blinded: -2 Water Ring)

**Movement Actions**
- Move Action: Water Ring × 5 feet
- Full Move: Water Ring × 10 feet (no other actions)
- Visual display of movement rates on sheet

### Combat Stances

Five stance options with automatic effect application:

**Attack Stance** (Water Ring)
- Standard combat stance
- No mechanical bonuses
- Visual indicator on token

**Full Attack Stance** (Fire Ring)
- +2k1 to attack rolls
- -10 to Armor TN
- High risk, high reward
- Works while mounted (no restrictions)

**Defense Stance** (Air Ring)
- Add Air Ring to Armor TN
- Add Defense Skill rank to Armor TN (if present)
- Defensive posture

**Full Defense Stance** (Earth Ring)
- Roll Defense Skill + Reflexes (or just Reflexes)
- Add half result (rounded up) to Armor TN
- Shows dice roll in chat
- Maximum defensive option

**Center Stance** (Void Ring)
- Forfeit actions to prepare
- +1k1 + Void Ring bonus next round
- Visual indicator on token

**Stance Management**
- Dropdown selector on character sheet
- Automatic mutual exclusion (one active at a time)
- Effects persist through combat
- Status effects show on tokens
- Auto-applied to rolls and TNs

### Mounted Combat

**Mounted Status**
- Toggle via Active Effects system
- "Mounted" status effect on character
- Visual indicator on token
- Horsemanship skill detection (multi-language)

**Combat Bonuses**
- +1k0 attack bonus vs unmounted targets
- No bonus vs other mounted combatants
- Works for PC and NPC attacks
- Automatic application in attack rolls

**Full Attack Mounted**
- No restrictions on Full Attack stance while mounted
- All stance bonuses combine with mounted bonus

### Fear System

**NPC Fear Abilities**
- Fear Rank 1-10 on NPC sheet
- Automatic TN calculation: 5 + (Fear Rank × 5)
- Fear test button on NPC sheet

**Resistance Tests**
- Roll: Willpower (no explosions) + Honor Rank
- Target: Fear TN from creature
- Multi-target: Tests all controlled tokens

**Fear Effects**
- **Success**: No effect
- **Failure**: -Fear Rank k0 penalty to all rolls (ActiveEffect)
- **Catastrophic Failure** (by 15+): Character flees or cowers
- Effect persists until encounter end (manual removal)

**Chat Integration**
- Test results post to chat
- Shows roll, TN, success/failure
- Displays penalty applied
- Catastrophic failure notification

### Wound Tracking

**PC Wounds**
- Eight wound levels (Healthy → Out)
- Formula-based thresholds: Earth Ring × multiplier + modifier
- Default multiplier: 2 (configurable per character)
- Wound penalties: +3, +5, +10, +15, +20, +40, +40, +40 TN
- Current wound level highlights automatically
- Wound penalties apply to TN (not roll)

**NPC Wounds**
- Manual or formula-based modes
- 1-8 active wound levels (configurable)
- Quick wound level selection
- Streamlined for fast combat

**Wound Penalties**
- Automatic detection of current wound level
- Applied to target numbers in roll dialogs
- Checkbox in roll dialog to include/exclude
- Displayed in chat roll results

### Guard Maneuver

**Guard Action**
- Simple Action to protect ally within 5 feet
- Guardian gains Guarding status: -5 Armor TN
- Protected ally gains Guarded status: +10 Armor TN
- Duration: Until guardian's next turn
- Proximity requirement: 5 feet (manual tracking)

**Status Effects**
- **Guarding**: Apply to guardian character
- **Guarded**: Apply to protected character
- Manual application by players when declaring Guard
- Automatic Armor TN modifiers
- Visual indicators on tokens

### Damage Application

**Interactive Damage System**
- Damage rolls create chat cards with action buttons
- **Apply Wounds**: One-click damage application to selected token
- **Reduce with Void**: Spend Void Point to reduce damage by 10
- Automatic armor reduction applied
- Visual notifications show damage breakdown

**Damage Calculation Order**
1. Void Point reduction (if used): -10 damage
2. Armor reduction: Subtract armor's Reduction value
3. Final damage applied to suffered wounds
4. Minimum damage: 0 (cannot go negative)

**Taking Damage**
- Select token before clicking damage buttons
- Armor reduction applies automatically
- Remaining damage adds to suffered wounds
- Wound level recalculates automatically
- Down/Out status at severe wounds
- Chat notifications show full damage breakdown

**Damage Reduction**
- From equipped armor items
- Reduction value calculated in prepareDerivedData
- Multiple armors: Highest only (default) or stacking (optional)
- Displayed on character sheet
- Applied automatically before wound calculation
- Works with Void Point reduction (Void first, then armor)

---

## 🛡️ Equipment

### Weapons

**Melee Weapons**
- Damage: XkY format
- Associated skill (Kenjutsu, Jiujutsu, etc.)
- Fallback trait if no skill
- Custom explosion thresholds
- Special rules text
- Click weapon name to attack

**Ranged Weapons (Bows)**
- Bow strength rating
- Arrow type selection
- Arrow modifiers affect damage
- Range tracking
- Strength requirements

**Arrow Types**
- **Willow Leaf (Ya)**: Standard (2k2)
- **Armor Piercing**: Ignore armor TN bonus (1k1)
- **Flesh Cutter**: Heavy damage (2k3)
- **Humming Bulb**: Signaling (0k1)
- **Rope Cutter**: Utility (1k1)

**Damage Calculation**
- Formula: (Bow Strength + Arrow Roll)k(Arrow Keep)
- Example: Strength 3 bow + Willow arrows = (3+2)k2 = 5k2
- Damage rolls automatically after successful hit

### Armor

**Armor TN Calculation**
- Formula: (Reflexes × 5) + 5 + armor bonus + modifiers
- Multiple armors: Highest only (default) or stacking
- Active Effects modifiers apply
- Stance adjustments automatic

**Armor Properties**
- TN bonus
- Damage reduction
- Armor type (Ashigaru, Light, Heavy, etc.)
- Equipped status
- Special rules

**Stacking Rules** (Setting)
- Default: Highest armor bonus only
- Optional: All equipped armors stack

### Common Items

- General equipment tracking
- Description and special rules
- Weight and quantity
- No mechanical effects (use Active Effects for bonuses)

---

## 🔮 Spellcasting

### Ring-Based Magic System

**Spell Structure**
- Elemental ring association (Air, Earth, Fire, Water, Void)
- Mastery levels (1-9)
- Multi-ring spells supported
- School affinity/deficiency tracking

**Casting Mechanics**
- Roll: Ring + Shugenja School Rank
- Target: 5 + (Mastery Level × 5)
- Spell slots optional (per ring type)
- Automatic slot deduction when cast

### Spell Properties

**Core Information**
- Description and special rules
- Mastery level
- Associated ring(s)
- Keywords (Battle, Craft, Thunder, etc.)
- Memorization status (for prepared casters)

**Mechanical Details**
- Range (personal, touch, distance)
- Area of Effect
- Duration (instantaneous, concentration, permanent)
- Raises (special effects for extra raises)
- Casting time
- Free Raises from affinity

**Spell Memorization**
- `memorized` checkbox on spell items
- Track prepared/memorized spells
- Useful for house rules requiring spell preparation
- Visual indicator on spell list

### Shugenja Schools

**Affinity & Deficiency**
- Affinity: +1k0 to casting rolls for that element
- Deficiency: -1k0 to casting rolls for that element
- Configured on Technique items
- Applied automatically in spell roll dialogs

**School Rank**
- Determines ring value for casting
- Tracks shugenja progression
- Affects spell slot maximum (if used)

### Spell Slots (Optional)

**Resource Tracking**
- Five pools: Air, Earth, Fire, Water, Void
- Maximum = Ring value (Void = Void Ring rank)
- Auto-deduct on spell cast
- Depletion warnings
- Restore on long rest

**Slot Management**
- Display on character sheet
- Increment/decrement controls
- Visual indicators for depleted slots
- Override in spell roll dialog

### Spell Cards

**Shift+Click to Post**
- Full spell details to chat
- Mastery level, ring, keywords
- Range, AoE, duration
- Raises and effects
- Special rules

---

## 🌙 Long Rest & Healing

### Natural Healing

**Heal Rate Calculation**
- Formula: (Stamina × 2) + Insight Rank
- Heals this many wounds per night of rest
- Cannot heal below 0 suffered wounds
- Displayed on character sheet

**Rest Button**
- Available on PC and NPC sheets
- One-click long rest application
- Chat card shows healing summary
- Resource restoration automatic

### Resource Restoration

**Automatic Recovery**
- **Spell Slots**: All elemental slots restore to ring values
- **Void Points**: Restore to Void Ring rank
- **Fatigued Condition**: Automatically removed

### Chat Feedback

**Healing Summary Card**
- Character name and portrait
- Wounds healed (with heal rate)
- Current wounds / maximum
- Suffered wounds remaining
- Void Points restored
- Spell slots restored indicator
- Full health notification (if applicable)

### Manual Healing

**Between Rests**
- Medicine skill checks (manual)
- Magical healing (spell effects)
- Direct suffered wound adjustment
- Tea ceremony and other rituals (manual)

---

## 📦 Item Types

### Item Sheet Interface

**4-Tab System**
- **Description**: Item name, description, special rules, keywords
- **Details**: Type-specific properties (damage, mastery, cost, etc.)
- **Modifiers**: Roll bonuses, keep bonuses, total bonuses, Free Raises
- **Active Effects**: Attribute modifications

---

### Skills

**Core Properties**
- Rank (0-10)
- Type (High, Bugei, Merchant, Low)
- Associated trait
- Multiple emphases support (specialties)
- School skill flag (half XP cost)
- Free Raises field (for advantages/techniques)

**Emphasis System**
- **Available Emphases**: List of possible specialties for the skill
- **Trained Emphases**: Emphases purchased by character
- Multiple emphases per skill supported
- Each emphasis costs 2 XP
- Emphasis Manager for easy management
- Emphasis checkbox in roll dialog (reroll 1s)

**Mastery Abilities**
- Rank 3, 5, 7 mastery effects
- Description fields for each
- Displayed on skill card

**Bonuses & Modifiers**
- Roll bonus (+Xk0)
- Keep bonus (+0kX)
- Total bonus (flat modifier)
- Insight bonus (affects insight calculation)
- Free Raises (reduce TN by 5 each)
- Applied via Active Effects or direct values

**XP Tracking**
- Triangular cost calculation
- School skill discount (half cost, rounded up)
- New skill acquisition (1 XP)
- Each emphasis purchase (2 XP per emphasis)
- XP Manager tracks all trained emphases

### Family

**Purpose**
- Character lineage definition
- Grants +1 to one trait (via Active Effects)
- Starting trait bonuses

**Active Effects**
- Configure trait bonus: `system.traits.str` +1
- Transfer effects to character
- Multiple families possible (unusual)

**Display**
- Description and history
- Special family abilities
- Shift+Click to post to chat

### School

**Core Information**
- School name and description
- School skills list
- Special abilities

**Active Effects**
- Skill bonuses for school skills
- Special technique effects
- Honor/Glory/Status adjustments

**Integration**
- School skill flag on skills (automatic half XP)
- Technique progression tracking

### Clan

**Purpose**
- Character clan affiliation
- Purely informational
- No mechanical effects (use Active Effects if needed)

**Display**
- Clan name and history
- Clan colors/symbols
- Mon (clan crest) description

### Techniques

**Shugenja Techniques**
- School rank indicator
- Affinity element (bonus to spells)
- Deficiency element (penalty to spells)
- Spell list learned at this rank

**Bushi/Courtier Techniques**
- School rank
- Technique description
- Mechanical effects (via Active Effects)
- Prerequisites and advancement

**Active Effects**
- Combat bonuses
- Skill bonuses
- Special ability enablement

### Advantages & Disadvantages

**Cost System**
- Positive cost value (both types)
- Disadvantages grant XP (max 10 total)
- Variable costs (rank-based)

**Types**
- Physical
- Mental
- Social
- Spiritual
- Material

**Free Raises**
- Advantages can grant Free Raises
- Set via `freeRaises` field on item
- Free Raises reduce TN by 5 each
- Don't count toward Void Ring maximum
- Automatically calculated and displayed in roll dialogs

**Active Effects**
- Trait modifications
- Skill bonuses
- Armor TN adjustments
- Any attribute modification

**XP Integration**
- Auto-tracks advantage XP spent
- Auto-grants disadvantage XP (capped)
- Displays in XP Manager

### Kata

**Martial Arts Techniques**
- Ring association (Earth, Air, Fire, Water)
- Mastery level (1-9)
- XP cost
- Description and effects
- Free Raises field (for kata granting raise benefits)

**Types**
- Weapon kata (specific weapon schools)
- Unarmed kata (Jiujutsu)
- General martial techniques

**Free Raises**
- Kata can grant Free Raises to specific actions
- Set via `freeRaises` field
- Automatically applied in roll calculations

**Active Effects**
- Combat bonuses
- Technique enablement
- Special abilities

### Kiho

**Monk Abilities**
- Ring association
- Mastery level
- Type (Internal, Martial, Mystical)
- XP cost

**Effects**
- Supernatural abilities
- Combat enhancements
- Spiritual powers

**Active Effects**
- Attribute modifications
- Special ability effects

### Tattoos

**Ise Zumi Tattoos**
- Unique to Togashi monks
- Effect description
- Special rules

**No Mechanical System**
- Effects vary greatly
- Implement via Active Effects as needed
- Primarily descriptive

---

## ⚙️ Settings

### Automation (World Settings)

- **Insight Rank Calculation** - Auto-calculate insight rank from skills/rings (default: enabled)

### Roll Dialogs (Per-User Settings)

Control which roll types show option dialogs:

- **Trait Roll Dialog** - Show options before trait rolls (default: enabled)
- **Skill Roll Dialog** - Show options before skill rolls (default: enabled)
- **Spell Roll Dialog** - Show options before spell rolls (default: enabled)
- **Weapon Roll Dialog** - Show options before weapon rolls (default: enabled)

Players can disable dialogs for faster rolling.

### House Rules (World Settings)

**Ten Dice Rule Variant**
- **Little Truths Ten Dice Rule** - Excess dice grant +2 instead of no benefit (default: disabled)

**NPC Options**
- **Allow NPC Void Points** - NPCs spend Void without resource tracking (default: disabled)
- **Default NPC Wound Mode** - Manual or formula-based for new NPCs (default: manual)

**Armor Rules**
- **Allow Armor Stacking** - Multiple equipped armors stack (default: disabled, highest only)

### Migration (World Settings)

- **Run Migration** - Auto-run data migrations on version updates (default: enabled)
- **Force Migration** - Force re-run migrations (default: disabled, use with caution)

---

## 🎯 Active Effects

Active Effects modify character stats dynamically. Create effects on Family, School, Advantages, Disadvantages, Techniques, Kata, and Kiho items. Effects automatically transfer to characters when items are equipped/added.

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
| `system.armor.armorTn`       | Base Armor TN (NPC only)  | `20`          |
| `system.armor.reduction`     | Damage Reduction (NPC only) | `3`         |

**Note**: For PCs, Armor TN and reduction are calculated from equipped armor items. Use `system.armorTn.mod` to modify PC armor TN via Active Effects. The `system.armor.*` keys apply only to NPCs.

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

| Attribute Key      | Description  | Example Value |
| ------------------ | ------------ | ------------- |
| `system.cost`      | Point Cost   | `5`           |
| `system.freeRaises`| Free Raises  | `2`           |

**Note**: Both advantages and disadvantages store positive costs. Disadvantages grant XP in calculations (handled automatically by the system).

#### All Item Types

| Attribute Key       | Description                        | Example Value |
| ------------------- | ---------------------------------- | ------------- |
| `system.freeRaises` | Free Raises granted by this item   | `1`           |

**Note**: Free Raises can be added to any item type (advantages, techniques, kata, weapons, etc.) to grant raise benefits without TN increase.

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

#### Free Raises from Advantage

Grant Free Raises via item field (not Active Effect):

- Open Advantage item sheet
- Go to **Modifiers** tab
- Set **Free Raises** field to desired value (e.g., `2`)
- Free Raises automatically calculated and displayed in roll dialogs
- Reduces TN by 5 per Free Raise without counting toward Void Ring limit

### Notes

- Use dot notation for nested properties (e.g., `system.traits.str`)
- Trait bonuses from Family items should use the trait keys above
- School bonuses typically affect skills or provide special abilities
- Some derived values (like elemental rings) are calculated automatically and cannot be directly modified
- Free Raises are set via item fields, not Active Effects
- Always test Active Effects to ensure they work as intended with your specific use case

---

## 🌍 Languages

Complete translations for all features:

- 🇺🇸 **English** (primary)
- 🇪🇸 **Español**
- 🇫🇷 **Français**
- 🇧🇷 **Português (Brasil)**
- 🇩🇪 **Deutsch**
- 🇷🇺 **Русский**

All UI elements, item types, settings, and mechanics fully localized. Want to contribute translations? Submit pull requests on [GitHub](https://github.com/ernieayala/l5r4)!

---

## 🔧 Recommended Modules

**Dice Visuals**
- **[Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice)** - 3D dice animations for L5R Roll & Keep dice

**Testing & Development**
- **[Quench](https://foundryvtt.com/packages/quench)** - Required for running integration tests (developers only)

---

## 🔍 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **System won't install** | Use manifest URL method, verify URL is correct for `l5r4-enhanced` |
| **Rolls not working** | Check browser console (F12), disable conflicting modules |
| **XP not tracking** | Open XP Manager, click "Recalculate Purchase XP" button |
| **Wound penalties not applying** | Enable "Apply Wound Penalty" checkbox in roll dialog |
| **Active Effects not working** | Verify attribute keys match docs, check effect enabled/transfer settings |
| **Migration problems** | See [Migration Guide](#️-migration-required-for-existing-users) at top of README |
| **Performance issues** | Disable unused modules, limit Active Effects, use compendiums |

### Debug Mode

Enable console logging:
1. System Settings → Debug Wound Config (for wound calculations)
2. Browser Console (F12) → Filter by `l5r4-enhanced`

### Getting Help

- **[GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)** - Questions and community support
- **[GitHub Issues](https://github.com/ernieayala/l5r4/issues)** - Bug reports
- **Foundry Discord** - Look for L5R4 channels

**Bug Reports Should Include:**
- Foundry VTT version
- System version
- Steps to reproduce
- Console errors (F12 → Console tab)
- Screenshots (if applicable)

---

## 🛠️ Contributing

Contributions welcome! Help improve L5R4-Enhanced for the community.

### Development

**Setup & Architecture**
- Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for complete development guide
- Modern ES6 module architecture (60+ focused modules)
- Pre-commit hooks enforce code quality automatically

**Code Standards**
- ESLint + Prettier (auto-format on commit)
- Comprehensive JSDoc required
- EditorConfig for consistency
- Circular dependency detection

**Testing**
- 440+ Vitest unit tests
- Quench integration tests
- npm scripts: `test`, `test:watch`, `test:ui`, `test:coverage`

### Ways to Contribute

**Code**
- Features and enhancements
- Bug fixes
- Performance improvements
- Submit PRs on [GitHub](https://github.com/ernieayala/l5r4)

**Translations**
- Improve existing translations
- Add new language support
- Submit PRs for `lang/*.json` files

**Documentation**
- Improve README clarity
- Add examples
- Update guides

**Bug Reports**
- [GitHub Issues](https://github.com/ernieayala/l5r4/issues)
- Include version, steps, console errors, screenshots

---

## 📄 License

### System Code

**MIT License** - See [LICENSE](LICENSE) file for full text.

Free to use, modify, and distribute. Contributions welcome.

### L5R Content

**Unofficial Fan Project** - Not affiliated with or endorsed by:
- Fantasy Flight Games
- Edge Studio  
- Asmodee

**Trademarks:** Legend of the Five Rings and L5R are trademarks of Fantasy Flight Games.

**Rulebook Required:** You must own L5R 4th Edition rulebooks to play. This system does not include copyrighted rulebook content.

### Foundry VTT

Created under [Foundry VTT Limited License Agreement](https://foundryvtt.com/article/license/).

Foundry VTT © Foundry Gaming LLC. All rights reserved.

### Disclaimer

Software provided "as is" without warranty. Always backup worlds before system updates.

---

## 🎴 Support This Project

Ways to contribute:
- ⭐ Star on GitHub
- 🐛 Report bugs
- 💬 Join discussions
- 🌐 Contribute translations
- 🔧 Submit PRs

---

**Links:** [Discussions](https://github.com/ernieayala/l5r4/discussions) | [Issues](https://github.com/ernieayala/l5r4/issues) | [Releases](https://github.com/ernieayala/l5r4/releases)
