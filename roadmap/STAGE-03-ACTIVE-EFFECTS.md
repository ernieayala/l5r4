# Stage 3: Active Effects V2

**Goal:** every Active Effect the system creates or reads uses the v14 shape (`system.changes`, string
`type`, `phase`), Trait changes reach the values derived from them, and stances and conditions behave as in
3.2.1.
**Needs:** 2.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| `system.changes`, `type`, `phase`, `priority` | §6.1 |
| Applying changes; `DataField#applyChange` validates against the schema | §6.2 |
| Phases `"initial"` / `"final"` and where each runs | §3.2 |
| Status effects in `CONFIG.statusEffects` | §6.4 |
| Core shims for legacy `changes` / `mode` (warn `{since: 14, until: 16}`) | `common/documents/active-effect.mjs:167-191`, `:254-317` |

## Audit

`rg -n "\.changes\b|changes:|ACTIVE_EFFECT_MODES|\.mode\b" module`

| Where | Finding |
|-------|---------|
| `module/utils/xp-calculations.js:140-145` | Reads `eff.changes` |
| `module/utils/xp-calculations.js:212`, `:236` | Compares `ch.mode` with `CONST.ACTIVE_EFFECT_MODES.ADD` |
| `module/services/family-bonus-service.js:90-97`, `:140-147` | Reads `effect.changes` and `change.mode` |
| `module/services/stance/core/effect-templates.js:61` | Creates stance effects with top-level `changes: []` |
| `module/services/stance/hooks/effect-lifecycle.js:213-214` | Writes `updateData.changes` |
| `module/sheets/handlers/item-effects-handler.js:111-117` | Creates item effects with top-level `changes: []` |
| `dist/l5r4-enhanced.js:96` | `CONFIG.statusEffects = STATUS_EFFECTS` (array); the setter is marked deprecated in 14.370 (`client/client.mjs:29-39`) |
| `ACTIVE_EFFECTS.md` | User guide to effect keys and modes; update to `type` names, and drop the keys that change nothing: item keys, `system.xp`, Insight in auto mode, Free Raises lowering the TN (AUTOMATION.md B12) |

`rg -n "^\s*icon:" module/services module/sheets/handlers module/apps/condition-manager.js`: 14.370 drops an
Active Effect's `icon` without a warning (no shim or `migrateData` in `common/documents/active-effect.mjs`), so
the effect gets `DEFAULT_ICON` (`icons/svg/aura.svg`). Effects stored by 3.2.1 already use `img`.

| Where | Finding |
|-------|---------|
| `module/services/fear.js:92` | Fear effect created with `icon` |
| `module/services/wound-prone-automation.js:153` | Prone effect created with `icon` |
| `module/services/stance/core/effect-templates.js:59`, `:88`, `:116`, `:143`, `:175` | Stance templates use `icon` |
| `module/services/stance/hooks/effect-lifecycle.js:207` | Copies `templateData.icon` |
| `module/sheets/handlers/item-effects-handler.js:114` | Item effects created with `icon` |
| `module/apps/condition-manager.js:250` | Condition effects created with `icon: statusDef.img` |
| `tests/quench/workflows/fear-workflow.js:342`, `tests/quench/services/stance-effect-preservation.js:87` | Assert `effect.icon` |
| `tests/quench/workflows/fear-workflow.js:660-661` | Assert the v13 `duration` shape; 14.370 stores `value` / `units` / `expiry` and derives `seconds` |

## Deliverables

| Layer | Change |
|-------|--------|
| Data | A model for core's `base` ActiveEffect type extending `foundry.data.ActiveEffectTypeDataModel`, assigned to `CONFIG.ActiveEffect.dataModels.base` and not declared in `system.json` (a core type there invalidates `documentTypes`, FOUNDRY-V14-REFERENCE.md §2.2), adding `rules` (an `ArrayField` of `ObjectField`, default empty) for Stage 7 (X6) |
| Utils, Services | Read `effect.system.changes` and `change.type === "add"`; create effects with `system.changes` |
| Services, Sheets | B6 (AUTOMATION.md §2): read-then-write sites take the stored value from `_source`, not the prepared one, so an effect bonus is never written into storage (`chat-damage-buttons.js:63-66, 124-143`, `void-manager.js:191, 275`, `spell-cast-roll.js:120-121, 252`, `maho-cast-roll.js:111, 206-207`, `initiative.js:70-82`, `pc-actions-handler.js:175`, `void-points-handler.js:23, 63`, `spell-slot-manager.js`, `pc-adjustment-handler.js`, `rest.js:52`). Availability checks keep reading the prepared value |
| Documents, Utils, Setup | XP: only the legacy creation fields mark a free stored Trait rank, with a migration for the flag (Decision 3); #29's XP half |
| Documents | Weapon damage is recomputed in the owner's derived preparation (`item-enrichment.js`), because item preparation runs before the owner's `"initial"` phase (`client/documents/actor.mjs:471-474`); #29's damage half |
| Config, entry | Register status effects in the v14 form (assign by id into the `CONFIG.statusEffects` proxy, `client/config.mjs:1690-1718`; the whole-property setter is deprecated, `client/client.mjs:29-39`); keep every id, name, and image |
| Docs | `ACTIVE_EFFECTS.md` uses change types and states the phase to pick for Trait changes |

## Acceptance

- Vitest: `xp-calculations` and family-bonus tests use the v14 change shape.
- Quench: stance, condition, family-bonus, and status-effects batches pass; a Trait `add` change on an Actor raises the Ring, Wounds, and Armor TN derived from it.
- Quench `deprecations`: no Active Effect warning remains.
- Issue #29: a Strength `add` change from an Active Effect reaches weapon damage, and XP charges only purchased Strength ranks.

## Decisions

1. Effects stored by 3.2.1 worlds are migrated by core (`active-effect.mjs:167-191`); the system writes only the v14 shape.
2. Changes default to phase `"initial"`: the base model keeps core's change schema (`common/data/active-effect.mjs:17-24`, `phase` initial `"initial"`), and the effect sheet adds a change from that schema's initial value (`client/applications/sheets/active-effect-config.mjs:246-251`). Stored 3.2.1 changes carry no phase and take the same default.
3. #29's XP half is fixed here (Ernie: whatever matches the rules best). Its cause is XP bookkeeping, not effect phases: `trackXpExpenditure` marked any creation bonus as a free stored rank (`xpFreeTraitBase`) when the Trait reached 3. Only the legacy `system.trait` / `bonus` fields mark it now, because an Active Effect bonus adds on top of the stored rank; every stored rank is then bought at 4 × the Trait's new rank with the bonus (Core Rulebook p.103). `module/setup/migrations/actors/xp-free-trait-base.js` clears the flag where the bonus is an effect and resets `xpRetroactiveVersion` so the XP history rebuilds.

## Out of scope

| Item | Stage |
|------|-------|
| Effect duration and expiry automation beyond what 3.2.1 does | Not planned |
