# Rules and Active Effects Guide

Items and Active Effects carry their mechanics in two ways:

- **Rules** (`system.rules`): entries such as "+1k0 on Kenjutsu rolls" or "+1 Strength" that the system's rule engine reads. Rules can depend on the situation (a stance, a condition, a Ring value) and can use formulas such as "Air Ring plus Defense rank".
- **Active Effect changes**: Foundry's own changes, which add to, multiply, or replace one value on the character.

Use a rule when the system has a rule key for what you need; use an Active Effect change for any other value on the character.

---

## Rules

### Adding a rule

1. Open the item sheet (Family, School, Advantage, Technique, Kata, ...) or an Active Effect's sheet.
2. Go to the **Rules** tab.
3. Pick a rule key at the bottom and click **Add rule**. The rule appears as a form with one field per setting; fill them in. Each field saves as you leave it on an item sheet, and with **Save** on an effect sheet.

A rule the system cannot use shows its error in red above its fields until it is fixed. The trash icon removes a rule.

**Edit as JSON** shows every rule as one JSON list, for copying rules between items or writing many at once:

```json
[
  { "key": "RollModifier", "selector": "skill:kenjutsu", "roll": 1 },
  { "key": "ArmorTN", "value": 5 }
]
```

Text that is not a JSON list of objects with a `"key"` is not saved, and an error says why. A rule whose fields are wrong (an unknown key, a field the key does not have such as a misspelled `rnage`, a missing selector, a formula that does not parse) shows its error in the Rules tab and is skipped, with a warning in the browser console naming the item. Clearing a number-or-formula field in the form puts back its default.

Rules on an item apply while the item is on the character. Armor's rules apply only while it is worn. A weapon's roll rules (the ones a roll reads, such as `RollModifier` and `TNModifier`) apply only to rolls made with that weapon: its attacks and its damage. Its other rules apply while it is on the character. A kata's, kiho's, or tattoo's rules apply only while it is active, an always-active tattoo's while it is owned (see **Kata and kiho**). Rules on an Active Effect apply while the effect is active; a macro or module can put rules on an effect through `system.rules`.

### Fields every rule has

| Field       | Meaning                                             | Default  |
| ----------- | --------------------------------------------------- | -------- |
| `key`       | The rule key (table below)                          | required |
| `label`     | Text shown for the rule; the item's name when blank | `""`     |
| `priority`  | Order among rules; lower runs first                 | `100`    |
| `predicate` | When the rule applies (see **Predicates**)          | always   |

### Rule keys

Values marked _n/f_ take a number or a formula (see **Formulas**).

