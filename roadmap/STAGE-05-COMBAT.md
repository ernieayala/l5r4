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
| `module/services/initiative.js:84`, `:160-165` | Stores the Void choice in the actor flag `voidInitiative` (Stage 2 Decision 9) and clears it with an un-awaited `unsetFlag` |
| `module/services/initiative.js:169-197` | Its own Ten Dice conversion, which disagrees with the book (p.77) when kept dice are exactly ten: 12k10 gives 10k10+2, the book 10k10+4 (Decision 1) |
| `module/hooks/combat-void-spending.js` | `combatTurn` hook for Void spending duration |
| `module/documents/actor/preparation/pc-preparation.js:86`, `:216` | PC initiative reads Insight Rank before it is recomputed (AUTOMATION.md B4); the pure Initiative function takes the computed rank |

## Deliverables

| Layer | Change |
|-------|--------|
| Documents | `module/documents/combat.js` (`L5R4Combat`) and `combatant.js` (`L5R4Combatant`), registered in `init`. The Combatant overrides `_getInitiativeFormula`; the Combat rolls a combatant with a Void bonus in a call of its own with that formula (core rolls every id with one formula) |
| Documents | PC preparation builds the Initiative pool after the Insight Rank is recomputed (B4) |
| Utils | `module/utils/ten-dice.js` (`applyTenDiceRule`, the rule `ten-dice-rule.js` used to hold, now its wrapper) and `module/utils/initiative.js` (`initiativeDice`, `initiativeFormula`), with Vitest cases |
| Services | `resolveVoidInitiative`: the Void prompt through `DialogV2`, returning +10 per combatant for that roll only; nothing is stored. The entry module sets it as `L5R4Combat.resolveInitiativeBonuses`, because Documents do not import Services |
| Removed | Both prototype patches and the `voidInitiative` flag |

## Acceptance

- Vitest: the Initiative pool for sample PCs and NPCs, including pools above 10 dice; the book's Ten Dice Rule examples (p.77) through the same function.
- Quench: the initiative service, workflow, and race-condition batches pass; a PC with `useVoid` set is prompted once, spends one Void Point, and gets +10.
- Manual: roll Initiative for a mixed combat from the tracker (Roll All, Roll NPCs, single combatant).

## Decisions

1. Initiative uses the shared Ten Dice Rule, which matches the book's examples (p.77), instead of its own conversion: a 12k10 pool rolls 10k10+4, not 10k10+2, and the Little Truths world setting reaches Initiative like every other roll. Ernie, 2026-11-13.
2. A pool that keeps more dice than it rolls (4k5) rolls as 4k4, as every other roll does; the total is the same, since keeping five of four dice keeps all four.
3. An explicit `formula` passed to `Combat#rollInitiative` (a macro) now replaces the Roll & Keep formula, as core's `getInitiativeRoll(formula)` intends; the prototype patch ignored it. A combatant spending a Void Point still rolls the system formula + 10.
4. NPC Initiative keeps 3.2.1's pool (`effRoll` / `effKeep`, which leave out `rollMod` / `keepMod`, and the stored 2k2 default); #30 is fixed in Stage 13.

## Out of scope

| Item | Stage |
|------|-------|
| Combat tracker UI changes | Not planned |
