# Active Effects Guide

Active Effects let you modify character stats dynamically. This system uses them heavily for bonuses from Family, School, Advantages, Disadvantages, Techniques, Kata, and Kiho items.

---

## How They Work

When you add an item with Active Effects to a character, those effects automatically transfer to the character and modify their stats. Want a Family to grant +1 Strength? Create an Active Effect on the Family item that adds 1 to `system.traits.str`.

**Key Points:**
- Effects live on items, which pass them to the character that owns them
- Effects transfer when items are added to characters
- Effects change the character only. A change aimed at an item's own fields (a skill's rank, a weapon's damage) does nothing
- Effects can add, subtract, multiply, override, upgrade, or downgrade values
- Use dot notation for nested properties (e.g., `system.traits.str`)

---

## Creating an Active Effect

1. Open the item sheet (Family, School, Advantage, etc.)
2. Go to the **Active Effects** tab
3. Click **New**
4. Set the effect name, then add changes on the **Changes** tab with the **+** button

**Each effect can have multiple changes.** Each change needs:
- **Attribute Key:** The stat you're modifying (see below for all keys)
- **Type:** How to apply the change (Add, Multiply, Override, etc.)
- **Value:** The number or value to apply
- **Priority:** The order among changes to the same key (lower applies first); leave the default

---

## Change Types

| Type | Stored as | What It Does | Example |
|------|-----------|--------------|---------|
| **Add** | `add` | Adds to existing value | +1 Strength |
| **Subtract** | `subtract` | Subtracts from existing value | -1 Reflexes |
| **Multiply** | `multiply` | Multiplies existing value | ×3 wound multiplier |
| **Override** | `override` | Replaces the value | Set NPC Armor TN to 25 |
| **Upgrade** | `upgrade` | Uses higher of old/new value | Take best of two bonuses |
| **Downgrade** | `downgrade` | Uses lower of old/new value | Take worst of two penalties |

**Most common:** Add. Use it for trait bonuses, initiative modifiers, Armor TN modifiers, etc.

---

## Phases

Each change applies in a phase: **Initial** or **Final**. The effect sheet does not show the phase: every change added there is Initial.

- **Initial** applies before the system calculates Rings, Wound levels, Armor TN, Initiative, Insight, and weapon damage, so everything calculated from a Trait sees a Trait change.
- **Final** applies after those calculations. A Final change to a Trait shows on the sheet but never reaches a Ring, Armor TN, or damage roll. A change gets the Final phase only when a macro or module creates it with `phase: "final"`.

---

## Actor Attribute Keys

### Traits

These are the eight core traits. All use the Add type for bonuses.

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
- Type: Add
- Value: `1`

The +1 reaches everything calculated from Strength: the Water Ring and melee and bow damage.

### Rings

**Void Ring only.** The elemental rings (Air, Earth, Fire, Water) are calculated from their Traits; change a Trait to change its Ring.

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
- Type: Add
- Value: `5`

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
- Type: Override
- Value: `3`

