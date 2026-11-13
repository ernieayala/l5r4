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

### Still open

- `expiryAction`: delete expired effects, or keep them marked expired for the GM to clear.
- Out-of-combat time (minutes, hours, days): world-time expiry or GM-cleared.

## Out of scope

| Item | Stage |
|------|-------|
| Damage application | 10 |
| Authoring effects in the UI | 11 |
