# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [4.0.0] - Unreleased

4.0.0 runs on Foundry VTT 14 only and automates most of the Core Rulebook's mechanics: rules carried as data on items and effects, one roll dialog for every roll, effects that expire on their own, and damage that goes from the attack card to the target's Wounds. Page numbers below are the Core Rulebook's printed pages.

### Upgrading from 3.2.1

- Requires Foundry VTT 14.370 or later within version 14. Foundry 13 cannot install 4.0.0; stay on 3.2.1 there (manifest `https://github.com/ernieayala/l5r4/releases/download/v3.2.1/system.json`).
- The system id stays `l5r4-enhanced`, so worlds, flags, and the manifest URL are unchanged. The `l5r4-migrator` module is only for worlds from the old `l5r4` system.
- Back up the world, then open it as a GM. The migrations run once, on the first load by a GM, when "Run migrations on startup" is on (the default). They cover world actors and items, items on actors, unlinked tokens, and every unlocked Actor and Item compendium: unlock your world compendiums before that first load.
- What the migration converts:
  - Family and School Trait and Void bonuses become `TraitAdjust` rules.
  - An item's Free Raises value becomes a `FreeRaise` rule on every roll, which you can narrow on the Rules tab.
  - Master of Blood gets its rules.
  - Stance, condition, and Fear effects get their rules. An old Fear effect ends with the encounter. Old timed effects keep no duration.
  - NPCs with the stored 2k2 Initiative roll the formula instead.
  - Bows become weapons. Emphases split into available and trained lists. Icons move to `.webp`.
- Removed on load: the Skill "Insight bonus" field, the kata and kiho `cost` field, and the PC Void-on-Armor-TN markers.
- After upgrading, check:
  - XP totals. Void XP now counts its bonus, kata and kiho cost their Mastery Level, and Family and School bonuses to the same Trait are free. 3.2.1 counted a Family or School Trait bonus twice: the bonus raised the Trait, and the first rank bought to 3 was also free. 4.0.0 charges that rank at 4 × the new rank (p.103), so XP spent rises for characters who bought ranks in a Trait their Family or School raised.
  - Insight Rank. It counts only bought ranks and creation bonuses, plus Courtier and Etiquette Mastery Insight.
  - NPC Wounds and Initiative.
- A Full Defense roll saved by 3.2.1 is not carried over; 4.0.0 asks for the roll at each Turn start.
- Damage cards posted before 4.0.0 keep their Apply buttons.
- New text shows in English until each translation adds it. The status effect names moved from `EFFECT.*` to `l5r4.ui.statusEffects.*`.

### Added

- Rule engine: every Item and Active Effect carries `system.rules`, applied while the actor is prepared.
  - Rules support 28 keys, among them TraitAdjust, RollModifier, ArmorTN, Reduction, FreeRaise, DiceRule, ApplyCondition, ChoiceSet, GrantItem, Cost, and Prerequisite.
  - Selectors, predicates, and formulas such as `@rings.air` and `@school.rank` control where a rule applies and how much it gives. Typed bonuses stack as the book stacks them.
  - Armor rules apply while it is worn, weapon rules to that weapon's rolls, and kata, kiho, and tattoo rules while they are active. `ACTIVE_EFFECTS.md` describes every key.
- One roll dialog for Skill, Trait, Ring, spell, maho, attack, damage, Initiative, and inline rolls.
  - It lists each modifier with its source and a box to leave it off.
  - It covers Raises (at most the Void Ring, p.79), Free Raises, a Void Point (+1k1, p.78), an Emphasis (p.133), keeping fewer dice, and situational modifiers.
  - An attack starts at its target's Armor TN. The roll's context is stored on the chat message.
  - New chat menu entries: "Contested Roll" (p.80) and "Re-roll, keep the better".
  - Inline `[[XkY]]` rolls take `u` (unskilled), `e` (Emphasis), and `xN` (explode on N).
  - A Ring roll can cast a spell with no spell item, choosing the spell slot in the dialog.
- Effects and durations:
  - Stances and conditions are status effects that carry their rules. Effects expire at Turn start or end, Round end, combat end, the end of an encounter, or a time in the world, and are deleted when they do.
  - Dazed and Stunned roll their saves in the Reactions stage; the Dazed TN drops by 5 after each failure (p.89).
  - Full Defense asks for its roll at each Turn start. Center Stance gives +10 Initiative next Round and +1k1 plus the Void Ring on one roll (p.84).
  - Concentration asks for a Willpower roll after a heavy hit (p.166).
  - Fear ends with its combat or with the GM's "End encounter" control (p.90).
  - The once-per-Round Void Point limit warns without blocking (p.78).
  - Prone follows the Wound Rank at Down and Out.
- Damage loop:
  - The attack card rolls damage from the weapon, Strength, arrow, Increased Damage Raises, and rules, and applies it to the attack's target, or the selected tokens, after Reduction.
  - Invulnerability (p.319) and Spirit (p.320) creatures are handled.
  - "Reduce with Void" on the result card takes 10 Wounds off (p.78), and Undo reverses the damage. Past Out marks the character Dead (p.82).
  - Maneuvers paid with Raises (pp.85-87): Called Shot, Disarm, Extra Attack, Feint, Guard, Increased Damage, Knockdown.
  - Iaijutsu duels (pp.87-88) and grapples (pp.88-89) run as chat-card flows; Guard is set from the token controls (p.88).
- Rule authoring and character options:
  - A Rules tab on item sheets and on the system's Active Effect sheet, with a form per rule key and a JSON view.
  - Prerequisites, choices, and granted items are handled when an item is dropped on a character.
  - A School grants its Skills (p.102) and each Technique as its School Rank arrives. A second School asks whether to replace the first or add beside it.
  - Kata, kiho, and tattoos are switched on with a play button on the sheet.
  - The XP manager reads prices from `Cost` rules. A kiho can be marked a free School Kiho, with a warning past the School's allowance (p.231).
  - The Ledger records Honor, Glory, Status, and Taint gains and losses with a reason (p.90).
  - Shadowlands Taint penalties apply at Taint Ranks 3 and 4, and Embracing the Taint is a choice in the dialog (pp.277-279).
  - Item folders export and import items with their rules.
  - The PC sheet gets a recalculate button and a GM switch between computed and typed Insight Rank.
- Table tools:
  - Text links `@Check`, `@Damage`, `@Condition`, and `@Fear` work in journals, item descriptions, and chat. The GM's Check links also post request cards that each player rolls.
  - An effect panel (the hourglass in the token controls) lists effects with their source and remaining time.
  - Skills, weapons, spells, kata, kiho, Traits, and Rings drag to the hotbar as macros.
  - Wound and Void Point changes float over tokens.
