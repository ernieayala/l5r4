# Rules and Active Effects Guide

Items and Active Effects carry their mechanics in two ways:

- **Rules** (`system.rules`): entries such as "+1k0 on Kenjutsu rolls" or "+1 Strength" that the system's rule engine reads. Rules can depend on the situation (a stance, a condition, a Ring value) and can use formulas such as "Air Ring plus Defense rank".
- **Active Effect changes**: Foundry's own changes, which add to, multiply, or replace one value on the character.

Use a rule when the system has a rule key for what you need; use an Active Effect change for any other value on the character.

---

## Rules

### Adding a rule

1. Open the item sheet (Family, School, Advantage, Technique, Kata, ...).
2. Go to the **Rules** tab.
3. Type the rules as a JSON list, then click outside the field to save.

```json
[
  { "key": "RollModifier", "selector": "skill:kenjutsu", "roll": 1 },
  { "key": "ArmorTN", "value": 5 }
]
```

Text that is not a JSON list of objects with a `"key"` is not saved, and an error says why. A rule whose fields are wrong (an unknown key, a missing selector) is skipped, with a warning in the browser console naming the item.

Rules on an item apply while the item is on the character. Armor's rules apply only while it is worn. Rules on an Active Effect apply while the effect is active; a macro or module can put rules on an effect through `system.rules`.

### Fields every rule has

| Field | Meaning | Default |
|-------|---------|---------|
| `key` | The rule key (table below) | required |
| `label` | Text shown for the rule; the item's name when blank | `""` |
| `priority` | Order among rules; lower runs first | `100` |
| `predicate` | When the rule applies (see **Predicates**) | always |

### Rule keys

Values marked *n/f* take a number or a formula (see **Formulas**).

| Key | Fields | What it does |
|-----|--------|--------------|
| `TraitAdjust` | `trait` (`sta`, `wil`, `str`, `per`, `ref`, `awa`, `agi`, `int`, or `void`), `value` *n/f* | Raises or lowers a Trait or the Void Ring. Rings, Armor TN, wounds, Initiative, and damage use the new value |
| `RollModifier` | `selector`, `roll`, `keep`, `total` *n/f*, `type` | Adds rolled dice, kept dice, and a flat bonus to the rolls the selector names |
| `ArmorTN` | `value` *n/f*, `type` | Adds to Armor TN |
| `Reduction` | `value` *n/f* | Adds to Reduction |
| `Wounds` | `perRank` *n/f*, `penalty` *n/f* | Adds Wounds to every Wound Rank, and adds to every Wound Rank's TN penalty |
| `Initiative` | `roll`, `keep`, `total` *n/f* | Adds to Initiative |
| `RollOption` | `option`, `toggleable`, `value` | Turns on a roll option other rules' predicates can test. With `"toggleable": true` it is on only while `"value"` is `true`, for situations the system cannot see (higher ground, a target within reach) |
| `TNModifier` | `selector`, `value` *n/f*, `type` | A TN change on the selected rolls |
| `FreeRaise` | `selector`, `value` *n/f* | Free Raises on the selected rolls |
| `DiceRule` | `selector`, `explode` (2-10), `rerollOnes` | Dice handling on the selected rolls |
| `Substitute` | `selector`, `replace`, `with` | Use one Trait or Skill in place of another on the selected rolls, as `"replace": "trait:agi", "with": "trait:ref"` |
| `Note` | `selector`, `text` | Text for the selected rolls |

`TNModifier`, `FreeRaise`, `DiceRule`, `Substitute`, and `Note` are stored for the roll dialog that reads them (roadmap Stage 8); until then they change no roll.

### Selectors

| Selector | Rolls |
|----------|-------|
| `skill:<skill name in lower case>` | That Skill's rolls, as `skill:kenjutsu` or `skill:tea ceremony` |
| `trait:<trait>` | Rolls of that Trait, as `trait:ref`, and Skill rolls that use it |
| `ring:<ring>` | Rolls of that Ring, as `ring:fire`, and spells of its element |
| `attack` | Attack rolls made without a Skill (NPC attacks, unskilled weapon attacks). Skilled weapon attacks read it once the roll pipeline lands (roadmap Stage 8) |

