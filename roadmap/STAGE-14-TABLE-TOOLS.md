# Stage 14: Table tools

**Goal:** the table gets pf2e-style conveniences over the flows 4.0.0 already has: text links that roll checks,
post damage, apply conditions, and test Fear from any journal, item description, or chat message; a GM request card
each player rolls from with their own character; an effect panel; hotbar macros; and floating Wound and Void numbers
on tokens.
**Needs:** 13. It ships in 4.0.0 and runs before the coverage audit (15) and playtest (16), so they cover its
actions, settings, and links.

Each tool routes to a flow an earlier stage built and computes no rule itself. pf2e
(`%LOCALAPPDATA%\FoundryVTT\Data\systems\pf2e`: `InlineCheck`, `InlineDamage`, `EffectPanel`) and fabula-ultima
`roadmap/STAGE-12-TABLE-TOOLS.md` are the references. Left out on purpose: a compendium browser (the system ships no
packs, X6), shops and loot, quick rolls (Shift-click already rolls without the dialog), and undo (Stage 10 has it).

## Rules the tools route to

| Rule | `game-rules/` file | Pages |
|------|--------------------|-------|
| Skill, Trait, and Ring rolls; Unskilled Rolls | `27_skills_in_rolls.md`, `29_types_of_rolls.md`, `30_skill_rolls_expanded.md` | 79-80 |
| Damage and Wounds | `33_wounds.md`, `74_weapons.md` | 82, 198-199 |
| Conditions | `41_conditional_effects.md` | 89 |
| Fear | `42_fear.md` | 90 |

`/rule` confirms each page when the stage starts.

## Foundry v14 APIs

The l5r4 reference has none of the first three; fabula-ultima's reference does, with installed-source lines. Each is
UNVERIFIED here until `/foundry-api` checks it against 14.370, then it goes into `FOUNDRY-V14-REFERENCE.md`.

| Need | API |
|------|-----|
| Text links | `CONFIG.TextEditor.enrichers` entries `{id, pattern, enricher, onRender, replaceParent}`; global pattern; `onRender(element, {signal})` (fabula-ultima FOUNDRY-V14-REFERENCE.md §5.4, `client/applications/ux/text-editor.mjs:139-148, 264-279, 408-427`) |
| Hotbar macros | `hotbarDrop` hook, which cancels core handling when it returns `false` (`client/applications/ui/hotbar.mjs:496`); `Macro` documents of type `script` |
| Floating numbers | `canvas.interface.createScrollingText(origin, text, options)` (`client/documents/active-effect.mjs:1046`) |
| Effect panel | `ApplicationV2` with `HandlebarsApplicationMixin` (§4.1-4.3); its button through `getSceneControlButtons` (§8), as `module/services/combat/index.js:39` adds Duel and Guard |
| Request card | A ChatMessage subtype (`documentTypes`, `TypeDataModel`, §2.2, §3.1), as `module/data/chat/RollMessageData.js` is |

## Audit

| Where | Finding |
|-------|---------|
| `rg -n "TextEditor.enrichers\|hotbarDrop\|createScrollingText" module` | None (2026-11-14) |
| `module/services/chat.js:193` | `[[XkY]]` typed in chat becomes a bare Foundry roll with no actor. The links differ: they roll through the actor's pipeline and post its cards. Both stay |
| `module/services/chat.js:110`, `module/services/combat/index.js:67-69` | Chat-card buttons are bound in services through `renderChatMessageHTML`; the request card follows them |
| `module/services/dice/check/roll-check.js:204` | `rollCheck(request)`: the one roll pipeline every link and macro calls |
| `module/services/combat/damage.js:307` | `applyDamage`: what the damage card's buttons call |
| `module/config/status-effects.js:43` | `STATUS_EFFECTS` ids: the condition names a link accepts |
| `module/services/fear.js` | The Fear test a link starts |
| `module/config/expiry-events.js`, `module/services/effects/uses.js` | Effect durations and use counters the panel shows |

## Deliverables

### Text links