- Compendium packs and browser:
  - 15 packs in the "L5R4 Core Rulebook" folder: Clans, Families, Schools, Techniques, Skills, Advantages, Disadvantages, Spells, Kata, Kiho, Tattoos, Weapons, Armor, Equipment, and Creatures (GM only).
  - Entries carry names, printed numbers, rules, and a page citation, never the book's text. Item sheets, NPC sheets, and chat cards show the source page.
  - A Compendium Browser (Browse in the Compendium sidebar) has tabs, filters, a name search, Add to your character, and the GM's creature Import.
- Settings:
  - "Optional rule: Honor Roll" (p.92), with a GM "New session" control.
  - "Floating Wound and Void numbers".
  - A GM design gallery.
- Weapons:
  - Thrown weapons can add Strength and explode (pp.200, 202).
  - Bows get a minimum Strength, mounted and on-foot TNs, and shots into melee (p.199).
- Skills: Skill Rank 10's Free Raise (p.133), Iaijutsu Mastery at Ranks 5 and 7 (p.140), and a Void Point that lets a rank-0 Skill roll as rank 1 (p.78).
- A struck duelist can yield (p.87).
- When the GM has the game open in more than one window, only one of them answers players' requests.

### Changed

- Wound penalties raise the TN instead of lowering the total (p.82). Healthy and Out carry no penalty.
- Unskilled rolls never explode and take no Raises or Free Raises; a Void Point on one gives +1k1 (pp.78, 80).
- The Raise limit is the Void Ring (p.79). Void Points are no longer spent on damage.
- Skill item bonuses and Full Attack's +2k1 count once.
- Initiative pools follow the Ten Dice Rule (p.77). A Void Point gives +10 for that roll only (p.78). A macro's own Initiative formula is used.
- Item chat cards post in the chat log's message mode instead of always publicly.
- Clan, Family, and School drops replace the old one in a single step.
- NPC attacks are three slots: deleting one clears it, and "Add Attack" fills the first empty one.
- Chat cards show a button only to the users who may press it.
- A roll with no TN shows only its Raises.
- Cards list every TN change the roll used.
- The Honor Roll takes the roller's dice penalties.

Wording. Dialog buttons name their action ("Set cap", "Allow", "Start session", "Spend Void Point", "Remove") in place of OK and Yes/No, and the XP manager's add button reads "Add XP". Window and card titles that pair a name with a label are one translatable phrase each; a translation that had translated the wound configuration title keeps it. A check made with a Void Point is labelled "[Void]" in place of "Void!". A spent spell slot reads "[Use spell slot Fire]" or "[Use Void spell slot]", and an empty Void slot reads "Void spell slots: 0".

CSS custom properties renamed. The Ring colors now hold whole colors instead of RGB triplets: read them as `var(--l5r4-color-ring-water)`, not `rgb(var(--water-ring-color))`.

- `--water-ring-color` -> `--l5r4-color-ring-water`
- `--earth-ring-color` -> `--l5r4-color-ring-earth`
- `--fire-ring-color` -> `--l5r4-color-ring-fire`
- `--void-ring-color` -> `--l5r4-color-ring-void`
- `--l5r4-ring-rank-backdrop-color` -> `--l5r4-color-ring-rank-backdrop`
- `--l5r4-ring-rank-backdrop-image` -> `--l5r4-image-ring-rank-backdrop`
- `--controls` -> `--l5r4-size-column-controls`
- `--air-ring-color` -> `--l5r4-color-ring-air`, also darker: `#64798d` in place of `#889eb3`, so ring text on it meets its contrast minimum

CSS classes renamed. Posted chat cards keep their stored classes (`chat-card`, `item`, `title`, and the rest), so their styles are unchanged.

