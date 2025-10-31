# Active Effects Guide

Active Effects let you modify character stats dynamically. This system uses them heavily for bonuses from Family, School, Advantages, Disadvantages, Techniques, Kata, and Kiho items.

---

## How They Work

When you add an item with Active Effects to a character, those effects automatically transfer to the character and modify their stats. Want a Family to grant +1 Strength? Create an Active Effect on the Family item that adds 1 to `system.traits.str`.

**Key Points:**
- Effects live on items, not directly on actors
- Effects transfer when items are added to characters
- Effects can add, subtract, multiply, override, or upgrade values
- Use dot notation for nested properties (e.g., `system.traits.str`)

---

## Creating an Active Effect

1. Open the item sheet (Family, School, Advantage, etc.)
2. Go to the **Active Effects** tab
3. Click **Create Effect**
4. Set the effect name and configure changes

**Each effect can have multiple changes.** Each change needs:
- **Attribute Key:** The stat you're modifying (see below for all keys)
- **Change Mode:** How to apply the change (Add, Multiply, Override, etc.)
- **Effect Value:** The number or value to apply

---

## Change Modes

| Mode | What It Does | Example |
|------|--------------|---------|
| **Add** | Adds to existing value | +1 Strength |
| **Multiply** | Multiplies existing value | ×2 damage |
| **Override** | Replaces value entirely | Set Armor TN to 25 |
| **Upgrade** | Uses higher of old/new value | Take best of two bonuses |
| **Downgrade** | Uses lower of old/new value | Take worst of two penalties |

**Most common:** Add mode. Use it for trait bonuses, skill bonuses, initiative modifiers, etc.

---

## Actor Attribute Keys

### Traits

These are the eight core traits. All use Add mode for bonuses.

| Attribute Key | Trait | Example Effect |
|---------------|-------|----------------|
| `system.traits.sta` | Stamina | +1 from Crab Family |
| `system.traits.wil` | Willpower | +1 from Phoenix Family |
| `system.traits.str` | Strength | +1 from Hida Family |
| `system.traits.per` | Perception | +1 from Kitsuki Family |
| `system.traits.ref` | Reflexes | +1 from Shosuro Family |
| `system.traits.awa` | Awareness | +1 from Doji Family |
| `system.traits.agi` | Agility | +1 from Kakita Family |
| `system.traits.int` | Intelligence | +1 from Asahina Family |

**Example:** A Family grants +1 Strength
- Attribute Key: `system.traits.str`
- Change Mode: Add
- Effect Value: `1`

### Rings

**Void Ring only.** The elemental rings (Air, Earth, Fire, Water) auto-calculate from trait pairs and can't be modified directly.

| Attribute Key | Ring | Example Effect |
|---------------|------|----------------|
| `system.rings.void.rank` | Void Ring Rank | +1 from rare technique |
| `system.rings.void.value` | Current Void Points | +1 bonus Void Point |

**Note:** Modifying `rank` changes maximum Void Points. Modifying `value` gives temporary extra points that don't restore on rest.

### Character Attributes

| Attribute Key | What It Is | Example Effect |
|---------------|------------|----------------|
| `system.honor.rank` | Honor Rank | +1 from advantage |
| `system.honor.points` | Honor Points | +5 from technique |
| `system.glory.rank` | Glory Rank | +1 from school |
| `system.glory.points` | Glory Points | +3 from status |
| `system.status.rank` | Status Rank | +1 from advantage |
| `system.status.points` | Status Points | +2 from family |
| `system.shadowTaint.rank` | Shadow Taint Rank | +1 from maho |
| `system.shadowTaint.points` | Shadow Taint Points | +5 from curse |

