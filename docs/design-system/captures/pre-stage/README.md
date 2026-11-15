# Pre-stage captures

The Stage 17 visual reference: the design gallery and the PC, NPC, weapon, and skill sheets as the system looked
before the fix waves started (roadmap/STAGE-17-DESIGN-AND-CODE-SYSTEMS.md, Deliverable 2 and decision 9).

| Fact      | Value                                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date      | 2026-11-15                                                                                                                                                                                                                                                                                                          |
| Foundry   | 14.370, GM user, Chrome                                                                                                                                                                                                                                                                                             |
| Viewport  | 2560 x 945 CSS px (window maximized; the screen caps the height at 1032, so a taller window was not possible). Each JPEG is the browser screenshot scaled to 1568 x 579                                                                                                                                             |
| Gallery   | Window set to the full viewport (2560 x 867, the height Foundry allows). Scrolled 769 px per capture (one view less 60 px overlap). Theme switched with the gallery's own toggle                                                                                                                                    |
| Sheets    | Opened at the left edge. "default" is each sheet's default width (PC 870, NPC 840, items 480); narrow widths are out of scope (decision 18). Light theme is core's `uiConfig.colorScheme.applications = "light"`; dark is the world's setting (`dark`), restored afterwards. `sheetThemes` was empty and left alone |
| Documents | Test documents "Capture PC" (compendium skills, weapons, armor, items, spells, technique, kata, kiho, tattoo, advantages, disadvantage, Crane clan, Kakita family and school), "Capture NPC" (the creatures pack's Tsuno), "Capture Katana", and "Capture Kenjutsu", all deleted after capture                      |

Names follow `<area>-<item>-<theme>-<width>-<n>.jpg`. Gallery files keep one index per scroll position, so the
same number shows the same place in both themes.

## Gallery

Indices 00-08 are Foundations, 09-42 Components, 43-44 Patterns. Each row covers the `dark` and `light` file of that
index.

| Files                                                       | Shows                                                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `gallery-foundations-{dark,light}-full-00.jpg`              | Header with theme label and Switch theme button; Color intro; Core palette table (light-1 to warm-1)              |
| `gallery-foundations-{dark,light}-full-01.jpg`              | Core palette end (warm-1 to level-warning); Palette primitives table                                              |
| `gallery-foundations-{dark,light}-full-02.jpg`              | Palette primitives end; Role tokens table (surface to danger)                                                     |
| `gallery-foundations-{dark,light}-full-03.jpg`              | Role tokens end (danger to scrim); Domain roles table (ring colors and fills)                                     |
| `gallery-foundations-{dark,light}-full-04.jpg`              | Domain roles (ring tints, rank face and backdrop, Void Point, floating-number colors); Today's token names header |
| `gallery-foundations-{dark,light}-full-05.jpg`              | Today's token names table (ring colors, rank backdrop); Typography table                                          |
| `gallery-foundations-{dark,light}-full-06.jpg`              | Typography end; Space and size table                                                                              |
| `gallery-foundations-{dark,light}-full-07.jpg`              | Space and size end; Icons grid (every icon with its meaning)                                                      |
| `gallery-foundations-{dark,light}-full-08.jpg`              | Frames, motion, layers, and states table                                                                          |
| `gallery-components-{dark,light}-full-09.jpg`               | Frames table end; Components heading; Button: core button (Fear Rank), Skill-row roll buttons                     |
| `gallery-components-{dark,light}-full-10.jpg`               | Icon button (Add item); Inline control: row controls, activation off and on                                       |
| `gallery-components-{dark,light}-full-11.jpg`               | Inline control: Effects tab; Form field: core fields with one disabled                                            |
| `gallery-components-{dark,light}-full-12.jpg`               | Form field: price fieldset, modifier fields; Grid header                                                          |
| `gallery-components-{dark,light}-full-13.jpg`               | Grid: wound grid with full-width row; Section: list section open and collapsed                                    |
| `gallery-components-{dark,light}-full-14.jpg`               | Section with title tools, bio section; Expand control; Item row header                                            |
| `gallery-components-{dark,light}-full-15.jpg`               | Item row: Skills (School Skill, long name), Weapons (melee and bow), Armor, Items header                          |
| `gallery-components-{dark,light}-full-16.jpg`               | Item row: Items, Spells, Techniques, Kiho, Kata header                                                            |
| `gallery-components-{dark,light}-full-17.jpg`               | Item row: Kata (active and not), Tattoos, Advantages, Disadvantages                                               |
| `gallery-components-{dark,light}-full-18.jpg`               | Item row: empty Items section; Sort header; Tabs (two and six tabs); Item header heading                          |
| `gallery-components-{dark,light}-full-19.jpg`               | Item header with citation and long name; Ring and Trait block: PC header                                          |
| `gallery-components-{dark,light}-full-20.jpg`               | Ring and Trait block: PC rings ranks 1 to 10, Void dots, PC sections; NPC header and rings                        |
| `gallery-components-{dark,light}-full-21.jpg`               | NPC rings end, Attack & Damage, NPC Skills; Rank control header                                                   |
| `gallery-components-{dark,light}-full-22.jpg`               | Rank control tracks and Ledger; Void Point dots; Wound track: Healthy                                             |
| `gallery-components-{dark,light}-full-23.jpg`               | Wound track: middle Wound Rank, last Wound Rank                                                                   |
| `gallery-components-{dark,light}-full-24.jpg`               | Wound track: NPC track, NPC manual track; Initiative block header                                                 |
| `gallery-components-{dark,light}-full-25.jpg`               | Initiative block: Void off, Full Defense with Void on, Void Ring 0; Armor TN block header                         |
| `gallery-components-{dark,light}-full-26.jpg`               | Armor TN block: PC Void off, Void on, Void Ring 0, NPC; Fear block header                                         |
| `gallery-components-{dark,light}-full-27.jpg`               | Fear block: Rank 0, 3, 10; Spell slots                                                                            |
| `gallery-components-{dark,light}-full-28.jpg`               | Chat card: healing card, pre-4.0.0 weapon card; Dice row header                                                   |
| `gallery-components-{dark,light}-full-29.jpg`               | Dice row (collapsed): skilled, unskilled, Emphasis; Check card header                                             |
| `gallery-components-{dark,light}-full-30.jpg`               | Check card: success with Raises, failure with Honor Roll, attack with follow-up buttons                           |
| `gallery-components-{dark,light}-full-31.jpg`               | Check card: damage roll with Apply buttons; Request card; Damage result header                                    |
| `gallery-components-{dark,light}-full-32.jpg`               | Damage result: wounds taken, Void spent and killed, undone; Effect prompt: save                                   |
| `gallery-components-{dark,light}-full-33.jpg`               | Effect prompt: Full Defense roll; Flow card: duel in progress, grapple in control                                 |
| `gallery-components-{dark,light}-full-34.jpg`               | Flow card over; Item summary card: posted card, summary, on the item sheet; Check dialog header                   |
| `gallery-components-{dark,light}-full-35.jpg`               | Check dialog (Ring Roll extras): pool, modifiers, substitutions, TN, Raises, Void, Taint, Emphasis                |
| `gallery-components-{dark,light}-full-36.jpg`               | Check dialog: ranged, Maneuvers, social resistance, roll modifiers                                                |
| `gallery-components-{dark,light}-full-37.jpg`               | Check dialog: Spell Casting Roll; unskilled with maho extras                                                      |
| `gallery-components-{dark,light}-full-38.jpg`               | Check dialog: Maho Casting; Ledger dialog with entries and without                                                |
| `gallery-components-{dark,light}-full-39.jpg`               | Rules editor: form view with one invalid rule; JSON view header                                                   |
| `gallery-components-{dark,light}-full-40.jpg`               | Rules editor: JSON view, read-only; Effect panel: effects                                                         |
| `gallery-components-{dark,light}-full-41.jpg`               | Effect panel: no effects, no actor; Compendium browser: tabs and filters, entries, no entries                     |
| `gallery-components-{dark,light}-full-42.jpg`               | Inline link: check, damage, condition, Fear, broken; Floating number; Patterns heading                            |
| `gallery-patterns-{dark,light}-full-43.jpg`                 | Sheet section: the PC sidebar (rank tracks, Combat, Armor, Wounds)                                                |
| `gallery-patterns-{dark,light}-full-44.jpg`                 | Wounds end; Chat card pattern (attack and damage); Dialog pattern button; Panel row                               |
| `gallery-components-{dark,light}-full-dice-expanded-01.jpg` | Dice row with every dice row expanded: skilled, unskilled, Emphasis                                               |
| `gallery-components-{dark,light}-full-dice-expanded-02.jpg` | Expanded: Check card success and failure                                                                          |
| `gallery-components-{dark,light}-full-dice-expanded-03.jpg` | Expanded: attack with follow-up buttons, damage roll                                                              |
| `gallery-patterns-{dark,light}-full-dialog-01.jpg`          | The sample check dialog opened in core's dialog frame, top                                                        |
| `gallery-patterns-{dark,light}-full-dialog-02.jpg`          | The sample check dialog, bottom with the Roll button                                                              |

## Sheets

The PC and NPC sheets have no tabs, so they are captured by scroll position; the item sheets by tab.

| Files                                               | Shows                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `sheet-pc-{dark,light}-default-01.jpg`              | PC at 870 px: header, rings and traits, portrait, rank tracks, Combat, Armor, Wounds top, Skills     |
| `sheet-pc-{dark,light}-default-02.jpg`              | Skills end, Weapons, Armor, Items, Spells; Wound track in the sidebar                                |
| `sheet-pc-{dark,light}-default-03.jpg`              | Techniques, Kiho, Kata, Tattoos, Advantages                                                          |
| `sheet-pc-{dark,light}-default-04.jpg`              | Advantages, Disadvantages, Background, Notes editor                                                  |
| `sheet-npc-{dark,light}-default-01.jpg`             | NPC at 840 px: header with citation, rings, portrait, Combat, Armor, Wounds, Attack & Damage, Skills |
| `sheet-npc-{dark,light}-default-02.jpg`             | Skills end, Notes; Wounds, Fear Rank and Fear button                                                 |
| `sheet-weapon-{dark,light}-default-details.jpg`     | Weapon (Katana) Details tab                                                                          |
| `sheet-weapon-{dark,light}-default-modifiers.jpg`   | Weapon Modifiers tab                                                                                 |
| `sheet-weapon-{dark,light}-default-description.jpg` | Weapon Description tab (description and rules summary editors)                                       |
| `sheet-weapon-{dark,light}-default-effects.jpg`     | Weapon Active Effects tab (empty, New button)                                                        |
| `sheet-weapon-{dark,light}-default-rules.jpg`       | Weapon Rules tab (no rules)                                                                          |
| `sheet-skill-{dark,light}-default-details.jpg`      | Skill (Kenjutsu) Details tab with Emphases and Mastery fields                                        |
| `sheet-skill-{dark,light}-default-modifiers.jpg`    | Skill Modifiers tab                                                                                  |
| `sheet-skill-{dark,light}-default-description.jpg`  | Skill Description tab with "What it does"                                                            |
| `sheet-skill-{dark,light}-default-effects.jpg`      | Skill Active Effects tab                                                                             |
| `sheet-skill-{dark,light}-default-rules-01.jpg`     | Skill Rules tab, RollModifier form                                                                   |
| `sheet-skill-{dark,light}-default-rules-02.jpg`     | Skill Rules tab, DiceRule form and Add rule                                                          |

## Known limits

- The gallery's light-theme dialog captures add `themed theme-light` to the dialog element, the same classes the
  gallery's toggle sets on its own window; core's interface theme stayed dark for the gallery.
- Index 44 is the last scroll position. Dark 44 sits 18 px above the bottom (the last 18 px, the Panel row's lower
  border, are cut); light 44 is scrolled to the bottom itself.