- `main-sheet` -> `l5r4-sheet-body`
- `stats` -> `l5r4-sheet-main`
- `sidebar` (actor sheet column) -> `l5r4-sheet-sidebar`
- `actor-img` -> `l5r4-portrait`
- `actor-header` -> `l5r4-actor-header`
- `pc-info` -> `l5r4-pc-info`
- `limited-sheet` -> `l5r4-limited`
- `name` (Limited view heading) -> `l5r4-limited-name`
- `section-title` -> `l5r4-section-title`
- `section-container` -> `l5r4-section-body`
- `-bio-section` -> `l5r4-section -bio`
- `title` (section heading) -> `l5r4-section-heading`
- `title` (PC and NPC header label) -> `l5r4-form-field-label`
- `armor` -> `l5r4-section l5r4-armor`
- `combat` -> `l5r4-section l5r4-combat`
- `fear` -> `l5r4-section l5r4-fear`
- `wounds` (Wounds section root) -> `l5r4-section`
- `item-list` -> `l5r4-item-row-list`
- `-header` (sort header list) -> `l5r4-sort-header`
- `item` (header rows, NPC attack rows, XP manager rows) -> `l5r4-item-row`
- `item` (item card root on a sheet) -> `item l5r4-item-row` (`item` stays for posted cards)
- `item` (item sheet tab) -> `l5r4-tabs-tab`
- `item-sort-by` -> `l5r4-sort-header-button`
- `expanded-text` -> `l5r4-item-row-details`
- `emphasis-display` -> `l5r4-item-row-emphases`
- `spell-ring` -> `l5r4-item-row-cell`
- `spell-mastery` -> `l5r4-item-row-cell`
- `spell-cast` -> `l5r4-item-row-cell`
- `spell-range` -> `(removed)`
- `item-activate` -> `l5r4-inline-control-activate`
- `effect-controls` -> `l5r4-inline-control`
- `expandable` -> `l5r4-expand-control`
- `input-placeholder` -> `l5r4-form-field-value`
- `grid` -> `l5r4-grid`
- `wound-grid` -> `l5r4-wound-track`
- `fear-test` -> `l5r4-fear-test`
- `button-mask-container` -> `l5r4-button -roll`
- `trait-roll` -> `l5r4-button -roll`
- `mas` (roll button) -> `l5r4-button-under`
- `mas` (rank track) -> `l5r4-rank-control-under`
- `trait-rank` -> `l5r4-rank-control -trait`
- `trait-increase` -> `l5r4-rank-control-arrow -up`
- `trait-decrease` -> `l5r4-rank-control-arrow -down`
- `rank-name-container` -> `l5r4-rank-control -track`
- `rank-name` -> `l5r4-rank-control-value`
- `ranks` -> `l5r4-ranks`
- `ledger-open` -> `l5r4-ranks-ledger`
- `ring-name` -> `l5r4-ring-name`
- `ring-name-<ring>` -> `l5r4-ring-name -<ring>`
- `<ring>-ring` -> `l5r4-ring -<ring>`
- `<ring>-ring-img` -> `l5r4-ring-image`
- `ring-rank` -> `l5r4-ring-rank`
- `ring-rank-<ring>` -> `l5r4-ring-rank -<ring>`
- `trait` -> `l5r4-trait`
- `trait-stamina` -> `l5r4-trait -earth -stamina`
- `trait-willpower` -> `l5r4-trait -earth -willpower`
- `trait-strength` -> `l5r4-trait -water -strength`
- `trait-perception` -> `l5r4-trait -water -perception`
- `trait-reflex` -> `l5r4-trait -air -reflexes`
- `trait-awarness` -> `l5r4-trait -air -awareness`
- `trait-agility` -> `l5r4-trait -fire -agility`
- `trait-intelligence` -> `l5r4-trait -fire -intelligence`
- `void-points` -> `l5r4-void-points`
- `void-points-dots` -> `l5r4-void-points-dots`
- `-filled` (Void Point dot) -> `is-filled`
- `void-points-name` -> `l5r4-void-points-label`
- `void-dot` -> `l5r4-void-point`
- `traits-rings` -> `l5r4-traits-rings`
- `ring-roll` -> `l5r4-ring-roll`
- `effect-create`, `effect-edit`, `effect-toggle`, `effect-delete` -> `(removed)`; the controls carry `data-effect-create`, `data-effect-edit`, `data-effect-toggle`, `data-effect-delete`
- `title` (NPC attack row name) -> `(removed)`; the name keeps `l5r4-item-row-name`
- PC and NPC sheet windows add `l5r4-actor-sheet`, the item sheet window `l5r4-item-sheet`
- `spells` (spell slot group) -> `l5r4-spell-slots`
- `slots` -> `l5r4-spell-slot`
- `wealth` (item section fields) -> `l5r4-wealth`
- `l5r4-browser-tabs` -> `l5r4-tabs -filter`
- `l5r4-browser-tab` -> `l5r4-tabs-tab`
- `l5r4-browser-controls` -> `l5r4-compendium-browser-controls`
- `l5r4-browser-filters` -> `l5r4-compendium-browser-filters`
- `l5r4-browser-filter` -> `l5r4-compendium-browser-filter`
- `l5r4-browser-search` -> `l5r4-compendium-browser-search`
- `l5r4-browser-clear` -> `l5r4-compendium-browser-clear`
- `l5r4-browser-results-part` -> `l5r4-compendium-browser-results-part`
- `l5r4-browser-count` -> `l5r4-compendium-browser-count`
- `l5r4-browser-results` -> `l5r4-compendium-browser-results`
- `l5r4-browser-row` -> `l5r4-compendium-browser-row`
- `l5r4-browser-icon` -> `l5r4-compendium-browser-icon`
- `l5r4-browser-text` -> `l5r4-compendium-browser-text`
- `l5r4-browser-name` -> `l5r4-compendium-browser-name`
- `l5r4-browser-details` -> `l5r4-compendium-browser-details`
- `l5r4-browser-source` -> `l5r4-compendium-browser-source`
- `l5r4-browser-button` -> `l5r4-compendium-browser-button`
- `l5r4-browser-empty` -> `l5r4-compendium-browser-empty`
- `sheet-header` (item sheet) -> `l5r4-item-header`
- `profile` -> `l5r4-item-header-image`
- `header-fields` -> `l5r4-item-header-fields`
- `document-name` (item sheet) -> `l5r4-item-header-name`
- `prose-title` -> `l5r4-item-description-heading`
- `effects-list` -> `l5r4-effect-list`
- `effect` -> `l5r4-effect-list-row`
- `effect-name` -> `l5r4-effect-list-name`
- `l5r4-link` -> `l5r4-inline-link`
- `l5r4-link-request` -> `l5r4-inline-link-request`
- `l5r4-link-broken` -> `l5r4-inline-link -broken`
- `l5r4-link-reason` -> `l5r4-inline-link-reason`
- `check-pool` -> `l5r4-check-dialog-pool`
- `check-modifiers` -> `l5r4-check-dialog-group`
- `check-substitutes` -> `l5r4-check-dialog-group`
- `check-extras` -> `l5r4-check-dialog-group`
- `maho-dialog` -> `l5r4-check-dialog-group`
- `check-modifier` -> `l5r4-check-dialog-modifier`
- `check-modifier-label` -> `l5r4-check-dialog-modifier-label`
- `check-modifier-value` -> `l5r4-check-dialog-modifier-value`
- `warning-text` -> `l5r4-check-dialog-warning`
- `l5r4-ledger` -> `l5r4-ledger-dialog`
- `ledger-entries` -> `l5r4-ledger-dialog-entries`
- `ledger-track` -> `l5r4-ledger-dialog-track`
- `ledger-points` -> `l5r4-ledger-dialog-points`
- `ledger-reason` -> `l5r4-ledger-dialog-reason`
- `rules-toolbar` -> `l5r4-rules-editor-toolbar`
- `rules-mode` -> `l5r4-rules-editor-mode`
- `rules-json` -> `l5r4-rules-editor-json`
- `rules-add` -> `l5r4-rules-editor-add`
- `rule-card` -> `l5r4-rules-editor-card`
- `rule-delete` -> `l5r4-rules-editor-delete`
- `rule-error` -> `l5r4-rules-editor-error`
- `rule-field` -> `l5r4-rules-editor-field`
- `xp-modal-dialog` (window) -> `l5r4-xp-manager`
- `xp-breakdown-list` -> `l5r4-xp-manager-breakdown`
- `wound-config-app` (window) -> `l5r4-wound-config`
- `armor-config-app` (window) -> `l5r4-armor-config`
- `combat-config-app` (window) -> `l5r4-combat-config`
- `condition-manager` (window) -> `l5r4-condition-manager`
- `condition-manager-container` -> `l5r4-condition-manager-body`
- `emphasis-manager` (window) -> `l5r4-emphasis-manager`
- `emphasis-manager-container` -> `l5r4-emphasis-manager-body`
- `emphasis-list-container` -> `l5r4-emphasis-manager-list`
- `custom-emphasis` -> `l5r4-emphasis-manager-item -custom`
- `npc-attack-config` (window) -> `l5r4-npc-attack-config`
- `wealth-manager` (window) -> `l5r4-wealth-manager`
- `wealth-display` -> `l5r4-wealth-manager-display`
- `wealth-item` -> `l5r4-wealth-manager-item`
- `wealth-value` -> `l5r4-wealth-manager-value`
- `controls` (row control cluster) -> `l5r4-inline-control -reveal`
- `button` (roll button face) -> `l5r4-button-face`; the face is a `<button>`
- `title` (XP manager and NPC attack row names) -> `l5r4-item-row-name`
- `clickable` (XP manager cap) -> `l5r4-xp-manager-cap`
- `check-maneuvers` -> `l5r4-check-dialog-maneuvers`
- Section roots, template roots, and item tab panels gained `l5r4-` block classes (`l5r4-section`, `l5r4-item-details`, `l5r4-item-modifiers`, `l5r4-<window>-body`); their old classes stay