| Key | Fields | What it does |
| --- | --- | --- |
| `TraitAdjust` | `trait` (`sta`, `wil`, `str`, `per`, `ref`, `awa`, `agi`, `int`, or `void`), `value` _n/f_ | Raises or lowers a Trait or the Void Ring. Rings, Armor TN, wounds, Initiative, and damage use the new value |
| `RollModifier` | `selector`, `roll`, `keep`, `total` _n/f_, `type`, `range`, `optional`, `consumes` | Adds rolled dice, kept dice, and a flat bonus to the rolls the selector names. `range` (`"melee"` or `"ranged"`) limits it to attacks of that range and their damage (a bow's damage rolled from its sheet is ranged, any other weapon's melee); no other roll has a range, so it never applies there. An `optional` one starts unticked in the roll dialog, for a bonus the player puts on one roll of their choice; with `consumes`, rolling with it ticked ends the effect that carries it |
| `ArmorTN` | `value` _n/f_, `type`, `mode`, `range` | Changes Armor TN. `mode` `"add"` (default) adds; `"base"` replaces the Reflexes × 5 + 5 base when lower, and armor and other changes still add; `"total"` sets the whole Armor TN to the value plus armor, and nothing else adds. The lowest `base` or `total` wins; the Armor TN never drops below 5. An `add` with `range` counts only against attacks of that range, stacks by `type` with the other adds, and the Armor TN against that range never drops below 5 either |
| `Reduction` | `value` _n/f_, `except` | Adds to Reduction. `except` lists damage sources it does not stop, as `["jade"]` |
| `DamageSource` | `selector` (default `damage`), `tags`, `ignoreReduction` _n/f_ | Marks the selected damage rolls with sources (`jade`, `crystal`, `obsidian`, `spell`, `nemuranai`, or your own) and lets them ignore that much Reduction |
| `Invulnerability` | `harmedBy`, `only` | Damage from a source not in `harmedBy` (default jade, crystal, obsidian, spell, nemuranai) deals one Wound after Reduction (p.319). With `only`, it covers damage from those sources alone |
| `Spirit` | `harmedBy` | Damage from a source not in `harmedBy` (default jade, crystal, obsidian) is halved after Reduction, rounding down (p.320) |
| `Wounds` | `perRank` _n/f_, `penalty` _n/f_ | Adds Wounds to every Wound Rank, and adds to every Wound Rank's TN penalty |
| `Initiative` | `roll`, `keep`, `total` _n/f_ | Adds to Initiative |
| `RollOption` | `option`, `toggleable`, `value` | Turns on a roll option other rules' predicates can test. With `"toggleable": true` it is on only while `"value"` is `true`, for situations the system cannot see (higher ground, a target within reach) |
| `TNModifier` | `selector`, `value` _n/f_, `type` | A TN change on the selected rolls |
| `FreeRaise` | `selector`, `value` _n/f_ | Free Raises on the selected rolls |
| `DiceRule` | `selector`, `explode` (2-10), `rerollOnes` | Dice explode on `explode` or higher; `rerollOnes` re-rolls 1s once |
| `Substitute` | `selector`, `replace`, `with` | Offers, in the roll dialog, one Trait in place of another, as `"replace": "trait:agi", "with": "trait:ref"`; off until the roller turns it on |
| `Note` | `selector`, `text` | Text on the card of the selected rolls |
| `Movement` | `water` _n/f_ | Water Ring ranks for movement only |
| `ApplyCondition` | `selector`, `condition`, `level` | A successful selected roll with a target shows a button that puts the status `condition` (at `level`, for a Fear Rank) on the target |
| `ConditionImmunity` | `condition` | The character cannot gain that status |
| `PeriodicSave` | `event`, `roll`, `tn`, `step`, `min`, `onFailure` | On an effect: on `event` (`roundEnd` is the Reactions stage; `turnStart`, `turnEnd`) the owner gets a card to roll `roll` (`"ring:earth"`, `"trait:wil"`) against `tn`; success ends the effect. A failure moves the TN by `step`, never past `min`; with `"onFailure": "endNextRound"` the effect ends at the end of the next Round instead |
| `Resource` | `slug`, `max` _n/f_, `per` | `max` more Void Points a character may spend each Round. The only slug is `void` and the only `per` is `round`; any other is flagged and skipped |
| `OpponentModifier` | `selector`, `roll`, `keep`, `total` _n/f_, `type`, `range` | Like `RollModifier`, but on rolls other characters make with this one as their target. Its predicate tests this character's options, with the roller's prefixed `target:` |
| `RaiseRule` | `selector`, `maneuver`, `cost` _n/f_, `cap` _n/f_, `minimum` _n/f_ | On the selected rolls: `cost` changes what `maneuver` (`calledShot`, `disarm`, `extraAttack`, `feint`, `knockdown`) costs in Raises, never below 0; `cap` changes how many Raises may be declared (the Void Ring, p.79); `minimum` is how many must be |
| `UnskilledAs` | `selector`, `rank` _n/f_ | A Skill roll with no ranks in a selected Skill counts as `rank` ranks: the dice roll and explode, and Raises are allowed |
| `ActionCost` | `selector`, `action` (`free`, `simple`, `complex`), `range` | Names on the card of the selected rolls the action they take (p.85); with `range` (`"melee"` or `"ranged"`) only on attacks of that range. The system shows it and does not enforce it |
| `Cost` | `selector`, `value` _n/f_ | The XP price of what the selector names (see **XP prices**) |
| `Ledger` | `track` (`honor`, `glory`, `status`, `taint`), `direction` (`gain`, `loss`), `value` _n/f_ | Changes the size of each gain or loss of that track recorded in the ledger (see **The ledger**) |
| `Prerequisite` | `requires`, `label` | What a character needs before this item can be added: `requires` is a predicate with at least one term, `label` explains it (see **Character options**). One with an empty `requires` cannot be checked, so it counts as unmet and the GM is asked |
| `ChoiceSet` | `flag`, `prompt`, `options` or `list`, `filter`, `selection` | A choice asked when the item is added; the item's other rules use the answer as `{choice:<flag>}` (see **Character options**) |
| `GrantItem` | `uuid`, `rank`, `skillRank`, `emphasis` | An item given with this one: a School's Skills and Techniques (see **Character options**) |

