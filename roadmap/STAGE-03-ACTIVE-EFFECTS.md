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
| Utils, Services | Read `effect.system.changes` and `change.type === "add"`; create effects with `system.changes` |
| Config, entry | Register status effects in the v14 form; keep every id, name, and image |
| Docs | `ACTIVE_EFFECTS.md` uses change types and states the phase to pick for Trait changes |

## Acceptance

- Vitest: `xp-calculations` and family-bonus tests use the v14 change shape.
- Quench: stance, condition, family-bonus, and status-effects batches pass; a Trait `add` change on an Actor raises the Ring, Wounds, and Armor TN derived from it.
- Quench `deprecations`: no Active Effect warning remains.
- Issue #29: a Strength `add` change from an Active Effect reaches weapon damage, and XP charges only purchased Strength ranks.

## Decisions

1. Effects stored by 3.2.1 worlds are migrated by core (`active-effect.mjs:167-191`); the system writes only the v14 shape.

### Still open

- Default phase for effects users build in the effect sheet: `"initial"` (Traits feed derived values) is the likely answer; confirm when the sheet's default is checked.

## Out of scope

| Item | Stage |
|------|-------|
| Effect duration and expiry automation beyond what 3.2.1 does | Not planned |