Clickable controls are `<button type="button">` in place of `<a>`, `<span>`, and `<div>`; core's focus ring shows on them, and on a sheet the viewer cannot edit core disables them. Icon-only controls carry `data-tooltip` and `aria-label` in place of `title`.

Data attributes and prepared values renamed (none is stored in world data):

- `data-system-ring` (Ring roll) -> `data-ring-key`
- A Skill's prepared `system.rollDice`, `system.rollKeep`, and `system.keepDice` -> `system.roll`, `system.keep`
- A spell's prepared `system.castTN` -> `system.castTn`
- `L5R4Combat.resolveInitiativeBonuses` -> `L5R4Combat.askInitiativeBonuses`; `L5R4Combat.events` -> `L5R4Combat.EVENTS`
- `CONFIG.l5r4.npcNumberWoundLvls` -> `CONFIG.l5r4.npcNumberWoundLevels`

### Removed

- `template.json`, replaced by one data model per Actor and Item type.
- The Skill "Insight bonus" field (#75), the kata and kiho `cost` field (#43), and the PC fields `armorTn.useVoid` and `voidRound`. A Void Point on Armor TN is now an effect that lasts to the end of the Round (p.78).
- The `voidInitiative` actor flag and the Combat and Combatant prototype patches.
- The 3.2.1 `attackBonus` and `damageBonus` effect flags and behavior keyed by stance or item name; rules replace them.
- CSS rules no template used: `-gap-xl`, `clear-btn`, `void-points-amount`, `item-list -advantages`, `expanded-text -npc`, `editor-container`, `price-section`, `price-field`, `sheet-content > h4`
- Classes no style or script read: `info-group`, `sized`, `effects` (item effects tab wrapper), `message` (design gallery), `rules` (Active Effect Rules tab)

### Fixed

Rules checked against the Core Rulebook:

- An exploding 10 adds to its own die before dice are kept (p.77) (#46)
- Ten Dice Rule: extra rolled dice become kept dice only while fewer than ten are kept, then each extra die is +2, and no pool keeps more than it rolls (pp.77, 89) (#47). The Little Truths option adds +2 only to pools that conversion left under ten kept dice (#71)
- A contested roll with Raises must win by 5 per Raise (p.80) (#48)
- Full Attack's +2k1 applies to melee attacks only (p.84) (#49)
- Dazed no longer lowers damage rolls, reaches Initiative, and prevents starting a duel (p.89) (#50)
- Prone gives -2k0 to attacks with weapons that are not large (p.89) (#51)
- Armor Piercing and Flesh Cutter arrows change the target's armor bonus (p.199) (#52)
- Riding armor gives its mounted bonus and its penalty on foot (p.198) (#53)
- A Feint's margin is measured against Armor TN + 10 (p.86) (#54)
- Insight counts bought ranks and creation bonuses only (p.104) (#55); Courtier and Etiquette add their Mastery Insight (pp.135-136) (#72)
- Spell Casting: players cannot cast above their School Rank unless the GM allows it, Affinity and Deficiency move that limit, Void spells roll Void, and universal spells use the chosen element (pp.163-165) (#57)
- Master of Blood adds +10 to the TN of spells that are not maho (p.280) (#58)
- Skill Rank 10 gives its Free Raise (p.133) (#59)
- Fear and Dazed reach the Initiative pool (pp.89-90) (#60)
- The duel Assessment counts an NPC as Insight Rank 1 (p.87) (#61)
- Maho Taint goes through the ledger and rolls into a new Taint Rank (p.275) (#62)
- Status can go below 0 (pp.94-95) (#63)
- Family and School bonuses to the same Trait, and to Void, are free creation ranks (pp.102-103) (#44, #65)
- Lost characters add their Taint Rank to physical Trait rolls and have no Void Points (p.279) (#68)
- An item's Free Raises no longer reach every roll (p.79) (#69)
- Horsemanship Rank 3 allows Full Attack while mounted (pp.89, 140) (#73)
- The Honor modifier against Intimidation applies to resisting rolls only (p.91) (#81)
- Strength from an Active Effect reaches weapon damage, and XP charges only bought Strength (pp.103, 198) (#29)
- NPC Initiative rolls (1 + Reflexes)k(Reflexes) (p.81) (#30)
- A weapon's "Explodes on" value applies to its damage rolls (p.77) (#37)
- NPC formula Wound levels keep their Earth-based values (p.82) (#38)
- NPCs heal on a long rest (p.84) (#40)
- Mounted +1k0 reaches Skill weapon attacks (p.89) (#41)
- Shift-click Trait rolls include Trait bonuses (#42)
- Kata and kiho XP is their Mastery Level (pp.231, 259) (#43)
- Timed effects on unlinked combatants keep expiring after a reload (#45)

Found in play:

- The Rules tab no longer marks a `{choice:...}` placeholder as an error (#74), and saving an item sheet keeps a rule value its list has no option for (#84)
- Clicking an item sheet's image opens the file picker (#76)
- A School grants each Technique once (#80)
- Skill and spell rows with Mastery, area, or duration lines expand (#83)
- A School's Skill choice no longer offers Skills it already grants (p.102) (#85)
- The Wound configuration mode saves when changed from the keyboard (#86)
- The XP manager names Trait and Void purchases by the ranks on the sheet (p.103) (#87)
- The School badge on Skill rows stays visible on darker rows (#88)
- The browser's Trait filter shows "Void" translated (#89), and its Page filter leaves out entries with no page (#95)
- A kiho above the character's Mastery Level is refused for a player and allowed for the GM (p.261) (#90)
- A new PC starts with Void Points equal to its Void Ring (p.78) (#91)
- The Disadvantage XP cap and manual XP changes are GM only (#92)
- A second School asks to replace or add before its choices, gives no free Skills, and holds its Techniques until its Skills reach rank 1 (p.151) (#93, #96); the Bio lists every School (#97)
- An NPC attack with no damage shows no damage button (#94)
- A roll with no TN no longer shows a TN made from its Raises (p.80) (#98)
- The browser's Import asks before replacing a world creature (#100)
- Changing a bow's arrow updates its damage button at once (pp.198-199) (#101), and its attack dialog lists the arrow's Armor TN change (p.199) (#105)
- Out shows no TN penalty (p.82) (#102)
- The sheet's Initiative pool follows the Ten Dice Rule under Fear (pp.77, 89) (#103), and a Void Point spent on Initiative counts in Round 1 (pp.78, 81) (#104)
- The Honor Roll is offered only to a character with an Honor Rank, once per session, with the roller's dice penalties (pp.90, 92) (#107, #111, #114)
- Undo shows only to the roller's owner and the GM (#108), and other card buttons only to who may press them (#112)
- A save card takes one roll per save, and Stunned ending at Round end posts none (p.89) (#109, #116)
- Effects timed to a Turn end from the actor's own combat (p.84) (#110)
- "Reduce with Void" with no Void Points warns the player who clicked it (p.78) (#113)
- A grapple's TN change shows in the dialog and on the card (p.88) (#115)
- A Void Point that brings Wounds back within Out lifts Dead (pp.78, 82) (#117)
- A Technique's Focus bonus is offered on the duel's Focus roll only (#118), and Focus Free Raises reach the Strike (pp.79, 87) (#119)
- Air Fist lowers unarmed damage only (p.262) (#121)
- The Void Point dots and Void Points held follow a maximum lowered by Taint (pp.278-279) (#122, #124)
- Maho's extra blood Free Raises can lower the TN (pp.79, 268) (#123)
- Memorizing a spell no longer has other clients write the caster's XP (#125)
- A monk's School Kiho cost no XP (p.231) (#127)
- When the GM has the game open in two windows, a player's request is carried out once (#82)

Sheets and windows:

- NPC sheet Skills sort by their Roll and Emphasis heads, which did nothing before
- NPC sheet attack rows show the attack's damage type in the Type column, which was always empty
- Two overlapping casts could spend one spell slot twice or leave a negative count; an unknown Ring or a missing caster now gets its own message
- A cast refused for want of a spell slot no longer rolls or posts a card: the slot is spent before the roll, and a cast that stops before it rolls (a Void Point it cannot spend) gets its slot back
- Removing an item, an NPC attack, or a custom Emphasis says what goes with it
- The spell element choice names its list for screen readers
- A section's expand arrow points the way the section is, after the sheet redraws
- Each Ring's roll button names its Ring ("Roll Air") in place of "Ring Roll"
- A damage card posted before 4.0.0 applies at most 99 Wounds from its stored damage
- Pools, ranks, and other numbers line up in their columns (tabular figures); the XP manager's separators match core's windows

### For module and macro authors

- `game.system.api.rollItem(uuid)` and `rollTrait(actorUuid, key)` are new; the hotbar macros call them.
- `CONFIG.Dice.terms.d` is the system's `L5R4Die`, whose `xa` modifier adds an explosion to its die.
- ChatMessage types `roll` (pool, modifiers, TN, Raises, target, outcome) and `checkRequest`.
- `CONFIG.Combat.documentClass` and `CONFIG.Combatant.documentClass` are `L5R4Combat` and `L5R4Combatant`. Active Effects carry `system.rules`, `system.level`, and `system.group`, and use v14 `system.changes`. A Trait change must use the `initial` phase to reach derived values.
- Expired effects are deleted. `encounterEnd` is a new expiry event.
- The hook `l5r4-enhanced.immuneStatus` (actor, effect) fires when a `ConditionImmunity` rule blocks a status.
- GM queries: `l5r4-enhanced.damage`, `.flow`, `.applyEffect`, `.settleCenter`, `.endConcentration`, `.answerPrompt`. The system uses the `system.l5r4-enhanced` socket channel.
- Status effect ids are unchanged; an effect created with only `statuses: [id]` gets that status's rules.

---

## [3.2.1] - 2025-11-03

### Removed

- Roll dialog settings (trait, skill, spell, weapon)
- Automatic insight rank calculation setting
- NPC void points display setting
- Default NPC wound mode setting

### Changed

- Armor stacking setting moved to Combat Config dialog
- NPC void points auto-show when Void Ring >= 1
- NPC trait controls use direct increase/decrease buttons
- TraitHandler integrated for NPC trait adjustment

### Added

- `TraitHandler.increase()` - direct trait increment
- `TraitHandler.decrease()` - direct trait decrement
- Shift+Click rank mode toggle tooltip
- Combat configuration labels in localization
- Armor stacking labels in localization

### Fixed

- `calculateXpDataVersion()` handles null/undefined actors
- `calculateXpDataVersion()` handles missing items property
- Test assertions updated for removed settings

---

## [3.2.0] - 2025-10-30

### Added

**Visual Animation System**

- New animation system for stances, conditions, and attacks using Sequencer + JB2A
- Stance animations: Full Attack, Full Defense, Center with visual effects
- Condition animations: Blinded, Dazed, Fatigued, Prone, Stunned, Grappled
- Attack projectile animations: arrows and kunai for bow/weapon attacks
- Animation manager for lifecycle control (play, remove, cleanup)
- Asset library with JB2A asset mapping and module detection
- Hook integration for ActiveEffect and Actor lifecycle events
- Graceful degradation when Sequencer/JB2A modules not installed
- Automatic animation cleanup on effect removal or actor deletion
- Target-based attack animations triggered from chat messages

**Armor Configuration Dialog**

- ApplicationV2-based armor configuration interface
- Edit armor TN bonus and reduction values
- Armor stacking rules configuration (highest only or all stack)
- Integrated with character sheet armor management
- Form validation and proper data persistence

**Condition Manager Dialog**

- Centralized status effect management interface
- Toggle all conditions and stances from single dialog
- Visual status indicators for active effects
- Quick access to all L5R4 status effects
- Integrated with character sheet for easy condition tracking

**Combat Configuration Dialog**

- Initiative modifier configuration
- Movement rate adjustments
- Combat-related settings in dedicated interface
- Streamlined combat setup workflow

**Wealth Manager**

- New modal wealth management application with calculator-style UI
- Add/remove money by denomination (koku, bu, zeni) with validation
- Currency conversion: 10 zeni ↔ 1 bu, 5 bu ↔ 1 koku
- Prevents negative wealth values with Math.max clamping
- No auto-normalization (5 bu stays 5 bu, not converted to 1 koku)
- Calculator icon launcher on character sheet
- Comprehensive localization in all 6 languages (en, de, es, fr, pt-BR, ru)
- 24 integration tests covering edge cases and error conditions

**Race Condition Protection**

- Roll handlers now prevent double-click exploits using in-progress tracking
- Each roll type tracked independently (skill, attack, trait, ring, spell, weapon, NPC)
- Simultaneous different rolls allowed while preventing duplicate submissions
- Protection covers all roll types: skill, attack, trait, ring, spell, weapon, NPC attacks
- Async/await pattern ensures proper cleanup after roll completion

**Hook Registration System**

- Centralized hook registration in `register-all.js`
- Single point of reference for all active hooks
- Improved debugging and maintenance of hook interactions
- Clear documentation of hook categories and execution order

**Comprehensive Test Suite**

- 18 new integration test files for edge cases and race conditions
- 6 new unit test files for services and utilities
- Tests cover: actor creation, attacks, conditions, damage, emphasis reroll, initiative
- Tests cover: item creation, migrations, skill advancement, spell slots, stances, wounds, XP
- Race condition tests for critical workflows
- Edge case coverage for all major systems

**Validators Module**

- New `utils/validators.js` for input validation
- Centralized validation logic for data integrity
- Type checking and range validation utilities

### Enhanced

**Roll System**

- All roll handlers now async with proper error handling
- Race condition protection across all roll types
- Improved roll key generation for tracking
- Better cleanup with try/finally blocks
- Consistent async patterns throughout roll services

**Resource Management**

- Spell slot manager enhanced with better validation
- Void Point manager improved with edge case handling
- Resource depletion checks more robust
- Better error messages for resource failures

**XP System**

- XP calculations refactored for clarity
- XP formatter improved with better output
- XP versioning enhanced for migration tracking
- Emphasis XP tracking more reliable
- Better handling of custom emphases

**Migration System**

- Migration helpers improved with better error handling
- Icon path migration more robust
- Emphasis migration enhanced with deduplication
- Schema application more reliable
- Embedded items migration improved
- Bow-to-weapon migration enhanced

**Dialog System**

- Roll modifier dialog improved with better layout
- Spell cast dialog enhanced with clearer options
- Maho cast dialog improved for usability
- Better keyboard navigation in all dialogs

**Chat System**

- Chat damage buttons more reliable
- Combat Void spending hooks improved
- Better error handling in chat message creation
- Improved chat card formatting

**Combat System**

- Initiative modifiers now properly configurable
- Movement tracking enhanced with configuration options
- Combat modifiers integrated into derived data calculations

**Code Quality**

- Consistent async/await patterns throughout
- Better error handling with try/catch/finally
- Improved JSDoc documentation
- Cleaner code organization
- Reduced code duplication
- Resolved 18 ESLint unused variable warnings
- Fixed deprecated CONST.CHAT_MESSAGE_TYPES usage (replaced with CONST.CHAT_MESSAGE_STYLES)
- Improved code formatting with Prettier
- Better JSDoc documentation for animation system

### Fixed

**Roll System**

- TN calculation reflects declared raises only
- Free raises reduce required roll result, not TN
- Void point tracking now properly handles edge cases
- Unskilled roll mechanics fixed to prevent incorrect calculations

**Character Sheet**

- Fixed trait values stacking on sheet recalculation
- Trait bonuses now apply correctly without duplication

**Deprecation Warnings**

- Updated chat message type constants to use CONST.CHAT_MESSAGE_STYLES
- Resolved Foundry v13 API deprecation warnings

**Code Cleanup**

- Fixed race condition protection in roll handlers
- Improved async/await patterns in animation hooks
- Better error handling throughout animation system

**Emphasis Migration**

- Old emphases now properly marked as trained (selected) in new system
- Trained emphases are now correctly added to `trainedEmphases` array during migration
- Previously purchased emphases no longer appear as unpurchased after migration

**Icon Migration**

- Fixed embedded item icons not updating on actor sheets
- Icon migration now processes items owned by actors (embedded items)
- Items on character sheets will now properly update from old PNG to new WebP icons

**Race Conditions**

- Fixed double-click exploits in all roll handlers
- Fixed race conditions in actor creation workflows
- Fixed race conditions in item creation workflows
- Fixed race conditions in damage application
- Fixed race conditions in initiative rolls
- Fixed race conditions in skill advancement
- Fixed race conditions in XP tracking

**Resource Management**

- Fixed spell slot depletion edge cases
- Fixed Void Point spending edge cases
- Fixed resource restoration during rest
- Better validation prevents negative resources

**Roll System**

- NPC rolls use unified simple-roll system
- Formula builder edge cases handled
- Unskilled rolls properly handled
- Wound penalty application improved

**UI/UX**

- Removed transition animation on inline controls to prevent visual glitches
- Fixed item list styling issues
- Better visual feedback for roll progress

### Removed

**Code Cleanup**

- Cleaned up unused imports and dependencies
- Streamlined NPC roll system

### Technical

**Architecture**

- Centralized hook registration pattern
- Improved separation of concerns in roll handlers
- Better async/await patterns throughout
- Enhanced error handling strategies
- Race condition protection infrastructure
- New `services/animations/` module structure
- Modular animation system with clear separation of concerns
- Hook-based integration with Foundry lifecycle events
- Asset library abstraction for JB2A integration
- Animation manager service for centralized control

**Dependencies**

- Sequencer module integration (optional, graceful degradation)
- JB2A module integration (optional, graceful degradation)
- System functions without animation modules installed

**Testing**

- 18 new integration test files
- 6 new unit test files
- Comprehensive edge case coverage
- Race condition test suite
- Better test organization and fixtures

**Performance**

- Reduced code duplication in roll handlers
- More efficient roll tracking
- Better resource cleanup
- Optimized migration processes

---

## [3.1.1] - 2025-10-27

### Fixed

**Emphasis Migration**

- Improved emphasis string-to-array migration with intelligent matching
- Case-insensitive matching for official emphases (e.g., "katana" → "Katana")
- Singular/plural matching (e.g., "Dog" → "Dogs", "horse" → "Horses")
- Automatic custom emphasis creation for non-matching items
- Backward compatibility: old `emphasis` field preserved in template.json to prevent data loss
- Migration now merges old and new data safely (idempotent with deduplication)
- Preserves existing `trainedEmphases` during migration

### Enhanced

**Migration Safety**

- Migration can run multiple times safely without duplicating data
- Existing emphasis data is never lost during system updates
- Proper logging of created custom emphases during migration

---

## [3.1.0] - 2025-10-27

### Added

**NPC Attack Editor**

- ApplicationV2-based dialog for editing NPC attack and damage values
- Form fields for attack roll (XkY format) with `roll`, `keep`, `modifier` inputs
- Form fields for damage roll (XkY format) with `roll`, `keep`, `modifier` inputs
- Action type selection dropdown (Simple, Complex, Free, Reaction)
- Damage type text field for specifying damage nature
- Edit buttons integrated into NPC sheet for all three attack slots (attack1, attack2, attack3)
- Proper form submission handling with `_onSubmit` and `_onSave` actions
- HandlebarsApplicationMixin template rendering
- Localized labels using `game.i18n` for all form fields
- Window configuration with auto-height and non-resizable settings
- Direct actor update via `actor.update()` with proper system path targeting

### Enhanced

**NPC Sheet Integration**

- Attack editing workflow streamlined with dedicated dialog
- Consistent form patterns across NPC attack configuration
- Improved UX for managing multiple NPC attacks

---

## [3.0.0] - 2025-10-26

### Breaking Changes

**Test Infrastructure**

- Added comprehensive test suite requiring Quench module for integration tests
- Development workflow now includes mandatory testing before releases

### Added

**Raise & Free Raise System**

- Complete raise mechanics for all roll types (skill, trait, ring, spell, weapon, NPC)
- Declared raises increase TN by 5 each (maximum = Void Ring rank)
- Free Raises reduce TN by 5 each without Void Ring limit
- Raise input fields in all roll dialogs
- Free Raise calculation from items, advantages, techniques
- Unskilled rolls cannot declare raises
- Affinity grants 1 free raise for spell casting
- TN floor at 0 (cannot go negative)
- Visual display of raises and free raises in chat cards
- Game rules citations from Skills_and_Rolls.md

**Damage Application System**

- Apply Wounds button in damage roll chat cards
- Reduce with Void button for Void Point damage reduction (-10)
- Automatic armor reduction applied to incoming damage
- Multi-step damage calculation: Void Point → Armor → Final damage
- Visual notifications showing damage breakdown
- Armor reduction displayed in damage notifications
- One-click damage application to selected tokens

**Armor Reduction**

- Automatic damage reduction from equipped armor
- Reduction value calculated in prepareDerivedData
- Stacking rules support (highest only or all stack)
- Integration with damage application workflow
- Visual feedback showing armor effectiveness
- Works with Void Point reduction (Void first, then armor)

**Guard Maneuver Status Effects**

- Guarding status: -5 Armor TN penalty while protecting ally
- Guarded status: +10 Armor TN bonus while being protected
- Manual application by players when Guard action declared
- Proximity tracking per L5R4 tabletop rules (5 feet)
- Duration until guardian's next turn
- Integration with condition effects system

**Movement Tracking**

- Water Ring-based movement calculation
- Movement rates displayed in Combat section
- Condition penalties affect movement (Blinded -2 Water Ring)
- Automatic calculation from Water Ring value
- Visual display on character sheets

**Item Sheet Redesign**

- 4-tab modular system: Description, Details, Modifiers, Active Effects
- Eliminated 150+ lines of duplicate template code
- Conditional tab visibility based on item type
- Type-specific content in organized partials
- Improved maintainability with DRY architecture
- Better UX with categorized item properties
- Tab state management with ApplicationV2 PARTS pattern

**Emphasis System Overhaul**

- Multiple emphases per skill support
- `availableEmphases` array for skill options
- `trainedEmphases` array for purchased emphases
- Proper XP tracking for each emphasis (2 XP each)
- Emphasis Manager integration
- Migration from legacy single `emphasis` string field

**Spell Memorization**

- `memorized` boolean field on spell items
- Tracking for prepared/memorized spells
- Integration with spell management workflow

**Comprehensive Test Infrastructure**

- 440+ passing unit tests (Vitest)
- Integration test suite (Quench)
- Test fixtures for actors and items
- Smoke tests for all modules
- Unit tests for utilities and calculations
- Integration tests for services, sheets, workflows
- Test documentation in tests/README.md
- npm scripts: test, test:watch, test:ui, test:coverage
- Automated test execution in development workflow

**Void Point Combat Spending**

- Initiative Void Point spending hook
- Void Point expenditure tracking in combat
- Integration with combat tracker

**Healing Stamina Modifier**

- `healingStaminaMod` field for custom healing rate adjustments
- Allows modifying Stamina multiplier in heal rate calculation

### Enhanced

**Roll System**

- All roll types support raises and free raises
- TN calculator handles raise mechanics (+5 per raise)
- TN calculator handles free raise mechanics (-5 per free raise)
- Raise validation against Void Ring limit
- Unskilled roll detection prevents raise declaration
- Roll dialogs display raise inputs and free raise totals
- Chat messages show declared raises and free raises

**Damage System**

- Damage rolls create interactive chat cards
- Apply damage with single click
- Void Point reduction option in chat
- Armor reduction automatic and transparent
- Damage notifications show full breakdown
- Integration with token selection

**Condition Effects**

- Guard maneuver conditions (Guarding/Guarded)
- Armor TN modifiers from conditions
- Movement penalties from conditions (Blinded)
- Comprehensive condition tracking in prepareDerivedData

**Item Management**

- Modular item sheet templates
- Type-specific detail sections
- Organized modifier displays
- Cleaner Active Effects tab
- Reduced code duplication across item types

**XP System**

- Multiple emphasis tracking per skill
- Proper XP calculation for each trained emphasis
- Emphasis Manager displays all trained emphases
- XP recalculation includes emphasis costs

**Migration System**

- Free Raises field migration for all items
- Emphasis array migration from legacy string field
- Embedded items migration support
- Compendium migration support
- World-level migration execution

**Documentation**

- Comprehensive testing guide in CONTRIBUTING.md
- Testing philosophy and tier system
- AAA pattern examples
- Quench integration patterns
- Troubleshooting guide for tests
- Inline code documentation expanded

### Fixed

**Critical Bugs**

- Stance TN stacking bug (Issue #2): Removed queueMicrotask wrapper causing race condition
- Automatic trait changes during form submissions (Issue #1): Removed convertSubmitData corruption
- Emphasis XP tracking: Now uses trainedEmphases array instead of single string
- Ten Dice Rule test: Corrected test expectations

**Roll System**

- Raise validation against Void Ring maximum
- Free raise calculation from multiple sources
- TN floor enforcement (minimum 0)
- Unskilled roll raise prevention

**Item System**

- Equipped checkbox now functional on armor items
- Bow weapon icons display correctly
- Item sheet tab state persistence
- Template path references updated

**Effect System**

- Stance conflict removal synchronized
- Effect cleanup in test hooks
- Duplicate status ID declarations removed
- Guard status effect integration

**Migration System**

- Free Raises defaults backfilled for existing items
- Emphasis migration handles legacy data
- Embedded items properly migrated
- Migration execution order documented

### Technical

**Architecture**

- Modular item sheet template system
- Service-oriented raise management
- Centralized TN calculation
- Condition effects calculation module
- Test fixture infrastructure
- Mock data generators

**Code Quality**

- 73 unit tests for TN calculator
- 21 integration tests for roll types
- 561 total tests passing
- Comprehensive JSDoc coverage
- Game rules citations in code
- Linting and formatting enforced

**Performance**

- Reduced template duplication
- Optimized item sheet rendering
- Efficient raise calculation
- Streamlined damage application

---

## [2.2.1] - 2025-10-25

### Fixed

- Fixed 404 error for test file on fresh builds by converting static import to dynamic import
- Test files now only load when Quench module is active, preventing errors in production

---

## [2.2.0] - 2025-10-16

### Added

**Fear System**

- Fear mechanic for supernatural encounters
- Fear Rank 1-10 on NPC actors
- Automatic TN calculation: 5 + (5 × Fear Rank)
- Willpower + Honor Rank resistance rolls
- Failed tests apply -XkY penalty via Active Effects
- Catastrophic failure (fail by 15+) detection
- Fear test button on NPC sheets
- Multi-target testing (all controlled tokens)
- Fear status effect with custom icon
- Chat cards for test results
- Six-language localization
- Lock mechanism prevents concurrent execution

**Mounted Combat**

- Mounted status via Active Effects
- +1k0 attack bonus vs unmounted targets
- Horsemanship skill detection (multi-language)
- Visual status indicators on tokens
- Integration with attack roll system
- Works for PC and NPC attacks

**Long Rest & Healing**

- Natural healing: (Stamina × 2) + Insight Rank per night
- Resource restoration: spell slots, Void Points
- Fatigued condition removal
- Healing chat cards
- Rest button on character sheets

**UI Improvements**

- Rest button on PC/NPC sheets
- Fear test button on NPC sheets
- Mounted status toggle
- Status effect indicators
- New chat card templates

### Enhanced

**Combat**

- Attack bonuses include mounted calculations
- NPC attacks integrate stance, mounted, circumstance bonuses
- Target detection for mounted status

**Actor Data**

- `fear` structure on NPC actors
- Wound heal rate calculation
- Fear mechanics in derived data prep

**Services**

- `fear.js` - Fear mechanics
- `mounted-combat.js` - Mounted status and bonuses
- `rest.js` - Long rest and healing
- Lock mechanisms for click handlers

**Chat**

- Healing template
- Fear test results
- Speaker attribution
- Error handling

**Calculations**

- `fear-system.js` calculation module
- Heal rate: (Stamina × 2) + Insight Rank
- Fear TN: 5 + (5 × Fear Rank)
- Mounted bonus calculation
- Catastrophic failure (margin ≤ -15)

**Localization**

- Fear system (en, es, fr, pt-BR, de, ru)
- Healing notifications
- Mounted combat labels

### Fixed

- Single transaction for rest operations
- Void Point restoration uses Void Ring rank
- Fear effect status flag structure
- Spell slot restoration references ring values
- Horsemanship detection across languages
- Error handling for healing/Fear edge cases
- Chat message failure notifications

---

## [2.1.0] - 2025-10-15

### Fixed

- Header control duplication in actor sheets
- Removed deprecated edit mode toggle from PC sheet

### Enhanced

- Ternary operator formatting
- Build script: lint + format in single command
- JSDoc for sheet architecture
- Simplified package.json scripts

---

## [2.0.0] - 2025-10-10

### Breaking Changes

**Third-Party Developers**

- 4 monolithic files split into 60+ modules
- File paths and imports reorganized
- Internal APIs changed

**License**

- GPL v2 → MIT License

### Architectural Rewrite

**Before**: 4 files (3,016 lines)

- config.js, dice.js, stance.js, utils.js

**After**: 60+ focused modules

- 5 config
- 8 actor calculations
- 11 item lifecycle
- 18 dice services
- 8 stance automation
- 3 XP management
- 11 sheet handlers
- 7 utilities

### Added

**Mounted Combat**

- Mounted status via Active Effects
- +1k0 attack bonus vs unmounted targets
- Full Attack stance support (no restrictions)
- Visual feedback for stances
- Works for PC and NPC

**Combat Stances**

- Stance dropdown on character sheets
- Five stances: Attack, Full Attack, Defense, Full Defense, Center
- Automatic mutual exclusion
- Stance persistence through combat

**UI Improvements**

- Shift+Click to post items to chat
- Hover tooltips with keyboard hints
- Fade-in controls
- Improved hover animations

**Icon System**

- PNG → WebP migration (60% smaller)
- Automatic token image migration
- Fixed bow weapon icons

**Development**

- CONTRIBUTING.md (architecture, guidelines)
- game-rules/ (38 L5R4 reference files)
- Quench integration test suite
- Comprehensive JSDoc

### Enhanced

- Attack bonus consolidation
- NPC attacks include stance, mounted bonuses
- Full Defense shows actual dice rolls
- Chat card formatting
- Single Responsibility Principle
- Clear separation of concerns
- Code splitting for performance

### Fixed

- Bow weapon icons display correctly
- Token image migration
- Full Defense chat card formatting

### Migration

- **Users**: No action required
- **Developers**: Review CONTRIBUTING.md for new paths
- **Data**: Fully backward compatible

---

## [1.1.0] - 2025-10-01

### Fixed

- Skill roll formulas display Active Effects bonuses in chat

---

## [1.0.2] - 2025-09-30

### Added

- XP Manager recalculation button
- Recalculation success/failure feedback
- Recalculates XP expenditures from character state

---

## [1.0.1] - 2025-09-29

### Added

**Migration System**

- Automated data structure updates
- Version tracking
- Schema field normalization
- Icon path management

**XP Manager**

- XP management interface (ApplicationV2)
- XP breakdown by category
- Automatic L5R4 cost calculation
- Purchase history with timestamps
- Triangular skill costs
- Progressive trait costs
- Complete audit trail

**Stance Automation**

- Combat stance management
- Active Effects integration
- Mutual exclusion
- Five stances: Attack, Full Attack, Defense, Full Defense, Center
- Automatic bonus application
- Status effect integration

**Active Effects**

- Trait and skill modification
- Transferable effects from Family, School, Advantages, Disadvantages
- Automatic bonus application

**Services Architecture**

- Modular service design
- Dice, Chat, Stance services
- Separation of concerns
- Reduced dice service from 21k+ lines

**Base Actor Sheet**

- Shared PC/NPC functionality
- Consistent UI patterns
- Drag-drop support
- Persistent sorting preferences

**ApplicationV2/DialogV2**

- Foundry v13+ APIs
- XP Manager (ApplicationV2)
- Wound Config (ApplicationV2)
- Roll Dialogs (DialogV2)

**Spell Slots**

- Dice service integration
- Automatic deduction
- Depletion validation

**Localization**

- Six languages (en, es, fr, pt-BR, de, ru)
- Skill names localized

### Enhanced

**Dice System**

- Improved Ten Dice Rule
- Better modifier dialogs
- Enhanced chat cards

**File Organization**

- Flat → modular hierarchy
- documents/, sheets/, services/, apps/, setup/

**Architecture**

- Service-oriented design
- Clear separation of concerns
- Single responsibility principle

### Removed

- PC tabs (single-page scrolling)

---

_Legend of the Five Rings is a trademark of Fantasy Flight Games. This is an unofficial fan-made system._
