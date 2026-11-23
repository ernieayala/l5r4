# Post-stage captures

The Stage 17 after set: the design gallery and the PC, NPC, weapon, and skill sheets as the system looks after the fix waves, the visual-regression fixes, and part 23 (roadmap/STAGE-17-DESIGN-AND-CODE-SYSTEMS.md, Deliverable 2 and decision 9). Taken the same way as `../pre-stage/`, so each file compares with the pre-stage file of the same name; `REVIEW.md` is the comparison.

| Fact | Value |
| --- | --- |
| Date | 2026-11-16, commit `0b04cde` |
| Foundry | 14.370, GM user, Chrome (the browser asks for reduced motion, so durations read 0ms and the brush sprites show their last frame) |
| Viewport | 2560 x 945 CSS px. Each JPEG is the browser screenshot scaled to 1568 x 579 |
| Gallery | Window set to the full viewport (2560 x 867, the height Foundry allows). Scrolled 769 px per capture (one view less 60 px overlap). Theme switched with the gallery's own toggle |
| Sheets | Opened at the left edge (left 302 px, top 0; PC and NPC 867 px high). "default" is each sheet's default width (PC 870, NPC 840, items 480). Light theme is core's `uiConfig.colorScheme.applications = "light"`; dark is the world's setting (`dark`), restored afterwards. `sheetThemes` was empty and left alone |
| Documents | Test documents built from the compendiums and deleted after capture: "Capture PC" (Crane clan, Kakita family, and Kakita Bushi School added through the system's purchase path, as a drop on the sheet adds them, then the same skills, weapons, armor, items, spells, techniques, kiho, kata, tattoo, advantages, and disadvantage as the pre-stage set), "Capture NPC" (the creatures pack's Tsuno), "Capture Katana", and "Capture Kenjutsu" |

Names follow `<area>-<item>-<theme>-<width>-<n>.jpg`. Gallery files keep one index per scroll position, so the same number shows the same place in both themes. A gallery file takes the section at the top of its view (`foundations`, `components`, `patterns`).

## Test data that differs from the pre-stage set

The school and advantage purchases ask for their choices, so the PC differs from the pre-stage PC in data, not in look:

- The school's free Bugei or High Skill was answered with Courtier, then Courtier was set back to rank 0 and off the school list, as in the pre-stage PC.
- Every Skill and Technique the school grants was created twice; the second copies (the ones no grant record names) were deleted. See REVIEW.md, finding 11.
- Spinning Blades Style and Gusai do not meet their prerequisites; the GM's "Add anyway" was taken, as for the pre-stage PC.
- Seven Fortunes' Blessing asked for a Lore Skill and was answered with Lore: Anatomy, so that row rolls 3k3 where the pre-stage PC rolled 2k2.
- The header's Clan reads "Crane"; the pre-stage PC's Clan was blank.

## Gallery

