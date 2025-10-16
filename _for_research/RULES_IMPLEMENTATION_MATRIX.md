# L5R4 Rules Implementation Matrix

This document maps L5R4 rules from `game-rules/` to their implementation status in the system.

**Legend:**

- ✅ **Fully Implemented**: Automatic calculation and application
- 🟡 **Partially Implemented**: Tracked but requires manual application
- 🟠 **Foundation Exists**: Data structures present, no automation
- ❌ **Not Implemented**: Rule exists in documentation only

---

## Character Creation Rules (Character_Creation.md)

| Rule                  | Status | Implementation Details                        |
| --------------------- | ------ | --------------------------------------------- |
| Clan/Family Selection | 🟠     | Items exist, trait bonuses via Active Effects |
| Family +1 Trait Bonus | ✅     | Active Effects apply automatically            |
| School Selection      | 🟠     | Items exist, starting honor set               |
| School Skills         | 🟡     | Recognized for XP cost reduction              |
| 40 Starting XP        | 🟠     | Tracked, manual allocation                    |
| Derived Attributes    | ✅     | Rings, Insight, Void Max auto-calculated      |
| Starting Equipment    | ❌     | School outfit not automated                   |
| 20 Questions          | ❌     | Narrative guide only, no system integration   |

---

## Rings & Traits (Rings_and_Traits.md)

| Rule                                             | Status | Implementation Details                         |
| ------------------------------------------------ | ------ | ---------------------------------------------- |
| **Ring Calculation** (lower of two traits)       | ✅     | `_prepareTraitsAndRings()` in actor.js:576-599 |
| **Trait Advancement Cost** (4×new_rank)          | ✅     | XP system in `xp-system.js`                    |
| **Void Points** (max = Void Ring)                | ✅     | Auto-calculated in `system.rings.void.max`     |
| **Void Point Spending** (+1k1, -10 wounds, etc.) | 🟡     | Rules documented, manual decrement             |
| **Ten Dice Rule** (convert excess)               | ✅     | `apply-ten-dice-rule.js`                       |
| **Exploding Dice** (roll on 10)                  | ✅     | Foundry Roll system handles                    |
| **Trait/Ring Reduction** (to 0 = death)          | 🟡     | Calculated, death not automated                |

---

## Skills & Rolls (Skills_and_Rolls.md, Bugei_Skills.md)

| Rule                                                      | Status | Implementation Details                                  |
| --------------------------------------------------------- | ------ | ------------------------------------------------------- |
| **Skill Roll Formula** (Skill+Trait)k(Trait)              | ✅     | `calculateSkillFormula()` in skill-formulas.js          |
| **Skill Rank XP Cost**                                    | ✅     | Progressive costs in xp-costs.js                        |
| **Raises** (increase TN by 5)                             | ✅     | TN calculator in tn-calculator.js                       |
| **Unskilled Roll** (Trait)k(Trait), no explode, no raises | ✅     | Auto-detected, enforced in skill-roll.js & mechanics.js |
| **Emphasis** (Free Raise if applicable)                   | 🟠     | Checkbox exists, effect manual                          |
| **Contested Rolls**                                       | 🟡     | Explained in rules, manual comparison                   |
| **Cooperative Rolls**                                     | ❌     | No system support                                       |
| **Cumulative Rolls**                                      | ❌     | No system support                                       |
| **Skill Masteries** (rank 3/5/7 abilities)                | ❌     | Documented in descriptions, not applied                 |

### Skill Mastery Abilities

| Skill         | Rank 3              | Rank 5                | Rank 7                 | Status              |
| ------------- | ------------------- | --------------------- | ---------------------- | ------------------- |
| Athletics     | Moderate terrain OK | No terrain penalties  | +5 feet move           | ❌                  |
| Battle        | -                   | +Battle to Initiative | -                      | ❌                  |
| Defense       | Retain roll         | +3 Armor TN           | Simple in Full Defense | ❌                  |
| Horsemanship  | Full Attack mounted | Mount as Simple       | Mount as Free          | 🟡 (Rank 3 checked) |
| Iaijutsu      | Ready as Free       | +1 Free Raise Focus   | +2k2 if Assessment 10+ | ❌                  |
| Jiujutsu      | Unarmed +1k0        | Free Raise Grapple    | Unarmed +0k1           | ❌                  |
| Kenjutsu      | Sword +1k0          | Ready as Free         | -                      | ❌                  |
| Heavy Weapons | Reduce Reduction 2  | Free Raise Knockdown  | Explode 9-10           | ❌                  |