### Selectors

| Selector | Rolls |
| --- | --- |
| `any` | Every roll |
| `skill:<skill name>` | That Skill's rolls, as `skill:kenjutsu` or `skill:tea ceremony` |
| `trait:<trait>` | Rolls of that Trait, as `trait:ref`, and Skill rolls that use it; add the predicate `["check:trait"]` for Trait rolls only |
| `ring:<ring>` | Rolls of that Ring, as `ring:fire`, and spells of its element |
| `skill`, `trait`, `ring` | Every Skill, Trait, or Ring roll. An attack with a Weapon Skill is a Skill roll (p.80), so `skill` reaches it; add the predicate `[{ "not": "check:attack" }]` to leave attacks out |
| `skill-type:<type>` | Rolls of Skills of that type: `high`, `bugei`, `merchant` (or `merch`, as Skills store it), `low` |
| `skill-tag:social` | Rolls of Skills marked **Social Skill** on their Details tab (p.134) |
| `skill-tag:school` | Rolls of School Skills |
| `attack` | Every attack roll, with or without a Skill; a stat block's attack, which has none, reads this one and not `skill` |
| `damage` | Every damage roll |
| `spell` | Every Spell Casting Roll, maho included |
| `maho` | Maho casting rolls |

Selectors are read in lower case with spaces around the colon and the name trimmed, so `Skill:Kenjutsu ` is `skill:kenjutsu`. A `ConditionImmunity` or `ApplyCondition` condition is a status id as written (`prone`, `fullDefenseStance`), and a `PeriodicSave` roll names a Ring or Trait by key; anything else shows as an error in the Rules tab.

### The roll dialog

Every roll shows one dialog (Shift-click skips it and takes the defaults). It lists each modifier from rules, Active Effects, the stance, and conditions with a box to turn it off (an `optional` one starts off), and offers: the TN (an attack starts at a single target's Armor TN; the target's changes against one attack range, such as Prone against melee, are listed with the TN), Raises up to the Void Ring (p.79; a `RaiseRule` moves the cap and may require some), Free Raises spent to lower the TN by 5 each, the Wound Rank's penalty on the TN (p.82), a Void Point for +1k1 (p.78; never on damage; a note warns when one was already spent this Round in combat, and the choice stays yours), an Emphasis from the Skill's trained Emphases (p.133), Embracing the Taint for +1k1 and a point of Taint on a roll with a physical Trait (Taint Level 1 or more and not Lost, p.279), keeping fewer dice, and situational roll, keep, and total modifiers. An Unskilled Roll takes no Raises or Free Raises and its dice never explode (p.80), unless an `UnskilledAs` rule covers its Skill. A penalty that leaves more kept dice than rolled dice cuts the kept dice (p.89).

Each roll posts a card holding everything it rolled with. A successful roll with a target shows a button for each condition an `ApplyCondition` rule offers. With the optional Honor Roll on, a failed Skill, Trait, Ring, or Spell Casting roll shows an **Honor Roll** button (see **The ledger and the Honor Roll**). Its context menu offers **Re-roll, keep the better** and **Contested Roll** against the last roll by someone else (p.80). In chat, `[[7k3]]` rolls 7k3; `u` makes it Unskilled, `e` adds an Emphasis, and `x9` explodes on 9 and 10.

### Formulas

A value can be a formula over the character's data, written as text: `"@rings.air + @skills.defense.rank"`, `"floor(@honor.rank / 2)"`. Formulas allow numbers, `@` paths, `+ - * /`, parentheses, and `floor`, `ceil`, `round`, `min`, `max`, `abs`. A formula must come to a finite number: one that divides by 0 is an error, and the rule is skipped for as long as it does. A value that counts dice, Raises, or ranks is rounded down: `roll` and `keep` of `RollModifier`, `OpponentModifier`, and `Initiative`; `FreeRaise`; `RaiseRule`'s `cost`, `cap`, and `minimum`; `UnskilledAs`'s `rank`; `TraitAdjust`; and `Movement`. With Reflexes 3, `"@traits.ref / 2"` gives 1 die.

