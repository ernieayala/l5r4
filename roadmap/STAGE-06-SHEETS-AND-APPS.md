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
| `module/sheets/base-actor-sheet.js:87`, `module/sheets/pc-sheet.js:119`, `:500` | `form.submitOnClose`: an AppV1 option (`client/appv1/api/form-application-v1.mjs:16`), ignored by ApplicationV2 on 13 and 14. No field relies on it: with `submitOnChange`, a typed field saves as focus leaves it, which closing the sheet does |
| `module/sheets/base-actor-sheet.js:196-` | `_getHeaderControls` removed duplicates the sheets themselves caused: each `DEFAULT_OPTIONS` spread `super.DEFAULT_OPTIONS`, and ApplicationV2 already merges every class's options and concatenates arrays (`client/applications/api/application.mjs:437-484`), so `window.controls` held the Token entries three times |
| `module/documents/item.js:130-133` | `L5R4Item#getData` calls `super.getData`, which `Item` does not have; nothing calls it (the sheets call `enhanceItemSheetData` themselves). Remove |
| `module/apps/*.js` | Eight `ApplicationV2` apps; render and save each |
| `templates/**/*.hbs` | Helpers in use: `selectOptions`, `checked`, `numberFormat` (no removed helpers found) |
| Issue #30 (sheet parts) | Ring values hidden on a light-theme sheet in a dark interface; no Void Ring arrows; PC portrait does not open the image picker; NPC attacks cannot be removed. Its NPC Initiative part is Stage 13 |

## Deliverables

- Fixes for whatever the Quench sheet batches and the `deprecations` inventory show in sheets and apps.
- `tests/quench/` sheet and app batches updated to v14 behavior (render, change a field, run each action).
- Each sheet's `DEFAULT_OPTIONS` lists only its own options; the header-control dedupe, `submitOnClose`, the item sheet's unused `styles`, and `L5R4Item#getData` are removed.
- Issue #30's sheet parts: the Ring backdrop follows the nearest theme (a light sheet in a dark interface showed dark text on a dark backdrop); the Void Ring gets the Traits' up and down arrows on both sheets; NPC attacks can be removed (Decision 1). The PC portrait already opens the image picker in 3.2.1.
- `cleanTest` fails on console warnings, error notifications, and unhandled rejections as well as console errors. Batches that delete the messages they post wait for core's chat pop-up cards first (`settleChatNotifications`): a message deleted while its card animates in makes core reject a second later, inside whatever test runs then (`client/applications/sidebar/tabs/chat.mjs:1318-1321`).

## Acceptance

- Quench: `pc-sheet`, `npc-sheet`, `item-sheet`, every app batch, and `smoke` pass with `cleanTest` (no console errors or warnings).
- Manual: open each sheet and app as GM and as a player who owns the PC; drag an item onto a PC; edit a skill's emphases; adjust Traits and Void.

## Decisions

1. NPC attacks stay three fixed slots. A delete button clears a slot (attack and damage back to empty, after a confirmation unless Shift is held), an empty slot is hidden, and "Add Attack" opens the attack config on the first empty slot. No schema change. Ernie, 2026-11-13.
2. The `sheets-and-apps` batch skips the NPC sheet's long rest: it warns that the NPC's heal rate is 0, which is issue #40 (Stage 13). Stage 13 removes the skip.

## Out of scope

| Item | Stage |
|------|-------|
| Visual redesign, new accessibility rules | Not planned |