---

## Combat & Wounds (Combat_and_Wounds.md, Stances_Actions_Maneuvers.md)

| Rule                                        | Status | Implementation Details              |
| ------------------------------------------- | ------ | ----------------------------------- |
| **Initiative** (Insight+Reflexes+Mods)      | ✅     | Calculated in actor.js:604-628      |
| **Armor TN** (Ref+5+Armor+Mods)             | ✅     | Calculated in actor.js:654-694      |
| **Wound Thresholds** (Earth×multiplier)     | ✅     | Calculated in actor.js:733-748      |
| **Wound Penalties** (-XkY based on level)   | ✅     | Applied in roll dialogs             |
| **Healing** (2×Stamina+Insight per night)   | 🟡     | Formula defined, manual application |
| **Down Wound Level** (Stamina TN 20 to act) | 🟡     | Level tracked, TN not enforced      |
| **Out Wound Level** (Earth TN 15+5/hour)    | 🟡     | Level tracked, death not automated  |
| **Lethality Options** (Earth×2/3/4/5)       | ✅     | Configurable in wound-config.js     |

### Combat Stances

| Stance       | Armor TN         | Attack                        | Movement   | Status |
| ------------ | ---------------- | ----------------------------- | ---------- | ------ |
| Attack       | +Reflexes        | No penalty                    | Normal     | ✅     |
| Full Attack  | -10              | +2k1                          | +5 feet    | ✅     |
| Defense      | +Air+Defense     | No attacks                    | Normal     | ✅     |
| Full Defense | +(Defense/Ref÷2) | No actions (Complex)          | Normal     | ✅     |
| Center       | +0               | +1k1+Void next, +10 Init next | No actions | ✅     |

### Combat Maneuvers

| Maneuver         | Raises | Effect                                 | Status                 |
| ---------------- | ------ | -------------------------------------- | ---------------------- |
| Called Shot      | 1-4    | Target body part                       | ❌                     |
| Disarm           | 3      | 2k1 damage, Contested Str, drop weapon | ❌                     |
| Extra Attack     | 5      | Second attack if first hits            | ❌                     |
| Feint            | 2      | Add half excess to damage              | ❌                     |
| Guard            | 0      | +10 Armor TN ally, -5 self             | ❌                     |
| Increased Damage | 1+     | +1k0 per raise                         | 🟡 (Declared manually) |
| Knockdown        | 2/4    | Damage + Contested Str, prone          | ❌                     |

---

## Advantages (Advantages.md)

| Advantage          | Cost | Mechanical Effect                      | Status                 |
| ------------------ | ---- | -------------------------------------- | ---------------------- |
| Balance            | 2    | +1k0 vs Intimidation/Temptation        | ❌                     |
| Blood of Osano-Wo  | 4    | Immune weather, -1k1 elemental damage  | ❌                     |
| Chosen by Oracles  | 6    | +1k1 to Ring Rolls for one Ring        | ❌                     |
| Clear Thinker      | 3    | +1k0 vs confusion/manipulation         | ❌                     |
| Crab Hands         | 3    | Unskilled weapons count as Rank 1      | ❌                     |
| Dangerous Beauty   | 3    | +1k0 Temptation vs opposite sex        | ❌                     |
| Dark Paragon       | 5    | -5 Honor for +5 to rolls               | ❌                     |
| Elemental Blessing | 4    | -1 XP for associated Traits            | 🟠 (XP system exists)  |
| Enlightened        | 6    | -2 XP for Void advancement             | 🟠 (XP system exists)  |
| Fame               | 3    | +1 Glory Rank                          | 🟠 (Manual adjustment) |
| Great Destiny      | 5    | Survive lethal once/session at 1 wound | ❌                     |
| Great Potential    | 5    | Raises = Skill Rank not Void           | ❌                     |
| Hands of Stone     | 6    | Unarmed +0k1                           | ❌                     |
| Inner Gift         | 7    | Animal Ken/Empathy/Foresight/etc       | ❌                     |

