# Lantern Night at Kosaten Mura

An original four-session scenario for the Stage 18 playtest (`roadmap/STAGE-18-PLAYTEST.md`). Kosaten Mura, a Crane-held market town, holds its lantern festival. The Emerald Magistrate Otomo Sadahiro sends two young samurai to collect the autumn rice tax the Mantis merchant Yoritomo Ashina owes. Session 1 is the magistrate's court and the merchant's excuses; session 2 is the road to the merchant's storehouse, an ambush by Kuroda Jubei's bandits and a gaki; session 3 is a duel with the Lion rival Matsu Kenji over the debt, then a roadside shrine where the maho-tsukai Chuda Mareshi has been bleeding travelers.

Every beat is played from its seat's own client through the real UI, so permissions are real. Each beat names the manifest entries (`tools/coverage/manifest.json`) it uses; `coverage.md` lists every `automated` entry with its beats. Rules are cited as `game-rules/<file>, p.N` with printed pages; this script never quotes the book. Expected numbers come from the builds in **Characters**; when a sheet differs, recompute from the cited page and the same formula, and log the difference.

After each beat, each client's console is read (Claude in Chrome `read_console_messages`); the beats do not repeat it.

## Seats

| Seat | Foundry user | URL                      |
| ---- | ------------ | ------------------------ |
| GM   | Gamemaster   | `http://localhost:30000` |
| P1   | Player 1     | `http://127.0.0.1:30000` |
| P2   | Player 2     | `http://127.0.0.2:30000` |

P1 plays Kakita Ryo and P2 plays Tsumugi Hana; the GM runs every other actor. Ernie can take any seat.

## Characters

Built in session 0 from the Stage 15 packs. Starting XP follows `48_character_creation_expanded.md`, p.102-104: 40 XP, Disadvantages add their value up to 10, a Trait rank costs 4 × the new rank, the Void Ring 6 × the new rank, a Skill rank the new rank, an Emphasis 2, an Advantage its cost, a kata or kiho its Mastery Level, and no Trait or Skill above 4. The system prices it the same way (`module/utils/xp-ledger.js`): a Family or School TraitAdjust raises the shown Trait for free and leaves the stored rank at 2, so a bought rank of that Trait is priced at the shown new rank; School Skills at rank 1 and a School's Emphasis are free.

### Kakita Ryo (P1)

| Part | Value (pack entry names) |
| --- | --- |
| Clan, Family, School | Crane; Kakita (+1 Agility); Kakita Bushi School (+1 Reflexes), extra Skill choice Horsemanship |
| Traits (shown) | Stamina 2, Willpower 2, Reflexes 3, Awareness 3, Strength 2, Perception 2, Agility 3, Intelligence 2 |
| Rings | Earth 2, Air 3, Water 2, Fire 2, Void 2 (2 Void Points) |
| Skills | Kenjutsu 3 (Katana), Iaijutsu 2 (Focus), Kyujutsu 1, Etiquette 2, Sincerity 2, Tea Ceremony 2, Horsemanship 1, Defense 3, Athletics 1, Lore: Bushido 1, Lore: Heraldry 1; no Investigation |
| Technique | The Way of the Crane (School Rank 1) |
| Kata | Striking as Air, Breath of Wind Style |
| Advantage | Seven Fortunes' Blessing (Benten) |
| Disadvantages | Sworn Enemy (Matsu Kenji), Idealistic |
| Equipment | Katana, Wakizashi, Yumi, Riding Armor (lent by Moto Batu with the pony; worn from session 2), Backpack, Hakama, Rokugani Pony (item); 10 koku |
| Honor, Glory, Status | Honor 6.5 (Kakita Bushi, p.109), Glory 1.0, Status 1.0 |
| Derived | Insight 129 (Rings 11 × 10 + 19 Skill ranks), Insight Rank 1; Initiative 4k3+4 (Insight Rank 1 + Reflexes, keep Reflexes, plus twice Iaijutsu from The Way of the Crane) |
| Combat | Armor TN 20 unarmored, 24 in Riding Armor on foot, 32 mounted; Reduction 4 in the armor. Kenjutsu attack 6k3; Katana damage 5k2, +1k0 from Kenjutsu's Rank 3 Mastery |
| Wounds | Earth 2, multiplier 2: Healthy 10, Nicked 14, Grazed 18, Hurt 22, Injured 26, Crippled 30, Down 34, Out 38 |

XP math (total 45 = 40 + Sworn Enemy 3 + Idealistic 2):

| Purchase                                                           | XP     |
| ------------------------------------------------------------------ | ------ |
| Awareness 2→3 (4 × 3)                                              | 12     |
| Kenjutsu 1→2, 2→3                                                  | 2 + 3  |
| Iaijutsu 1→2                                                       | 2      |
| Etiquette 1→2, Sincerity 1→2, Tea Ceremony 1→2                     | 2 each |
| Defense 0→1, 1→2, 2→3                                              | 1+2+3  |
| Athletics, Lore: Bushido, Lore: Heraldry 0→1                       | 1 each |
| Kenjutsu Emphasis: Katana                                          | 2      |
| Seven Fortunes' Blessing (Benten), 4 less 1 by its Crane Cost rule | 3      |
| Striking as Air (Mastery 3)                                        | 3      |
| Breath of Wind Style (Mastery 3)                                   | 3      |
| **Spent**                                                          | **45** |

XP manager breakdown: Base 40, Disadvantages 5, Traits 12, Skills 24 (22 in ranks, 2 for the Emphasis), Advantages 3, Kata 6; "Used / total" 45/45. Free: Agility and Reflexes (TraitAdjust), the seven School Skills at rank 1, Iaijutsu's Focus Emphasis. The session 3 award (+4) leaves 4, and S3.44 spends 3 of it.

### Tsumugi Hana (P2)

