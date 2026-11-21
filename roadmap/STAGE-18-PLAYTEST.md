# Stage 18: Playtest

**Goal:** Claude plays a short original scenario through Claude in Chrome with a GM and players, each seat on its own client and its own Foundry user, so every `automated` entry in the Stage 16 coverage manifest is used at the table through the real UI and real permissions; every problem found is fixed at its root with a test that fails first. **Needs:** 16 (the coverage manifest is the checklist of what play must use) and 17 (play uses the code and look the design and code systems pass left).

Quench runs as the GM in one client. The paths that only a player meets (a player's roll asking the GM's client to write through `CONFIG.queries`, a player applying damage to a token they do not own, the Void Point prompt reaching its owner, permission-limited sheet views) have no multi-user test today: no Quench batch logs in as a player.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
| --- | --- |
| GM-side writes requested by players | `CONFIG.queries`, `User#query`, `game.user.isActiveGM` (§10.5); the system's queries in `module/services/combat/damage.js`, `combat/flow.js`, `effects/apply.js`, `effects/prompts.js`, `effects/combat-events.js` |
| Ownership and limited views | Document ownership levels; sheet rendering for a non-owner (§4.7) |

## Setup

| Seat     | User                         | Client                   |
| -------- | ---------------------------- | ------------------------ |
| GM       | The existing Gamemaster user | `http://localhost:30000` |
| Player 1 | User "Player 1"              | `http://127.0.0.1:30000` |
| Player 2 | User "Player 2"              | `http://127.0.0.2:30000` |

Foundry keeps one login per browser cookie store, and cookies are per host, so each seat uses its own loopback host in one Chrome profile; Foundry listens on every loopback address. Checked 2026-11-17: all three logged in at once, each client's `game.user` its own user, and the GM's client lists all three active. The "Player" user stays for the `animations` batch. Ernie can take any seat at any time.

## Deliverables

| File | Does |
| --- | --- |
| `tests/playtest/<scenario>/script.md` | The scenario as beats: each names its scene, the seat that acts, what it does, the expected result, and the manifest entries it uses. An original story, with characters and NPCs built from the Stage 15 pack entries through the browser and drops, plus one item the GM authors by hand in the rules editor; cites `game-rules/` files and pages, never quotes them |
| `tests/playtest/<scenario>/coverage.md` | Every `automated` manifest entry with the beat that uses it. An entry with no beat blocks the run |
| `tests/playtest/<scenario>/log-<date>.md` | Per session: beats played, deviations, console errors, findings with issue links. GIF recordings stay in the scratchpad and are linked from the findings, never committed |
| GitHub label `playtest` | One issue per finding: steps, seat, expected and actual, owning stage. Pages cited, book text never quoted |

## Scenario shape

| Session | Uses (`game-rules/`) |
| --- | --- |
| 0: The party | Characters built from pack Clans, Families, Schools, Skills, Advantages, and Disadvantages, found in the compendium browser by each player on their own client; one Family the GM authors with the Stage 11 rules editor; starting XP spent through the XP manager; Insight Rank shown (`48`, `49`) |
| 1: Court | Skill, Trait, and Ring rolls from each player's client with Raises, Free Raises, Void, and an Emphasis re-roll, started from the sheet, a hotbar macro, a Check link in a shared journal, and a GM request card; an Unskilled Roll; a contested roll; Honor, Glory, and Status changes (`23`-`30`, `43`-`45`, `58`) |
| 2: The road | A skirmish: Initiative, each stance, attacks against Armor TN, damage applied by a player to an NPC they do not own, Wound Ranks and their penalties, a maneuver bought with Raises, Fear, a grapple, Mounted, Prone at Down, Void spent to reduce damage, undo of an applied card (`31`-`33`, `36`-`38`, `40`-`42`) |
| 3: The duel and the shrine | An iaijutsu duel; spell casting with slots, Affinity, and a spell above School Rank refused for the player and allowed by the GM; maho with blood and Taint; kata and kiho in use; a long rest healing a PC and an NPC; XP awarded and spent (`35`, `39`, `66`, `86`-`89`) |

## Procedure

1. Confirm the seats log in at once on separate cookie stores; record the method in **Setup**.
2. Run `npm run coverage`; write the script so every `automated` entry has a beat.
3. Play each session from the seats' own clients: a seat acts only through its client, so permissions are real. Players never use the GM's client.
4. Read each client's console after every beat (Claude in Chrome `read_console_messages`); any error or warning from `l5r4-enhanced` is a finding.
5. File each finding. Fix it at its root in the layer that owns it, with a Vitest or Quench test that fails first, run the gate, and replay the beat.
6. Ernie reviews the log and findings after each session.

## Acceptance