**Note:** 50+ more advantages in Advantages.md, all with defined mechanical effects

---

## Disadvantages (Disadvantages.md)

| Disadvantage     | Points | Mechanical Penalty                      | Status      |
| ---------------- | ------ | --------------------------------------- | ----------- |
| Antisocial       | 2/4    | -1k0 or -1k1 Social rolls               | ❌          |
| Ascetic          | 2      | Half Glory gain                         | 🟠 (Manual) |
| Bad Eyesight     | 3      | -1k1 ranged, -1k1 Perception            | ❌          |
| Bad Fortune      | 3      | Various (Secret Love, Disfigure, etc)   | ❌          |
| Bad Health       | 4      | Earth -1 for Wounds/disease             | ❌          |
| Bitter Betrothal | 2      | Domestic/bureaucratic difficulty        | ❌          |
| Blackmailed      | Var    | Periodic demands                        | ❌          |
| Black Sheep      | 3      | Family relations require Allies         | ❌          |
| Blind            | 6      | -3k3 ranged, -1k1 melee, Armor TN=Ref+5 | ❌          |
| Brash            | 3      | Will+Honor TN 25 to avoid attacking     | ❌          |
| Can't Lie        | 2      | Cannot lie, must correct (Will TN 20)   | ❌          |
| Compulsion       | 2-4    | Will TN 15-25 to resist                 | ❌          |
| Consumed         | 4-6    | Various Shourido penalties              | ❌          |

**Note:** 50+ more disadvantages in Disadvantages.md with measurable penalties

---

## Honor, Glory, & Status (Honor_Glory_Status.md)

| Rule                                                   | Status | Implementation Details          |
| ------------------------------------------------------ | ------ | ------------------------------- |
| **Honor Rank 0-10** (behavioral tiers)                 | 🟠     | Tracked, descriptions in rules  |
| **Honor adds to rolls** (Fear/Intimidation/Temptation) | ✅     | fear.js + skill-roll.js checkbox |
| **Honor Discernment** (Lore: Bushido TN 30)            | ❌     | Not implemented                 |
| **Optional Honor Roll** (re-roll with Honor dice)      | ❌     | Not implemented                 |
| **Glory Recognition** (Heraldry TN 50-Glory×5)         | ❌     | Not implemented                 |
| **Glory Point Conversion** (10 points = 1 rank)        | 🟠     | Manual conversion               |
| **Status Rankings** (Emperor 10 to peasant 0.5)        | 🟠     | Documented, not enforced        |
| **Status Hierarchy** (can order lower-status)          | ❌     | Not enforced                    |
| **Infamy** (criminal Glory alternative)                | ❌     | Not implemented                 |

---

## Conditions & Status Effects (Dueling_Grappling_Conditions.md)

| Condition     | Effect                                          | Status                  |
| ------------- | ----------------------------------------------- | ----------------------- |
| **Blinded**   | -4k2 attacks, -4k2 Defense, -4k2 Perception     | 🟠 (Icon only)          |
| **Dazed**     | Earth roll vs TN (decreases 5/round) to recover | 🟠 (Icon only)          |
| **Dead**      | Character is dead                               | 🟠 (Icon only)          |
| **Entangled** | No Move or Complex Actions                      | 🟠 (Icon only)          |
| **Fatigued**  | +5 TN physical actions                          | 🟠 (Icon only)          |
| **Grappled**  | Complex multi-step mechanic                     | 🟠 (Icon only)          |
| **Mounted**   | +1k0 vs unmounted, Full Attack restricted       | 🟡 (Partial automation) |
| **Prone**     | +10 TN vs ranged, attacker +1k0 melee           | 🟠 (Icon only)          |
| **Stunned**   | No Actions for 1 round                          | 🟠 (Icon only)          |

