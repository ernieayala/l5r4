# Post-stage visual review

Each after capture in this folder compared by eye with its pre-stage capture (`../pre-stage/`), at commit `0b04cde`. "Intended" names the note in roadmap/STAGE-17-DESIGN-AND-CODE-SYSTEMS.md (by line), a row of Ernie's rulings table ("ruling: ..."), or a design-system page. "Unexpected" is a difference nothing records. "Pre-existing" looks the same in both sets. Gallery indices are this folder's; README.md maps each to its pre-stage index.

## Differences by area

| Area | Before | After | Differences | Verdict |
| --- | --- | --- | --- | --- |
| Foundation tokens | gallery 00-08 | gallery 00-08 | Palette, role, domain, type, space, size, frame, motion, layer, and state tokens show values and ratios (were "Not defined"); Air Ring `#64798d`; Void Point `#717171`; "Today's token names" group gone. Still "Not defined": text-muted, success, info, warning, float-\*, font-body, space-24, space-indent. Durations read 0ms | Intended: lines 356, 357, 363, 365 (tokens declared with readers), line 278 (group removed); space-24 and indent by ruling "1.25rem list indents"; the other "Not defined" rows follow line 356 (no reader yet). 0ms is the capture browser's reduced motion |
| Icons | gallery 07 | gallery 07 | Compendium browser `fa-books`; ledger `fa-book-bookmark`; effect delete `fa-trash`; expand lists `fa-angle-down, fa-angle-up`; "Contested Roll", "Remove a document or entry" | Intended: line 326, line 425, ruling "Compendium browser icon", decision 16 copy |
| Roll buttons | gallery 09, 14, 16, 23; sheet-pc-01/02, sheet-npc-01/02 | same | Same box, text, and position. Roll-face sample captioned "Roll face with a Skill pool". Hover fills `#ba4d34` (was `#c9593f`); the brush sprite shows its last frame under reduced motion | Intended: line 365, line 357; caption by ruling "Gallery polish" |
| Inline control, row controls | gallery 10, 16 | gallery 10, 16 | Activation "on" shows the accent icon, no ring; row expand glyph is the smaller angle | Intended: line 342, line 326 |
| Form fields | gallery 11-12; item sheets | gallery 11-12; item sheets | Advantage, mastery, and wealth-change samples now captioned ("Advantage type and cost", "Ring and Mastery Level", "Wealth change: add"); "Damage roll", "Dice explode"; skill sheet Modifiers reads "Roll bonus", "Keep bonus", "Total bonus" (was "Roll Bonus", "Keep Bonus", "Total Bonus") | Intended: decision 15 sentence case; skill bonuses by ruling "Localized strings joined into labels (47 sites)"; captions by ruling "Gallery polish" |
| Grid, wound track | gallery 13, 25-27; sheet-pc-01/02, sheet-npc-01/02 | gallery 13, 25-27 | Rows keep 25px; "Wounds suffered", "Wound heal rate", "Wound Rank", "Maximum Wounds"; stand-alone track sample captioned "Wound track alone" | Intended: ruling "Wound track 25px rows", copy wave, decision 16 |
| Section titles and expand control | gallery 09, 13-18, 22-23; every PC and NPC capture | same | Notes section sample. Expand icons are the smaller angle and point **up** on open sections, down on the collapsed one (before: down everywhere). These captures still show the gallery note "The expand controls render closed whatever the stored state" | Angle glyph intended (line 326). Up direction intended: expand-control.md X2 and stage line 335 (issue #78). The gallery note is gone since `e84eedb` |
| Item rows | gallery 15-18; sheet-pc-01..04 | same | Rows with an expand control are 32px; columns line up with before. `_details`, `_detail-text` samples captioned; the `_bio-row` sample ("Bio row in its list", Crane) renders as a sheet row inside its list | Rows: fixed (ruling "Item row controls"). Bio row: fixed (ruling "Gallery polish") |
| Sort header | gallery 18-19 | same | Bold head text; stand-alone samples captioned | Intended: line 357 (typography T3) |
| Tabs | gallery 19-20; item sheets | same | "Active effects"; light active tab look unchanged | Intended: decision 15 |
| Item header | gallery 20; item sheets | same | Same layout. Light gallery: white brush icon on parchment. Dark sheets: the black weapon and skill icons sit on the dark header, near invisible, as before | Pre-existing (both) |
| Ring and Trait block | gallery 20-22; sheet-pc-01, sheet-npc-01 | gallery 20-22 | Air Trait boxes, band, and disc darker; Ring rank number 28px; Void dots 4px apart (row 16px wider, centered); the single Ring ("One Ring: Earth 1") and Trait ("One Trait: Stamina 1") samples sit in frames that fit their content, as in the sheet; "XP" | Intended: line 357, line 365; fitted samples by ruling "Gallery polish" |
| Rank control | gallery 23-24, 46; sheet-pc-01 | same | "Honor Rank", "Glory Rank", "Shadowlands Taint" fit with 4px padding; Status Rank and Taint text crisp; Trait and Void Ring samples in fitted frames; "Honor Rank track" captioned | Intended: decision 16; earlier fix (finding 6a); ruling "Gallery polish" |
| Void Point dots | gallery 21, 24; sheets | same | 4px apart; hover reads `brightness(1.1)` with the `#888` border in dark, no scale | Intended: line 357, line 417 |
| Initiative, Armor TN, Fear | gallery 27-30 | same | "Current stance", "Maximum movement"; every sample captioned; otherwise the same | Intended: copy wave; ruling "Gallery polish" |
| Spell slots | gallery 16-17, 19, 30-31; sheet-pc-02 | same | "Spell slots:"; the single-slot sample ("One spell slot: Water 0") now fits its frame, count beside medallion as in the sheet | Copy intended; single slot fixed (ruling "Gallery polish") |
| Chat cards | gallery 31-37, 48-49 | same | "against" for "vs", "Wound penalty", "Damage roll", "Wounds", "Fully healed."; item summary draws a 1px divider; `_text-section` sample; the check card's TN line reads as before ("Success against TN 20 (Raises: 1) (Wound penalty +3)") | Intended: copy wave, decision 15, line 365; TN line is one key now (ruling "Localized strings joined into labels (47 sites)"), same text |
| Dice rows | gallery 32-34, dice-expanded-01..03 | same | Dropped and re-rolled dice are struck through as well as faded (computed `text-decoration-line: line-through` on `.roll.discarded`; the strike is thin at capture scale) | Intended: ruling "Dropped dice" (dice-row.md DR5, decision 16) |
| Item summary heading | gallery 37 | gallery 37 | Dark: the "Description" heading is near invisible on parchment, in the `_text-section` sample too | Pre-existing (before: gallery 34) |
| Check dialog | gallery 38-41, dialog-01/02 | same | Raises and Free Raises: label plus hint ("Up to 2.", "Spent on the TN, up to 1."), no wrap; "Ranged attack", "Social resistance", "Maho casting"; modifier labels read "Roll modifier", "Keep modifier", "Total modifier" (were Title Case) | Intended: ruling "Check dialog Raises limits"; ruling "Check dialog modifier labels"; decision 15 |
| Ledger dialog | gallery 41-42 | same | "Honor Rank", "Shadowlands Taint"; both samples captioned | Intended: decision 16; ruling "Gallery polish" |
| Rules editor | gallery 42-43; sheet-skill-rules-01/02 | same | Rule cards framed by a 1px line; error text `#fc452b` dark, `#ba0104` light | Intended: line 365 |
| Effect panel | gallery 44, 49 | same | Delete is `fa-trash`. Light: status icons white on parchment | Trash intended (line 326); light icons pre-existing |
| Compendium browser | gallery 44-45 | same | Active filter tab has the amber Selected outline. Light: entry icons white on parchment | Outline intended (line 342); icons pre-existing |
| Inline links | gallery 45-46 | same | Chips draw a 1px muted border. The broken link draws a 2px dashed border in the text color (cream dark, near black light), as distinct as the pre-stage dash | Chips intended (line 365); broken link by ruling "Gallery polish" |
| Sheet section pattern | gallery 43-44 | gallery 46-47 | The PC sidebar sample shows rank tracks, Combat, Armor, Wounds, each captioned, in the sheet's order; the `_limited` name and portrait moved to its own pattern, "Sheet: the Limited view" | Fixed (ruling "Gallery polish") |
| NPC attack row | gallery 23; sheet-npc-01 | same | Action shows Simple or Complex; Type is empty in these captures, gallery and Tsuno alike | Intended: ruling "NPC attack row's Type column". Since `e84eedb` the gallery's Claws attack carries a damage type and its Type column reads "Slashing" (checked live); Tsuno's pack attack has none |
| PC sheet | sheet-pc-{dark,light}-default-01..04 | same | Layout, rows, columns, and Notes editor (300px) match. Chevrons up; copy changes above. Light: Koku, Bu, Zeni show no field box, as before. Test data: Clan "Crane" (before: blank), Lore: Anatomy 3k3 (before 2k2), see README | Notes editor fixed earlier (finding 2). Field box: pre-existing. Data rows are test-data differences |
| NPC sheet | sheet-npc-{dark,light}-default-01/02 | same | Layout matches; chevrons up; "Attack and damage", "Wound Rank", "Wounds suffered", "Maximum movement" | Copy intended; chevrons as above |
| Weapon sheet | sheet-weapon-{dark,light}-default-\* | same | "Active effects", "Rules summary"; otherwise the same | Intended: decision 15 |
| Skill sheet | sheet-skill-{dark,light}-default-\* | same | "School Skill", "Active effects", "Rules summary", "Roll bonus", "Keep bonus", "Total bonus"; rule forms framed by a 1px line | Intended: decision 15 (book capital), ruling "Localized strings joined into labels (47 sites)", line 365 |

Not captured, so not compared here: the wealth manager's buttons and the combat, wound, and NPC attack config fields that ruling "Localized strings joined into labels (47 sites)" also covers; no capture in either set opens those windows.

## Hover and keyboard focus (PC sheet, dark, live)

| Control | Seen |
| --- | --- |
| Roll face (Courtier 2k2) | Hover: fill `#ba4d34`, tooltip "Skill Roll", the row's controls appear. Keyboard focus (Tab from the Trait select): computed 1px `#c9593f` outline plus `0 0 4px #c9593f` glow and the action fill, row controls shown; the screenshot did not repaint the ring or fill in 13 s (the agent tab's slow focus repaint). The face's wrapper `.l5r4-button.-roll` has `overflow: hidden` and is 1px larger on each side, so only 1px of the 4px glow can show |
| Ring disc (Earth) | Hover: image `drop-shadow(...) brightness(1.1)`, no transform; tooltip "Roll Earth" |
| Trait rank (Stamina) | Hover shows the up and down arrows and the tooltip "Shift+click: +1, Shift+right-click: -1". Keyboard focus on the Increase arrow: rust 1px ring plus glow, visible in the screenshot above the value |
| Item row control (Edit) | Keyboard focus: 24 x 24 button, rust 1px ring plus glow, visible in the screenshot |
| Void dot | Hover: `brightness(1.1)`, `#888` border, no transform; tooltip "Click: +1, right-click: -1" |