### Insight

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.insight.rank` | Insight Rank, when the sheet's automatic Insight Rank is off | +1 from advantage |

Insight points and, with automatic Insight Rank on, the Insight Rank are calculated from Rings and Skills after effects apply, so an effect on them changes nothing. XP comes from the XP Manager, not from an effect.

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

## Skill Bonuses

Effects change the character, never an item on it, so there is no key for a skill item's rank or bonus. Give a skill a roll bonus through the character's bonus keys instead, using the skill's name in lower case:

| Attribute Key | What It Affects | Example Effect |
|---------------|-----------------|----------------|
| `system.bonuses.skill.kenjutsu.roll` | Rolled dice on Kenjutsu rolls | +1k0 from school |
| `system.bonuses.skill.kenjutsu.keep` | Kept dice on Kenjutsu rolls | +0k1 from advantage |
| `system.bonuses.skill.kenjutsu.total` | Flat bonus on Kenjutsu rolls | +2 from kata |
| `system.bonuses.ring.fire.roll` | Rolled dice on Fire Ring rolls and Fire spell casting | +1k0 from technique |

`keep` and `total` work the same way for Rings.

**Free Raises** are a field on the item (Modifiers tab), not an effect key. A Free Raise counts as a Raise without adding 5 to the TN and does not count toward the Void Ring limit on Raises (Core Rulebook p.79).

---

## Common Patterns

### Family Trait Bonus

**Goal:** Family grants +1 to one trait

**Setup:**
1. Open Family item
2. Active Effects tab → New
3. Name: "Family Trait Bonus"
4. Add change:
   - Attribute Key: `system.traits.str` (or whatever trait)
   - Type: Add
   - Value: `1`

The bonus is free, and every rank you buy afterward costs XP at the Trait's new rank with the bonus included
(Core Rulebook p.103): with a Family +1, raising Strength from 3 to 4 costs 16 XP.

### School Skill Bonus

**Goal:** School grants +1k0 to all school skills

**Setup:** one change per school skill.
1. Open School item
2. Active Effects tab → New
3. Name: "School Skill Bonus"
4. Add a change for each skill:
   - Attribute Key: `system.bonuses.skill.kenjutsu.roll` (the skill's name in lower case)
   - Type: Add
   - Value: `1`

### Armor TN Modifier

**Goal:** Advantage grants +5 Armor TN

**Setup:**
1. Open Advantage item
2. Active Effects tab → New
3. Name: "Armor TN Bonus"
4. Add change:
   - Attribute Key: `system.armorTn.mod`
   - Type: Add
   - Value: `5`

### Initiative Bonus

**Goal:** Kata grants +1k0 to initiative

**Setup:**
1. Open Kata item
2. Active Effects tab → New
3. Name: "Initiative Bonus"
4. Add change:
   - Attribute Key: `system.initiative.rollMod`
   - Type: Add
   - Value: `1`

### Void Point Bonus

**Goal:** Technique grants +1 maximum Void Points

**Setup:**
1. Open Technique item
2. Active Effects tab → New
3. Name: "Void Bonus"
4. Add change:
   - Attribute Key: `system.rings.void.rank`
   - Type: Add
   - Value: `1`

### Wound Level Enhancement

**Goal:** Advantage makes character tougher (×3 Earth instead of ×2)

**Setup:**
1. Open Advantage item
2. Active Effects tab → New
3. Name: "Tough"
4. Add change:
   - Attribute Key: `system.woundsMultiplier`
   - Type: Override
   - Value: `3`

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
2. Active Effects tab → New
3. Name: "Doji Technique"
4. Add first change:
   - Attribute Key: `system.traits.ref`
   - Type: Add
   - Value: `1`
5. Add second change:
   - Attribute Key: `system.armorTn.mod`
   - Type: Add
   - Value: `5`

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

**Duration:** a value and a unit (seconds, rounds, turns, or a game-time unit), set on the effect's Duration tab.
- **No value** (default): Effect lasts as long as item is on character
- **Rounds/Turns:** Set in combat for temporary effects
- **Seconds and longer units:** Game-time duration

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
1. Is **Effect Suspended** off? (Details tab)
2. Is **Apply Effect to Actor** on? (Details tab; needed for item effects)
3. Is the attribute key correct? (check spelling and dot notation)
4. Is the change type right? (usually Add) A change made by a macro or module with `phase: "final"` never reaches values calculated from it.
5. Is the item equipped/owned by the character?

**Common mistakes:**
- Wrong attribute key (typos, wrong path)
- Apply Effect to Actor left off on an item effect
- Effect Suspended left on
- Wrong change type (Override when you meant Add)

### Effect Stacking

Multiple effects to the same attribute will stack if they all use the Add type. If you want effects to NOT stack, use the Upgrade or Downgrade types, or use different attribute keys.

**Example:** Two advantages both give +5 Armor TN using Add = +10 total.

### Derived Values

Some values are calculated, and an effect on them is overwritten:
- Elemental rings (calculated from trait pairs)
- Armor TN base (calculated from Reflexes × 5 + 5 + armor + modifiers)
- Initiative base (calculated from Insight Rank + Reflexes)

**For these, modify the components or use the `.mod` fields:**
- Can't change the Air Ring itself → change Reflexes or Awareness instead
- Can't modify base Armor TN → use `system.armorTn.mod` to add bonus
- Can't modify base Initiative → use `system.initiative.rollMod` or `.totalMod`

### XP and Insight

An effect cannot change XP or Insight points: both are calculated from the character after effects apply. Insight Rank takes an effect only with the sheet's automatic Insight Rank off.

---

## Advanced: Macro Integration

You can create macros to apply temporary Active Effects or toggle effects on/off.

**Example Macro:** Apply "Blessed" buff for 5 rounds

```javascript
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token");

const effectData = {
  name: "Blessed",
  img: "icons/magic/holy/angel-winged-humanoid-blue.webp",
  duration: { value: 5, units: "rounds" },
  system: {
    changes: [
      { key: "system.armorTn.mod", type: "add", value: 5 },
      { key: "system.initiative.totalMod", type: "add", value: 3 }
    ]
  }
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

### Insight
```
system.insight.rank        (automatic Insight Rank off)
```

### Skill and Ring Bonuses
```
system.bonuses.skill.<skill name>.roll
system.bonuses.skill.<skill name>.keep
system.bonuses.skill.<skill name>.total
system.bonuses.ring.<ring>.roll
system.bonuses.ring.<ring>.keep
system.bonuses.ring.<ring>.total
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