---

## Spells (Spells.md + element files)

| Aspect                                       | Status | Implementation Details                  |
| -------------------------------------------- | ------ | --------------------------------------- |
| **Spell Catalog**                            | ✅     | Complete lists in 7 files (191KB)       |
| **Ring & Mastery**                           | ✅     | Tracked on spell items                  |
| **Keywords** (Jade, Craft, Defense, Thunder) | ✅     | Stored as comma-separated               |
| **Range, AoE, Duration**                     | ✅     | Tracked on spell items                  |
| **Raises** (optional effects)                | ✅     | Documented in description               |
| **Affinity/Deficiency**                      | 🟠     | Stored on school, not enforced          |
| **Spell Slots** (max per ring)               | 🟡     | Max calculated, current manual          |
| **Spell Effects**                            | ❌     | Damage, conditions, buffs not automated |
| **Spell Slot Consumption**                   | ❌     | Not tracked                             |
| **Jade Keyword Free Raise** (Kuni)           | ❌     | Not automated                           |

---

## Equipment (Equipment.md, Weapons.md)

| Rule                                              | Status | Implementation Details         |
| ------------------------------------------------- | ------ | ------------------------------ |
| **Armor TN Bonus**                                | ✅     | Applied automatically          |
| **Armor Reduction**                               | ✅     | Tracked, applied to damage     |
| **Armor TN Penalties** (Athletics, Stealth)       | ✅     | Auto-applied per armor type    |
| **Weapon Damage** (DR+Strength)                   | ✅     | Calculated in weapon-roll.js   |
| **Weapon Keywords** (Samurai, Peasant, Size)      | 🟠     | Stored, not enforced           |
| **Weapon Reach** (small 1', medium 4', spear 6')  | ❌     | Not tracked                    |
| **Arrow Types** (armor pierce, flesh cutter, etc) | ✅     | Modifiers in game-data.js      |
| **Peasant Weapon Honor Loss**                     | ❌     | Not enforced                   |
| **Thrown Weapons**                                | 🟡     | Athletics rolls, not automated |

---

## Fear System (Combat_and_Wounds.md)

| Rule                                          | Status | Implementation Details           |
| --------------------------------------------- | ------ | -------------------------------- |
| **Fear Rank** (1-10)                          | ✅     | Tracked on NPCs                  |
| **Fear TN** (5+5×rank)                        | ✅     | Calculated in fear-system.js     |
| **Willpower Roll**                            | ✅     | Executed in fear.js              |
| **Honor Bonus**                               | ✅     | Added to roll total              |
| **Failure Penalty** (-XkO)                    | 🟡     | Chat message, manual application |
| **Catastrophic Failure** (flee/cower if -15+) | 🟡     | Chat warning, GM adjudication    |
| **Duration** (until encounter end)            | ❌     | Not tracked                      |

---

## Mounted Combat (Dueling_Grappling_Conditions.md)

| Rule                                       | Status | Implementation Details                            |
| ------------------------------------------ | ------ | ------------------------------------------------- |
| **Mounted Status**                         | ✅     | Active Effect available                           |
| **Attack Bonus** (+1k0 vs unmounted)       | 🟡     | Calculated in mounted-combat.js, not auto-applied |
| **Full Attack Restriction** (need Horse 3) | ✅     | Checked in mounted-combat.js                      |
| **Horsemanship Checks**                    | ❌     | Not prompted                                      |
| **Horse Statistics**                       | ❌     | Not implemented                                   |
| **Mounting/Dismounting Actions**           | ❌     | Not tracked                                       |

---

## School Techniques (Clan files)

| Aspect                                     | Status | Implementation Details              |
| ------------------------------------------ | ------ | ----------------------------------- |
| **School Benefit**                         | 🟠     | Documented, manual trait adjustment |
| **Starting Skills**                        | 🟠     | List provided, manual item creation |
| **Starting Honor**                         | ✅     | Set from school item                |
| **Starting Outfit**                        | ❌     | Not automated                       |
| **Affinity/Deficiency**                    | 🟠     | Stored, not enforced                |
| **Technique Ranks**                        | ❌     | Not tracked or validated            |
| **Rank Requirements** (Insight thresholds) | ❌     | Not enforced                        |
| **Technique Effects**                      | ❌     | Described, not automated            |

**Example Schools in Rules:**

- Crab: Hida Bushi, Kuni Shugenja, Yasuki Courtier, Hiruma Bushi
- Crane: Daidoji Iron Warrior, Doji Courtier, Kakita Bushi, Asahina Shugenja
- Dragon: Mirumoto Bushi, Kitsuki Investigator, Togashi Monk, Agasha Shugenja
- _All 8 Great Clans with 3-5 schools each = 30+ schools_

---

## Dueling & Grappling (Dueling_Grappling_Conditions.md)

| Mechanic                    | Status | Implementation Details                    |
| --------------------------- | ------ | ----------------------------------------- |
| **Iaijutsu Duel**           | ❌     | Three-stage system not implemented        |
| **Assessment Stage**        | ❌     | Iaijutsu (Assessment)/Awareness           |
| **Focus Stage**             | ❌     | Iaijutsu (Focus)/Void with Center bonuses |
| **Strike Stage**            | ❌     | Standard attack with damage               |
| **Grapple Initiation**      | ❌     | Jiujutsu vs Armor TN                      |
| **Grapple Maintenance**     | ❌     | Contested Jiujutsu each round             |
| **Grapple Escape**          | ❌     | Contested Jiujutsu or Athletics           |
| **Grapple Control Actions** | ❌     | Pin, choke, throw not implemented         |

---

## XP & Advancement (Character_Creation_and_Advancement.md)

| Rule                                | Status | Implementation Details                    |
| ----------------------------------- | ------ | ----------------------------------------- |
| **Trait XP Cost** (4×new_rank)      | ✅     | xp-system.js, xp-costs.js                 |
| **Void XP Cost** (6×new_rank)       | ✅     | xp-system.js                              |
| **Skill XP Cost**                   | ✅     | xp-costs.js constants                     |
| **School Skill Discount**           | ✅     | Detected via flags, cost reduced          |
| **Family Bonus Trait** (free ranks) | ✅     | Recognized for XP tracking                |
| **Advantage XP Cost**               | ✅     | Tracked on item                           |
| **Disadvantage XP Gain**            | ✅     | Tracked on item                           |
| **Disadvantage 10 Point Limit**     | ❌     | Not enforced                              |
| **XP Audit Trail**                  | ✅     | Complete log in flags                     |
| **Insight Calculation**             | ✅     | Rings×10 + Skills with optional auto-rank |

---

## Summary Statistics

| Category           | ✅ Fully | 🟡 Partial | 🟠 Foundation | ❌ Not Impl | Total |
| ------------------ | -------- | ---------- | ------------- | ----------- | ----- |
| **Core Mechanics** | 15       | 8          | 5             | 7           | 35    |
| **Combat**         | 6        | 5          | 1             | 12          | 24    |
| **Skills**         | 4        | 2          | 2             | 10          | 18    |
| **Advantages**     | 0        | 0          | 2             | 52+         | 54+   |
| **Disadvantages**  | 0        | 0          | 1             | 52+         | 53+   |
| **Spells**         | 5        | 2          | 1             | 5           | 13    |
| **Social**         | 1        | 0          | 6             | 6           | 13    |
| **Advanced**       | 0        | 0          | 0             | 12          | 12    |
| **TOTAL**          | 31       | 17         | 18            | 156+        | 222+  |

**Coverage:**

- **14%** Fully Automated
- **8%** Partially Automated
- **8%** Foundation Exists
- **70%** Not Implemented

**Note:** This count is conservative and includes only rules with clear mechanical effects. The actual number of unimplemented rules is higher when including variants, special cases, and narrative mechanics.