| Part | Value (pack entry names) |
| --- | --- |
| Clan, Family, School | Phoenix; Tsumugi (GM-authored Family in the world compendium Kosaten Mura, TraitAdjust +1 Perception); Isawa Shugenja School (+1 Intelligence), choices Lore: Spirit Realms and Courtier |
| Traits (shown) | Stamina 2, Willpower 2, Reflexes 2, Awareness 3, Strength 2, Perception 3, Agility 2, Intelligence 4 |
| Rings | Earth 2, Air 2, Water 2, Fire 2, Void 2 (2 Void Points) |
| Skills | Calligraphy 2 (Cipher), Lore: Theology 2, Medicine 2, Meditation 2, Spellcraft 2, Lore: Spirit Realms 1, Courtier 1, Lore: Shugenja 1, Athletics 0 (kept for an Unskilled Roll). No Kenjutsu, Defense, Jiujutsu, Investigation, or Etiquette |
| Technique | Isawa's Gift, Affinity Fire, no Deficiency |
| Spells | Sense, Commune, Summon (School); Fire Mastery 1: Fury of Osano-wo, The Fires That Cleanse, Fires of Purity; Water Mastery 1: Path to Inner Peace, Reflections of Pan Ku; Air: Blessed Wind; Earth: Jade Strike; plus Rejuvenating Vapors (Water, Mastery 2), a scroll from her sensei and the spell above her School Rank |
| Spell slots | Air 2, Earth 2, Fire 2, Water 2, Void 2 (each Ring's rank, `66_magic_and_spell_casting.md`, p.163) |
| Advantage | Friend of the Elements (Air) |
| Disadvantage | Ascetic |
| Equipment | No armor. Wakizashi, Tanto, Backpack, Kimono, Lantern (Paper), Medicine Kit; 4 koku and 3 bu after the stalls |
| Honor, Glory, Status | Honor 4.5 (Isawa, p.124), Glory 1.0, Status 1.0 |
| Derived | Insight 113 (Rings 10 × 10 + 13 Skill ranks), Insight Rank 1; Initiative 3k2; casting pools Fire 4k2 (Ring 2 + School Rank 1 + Affinity 1), Water, Air, Earth 3k2 |
| Combat | Armor TN 15, Reduction 0. Unskilled Wakizashi attack 2k2 (Agility); Wakizashi damage 4k2 |
| Wounds | As Ryo's (Earth 2, multiplier 2) |

XP math (total 42 = 40 + Ascetic 2):

| Purchase | XP |
| --- | --- |
| Friend of the Elements, 4 less 1 by the GM's Cost rule for the shugenja price (`64_advantages.md`, p.149) | 3 |
| Awareness 2→3 (4 × 3) | 12 |
| Intelligence shown 3→4, stored 2→3 (4 × 4) | 16 |
| Spellcraft, Meditation, Lore: Theology, Medicine, Calligraphy 1→2 | 2 each |
| Lore: Shugenja 0→1 | 1 |
| **Spent** | **42** |

XP manager breakdown: Base 40, Disadvantages 2, Traits 28, Skills 11, Advantages 3; "Used / total" 42/42. Free: Perception and Intelligence +1 (TraitAdjust), the seven School Skills at rank 1, Calligraphy's Cipher Emphasis. Spells cost nothing until memorized (`66_magic_and_spell_casting.md`, p.164). The session 3 award (+4) is spent exactly by S3.45 (1) and S3.46 (3). Air stays 2 after Awareness 3 because Reflexes is 2; Fire stays 2 after Intelligence 4 because Agility is 2.

### Brother Taiko (GM, PC-type actor)

A Four Temples Monk of the Brotherhood, the kiho user. No PC takes a kiho: `87_kiho.md`, p.266 keeps kiho to the Brotherhood by default, and the shugenja route there is an optional rule this campaign does not adopt.

| Part | Value |
| --- | --- |
| School | Four Temples Monk (+1 Awareness), choices Medicine, Investigation; a GM TraitAdjust Void +1 on his owned School for the monk's Void 3 (`80_brotherhood_of_shinsei.md`, p.231) |
| Traits | Awareness 3, all others 2; Rings Earth 2, Air 2, Water 2, Fire 2, Void 3 |
| Skills | The School's Skills at rank 1 as the pack grants them, with Medicine and Investigation as its choices |
| Kiho | Air Fist (Air, Mastery 3, Internal), To the Last Breath (Void, Mastery 3, Kharmic), Touch the Void Dragon (Void, Mastery 4, Internal); session 3 adds Song of the World (Void, Mastery 3, Kharmic) |
| Gear | Bo (the monk outfit, p.231) |
| Derived | Insight 117, Insight Rank 1; Initiative 3k2 |

XP math: the three starting kiho are free (p.231), but the system prices every kiho at its Mastery Level (`xp-system.js`, `xpItemsOf`). A Cost rule cannot make them free: a kiho's own rules never apply while it is only owned (`KihoData.rulesActive` is false, and `module/documents/actor/rules.js` collects item rules only from items whose rules are active), an activated kiho's effect carries no item id for a `self` Cost, and a Cost rule on his School with selector `item:kiho` would also zero the bonus kiho session 3 buys. So the GM enters a manual +10 XP ("Three starting kiho (p.231)"): total 40 + 10 = 50, spent Kiho 3 + 3 + 4 = 10, Void free (School TraitAdjust). Mastery is checked by hand (no pack kiho carries a Mastery prerequisite): Air 2 + School Rank 1 = 3 for Air Fist, Void 3 + 1 = 4 for the Void kiho. Session 3: +4 award, Song of the World +3, a bonus kiho within his School Rank 1.

### Matsu Kenji (GM, PC-type actor), the Lion rival

The duel (`module/services/combat/duel.js`) reads any actor: Iaijutsu from its Skill items, `system.insightRank`, `system.armorTn.current`, and a weapon tied to Iaijutsu or Kenjutsu. A PC-type actor works, so Kenji stays the session 0 build.

| Part | Value |
| --- | --- |
| Build | Lion; Matsu (+1 Strength); Matsu Berserker School (+1 Strength; it replaced Akodo Bushi School), choices Iaijutsu, Defense; Ancestor Akodo |
| Traits | Strength 4, all others 2 (Akodo Bushi's +1 Perception leaves with that School, S0.47); Rings all 2, Void 2 |
| Skills | Iaijutsu 3, Kenjutsu (Katana) 1, Battle, Jiujutsu, Kyujutsu, Lore: History, Defense 1 |
| Gear | Katana, Wakizashi, Light Armor (equipped): Armor TN 20, Reduction 3 |
| Derived | Insight Rank 1; duel pools Assessment 5k2, Focus 5k2, Strike 5k2; Katana damage 7k2 plus his Honor Rank (The Lion's Roar) |

XP: not budgeted (GM NPC). Purchases: Iaijutsu 1→2, 2→3 = 5.

### Chuda Mareshi (GM, PC-type actor), the maho-tsukai

PC-type because the NPC sheet renders no spell rows. Spider; Chuda (+1 Intelligence); Chuda Shugenja School (+1 Willpower), choice Sincerity; Technique Blood Like Water (its Affinity left blank). Earth 2, Fire 2, Agility 2, Void 2, Insight Rank 1. Spells Sense, Commune, Summon (School), Bleeding (Fire, Mastery 1, maho), Pain (Earth, Mastery 2, maho). Shadowlands Taint Rank 4, 7 points, recorded in the Ledger in S0.49. XP: not budgeted; nothing bought.

### Yoritomo Ashina (GM, PC-type actor), the Mantis merchant

Mantis; Yoritomo (+1 Stamina); Yoritomo Courtier School (+1 Willpower), choice Sailing. Intimidation raised to 2 for session 1 (pool (2 + Awareness 2)k2), Commerce (Appraisal). XP: not budgeted; Intimidation 1→2 = 2.

### Otomo Sadahiro (GM, PC-type actor), the magistrate

Imperial; Otomo (+1 Intelligence); Otomo Courtier School (+1 Awareness), choice Lore: History; Alternate Path Emerald Magistrate, added past its prerequisites by the GM. He rolls nothing in play. XP: not budgeted; nothing bought.

### Kuroda Jubei (GM, PC-type actor), the bandits' leader

A ronin: no Clan or Family; Ronin Path Forest Killers (+1 Agility), weapon choice Spears. Agility 3, Stamina 2. Yari, Ashigaru Armor (equipped): Armor TN 18, Reduction 1. Forest Killers adds his Stamina to each Wound Rank and to melee damage. Initiative 3k2. XP: not budgeted; nothing bought.

### Kumo (GM, PC-type actor), the bandit archer

PC-type so he can hold a bow. No Clan or School. Perception 3, all other Traits 2, Void 2; Kyujutsu 2; Yumi and Ashigaru Armor (equipped): Armor TN 18, Reduction 1; Initiative 3k2. XP: not budgeted; Perception 2→3 = 12, Kyujutsu 0→2 = 3.

### Gonta and Shiro (GM, NPC-type actors), the bandits

Built on the NPC sheet: every Trait 2 except Strength 3, Void Ring 2; Armor TN 18, Reduction 1 (ashigaru armor in the typed TN); Initiative left at 0 and 0, so each rolls 3k2 (Ernie's ruling: an NPC with no stored pool counts as Insight Rank 1); Wound mode Formula, Wound Ranks 3, Earth multiplier 2 (Healthy 10, Nicked 14, Out 18); Attack 1 "Club" 5k2 Complex with Damage 1 4k2; Attack 2 "Grab" 4k2 Complex with no damage.

### Creatures (GM, imported from the creatures pack)

| Creature | Page | Use |
| --- | --- | --- |
| Gaki | p.325 | Session 2: the shozai-gaki that hunts the bandits' camp |
| Zombie | p.331 | Session 3: the shrine's dead porter |
| Rokugani Pony | p.322 | Sessions 2-3: Ryo's mount; ownership Player 1 = Owner, so P1 plays its kick |

### Festival NPCs (GM, PC-type actors)

Built in session 0 for the School and Clan pack entries the PCs did not take; the GM may use them as colour.

| NPC | Build |
| --- | --- |
| Hida Genzo | Crab / Hida / Hida Bushi School; Tetsubo, Heavy Armor. The magistrate's yojimbo |
| Bayushi Kaede | Scorpion / Bayushi / Bayushi Courtier School. A courtier at court |
| Kasuga Hotaru | Tortoise / Kasuga / Kasuga Smuggler School; Stealth 2. Ashina's agent |
| Moto Batu | Unicorn / Moto / Moto Bushi School; Scimitar, Gaijin Riding Horse. The stablemaster who lends Ryo the pony and the Riding Armor |
| Kitsuki Mitsu | Dragon / Kitsuki / Togashi Tattooed Order; Bamboo tattoo. A wanderer |

## Session 0: The party

The GM sets up the table: two empty PC actors, and a world compendium holding the one item the GM writes by hand, the Tsumugi Family. Each player builds a character on their own client: Clan, Family, and School from the compendium browser, Disadvantages and Advantages, starting XP spent on the sheet and read back in the XP manager, a kata or spells, equipment, and starting Honor. The GM checks the GM-only and permission paths, then builds every NPC the later sessions use.

Conventions for every beat:

- "Browser" is the compendium browser: Compendium sidebar tab, the **Browse** button in its header (`templates/apps/compendium-browser-open.hbs`). **Add** on a row puts the item on the seat's roll actor (`getRollActor`: a controlled token first, then the user's assigned Character). No seat controls a token in this session.
- Choice dialogs are `templates/dialogs/choice-dialog.hbs`, titled "`<item>: <prompt>`", button **Choose**.
- A skill rank is set on the skill's own sheet: the row's edit control (pen icon, `data-action="edit-item"`), tab **Details**, field **Rank**.

### Scene 0.A: The table (GM, then each player)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S0.1 | GM | Actors sidebar, **Create Actor**. Name "Kakita Ryo", type list, pick the PC type. Repeat for "Tsumugi Hana". | The create-document dialog lists the subtypes as "PC" and "NPC" (`TYPES.Actor`). Each sheet opens with all eight Traits at 2, Void Ring 2, Clan and School blank, Insight Rank 1, Insight 100, XP "0/40", and the Background section reading "No Clan, Family, or School yet." | `48_character_creation_expanded.md p.102-104`; `49_improving_your_character.md p.104-105` |
| S0.2 | GM | Each PC: right-click in the Actors sidebar, **Configure Ownership**. Kakita Ryo: Player 1 Owner. Tsumugi Hana: Player 2 Owner. Default: Limited on both. | Saved with no notification. | — |
| S0.3 | P1, P2 | Each on their own client: Players list, own name, **User Configuration**, **Character**: pick their own PC, save. | Each list offers only actors the user can observe: P1 sees Kakita Ryo under Owner, not Tsumugi Hana (Limited is below Observer). The avatar shows beside the field after saving. | — |
| S0.4 | GM | Compendium sidebar, **Create Compendium**: label "Kosaten Mura", type Item. Right-click it, **Configure Ownership**: Player = Observer. Open it, **Create Entry**, type list: Family, name "Tsumugi". On its sheet open tab **Rules**: rule-key select **TraitAdjust**, **Add rule**. On the TraitAdjust card set trait `per`, value `1`. Click **Edit as JSON**, read, then **Edit as forms**. Close. | The type list labels read from `TYPES.Item` ("Family"). The new card starts with a valid default trait and value 0; after the edit the card shows no error line. The JSON view shows one object with `"key": "TraitAdjust"`, `"trait": "per"`, `"value": 1`; switching back keeps it (`module/sheets/rules-editor.js`, `toggle-rules-view`). | `48_character_creation_expanded.md p.102-104` |
| S0.5 | P1, P2 | Each: Compendium sidebar, **Browse**. Tab **Creatures**. Then tab **Clans and families**, Name search "Tsumugi". | Creatures tab: "Entries: 0" and "Nothing matches." (the creatures pack is GM-only, `system.json` ownership PLAYER NONE). Clans tab: one row "Tsumugi", "Family", source line ending "Kosaten Mura", with an **Add** button. | `48_character_creation_expanded.md p.102-104` |

### Scene 0.B: Kakita Ryo (P1)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S0.6 | P1 | Browser, tab **Clans and families**: Type = Clan, Group = Great Clans, Name "Crane", **Add**. Clear filters, Name "Kakita", **Add** on the Family row. | Sheet header Clan reads "Crane". Agility shows 3 (the Family's TraitAdjust), stored Agility stays 2. Background lists the Crane and Kakita rows. XP stays "0/40" (a Family bonus is free). Insight 100 (Fire is the lower of Agility 3 and Intelligence 2). The Page filter offers printed pages only, no "0" for the GM-authored Family (#95). | `48_character_creation_expanded.md p.102-104`; `51_crane_schools.md p.109-111` |
| S0.7 | P1 | Tab **Schools and Techniques**: Group = Crane. **Add** on "Kakita Bushi School". Dialog "Kakita Bushi School: One more Bugei or High Skill": read the options, pick "Horsemanship (Skills)", **Choose**. | No "A second School" dialog (no School yet). Header School "Kakita Bushi School"; Reflexes 3. Skills section: Etiquette, Iaijutsu, Kenjutsu, Kyujutsu, Sincerity, Tea Ceremony, Horsemanship, each rank 1 with the School badge, visible on the darker rows too (#88); Iaijutsu's Emphases cell "Focus". Techniques section: The Way of the Crane only, not Speed of Lightning. Chat note: "Kakita Ryo gains The Way of the Crane from Kakita Bushi School (School Rank 1)." XP "0/40". Insight 107. The choice list leaves out Iaijutsu and Kenjutsu, which the School already grants (p.102, #85). | `48_character_creation_expanded.md p.102-104`; `51_crane_schools.md p.109-111`; `58_skills_overview.md p.134`; `59_high_skills.md p.135-139`; `60_bugei_skills.md p.139-143` |
| S0.8 | P1 | Same tab, Group = Advanced Schools. Click the name "Kenshinzen" (opens its sheet), tab **Rules**. Close it, then **Add** on the Kenshinzen row. | The sheet opens read-only for an Observer: the Prerequisite card's fields are disabled and no **Add rule** button shows. **Add**: warning "Kenshinzen needs: Fire 4, Void 4, Meditation 5, Lore: Bushido 4, Iaijutsu 5; beat a Kenshinzen in a fair duel"; nothing is added and no School dialog opens (prerequisites are checked first, `module/services/purchase.js`). | `84_advanced_schools_and_alternate_paths.md p.245-246`; `84_advanced_schools_and_alternate_paths.md p.247-257` |
| S0.9 | P1 | Tab **Advantages and Disadvantages**: Type = Disadvantage, Kind = Social, **Add** "Sworn Enemy" (the foe is Matsu Kenji, session 3). Kind = Mental, **Add** "Idealistic". | Disadvantages section: Sworn Enemy (Social, 3), Idealistic (Mental, 2). XP header "0/45": Disadvantages add their XP, up to the cap. | `63_advantages_and_disadvantages.md p.145`; `63_advantages_and_disadvantages.md p.146`; `65_disadvantages.md p.156-162` |
| S0.10 | P1 | Type = Advantage, Kind = Spiritual, Cost = 4. **Add** "Seven Fortunes' Blessing (Benten)". | The Kind and Cost selects list only values the tab's entries hold. Advantages section row: Spiritual, cost 4 (the printed price). XP header "3/45": the Advantage's Cost rule takes 1 off for a Crane (`clan:crane`). | `63_advantages_and_disadvantages.md p.146`; `64_advantages.md p.146-155` |
| S0.11 | P1 | Tab **Kata**: Ring = Air, Mastery Level = 3. **Add** "Striking as Air". | Warning "Kakita Ryo needs: Air 3"; not added (Air is the lower of Reflexes 3 and Awareness 2). | `48_character_creation_expanded.md p.102-104`; `86_kata.md p.259` |
| S0.12 | P1 | Ring-and-Trait block: Awareness up arrow once. Then **Add** "Striking as Air" again, then **Add** "Breath of Wind Style". | Awareness 3; Air Ring disc 3; every Void Point dot filled, as many as the Void Ring (p.78, #91). XP "15/45" (Awareness to 3 costs 12). Both kata added: Kata section rows Air, 3, each with the play control (`toggle-activation`); XP "21/45". Breath of Wind Style's prerequisite (Air 3 and Kakita or Bayushi Bushi) is met. Insight 117. | `48_character_creation_expanded.md p.102-104`; `86_kata.md p.259`; `86_kata.md p.259-260` |
| S0.13 | P1 | Tab **Skills**: Skill type = Bugei, **Add** Defense and Athletics; Skill type = High, **Add** Lore: Bushido, Lore: Heraldry. Then set ranks on each skill's sheet: Kenjutsu 3, Iaijutsu 2, Etiquette 2, Sincerity 2, Tea Ceremony 2, Defense 3, Athletics 1, Lore: Bushido 1, Lore: Heraldry 1. | Added skills arrive at rank 0 with no School badge and cost nothing until ranked. Each rank above the School's free rank costs the new rank: XP ends at "43/45". Row pools (Skill rank plus Trait, keep Trait, `prepareSkillFormula`): Kenjutsu 6k3, Iaijutsu 5k3, Defense 6k3, Athletics 3k2. The Trait filter names Void like every other Trait (#89). | `48_character_creation_expanded.md p.102-104`; `58_skills_overview.md p.133`; `59_high_skills.md p.135-139`; `60_bugei_skills.md p.139-143` |
| S0.14 | P1 | Kenjutsu's sheet, **Details**, Emphases: click **Manage Emphases** (read the list, close), then tick "Katana" in the Emphases checkboxes. | The emphasis manager lists Kenjutsu's offered Emphases with the pack's six checked. After ticking, the row's Emphases cell reads "Katana" and XP reads "45/45" (an Emphasis beyond the free one costs 2). | `58_skills_overview.md p.133`; `48_character_creation_expanded.md p.102-104` |
| S0.15 | P1 | XP header, chart icon (**Open the XP manager**). Click the sort headers of Purchases once each. | "Used / total" 45/45. Breakdown: Base 40, Disadvantages 5 (cap 10; the cap button and **Add XP** are the GM's only, #92), Traits 12, Skills 24, Advantages 3, Kata 6. Purchases include "Awareness 2→3" +12, "Kenjutsu 1→2" +2, "Kenjutsu 2→3" +3, "Iaijutsu 1→2" +2, "Defense 2→3" +3, "Kenjutsu - Emphasis: Katana" +2, "Seven Fortunes' Blessing (Benten)" +3, "Striking as Air" +3, "Breath of Wind Style" +3, "Sworn Enemy" -3, "Idealistic" -2. Sorting reorders the rows and marks the sorted head; the Amount column sorts by size, ignoring sign; "No XP added or taken away by hand." under Adjust XP. | `48_character_creation_expanded.md p.102-104`; `63_advantages_and_disadvantages.md p.145` |
| S0.16 | P1 | Read the sheet header. | Insight Rank 1, Insight 129 (Rings 11 × 10 + 19 Skill ranks). No lock button beside the Insight Rank on P1's client (GM only). | `48_character_creation_expanded.md p.102-104`; `49_improving_your_character.md p.104-105` |
| S0.17 | P1 | Hover the Defense row; look for its expand control and read the details. | The row has an expand control; expanded, it shows Defense's Rank 3 Mastery line, though the pack's Defense has no description or rules summary (#83). | `60_bugei_skills.md p.139-143` |
| S0.18 | P1 | Tab **Equipment**: Type = Weapon, Group = Swords, **Add** Katana and Wakizashi; Group = Bows, **Add** Yumi; Type = Armor, **Add** Riding Armor (lent by Moto Batu with the pony; the outfit's Light Armor stays at home); Type = Item, Group = Goods, **Add** Backpack; Group = Clothing & Accessories, **Add** Hakama. | Browser rows show "DR 3k2" for the Katana and "Armor TN +4, Reduction 4" for Riding Armor. Weapons section: Katana damage 5k2 (weapon dice plus Strength 2), attack 6k3; Wakizashi 4k2; Yumi 4k2 (the lower of bow and archer Strength plus the Willow Leaf arrow, `bow-damage.js`). Armor section: Riding Armor, unequipped. Items section: Backpack, Hakama. Outfit per `51_crane_schools.md` p.109. | `74_weapons.md p.200-205`; `75_miscellaneous_equipment.md p.205-207` |
| S0.19 | P1 | Armor row: tick Equipped; read the Armor section. Untick it (Ryo wears it on the road, from session 2). | Equipped: Armor TN 20 → 24, Reduction 0 → 4 (`73_armor.md` p.198). Unticked: 20 and 0 again. | `73_armor.md p.198` |
| S0.20 | P1 | Katana row damage roll button. Read the dialog, close it with the window's X. | The roll dialog lists a modifier from Kenjutsu, +1k0 (its Rank 3 Mastery rule on Kenjutsu weapons, `src/packs/skills.json`, reached through `collect.js`). Closing posts no card. | `60_bugei_skills.md p.139-143`; `74_weapons.md p.200-205` |
| S0.21 | P1 | Items section, calculator icon (**Manage wealth**): Add money, 10 koku (the outfit, p.109). Then browser Equipment, Group = Horses, **Add** "Rokugani Pony" (lent by the magistrate's stable; no payment). | Wealth manager "Current wealth" and the sheet's koku field show 10 koku. Items section lists Rokugani Pony; the pony's token in sessions 2-3 is the creature actor imported in S0.54. | `75_miscellaneous_equipment.md p.205-207` |
| S0.22 | P1 | Ranks sidebar, **Ledger**: Track Honor, Points 45, Reason "Kakita Bushi starting Honor (p.109)", **Record**. | Honor 2.0 → 6.5. The ledger lists the entry once, applied as asked: Idealistic's Ledger rule only changes losses (`43_honor.md` p.90-92). | `65_disadvantages.md p.156-162`; `43_honor.md p.90-92` |

### Scene 0.C: Tsumugi Hana (P2)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S0.23 | P2 | Browser, **Clans and families**: Type = Clan, **Add** "Phoenix". Name "Tsumugi", **Add** on the Kosaten Mura row. | Header Clan "Phoenix". Perception 3, stored 2 (the GM's TraitAdjust). Background lists Phoenix and Tsumugi. XP "0/40". | `48_character_creation_expanded.md p.102-104`; `55_phoenix_schools.md p.123-125` |
| S0.24 | P2 | **Schools and Techniques**, Group = Phoenix, **Add** "Isawa Shugenja School". Dialog "One Lore Skill": read the list, pick Lore: Spirit Realms. Dialog "One High Skill": "Courtier (Skills)". | Intelligence 3. Skills at rank 1 with the badge: Calligraphy (Cipher), Lore: Theology, Medicine, Meditation, Spellcraft, Lore: Spirit Realms, Courtier. Techniques: Isawa's Gift. Spells section: Sense, Commune, Summon, each with the any-element cast label. Chat note: Tsumugi Hana gains Isawa's Gift (School Rank 1). Insight 107. The Lore list also offers Lore: Theology, which the School already grants (To check in play). | `48_character_creation_expanded.md p.102-104`; `55_phoenix_schools.md p.123-125`; `59_high_skills.md p.135-139` |
| S0.25 | P2 | **Advantages and Disadvantages**, Kind = Ancestor, **Add** "Doji". | Warning "Tsumugi Hana needs: Crane Clan"; not added. The One Ancestor prerequisite is met, so it is not listed. | `83_ancestors.md p.242-244`; `64_advantages.md p.146-155` |
| S0.26 | P2 | Kind = Spiritual, **Add** "Friend of the Elements"; dialog "Friend of the Elements: Ring whose spirits aid you": Air (Reflexes, Awareness), **Choose**. Type = Disadvantage, Kind = Mental, **Add** "Ascetic". | Advantage row Spiritual, cost 4; XP "4/40": the pack prices it 4 for everyone, and its shugenja price is only in its rules summary. Disadvantage row Ascetic (Mental, 2); XP "4/42". | `63_advantages_and_disadvantages.md p.145`; `63_advantages_and_disadvantages.md p.146`; `64_advantages.md p.146-155`; `65_disadvantages.md p.156-162` |
| S0.27 | GM | Open Tsumugi Hana's sheet, Advantages section, edit Friend of the Elements, tab **Rules**: rule-key select **Cost**, **Add rule**; selector `self`, value `@cost - 1`, no predicate (the shugenja price, `64_advantages.md` p.149). Close. | The Cost card shows no error line. XP header "3/42" on the GM's view and on P2's sheet: a `self` Cost on an owned Advantage prices that item (`getCostPricer`, `module/utils/xp-ledger.js`). | `64_advantages.md p.146-155`; `48_character_creation_expanded.md p.102-104` |
| S0.28 | P2 | Awareness up arrow once; Intelligence up arrow once. Open the XP manager. | Awareness 3 (Air stays 2: Reflexes 2); Intelligence 4 (Fire stays 2: Agility 2). XP "31/42". Purchases: "Awareness 2→3" +12, "Intelligence 3→4" +16 (4 × the shown new rank 4; the ranks the sheet shows, #87). | `48_character_creation_expanded.md p.102-104` |
| S0.29 | P2 | Browser **Skills**, High: **Add** Lore: Shugenja. Bugei: **Add** Athletics and leave it at 0. Ranks: Spellcraft 2, Meditation 2, Lore: Theology 2, Medicine 2, Calligraphy 2, Lore: Shugenja 1. | XP "42/42". Athletics row: rank 0, pool 2k2; S1.25 rolls it Unskilled (`30_skill_rolls_expanded.md` p.80). Calligraphy pool 6k4. | `58_skills_overview.md p.133`; `59_high_skills.md p.135-139` |
| S0.30 | P2 | Courtier's sheet, **Details**; then Lore: Shugenja's. | Courtier: School Skill ticked, Social Skill ticked, with the hint about `skill-tag:social`. Lore: Shugenja: both clear, and no badge on its row. | `58_skills_overview.md p.134` |
| S0.31 | P2 | Techniques row Isawa's Gift, edit, **Details**: Affinity = Fire; Deficiency left blank. | Saved; the Rank field is hidden on a shugenja Technique. | `55_phoenix_schools.md p.123-125` |
| S0.32 | P2 | Browser **Spells**: Maho = No. Ring = Fire, Mastery Level = 1: **Add** Fury of Osano-wo, The Fires That Cleanse, Fires of Purity. Ring = Water: Path to Inner Peace, Reflections of Pan Ku. Ring = Air: Blessed Wind. Ring = Earth: Jade Strike. Ring = Water, Mastery Level = 2: Rejuvenating Vapors (a scroll from her sensei, above her School Rank, for session 3). | Rows read "Fire, Mastery Level 1" and so on (the School's 3, 2, 1, 1 split, `55_phoenix_schools.md` p.124). Spells section cast pools: Fire 4k2 (Ring 2 plus School Rank 1 plus the Affinity), Water 3k2, Air 3k2, Earth 3k2; rows show the casting pool, not a TN. XP unchanged (only memorized spells cost XP). | `55_phoenix_schools.md p.123-125`; `66_magic_and_spell_casting.md p.163-164` |
| S0.33 | P2 | Spells section title, slot counts: read them; click Water once, then right-click Water once. | Before: Air, Earth, Fire, Water, Void each 2, each Ring's rank, as a rest sets them (`module/services/rest.js`). Click: Water 3; right-click: Water 2. Tooltip: "Water spell slots: 3 (click: +1, right-click: -1)". | `48_character_creation_expanded.md p.102-104`; `66_magic_and_spell_casting.md p.163-164` |
| S0.34 | P2 | Browser **Equipment**: **Add** Wakizashi, Tanto, Backpack, Kimono. **Manage wealth**: Add money, 5 koku (the Isawa outfit, p.124). Remove money 9 bu. Convert "koku to bu" once. Remove money 2 bu. Browser: **Add** Lantern (Paper) and Medicine Kit (bought at the festival stalls). No armor. | Wakizashi damage 4k2 (Strength 2), Tanto 3k1. Removing 9 bu with no bu warns "Insufficient funds for this transaction" and changes nothing. One koku becomes 5 bu; removing 2 bu leaves 4 koku and 3 bu. Items section lists the four goods. Armor section empty; Armor TN 15. | `74_weapons.md p.200-205`; `75_miscellaneous_equipment.md p.205-207` |
| S0.35 | P2 | **Ledger**: Honor, 25 points, "Isawa starting Honor (p.124)". | Honor 2.0 → 4.5. | `48_character_creation_expanded.md p.102-104`; `43_honor.md p.90-92` |
| S0.36 | P2 | Read the header. | Insight Rank 1, Insight 113. XP "42/42". | `48_character_creation_expanded.md p.102-104`; `49_improving_your_character.md p.104-105` |

### Scene 0.D: Checks across the seats

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S0.37 | GM | Open Kakita Ryo's sheet. Click the lock button after the Insight Rank (**Type the Insight Rank in**), read, click it again. | The GM sees the lock; P1 never does. First click: the rank becomes a number field showing 1, on both clients. Second click: computed text 1 again. | `48_character_creation_expanded.md p.102-104`; `49_improving_your_character.md p.104-105` |
| S0.38 | P2 | Actors sidebar, open Kakita Ryo. | The Limited view: name and portrait only (`templates/actor/_partials/_limited.hbs`). | — |
| S0.39 | GM | Kakita Ryo's sheet, XP manager, click "cap 10". Dialog "Set Disadvantage cap": 2, **Set cap**. Then set it back to 10. | P1's XP manager shows neither the cap button nor **Add XP** (#92). With cap 2: Disadvantages line 2, "Used / total" 45/42 on the GM's window and P1's sheet header. Back to 10: 45/45. | `63_advantages_and_disadvantages.md p.145` |
| S0.40 | Ernie on P1 | The one person gesture (Stage 18 acceptance): a real mouse drag of "Tea Set" from the browser's Equipment tab onto Kakita Ryo's sheet; then a drag of the same entry from the Equipment compendium window. Delete both copies. | Each drop goes through `createPurchasedItem` and adds a Tea Set to Items. Deleting removes it. | `75_miscellaneous_equipment.md p.205-207` |

### Scene 0.E: The GM builds the NPCs

Build procedure for each named PC-type NPC: Actors sidebar, **Create Actor**, type PC (the NPC sheet shows no Techniques, Advantages, spells, kata, kiho, or tattoos, and PC-type actors keep the purchase flow and XP), owned by the GM only. Then the GM's own **User Configuration**, **Character**: that actor, so the browser's **Add** targets it. No token is controlled. XP on these actors is not budgeted. At the end (S0.55) the GM clears the Character field.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S0.41 | GM | "Otomo Sadahiro", the magistrate: Clan Imperial, Family Otomo, School Otomo Courtier School (High choice: Lore: History). Then Schools tab, Group = Alternate Paths, **Add** "Emerald Magistrate"; in "Prerequisites not met" click **Add anyway**. | Awareness 3; Courtier (Manipulation), Intimidation (Control) among the School Skills; Technique The Voice of Heaven. The GM, unlike a player, is asked: dialog text "Otomo Sadahiro needs: Investigation 3, Lore: Law 3, appointed Emerald Magistrate (Imperials may skip one Skill)" with **Add anyway** and **Cancel**. After it: Reduction 1 (half of Honor Rank 2, rounded up). | `79_imperial_families.md p.227-230`; `84_advanced_schools_and_alternate_paths.md p.247-257` |
| S0.42 | GM | "Hida Genzo", the magistrate's yojimbo: Crab, Hida, Hida Bushi School (Bugei choice: Kyujutsu). Equipment: Tetsubo, Heavy Armor, equipped. Tetsubo damage button, read, close with the window's X. | Stamina 3, Strength 3. Heavy Weapons (Tetsubo) rank 1, free. Armor TN 25, Reduction 5. Damage dialog lists The Way of the Crab +1k0. | `50_crab_schools.md p.105-108`; `74_weapons.md p.200-205`; `73_armor.md p.198` |
| S0.43 | GM | "Bayushi Kaede", a Scorpion courtier at court: Scorpion, Bayushi, Bayushi Courtier School (High choice: Lore: Heraldry). | Agility 3 (Family), Awareness 3 (School). Courtier (Gossip), Sincerity (Deceit); Technique Weakness Is My Strength. | `56_scorpion_schools.md p.126-127, 129`; `59_high_skills.md p.135-139` |
| S0.44 | GM | "Yoritomo Ashina", the Mantis merchant who owes the tax: Mantis, Yoritomo, Yoritomo Courtier School (choice: Sailing). Intimidation's Rank to 2. XP manager. | Stamina 3, Willpower 3. Commerce (Appraisal) and Sailing listed with the Merchant type on their sheets. Intimidation row Low type, pool 4k2 (Awareness 2). Technique Duty Before Honor. XP manager purchase "Intimidation 1→2" +2. | `54_mantis_schools.md p.120-122`; `61_merchant_skills.md p.143-144`; `62_low_skills.md p.144-145` |
| S0.45 | GM | "Kasuga Hotaru", Ashina's Tortoise agent: Clan Tortoise (Group Minor Clans), Family Kasuga, Kasuga Smuggler School (choice: Sleight of Hand). Stealth's Rank to 2. XP manager. Sincerity roll button, read the dialog, **Cancel**. | Perception 3, Awareness 3. Stealth and Sleight of Hand show the Low type. XP manager purchase "Stealth 1→2" +2. The roll dialog offers "Way of the Tortoise: dealing with heimin or hinin" (+2k0), unticked. | `77_minor_clans.md p.215-225`; `78_school_tags_expanded.md p.227`; `62_low_skills.md p.144-145` |
| S0.46 | GM | "Moto Batu", the stablemaster who lends the pony and the Riding Armor: Unicorn, Moto, Moto Bushi School (Bugei: Kyujutsu; any: Animal Handling). Equipment: Scimitar, Gaijin Riding Horse. | Agility 3, Strength 3. Kenjutsu (Scimitar) and Horsemanship among the School Skills; Technique The Way of the Unicorn; Scimitar damage 5k3. | `57_unicorn_schools.md p.129-132`; `75_miscellaneous_equipment.md p.205-207` |
| S0.47 | GM | "Matsu Kenji", the Lion rival: Lion, Matsu. **Add** Akodo Bushi School (choice: Iaijutsu; Battle is not offered, the School grants it, #85). Then **Add** Matsu Berserker School: "A second School" comes before its choices (#93), click **Replace**; choices Iaijutsu, Defense. Iaijutsu Rank 3. Kind = Ancestor: **Add** Akodo; then **Add** Ikoma and click **Cancel**. Equipment: Katana, Wakizashi, Light Armor (equipped). Read the header. | After Akodo Bushi: Perception 3, The Way of the Lion. The dialog reads "Matsu Kenji already studies at Akodo Bushi School. Replace it, or add Matsu Berserker School as another School...". After **Replace**: Akodo Bushi School, its Technique, its +1 Perception, and the Skills it made are gone; Matsu's Skills (Kenjutsu with Katana) and The Lion's Roar arrive; Strength 4 (Family and School). Akodo ancestor adds; its "Akodo: Bugei Skills" +1k0 shows in the Kenjutsu roll dialog, not Iaijutsu's. Ikoma: "Matsu Kenji needs: One Ancestor"; **Cancel** adds nothing. Armor TN 20, Reduction 3; Insight Rank 1 (the TN of Ryo's Assessment in S3.4). | `53_lion_schools.md p.116-119`; `83_ancestors.md p.242-244`; `84_advanced_schools_and_alternate_paths.md p.245-246` |
| S0.48 | GM | "Kitsuki Mitsu", a tattooed Dragon at the festival: Dragon, Kitsuki, Togashi Tattooed Order (Lore: Theology; non-Low: Investigation). Browser **Kiho and tattoos**, Type = Tattoo, **Add** Bamboo. Tattoos row play control; read Armor TN; play control again. | Void 3 (the School's TraitAdjust), Awareness 3. Technique Blood of the Kami. Bamboo active: Armor TN +7 (twice School Rank 1, plus 5), an effect lasting 2 Rounds; ended: Armor TN back. | `52_dragon_schools.md p.112-115` |
| S0.49 | GM | "Chuda Mareshi", the maho-tsukai: Clan Spider, Family Chuda, Chuda Shugenja School (choice: Sincerity). Browser **Spells**, Maho = Yes: **Add** Bleeding and Pain. Ranks sidebar, **Ledger**: Track Taint, Points 47, Reason "Years of blood magic", **Record**. | Intelligence 3 (Family), Willpower 3 (School); Earth 2, Fire 2, Void 2. Lore: Maho, Lore: Shadowlands, Stealth show the Low type; Sincerity rank 1 with the badge. Spells Sense, Commune, Summon, Bleeding (Fire 1, maho), Pain (Earth 2, maho); Technique Blood Like Water. Taint track Rank 4, 7 points; S3.32 reads what it does to his Void Points. | `76_spider_clan.md p.211-213, 215`; `62_low_skills.md p.144-145`; `89_shadowlands_taint.md p.275, 277-279` |
| S0.50 | GM | "Brother Taiko", Four Temples Monk: no Clan. Schools tab, Group = Brotherhood, **Add** Four Temples Monk (choices: Medicine, Investigation). Open his owned School, **Rules**, **Add rule** TraitAdjust: trait `void`, value 1. Browser **Kiho and tattoos**, Type = Kiho: **Add** Air Fist, To the Last Breath, Touch the Void Dragon (each Mastery Level is checked against Ring plus School Rank, p.261, #90: Air 2 + 1 meets 3, Void 3 + 1 meets 3 and 4). Equipment: **Add** Bo (the monk outfit, p.231). XP manager: read the breakdown; then Adjust XP: 10, note "Three starting kiho (p.231)", **Add XP**. | Awareness 3, Reflexes 2, Air 2; Void 3 with three dots and no Void line in XP (a School bonus is free). Technique Soul of Civility. Kiho section rows: Air Fist (Air, 3), To the Last Breath (Void, 3), Touch the Void Dragon (Void, 4), each with the play control. Before the entry: Kiho 10, "Used / total" 10/40 (every kiho priced at its Mastery Level, To check in play). After: Manual adjustments 10, 10/50. Insight 117. | `80_brotherhood_of_shinsei.md p.231`; `87_kiho.md p.261` |
| S0.51 | GM | "Kuroda Jubei", ronin bandit leader: no Clan or Family. Schools tab, Group = Ronin Paths, **Add** Forest Killers (weapon choice: Spears). Equipment: Yari, Ashigaru Armor (equipped). Yari damage button, read, close with the window's X. | Agility 3. Athletics, Defense, Hunting, Kenjutsu, Kyujutsu, Stealth, Spears at rank 1; the weapon choice leaves out Kenjutsu and Kyujutsu (#85). Each Wound Rank holds 2 more Wounds (his Stamina, p.234): thresholds 12, 18, 24, .... Armor TN 18, Reduction 1. The damage dialog lists Forest Killers adding his Stamina to the total on a melee weapon. | `81_ronin.md p.233-235` |
| S0.52 | GM | Actors sidebar, **Create Actor**, type NPC, "Gonta": every Trait 2 except Strength 3, Void Ring 2; Armor TN 18, Reduction 1; Initiative left at 0 and 0; Wound configuration: mode Formula (a keyboard choice saves, #86), Wound Ranks 3, Earth multiplier 2; edit the two attack rows a new NPC already has: "Club" 5k2 Complex with damage 4k2, "Grab" 4k2 Complex with no damage. Duplicate the actor and rename the copy "Shiro". | The NPC sheet starts in manual wound mode; after the configuration its Wound Ranks table reads Healthy 10, Nicked 14 (+3), Out 18. Initiative shows 3k2 (S2.2 reads why). Grab's row has no damage button (#94). Both actors in the sidebar, GM only. | `31_combat_round.md p.81-82`; `33_wounds.md p.82` |
| S0.53 | GM | "Kumo", the bandit archer, type PC, no Clan or School: Perception up arrow once. Browser Skills, Bugei, **Add** Kyujutsu, Rank 2. Equipment: Yumi, Ashigaru Armor (equipped). | Perception 3, Water 2. Kyujutsu row 4k2. Armor TN 18 (15 + 3), Reduction 1. XP purchases "Perception 2→3" +12, "Kyujutsu 0→1" +1, "Kyujutsu 1→2" +2 (not budgeted). | `74_weapons.md p.200-205`; `73_armor.md p.198` |
| S0.54 | GM | Browser **Creatures**: **Import** Gaki, Zombie, and Rokugani Pony. Right-click Rokugani Pony in the Actors sidebar, **Configure Ownership**: Player 1 = Owner. | Three NPC actors in the Actors sidebar, each NPC sheet header showing the creature's page citation (p.325, p.331, p.322). P1's Actors sidebar now lists the pony. Players still see no Creatures rows (S0.5). | `99_creatures.md p.321-325, 327-331` |
| S0.55 | GM | Own User Configuration: clear Character (release button). | The GM has no roll actor; a browser **Add** now warns "Select a token or assign a character to add items to". | — |

## Session 1: Court

Lantern Night has filled Kosaten Mura. Magistrate Otomo Sadahiro holds court in the town hall to settle one matter: the Yoritomo trading house owes the town its autumn rice tax and has paid none of it. The Mantis merchant Yoritomo Ashina comes in person, all smiles and excuses. Kakita Ryo and Tsumugi Hana question him, read his tally sheets, stand up to his threats, and show their worth at the festival. At the end the magistrate hands down Honor, Glory, and Status.

**Letters in the expected results** are the acting character's ranks as their sheet shows them: `A` Awareness, `P` Perception, `I` Intelligence, `W` Willpower, `Ag` Agility, `V` Void Ring, `H` Honor Rank, `K` Kenjutsu, `S` the Skill's rank. With the session 0 builds: Ryo `A` 3, `P` 2, `W` 2, `Ag` 3, `V` 2, `H` 6, `K` 3; Hana `A` 3, `P` 3, `I` 4, `W` 2, `V` 2, `H` 4. A card's formula is the Roll & Keep formula `module/utils/check.js` writes (for example `5d10xa10k3+0`): `xa10` means 10s explode, `r1` means 1s are re-rolled once, and the number after `+` is the flat bonus.

No kiho is used in this session. Ryo's Riding Armor stays unequipped in town (S0.19), so no armor line joins his Agility and Reflexes rolls.

### Before play

| Need | Detail |
| --- | --- |
| Seats | GM, P1, P2 logged in at once on their loopback hosts (**Seats**) |
| Assigned characters | Player 1 has Kakita Ryo as assigned character and owns him; Player 2 the same for Tsumugi Hana (S0.3). Check links and the request card roll for the assigned character when no token is controlled (`getRollActor`, `module/services/dice/resources/void-points.js`) |
| NPCs | Otomo Sadahiro rolls nothing. Yoritomo Ashina rolls Intimidation from his PC-type sheet (rank 2, S0.44) |
| Scene | The court scene active. Tokens are optional; when a player controls a token, it must be their own character's |

### GM prep: the court docket journal

The GM creates a Journal Entry **Kosaten Mura: Court Docket** with one text page, and sets its ownership to **Observer** for all players. Page text (the GM's own wording; any text works as long as the two links stay):

> The clerk has entered one matter for the Lantern Night session. The Yoritomo trading house owes the town its autumn rice tax and has paid none of it. Its agent, Yoritomo Ashina, answers for it in person. The magistrate allows the samurai to examine the house's tally sheets.
>
> @Check[skill=Investigation|trait=per|tn=30]
>
> @Check[skill=Etiquette|trait=wil]{Resist the merchant's threats}

The first link is a Skill Roll with a TN; the second names a Trait other than Etiquette's own (Awareness) and no TN, for the Contested Roll (syntax: `module/utils/link-syntax.js`). TN 30 keeps Hana's Unskilled roll (three dice that never explode, S1.7) short of success except on three 10s.

### Scene 1.A: Before the court opens

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.1 | GM | Game Settings > Configure Settings > System Settings: tick **Optional rule: Honor Roll**, Save Changes. | The setting saves. From now on a failed Skill, Trait, Ring, or Spell Casting card shows an **Honor Roll** button (`isHonorRollOffered`, `module/services/dice/check/card.js`). | `43_honor.md p.90-92` |
| S1.2 | GM | Create the **Kosaten Mura: Court Docket** journal above; Configure Ownership: All Players **Observer**; open the page in view mode. | Each link renders as a button with a d10 icon: "Investigation / Perception, TN 30" and "Resist the merchant's threats". Beside each is a speech-bubble request button (tooltip "Ask the players to roll this"), GM only. No link renders broken. | `29_types_of_rolls.md p.79-80` |
| S1.3 | P1, P2 | Journal sidebar: open **Kosaten Mura: Court Docket**. | Both links render as d10 buttons with the same text; **no** request button beside them (`canRequest` is GM only, `module/setup/enrichers.js`). | `29_types_of_rolls.md p.79-80` |
| S1.4 | P1, P2 | Open own character sheet; read the Traits and Rings block. | Each Elemental Ring equals the lower of its two Traits: Ryo Air 3 (Reflexes 3, Awareness 3), Fire 2 (Agility 3, Intelligence 2); Hana Air 2 (Reflexes 2, Awareness 3), Fire 2 (Agility 2, Intelligence 4), Water 2 (Strength 2, Perception 3). The Void Ring shows 2 Void Point dots, all filled. | `25_rings_and_traits.md p.76-78` |

### Scene 1.B: The magistrate's welcome

The magistrate greets the samurai. Hana reads the room; Ryo assures the magistrate of the Crane's goodwill.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.5 | P2 | GM announces Awareness, TN 15 (Average, `24_target_numbers.md`, p.76). Sheet: click the **Awareness** Trait roll button. In the dialog set TN 15, Raises 2, Free Raises 1; click **Roll**. | Dialog: Pool 3k3; Raises hint "Up to 2." (the Free Raise does not raise the cap); Free Raises field with hint "Spent on the TN, up to 1." (Friend of the Elements, Air). Card: "Awareness Roll", formula `3d10xa10k3+0`, the three dice kept; "Success" or "Failure against TN 20" (15 + 2 × 5 − 5), "(Raises: 2)", "(Free Raises spent on the TN: 1)"; no "Free Raises: N" line left. A total of 15 to 19 shows **Failure**: it missed the raised TN. | `23_roll_and_keep.md p.75`; `24_target_numbers.md p.76`; `28_raises.md p.79`; `29_types_of_rolls.md p.79-80` |
| S1.6 | P1 | GM announces Sincerity / Awareness, TN 15. Sheet Skills section: click the roll button on the **Sincerity** row. Leave Benten's optional "Persuading, not coercing" unticked. Set TN 15, tick **Spend a Void Point (+1k1) (2)**; click **Roll**. | Dialog: Pool 5k3. Card: "Skill Roll: Sincerity / Awareness [Void]", formula `6d10xa10k4+0`; outcome against TN 15. Ryo's Void Point dots drop 2 → 1 on P1's sheet and on the GM's view of it. No "one per Round" warning: outside combat nothing is counted (`buildVoidUseUpdate`, `module/services/effects/uses.js`). | `23_roll_and_keep.md p.75`; `25_rings_and_traits.md p.76-78`; `27_skills_in_rolls.md p.79`; `29_types_of_rolls.md p.79-80` |

### Scene 1.C: The merchant's tally sheets

Yoritomo Ashina blames storms, thieves, and a clerk who has since died. The magistrate lets the samurai examine his tally sheets.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.7 | P2 | Journal: click **Investigation / Perception, TN 30**. In the dialog set Raises 1, leave both Void boxes unticked; click **Roll**. | Dialog: Pool 3k3, TN prefilled 30, the Raises field ("Up to 2."), both Void checkboxes with the note under the Skill Rank 1 box that without it the Raises are ignored, **no** Emphasis select. Card, titled with the link's label: "Investigation / Perception, TN 30 [Unskilled]", formula `3d10k3+0` with **no** `xa10` (a 10 does not roll again), "Failure against TN 30" with **no** Raises note: the declared Raise was dropped. Only three 10s reach 30; on any other result the card shows the **Honor Roll** button (repeat on three 10s). | `24_target_numbers.md p.76`; `28_raises.md p.79`; `29_types_of_rolls.md p.79-80`; `30_skill_rolls_expanded.md p.80` |
| S1.8 | P1 | Chat: click **Honor Roll** on Hana's card from S1.7. | Warning "You do not have permission to modify this actor"; no roll posts; Hana's Honor is unchanged (`validateHonorRoll`, `module/services/dice/check/honor-roll.js`). | `43_honor.md p.90-92` |
| S1.9 | P2 | Chat: click **Honor Roll** on her card from S1.7. | A new card "Investigation / Perception, TN 30 [Unskilled] (Honor Roll)", formula `4d10xa10k4+0` (Honor Rank rolled and kept, dice explode, no Void, no Emphasis), against the same TN 30. If it fails, Hana's Honor drops a full Rank on her sheet (4.5 to 3.5) and her Ledger gains an entry "Honor −10 Failed an Honor Roll". If it succeeds, nothing changes on the sheet. | `43_honor.md p.90-92` |
| S1.10 | P2 | Chat: click **Honor Roll** on the S1.7 card again. | Warning "Tsumugi Hana has already made an Honor Roll this session"; no roll posts. | `43_honor.md p.90-92` |
| S1.11 | P1 | Journal: click **Investigation / Perception, TN 30**. Tick **Spend a Void Point: Skill Rank 1 (1)**, set Raises 1; click **Roll**. | Card: "Skill Roll: Investigation / Perception" with **no** [Unskilled] mark (Ryo has no Investigation); modifier line "Spend a Void Point: Skill Rank 1 +1k0"; formula `3d10xa10k2+0` (dice explode); "(Raises: 1)", TN 35. Ryo's Void Point dots drop 1 → 0, so later dialogs disable his Void checkboxes (S1.26). | `25_rings_and_traits.md p.76-78`; `28_raises.md p.79`; `30_skill_rolls_expanded.md p.80` |
| S1.12 | P2 | GM announces Calligraphy / Intelligence, TN 20, to read the coded column of the tallies. Sheet: **Calligraphy** row roll button. Set TN 20; in **Emphasis** pick **Cipher**; click **Roll**. | Card: "Skill Roll: Calligraphy / Intelligence (Emphasis: Cipher)", formula `6d10r1xa10k4+0`. In the dice tooltip each die that first showed 1 is struck out with its re-roll beside it; a re-roll that shows 1 again stays (once only). If no die showed 1, P2 rolls again from the row until one does (**Re-roll, keep the better** keeps a high first roll, so its card may never show the 1). | `27_skills_in_rolls.md p.79`; `29_types_of_rolls.md p.79-80`; `58_skills_overview.md p.133` |

### Scene 1.D: Threats in open court

Caught out, the merchant drops his smile and threatens the samurai's families. Each samurai resists in turn.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.13 | GM | Open Yoritomo Ashina's sheet; Skills: click the **Intimidation** row's roll button. Leave TN 0 and Raises 0; click **Roll**. | Card: "Skill Roll: Intimidation / Awareness", pool 4k2, with a total and **no** TN line (a roll with no TN, `getTn`). | `24_target_numbers.md p.76`; `29_types_of_rolls.md p.79-80` |
| S1.14 | GM | Journal: click the request button beside **Resist the merchant's threats**. Then, with no token selected, click **Roll with my character** on the card that posts. | A chat card "The GM asks for a roll", text "Resist the merchant's threats", button "Roll with my character" (d10 icon), seen in all three clients. The GM's own click warns "Select a token or assign a character to roll this link" (no assigned character since S0.55). | `29_types_of_rolls.md p.79-80` |
| S1.15 | P1 | Chat: click **Roll with my character** on the request card. In the dialog tick **Social resistance (+6)** (tooltip "For a roll that resists Intimidation or Temptation."), leave Benten's optional modifier unticked, set Raises 1, leave TN 0; click **Roll**. | Dialog: Pool 4k2 with Etiquette's rank and **Willpower**, from the link; the Void box disabled ("No Void Points left", S1.11). Card, titled with the link's label: "Resist the merchant's threats", modifier line "Social resistance +6", formula `4d10xa10k2+6`, "(Raises: 1)" with **no** TN line: a roll with no TN keeps its Raises for the Contested Roll (p.80, #98). | `27_skills_in_rolls.md p.79`; `28_raises.md p.79`; `29_types_of_rolls.md p.79-80`; `43_honor.md p.90-92` |
| S1.16 | P1 | Chat: right-click own card from S1.15 > **Contested Roll**. | A "Contested Roll" card lists "Yoritomo Ashina: N" and "Kakita Ryo: M (Raises: 1)". Ryo's Raise counts his total as M − 5: he wins when M − 5 is above N, and also when it equals N (Ernie's ruling, `getContestResult`, `module/utils/check.js`); otherwise "Yoritomo Ashina wins." | `29_types_of_rolls.md p.79-80` |
| S1.17 | GM | Ashina's sheet: roll **Intimidation** again, as in S1.13, now at Hana. | A second Intimidation card with no TN line. | `29_types_of_rolls.md p.79-80` |
| S1.18 | P2 | Chat: click **Roll with my character** on the same request card. Tick **Social resistance (+H)**; click **Roll**. | Hana has no Etiquette, so it is Unskilled: Pool 2k2, no Emphasis select. Card: "Resist the merchant's threats [Unskilled]", "Social resistance +H" (her Honor Rank now: 3 after a failed S1.9), formula `2d10k2+H` with **no** `xa10`. | `30_skill_rolls_expanded.md p.80`; `43_honor.md p.90-92` |
| S1.19 | P2 | Chat: right-click own card from S1.18 > **Contested Roll**. | A "Contested Roll" card for "Yoritomo Ashina" (the S1.17 roll, the latest roll by someone else) and "Tsumugi Hana"; the higher total wins; equal totals read "Tie: roll again." | `29_types_of_rolls.md p.79-80` |

GM note: S1.16 and S1.19 contest the latest roll by a different actor (`previousOpponentRollOf`), so nothing else rolls between a merchant roll and the samurai's answer.

### Scene 1.E: The festival demonstration

The magistrate adjourns to the lantern festival. Ryo shows the Kakita style before the crowd; Hana senses the kami stirring under the lanterns and climbs a lantern pole to rehang a fallen lantern; Ryo serves the magistrate tea.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.20 | P1 | Drag the **Kenjutsu** row from Ryo's sheet onto an empty hotbar slot. | A script macro "Kakita Ryo: Kenjutsu" with the Skill's icon fills the slot (`createHotbarMacro`, `module/sheets/ui/macros.js`). If Claude in Chrome's drag reaches no drop target, Ernie makes this one gesture (STAGE-18 **Acceptance**) and the log says so. | `27_skills_in_rolls.md p.79` |
| S1.21 | P1 | Click the macro. GM announces TN 15 for the opening cuts. In **Emphasis** pick **Katana**; set TN 15; click **Roll**. | Dialog: Pool 6k3, Emphasis select listing Katana (S0.14). Card: "Skill Roll: Kenjutsu / Agility (Emphasis: Katana)", formula `6d10r1xa10k3+0`; each die that first showed 1 is struck out with its re-roll beside it, once only. If no die showed 1, P1 clicks the macro again until one does (**Re-roll, keep the better** keeps a high first roll). | `27_skills_in_rolls.md p.79`; `29_types_of_rolls.md p.79-80`; `58_skills_overview.md p.133` |
| S1.22 | P1 | Click the macro again. The GM grants the crowd's cheering as a situational bonus that brings the pool to 12k4: leave Emphasis at None, set **Roll modifier** 6 and **Keep modifier** 1, TN 0; click **Roll**. | Dialog: Pool 6k3. Card: modifier line "Situational +6k1"; formula `10d10xa10k5+0`: 12k4 became 10k5, two extra rolled dice for one kept die (the book's 12k4 example, `26_special_dice_rules.md`, p.77). Ten dice in the tooltip, five kept. | `23_roll_and_keep.md p.75`; `26_special_dice_rules.md p.77`; `29_types_of_rolls.md p.79-80` |
| S1.23 | P1 | Click the macro again; set **Roll modifier** 8 and **Keep modifier** 9 (14k12); click **Roll**. | Formula `10d10xa10k10+12`: 14k12 became 10k10 + 12 (the book's 14k12 example, p.77). In S1.22 or S1.23, a die that came up 10 shows a total of 11 or more in the tooltip (it rolled again and added), and the card's total includes it. If neither roll shows a 10, P1 right-clicks the card > **Re-roll, keep the better** until one does. | `23_roll_and_keep.md p.75`; `26_special_dice_rules.md p.77` |
| S1.24 | P2 | Drag the **Air** Ring from Hana's sheet onto an empty hotbar slot; click the new macro "Tsumugi Hana: Air". GM announces TN 15. Leave **Cast as a spell** unticked; set TN 15; click **Roll**. | Dialog: Pool 2k2, with the Spell Casting fieldset (unticked). Card: "Ring Roll: Air", formula `2d10xa10k2+0`, outcome against TN 15. The drag fallback is the same as S1.20. | `24_target_numbers.md p.76`; `25_rings_and_traits.md p.76-78`; `29_types_of_rolls.md p.79-80` |
| S1.25 | P2 | GM announces Athletics, TN 10, to climb a lantern pole. Sheet: **Athletics** row (rank 0) roll button. Set TN 10; click **Roll**. | Dialog: Pool 2k2 (rank 0 plus Strength 2), the Raises field with the Void-on-the-Skill hint, the "Spend a Void Point: Skill Rank 1" box, no Emphasis select. Card: "Skill Roll: Athletics / Strength [Unskilled]", formula `2d10k2+0` with **no** `xa10`. An Unskilled Roll started from the sheet row, not a link. | `29_types_of_rolls.md p.79-80`; `30_skill_rolls_expanded.md p.80` |
| S1.26 | P1 | GM announces Tea Ceremony, TN 15. Sheet: **Tea Ceremony** row roll button. Type 3 in Raises; set TN 15; click **Roll** with the mouse (not Enter). | Dialog: Pool 4k2 (Tea Ceremony 2, Void 2); Ryo spent both Void Points in S1.6 and S1.11, so the Void checkbox is disabled with the tooltip "No Void Points left"; Raises hint "Up to 2.". Card: "(Raises: 2)", TN 25: the extra Raise is cut to the Void Ring (`buildChosenTerms`, `module/services/dice/check/terms.js`). | `25_rings_and_traits.md p.76-78`; `28_raises.md p.79` |

### Scene 1.F: Judgment

The magistrate rules that the trading house pays in full by the next market day. He names Ryo his yoriki for the collection and praises Hana's work on the tallies.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S1.27 | GM | Open Ryo's sheet > **Ledger**. Track **Honor**; Points: the loss Table 2.3 (`43_honor.md`, p.91) gives at Ryo's Honor Rank for enduring an insult to his family, as a negative number; Reason "Endured the merchant's insult to his family"; **Record**. | Ryo's Honor points drop on the GM's sheet and live on P1's. With Idealistic, the loss is one point more than asked, and the next Ledger list shows the applied points with the asked points in brackets (for −2: "Honor −3 (−2)"). | `43_honor.md p.90-92` |
| S1.28 | GM | Ryo's **Ledger**: Track **Status**, Points 5, Reason "Named yoriki by the magistrate", **Record**. Open it again: Track **Glory**, Points 5, Reason "Glory for the Status gained" (the Glory table pairs a Status gain with an equal Glory gain, `44_glory.md`, p.93), **Record**. | Status 1.0 → 1.5; Glory 1.0 → 1.5. Both entries list newest first with their reasons. | `44_glory.md p.93`; `45_status.md p.93-95` |
| S1.29 | GM | Hana's sheet > **Ledger**: Track **Glory**, Points 4, Reason "Exposed the doctored tallies", **Record**. | With Ascetic, Glory rises by 2 (1.0 → 1.2) and the entry reads "Glory +2 (+4)". | `44_glory.md p.93` |
| S1.30 | GM | Ryo's sheet: Shift+click the **Status** value; then Shift+right-click it. | Tooltip "Shift+click: ±0.1, Shift+Ctrl+click: ±1.0". Status goes up one point (1.5 to 1.6), then back down (1.6 to 1.5). The Ledger list gains no entry: a Shift+click is a raw correction outside the ledger (`module/services/ledger.js`). | `45_status.md p.93-95` |
| S1.31 | P1, P2 | Own sheet > **Ledger**; read the list; close it with the window's close button. | P1 sees Ryo's Glory, Status, and Honor entries with reasons, newest first; P2 sees Hana's Glory entry, her starting Honor entry, and, if S1.9 failed, "Honor −10 Failed an Honor Roll". Closing records nothing. | `43_honor.md p.90-92`; `44_glory.md p.93`; `45_status.md p.93-95` |
| S1.32 | GM | Token controls: click **New session** (calendar icon); confirm **Start session**. | Chat: "A new game session has begun." in all three clients. | `43_honor.md p.90-92` |
| S1.33 | P2 | Chat: click **Honor Roll** on the S1.7 card once more. | This time it rolls (a new session gave the Honor Roll back), as in S1.9, with Hana's Honor Rank at that moment (3 after a failed S1.9); a failure costs another Rank of Honor through the Ledger. | `43_honor.md p.90-92` |

Session 1 uses (stage plan, **Scenario shape**):

- Pool over ten dice (Ten Dice Rule) -> S1.22, S1.23
- A 10 exploding -> S1.22, S1.23 (S1.5, S1.6, S1.11 when one comes up)
- Raise cap at the Void Ring -> S1.26 (hint in S1.5)
- Void Point spent -> S1.6 (+1k1), S1.11 (Skill Rank 1)
- Emphasis re-roll of 1s -> S1.12 (Hana, Cipher), S1.21 (Ryo, Katana)
- Honor Roll -> S1.8, S1.9, S1.10, S1.33
- Social resistance -> S1.15, S1.18
- Ledger change for Honor, Glory, Status -> S1.27, S1.28, S1.29
- Free Raises -> S1.5
- Unskilled Roll -> S1.7, S1.18, S1.25
- Contested Roll -> S1.16, S1.19
- Started from the sheet -> S1.5, S1.6, S1.12, S1.25, S1.26
- Started from a hotbar macro -> S1.21, S1.22, S1.23, S1.24
- Started from a Check link in a shared journal -> S1.7, S1.11
- Started from a GM request card -> S1.15, S1.18

## Session 2: The road

The party leaves Kosaten Mura for the Mantis merchant's storehouse. Where the road climbs through a cedar cut, the ronin Kuroda Jubei waits with two deserters, Gonta and Shiro, and his archer Kumo. The bandits have been sharing their camp, unwillingly, with a shozai-gaki that feeds on sweat and blood, and it comes out of the trees when the steel does. The gaki attacks whoever is nearest, bandit or samurai.

The session is one skirmish, played from the three seats' own clients: a player's write to anything they do not own (an NPC's Wounds, a status on another player's character, a flow card's state) goes to the active GM by query, so each such beat names what each client shows. No kiho is used in this session.

How to read the beats:

- Beats inside a Round run on their actor's Turn, in Initiative order. The order in the tables is one possible order; where a number depends on what happened earlier (a stance, Mounted, Guard), the expected result gives both cases.
- A coverage beat whose attack misses is played again on that actor's next Turn; beats that need its result wait for it. The skirmish runs past Round 4 until every beat has run (the **Trigger beats** fire on a result, not a Round).
- Kuroda Jubei holds back in Defense Stance in Rounds 1-3, directing his men, and takes no action the beats check; he joins the fight in Round 4 (S2.55).

### Numbers this session uses

| Value | Ryo | Hana |
| --- | --- | --- |
| Wound thresholds, Earth 2 × 2 (`33_wounds.md` p.82; `34_ambush_falling_drowning.md` p.84) | Healthy 10, Nicked 14, Grazed 18, Hurt 22, Injured 26, Crippled 30, Down 34, Out 38 | same |
| Armor TN (`32_attack_and_defense.md` p.82; `73_armor.md` p.198) | 20 base; Riding Armor +4 on foot (24), +12 mounted (32); Reduction 4 | 15; Reduction 0 |
| Initiative pool (`31_combat_round.md` p.81) | (Insight Rank 1 + Reflexes 3)k3, plus twice Iaijutsu 2 from The Way of the Crane: 4k3+4 | 3k2 |
| Attack | Kenjutsu 6k3; Katana damage 5k2, +1k0 from Kenjutsu's Rank 3 Mastery on the damage roll | Unskilled: Agility only, 2k2; Wakizashi damage 4k2 |
| Void Points | 2 | 2 |
| Honor Rank | 6 | 4 |

### Scene setup (GM and P1, before the session)

| Item | Setup |
| --- | --- |
| Scene | "Cedar Cut", a road scene with a grid. All tokens below placed on it (a drag from the sidebar; if Claude in Chrome cannot drag, Ernie makes the gesture, STAGE-18 **Acceptance**) |
| Kakita Ryo | P1's character token (linked). P1 ticks Equipped on the Riding Armor (Armor TN 24, Reduction 4) |
| Ryo's pony | Rokugani Pony token (S0.54) next to Ryo. Owner: Player 1 |
| Tsumugi Hana | P2's character token (linked) |
| Kuroda Jubei | Token from S0.51. GM only |
| Gaki | Token from S0.54. GM only |
| Gonta, Shiro | Tokens from S0.52. GM only |
| Kumo | Token from S0.53. GM only |
| Players' view | Players have no permission on the bandits or the gaki; they target those tokens but cannot select them |

### Scene 2.A: Before the skirmish

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.1 | GM | Open Hana's sheet, Wounds section, gear icon (Wound configuration). Read the Earth multiplier, then type 3, read the sheet's Wound Ranks table, and type 2 again. | At 2 the table shows Healthy 10, then each rank 4 more, Out 38, with Healthy at no penalty and each later rank's penalty as printed on p.82. At 3 Healthy stays 10 (Earth × 5 whatever the multiplier) and each later rank steps by 6 (Out 52). Back at 2 the first table returns. P2's open sheet redraws each time. | `33_wounds.md p.82`; `34_ambush_falling_drowning.md p.84` |
| S2.2 | GM | Open Gonta's sheet: Wound configuration (Formula, Wound Ranks 3, multiplier 2), the Combat section's Initiative, the Armor section. | Wound Ranks table: Healthy 10, Nicked 14 (+3), Out 18. Initiative shows 3k2: an NPC with no stored pool rolls Insight Rank 1 + Reflexes, keep Reflexes (the Initiative hint in the Combat section's configuration, its gear, says so). Armor TN 18, Reduction 1. | `31_combat_round.md p.81-82`; `33_wounds.md p.82` |
| S2.3 | GM | Open the Gaki's sheet. Click the Effects token control with the Gaki's token selected. | Citation line for p.325; Armor TN 25, Reduction 5; Attack "Claw" 4k4 (Complex), damage 3k3; Fear section with a "Fear 3" button. Wound Ranks table: Healthy 11, Nicked 23 (+5), Grazed 35 (+10), Out 36. The Effects panel lists "Special abilities"; its source sheet (the panel's open button) shows its Invulnerability and Spirit rules. | `99_creatures.md p.318-320`; `99_creatures.md p.321-325, 327-331` |
| S2.4 | P1 | Open the pony's sheet; in its Combat section click the Free/Simple movement button. | The kick attack, its damage, Armor TN, Reduction, and Initiative match the pack entry (p.322). Movement uses its Water Ring raised 3 by the Swift rule (p.320): Water 2 + 3 = 5 gives Free 25 ft, Simple 50 ft, maximum 100 ft (`37_actions.md` p.85 movement rates). P1 can edit it (owner). | `99_creatures.md p.321-325, 327-331`; `99_creatures.md p.318-320`; `37_actions.md p.85` |
| S2.5 | GM | On Kumo's sheet, a section's "+" (Add item; an empty Advantages section is hidden): name "Bandit's Knack", type Advantage. On its item sheet, Rules tab, "Add rule" with key ActionCost; selector attack, action simple, range ranged; save. | The rule saves; the item's Description tab ("What it does") says his ranged attacks take a Simple Action. No error in the GM console. | `37_actions.md p.85` |
| S2.6 | GM | Kumo's sheet, Combat section, heart icon (Condition manager): tick Fatigued. | Kumo carries Fatigued (level 1). His sheet's stance dropdown is unchanged. | `41_conditional_effects.md p.89` |
| S2.7 | GM | Kumo's sheet, Yumi row: set the Arrow select to Armor Piercing, then read the damage roll button. | The damage button reads 3k1: the bow's Strength 3 is capped by Kumo's Strength 2, plus the arrow's dice (Willow Leaf would read 4k2). | `74_weapons.md p.198-199` |
| S2.8 | P1 | Ryo's sheet, Armor section, then right-click Ryo's token, token HUD, Mounted/Higher. | Before: Armor TN 24, Reduction 4. After: Armor TN 32 (Riding Armor counts +12 on horseback). P2 and the GM see the Mounted icon on Ryo's token. | `73_armor.md p.198`; `41_conditional_effects.md p.89` |
| S2.9 | GM | The gaki steps out of the trees: the GM selects Ryo's and Hana's tokens and clicks "Fear 3" on the Gaki's sheet. | Two Willpower cards, "Fear 3 test against Gaki", rolled on the GM's client with no dialog: Willpower 2k2, TN 20 (5 + 5 × 3), each with its Honor Rank as a total modifier (+6 Ryo, +2 Hana after Session 1's Honor losses). A failure adds the suffix with the -3k0 penalty and puts "Fear 3" (Feared) on that character; missing by 15 or more adds the catastrophic note. P1 and P2 see both cards. Neither player is offered a Void Point on the Raw Willpower roll (To check in play). | `42_fear.md p.90`; `99_creatures.md p.318-320` |
| S2.10 | P1, P2 | Read own Combat section Initiative. | Unfeared: Ryo 4k3+4, Hana 3k2. Feared: the -3k0 is in the pool and kept dice never exceed rolled, with 1k1 the floor: Ryo 1k1+4, Hana 1k1. | `42_fear.md p.90`; `41_conditional_effects.md p.89`; `31_combat_round.md p.81-82` |

### Scene 2.B: Round 1

Stage 1: stances, then Initiative (`31_combat_round.md` p.81).

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.11 | GM | Select every token, token HUD "Toggle Combat State"; open the Combat Tracker. | Eight combatants: Ryo, Ryo's pony, Hana, Gaki, Kuroda Jubei, Gonta, Shiro, Kumo. P1 and P2 see the same tracker. | `31_combat_round.md p.81-82` |
| S2.12 | P1 | Ryo's sheet, Combat section, Current stance: Full Attack; then Attack. | Full Attack shows the warning "Mounted/Higher rules out Full Attack Stance" (Ryo's Horsemanship 1 is below the Rank 3 that lifts it, `60_bugei_skills.md` p.140) and is still applied (the choice stays the player's); Attack then replaces it (one stance at a time). Armor TN back at 32. | `36_stances.md p.84`; `41_conditional_effects.md p.89` |
| S2.13 | P2 | Hana's sheet, Current stance: Center. | Center Stance on Hana; no change to her Armor TN (15). | `36_stances.md p.84` |
| S2.14 | GM | Stances: Gonta Full Attack, Shiro Attack, Gaki Attack, Jubei Defense; Kumo Full Attack, then Attack. | Gonta's Armor TN 18 → 8. Jubei's Armor TN 18 → 21 (Air 2 plus Defense 1). Kumo's Full Attack shows "Fatigued rules out Full Attack Stance"; Attack replaces it. | `36_stances.md p.84`; `41_conditional_effects.md p.89` |
| S2.15 | P1 | Ryo's sheet: tick "Use Void" beside Initiative. In the tracker click Ryo's die, then the pony's die. | Sheet Initiative reads 4k3+14 (1k1+14 if Feared). On P1's client a dialog asks to spend a Void Point for +10 on this roll: yes. Ryo's Void Points 2 → 1, an info toast, the checkbox clears; the tracker shows Ryo's total with the +10. The pony rolls 3k2. No dialog on the GM's or P2's client. | `31_combat_round.md p.81-82` |
| S2.16 | P2 | Click Hana's die in the tracker. | Hana rolls 3k2 (1k1 if Feared). | `31_combat_round.md p.81-82`; `42_fear.md p.90` |
| S2.17 | GM | Tracker "Roll NPCs" (not "Roll All", which would roll the players' combatants on the GM's client), then "Begin Combat". | Gaki 4k4 (its stored pool), Gonta and Shiro 3k2 each, Kumo and Jubei 3k2 (Insight Rank 1 + Reflexes 2; GM-owned PC-type actors count as NPCs here). Turn order sorted by total; Round 1 begins. | `31_combat_round.md p.81-82`; `99_creatures.md p.321-325, 327-331` |

Stage 2: Turns.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.18 | P1 | Ryo's Turn. Target the Gaki's token. Katana row, attack button. In the dialog: leave The Way of the Crane's optional "Center Stance this Round or the last" unticked; Raises 1; tick "Spend a Void Point (+1k1)"; Roll. | Dialog: pool 6k3 with "Mounted/Higher +1k0" ticked (target not mounted), Feared -3k0 if S2.9 failed; TN 25 filled from the Gaki's Armor TN; Raises up to 2 (Void Ring); a warning that a Void Point was already spent this Round (S2.15), which does not block. Card "Katana ... against Gaki" marked [Void], rolled 8k4, TN 30 with "(Raises: 1)", the note "Increased Damage: +1k0." on a hit, and a "Damage roll (Katana)" button. Ryo's Void Points 1 → 0. | `32_attack_and_defense.md p.82`; `38_maneuvers.md p.85-87`; `41_conditional_effects.md p.89` |
| S2.19 | P1 | On the hit card, "Damage roll (Katana)"; Roll. | Damage dialog with no TN, no Raises, no Void; "Increased Damage (Raises) +1k0" and Kenjutsu +1k0 (Rank 3 Mastery) listed. Card "Damage for Katana against Gaki" rolls 7k2, with "Apply to Gaki" and "Apply to selected". | `32_attack_and_defense.md p.82`; `38_maneuvers.md p.85-87`; `74_weapons.md p.198-199` |
| S2.20 | P1 | "Apply to Gaki". | P1's client writes nothing; it asks the active GM. GM: the Gaki's Wounds suffered goes up and a result card posts, "Gaki takes N Wounds from D damage", with "Reduction 5.", "Spirit: the damage is halved.", and, when the halved damage is above 1, "Invulnerability: one Wound." (so N is 1). All three clients show the card. "Reduce with Void" and "Undo" show on the GM's client; P1, who rolled, sees only "Undo"; P2 sees no buttons (decision 15). | `99_creatures.md p.318-320`; `33_wounds.md p.82`; `32_attack_and_defense.md p.82` |
| S2.21 | P1 | Pony's Turn. On Ryo's sheet set the Horsemanship row's Trait select to Awareness (the Skill's own Trait is Agility; p.322 asks for Awareness), then roll Horsemanship with TN 20 typed in the dialog. On success: target Gonta, pony sheet "Kick" attack, Roll; then its damage; then "Apply to Gonta". | Horsemanship / Awareness card, 4k3 against TN 20. A failure: the pony does not attack this Round (p.322), and the beat repeats next Round. Kick: TN 8 (Gonta in Full Attack). Damage 4k2, applied through the GM: Gonta's result card shows "Reduction 1."; Gonta's sheet marks his Wound Rank. | `99_creatures.md p.321-325, 327-331`; `36_stances.md p.84`; `32_attack_and_defense.md p.82` |
| S2.22 | GM | The GM rules the kick to the head stuns Gonta: Gonta's token HUD, Stunned. (If Gonta has not had his Turn this Round, he loses it; S2.25 then moves to Shiro.) | Gonta's Armor TN 5 (Stunned sets it to 5 plus armor, and an NPC's typed TN has no armor part). | `41_conditional_effects.md p.89` |
| S2.23 | GM | Kumo's Turn, first shot. Target Ryo. Yumi row attack button; leave "Bow at a target in melee range" unticked; Roll. | Dialog: "Ranged attack" ticked, pool 4k2. TN 32 with the hint "Fatigued +5, Armor Piercing arrow ignores armor -12": effective 25. Card notes "Simple Action (from Bandit's Knack)"; its TN line lists the same changes in parentheses (decision 17). On a hit: damage 3k1; the GM selects Ryo's token and clicks "Apply to selected": result card "Kakita Ryo takes N Wounds" with "Reduction 4.". P1 sees "Reduce with Void" only; Undo shows only on the GM, who rolled for Kumo; P2 sees no buttons (decision 15). If Ryo has a Void Point left (Kumo acted before S2.18), P1 leaves it; otherwise P1 runs trigger S2.60 here. | `74_weapons.md p.198-199`; `73_armor.md p.198`; `41_conditional_effects.md p.89`; `37_actions.md p.85`; `33_wounds.md p.82` |
| S2.24 | GM | Kumo's second shot (the Knack's Simple Action): set the Arrow select to Willow Leaf, target Hana, attack, damage, "Apply to Hana". | TN 15 + 5 (Fatigued) = 20, no arrow line (Hana wears no armor). Damage 4k2. Result card on Hana: P2 sees "Reduce with Void" (owner) and leaves it; P1 does not see it. Hana's sheet Wound Ranks table marks the current rank; her later dialogs show "Wound penalty (+3)" at Nicked, +5 at Grazed, and so on. | `74_weapons.md p.198-199`; `33_wounds.md p.82`; `37_actions.md p.85` |
| S2.25 | GM | Gonta's Turn (if not Stunned; else Shiro's). Target Hana. Club attack: Called Shot "Hand or foot (2 Raises)", location "hand", Raises 2; Roll; on a hit roll damage and "Apply to Hana". | Dialog for Gonta: "Full Attack Stance +2k1" (melee) in the modifiers, pool 7k3 (Shiro, in Attack Stance: 5k2); TN 15 + 10 = 25. Card note: Called Shot (2 Raises): hand, the GM rules any effect. No Increased Damage (both Raises paid the Called Shot). The GM rules Hana's scroll case is knocked away (story only). Damage 4k2 applied to Hana through the GM's own client. | `38_maneuvers.md p.85-87`; `36_stances.md p.84`; `32_attack_and_defense.md p.82` |
| S2.26 | GM | Shiro's Turn. Target the pony. Club attack: tick Knockdown and "Target has 4 or more legs", Raises 2; Roll. Then target Ryo and attack normally. | First roll: warning "The maneuvers cost 4 Raises ... (declared: 2)" and nothing posts (Raises are capped at the Void Ring, 2). Second: TN 32 (mounted rider in Riding Armor); a miss shows "Missed against TN 32" and no damage button. | `38_maneuvers.md p.85-87`; `32_attack_and_defense.md p.82`; `73_armor.md p.198` |
| S2.27 | GM | Gaki's Turn. Target Hana; Claw attack; damage; "Apply to Hana". | Dialog: Raises at most 0 (Void Ring 0); TN 15. Damage 3k3; result card on Hana, P2's "Reduce with Void" left unused. If this card takes Hana to Down, run trigger S2.59 now. | `99_creatures.md p.321-325, 327-331`; `33_wounds.md p.82` |
| S2.28 | P2 | Hana's Turn: Center Stance, no actions. Click "End Turn" in the tracker. | The Turn passes. If this is the Round's last Turn, P2's click ends the Round: the Center settle runs on the GM by query (S2.30 shows the same result as when the GM advances). | `36_stances.md p.84`; `31_combat_round.md p.81-82` |

Stage 3: Reactions, then the next Round.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.29 | GM | Advance past the last Turn (Next Turn / Next Round). A card "Stunned: save" posts for Gonta; the GM clicks its Roll button. Then P1 looks at the same card. | Card text: an Earth roll against TN 20. GM: Earth 2k2 against 20. Success removes Stunned; a failure keeps it to the end of Round 2 (the Effects panel shows its end). The answered card shows no Roll button, and P1 never sees one on Gonta's card (decision 15). | `31_combat_round.md p.81-82`; `41_conditional_effects.md p.89` |
| S2.30 | all | Read the tracker and Hana's Effects panel as Round 2 begins. | Hana's Initiative is 10 higher and the tracker re-sorted; Hana carries "Centered" lasting this Round. The Turn marker is on the first combatant of Round 2. | `36_stances.md p.84`; `31_combat_round.md p.81-82` |

### Scene 2.C: Round 2

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.31 | P2 | Hana's Turn. Stance: Attack. Target Gonta. Wakizashi row attack: tick "Centered" in Modifiers; leave both Void boxes unticked and Raises 0; Roll. | Dialog: pool 2k2 (Kenjutsu 0, Agility 2) with "Centered +1k1 +2" (Void Ring 2) optional, ticked; Feared -3k0 if; "Wound penalty (+N)" ticked with her current rank's penalty; the Raises field with the Void-on-the-Skill hint, the "Spend a Void Point: Skill Rank 1" box, and the maneuvers (Raises count only when that Void Point is spent, `terms.js`); TN 5 if Gonta is still Stunned (8 otherwise, his Full Attack Stance). Card marked [Unskilled], with "(Wound penalty +N)" in the TN line; dice do not explode. After the roll the Centered effect is gone (used). | `36_stances.md p.84`; `41_conditional_effects.md p.89`; `33_wounds.md p.82`; `32_attack_and_defense.md p.82`; `30_skill_rolls_expanded.md p.80` |
| S2.32 | P2 | On a hit: "Damage roll (4k2)", then "Apply to Gonta". | Applied through the GM. When Gonta's Wounds pass 18 (his Out): the card adds "Past the Out Wound Rank: marked Dead.", Gonta's token shows the Dead overlay, and his sheet's Out row is current. Below that, run S2.33-S2.34 later on the first card that takes a bandit past Out (trigger S2.57). | `33_wounds.md p.82`; `32_attack_and_defense.md p.82`; `74_weapons.md p.198-199` |
| S2.33 | P1 | On P2's Gonta result card, look for "Undo". | P1 sees no "Undo" on P2's card (decision 15): Gonta's Wounds and Dead stay, the card is unchanged, P1's console shows no error. | `33_wounds.md p.82` |
| S2.34 | P2 | Click "Undo" on the same card. GM: Gonta surrenders; remove him from the combat in the tracker. | Card greys out with "Undone.", no buttons. Gonta's Wounds return to their value before this damage and the Dead overlay is lifted. All clients redraw. | `33_wounds.md p.82` |
| S2.35 | P1 | Ryo's Turn. Stance Attack. Simple Action: dismount, removing Mounted/Higher on Ryo's token HUD. Ryo's sheet, Movement, Free/Simple button. | Armor TN 32 → 24. Movement: Free 10 ft, Simple 20 ft, maximum 40 ft (Water 2). | `37_actions.md p.85`; `73_armor.md p.198`; `41_conditional_effects.md p.89` |
| S2.36 | P1 | Second Simple Action: Guard. Select Ryo's token, target Hana's token, token controls "Guard the targeted token". | Ryo: Guarding, Armor TN 24 → 19. Hana: Guarded, Armor TN +10 (15 → 25), applied through the GM because P1 does not own Hana. Both effects end at the start of Ryo's next Turn (Effects panel). P2's sheet shows the new Armor TN. | `38_maneuvers.md p.85-87`; `37_actions.md p.85` |
| S2.37 | GM | Kumo's Turn (Kumo still Fatigued). Arrow back to Armor Piercing. Target Ryo, now on foot beside him; tick "Bow at a target in melee range"; Roll. | TN 19 - 4 (arrow ignores the armor) + 5 (Fatigued) = 20, both changes in parentheses on the card's TN line (decision 17). The card lists the -10 bow-in-melee modifier and the Simple Action note. | `74_weapons.md p.198-199`; `41_conditional_effects.md p.89`; `38_maneuvers.md p.85-87`; `37_actions.md p.85` |
| S2.38 | GM | Shiro's Turn. Stance Full Attack. Target Ryo. Club attack: Knockdown, Raises 2; Roll. On a hit **P1 clicks "Roll Contested Strength" first**, then the GM clicks it. Then the GM rolls the damage and applies it to Ryo. | Dialog: +2k1 (Full Attack, melee); TN 19 + 10 = 29 (24 if Guard has ended). Shiro's Armor TN 18 → 8. Card: Knockdown note and the "Roll Contested Strength" button. P1's click: Ryo's Strength roll (2k2) on P1's client, nothing else yet. GM's click: Shiro's Strength roll, then a note card with the winner; Shiro winning adds "Kakita Ryo is knocked Prone." and Prone on Ryo. A tie posts "Tie: roll again." and both click again. Damage is Shiro's normal 4k2. | `38_maneuvers.md p.85-87`; `36_stances.md p.84`; `41_conditional_effects.md p.89`; `29_types_of_rolls.md p.79-80` |
| S2.39 | GM | Gaki's Turn. Target Hana (Guarded). Claw; on a hit, damage and "Apply to Hana". The GM rules the blow leaves her Dazed: Hana's token HUD, Dazed. | TN 25 (15 + Guard 10). Hana's result card as in S2.27. Dazed on Hana: her next rolls carry -3k0 (not damage rolls). | `41_conditional_effects.md p.89`; `38_maneuvers.md p.85-87`; `33_wounds.md p.82` |
| S2.40 | P1 | Pony's Turn: Ryo's Horsemanship / Awareness TN 20 again (a Free Action each Round, p.322); on success, kick Shiro and apply the damage. GM: the hooves throw grit into Kumo's eyes, Kumo's token HUD, Blinded. | Horsemanship 4k3. Kick TN 8 (Shiro in Full Attack). Kumo Blinded: his base Armor TN becomes Reflexes + 5 = 7, plus armor 3: Armor TN 10 on his sheet. | `99_creatures.md p.321-325, 327-331`; `36_stances.md p.84`; `41_conditional_effects.md p.89` |
| S2.41 | P2 | The Round ends. A "Dazed: save" card posts for Hana; P2 clicks its Roll button. P1 looks at it too. | P2's client: an Earth roll against TN 20, the Dazed -3k0 in the pool (1k1 floor). Success removes Dazed; failure keeps it and the next save shows TN 15. P1 sees no Roll button on Hana's card (decision 15). Stunned (Gonta, if still in play) ends. Before Round 3: Hana left Center, so her Initiative drops 10 in the tracker. | `31_combat_round.md p.81-82`; `41_conditional_effects.md p.89`; `36_stances.md p.84` |

### Scene 2.D: Round 3

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.42 | P2 | Hana's Turn. If Dazed, pick Attack first. Then pick Full Defense. | Attack while Dazed: warning "Dazed rules out Attack Stance". (If Hana is Prone at Down, Full Defense also warns "Prone rules out Full Defense Stance"; the stance still applies.) Full Defense: a Defense / Reflexes dialog opens at once on P2's client (Unskilled: Reflexes 2k2, Raises counted only with the Void Point on the Skill; Dazed -3k0 if still Dazed). Its card posts and an effect "Full Defense (+N)" lands on Hana, N half the total rounded up; Armor TN 15 + N (+10 while Guard lasts). | `36_stances.md p.84`; `41_conditional_effects.md p.89` |
| S2.43 | P1 | Ryo's Turn. Read Hana's and Ryo's Armor TN as the Turn starts. Pick Full Attack. Then click "Guard the targeted token" with Hana targeted. | Guard's two effects end: Hana's TN drops 10, Ryo's rises 5. If Ryo is Prone (S2.38): warning "Prone rules out Full Attack Stance"; P1 then picks Attack and skips the Guard click. Otherwise Full Attack: Armor TN 24 → 14; the Guard click shows "You cannot Guard in the Full Attack Stance" and nothing changes. | `36_stances.md p.84`; `38_maneuvers.md p.85-87`; `41_conditional_effects.md p.89` |
| S2.44 | GM | Ryo smears jade powder on his blade: on Ryo's sheet open the Katana, Rules tab, Add rule DamageSource with tag "jade"; save. | The katana's rules summary names jade as a damage source. P1's sheet redraws. | `99_creatures.md p.318-320` |
| S2.45 | P1 | Target the Gaki; katana attack, Roll; on a hit, damage, then "Apply to Gaki". | Dialog: TN 25 with an "Armor +5" line (Riding Armor on foot: every Agility and Reflexes roll); pool 6k3, +2k1 in Full Attack (8k4), or -2k0 if Prone (a medium weapon); Feared -3k0 if. Damage card (5k2 plus Kenjutsu +1k0) lists "Damage sources: jade". Result card: "Reduction 5." only, no Spirit or Invulnerability note; Wounds = damage - 5. If the Gaki's total passes 11 its sheet marks Nicked and its next attack dialog shows "Wound penalty (+5)". | `99_creatures.md p.318-320`; `73_armor.md p.198`; `36_stances.md p.84`; `41_conditional_effects.md p.89`; `33_wounds.md p.82` |
| S2.46 | GM | Remove the jade rule from the katana (Rules tab, delete). | The powder is spent. The weaker later hits jade powder gives (p.320) are not automated; the GM rules them if they matter. | `99_creatures.md p.318-320` |
| S2.47 | GM | Shiro's Turn. Target Ryo. "Grab" attack with "Start a grapple (ignores armor)" ticked; Roll; on a hit click "Start grapple with Kakita Ryo". | TN = Ryo's Armor TN (24, or 14 in Full Attack) with the line "Grapple ignores armor -4"; against a Prone Ryo a "(melee) -10" line too. The card's TN line lists the same changes in parentheses (decision 17). The hit card has no damage button. The start button puts Grappled on both (Ryo's Armor TN 5 + armor 4 = 9, applied by the GM; Shiro's 5) and posts the flow card "Grapple: Shiro / Kakita Ryo", stage "Shiro is in control.", with "Control roll: Shiro", "Control roll: Kakita Ryo", Hit, Throw, Break, Pass. | `40_grappling.md p.88-89`; `41_conditional_effects.md p.89` |
| S2.48 | GM | Gaki's Turn. Target Ryo (Grappled); Claw; damage; "Apply to Kakita Ryo". P1 then clicks "Reduce with Void". | TN 9, plus the Gaki's wound penalty if it is Nicked. P1's click with Ryo at 0 Void Points: trigger S2.60. | `41_conditional_effects.md p.89`; `33_wounds.md p.82`; `99_creatures.md p.321-325, 327-331` |
| S2.49 | GM | Kumo's Turn (Blinded). Target Hana; Yumi attack. | Modifiers show "Blinded -3k3" (ranged only); the pool drops with kept dice never above rolled, 1k1 the floor. TN is Hana's Full Defense Armor TN plus 5 (Fatigued). | `41_conditional_effects.md p.89`; `74_weapons.md p.198-199` |
| S2.50 | GM | The Round ends; any save cards post and their owners roll. | A second Dazed save, if Hana is still Dazed, shows TN 15. No Stunned card (ended). | `31_combat_round.md p.81-82`; `41_conditional_effects.md p.89` |

### Scene 2.E: Round 4

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.51 | P1 | Ryo's Turn starts Grappled: on the flow card click "Control roll: Kakita Ryo". Then the GM clicks "Control roll: Shiro". P2 looks at the flow card. | P1's client: Jiujutsu / Strength, Unskilled (2k2), against Shiro; the step goes to the GM by query and the card redraws without Ryo's control button. The GM's roll (Shiro, Unskilled 3k3) settles it: the log adds who is in control (or "Tie: roll again."). P2 sees no flow buttons; P1 sees only Ryo's (decision 15). | `40_grappling.md p.88-89` |
| S2.52 | P1 or GM | The side in control acts. Ryo in control: P1 clicks Throw. Shiro in control: GM clicks Hit, rolls the damage, applies it with "Apply to Kakita Ryo". | Throw: both lose Grappled, the thrown side gets Prone, the card's stage reads "Over" with no buttons. Hit: a damage card "Hit: Unarmed" (Strength k1: 3k1 for Shiro) with "Apply to Kakita Ryo"; the log adds "Shiro hits for N."; Ryo's result card shows Reduction 4. Clicking for the side not in control: no-permission warning. | `40_grappling.md p.88-89`; `41_conditional_effects.md p.89` |
| S2.53 | P2 | Hana's Turn starts in Full Defense: a "Full Defense Stance" card posts asking for the roll; P2 clicks Roll. | The Defense / Reflexes dialog on P2's client; the new "Full Defense (+N)" replaces the old one (one effect, the new value). | `36_stances.md p.84`; `31_combat_round.md p.81-82` |
| S2.54 | GM | Kumo's Turn (Blinded): Current stance Defense on his sheet; he shoots no arrow this Turn. | Kumo's Armor TN rises by his Air Ring (2) plus his Defense rank (0): 10 → 12. Defense allows no attack, so the GM spends his Turn on a Move. | `36_stances.md p.84` |
| S2.55 | GM | Kuroda Jubei's Turn: his men are falling, so he steps in. Current stance Attack. Target Ryo; Yari row attack, Roll; on a hit, damage, then "Apply to Kakita Ryo". | Jubei's Armor TN 21 → 18 (Defense Stance left). The attack TN is Ryo's current Armor TN. The damage dialog lists "Forest Killers" +2 on the total (his Stamina, melee only); Ryo's result card shows "Reduction 4.". | `81_ronin.md p.233-235`; `32_attack_and_defense.md p.82`; `33_wounds.md p.82`; `36_stances.md p.84` |
| S2.56 | all | Play further Rounds as needed until every trigger beat below has run, then the GM's close. |  | — |

### Trigger beats

These fire on the first result that meets their condition, in whatever Round it comes.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.57 | — | (Only when S2.32 did not kill.) The first damage card from a player's roll that takes a bandit past Out. | Run S2.32's checks on it, then S2.33 with the other player and S2.34 with the roller. | `33_wounds.md p.82` |
| S2.58 | GM | A card the GM applied takes a combatant past Out: the GM clicks Undo. | The GM may undo any card; Dead is lifted and the Wounds return. | `33_wounds.md p.82` |
| S2.59 | P2 | A result card takes Hana into Down. Read Hana's token and sheet; P1 reads the card; P2 clicks "Reduce with Void" on it. | At Down: an effect "Auto: Prone" on Hana (Prone icon on her token), her Wound penalty +40, and attackers' melee dialogs show her Armor TN -10 against melee. P1's client shows no "Reduce with Void" on this card. P2's click runs on the GM: Hana's Void Points -1, her Wounds -10 (less if the card dealt fewer), the card adds "Void Point spent: 10 fewer Wounds." and its title shows the lower Wounds, the Void button is gone. Back above Down, the automatic Prone is removed. If Hana passes Out instead, the card marks her Dead; the GM clicks Undo and the beat waits for another hit. | `33_wounds.md p.82`; `41_conditional_effects.md p.89` |
| S2.60 | P1 | Ryo is at 0 Void Points and a result card lands on him: P1 clicks "Reduce with Void". | Nothing changes on Ryo or the card, and P1's client warns that no Void Points are left. | `33_wounds.md p.82` |

### Scene 2.F: Close

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S2.61 | GM | The gaki flees into the cedars and Jubei yields. Tracker: End Combat, confirm. | The combat is deleted: "Fear 3" (Feared) ends on every combatant that had it, and the sheets' Initiative pools lose the -3k0. Fatigued, Blinded, Prone from contests, and Dead stay; the GM removes what the story ends with the token HUD. | `42_fear.md p.90`; `31_combat_round.md p.81-82` |
| S2.62 | GM | Bandits bound, the party reaches the storehouse road. Every client's console is read a last time. | No error or warning from `l5r4-enhanced` beyond those the beats above say to record. | — |

Session 2 uses (stage plan, **Scenario shape**):

- Initiative -> S2.15, S2.16, S2.17; each stance -> S2.12 (Full Attack, Attack), S2.13 (Center), S2.14, S2.42 (Full Defense), S2.54 (Defense)
- Attacks against Armor TN -> S2.18, S2.23, S2.25, S2.31, S2.45, S2.55
- Damage applied by a player to an NPC they do not own -> S2.20, S2.21, S2.32
- Wound Ranks and their penalties -> S2.1, S2.2, S2.24, S2.31, S2.45
- A maneuver bought with Raises -> S2.18 (Increased Damage), S2.25 (Called Shot), S2.26 (cost refused), S2.38 (Knockdown)
- Fear -> S2.9, S2.10, S2.61; a grapple -> S2.47, S2.51, S2.52; Mounted -> S2.8, S2.12, S2.18, S2.35
- Prone at Down -> S2.59; Void spent to reduce damage -> S2.59, S2.60; undo of an applied card -> S2.33, S2.34, S2.58

## Session 3: The duel and the shrine

The Mantis merchant's debt has a second claimant. Matsu Kenji, a Lion samurai and Ryo's sworn enemy, says the rice was promised to his lord first and challenges Kakita Ryo to settle it by iaijutsu, to first blood, on the road outside Kosaten Mura. After the duel the party follows the merchant's missing porters to a roadside shrine, where Chuda Mareshi, a Spider shugenja posing as its keeper, has been bleeding travelers to feed his maho. Brother Taiko, a Four Temples monk who tends the shrine circuit, joins them. They camp that night, heal, and the GM awards XP.

Scenes: A, the duel. B, the shrine (spells, kata, kiho, the creature, maho and Taint). C, the night's rest. D, XP.

Brother Taiko and Chuda Mareshi are GM-owned PC-type actors: only the PC sheet lists kiho, kata, and spells and has the activation toggle (`templates/actor/pc.hbs`; `toggle-activation` is in `module/sheets/pc-sheet.js` alone), and the NPC sheet (`templates/actor/npc.hbs`) renders no spell rows. Matsu Kenji is a GM-owned PC-type actor too (see **Characters**). Ryo still wears the Riding Armor from session 2.

### Scene 3.A: The duel (`39_iaijutsu_dueling.md` p.87-88)

Setup: the GM places tokens for Kakita Ryo (owned by Player 1) and Matsu Kenji (GM). This is not a skirmish, so no combat is started. Per p.87 both duelists stand in Center Stance for the whole duel. The duel card does not set a stance (`module/services/combat/duel.js`), so each seat sets it by hand.

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.1 | P1 | Ryo's sheet, Stance section: set the stance select to Center Stance. | Ryo shows the Center Stance status. No console error. | `39_iaijutsu_dueling.md p.87-88` |
| S3.2 | GM | Kenji's sheet: set the stance select to Center Stance. Canvas: select Kenji's token, target Ryo's token, then click the token-controls button "Iaijutsu duel: selected token against targeted token". | A flow card titled "Iaijutsu duel" posts, stage Assessment. It has "Roll for Matsu Kenji" and "Roll for Kakita Ryo" buttons and a concede button for each duelist. All three clients see it. | `39_iaijutsu_dueling.md p.87-88` |
| S3.3 | P2 | On the duel card, click "Roll for Kakita Ryo". | Warning "You do not have permission to modify this actor". No dialog, and the card is unchanged. P2 owns neither duelist. | `39_iaijutsu_dueling.md p.87-88` |
| S3.4 | P1 | Duel card: "Roll for Kakita Ryo". In the check dialog leave Raises at 0 or declare 1, then Roll. | The dialog rolls Iaijutsu / Awareness, 5k3 (Iaijutsu 2 + Awareness 3, keep Awareness), against TN 10 + 5 × Kenji's Insight Rank 1 = 15, plus 5 per declared Raise. The card label reads "Assessment: Kakita Ryo". The Way of the Crane's optional Focus modifier is offered unticked; leave it off on Assessment. The roll card posts. P1 is not GM, so the duel card updates through the GM query: Ryo's roll button disappears and Kenji's stays. | `39_iaijutsu_dueling.md p.87-88` |
| S3.5 | GM | Duel card: "Roll for Matsu Kenji", then Roll. | Iaijutsu / Awareness 5k2 (Iaijutsu 3 + Awareness 2); TN is 10 + 5 × Ryo's Insight Rank (1 → 15). The stage moves to Focus. For each duelist the card shows "Facts {name} learns: N", where N is 0 on a failure or 1 + Raises on a success (p.87). If either total beat the other by 10 or more, a line reads "{name} gains +1k1 on Focus." The GM and P1 name the facts aloud; the card does not reveal them. | `39_iaijutsu_dueling.md p.87-88` |
| S3.6 | P1 | Duel card (Focus): "Roll for Kakita Ryo". In the dialog tick The Way of the Crane's "Focus roll, Center Stance this Round or the last" modifier and choose the Focus Emphasis, then Roll. | Iaijutsu / Void: 4k2 (Iaijutsu 2 + Void 2). The ticked modifier adds +1k1 and School Rank 1 to the total: 5k3+1. The Emphasis re-rolls 1s (`58_skills_overview.md` p.133). If Ryo won the Assessment edge, an "Assessment +10" +1k1 modifier is already in the pool. | `39_iaijutsu_dueling.md p.87-88`; `58_skills_overview.md p.133` |
| S3.7 | GM | Duel card: "Roll for Matsu Kenji" (Focus), Roll. | Iaijutsu / Void 5k2. The stage moves to Strike. If one total beat the other by 5 or more, the card reads "{name} strikes first, with N Free Raises.", N being one per further full 5 (p.87). Otherwise it reads "Kharmic strike: both strike at once." Only the first striker's button shows; after a kharmic result both show. | `39_iaijutsu_dueling.md p.87-88` |
| S3.8 | first striker's seat (P1 or GM) | Duel card: "Roll for {first striker}". In the dialog, check the Free Raises field. Roll. | Iaijutsu / Reflexes attack against the opponent's current Armor TN: Ryo 5k3 against Kenji's 20, with an "Armor +5" line from Ryo's Riding Armor on foot (`73_armor.md` p.198); Kenji 5k2 against Ryo's 24. The dialog's Free Raises field offers the N won at Focus. The roll posts as an attack card with damage and apply buttons, because the strike is resolved normally (p.87). | `39_iaijutsu_dueling.md p.87-88`; `73_armor.md p.198` |
| S3.9 | P1 (if Ryo hit) or GM | Attack card: roll damage, then on the damage card "apply to target". | Ryo's Katana damage 5k2 plus Kenjutsu +1k0 (`32_attack_and_defense.md` p.82); Kenji's 7k2 plus The Lion's Roar (his Honor Rank). If P1 applies it to Kenji, an actor P1 does not own, the write goes to the GM through the query and Kenji's sheet shows the Wounds. | `39_iaijutsu_dueling.md p.87-88`; `32_attack_and_defense.md p.82` |
| S3.10 | GM | The duel was to first blood. If Kenji was struck first, the GM does not click Kenji's strike: striking after first blood is dishonorable (p.87), so Kenji yields. On a kharmic strike, both seats roll their strike and apply damage as in S3.8-S3.9. | After a kharmic strike the stage reads "Over". After a first-blood hit with no second strike, the card stays at Strike with Kenji's button live, and nothing on the card closes it (To check in play). | `39_iaijutsu_dueling.md p.87-88` |

### Scene 3.B: The shrine

Setup: the GM starts a combat with Ryo, Hana, Taiko, Chuda Mareshi, and the Zombie (S0.54), and the players roll Initiative as in session 2. Each beat that needs a Turn is played on that combatant's Turn. At the start, Hana's slots are full (each 2: one slot per Ring rank, Void slots equal to the Void Ring, `66_magic_and_spell_casting.md` p.163).

#### B1. Spells (`66_magic_and_spell_casting.md` p.163-164, `67_universal_spells.md` p.164-166)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.11 | P2 | Hana's sheet, Spells section: click the cast button on the Commune row. In the element dialog pick Fire and click Cast. | A dialog asks "Cast Commune in which element?" and offers Air, Earth, Fire, Water. A universal spell is cast in a chosen element, and Commune never in Void (`67` p.164-165). The spell check dialog opens. | `67_universal_spells.md p.164-166` |
| S3.12 | P2 | Check dialog: the Spell slot select shows "Use spell slot Fire (2)" by default. Leave it and Roll. | The pool is (Fire + School Rank + 1)k(Fire), 4k2 for Fire 2 and Rank 1, because the Isawa's Gift Affinity for Fire raises the School Rank by one (`66` p.164). TN 5 + 5 × Mastery 1 = 10 (`66` p.163). No Free Raises field: Isawa's Gift's Free Raise on Affinity casts is in its rules summary only (To check in play). The label is "Spell Casting Roll: Commune", noting the Affinity, with "[Use spell slot Fire]". The Fire slot count drops 2 → 1 before the roll and stays down even on a failure (p.163). | `66_magic_and_spell_casting.md p.163-164` |
| S3.13 | P2 | If S3.12 succeeded: look at Hana's effects (token HUD or effect panel). If it failed, repeat S3.11-S3.12 with a Void slot. | A "Concentration: Commune" effect sits on Hana with level 1. Commune's duration is Concentration (`67` p.166). | `67_universal_spells.md p.164-166` |
| S3.14 | GM | Advance the combat to Hana's next Turn. | At Turn start a note card posts: "Concentration: Commune: spend a Simple Action this Round to keep concentrating, or end it." (`67` p.166). | `67_universal_spells.md p.164-166` |
| S3.15 | P2 | Spells section: click cast on Rejuvenating Vapors (Water, Mastery 2, the one above her School Rank). | Warning "Rejuvenating Vapors is Mastery Level 2; Tsumugi Hana can cast spells up to 1 in this element (p.164)." No dialog, no roll card, and the Water slots stay at 2. No Affinity applies in Water, so the limit is School Rank 1 (`66` p.164). | `66_magic_and_spell_casting.md p.163-164`; `67_universal_spells.md p.164-166` |
| S3.16 | GM | Open Hana's sheet on the GM client and click cast on Rejuvenating Vapors. | A confirm dialog shows the same reason and "Cast it anyway?" with Allow and Cancel. Click Allow. The check dialog opens: (Water + 1)k(Water), 3k2, TN 15. Roll. The card posts as Hana's, and Hana's Water slots drop 2 → 1 on every client. | `66_magic_and_spell_casting.md p.163-164` |
| S3.17 | P2 | Overlapping cast, step 1: click cast on Fury of Osano-wo (Fire 1). The dialog shows "Use spell slot Fire (1)". Leave the dialog open. | The dialog stays open. No slot is spent until Roll is clicked. | `66_magic_and_spell_casting.md p.163-164` |
| S3.18 | GM | Overlapping cast, step 2: on Hana's sheet (GM client), cast The Fires That Cleanse (Fire 1) with "Use spell slot Fire" and Roll. | The roll posts and Hana's Fire slots drop 1 → 0. | `66_magic_and_spell_casting.md p.163-164` |
| S3.19 | P2 | Overlapping cast, step 3: in the still-open dialog, click Roll. | Warning "You ran out of spell slots for this Ring". No roll and no card. Fire stays at 0 and never goes negative (the second cast is checked again inside the per-caster lock, `module/services/dice/check/spell-slots.js`). | `66_magic_and_spell_casting.md p.163-164` |
| S3.20 | P2 | Cast Fury of Osano-wo again. In the dialog choose "Use Void spell slot (2)" and Roll. | The roll posts with "[Use Void spell slot]" and the Void slots drop 2 → 1 (Void slots cast in any element, p.163). | `66_magic_and_spell_casting.md p.163-164` |

#### B2. Kata and kiho (`86_kata.md` p.259-260, `87_kiho.md` p.261-265, `80_brotherhood_of_shinsei.md` p.231-233)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.21 | P1 | Ryo's sheet: note the Armor TN (24, Riding Armor on foot). Set the stance to Defense Stance and note the Armor TN again. In the Kata section, click Activate (play icon) on Striking as Air. | Defense Stance: 24 → 30 (Air 3 plus Defense 3, `36_stances.md` p.84). The kata row's toggle turns active ("End"). An effect named Striking as Air appears on Ryo, and in Defense Stance his Armor TN rises by his Air Ring: 30 → 33 (`86` p.259). Executing a kata is the player's choice; nothing is spent. | `86_kata.md p.259`; `86_kata.md p.259-260`; `36_stances.md p.84` |
| S3.22 | P1 | Set the stance back to Attack Stance. | Armor TN 24: the Striking as Air bonus leaves because its rule needs Defense Stance. The kata stays active. | `86_kata.md p.259` |
| S3.23 | P1 | Kata section: Activate Breath of Wind Style. | Breath of Wind Style turns active and Striking as Air ends by itself. Its toggle goes back to "Activate" and its effect is deleted. A character keeps one kata active at a time (`86` p.259). Breath of Wind Style carries no rule beyond its prerequisite, so no number changes. | `86_kata.md p.259`; `86_kata.md p.259-260` |
| S3.24 | GM | Taiko's sheet (GM client): note his Initiative (3k2). Spend a Void Point with the Void Point dots, or roll Meditation from his skill row against TN 15, the activation cost the book gives (`87` p.261). Then click Activate on Air Fist in the Kiho section. Roll one unarmed damage roll and one weapon damage roll with his Bo (S0.50), reading each dialog. | The system leaves the activation cost to the seat: the toggle neither spends a Void Point nor rolls. Air Fist turns active and Taiko's Initiative shows 3k2+5. Per `87` p.262 only unarmed damage loses his Air Ring (2); the pack rule's selector is `damage`, so a minus-Air modifier on the weapon roll would be a finding (To check in play). | `87_kiho.md p.261`; `87_kiho.md p.262-263, 265`; `80_brotherhood_of_shinsei.md p.231-233` |
| S3.25 | GM | Activate To the Last Breath (Kharmic) on Taiko. | Both Air Fist (Internal) and To the Last Breath (Kharmic) are active: one kiho of each type may be active (`87` p.261). | `87_kiho.md p.261` |
| S3.26 | GM | Activate Touch the Void Dragon (Internal) on Taiko. | Air Fist ends by itself and Taiko's Initiative loses the +5. To the Last Breath stays active. | `87_kiho.md p.261`; `87_kiho.md p.262-263, 265` |

#### B3. The creature (`98_being_a_good_game_master.md` p.318)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.27 | GM | Open the Zombie's NPC sheet (S0.54). Open its attack check dialog with the Fist attack button and cancel. | The sheet shows no Void Points block, because its Void Ring is 0 and a creature without Void has none to spend (p.318). The Wounds track shows only the two ranks the pack entry uses, at their printed thresholds, with the unused ranks hidden and pushing nothing up (`npc-wound-system.js`). In the dialog the Void Point box is disabled with "No Void Points left", and Raises max is 0. | `98_being_a_good_game_master.md p.318` |
| S3.28 | GM | Zombie's Turn: Fist attack against Hana, then roll its damage, then "apply to target" with Hana targeted. | Hana's Wounds rise. If the Wounds taken exceed her Earth Ring (2) while Concentration is up, a save card posts: "Concentration: Commune: save", Willpower roll against TN 20 + 5 × 1 = 25 (`67` p.166). If the damage is 2 or less, there is no card; the GM repeats S3.28 next Round. | `67_universal_spells.md p.164-166`; `35_healing_wounds.md p.84` |
| S3.29 | P2 | Click Roll on the save card. | A Willpower roll (2k2) at TN 25 posts. On a failure the GM-side query ends Concentration: Commune and any effect it holds up. On a success it stays. | `67_universal_spells.md p.164-166` |
| S3.30 | P1 | Ryo's Turn: attack the Zombie with Kenjutsu, roll damage, apply to target. | The Zombie's Wounds rise by the damage minus its Reduction from the pack entry. The current-rank mark stays on its first rank until the Out threshold. | `98_being_a_good_game_master.md p.318` |
| S3.31 | GM | Ryo was struck by the Zombie earlier, or narrate a bite now. Rule that Ryo failed the exposure roll (`89` p.276 is the GM's call). Ryo's sheet, Ranks: click Ledger, choose Taint, enter 1 point with the reason "Zombie bite", and Record. | The ledger dialog lists the entry. Ryo's Taint track shows rank 0, 1 point. Below one full Rank he is not Tainted (`89` p.277), so his next Agility roll offers no "Embrace the Taint" box. | `89_shadowlands_taint.md p.275, 277-279` |

#### B4. Maho and the Taint (`88_maho.md` p.267-268, `89_shadowlands_taint.md` p.275, 277-280)

Chuda Mareshi begins at Taint Rank 4, 7 points, with Earth 2 and Void Ring 2 (S0.49).

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.32 | GM | Mareshi's sheet: look at the Void Points dots. Roll Sincerity from his skill row and look at the dialog's modifiers. | At Level 4 his Void Point maximum is the Void Ring less 1 (2 → 1 dot), and the Void Ring itself stays 2. The Sincerity dialog lists a "Shadowlands Taint" modifier of −2k0 on a social Skill roll (`89` p.278). | `89_shadowlands_taint.md p.275, 277-279` |
| S3.33 | GM | Mareshi: roll his Agility Trait from the Trait block. Tick "Embrace the Taint (+1k1)" and Roll. | The pool gains +1k1. Once rolled, the ledger records 1 Taint point with "Embraced the Taint": 4 rank 7 points becomes 4 rank 8 points (`89` p.279). | `89_shadowlands_taint.md p.275, 277-279` |
| S3.34 | GM | Mareshi's Spells: click cast on Bleeding (Fire 1, maho). In the dialog the Maho casting group shows the warning and "Blood cost required: 2 Wounds". Set Blood source to Self and Additional blood to 0. Roll. | (Insight Rank + Fire)k(Fire), 3k2, against TN 10. This is not the shugenja roll and spends no spell slot (`88` p.267). Mareshi's Suffered Wounds rise by 2 before the roll, success or not (`88` p.268). On a success: notification "Gained 1 points of Shadowlands Taint from maho casting", the label shows "[Blood: 2]" and "[Taint gained: 1]", and the ledger takes Taint to 4 rank 9 points (Mastery − 1, at least 1, `88` p.268). On a failure no Taint is gained; recast. | `88_maho.md p.267-268`; `89_shadowlands_taint.md p.275, 277-279` |
| S3.35 | GM | Mareshi's sheet: create an Advantage named "Master of Blood". Open it, and in its Rules tab use create rule to add `RollOption` with option `master-of-blood` and `TNModifier` with selector `spell`, value 10, predicate `not check:maho` (`ACTIVE_EFFECTS.md`: a Master of Blood made after the upgrade needs its rules by hand). | The advantage saves with two rules and no console error. | `89_shadowlands_taint.md p.280` |
| S3.36 | GM | Mareshi: cast Sense (a normal universal spell) in any element. Pick "None" in the slot select, look at the TN, and cancel. | The TN is 10 + 10 = 20. Master of Blood puts +10 on every non-maho spell (`89` p.280). | `89_shadowlands_taint.md p.280` |
| S3.37 | GM | Mareshi: cast Pain (Earth 2, maho). The dialog shows "Blood cost required: 3". Set Blood source to Other (a bound porter) and Additional blood to 3. Roll. | Blood is 2 × 2 − 1 = 3 with Master of Blood (`89` p.280). Additional blood of one full cost gives 1 Free Raise (`88` p.268), offered in the Free Raises field. The label shows "[Blood: 6]". The blood comes from someone else, so Mareshi's Wounds do not change. On a success Taint is max(1 − Earth 2, 1) = 1 point (p.280), and 4 rank 9 points becomes Rank 5, 0 points: ten points make a Rank (`89` p.275). | `88_maho.md p.267-268`; `89_shadowlands_taint.md p.280`; `89_shadowlands_taint.md p.275, 277-279` |
| S3.38 | GM | Mareshi, now Taint Rank 5: look at the Void Points dots. Roll Agility from the Trait block. | Mareshi is Lost: Rank 5 with no Ring at 6 (`89` p.278). His Void Point maximum is 0 and his Void Ring is unchanged (p.279). The Agility dialog has no "Embrace the Taint" box and lists "Lost (Taint Rank)" +5 to the total. The card total includes the +5 (p.279). | `89_shadowlands_taint.md p.275, 277-279` |
| S3.39 | GM | Open Mareshi's Ledger. | The entries, newest first: the Pain and Bleeding maho gains, "Embraced the Taint", and the starting "Years of blood magic", each with its points. | `89_shadowlands_taint.md p.275, 277-279` |

The party then defeats Chuda Mareshi and the Zombie as an ordinary skirmish (session 2's beats); the GM ends the combat.

### Scene 3.C: The night's rest (`35_healing_wounds.md` p.84)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.40 | P1 | Ryo's sheet, Wounds section: hover the heal-rate label and read it. Then click the bed button, "Apply natural healing from rest". | The tooltip reads (Stamina × 2) + Insight Rank + modifier with Ryo's numbers: (2 × 2) + 1 + 0 = 5. A chat card "Kakita Ryo rested and recovered Wounds" posts with "Healed N Wounds (heal rate: 5)", N being the lesser of 5 and his Wounds. It also shows "Wounds: current/max (suffered: S)" and "Void: 2/2 restored". Suffered drops by N, never below 0 (p.84). | `35_healing_wounds.md p.84` |
| S3.41 | GM | Kenji's sheet: if he took no Wounds in the duel, type 10 into Suffered first. Click the bed button. | Kenji's heal rate is (Stamina 2 × 2) + Insight Rank 1 = 5. A rest card posts for Matsu Kenji and his Suffered drops by 5. Healing a GM-owned character the players cannot open is the GM's job here. | `35_healing_wounds.md p.84` |
| S3.42 | P2 | Hana's sheet: bed button. | The card heals (2 × 2) + 1 = 5 and adds "All spell slots restored to maximum". The Spells header slots return to 2 in every Ring and Void (`66` p.163: slots are per day). | `35_healing_wounds.md p.84`; `66_magic_and_spell_casting.md p.163-164` |

### Scene 3.D: XP awarded and spent (`49_improving_your_character.md` p.104-105)

| # | Seat | Action (UI steps, from that seat's client) | Expected result (what the system shows) | Manifest entries |
| --- | --- | --- | --- | --- |
| S3.43 | GM | Open Ryo's sheet. Click the XP manager button beside XP, set Amount to 4 and Note to "Session 3: the duel", and click Add XP. Do the same for Hana and Taiko. | Ryo 45/49, Hana 42/46: a "Manual adjustments" line appears in each breakdown with the +4 entry and its note. Taiko 10/54: his Manual adjustments line rises 10 → 14 and lists both entries. Each sheet header's XP updates on every client (`49` p.104: the GM awards XP between sessions). | `49_improving_your_character.md p.104-105` |
| S3.44 | P1 | Ryo's sheet: open the XP manager. Note the Insight points and Initiative in the header. In the Skills section raise Iaijutsu's rank from 2 to 3. | The purchases list adds an "Iaijutsu 2→3" entry costing 3 (the new rank, `48` p.103), and "Used" rises 45 → 48 of 49. Insight 129 → 130, one per Skill Rank, and Insight Rank stays 1 below 150 (`49` p.104). Initiative 4k3+4 → 4k3+6 through The Way of the Crane's per-Iaijutsu-rank rule. | `49_improving_your_character.md p.104-105` |
| S3.45 | P2 | Hana: open Fury of Osano-wo, tick Memorized, and close it. Open the XP manager. | The breakdown's Spells line shows 1, and the purchases list adds "Memorized: Fury of Osano-wo" at 1: 43/46. A memorized spell costs its Mastery Level (`66` p.164). | `66_magic_and_spell_casting.md p.163-164`; `49_improving_your_character.md p.104-105` |
| S3.46 | P2 | Hana: raise Spellcraft's rank from 2 to 3. Cast Commune again with a slot, look at the pool, then cancel. | XP 46/46 ("Spellcraft 2→3" +3) and Insight 113 → 114. The casting pool is unchanged: her School Rank follows her Insight Rank, which is still 1 (`49` p.104-105, the Shugenja & Insight Rank box). Cancelling the dialog spends no slot. | `49_improving_your_character.md p.104-105`; `66_magic_and_spell_casting.md p.163-164` |
| S3.47 | GM | Taiko: in the compendium browser, Kiho tab, add Song of the World (Void 3) to Taiko (the GM's Character set to Taiko, as in session 0). Open his XP manager. | The breakdown's Kiho line rises 10 → 13, its Mastery Level; "Used / total" 13/54. A bonus kiho costs its Mastery Level, and a monk may know as many bonus kiho as his Monk School Rank, here 1 (`80` p.231). His three starting kiho stay offset by the manual +10 from S0.50. Void 3 + School Rank 1 meets Mastery 3 (`87` p.261), checked by hand. | `80_brotherhood_of_shinsei.md p.231-233`; `80_brotherhood_of_shinsei.md p.231`; `87_kiho.md p.261` |
| S3.48 | GM | Taiko: Activate Song of the World. | It ends To the Last Breath, both being Kharmic (`87` p.261), and Touch the Void Dragon stays active. | `87_kiho.md p.261` |

## To check in play

Suspected from reading the code while writing the drafts. Each is a check, not a confirmed bug: confirm it at the table and file a `playtest` issue if it holds.

- S0.7, S0.24: confirmed, #85.
- S0.17: confirmed, #83.
- S0.15: check whether anything warns when a starting character goes above 4 in a Skill or Trait or spends past the XP total (`48_character_creation_expanded.md` p.103); no check was found in the code.
- S0.21, S0.22, S0.34, S0.35: check that the School's starting Honor and outfit koku are entered by hand and nothing sets them from the School.
- S0.27: check that Friend of the Elements' shugenja price (`64_advantages.md` p.149) needs the GM's hand-authored Cost rule: the pack entry prices it 4 for everyone and keeps the shugenja price in its rules summary.
- S0.28: confirmed, #87.
- S0.41: check whether Emerald Magistrate's Lore: Law prerequisite can ever be met: the Skills pack has no Lore: Law.
- S0.50: check whether a Brotherhood monk's three starting kiho are priced at their Mastery Level with no way to make them free but a manual XP entry (`xpItemsOf` prices every kiho; `KihoData.rulesActive` is false, so a `self` Cost on a kiho never applies). The Mastery Level check on **Add**: confirmed missing, #90.
- S1.15: check what the TN line shows for a Raise on a roll with no TN: the draft read it as against TN 5, the Raise alone.
- S2.9: check whether a player is offered a Void Point on their Raw Willpower roll against Fear; the cards roll on the GM's client with no dialog.
- S2.33: check what P1's client shows when a refused Undo comes back from the GM's query: the refusal may surface only as an uncaught error in P1's console.
- S2.46: check that jade powder's weaker later hits (`99_creatures.md` p.320) are left to the GM; nothing automates them.
- S2.60: check which client shows the "no Void Points left" warning when P1 clicks "Reduce with Void" at 0 Void Points: the code raises it inside the GM's query, so it may show on the GM's client, not P1's.
- S3.2: check that the duel card leaves both duelists' stances alone, so each seat sets Center Stance by hand.
- S3.10: check whether a duel to first blood can be closed after one strike: the Strike stage has no concede or end button, and the card stays at Strike with the second striker's button live.
- S3.12: check whether Isawa's Gift's Free Raise on spells of the Affinity element reaches the casting dialog: the pack keeps it in the Technique's rules summary, so no Free Raises field may show.
- S3.23: check that Breath of Wind Style's Initiative gain (`86_kata.md` p.259) is left to the table: the pack entry carries only its prerequisite.
- S3.24: check whether Air Fist's minus-Air damage applies to weapon damage too: its pack rule's selector is `damage`, while `87_kiho.md` p.262 limits it to unarmed strikes.
