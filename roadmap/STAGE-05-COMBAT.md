# Stage 5: Combat and Initiative

**Goal:** Initiative rolls Insight Rank + Reflexes keep Reflexes with the Ten Dice Rule (`game-rules/31_combat_round.md`, p.81; `26_special_dice_rules.md`, p.77) through `Combat` and `Combatant` subclasses, and the Void Point prompt for +10 Initiative (`25_rings_and_traits.md`, p.78) works as in 3.2.1.
**Needs:** 2, 4.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| `Combat#rollInitiative(ids, {formula, messageMode, messageOptions, updateTurn})`, `Combatant#getInitiativeRoll` | §7.1 |
| Document class registration `CONFIG.Combat.documentClass`, `CONFIG.Combatant.documentClass` | §7.1, §10.1 |
| `rollMode` in `messageOptions` still handled for compatibility | `client/documents/combat.mjs:392` |
| Dialog for the Void prompt | `DialogV2.confirm` §4.1 |

## Audit

| Where | Finding |
|-------|---------|
| `module/services/initiative.js:45-48` | Sets `CONFIG.Combat.initiative` |
| `module/services/initiative.js:52-98` | Replaces `Combat.prototype.rollInitiative` to prompt for Void (`DialogV2.confirm` since Stage 4) |
| `module/services/initiative.js:104-212` | Replaces `Combatant.prototype.getInitiativeRoll` with the Roll & Keep formula and the Ten Dice Rule conversion |
| `module/services/initiative.js:84`, `:160-165` | Stores the Void choice in `system.initiative._voidThisRoll` (removed from `system` in Stage 2) and clears it with an un-awaited update |
| `module/hooks/combat-void-spending.js` | `combatTurn` hook for Void spending duration |
| `module/documents/actor/preparation/pc-preparation.js:86`, `:216` | PC initiative reads Insight Rank before it is recomputed (AUTOMATION.md B4); the pure Initiative function takes the computed rank |

## Deliverables

| Layer | Change |
|-------|--------|
| Documents | `module/documents/L5R4Combat` and `L5R4Combatant` (file names per CLAUDE.md conventions), registered in `init` |
| Utils | The Initiative pool and Ten Dice conversion as a pure function (reuse `module/services/dice/core/ten-dice-rule.js` if it covers the case), with Vitest cases |
| Services | The Void prompt through `DialogV2`; the +10 passed to the roll for that roll only, not stored in `system` |
| Removed | Both prototype patches |

## Acceptance

- Vitest: the Initiative pool for sample PCs and NPCs, including pools above 10 dice; the book's Ten Dice Rule examples (p.77) through the same function.
- Quench: the initiative service, workflow, and race-condition batches pass; a PC with `useVoid` set is prompted once, spends one Void Point, and gets +10.
- Manual: roll Initiative for a mixed combat from the tracker (Roll All, Roll NPCs, single combatant).

## Out of scope

| Item | Stage |
|------|-------|
| Combat tracker UI changes | Not planned |