### Formulas

A value can be a formula over the character's data, written as text: `"@rings.air + @skills.defense.rank"`, `"floor(@honor.rank / 2)"`. Formulas allow numbers, `@` paths, `+ - * /`, parentheses, and `floor`, `ceil`, `round`, `min`, `max`, `abs`.

| Path | Value |
|------|-------|
| `@rings.air`, `@rings.earth`, `@rings.fire`, `@rings.water` | Ring values |
| `@rings.void.rank` | Void Ring |
| `@traits.ref` (and the other Trait keys) | Traits |
| `@skills.<skill>.rank` | A Skill's rank; the skill name in lower case with spaces as `_`, as `@skills.tea_ceremony.rank`. A Skill the character lacks counts as 0 |
| `@honor.rank`, `@glory.rank`, `@status.rank`, `@shadowTaint.rank` | Ranks |
| `@insight.rank` | Insight Rank |

A Family or School Trait bonus counts toward XP costs only as a plain number.

### Predicates

A predicate is a list of conditions, all of which must hold:

| Condition | Holds when |
|-----------|-----------|
| `"status:prone"` | The character has that status. Stances are statuses: `status:defenseStance`, `status:fullAttackStance`, ... |
| `"ring:fire:3"`, `"trait:ref:4"` | That Ring or Trait has that value |
| `"wound:nicked"` | The character is at that Wound Rank |
| `"armor:worn"` | The character wears armor |
| `"target"`, `"target:status:mounted"` | On attack rules: the attack has a target, and the target has that status |
| any `RollOption` | That option is on |
| `{ "not": ... }` | The condition inside does not hold |
| `{ "or": [ ... ] }`, `{ "and": [ ... ] }` | One, or all, of the conditions inside hold |
| `{ "gte": ["ring:fire", 3] }` | The Ring or Trait is at least 3; also `gt`, `lte`, `lt`, `eq` |

**Example:** +1k0 on attacks while in Full Attack Stance against a prone target

```json
[
  {
    "key": "RollModifier",
    "selector": "attack",
    "roll": 1,
    "predicate": ["status:fullAttackStance", "target:status:prone"]
  }
]
```

### Stacking

Rules add up. Give rules a `type` to stop them stacking: of rules sharing a type, only the largest bonus and the largest penalty apply.

```json
[
  { "key": "ArmorTN", "value": 3, "type": "spell" },
  { "key": "ArmorTN", "value": 5, "type": "spell" }
]
```

gives +5, not +8.

### Rules the system provides

| Where | Rule |
|-------|------|
| Defense Stance | `ArmorTN` of Air Ring plus Defense rank (Core Rulebook p.84) |
| Mounted | +1k0 on attacks against an unmounted target (Core Rulebook p.89) |
| A skill's Roll, Keep, and Total bonus fields (Modifiers tab) | A `RollModifier` on that skill |

A world made with 3.2.1 is updated when it first loads: a Family or School Trait effect becomes a `TraitAdjust` rule, a Master of Blood advantage gets `{ "key": "RollOption", "option": "master-of-blood" }`, and Defense Stance and Mounted effects get their rules. An advantage you name Master of Blood later needs that rule added by hand.

---

## Common patterns

### Family Trait bonus

```json
[{ "key": "TraitAdjust", "trait": "str", "value": 1 }]
```

The bonus is free, and every rank you buy afterward costs XP at the Trait's new rank with the bonus included (Core Rulebook p.103): with a Family +1, raising Strength from 3 to 4 costs 16 XP.

### School Void bonus

```json
[{ "key": "TraitAdjust", "trait": "void", "value": 1 }]
```

### School skill bonus

One rule per school skill:

```json
[
  { "key": "RollModifier", "selector": "skill:kenjutsu", "roll": 1 },
  { "key": "RollModifier", "selector": "skill:iaijutsu", "roll": 1 }
]
```

### Armor TN, Initiative, and toughness

```json
[
  { "key": "ArmorTN", "value": 5 },
  { "key": "Initiative", "roll": 1 },
  { "key": "Wounds", "perRank": 3 }
]
```