## Earlier findings, checked again

| # | Finding | Now |
| --- | --- | --- |
| 1 | Item rows with an expand control 52px | Fixed: 32px, columns aligned (sheet-pc-dark-default-01..03) |
| 2 | Notes editor 100px | Fixed: 300px (sheet-pc-\*-04, sheet-npc-\*-02) |
| 3 | Expand chevrons point up when open | Intended: expand-control.md X2 and stage line 335; the gallery's contrary note removed in `e84eedb` |
| 4 | Dropped dice have no non-color mark | Fixed: line-through (ruling "Dropped dice"; dice-expanded-01..03) |
| 5 | Gallery partial samples broken outside their parent | Fixed: Ring, Trait, rank control, single spell slot in fitted frames; bio row inside its list (ruling "Gallery polish") |
| 6 | Focus rings inconsistent | Not a regression: every control checked computes the rust ring. The roll face's clipped glow is fixed in `e84eedb`: the frame draws the ring (see below) |
| 6a | Rank track text doubled in dark | Fixed earlier, still crisp |
| 7 | Hover looks | Intended, as observed above |
| 8 | Dark item summary "Description" heading near invisible | Pre-existing; also in the `_text-section` sample |
| 9 | Light effect-panel status icons faint | Pre-existing (also the compendium entry icons and the gallery item header image) |
| 10 | Reduced motion in the capture browser | Environment |
| 11 | Kakita Bushi School grants Skills and Techniques twice (#80) | Still open, and wider this run: every granted Skill (8) and The Way of the Crane came twice. Another tab was logged in as the same GM user while the school was added; if each client of the user runs the grants, that would double them. Not confirmed |
| U3 | Check dialog modifier labels in Title Case | Fixed (ruling "Check dialog modifier labels") |
| U4 | Broken inline link's dash thin and muted | Fixed: 2px dashed in the text color (ruling "Gallery polish") |
| U5 | Sheet-section pattern held the `_limited` name and portrait | Fixed: own pattern, "Sheet: the Limited view" |
| U7 | Samples without captions; empty boxes; spread single slot | Fixed: every sample checked has a caption; frames fit. The NPC Type ruling is still shown by no fixture |
| - | Check dialog "Raises (maximum 2)" wraps | Fixed (ruling "Check dialog Raises limits") |
| - | Light gallery taller | Now 40 px taller in all (scroll height 38021 px light, 37981 px dark) |

## After the review: `e84eedb`

Checked live in the gallery (dark) on 2026-11-17; the captures above predate it.

| Item | Seen |
| --- | --- |
| Roll face focus | Keyboard focus on the Claws damage face: its frame `.l5r4-button.-roll` computes `outline: 1px solid #c9593f` and `box-shadow: 0 0 4px #c9593f`, and the screenshot shows the rust ring around the frame |
| NPC attack Type | The Claws row reads "Claws 6k3 4k2+2 Simple Slashing" |
| Expand note | The gallery text no longer contains "render closed whatever the stored state" |

## Unexpected, for sign-off or an issue

1. Granted Skills and Techniques doubled when the Kakita Bushi School was added (#80); possibly one grant run per client of the same user. Data only, no capture shows it (the copies were deleted). Out of this stage's scope (decision 10); #80 is open.
