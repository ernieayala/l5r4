# Stage 15: Compendium packs and browser

**Goal:** the system ships compendium packs of the Core Rulebook's character options, equipment, and creatures. Each
entry holds its name, its printed numbers, its mechanics as `system.rules` with summary lines generated from them,
a one-line summary of any mechanic the rules do not model, and a "Core Rulebook p.N" citation where the book's text
would go. A filtered browser searches these packs and every world compendium, and adds an entry to a
character through the same purchase flow a drop uses.
**Needs:** 14. It runs before the coverage audit (16) and playtest (18), so both cover the pack entries.

## Content policy

X6 and decision 1 (Ernie, 2026-11-14). The repo is public (CLAUDE.md **Licensed material**). Game mechanics may
be summarized; the book's expression (its wording, flavor, and the structure of its paragraphs) never ships.

| Ships in a pack entry | Never ships |
|-----------------------|-------------|
| Names of clans, families, schools, techniques, skills, advantages, disadvantages, spells, kata, kiho, tattoos, equipment, creatures | Descriptions, flavor text, or any run of the book's wording |
| Printed numbers and short printed values: Ring, Mastery Level, XP cost, Trait bonus, skill Trait, damage, Armor TN bonus, Reduction, Wounds, keywords, range, area, duration | Text in the flavor fields: `description` and `demands` stay empty |
| Mechanics as `system.rules`, which the engine applies and the tests check. The sheets and chat card show a summary line generated from each rule (`rule-summary.js`), so modeled mechanics need no written text | A rule `Note` that restates an effect. A note names its item and page |
| In the mechanical fields (`specialRules`, `effect`, `raises`, `mastery3`, `mastery5`, `mastery7`): a mechanical summary of what `system.rules` does not model, at most 120 characters, written from what the effect does and not from the book's paragraph. An entry with `full` coverage leaves them empty | A summary that follows the book's sentences in order, reworded; flavor in a mechanical field |
| `system.source`: the book and printed page, shown beside every summary | Book art, logos |

## Rules implemented

Every pack's numbers and rules come from its pages; `/rule` reads each page while the entry is written.

| Pack | Item or Actor type | `game-rules/` files | Pages |
|------|--------------------|---------------------|-------|
| `clans` | `clan` | `14`-`22`, `76`, `77` | 55-74, 211-225 |
| `families` | `family` | `50`-`57`, `76`, `77`, `79` | 105-132, 211-230 |
| `schools` | `school`, with GrantItem rules for its Skills and Techniques | `50`-`57`, `76`, `77`, `79`, `80`, `81`, `84` | 105-132, 211-235, 245-257 |
| `techniques` | `technique` | as `schools` | as `schools` |
| `skills` | `skill`, with Mastery Abilities as rules | `58`-`62` | 133-145 |
| `advantages` | `advantage`, Ancestors included (decision 6) | `63`, `64`, `83` | 145-154, 241-244 |
| `disadvantages` | `disadvantage` | `63`, `65` | 145-146, 154-162 |
| `spells` | `spell`, maho included | `66`-`72`, `88` | 163-197, 267-274 |
| `kata` | `kata` | `86` | 259-260 |
| `kiho` | `kiho` | `87` | 261-267 |
| `tattoos` | `tattoo` | `52` | 112-115 |
| `weapons` | `weapon`, `bow` | `74` | 198-205 |
| `armor` | `armor` | `73` | 198 |
| `equipment` | `commonItem`, poisons included | `75`, `100` | 205-210, 332-333 |
| `creatures` | `npc` Actor | `99` | 318-331 |

Before the `advantages` and `disadvantages` packs, the transcription gap in `AUTOMATION.md` (the Advantages after
Silent that landed in `65_disadvantages.md`) is fixed against the PDF.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|--------------------------------------------|
| Pack and folder entries | Manifest `packs` with explicit `path`, `type`, `system`, `ownership`; `packFolders` (§2.3) |
| Building packs | `@foundryvtt/foundryvtt-cli` `compilePack(src, dest, {recursive, transformEntry})`; packs cannot compile while a world has them open (§9) |
| Browser index | `CONFIG.Item.compendiumIndexFields`, `CONFIG.Actor.compendiumIndexFields` (§9) |
| Browser window | `ApplicationV2` with `HandlebarsApplicationMixin` (§4.1-4.3); drag from its rows (§4.5) |
| Browser button in the Compendium sidebar | `renderCompendiumDirectory(app, element)`, a button in `.header-actions` (§9; `client/applications/sidebar/tabs/compendium-directory.mjs:39-74`) |
| GM import of a creature | `game.actors.importFromCompendium(pack, id)` (§9; `client/documents/abstract/world-collection.mjs:80`) |