| Path | Value |
| --- | --- |
| `@rings.air`, `@rings.earth`, `@rings.fire`, `@rings.water` | Ring values |
| `@rings.void.rank` | Void Ring |
| `@traits.ref` (and the other Trait keys) | Traits |
| `@skills.<skill>.rank` | A Skill's rank; the skill name in lower case with spaces as `_`, as `@skills.tea_ceremony.rank`. A Skill the character lacks counts as 0 |
| `@honor.rank`, `@glory.rank`, `@status.rank`, `@shadowTaint.rank` | Ranks |
| `@insight.rank` | Insight Rank |
| `@school.rank` | School Rank: the highest of the character's Schools, 0 with none |
| `@level` | On an Active Effect: its level, such as a Fear Rank, in every rule on it, `Cost` and `Ledger` included |
| `@cost` | In a `Cost` rule: the price before it |
| `@points` | In a `Ledger` rule: the size of the change before it |

A Family or School Trait bonus counts toward XP costs only as a plain number.

### Predicates

A predicate is a list of conditions, all of which must hold:

| Condition | Holds when |
| --- | --- |
| `"status:prone"` | The character has that status. Stances are statuses: `status:defenseStance`, `status:fullAttackStance`, ... |
| `"ring:fire:3"`, `"trait:ref:4"` | That Ring or Trait has that value |
| `"wound:nicked"` | The character is at that Wound Rank |
| `"armor:worn"` | The character wears armor |
| `"skill:kenjutsu:3"` | That Skill has that rank (the name in lower case) |
| `"clan:crane"`, `"family:kakita"`, `"school:kakita bushi"` | The character's Clan, Family, or School item has that name (lower case) |
| `"item:advantage:allies"` | The character has an item of that type and name: `advantage`, `disadvantage`, `technique`, `kata`, `kiho`, `tattoo`, `spell` |
| `"honor-rank:5"`, `"glory-rank:2"`, `"status-rank:1"`, `"taint-rank:0"` | That track's rank |
| `"insight:2"`, `"school-rank:2"` | Insight Rank and School Rank |
| `"target"`, `"target:status:mounted"` | On attack rules: the attack has a target, and the target has that status |
| `"check:attack"` | The roll is of that kind: `skill`, `trait`, `ring`, `spell`, `maho`, `attack`, `damage`, or `roll` |
| `"weapon:size:large"`, `"weapon:skill:kenjutsu"`, `"weapon:name:katana"`, `"weapon:keyword:samurai"` | On a weapon's attack or damage: its size, its Skill, its name, and each of its keywords (lower case). A Weapon Skill's rule reaches its own weapons' damage this way |
| `"duel:focus"` | The roll is that stage of an iaijutsu duel: `duel:assessment`, `duel:focus`, or `duel:strike` |
| any `RollOption` | That option is on |
| `{ "not": ... }` | The condition inside does not hold |
| `{ "or": [ ... ] }`, `{ "and": [ ... ] }` | One, or all, of the conditions inside hold |
| `{ "gte": ["ring:fire", 3] }` | The Ring, Trait, Skill, or rank is at least 3, as `{ "gte": ["skill:kenjutsu", 3] }`; also `gt`, `lte`, `lt`, `eq` |

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

Every stance and condition is a status effect carrying its rules (see **Status effects**). Besides those:

| Where                                                        | Rule                           |
| ------------------------------------------------------------ | ------------------------------ |
| A skill's Roll, Keep, and Total bonus fields (Modifiers tab) | A `RollModifier` on that skill |

A world made with 3.2.1 is updated when it first loads: a Family or School Trait effect becomes a `TraitAdjust` rule, a Master of Blood advantage gets `{ "key": "RollOption", "option": "master-of-blood" }`, and stance and condition effects get their rules, and a Fear effect its Rank as its level. An advantage you name Master of Blood later needs that rule added by hand.

---

## Character options

The system's compendium packs hold the Core Rulebook's Clans, Families, Schools, Techniques, Skills, Advantages, and Disadvantages with their rules; anything else you build as items with rules. These rules make them behave on the character. The examples below are made up for this guide.

### What happens when an item is dropped on a character

1. **Prerequisites.** Each `Prerequisite` rule's `requires` is tested against the character. A player cannot add an item whose prerequisites they do not meet; a GM is asked whether to add it anyway.
2. **Choices.** Each `ChoiceSet` without a `selection` asks its question, and the answer is stored in the rule. Closing the question cancels the drop.
3. **Grants.** Each `GrantItem` rule whose School Rank has been reached gives its item.

