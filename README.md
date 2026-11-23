# Legend of the Five Rings 4th Edition - Enhanced

🇺🇸 🇪🇸 🇫🇷 🇧🇷 🇩🇪 🇷🇺

[![Foundry v14](https://img.shields.io/badge/Foundry-v14-informational)](https://foundryvtt.com/) [![Version 4.0.0](https://img.shields.io/badge/Version-4.0.0-blue)](https://github.com/ernieayala/l5r4/releases) [![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![JB2A Ready](https://img.shields.io/badge/JB2A-Integrated-ff69b4)](https://foundryvtt.com/packages/jb2a_patreon)

Play Legend of the Five Rings 4th Edition in Foundry VTT without doing the bookkeeping by hand.

L5R asks a lot of arithmetic from a table. You count dice, cap them at ten, add Raises to the TN, track Wounds by rank, and remember which stance someone took last Round. This system does that work. You still decide when to spend a Void Point, how many Raises to call, and which stance to take. The system shows you the numbers and leaves those calls to you.

**Questions?** Discord: **@erniez**

---

## Contents

- [New in 4.0](#new-in-40)
- [Install](#install)
- [How a Roll Works](#how-a-roll-works)
- [Your Character](#your-character)
- [In a Fight](#in-a-fight)
- [Magic](#magic)
- [Between Scenes](#between-scenes)
- [Running the Game](#running-the-game)
- [Settings](#settings)
- [Optional Modules](#optional-modules)
- [Help and Legal](#help-and-legal)

---

## New in 4.0

4.0.0 moves the system to Foundry 14 and automates most of the Core Rulebook's mechanics.

- **One roll dialog** for Skills, Traits, Rings, spells, attacks, damage, and Initiative. It shows each modifier and where it came from.
- **Damage that lands.** The attack card rolls damage and applies it to the target's Wounds after Reduction. Undo reverses it.
- **Maneuvers, duels, and grapples.** Spend Raises on Called Shot, Disarm, Feint, and the rest. Iaijutsu duels and grapples run as chat cards.
- **Effects that end on time.** Stances, conditions, and Fear expire at the right Turn, Round, or encounter end, and the system removes them.
- **Rules on items.** An Advantage, School, or piece of armor carries its own bonuses, so dropping it on a sheet applies them.
- **Compendium packs** for the Core Rulebook: Clans, Schools, Skills, Advantages, spells, weapons, creatures, and more, with a browser to search them.
- **Table tools** for the GM: roll links in journals, request cards that each player rolls, and an effect panel.

The [Changelog](CHANGELOG.MD) lists every change.

---

## Install

**You need Foundry VTT 14 (14.370 or later).**

### New install

1. In Foundry, open **Game Systems** → **Install System**
2. Search for "Legend of the Five Rings 4e Enhanced", or paste this manifest URL:
   ```
   https://github.com/ernieayala/l5r4/releases/latest/download/system.json
   ```
3. Click **Install**, then create a world with the system

### Upgrading from 3.2.1

1. Back up your world
2. Update Foundry to 14.370 or later, then update the system to 4.0.0
3. Unlock any world compendiums of Actors or Items you want converted. Locked compendiums stay as they were
4. Open the world as a GM. The system converts the world once, on that first load
5. Check each character's XP total, Insight Rank, and each NPC's Wounds and Initiative. 4.0.0 counts them by the book, so some numbers move

### Staying on Foundry 13

4.0.0 won't install on Foundry 13. Use 3.2.1 there:

```
https://github.com/ernieayala/l5r4/releases/download/v3.2.1/system.json
```

### Coming from the old l5r4 system

If your world uses the original [l5r4 system](https://gitlab.com/team-l5r4/l5r4) or a 1.x version, Foundry sees it as a different system, because the system ID changed from `l5r4` to `l5r4-enhanced`. You move your data across with the migrator module:

```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

1. Install the module in the old world and export its data
2. Create a new world with this system
3. Install the module there and import the data
4. Check your actors, items, scenes, and journals

The [Migration Guide](https://github.com/ernieayala/l5r4-migrator/blob/main/MIGRATION_GUIDE.md) covers each step and its troubleshooting.

---

## How a Roll Works

L5R rolls are written XkY: roll X ten-sided dice, keep the Y highest. A 10 rolls again and adds to that die. A Skill roll uses your Skill rank plus a Trait, keeping the Trait, so Courtier 3 with Awareness 3 rolls 6k3.

Click any Skill, Trait, Ring, weapon, or spell on your sheet and the roll dialog opens with the pool already built. Each modifier sits on its own line with its source, such as your Wound penalty or a stance bonus, and a box to leave it off if the GM rules it doesn't apply. Before you roll, you choose:

- **Raises.** Each one adds 5 to the TN for a better result. You can call up to your Void Ring in Raises.
- **Free Raises** from your Skills, Techniques, or Advantages. They give the benefit without raising the TN.
- **A Void Point** for +1k1.
- **An Emphasis**, which re-rolls dice showing 1.
- Any situational bonus or penalty the GM calls for.

The system enforces the dice limits for you. No roll goes past 10 dice rolled or kept; extra dice turn into kept dice, then into flat bonuses, as the Ten Dice Rule says. An unskilled roll gets no exploding dice and no Raises.

**Shortcuts:**

- Shift-click a roll to skip the dialog and take the defaults
- Right-click a roll in chat for a **Contested Roll** or **Re-roll, keep the better**
- Drag a Skill, weapon, spell, kata, kiho, Trait, or Ring to the hotbar to roll it from there

---

## Your Character

**Traits and Rings.** You raise your eight Traits. Each Ring except Void equals the lower of its two Traits, so the sheet updates your Rings, Wounds, Armor TN, and Initiative when a Trait changes. Void Points refill up to your Void Ring.

**Building from the packs.** Drag a Clan, Family, and School onto your sheet. The Family and School give their Trait bonus as a free rank. The School grants its Skills, and each Technique arrives when your School Rank reaches it. Advantages and Disadvantages ask for any choice they need when you add them, and they check the book's limits, such as one Ancestor.

**XP.** The XP Manager prices each purchase the way the book does: Traits, the Void Ring, Skills, Emphases, Advantages, kata, kiho, and spells. Family and School bonuses count as free ranks, and Disadvantages give up to 10 XP (the GM can change that cap). Each gain and purchase goes in a dated log. If the totals look wrong, the Recalculate button rebuilds them from the character.

**Insight Rank** comes from your Rings and Skill ranks. A GM can switch it to a typed-in value.

**Honor, Glory, Status, and Taint.** The Ledger records each change with its reason, so you can see later why your Glory dropped. Shadowlands Taint applies its penalties at Taint Ranks 3 and 4. A character who embraces the Taint makes that choice in the roll dialog.

**Wealth.** The Wealth Manager holds koku, bu, and zeni, converts between them, and refuses to take away more than you have.

---

## In a Fight

**Initiative.** Each character rolls (Insight Rank + Reflexes)k(Reflexes) once, at the start of the skirmish. A Void Point adds +10 to that roll.

**Stances.** Each one is a status effect on your token:

| Stance | What it does |
|--------|--------------|
| Attack | No change |
| Full Attack | +2k1 on melee attacks, -10 Armor TN |
| Defense | Adds your Air Ring and Defense rank to your Armor TN |
| Full Defense | Roll Defense / Reflexes at each Turn start; half the total, rounded up, adds to your Armor TN |
| Center | Next Round: +10 Initiative, and +1k1 plus your Void Ring on one roll you choose |

**Attacking.** Click a weapon. The dialog starts the TN at your target's Armor TN, so you see what you need before you roll. Spend Raises on a maneuver: Called Shot, Disarm, Extra Attack, Feint, Increased Damage, or Knockdown. The attack's chat card then rolls damage from the weapon, your Strength, any arrow, and your Raises.

**Taking damage.** The damage card applies to the target after Reduction. Your Wound Rank moves down from Healthy, and each rank past Healthy adds its penalty to the TN of every roll you make. **Reduce with Void** on the result card spends one of your Void Points to take 10 Wounds off. **Undo** reverses the damage and returns any Void Point spent on it.

**Guard.** Set it from the token controls. The guard takes -5 Armor TN; the guarded character gets +10.

**Duels and grapples.** Iaijutsu duels and grapples walk both sides through each step on chat cards.

**Mounted.** Toggle Mounted from the token's status menu. You get +1k0 on attacks against targets on foot, and the sheet warns you before Full Attack while mounted unless you have Horsemanship 3.

**Fear.** Select the characters' tokens and press the Fear button on the NPC's sheet. Each character rolls Willpower plus Honor Rank against TN 5 + 5 × Fear Rank. A failure gives Feared, a penalty on every roll that lasts until the encounter ends.

**Conditions** like Dazed, Stunned, Prone, and Fatigued carry their penalties and end when their duration runs out. Dazed and Stunned roll their saves in the Reactions stage.

---

## Magic

A Spell Casting roll is Ring + School Rank, keep Ring, against TN 5 + 5 × the spell's Mastery Level. Affinity and Deficiency move your School Rank by 1 for that roll. The book forbids casting a spell above your School Rank. A player who tries gets told so; a GM who tries gets asked whether to cast it anyway.

Spell slots per Ring are optional: tick **Use spell slot** in the roll dialog to spend one. A rest refills them. A shugenja School also gives you Sense, Commune, and Summon. When a caster takes a heavy hit while concentrating, the system asks for a Willpower roll.

---

## Between Scenes

**Rest.** The Rest button on a character sheet covers one night. It heals (Stamina × 2) + Insight Rank Wounds, refills Void Points and spell slots, and removes Fatigued. A Fasting character gets no Void Points back. A chat card shows the result.

**Kata, kiho, and tattoos** work while you switch them on with the play button on the sheet. You can have one kata and one tattoo active at a time, and one kiho of each type except Martial.

---

## Running the Game

**Compendium packs.** The "L5R4 Core Rulebook" folder holds Clans, Families, Schools, Techniques, Skills, Advantages, Disadvantages, spells, kata, kiho, tattoos, weapons, armor, equipment, and creatures. Each entry has the book's numbers, its rules, and its page. The packs carry no rulebook text, so keep your book nearby.

**Compendium Browser.** Press Browse in the Compendium sidebar to search every pack you can see, with filters. Drag an entry to a sheet, or click Add to give it to your selected token. The GM imports creatures from here.

**Roll links.** Type these in a journal, item description, or chat:

| Link | What it does |
|------|--------------|
| `@Check[skill=Kenjutsu\|trait=agi\|tn=20]` | Opens the roll dialog, filled in, for your selected token or your character |
| `@Damage[3k2]` | Rolls damage to apply to the selected tokens |
| `@Condition[dazed]` | Applies a condition to the targeted tokens, or the selected ones |
| `@Fear[2]` | Calls a Fear test for the targeted tokens, or the selected ones |

Add `{label}` for your own text, as in `@Check[trait=ref]{Dodge}`. A Check link the GM posts gets a second button that sends a request card, and each player rolls it with their own character.

**Effect panel.** The hourglass in the token controls lists the selected token's effects, where each came from, and how long it lasts.

**Creatures** from the pack come with their attacks, Wound levels, Fear, Taint, and special rules such as Invulnerability and Spirit, which change how they take damage.

**Homebrew.** Every item and Active Effect has a Rules tab where you give it bonuses: Trait changes, roll modifiers, Armor TN, Reduction, Free Raises, conditions, and more. The [Rules and Active Effects Guide](ACTIVE_EFFECTS.md) explains each rule.

---

## Settings

| Setting | Default | What it does |
|---------|---------|--------------|
| Apply Little Truths exception | Off | A pool the Ten Dice Rule cut down gets +2 |
| Optional rule: Honor Roll | Off | The GM starts each session with the New session token control |
| Floating Wound and Void numbers | On | Shows Wound and Void Point changes over tokens (per player) |
| Run migrations on startup | On | Converts older world data when the GM loads the world |
| Force migration on startup | Off | Reruns every migration on the next load, then turns itself off |

Each character chooses whether its armor stacks in its Armor Config window. By default only the best armor counts.

---

## Optional Modules

- [Dice So Nice!](https://foundryvtt.com/packages/dice-so-nice) rolls 3D dice for each roll.
- [Sequencer](https://foundryvtt.com/packages/sequencer) and [JB2A](https://foundryvtt.com/packages/jb2a_patreon) together add animations: stance effects, projectiles for ranged attacks, strikes for melee, and markers on conditioned tokens. Both the free and Patreon JB2A collections work. Without these modules, you play with no animations.

---

## Help and Legal

**Help:** Discord **@erniez**, or open a [GitHub issue](https://github.com/ernieayala/l5r4/issues) for bugs. Translations and fixes are welcome; [CONTRIBUTING.md](CONTRIBUTING.md) explains how.

**License:** the system code is MIT. See [LICENSE](LICENSE).

**You need the book.** This system ships no rulebook text. You need the L5R 4th Edition Core Rulebook to play.

This is an unofficial fan project, not affiliated with or endorsed by Fantasy Flight Games, Edge Studio, or Asmodee. Legend of the Five Rings and L5R are trademarks of Fantasy Flight Games. Made under the [Foundry VTT Limited License Agreement](https://foundryvtt.com/article/license/).
