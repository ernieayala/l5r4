# Stage 6: Sheets and apps

**Goal:** the PC, NPC, and item sheets and the eight apps render, save, and run their actions on 14.370
with no console errors or compatibility warnings, as they did on 13.
**Needs:** 2, 3, 4.

## Foundry v14 APIs

| Need | API (section of FOUNDRY-V14-REFERENCE.md) |
|------|-------------------------------------------|
| `DEFAULT_OPTIONS` (`form`, `actions`, `window.controls`), `PARTS`, tabs | §4.2, §4.3, §4.4 |
| Header controls | §4.2 (`window.controls`, `_getFrameButtons`) |
| Drag and drop on ActorSheetV2 | §4.5 |
| What a document sheet does for the user | §4.7 |

## Audit

| Where | Finding |
|-------|---------|
| `module/sheets/base-actor-sheet.js:87`, `module/sheets/pc-sheet.js:119`, `:500` | `form.submitOnClose`: no such option in the 14.370 `client/applications` source, so closing a sheet does not submit. Check whether any field relies on it (debounced inputs) |
| `module/sheets/base-actor-sheet.js:196-` | `_getHeaderControls` override to remove duplicates; recheck against 14.370 `window.controls` |
| `module/documents/item.js:130-133` | `L5R4Item#getData` calls `super.getData`, which `Item` does not have; nothing calls it (the sheets call `enhanceItemSheetData` themselves). Remove |
| `module/apps/*.js` | Eight `ApplicationV2` apps; render and save each |
| `templates/**/*.hbs` | Helpers in use: `selectOptions`, `checked`, `numberFormat` (no removed helpers found) |
| Issue #30 (sheet parts) | Ring values hidden on a light-theme sheet in a dark interface; no Void Ring arrows; PC portrait does not open the image picker; NPC attacks cannot be removed. Its NPC Initiative part is Stage 13 |

## Deliverables

- Fixes for whatever the Quench sheet batches and the `deprecations` inventory show in sheets and apps.
- `tests/quench/` sheet and app batches updated to v14 behavior (render, change a field, run each action).

## Acceptance

- Quench: `pc-sheet`, `npc-sheet`, `item-sheet`, every app batch, and `smoke` pass with `cleanTest` (no console errors or warnings).
- Manual: open each sheet and app as GM and as a player who owns the PC; drag an item onto a PC; edit a skill's emphases; adjust Traits and Void.

## Out of scope

| Item | Stage |
|------|-------|
| Visual redesign, new accessibility rules | Not planned |