### Free Raises

The **Free Raises** field on the item's Modifiers tab adds to every roll's Free Raises. A Free Raise counts as a Raise without adding 5 to the TN and does not count toward the Void Ring limit on Raises (Core Rulebook p.79).

---

## Active Effects

When you add an item with Active Effects to a character, the effects that apply to the actor change the character's values.

**Key points:**
- Effects live on items, which pass them to the character that owns them
- Effects change the character only. A change aimed at an item's own fields (a skill's rank, a weapon's damage) does nothing
- Effects can add, subtract, multiply, override, upgrade, or downgrade values
- Use dot notation for nested properties (e.g., `system.traits.str`)

### Creating an Active Effect

1. Open the item sheet
2. Go to the **Active Effects** tab
3. Click **New**
4. Set the effect name, then add changes on the **Changes** tab with the **+** button

**Each effect can have multiple changes.** Each change needs:
- **Attribute Key:** The value you're modifying (see below for all keys)
- **Type:** How to apply the change (Add, Multiply, Override, etc.)
- **Value:** The number or value to apply
- **Priority:** The order among changes to the same key (lower applies first); leave the default

### Change types

| Type | Stored as | What It Does | Example |
|------|-----------|--------------|---------|
| **Add** | `add` | Adds to existing value | +1 Strength |
| **Subtract** | `subtract` | Subtracts from existing value | -1 Reflexes |
| **Multiply** | `multiply` | Multiplies existing value | ×3 wound multiplier |
| **Override** | `override` | Replaces the value | Set NPC Armor TN to 25 |
| **Upgrade** | `upgrade` | Uses higher of old/new value | Take best of two bonuses |
| **Downgrade** | `downgrade` | Uses lower of old/new value | Take worst of two penalties |

### Phases

Each change applies in a phase: **Initial** or **Final**. The effect sheet does not show the phase: every change added there is Initial.

- **Initial** applies before the system calculates Rings, Wound levels, Armor TN, Initiative, Insight, and weapon damage, so everything calculated from a Trait sees a Trait change.
- **Final** applies after those calculations. A Final change to a Trait shows on the sheet but never reaches a Ring, Armor TN, or damage roll. A change gets the Final phase only when a macro or module creates it with `phase: "final"`.

A Trait change on a Family or School effect raises the Trait but is not counted as a creation bonus for XP; use a `TraitAdjust` rule for that.

### Actor attribute keys

#### Traits

| Attribute Key | Trait |
|---------------|-------|
| `system.traits.sta` | Stamina |
| `system.traits.wil` | Willpower |
| `system.traits.str` | Strength |
| `system.traits.per` | Perception |
| `system.traits.ref` | Reflexes |
| `system.traits.awa` | Awareness |
| `system.traits.agi` | Agility |
| `system.traits.int` | Intelligence |

#### Rings

**Void Ring only.** The elemental rings (Air, Earth, Fire, Water) are calculated from their Traits; change a Trait to change its Ring.

| Attribute Key | Ring |
|---------------|------|
| `system.rings.void.rank` | Void Ring Rank |
| `system.rings.void.value` | Current Void Points |

Modifying `rank` changes maximum Void Points. Modifying `value` gives temporary extra points that don't restore on rest.

#### Character attributes

| Attribute Key | What It Is |
|---------------|------------|
| `system.honor.rank`, `system.honor.points` | Honor |
| `system.glory.rank`, `system.glory.points` | Glory |
| `system.status.rank`, `system.status.points` | Status |
| `system.shadowTaint.rank`, `system.shadowTaint.points` | Shadowlands Taint |

#### Combat and defense

| Attribute Key | What It Affects |
|---------------|-----------------|
| `system.initiative.rollMod` | Initiative roll dice |
| `system.initiative.keepMod` | Initiative keep dice |
| `system.initiative.totalMod` | Initiative flat bonus |
| `system.armorTn.mod` | PC Armor TN modifier |
| `system.armor.armorTn` | NPC Armor TN (override) |
| `system.armor.reduction` | NPC Reduction (override) |