An item added another way (a macro, an import) skips the questions: its choices stay open, and the rules that use them wait, until you fill in the `selection` on the Rules tab.

### A School

The "Quill Courtier School" gives +1 Awareness, three Skills at rank 1, one more Skill of the player's choice, and a Technique at each School Rank:

```json
[
  { "key": "TraitAdjust", "trait": "awa", "value": 1 },
  { "key": "GrantItem", "uuid": "Item.<Courtier skill id>" },
  { "key": "GrantItem", "uuid": "Item.<Etiquette skill id>" },
  { "key": "GrantItem", "uuid": "Item.<Calligraphy skill id>", "emphasis": "Cipher" },
  {
    "key": "ChoiceSet",
    "flag": "extra",
    "prompt": "One more High Skill",
    "list": "skills",
    "filter": ["high"]
  },
  { "key": "GrantItem", "uuid": "{choice:extra}" },
  { "key": "GrantItem", "uuid": "Item.<Rank 1 Technique id>", "rank": 1 },
  { "key": "GrantItem", "uuid": "Item.<Rank 2 Technique id>", "rank": 2 }
]
```

Copy an item's UUID with the passport icon in its sheet header, and paste it into the rule's `uuid` field. A granted Skill comes at rank 1 for free and counts as a School Skill (p.102); `emphasis` gives it a free Emphasis. If the character already has that Skill, it becomes a School Skill with the free rank instead of a second copy.

Techniques with a `rank` wait for the School Rank, which follows Insight Rank (p.104). When it rises, the next Technique is added and a chat message says so. A character with Multiple Schools sets each School's rank on its Details tab.

Dropping a School on a character who already has one asks whether it replaces that School or is added beside it, for an Advanced School (pp.245-247) or the Multiple Schools Advantage (p.151). The pack's Advanced Schools start at rank 1, set on their Details tab as the character advances in them. A Technique a School grants does not ask its own choices; fill in its ChoiceSet's `selection` on its Rules tab.

Removing the School takes back what it gave. A granted Skill with ranks or Emphases bought on top stays, without its free rank. Deleting a granted item yourself keeps it from being granted again.

### Choices

A `ChoiceSet` offers its own `options` (each `{ "value": ..., "label": ... }`) or a built-in `list`: `traits`, `rings`, or `skills` (Skill items in the world and in compendiums, kept to the Skill types in `filter`: `high`, `bugei`, `merchant` or `merch`, `low`). Every other rule on the item can use the answer as `{choice:<flag>}`:

```json
[
  {
    "key": "ChoiceSet",
    "flag": "weapon",
    "prompt": "Favored weapon Skill",
    "options": [
      { "value": "kenjutsu", "label": "Kenjutsu" },
      { "value": "kyujutsu", "label": "Kyujutsu" }
    ]
  },
  { "key": "FreeRaise", "selector": "skill:{choice:weapon}", "value": 1 }
]
```

A choice can fill a field with fixed values too, as a Trait: `{ "key": "TraitAdjust", "trait": "{choice:trait}", "value": -1 }` with a ChoiceSet of `"list": "traits"`. The Rules tab checks such a rule as it reads once the choice is made, and keeps the `{choice:...}` text when the sheet is saved.

### Prerequisites

```json
[
  {
    "key": "Prerequisite",
    "label": "Kenjutsu 3 and an Air Ring of 3",
    "requires": [{ "gte": ["skill:kenjutsu", 3] }, { "gte": ["ring:air", 3] }]
  }
]
```

### XP prices

The XP Manager prices purchases as the book does (pp.102-103): a Trait rank four times the new rank, Family and School bonuses included; the Void Ring six times; a Skill rank the new rank, above the ranks a School gave; an Emphasis 2; an Advantage its cost; a kata or kiho its Mastery Level (pp.231, 259), and a monk's School Kiho nothing; Disadvantages give up to 10. A `Cost` rule sets a new price with a formula over the base price `@cost`:

