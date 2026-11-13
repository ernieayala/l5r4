# Stage 10: Damage and combat loop

**Goal:** an attack flows to damage and to the target's Wounds with Reduction, Void, and damage sources
applied, maneuvers bought with Raises resolve, and damage can be undone.
**Needs:** 8, 9.

Rules read with `/rule` before building: `32_attack_and_defense.md` p.82, `33_wounds.md` p.82,
`34_ambush_falling_drowning.md` pp.83-84, `38_maneuvers.md` pp.85-87, `39_iaijutsu_dueling.md` pp.87-88,
`40_grappling.md` pp.88-89, `73_armor.md` p.198, `74_weapons.md` pp.198-205, `99_creatures.md` pp.319-320
(Invulnerability, Spirit).

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| Chat card actions | `renderChatMessageHTML` hook §5.3 |
| Targets | `game.user.targets`, token documents |
| Roll context | The Stage 8 `roll` message subtype |

## Audit

| Where | Finding |
|-------|---------|
| `module/hooks/chat-damage-buttons.js:35-86, 170-195` | Applies to the controlled token, not the attack's target |
| `module/services/dice/rolls/skill-roll.js:322-331`, `simple-roll.js:336-349` | Damage button leaves out Strength and the arrow (B8) |
| `module/sheets/handlers/roll-handler.js:439-472` | NPC damage cards have no Apply buttons |
| `module/services/dice/rolls/weapon-roll.js:135-136` | Attack Raises become +1k0 damage; no other maneuver |

## Deliverables

| Layer | Change |
|-------|--------|
| Services | Damage from the attack message's context (weapon DR, Strength, arrow, Increased Damage Raises, rules); apply to the attack's target, falling back to selected tokens; Reduction and Reduction-ignore rules; `DamageSource` tags for Invulnerability and Spirit |
| Services | Void reduction after damage (p.78) offered to the damaged actor's owner; undo from the damage card |
| Services | Maneuvers as Raise options on the attack: Called Shot (GM effect), Disarm, Extra Attack, Feint, Guard, Increased Damage, Knockdown |
| Apps | Iaijutsu duel (Assessment, Focus, Strike) and grapple control as guided flows |
| Fixes | B8; NPC Apply buttons |

## Acceptance

- Vitest: damage pool per weapon and arrow (pp.198-199); Feint cap; Knockdown Raise counts by legs.
- Quench: attack a target, roll damage from the card, apply, check Wounds and wound rank; undo restores them;
  each maneuver's outcome.
- Manual: Ernie runs an attack with Feint and Increased Damage, a duel, and a grapple.

## Decisions

1. GM-only outcomes (Called Shot effects, improvised maneuvers) post a note on the card for the GM.

## Out of scope

| Item | Stage |
|------|-------|
| Mass battle | Not planned |