### Combat & Defense

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.initiative.rollMod` | Initiative roll dice | +1k0 from advantage |
| `system.initiative.keepMod` | Initiative keep dice | +0k1 from kata |
| `system.initiative.totalMod` | Initiative flat bonus | +3 from technique |
| `system.armorTn.mod` | Armor TN modifier | +5 from advantage |

**For NPCs only:**
- `system.armor.armorTn` - Base Armor TN (override)
- `system.armor.reduction` - Damage Reduction (override)

**For PCs:** Armor TN and reduction come from equipped armor items. Use `system.armorTn.mod` to modify PC Armor TN via effects.

**Example:** Advantage grants +5 Armor TN
- Attribute Key: `system.armorTn.mod`
- Change Mode: Add
- Effect Value: `5`

### Wounds & Health

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.wounds.mod` | Wound threshold modifier | +10 more wounds |
| `system.woundsMultiplier` | Wound level multiplier | ×3 instead of ×2 |
| `system.woundsMod` | Wound threshold additive | +5 to all levels |
| `system.woundsPenaltyMod` | Wound penalty reduction | -2 less penalty |
| `system.suffered` | Current damage | +15 direct damage |

**Wound Calculation:** Each wound level threshold = (Earth Ring × multiplier) + mod

**Example:** Advantage gives tougher wound levels
- Attribute Key: `system.woundsMultiplier`
- Change Mode: Override
- Effect Value: `3`

### Experience & Advancement

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.xp` | Total XP | +50 bonus XP |
| `system.insight.points` | Insight Points | +10 from technique |
| `system.insight.rank` | Insight Rank | +1 from advantage |

**Warning:** Modifying XP or Insight manually can break XP Manager calculations. Only use if you know what you're doing.

### Spell Slots

Optional spell slot system for tracking daily magic. One pool per element.

| Attribute Key | Element | Example Effect |
|---------------|---------|----------------|
| `system.spellSlots.air` | Air Spell Slots | +2 extra Air slots |
| `system.spellSlots.earth` | Earth Spell Slots | +2 extra Earth slots |
| `system.spellSlots.fire` | Fire Spell Slots | +2 extra Fire slots |
| `system.spellSlots.water` | Water Spell Slots | +2 extra Water slots |
| `system.spellSlots.void` | Void Spell Slots | +1 extra Void slot |

**Note:** Spell slots default to ring values. Effects add to that base.

### Wealth

| Attribute Key | Currency | Example Effect |
|---------------|----------|----------------|
| `system.wealth.koku` | Koku (gold) | +10 starting wealth |
| `system.wealth.bu` | Bu (silver) | +5 stipend |
| `system.wealth.zeni` | Zeni (copper) | +50 allowance |

**Warning:** Modifying wealth via effects bypasses the Wealth Manager. Use for starting wealth or stipends only.

---

## Item Attribute Keys

These modify specific items on the character. Useful for School bonuses to skills or weapon enhancements.

### Skills

Target embedded skill items with these keys. You'll need to identify the specific skill by name or use conditional effects.

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.rank` | Skill Rank | +1 rank from technique |
| `system.rollBonus` | Roll Dice Bonus | +1k0 from school |
| `system.keepBonus` | Keep Dice Bonus | +0k1 from advantage |
| `system.totalBonus` | Flat Total Bonus | +2 from kata |
| `system.insightBonus` | Insight Contribution | +5 insight from mastery |

**Example:** School grants +1k0 to Kenjutsu
- Target: Embedded Kenjutsu skill item
- Attribute Key: `system.rollBonus`
- Change Mode: Add
- Effect Value: `1`

**Note:** These affect skills already on the character. They won't create new skills.

### Weapons

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.damageRoll` | Damage Roll Dice | +1 to damage roll |
| `system.damageKeep` | Damage Keep Dice | +1 to damage keep |
| `system.explodesOn` | Explosion Threshold | 9+ instead of 10 |

### Armor

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.bonus` | Armor TN Bonus | +1 to armor bonus |
| `system.reduction` | Damage Reduction | +1 to reduction |

### Spells

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.mastery` | Mastery Level | +1 effective mastery |

### Advantages/Disadvantages

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.cost` | XP Cost | Modify cost value |
| `system.freeRaises` | Free Raises Granted | +1 free raise |

**Note:** Both advantages and disadvantages use positive cost values. The system handles granting XP for disadvantages automatically.

### All Item Types