| `selector`                           | Prices                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| `trait:<trait>`, `ring:void`         | Each rank of that Trait or the Void Ring                |
| `skill:<skill>`, `skill-type:<type>` | Each rank of that Skill, or of Skills of that type      |
| `emphasis`                           | Each Emphasis                                           |
| `item:<type>`                        | Every `advantage`, `kata`, `kiho`, or memorized `spell` |
| `self`                               | The item carrying the rule, whether or not it is active or worn; on an effect, nothing |

An Advantage that costs 1 less for a Crane character:

```json
[{ "key": "Cost", "selector": "self", "value": "@cost - 1", "predicate": ["clan:crane"] }]
```

Kiho at one and a half times their price, rounded up: `{ "key": "Cost", "selector": "item:kiho", "value": "ceil(@cost * 1.5)" }`. A price never drops below 0.

A monk's kiho from the Monk School are free (p.231): tick **School Kiho** on the kiho's Details tab. A Monk School's **Starting kiho** (Details tab) is how many it gives at Rank 1, three for the Brotherhood Schools and four for the Temples of the Thousand Fortunes; each later School Rank gives two more. Other kiho are bonus kiho at their Mastery Level, one per Rank of all Monk Schools together. The XP Manager counts both and warns past either limit.

### Kata and kiho

A kata's or kiho's rules apply while it is active, not while it is owned (pp.259, 261). The play button on its row of the character sheet activates it: the system makes an Active Effect carrying its rules. A second kata ends the first; a kiho ends another of its type, except Martial kiho. The stop button, or deleting the effect, ends it. A tattoo works the same way (p.115): one at a time, and its effect lasts twice the School Rank in Rounds. A tattoo marked **Always active** on its Details tab, such as the Mantis, applies while it is owned instead.

### The ledger and the Honor Roll

**Ledger** under the ranks on the character sheet records a gain or loss of Honor, Glory, Status, or Taint with its reason, and lists the latest changes. Ten points make a rank (p.90). The character's `Ledger` rules size each change by its `@points`: an oath that doubles Honor losses is `{ "key": "Ledger", "track": "honor", "direction": "loss", "value": "@points * 2" }`; a value of `0` ignores those changes. Shift-clicking a rank is a correction outside the ledger.

The optional **Honor Roll** (p.92) is a world setting. Once per session, a failed Skill, Trait, Ring, or Spell Casting roll offers an **Honor Roll** button: the roll is made again at the same TN with Honor Rank in rolled and kept dice; failing it costs a Rank of Honor through the ledger. The GM's **New session** token control starts a session and gives everyone their Honor Roll back.

### Shadowlands Taint

The system tracks what a Taint Rank does on its own (pp.277-279): at Level 3, -1k0 on Social Skill rolls; from Level 4, -2k0 on them instead, one Void Point fewer when Void Points refill, and -2k2 on the Honor Roll. Mark a Skill as a **Social Skill** on its Details tab for the penalty to reach it. Embracing the Taint is a choice in the roll dialog; each point it costs goes into the ledger. Exposure and growth rolls stay the GM's.

### Moving items between worlds

Right-click an Item folder in the sidebar:

- **Export items with rules** saves the folder's items, its subfolders included, with their rules and Active Effects, to one JSON file.
- **Import items with rules** reads such a file into a new folder inside the one you clicked. A rule that named an item from the same file names its imported copy, so a School's grants keep working.

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

A `FreeRaise` rule gives Free Raises to the rolls its selector names. A Free Raise counts as a Raise without adding 5 to the TN and does not count toward the Void Ring limit on Raises (Core Rulebook p.79). A world from 3.2.1 that set an item's old Free Raises field gets a `FreeRaise` rule on every roll in its place; narrow its selector on the Rules tab.

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

| Type          | Stored as   | What It Does                  | Example                     |
| ------------- | ----------- | ----------------------------- | --------------------------- |
| **Add**       | `add`       | Adds to existing value        | +1 Strength                 |
| **Subtract**  | `subtract`  | Subtracts from existing value | -1 Reflexes                 |
| **Multiply**  | `multiply`  | Multiplies existing value     | ×3 wound multiplier         |
| **Override**  | `override`  | Replaces the value            | Set NPC Armor TN to 25      |
| **Upgrade**   | `upgrade`   | Uses higher of old/new value  | Take best of two bonuses    |
| **Downgrade** | `downgrade` | Uses lower of old/new value   | Take worst of two penalties |

### Phases

Each change applies in a phase: **Initial** or **Final**. The effect sheet does not show the phase: every change added there is Initial.

