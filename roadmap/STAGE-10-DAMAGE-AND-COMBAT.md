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
| Services | Iaijutsu duel (Assessment, Focus, Strike) and grapple control as guided chat-card flows (`module/services/combat/`); the GM starts a duel, and Guard sets its two statuses, from the token controls |
| Fixes | B8; NPC Apply buttons |

## Acceptance

- Vitest: damage pool per weapon and arrow (pp.198-199); Feint cap; Knockdown Raise counts by legs.
- Quench: attack a target, roll damage from the card, apply, check Wounds and wound rank; undo restores them;
  each maneuver's outcome.
- Manual: Ernie runs an attack with Feint and Increased Damage, a duel, and a grapple.

## Decisions

1. GM-only outcomes (Called Shot effects, improvised maneuvers) post a note on the card for the GM.
2. Halves the book leaves unrounded round down: the Feint bonus (half the margin over the raised TN, p.86) and
   damage to a Spirit creature (p.320) (Ernie, 2026-11-13).
3. Damage to a creature: Reduction first, then Spirit halves it and Invulnerability turns it into one Wound
   (pp.319-320). When Reduction leaves no damage, Invulnerability leaves none (Ernie, 2026-11-13).
4. Damage past the Out Wound Rank marks the actor Dead (p.82) and the card says so; the GM can remove the status
   (Ernie, 2026-11-13).
5. Applying damage lands at once. The target's owner then gets a button on the result card to spend a Void Point
   for 10 fewer Wounds (p.78), taken back from what was applied; nothing waits on another player
   (Ernie, 2026-11-13).
6. Free Raises not spent on the TN pay for an attack's maneuvers before declared Raises do; declared Raises left
   over become Increased Damage (+1k0 each, p.87). Maneuvers the Raises cannot pay for stop the roll with a warning.
7. Rules on a weapon item (`system.rules`) apply only to rolls made with that weapon: its attack, its damage, and
   its sheet values. Rules on other items and on effects apply as before.
8. The duel and the grapple run as chat cards whose state only the active GM changes; a player's step goes to the
   GM as a query, which reads each total from the roll message it names, never from the request.

## Plan drift

- The duel and grapple are chat-card flows in Services, not Apps windows: each step is a roll that posts to chat,
  so the card sits beside the rolls it settles.
- `module/hooks/chat-damage-buttons.js` stays for damage cards posted by 3.x, which carry their damage in the HTML;
  it skips `roll` messages.

## Out of scope

| Item | Stage |
|------|-------|
| Mass battle | Not planned |
