# Stage 15: Compendium packs and browser

**Goal:** the system ships compendium packs of the Core Rulebook's character options, equipment, and creatures. Each
entry holds its name, its printed numbers, its mechanics as `system.rules` with summary lines generated from them,
a one-line summary of any mechanic the rules do not model, and a "Core Rulebook p.N" citation where the book's text
would go. A filtered browser searches these packs and every world compendium, and adds an entry to a
character through the same purchase flow a drop uses.
**Needs:** 14. It runs before the coverage audit (16) and playtest (17), so both cover the pack entries.

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
| Browser button in the Compendium sidebar | UNVERIFIED: the render hook of the v14 compendium directory. `/foundry-api` checks it against 14.370 and adds it to the reference |
| GM import of a creature | UNVERIFIED: `WorldCollection#importFromCompendium` on 14.370. `/foundry-api` checks it |

## Audit

State on 2026-11-14:

| Where | Finding |
|-------|---------|
| `system.json:36` | `"packs": []` |
| `package.json` | No `@foundryvtt/foundryvtt-cli`, no `build:packs` script |
| `module/sheets/handlers/drag-drop-handler.js:94-122` | `handleItemDrop`: resolves the UUID, runs `preparePurchase` (`module/services/purchase.js:87`), creates the item |
| `module/sheets/handlers/bio-item-handler.js:61` | Family and School drops replace the old item after `preparePurchase` |
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
| Services | `module/services/purchase.js` | One function that adds an item to an actor: prerequisites and choices (`preparePurchase`), and Family or School replacement. The drag-drop handler, the bio-item handler, and the browser all call it (decision 5) |

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
| Book-text sweep of `src/packs/` before release | 18 |