- **Initial** applies before the system calculates Rings, Wound levels, Armor TN, Initiative, Insight, and weapon damage, so everything calculated from a Trait sees a Trait change.
- **Final** applies after those calculations. A Final change to a Trait shows on the sheet but never reaches a Ring, Armor TN, or damage roll. A change gets the Final phase only when a macro or module creates it with `phase: "final"`.

A Trait change on a Family or School effect raises the Trait but is not counted as a creation bonus for XP; use a `TraitAdjust` rule for that.

### Actor attribute keys

#### Traits

| Attribute Key       | Trait        |
| ------------------- | ------------ |
| `system.traits.sta` | Stamina      |
| `system.traits.wil` | Willpower    |
| `system.traits.str` | Strength     |
| `system.traits.per` | Perception   |
| `system.traits.ref` | Reflexes     |
| `system.traits.awa` | Awareness    |
| `system.traits.agi` | Agility      |
| `system.traits.int` | Intelligence |

#### Rings

**Void Ring only.** The elemental rings (Air, Earth, Fire, Water) are calculated from their Traits; change a Trait to change its Ring.

| Attribute Key             | Ring                |
| ------------------------- | ------------------- |
| `system.rings.void.rank`  | Void Ring Rank      |
| `system.rings.void.value` | Current Void Points |

Modifying `rank` changes maximum Void Points. Modifying `value` gives temporary extra points that don't restore on rest.

#### Character attributes

| Attribute Key                                          | What It Is        |
| ------------------------------------------------------ | ----------------- |
| `system.honor.rank`, `system.honor.points`             | Honor             |
| `system.glory.rank`, `system.glory.points`             | Glory             |
| `system.status.rank`, `system.status.points`           | Status            |
| `system.shadowTaint.rank`, `system.shadowTaint.points` | Shadowlands Taint |

#### Combat and defense

| Attribute Key                | What It Affects          |
| ---------------------------- | ------------------------ |
| `system.initiative.rollMod`  | Initiative roll dice     |
| `system.initiative.keepMod`  | Initiative keep dice     |
| `system.initiative.totalMod` | Initiative flat bonus    |
| `system.armorTn.mod`         | PC Armor TN modifier     |
| `system.armor.armorTn`       | NPC Armor TN (override)  |
| `system.armor.reduction`     | NPC Reduction (override) |

PC Armor TN and Reduction come from worn armor items.

#### Wounds

| Attribute Key             | What It Affects                           |
| ------------------------- | ----------------------------------------- |
| `system.wounds.mod`       | Wound threshold modifier                  |
| `system.woundsMultiplier` | Wound level multiplier (×3 instead of ×2) |
| `system.woundsMod`        | Wounds added to every level               |
| `system.woundsPenaltyMod` | Added to every level's TN penalty         |
| `system.suffered`         | Current damage                            |

#### Insight

| Attribute Key         | What It Affects                                              |
| --------------------- | ------------------------------------------------------------ |
| `system.insight.rank` | Insight Rank, when the sheet's automatic Insight Rank is off |

Insight points and, with automatic Insight Rank on, the Insight Rank are calculated from Rings and Skills after effects apply, so an effect on them changes nothing. XP comes from the XP Manager, not from an effect.

#### Spell slots

| Attribute Key                                                 | Element                 |
| ------------------------------------------------------------- | ----------------------- |
| `system.spellSlots.air`, `.earth`, `.fire`, `.water`, `.void` | Spell slots per element |

#### Wealth

| Attribute Key                        | Currency       |
| ------------------------------------ | -------------- |
| `system.wealth.koku`, `.bu`, `.zeni` | Koku, bu, zeni |

Modifying wealth through effects bypasses the Wealth Manager.

#### Skill and Ring bonuses