- The seats are logged in at once, each as its own user.
- Sessions 0-3 played to the end with every beat's expected result met or filed.
- `coverage.md` shows every `automated` manifest entry used.
- Zero open `playtest` issues; zero console errors from `l5r4-enhanced` in the last full run.
- Written here by the Stage 16 sweep, each left open by an earlier stage: a real mouse drag from the compendium browser and from a compendium window onto a sheet (Claude in Chrome's drag reaches no drop target, so a person makes this one gesture if the tool still cannot); the Active Effect sheet's phase dropdown, the Token HUD status icons, and the subtype labels of the create-document dialog clicked through; and none of the intermittent console errors Stages 6-13 saw once in full runs (`TypeError: Failed to fetch`, unhandled rejections from core's chat pop-up, core `#postNotification` errors) in any seat's console.
- The gate passes after the fixes.

## Decisions

1. The playtest is not Quench: it is played through the real UI with Claude in Chrome. A finding that can be scripted becomes a Quench test when it is fixed. Basis: fabula-ultima `roadmap/STAGE-19-PLAYTEST.md` decision 2.
2. The script and logs are committed; recordings stay in the scratchpad.
3. The scenario is rerun on each 4.0.0 release candidate before Stage 19 publishes.
4. Ernie, 2026-11-17: the open issues #72, #73, #79, #80, and #81 are fixed before the playtest starts, each in its own commit with a test that fails first, so play runs on the fixed system.
5. Ernie, 2026-11-17: #79's 66 open items are all fixed, in commits grouped by area; the ones players see (sort direction, Wound penalty sign and current-rank mark, healing card title, empty lists, the maho warning, Void dot tooltips, disabled Void reasons) go to him as before/after captures for sign-off before the playtest. Ernie signed them off 2026-11-17.
6. Ernie, 2026-11-17: the PC header's labels are plain text; the actions they held become icon buttons beside their values: recalculate the sheet after the Name field, and a GM-only switch between a computed and a typed Insight Rank after the rank. Both run on a plain click.
7. Ernie, 2026-11-17: two player seats beside the GM; they cover every permission path above.
8. Ernie, 2026-11-17: Claude creates the player users in the local test world as the GM, with no passwords, named for their seats.
9. Ernie, 2026-11-18, from Session 0: a new PC starts with Void Points equal to its Void Ring (#91); the Disadvantage XP cap and manual XP adjustments are GM-only (#92); a second School asks whether it replaces the first before its choices (#93); an NPC attack with no damage has no damage button (#94); the browser's Page filter leaves out entries with no page (#95).
10. Ernie, 2026-11-18: a School added beside another follows the Multiple Schools Advantage (p.151): it gives no free Skills, and its Techniques wait until the character has rank 1 in each of its School Skills; a chat note names the missing Skills (#96, from #85).
11. Ernie, 2026-11-18: the Bio section lists every School the character holds, first School first, and a second School's row lists the School Skills its Techniques wait for (#97). #97 is fixed before Session 1.
12. Ernie, 2026-11-18, from Session 1: a roll with no TN shows no TN line, only its Raises, which count in a Contested Roll (p.80); no TN is made from Raises (#98).
13. Ernie, 2026-11-20, from Session 2's setup: the compendium browser's Import asks, as core's compendium import does, whether to replace a creature the world already holds or import a new one; it never overwrites one silently (#100).
14. Ernie, 2026-11-20, from Session 2: Out carries no TN penalty, as printed (p.82), on PCs and NPCs, whatever its stored penalty or the penalty modifier; Healthy and Out are the two ranks a modifier never reaches (#102).
15. Ernie, 2026-11-20, from Session 2: every chat card renders a button only for the users who may press it (the design system's "Can't act" rule); the click still refuses anyone else. Covers the Honor Roll (#107), damage Undo (#108), save and Full Defense prompts, and grapple and duel flow cards (#112).
16. Ernie, 2026-11-20, from Session 2: an Honor Roll (p.92) takes the roller's dice penalties, Fear (p.90), Dazed, and the rest, as it already takes Taint's; kept dice never exceed rolled dice (#111).
17. Ernie, 2026-11-20, from Session 2: a roll's card lists every TN change the roll kept (Fatigued, an arrow, a grapple ignoring armor), from its stored TN record, so the card explains its TN whatever was ticked in the dialog (#115).
18. Ernie, 2026-11-21, from Session 3: once a duel's first strike hits, the struck duelist gets "{name} yields" beside their Roll button; yielding ends the duel card as Over with the yield noted, and striking back, dishonorable in a duel to first blood (p.87), stays their choice (#120).

### Still open

None.

## Out of scope

| Item                                                   | Stage       |
| ------------------------------------------------------ | ----------- |
| Static coverage, open-question and out-of-scope sweeps | 16          |
| Design system, code system, and consistency checks     | 17          |
| Release allowlist and book-text sweep                  | 19          |
| Mass battle (pp.236-241)                               | Not planned |