Every item type has access to:

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.freeRaises` | Free Raises | +1 free raise for related rolls |

**Free Raises** reduce TN by 5 each without counting toward Void Ring maximum. Set this field directly on items (not via Active Effects).

---

## Common Patterns

### Family Trait Bonus

**Goal:** Family grants +1 to one trait

**Setup:**
1. Open Family item
2. Active Effects tab → Create Effect
3. Name: "Family Trait Bonus"
4. Add change:
   - Attribute Key: `system.traits.str` (or whatever trait)
   - Change Mode: Add
   - Effect Value: `1`

### School Skill Bonus

**Goal:** School grants +1k0 to all school skills

**Setup:**
You'll need to create separate effects for each school skill, or use a macro/module to apply conditional effects.

**Manual method:**
1. Open School item
2. Active Effects tab → Create Effect
3. Name: "Kenjutsu School Bonus"
4. Add change:
   - Attribute Key: (target embedded Kenjutsu skill)
   - Change Mode: Add
   - Effect Value: `1`
5. Repeat for each school skill

### Armor TN Modifier

**Goal:** Advantage grants +5 Armor TN

**Setup:**
1. Open Advantage item
2. Active Effects tab → Create Effect
3. Name: "Armor TN Bonus"
4. Add change:
   - Attribute Key: `system.armorTn.mod`
   - Change Mode: Add
   - Effect Value: `5`

### Initiative Bonus

**Goal:** Kata grants +1k0 to initiative

**Setup:**
1. Open Kata item
2. Active Effects tab → Create Effect
3. Name: "Initiative Bonus"
4. Add change:
   - Attribute Key: `system.initiative.rollMod`
   - Change Mode: Add
   - Effect Value: `1`

### Void Point Bonus

**Goal:** Technique grants +1 maximum Void Points

**Setup:**
1. Open Technique item
2. Active Effects tab → Create Effect
3. Name: "Void Bonus"
4. Add change:
   - Attribute Key: `system.rings.void.rank`
   - Change Mode: Add
   - Effect Value: `1`

### Wound Level Enhancement

**Goal:** Advantage makes character tougher (×3 Earth instead of ×2)

**Setup:**
1. Open Advantage item
2. Active Effects tab → Create Effect
3. Name: "Tough"
4. Add change:
   - Attribute Key: `system.woundsMultiplier`
   - Change Mode: Override
   - Effect Value: `3`

### Free Raises

**Goal:** Advantage grants 1 free raise to skill rolls

**Setup:**
This one doesn't use Active Effects. Instead:
1. Open Advantage item
2. **Modifiers** tab
3. Set **Free Raises** field to `1`
4. The system automatically includes these in roll dialogs

**Note:** Free Raises are per-item, not per-roll-type. An advantage with 1 Free Raise applies to all rolls when calculating total free raises available.

---

## Multiple Changes in One Effect

A single Active Effect can have multiple changes. This is useful for complex bonuses.

**Example:** School technique that grants +1 Reflexes and +5 Armor TN

1. Open Technique item
2. Active Effects tab → Create Effect
3. Name: "Doji Technique"
4. Add first change:
   - Attribute Key: `system.traits.ref`
   - Change Mode: Add
   - Effect Value: `1`
5. Add second change:
   - Attribute Key: `system.armorTn.mod`
   - Change Mode: Add
   - Effect Value: `5`

Both changes apply when the technique is on the character.

---

## Conditional Effects

Foundry's Active Effects can be conditional based on various factors. This system doesn't currently have built-in conditional effects, but you can use macros or other modules to enable/disable effects dynamically.

**Example Use Cases:**
- Stance-based bonuses (already handled by stance system)
- Time-of-day bonuses
- Situational advantages
- Environmental effects

**Implementation:** Use macros to toggle effect enabled/disabled state, or use a module like Dynamic Active Effects (DAE).

---

## Effect Duration & Timing

**Duration:**
- **Unlimited** (default): Effect lasts as long as item is on character
- **Turns/Rounds:** Set in combat for temporary effects
- **Seconds:** Real-time duration

**Timing:**
Most effects are passive and always active. For temporary combat effects (like spell buffs or debuffs), set a duration in rounds.

---

## Status Effects vs Active Effects

**Status Effects** are the icons that appear on tokens (Blinded, Stunned, Prone, etc.). They're built into Foundry and this system provides L5R-specific ones.

**Active Effects** are the underlying mechanic that modifies stats. Status effects can have Active Effects attached.

**Example:** The Blinded condition is a status effect. It has an Active Effect that reduces Water Ring by 2 (for movement calculation).

**To apply status effects:**
- Right-click token → **Toggle Condition**
- Use Condition Manager dialog
- Apply via macros or automation

---

## Troubleshooting

### Effect Not Working

**Check:**
1. Is the effect enabled? (toggle on effect)
2. Is the effect set to transfer? (should be on for item effects)
3. Is the attribute key correct? (check spelling and dot notation)
4. Is the change mode appropriate? (usually Add)
5. Is the item equipped/owned by the character?

**Common mistakes:**
- Wrong attribute key (typos, wrong path)
- Effect not set to transfer to actor
- Effect disabled
- Wrong change mode (Override when you meant Add)

### Effect Stacking

Multiple effects to the same attribute will stack if they all use Add mode. If you want effects to NOT stack, use Upgrade or Downgrade modes, or use different attribute keys.

**Example:** Two advantages both give +5 Armor TN using Add mode = +10 total.

### Derived Values

Some values are calculated and can't be modified directly:
- Elemental rings (calculated from trait pairs)
- Armor TN base (calculated from Reflexes × 5 + 5 + armor + modifiers)
- Initiative base (calculated from Insight Rank + Reflexes)

**For these, modify the components or use the `.mod` fields:**
- Can't modify Air Ring directly → modify Reflexes or Awareness instead
- Can't modify base Armor TN → use `system.armorTn.mod` to add bonus
- Can't modify base Initiative → use `system.initiative.rollMod` or `.totalMod`

### XP Manager Conflicts

Active Effects that modify XP, Insight Points, or Insight Rank can confuse the XP Manager. The manager expects to calculate these from character state. If you must modify them via effects, click "Recalculate Purchase XP" in XP Manager after changes.

---

## Advanced: Macro Integration

You can create macros to apply temporary Active Effects or toggle effects on/off.

**Example Macro:** Apply "Blessed" buff for 5 rounds

```javascript
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token");

