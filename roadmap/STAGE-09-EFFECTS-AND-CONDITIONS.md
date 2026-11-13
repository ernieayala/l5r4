# Stage 9: Effects, conditions, and durations

**Goal:** stances, conditions, Fear, and timed effects from spells, techniques, kata, and kiho are Active
Effects whose mechanics are rules, with durations that expire on the combat events the book names, saves that
end them, and use counters.
**Needs:** 7, 8.

Rules read with `/rule` before building: `31_combat_round.md` pp.81-82 (round stages, Reactions),
`36_stances.md` p.84, `41_conditional_effects.md` p.89, `40_grappling.md` pp.88-89, `42_fear.md` p.90,
`66_magic_and_spell_casting.md` p.163 and `67_universal_spells.md` p.166 (concentration), `86_kata.md`
pp.259-260, `87_kiho.md` p.261.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Durations, expiry events, `ActiveEffect.registry.refresh` | §6.3 |
| `CONFIG.ActiveEffect.expiryEvents`, `expiryAction` | §6.3 |
| Turn and round events on the Stage 5 Combat class | §7.1 (`_onStartTurn`, `_onEndTurn`, `_onEndRound`) |
| Status effects | `CONFIG.statusEffects` §6.4 |

## Audit

| Where | Finding |
|-------|---------|
| `module/documents/actor/calculations/condition-effects.js:116-149` | Ten conditions hard-coded |
| `module/documents/actor/calculations/stance-effects.js`, `module/services/stance/**` | Stances hard-coded; Center and Attack do nothing; Full Attack damage bonus unimplemented; Full Defense never expires per turn |
| `module/services/stance/hooks/effect-lifecycle.js:63-85` | One-stance rule enforced in an un-awaited async hook |
| `module/hooks/combat-void-spending.js` | The only expiry: Void-for-Armor on `combatTurn` |
| `module/services/wound-prone-automation.js:44-172` | Runs on every client; Prone never removed (B10) |
| `module/services/fear.js:85-110` | Fear effect lasts until removed by hand |

## Deliverables

| Layer | Change |
|-------|--------|
| Config | Expiry events for the book's timings: `turnStart`, `turnEnd`, `reactions` (end of round), `skirmishEnd`, `encounterEnd`; `expiryAction` per Decision 1 |
| Rules | `Duration`, `ApplyCondition` (with save), `ConditionImmunity`, `PeriodicSave`, `Resource` use counters (AUTOMATION.md §3) |
| Data | Stances and conditions defined as effect data with rules; the `switch` statements removed |
| Documents | The Stage 5 Combat class refreshes the registry on each event and prompts saves (Dazed, Stunned) in Reactions |
| Services | Concentration upkeep and the damage-triggered Willpower check; on-expire consequences |
| Fixes | B10: Prone automation runs once (active GM) and is removed when the character rises above Down |

## Acceptance

- Vitest: duration arithmetic per event; save TN progression for Dazed; one-stance rule.
- Quench: each condition and stance gives the book's numbers (the Domain Invariants rows); a Full Defense
  bonus ends at the actor's next turn; Fear ends at encounter end; a Dazed save in Reactions removes it on
  success; existing stance and condition batches pass.
- Manual: Ernie runs a three-round skirmish with stances, a Dazed hit, and a timed spell, and checks each
  expiry.

## Decisions

1. `CONFIG.ActiveEffect.expiryAction` is `"delete"`: an expired effect is removed, not kept marked expired
   (Ernie, 2026-11-13).
2. Durations in minutes, hours, or days expire on world time, through core's `updateWorldTime` refresh
   (`client/helpers/time.mjs:214`); nothing expires while world time stands still (Ernie, 2026-11-13).
3. Armor TN under conditions follows each condition's wording (p.89; AUTOMATION.md Q4): Blinded replaces only the
   base (Reflexes + 5 instead of Reflexes × 5 + 5), and armor, stances, and other Armor TN effects still add;
   Stunned and Grappled set the Armor TN to 5 plus the armor bonus, and nothing else adds. Several at once: the
   lowest wins (Ernie, 2026-11-13).
4. Fear (p.90) ends when the combat it began in ends, or when the GM ends the encounter outside combat; the GM can
   still delete it at any time (Ernie, 2026-11-13).
5. The Dazed save TN (p.89) drops by 5 after each failure and stops at 5 (Ernie, 2026-11-13).
6. The once-per-Round Void Point limit (p.78) warns in the roll dialog and never blocks; a Resource rule raises the
   limit (Ernie, 2026-11-13).
7. The Center Stance bonus (p.84) is +1k1 plus the Void Ring added to the total, on one roll the player picks
   during the next round's Turn. No published ruling was found; this follows the wording (Ernie, 2026-11-13).
8. Timing is core's `duration` with its expiry event, not a `Duration` rule key. Core 14.370 already announces
   turnStart, turnEnd, roundStart, roundEnd (the Reactions stage), combatStart, and combatEnd (the end of a
   skirmish) from Combat (`client/documents/combat.mjs:1011-1109`) and world-time advances, so the system adds one
   event, `encounterEnd` (module/config/expiry-events.js), announced when a combat is deleted and by the GM's
   "End encounter" control. The Combat class adds handlers to the turn and round events; it does not refresh the
   registry itself.
9. Stances and conditions are status effects whose data carries their rules, exclusive `group`, `level`, and
   duration (module/config/status-effects.js). An effect made with only a status id takes that data when created
   (module/utils/status-data.js), and the world migration gives 3.2.1 effects the same. The Full Defense roll's
   bonus, Center Stance's next-Round bonus, and a Void Point on Armor TN are effects the system creates.
10. A save, the Full Defense roll at the start of each Turn, and the Concentration check are chat cards the active
   GM posts and the actor's owner clicks, so the roll keeps its dialog (AUTOMATION.md §4). An ApplyCondition rule
   puts a button on a successful roll's card; a player's click on an actor they do not own goes to the active GM
   as a query (`CONFIG.queries`), as do ending a Concentration and settling Center Stance when a player ends the
   Round.
11. Center Stance's +10 Initiative is set before the Round advances, so the new Round's turn order includes it,
   and taken off before the following Round.
12. The Fear roll and the Full Defense roll go through the roll pipeline (closes STAGE-08 decision 8).
13. Plan drift: the Audit's "Full Attack damage bonus unimplemented" has no rule behind it; p.84 gives Full Attack
   no damage bonus. The Void-on-Armor-TN fields `armorTn.useVoid` and `armorTn.voidRound` are removed from the PC
   schema (a marker lasted one Round at most; `migratePcSource` drops it). Kata and kiho exclusivity uses the
   `group` field; creating their effects from the items is Stage 11 (rule authoring).
## Out of scope

| Item | Stage |
|------|-------|
| Damage application | 10 |
| Authoring effects in the UI | 11 |