| Attribute Key | What It Affects |
| --- | --- |
| `system.bonuses.skill.<skill name>.roll`, `.keep`, `.total` | Rolls of that Skill (the skill's name in lower case) |
| `system.bonuses.trait.<trait>.roll`, `.keep`, `.total` | Rolls of that Trait |
| `system.bonuses.ring.<ring>.roll`, `.keep`, `.total` | Rolls of that Ring and spells of its element |

A `RollModifier` rule does the same with a predicate and a formula.

### Duration

**Duration:** a value and a unit (seconds, rounds, turns, or a game-time unit), and an event that ends it, set on the effect's Duration tab. An effect that runs out is deleted.

- **No value and no event** (default): the effect lasts as long as the item is on the character
- **Rounds/Turns:** combat effects. The event says when they end: the start or end of a Turn (counted from the combatant whose Turn it was when the effect began), the start or end of a Round (the end is the Reactions stage, p.82), the start or end of the combat, or **End of the encounter**
- **Minutes, hours, days:** they end when the GM advances world time; while world time stands still, nothing ends
- **End of the encounter:** ends when the combat the effect began in ends, or when the GM clicks **End encounter** in the token controls

### Effect level and group

An effect made by the system can carry two more values, which a macro sets through `system`:

- `system.level`: how strong the effect is, read by its rules as `@level` (a Fear Rank, days of Fatigue)
- `system.group`: effects in the same group are exclusive; gaining one ends the others. The stances are the group `"stance"`; an activated kata is `"kata"` (one at a time, p.259), an activated tattoo `"tattoo"` (p.115), and an activated kiho `"kiho-<type>"` except a Martial one (p.261)

---

## Status effects

**Status effects** are the stances and conditions shown on tokens. Apply them from the token's status menu, the Condition Manager, or the stance control on the sheet. Each carries its rules; an effect a macro makes with only a status id (`{ statuses: ["prone"] }`) gets them too.

A character holds each condition once. Applying a condition the character already has, from a chat link, a card button, or a Fear test, restarts its duration. If the new one has a higher level, it replaces the old one: Fear 3 after Fear 2 is -3k0, not -5k0. Concentration is held once per spell, and Guarded once per guard.

| Status | What it does (Core Rulebook) |
| --- | --- |
| Attack Stance | Nothing to calculate (p.84) |
| Full Attack Stance | +2k1 to attacks, Armor TN -10 (p.84) |
| Defense Stance | Armor TN + Air Ring + Defense rank (p.84) |
| Full Defense Stance | Taking it rolls Defense / Reflexes; half the total, rounded up, adds to Armor TN until your next Turn, when you are asked to roll again (p.84) |
| Center Stance | The next Round: +10 Initiative, and +1k1 plus the Void Ring offered (unticked) on the roll you choose during your Turn (p.84) |
| Blinded | -3k3 ranged and -1k1 melee attacks; base Armor TN Reflexes + 5; Water Ring 2 lower for movement (p.89) |
| Dazed | -3k0 to every roll; an Earth Ring roll at TN 20 in the Reactions stage ends it, the TN 5 lower after each failure, down to 5 (p.89) |
| Stunned | Armor TN 5 plus armor; an Earth Ring roll at TN 20 in the Reactions stage ends it, and a failure ends it after the next Round (p.89) |
| Grappled | Armor TN 5 plus armor (p.89) |
| Prone | -10 Armor TN against melee attacks; -2k0 to attacks (p.89). Put on automatically at Down or Out and taken off when you rise above Down |
| Fatigued, Fasting | +5 TN per level on Skill rolls, physical Trait rolls, and Spell Casting Rolls (p.89) |
| Feared | -Xk0 to every roll, X its level (the Fear Rank), until the encounter ends (p.90) |
| Guarded, Guarding | Armor TN +10 / -5 until the guard's next Turn (p.88) |
| Mounted | +1k0 on attacks against an unmounted target (p.89) |
| Concentration | Started by casting a spell whose Duration is Concentration; taking more Wounds than your Earth Ring in one hit asks for a Willpower roll at TN 20 + 5 per Mastery Level, and failing ends it (p.166) |

The sheet warns when a condition rules out the stance you pick (Dazed, Prone, Fatigued, Mounted) and still lets you take it. Spending a Void Point on Armor TN gives +10 until the end of the Round (p.78).

---

## Troubleshooting

### A rule does nothing

1. Is the rule in the item's **Rules** tab, and was it saved (no error when you left the field)?
2. Does the Rules tab show an error over the rule, or the browser console (F12) a warning naming the item? It says which field is wrong.
3. Does the predicate hold? Remove it to check.
4. Is the item armor that is not worn, or a kata or kiho that is not active?
5. Is a roll modifier switched off in the roll dialog, or is a `Substitute` left off?
6. Does the rule use a `{choice:...}` that was never answered? Fill in the ChoiceSet's `selection`.

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