## Audit

State on 2026-11-14:

| Where | Finding |
|-------|---------|
| `system.json:36` | `"packs": []` |
| `package.json` | No `@foundryvtt/foundryvtt-cli`, no `build:packs` script |
| `module/sheets/handlers/drag-drop-handler.js:94-122` | `handleItemDrop`: resolves the UUID, runs `preparePurchase` (`module/services/purchase.js:87`), creates the item |
| `module/sheets/handlers/bio-item-handler.js:61` | Family and School drops replace the old item after `preparePurchase` (now in `addItem`, decision 11) |
| `module/data/item/ItemData.js`, `module/data/actor/ActorData.js` | No field for a source book and page |
| Branch `release/3.2.0` (PR #25), `packs/**/*.db` | 29 pack files with rulebook text. Used only as a list of entries to look up in the book; nothing is copied from it |
| `game-rules/` headings in the files above | About 1,300 headings, so several hundred entries |

## Deliverables

### Data

| Layer | File | Does |
|-------|------|------|
| Data models | `module/data/item/ItemData.js`, `module/data/actor/NpcData.js` | `source`: book id and printed page. A new field with defaults, so no stored data needs converting; Stage 12's migrations are untouched. Schema change, stated here per CLAUDE.md |
| Config | `module/config/sources.js` | Book ids and their localization keys (`core` → "Core Rulebook") |
| Utils | `module/utils/rule-summary.js` | Turns each entry of `system.rules` into an `l5r4.` summary key and its data (pure; the caller localizes). Every key in `config/rule-keys.js` has a summary key |
| Sheets, templates | Item sheet and NPC sheet headers; the item chat card | Show "Core Rulebook p.N" from `system.source`, and in place of an empty description; list the item's rule summaries, then its mechanical fields, beside the citation |

### Pack sources and build

| File | Does |
|------|------|
| `src/packs/<pack>.json` | One file per pack: each entry's type, name, `system` numbers, `system.rules`, `system.source`, and its coverage (`full`, `partial`, `none`) for the mechanics the engine cannot express (decision 9) |
| `tools/pack-sources.mjs` | Builds each pack's documents: stable ids from pack and name, folders by clan, Ring, or category, the coverage field moved out of the document. Pure, so Vitest runs it |
| `tools/packs.mjs` | `npm run build:packs`: compiles every pack into `packs/<name>` with `compilePack`, with Foundry closed |
| `tools/packs-verify.mjs` | `npm run packs:verify`, local only, because it reads `game-rules/`: each entry's name appears on its cited page; weapon and armor numbers match the book's tables; no run of six or more words in any entry string matches `game-rules/` |
| `package.json` | `@foundryvtt/foundryvtt-cli` dev dependency (decision 3), `build:packs`, `packs:verify` |
| `.gitignore` | `packs/` (build output) |
| `system.json` | `packs` for the fifteen packs and `packFolders` "L5R4 Core Rulebook" with Character, Magic, Equipment, Creatures. Show the diff |
| `.github/workflows/gate.yml` | A step that runs `build:packs` to prove every source compiles |

### Shared add path

| Layer | File | Does |
|-------|------|------|
| Services | `module/services/purchase.js` | One function that adds an item to an actor: prerequisites and choices (`preparePurchase`), and Clan, Family, or School replacement. The drag-drop handler and the browser call it (decision 5) |

### Browser

| Layer | File | Does |
|-------|------|------|
| Config | `module/config/browser.js` | Tabs (Schools and Techniques, Skills, Advantages and Disadvantages, Spells, Kata, Kiho and Tattoos, Equipment, Clans and Families, Creatures) and each tab's filters: clan, school type, Skill type and Trait, advantage type and cost, Ring, Mastery Level, keyword, maho, weapon size and keyword, armor type, page |
| Utils | `module/utils/browser-filter.js` | Filters and sorts index entries (pure) |
| Apps | `module/apps/compendium-browser.js` | Searches every system pack and world compendium of the right type the user can see. Rows show name, key numbers, and "Core Rulebook p.N"; drag to a sheet, or Add to the user's character or the controlled token's actor through the shared add path; the GM imports a creature with Import |
| Setup | `dist/l5r4-enhanced.js` `init` | `compendiumIndexFields` for the fields the filters read |
| Hooks | `module/hooks/register-all.js` | The browser button in the Compendium sidebar header |
| Templates, styles | `templates/apps/compendium-browser.hbs`, `scss/components/_compendium-browser.scss` | |

Every new string is an `l5r4.` key in `lang/en.json`. Entry names are English.

### Order of work

One commit per step, gate passing after each: (1) schema, build tooling, shared add path, browser, and the
`weapons`, `armor`, `equipment` packs; (2) `skills`; (3) `spells`; (4) `advantages`, `disadvantages`; (5) `clans`,
`families`, `schools`, `techniques`; (6) `kata`, `kiho`, `tattoos`; (7) `creatures`.

## Acceptance

- Vitest: `pack-sources.mjs` gives the same ids on two builds; `description` and `demands` are empty in every
  entry; every mechanical field is at most 120 characters, and empty in a `full`-coverage entry; every `Note` rule's
  text is the item name and citation; every `system.source.page` lies in its pack's page range; no pack repeats a
  name; `browser-filter.js` filters by each filter alone and combined; `rule-summary.js` has a summary key for every
  rule key, each present in `lang/en.json`.
- Vitest, book example: the p.103 character built from pack entries prices to the book's XP.
- Local: `npm run packs:verify` reports no mismatch and no matching run; its output goes in the Done Block.
- Quench `packs` batch: every pack opens; every entry's rules validate; every item drops on a PC, and every creature
  imports, with no console error; a School grants its Skills and first Technique; each entry in the batch's
  expected-effects table, written from its page, changes the roll or derived value it should.
- Chrome: as a player on their own client, filter spells by Fire and Mastery Level 2, add one with Add and another
  by drag; as the GM, import a creature and attack with it.
- CI: `gate.yml` compiles every pack.

## Decisions

1. Packs ship names, printed numbers, `system.rules`, and page citations, never the book's prose. Mechanics a
   player needs to read are summarized: generated from `system.rules` where the engine models them, and written as
   a capped one-line summary where it does not; flavor fields stay empty (content policy above). Ernie, 2026-11-14
   (X6; summaries in place of empty mechanical fields).
2. The citation lives in `system.source`, and the sheets and chat card show "Core Rulebook p.N" from it, so a GM's
   own description can sit beside it. Ernie, 2026-11-14 (citations in place of text).
3. `@foundryvtt/foundryvtt-cli` is an approved dev dependency (Ernie, 2026-11-14).
4. Pack sources are committed JSON; `packs/` is built output, compiled in CI. Basis: FOUNDRY-V14-REFERENCE.md §9.
5. A drop and the browser's Add share one service function, so prerequisites, choices, and replacement run once
   for both. Basis: CLAUDE.md layers (Apps do not import Sheets).
6. Ancestors are `advantage` entries; the `demands` field they use is a flavor field and stays empty. Basis:
   `83_ancestors.md`, pp.241-244.
7. The `creatures` pack is GM-only (`ownership` `PLAYER: "NONE"`); the other packs let players observe.
8. Entry icons come from Foundry core or `assets/`; no book art.
9. A mechanic the engine cannot express stays with the table. The entry records `partial` or `none` coverage,
   which Stage 16's manifest reads. Basis: CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**.
10. PR #25 is not merged; its packs serve only as a list of entries to find in the book.
11. Built as follows:
    - `system.json` declares each pack, and its `packFolders` folder, in the step that adds the pack's source;
      `tests/packs.test.js` checks that every source is declared and every declared pack has a source.
    - A pack source gives each entry a `page`; the build writes `system.source` from it.
    - Where the book prints a price range ("1 to 5 zeni", "and up"), the entry takes the lowest price. An item with
      two printed prices or two printed DRs is two entries: Chest (Wood) and (Metal), Lantern (Paper) and (Metal),
      Sang Kauw (Crescent Blade) and (Shield). The Kusarigama's second DR is in its summary.
    - Two weapons sharing one book entry are two pack entries: Aiguchi and Tanto, Jitte and Sai.
    - A weapon's `associatedSkill` is its category's Weapon Skill (pp.140-142).
    - Thrown ranges, breaking, and the staves' doubled armor bonus (pp.200-205) are not modeled; those weapons are
      `partial` with a summary. Riding armor's horseback bonus and every armor type's TN penalties are modeled by its
      `armorType` (`module/documents/actor/preparation/pc-preparation.js`, `module/utils/armor-penalties.js`).
    - Poisons (pp.332-333) are `commonItem` entries with `none` coverage and a summary.
    - The PC sheet's own drop route for Clan, Family, and School is gone: every drop, and the browser's Add, calls
      `addItem` in `module/services/purchase.js`, which replaces a character's Clan, Family, or School. The bio-item
      handler keeps opening and clearing them.
    - `tools/packs-verify.mjs` finds a weapon's or armor's numbers under the heading that is its name (or plural)
      first, then one that holds its name, searching from its cited page.
    - The p.103 Vitest book example needs the Family, School, and Skill packs, so it lands with step 5.
    - Skills: each sub-skill a Macro-skill lists is its own entry, named as "Lore: History" (p.134); the Macro-skills
      themselves and the sub-skills the book leaves to the player ("Lore: Great Clan (choose one)", Gaijin Culture,
      Nonhuman Culture) are not entries. A sub-skill marked as a High or Low Skill takes that type.
    - A Craft sub-skill has no printed Trait (p.143); its entry uses Intelligence, which the player may change.
    - Ninjutsu is a Bugei Skill that counts as a Low Skill (p.142): its type is `bugei` and its summary says so. A
      Skill printed with two Traits (Ninjutsu, Sailing) takes the first.
    - A Mastery Ability the engine can express is a rule on the Skill with a rank predicate,
      `{ "gte": ["skill:<name>", N] }`; one it cannot is summarized in that rank's mastery field. A Weapon Skill's
      damage and maneuver Masteries reach its own weapons through the roll options `weapon:skill:<skill>` and
      `weapon:name:<name>` (`module/services/dice/check/collect.js`). Iaijutsu's Rank 5 and 7 stay in the duel flow
      (`module/services/combat/duel.js`); every Skill's Rank 10 Free Raise stays on `SkillData`.
    - Spells carry no rules: an item's rules apply while it is owned, and a spell acts only when cast. Every spell is
      `none` coverage with a summary of its effect and its Raises. A universal spell's Ring is `all` (the caster picks
      the element, `module/services/dice/rolls/spell-cast-roll.js`). Maho spells set `maho`; the blood and Taint every
      maho spell costs (p.268) stay with the maho roll and are not repeated in each summary. A printed Range, Area,
      or Duration longer than five words is shortened in the entry's own words.
    - Rule gaps found here: #72 (Courtier and Etiquette Insight, pp.135-136) and #73 (Horsemanship 3 and the mounted
      Full Attack warning, pp.89, 140). The entries summarize those Masteries until the issues are fixed.
    - An Advantage or Disadvantage printed with options a character takes one of (Seven Fortunes' Blessing, Touch of
      the Spirit Realms) is one entry per option, named as "Touch of the Spirit Realms (Yomi)", when the options differ
      in cost; otherwise one entry with a ChoiceSet (Paragon, Consumed, Failure of Bushido, Cursed by the Realm, Seven
      Fortunes' Curse). A variable cost ("Varies") is 0 for the player to set.
    - A Clan discount is a `Cost` rule `max(@cost - N, 1)` on `self`, so discounts stack and never go under 1
      (p.149); Sacred Weapon's per-Clan prices are prices. Profession discounts and the XP a Disadvantage is worth to
      a Clan or profession stay in the summary: Disadvantage XP is not priced by `Cost` rules.
    - The book's limits are Prerequisites a GM may override: the matched sets (p.148), Large and Small (p.162), Jigoku
      and the Taint (p.154), and one Ancestor (p.241). An Ancestor's Clan is a `clan:<name>` Prerequisite.
    - A choice between Rings or versions is a ChoiceSet plus a `RollOption` (`elemental-blessing:earth`) that the
      item's other rules test.
    - A source string names another pack's entry as `@entry[pack/Name]`; the build turns it into the UUID
      (`tools/pack-sources.mjs`), and `tests/packs.test.js` checks every reference names an entry. A School's
      GrantItem rules name its Skills (with Emphasis and printed rank), its Techniques by School Rank, and for a
      shugenja Sense, Commune, and Summon; "any one Skill" picks are ChoiceSets over the skills list or the printed
      group. Starting Honor, outfit, and spell picks stay in the School's summary, so a basic School is `partial`.
    - Clans are plain names ("Crab") with no rules. A family printed under two clans with one bonus is one entry
      (Toritaka, p.106); with two bonuses the second takes its clan in parentheses ("Chuda (Snake)",
      "Kitsune (Fox)"). Imperial is a clan entry for its families.
    - Advanced Schools are `school` entries with their Requirements as a Prerequisite and `rank` 1, raised by hand
      (p.245); they never set `shugenja`, so a Spell Casting Roll keeps the basic School's Rank. Alternate and Ronin
      Paths are Technique entries named by the path, `rank` its printed Technique Rank; a Ronin Path carries its
      Benefit and Skills, as it stands in for a School (p.234).
    - Dropping a School on a character who has one asks: replace it, or add it beside it (Ernie, 2026-11-14), so an
      Advanced School or Multiple Schools keeps the first School (`module/services/purchase.js`).
    - Rules added for these entries: `@school.rank` in formulas (the highest School Rank), `weapon:keyword:<k>`
      options for Samurai-keyword weapons, and `range` on `ActionCost` for "melee attacks as a Simple Action".
    - A Technique a School grants does not ask its ChoiceSet; its choice-dependent rules wait, without a warning,
      until its selection is filled in (Drawing in the Strike, p.215). Grant work for a deleted character stops.
    - The book disagrees with itself in two places, left as the School block prints them: the Shiba Bushi School's
      Skills (Spears, p.123; Polearms in the p.103 example) and the Fox Kitsune bonus (+1 Willpower, p.219; the p.217
      sidebar says it repeats the Mantis Kitsune's +1 Awareness).
    - A tattoo works while activated, as a kata does (p.115; Ernie, 2026-11-14): one at a time, its effect lasting
      2 x School Rank Rounds (no set duration for a character with no School). `TattooData` gains `passive` (default
      false, so stored tattoos need no conversion); an always-on tattoo (the Mantis) sets it and applies while owned.
      This replaces Stage 11's "a tattoo's rules apply while it is owned".
    - Kata rules are written for while the kata is executed; a stance condition stays a predicate. A kata's Ring and
      Schools are one Prerequisite; the p.259 "Other Schools" note is left to the GM. A kiho has no Prerequisite
      (School Rank plus Ring cannot be summed by a predicate), and its duration stays in its summary. Kata folder by
      Ring, kiho by Ring, tattoos none; kata go in the Character pack folder, kiho and tattoos in Magic.
    - Creatures are `npc` Actors with every printed stat block (pp.320-331); the Ghost prints none (p.326) and is
      not an entry. Printed Wound thresholds ("12: +10; 24: Dead") are manual levels whose value is the most Wounds
      each holds; a level a creature does not use no longer pushes the next one's threshold up
      (`module/documents/actor/calculations/wound-system.js`), so "124: Dead" stays 124. A creature's Skills are
      embedded copies of the skills pack's entries (`items` with `from: "@entry[skills/Name]"`), and its special
      abilities an embedded Active Effect whose `rules` the engine applies (Swift, Invulnerability, Spirit, Undead's
      Fear immunity, jade-limited Reduction as a `Reduction` rule with `except`). What no rule models is the
      creature's `notes` summary. Fear stays the GM's to roll from the sheet, so a Fear printed for one situation
      (the Utaku Battle Steed's charge) keeps its rank with the condition in `notes`.
    - A ChoiceSet answer may fill a field with fixed values (Weakness's `trait`). The Rules tab validates each rule
      with its item's choices made (`answeredRules`, `module/utils/choices.js`), and the field's select keeps the
      `{choice:...}` text, so saving the sheet leaves it in place.

### Progress

| Step | Packs | State |
|------|-------|-------|
| 1 | `weapons`, `armor`, `equipment`, with the schema, tooling, add path, and browser | Built 2026-11-14 |
| 2 | `skills` | Built 2026-11-14 |
| 3 | `spells` | Built 2026-11-14 |
| 4 | `advantages`, `disadvantages` | Built 2026-11-14 |
| 5 | `clans`, `families`, `schools`, `techniques` | Built 2026-11-14 |
| 6 | `kata`, `kiho`, `tattoos` | Built 2026-11-14 |
| 7 | `creatures` | Built 2026-11-14 |

### Still open

None.

## Out of scope

| Item | Stage |
|------|-------|
| Shadowlands Powers and Mutations (pp.274-284): no item type, and the GM picks them | Not planned |
| Mass battle (pp.236-241) | Not planned |
| Content beyond the Core Rulebook | Not planned |
| Translated entry names | Not planned |
| Shops and loot | Not planned |
| Book-text sweep of `src/packs/` before release | 19 |