| Layer | File | Does |
|-------|------|------|
| Utils | `module/utils/link-syntax.js` | Parses and validates each link (pure): `@Check[skill=Kenjutsu\|trait=agi\|tn=20]`, `@Check[trait=ref]`, `@Check[ring=water\|tn=15]`, `@Damage[3k2]`, `@Condition[dazed]`, `@Fear[2]`, each with an optional `{label}`. An unknown Trait, Ring, or condition id, or a TN, pool, or Fear Rank that is not a whole number in range, is a parse error shown as a broken link with its reason |
| Services | `module/services/links.js` | A Check link opens the check dialog for the acting character through `rollCheck`, prefilled and still editable; a Skill the character lacks rolls Unskilled with the link's Trait. A Damage link posts a damage card the Stage 10 buttons apply. A Condition link applies the status to the targeted tokens, else the controlled ones, through `module/services/effects/apply.js`. A Fear link starts the Fear test on those tokens |
| Setup | `module/setup/enrichers.js` | Registers the enrichers in `init` |
| Data models | `module/data/chat/CheckRequestData.js` | The `checkRequest` ChatMessage subtype: the link's request and label. Schema change: `system.json` `documentTypes` gains it (show the diff) |
| Services | `module/services/check-request.js` | A GM's Check link has a second button that posts a request card; each player's Roll button, bound through `renderChatMessageHTML`, rolls it with their own character. A button, not a modifier click, so the keyboard reaches it |
| Templates | `templates/links/inline-link.hbs`, `templates/chat/check-request.hbs` | |

### Effect panel

| Layer | File | Does |
|-------|------|------|
| Utils | `module/utils/effect-duration.js` | An effect's end (its expiry event, rounds or uses left, no set end) as a localization key and data |
| Apps | `module/apps/effect-panel.js` | Floating panel listing the effects on the controlled token, else the user's character: name, icon, source, how long it lasts; opening the source; removing an effect its owner may remove. Opened by a token-controls button; redrawn on `controlToken` and on effect and actor changes |
| Templates, styles | `templates/apps/effect-panel.hbs`, `scss/components/_effect-panel.scss` | |

### Hotbar macros

| Layer | File | Does |
|-------|------|------|
| Sheets | `module/sheets/ui/macros.js` | `rollItem(uuid)` and `rollTrait(actorUuid, key)`, on `game.system.api` in `init`. A dropped skill, weapon, spell, kata, Trait, or Ring becomes a script macro calling them, one per item or Trait per user. Sheets layer, since both open the dialogs the sheet's own buttons open |
| Sheets | PC and NPC sheets | Item rows, Traits, and Rings drag |
| Hooks | `module/hooks/register-all.js` | `hotbarDrop` routes to `macros.js` and cancels core's handling only for what it makes |

### Floating numbers

| Layer | File | Does |
|-------|------|------|
| Utils | `module/utils/floating-text.js` | The signed change of Wounds and Void Points between two states, and its text with the resource's name, so meaning never rests on color |
| Services | `module/services/scrolling-text.js` | On an actor update, shows the change over each of its tokens on every client; hidden tokens show nothing to players |
| Setup | `module/setup/settings/client.js` | Client setting: floating numbers on or off (on by default) |

Every new string is an `l5r4.` key in `lang/en.json`.

## Acceptance

- Vitest: `link-syntax.js` parses each link form and rejects a bad Trait, Ring, condition id, TN, pool, and Fear
  Rank; `effect-duration.js` gives each expiry event and a use counter its phrase; `floating-text.js` signs a Wound
  and a Void change and gives no text when neither changed.
- Quench: a `table-tools` batch renders each link in a journal page and clicks it (check dialog opens prefilled;
  damage card posts; condition applies; Fear test starts); a broken link renders broken; the request card rolls
  for a second user's character; the panel lists and removes an effect; a dropped skill makes a macro that opens
  its roll; an update shows scrolling text and the client setting turns it off.
- Chrome: as a player on their own client, roll from a GM's request card and from a Check link in a shared journal;
  open the effect panel on a Dazed token.

## Decisions

1. Link syntax is this system's own; Trait, Ring, and condition names are config keys, so links work in every
   language. A Skill is named as its item is, since Skills are items. Basis: fabula-ultima Stage 12 decision 2.
2. A link fills the dialog and never skips it; every choice the dialog offers stays the roller's (CLAUDE.md
   **AUTOMATE MATH, KEEP CHOICES**).

3. The tools ship in 4.0.0, before the coverage audit and playtest (Ernie, 2026-11-14).

### Still open

None.

## Out of scope

| Item | Stage |
|------|-------|
| Compendium browser, shops and loot | Not planned (no packs, X6) |
| Undo | 10 |