PC Armor TN and Reduction come from worn armor items.

#### Wounds

| Attribute Key | What It Affects |
|---------------|-----------------|
| `system.wounds.mod` | Wound threshold modifier |
| `system.woundsMultiplier` | Wound level multiplier (×3 instead of ×2) |
| `system.woundsMod` | Wounds added to every level |
| `system.woundsPenaltyMod` | Added to every level's TN penalty |
| `system.suffered` | Current damage |

#### Insight

| Attribute Key | What It Affects |
|---------------|-----------------|
| `system.insight.rank` | Insight Rank, when the sheet's automatic Insight Rank is off |

Insight points and, with automatic Insight Rank on, the Insight Rank are calculated from Rings and Skills after effects apply, so an effect on them changes nothing. XP comes from the XP Manager, not from an effect.

#### Spell slots

| Attribute Key | Element |
|---------------|---------|
| `system.spellSlots.air`, `.earth`, `.fire`, `.water`, `.void` | Spell slots per element |

#### Wealth

| Attribute Key | Currency |
|---------------|----------|
| `system.wealth.koku`, `.bu`, `.zeni` | Koku, bu, zeni |

Modifying wealth through effects bypasses the Wealth Manager.

#### Skill and Ring bonuses

| Attribute Key | What It Affects |
|---------------|-----------------|
| `system.bonuses.skill.<skill name>.roll`, `.keep`, `.total` | Rolls of that Skill (the skill's name in lower case) |
| `system.bonuses.trait.<trait>.roll`, `.keep`, `.total` | Rolls of that Trait |
| `system.bonuses.ring.<ring>.roll`, `.keep`, `.total` | Rolls of that Ring and spells of its element |

A `RollModifier` rule does the same with a predicate and a formula.

### Duration

**Duration:** a value and a unit (seconds, rounds, turns, or a game-time unit), set on the effect's Duration tab.
- **No value** (default): the effect lasts as long as the item is on the character
- **Rounds/Turns:** for temporary combat effects
- **Seconds and longer units:** game-time duration

---

## Status effects

**Status effects** are the conditions and stances shown on tokens (Blinded, Stunned, Prone, Defense Stance, ...). Apply them from the token's status menu, the Condition Manager, or the stance controls on the sheet. Defense Stance and Mounted carry rules (see **Rules the system provides**); the other conditions and stances are calculated by the system.

---

## Troubleshooting

### A rule does nothing

1. Is the rule in the item's **Rules** tab, and was it saved (no error when you left the field)?
2. Does the browser console (F12) show a warning naming the item? It says which field is wrong.
3. Does the predicate hold? Remove it to check.
4. Is the item armor that is not worn?
5. Is the rule one the roll dialog reads later (`TNModifier`, `FreeRaise`, `DiceRule`, `Substitute`, `Note`)?

### An effect does nothing

1. Is **Effect Suspended** off? (Details tab)
2. Is **Apply Effect to Actor** on? (Details tab; needed for item effects)
3. Is the attribute key spelled right?
4. Is the change type right? (usually Add) A change made by a macro or module with `phase: "final"` never reaches values calculated from it.

### Derived values

Rings, base Armor TN (Reflexes × 5 + 5), and base Initiative (Insight Rank + Reflexes) are calculated; an effect on them is overwritten. Change the Trait, or use an `ArmorTN` or `Initiative` rule (or `system.armorTn.mod`, `system.initiative.rollMod`).

---

## Macro example

Apply a 5-round buff with a rule and an effect change:

```javascript
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token");

await token.actor.createEmbeddedDocuments("ActiveEffect", [
  {
    name: "Blessed",
    img: "icons/magic/holy/angel-winged-humanoid-blue.webp",
    duration: { value: 5, units: "rounds" },
    system: {
      rules: [{ key: "ArmorTN", value: 5 }],
      changes: [{ key: "system.initiative.totalMod", type: "add", value: 3 }]
    }
  }
]);
```

---

## Questions?

- Discord: **@erniez**
- [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)
- Bugs: [GitHub Issues](https://github.com/ernieayala/l5r4/issues)