The gallery has more samples than the pre-stage one (the Templates wave's partials, the Notes section, the card partials, the single Ring, Trait, rank control, and spell slot samples, the Limited view pattern) and every sample now has a caption, so the scroll positions do not line up one to one. Indices 00-08 are Foundations, 09-46 Components, 47-49 Patterns. Each row covers the `dark` and `light` file of that index; "Pre-stage" names the before indices that show the same samples. The light gallery is 40 px taller (scroll height 38021 px against 37981 px dark), so lower in the gallery the light view sits a few pixels higher on the same samples.

| Files | Shows | Pre-stage |
| --- | --- | --- |
| `gallery-foundations-{dark,light}-full-00.jpg` | Header with theme label and Switch theme button; Color intro; Core palette table (light-1 to warm-1) | 00 |
| `gallery-foundations-{dark,light}-full-01.jpg` | Core palette end (warm-1 to level-warning); Palette primitives table | 01 |
| `gallery-foundations-{dark,light}-full-02.jpg` | Palette primitives end; Role tokens table (surface to danger) | 02 |
| `gallery-foundations-{dark,light}-full-03.jpg` | Role tokens end (danger to scrim); Domain roles table (ring colors and fills) | 03 |
| `gallery-foundations-{dark,light}-full-04.jpg` | Domain roles end (ring tints, rank face and backdrop, Void Point, floating-number colors); Typography header | 04 |
| `gallery-foundations-{dark,light}-full-05.jpg` | Typography table; Space and size table top | 05, 06 |
| `gallery-foundations-{dark,light}-full-06.jpg` | Space and size end; Icons header | 06, 07 |
| `gallery-foundations-{dark,light}-full-07.jpg` | Icons grid; Frames, motion, layers, and states table top | 07, 08 |
| `gallery-foundations-{dark,light}-full-08.jpg` | Frames table end (durations, layers, states); Components heading; Button header | 08, 09 |
| `gallery-components-{dark,light}-full-09.jpg` | Button: roll face with a Skill pool, core button (Fear Rank), roll buttons in Skill rows; Icon button (Add item) | 09, 10 |
| `gallery-components-{dark,light}-full-10.jpg` | Inline control: row controls, activation off and on, Effects tab; Form field header | 10, 11 |
| `gallery-components-{dark,light}-full-11.jpg` | Form field: advantage type and cost, Ring and Mastery Level, wealth change, core fields with one disabled | 11 |
| `gallery-components-{dark,light}-full-12.jpg` | Form field: core fields end, price fieldset, modifier fields; Grid header | 12 |
| `gallery-components-{dark,light}-full-13.jpg` | Grid: grid with a full-width row; Section header; Notes section | 12, 13 |
| `gallery-components-{dark,light}-full-14.jpg` | Section: list section open and collapsed, section with title tools, bio section; Expand control header | 13, 14 |
| `gallery-components-{dark,light}-full-15.jpg` | Expand control: section expand control; Item row header; row details, row detail text, bio row in its list; Skills header | 14, 15 |
| `gallery-components-{dark,light}-full-16.jpg` | Item row: Skills (School Skill, long name), Weapons (melee and bow), Armor, Items; Spells header | 15, 16 |
| `gallery-components-{dark,light}-full-17.jpg` | Item row: Spells with spell slots, Techniques, Kiho, Kata (one active, one not) | 16, 17 |
| `gallery-components-{dark,light}-full-18.jpg` | Item row: Tattoos, Advantages, Disadvantages, Items section with no items; Sort header heading | 17, 18 |
| `gallery-components-{dark,light}-full-19.jpg` | Sort header: Skills list header, header that does not sort, sortable heads and a plain one; Tabs: two tabs, six tabs top | 18 |
| `gallery-components-{dark,light}-full-20.jpg` | Six tabs; Item header with citation and long name; Ring and Trait block header and PC rings top | 18, 19, 20 |
| `gallery-components-{dark,light}-full-21.jpg` | Ring and Trait block: PC rings end with Void dots; one Ring (Earth 1); one Trait (Stamina 1); PC header, ranks 1 to 10 | 20 (single Ring and Trait samples are new) |
| `gallery-components-{dark,light}-full-22.jpg` | PC rings and sections (Items, Background, Notes); NPC header and rings top | 20 |
| `gallery-components-{dark,light}-full-23.jpg` | NPC rings end, Attack and damage, Skills, Notes; Rank control header; Trait rank control top | 21 |
| `gallery-components-{dark,light}-full-24.jpg` | Rank control: Trait (Stamina 1), Void Ring (2), Honor Rank track, rank tracks and Ledger; Void Point dots | 21, 22 |
| `gallery-components-{dark,light}-full-25.jpg` | Wound track: track alone, Healthy | 22, 23 |
| `gallery-components-{dark,light}-full-26.jpg` | Wound track: middle Wound Rank, last Wound Rank | 23 |
| `gallery-components-{dark,light}-full-27.jpg` | Wound track: last end, NPC track, NPC with a manual track; Initiative block header | 23, 24 |
| `gallery-components-{dark,light}-full-28.jpg` | Initiative block: Void off, Full Defense with Void on, Void Ring 0; Armor TN block header | 25 |
| `gallery-components-{dark,light}-full-29.jpg` | Armor TN block: PC Void off, Void on, Void Ring 0, NPC; Fear block header | 26 |
| `gallery-components-{dark,light}-full-30.jpg` | Fear block: Rank 0, 3, 10; Spell slots: one spell slot (Water 0), Spells section top | 27 |
| `gallery-components-{dark,light}-full-31.jpg` | Spell slots 0, 1, 3, and 9; Chat card: healing card, weapon card posted before 4.0.0; Dice row heading | 27, 28 |
| `gallery-components-{dark,light}-full-32.jpg` | Dice row (collapsed): skilled, unskilled, Emphasis; Check card header | 29 |
| `gallery-components-{dark,light}-full-33.jpg` | Check card: success with Raises and a note, failure with the Honor Roll, attack with follow-up buttons top | 30 |
| `gallery-components-{dark,light}-full-34.jpg` | Check card: attack end, damage roll with Apply buttons; Request card; Damage result header | 30, 31 |
| `gallery-components-{dark,light}-full-35.jpg` | Damage result: wounds taken, Void Point spent and killed, undone; Effect prompt: save | 32 |
| `gallery-components-{dark,light}-full-36.jpg` | Effect prompt: Full Defense roll; Flow card: duel in progress, grapple in control | 33 |
| `gallery-components-{dark,light}-full-37.jpg` | Flow card over; Item summary card: text section, card as posted, item summary; on the item sheet caption | 33, 34 |
| `gallery-components-{dark,light}-full-38.jpg` | Item summary on the item sheet; Check dialog (Ring Roll extras): pool, modifiers, substitutions, TN, Wound penalty, Raises | 34, 35 |
| `gallery-components-{dark,light}-full-39.jpg` | Check dialog: Raises, Free Raises, Void, Taint, Emphasis, ranged attack, Maneuvers | 35, 36 |
| `gallery-components-{dark,light}-full-40.jpg` | Check dialog: social resistance, roll modifiers, Spell Casting Roll; unskilled with maho extras top | 36, 37 |
| `gallery-components-{dark,light}-full-41.jpg` | Check dialog: unskilled end, Maho casting; Ledger dialog with entries top | 37, 38 |
| `gallery-components-{dark,light}-full-42.jpg` | Ledger dialog end, no entries; Rules editor: form view with one invalid rule | 38, 39 |
| `gallery-components-{dark,light}-full-43.jpg` | Rules editor: form view end, JSON view, read-only; Effect panel header | 39, 40 |
| `gallery-components-{dark,light}-full-44.jpg` | Effect panel: effects, no effects, no actor; Compendium browser: tabs and filters, entries top | 40, 41 |
| `gallery-components-{dark,light}-full-45.jpg` | Compendium browser: entries, no entries; Inline link: check, damage, condition, Fear, broken | 41, 42 |
| `gallery-components-{dark,light}-full-46.jpg` | Broken link end; Floating number; Patterns heading; Sheet section: rank tracks, Combat | 42, 43 |
| `gallery-patterns-{dark,light}-full-47.jpg` | Sheet section: Armor, Wounds; Sheet: the Limited view (name and portrait) top | 43 (the Limited view is new) |
| `gallery-patterns-{dark,light}-full-48.jpg` | Limited view portrait; Chat card pattern (attack, wounds taken); Dialog pattern heading | 44 |
| `gallery-patterns-{dark,light}-full-49.jpg` | Chat card pattern; Dialog pattern button; Panel row | 44 |
| `gallery-components-{dark,light}-full-dice-expanded-01.jpg` | Dice row with every dice row expanded: skilled, unskilled, Emphasis | dice-expanded-01 |
| `gallery-components-{dark,light}-full-dice-expanded-02.jpg` | Expanded: Check card success and failure | dice-expanded-02 |
| `gallery-components-{dark,light}-full-dice-expanded-03.jpg` | Expanded: attack with follow-up buttons, damage roll | dice-expanded-03 |
| `gallery-patterns-{dark,light}-full-dialog-01.jpg` | The sample check dialog opened in core's dialog frame, top | dialog-01 |
| `gallery-patterns-{dark,light}-full-dialog-02.jpg` | The sample check dialog, bottom with the Roll button | dialog-02 |

## Sheets

The PC and NPC sheets have no tabs, so they are captured by scroll position (0, 769, 1538 px, then the bottom); the item sheets by tab.

| Files | Shows |
| --- | --- |
| `sheet-pc-{dark,light}-default-01.jpg` | PC at 870 px: header, rings and traits, portrait, rank tracks, Combat, Armor, Wounds top, Skills |
| `sheet-pc-{dark,light}-default-02.jpg` | Skills end, Weapons, Armor, Items, Spells; Wound track in the sidebar |
| `sheet-pc-{dark,light}-default-03.jpg` | Techniques, Kiho, Kata, Tattoos, Advantages |
| `sheet-pc-{dark,light}-default-04.jpg` | Advantages, Disadvantages, Background, Notes editor |
| `sheet-npc-{dark,light}-default-01.jpg` | NPC at 840 px: header with citation, rings, portrait, Combat, Armor, Wounds, Attack and damage, Skills |
| `sheet-npc-{dark,light}-default-02.jpg` | Skills end, Notes; Wounds, Fear Rank and Fear button |
| `sheet-weapon-{dark,light}-default-details.jpg` | Weapon (Katana) Details tab |
| `sheet-weapon-{dark,light}-default-modifiers.jpg` | Weapon Modifiers tab |
| `sheet-weapon-{dark,light}-default-description.jpg` | Weapon Description tab (description and rules summary editors) |
| `sheet-weapon-{dark,light}-default-effects.jpg` | Weapon Active effects tab (empty, New button) |
| `sheet-weapon-{dark,light}-default-rules.jpg` | Weapon Rules tab (no rules) |
| `sheet-skill-{dark,light}-default-details.jpg` | Skill (Kenjutsu) Details tab with Emphases and Mastery fields |
| `sheet-skill-{dark,light}-default-modifiers.jpg` | Skill Modifiers tab |
| `sheet-skill-{dark,light}-default-description.jpg` | Skill Description tab with "What it does" |
| `sheet-skill-{dark,light}-default-effects.jpg` | Skill Active effects tab |
| `sheet-skill-{dark,light}-default-rules-01.jpg` | Skill Rules tab, RollModifier form |
| `sheet-skill-{dark,light}-default-rules-02.jpg` | Skill Rules tab, DiceRule form and Add rule |

## Known limits

- The gallery's light-theme dialog captures add `themed theme-light` to the dialog element, the same classes the gallery's toggle sets on its own window; core's interface theme stayed dark for the gallery.
- Index 49 is the last scroll position, scrolled to the bottom (dark 37152 px, light 37192 px), so it overlaps 48 by more than the usual 60 px.
- The dice-expanded captures are framed on the same headings as the pre-stage ones (Dice row, Check card, the attack sample), within a few pixels.
- The cursor rests on the window's title bar in every capture.