const effectData = {
  label: "Blessed",
  icon: "icons/magic/holy/angel-winged-humanoid-blue.webp",
  duration: { rounds: 5 },
  changes: [
    { key: "system.armorTn.mod", mode: 2, value: 5 },
    { key: "system.initiative.totalMod", mode: 2, value: 3 }
  ]
};

await token.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
ui.notifications.info("Blessed buff applied!");
```

This creates a temporary effect that lasts 5 rounds and grants +5 Armor TN and +3 Initiative.

---

## Reference: All Actor Attribute Keys

Quick reference of all available keys for copy-paste convenience.

### Traits
```
system.traits.sta
system.traits.wil
system.traits.str
system.traits.per
system.traits.ref
system.traits.awa
system.traits.agi
system.traits.int
```

### Rings
```
system.rings.void.rank
system.rings.void.value
```

### Character Stats
```
system.honor.rank
system.honor.points
system.glory.rank
system.glory.points
system.status.rank
system.status.points
system.shadowTaint.rank
system.shadowTaint.points
```

### Combat
```
system.initiative.rollMod
system.initiative.keepMod
system.initiative.totalMod
system.armorTn.mod
system.armor.armorTn        (NPC only)
system.armor.reduction      (NPC only)
```

### Wounds
```
system.wounds.mod
system.woundsMultiplier
system.woundsMod
system.woundsPenaltyMod
system.suffered
```

### Advancement
```
system.xp
system.insight.points
system.insight.rank
```

### Spell Slots
```
system.spellSlots.air
system.spellSlots.earth
system.spellSlots.fire
system.spellSlots.water
system.spellSlots.void
```

### Wealth
```
system.wealth.koku
system.wealth.bu
system.wealth.zeni
```

---

## Questions?

**Need help with Active Effects?**
- Discord: **@erniez**
- [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)

**Found a bug?**
- [GitHub Issues](https://github.com/ernieayala/l5r4/issues)
