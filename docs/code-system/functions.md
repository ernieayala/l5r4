# Functions

How a function in `module/` and `dist/l5r4-enhanced.js` takes its inputs and hands back its result: parameters, the
shape of "result or problem", async code, early returns, and boolean parameters. Function names and the verb
vocabulary are in `docs/code-system/naming.md`; JSDoc is in `docs/code-system/documentation.md`.

Counts on this page come from the Stage 17 survey and from ESLint core rules run in report mode over `module/` and
`dist/l5r4-enhanced.js`.

## Parameters

A function takes at most two positional parameters. Everything past them goes in one options object, destructured in
the signature with its defaults, and defaulted to `{}` when every option is optional.

| Rule                                                                                                                            | Enforced by                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| At most three parameters: two positional and an options object                                                                  | ESLint core `max-params` (3)                        |
| The third parameter, when present, is the options object                                                                        | review                                              |
| Options are destructured in the signature, with their defaults there                                                            | review                                              |
| A function whose arity a caller fixes keeps that arity, with an `eslint-disable-next-line max-params` comment naming the caller | ESLint core `max-params` (3), review of the comment |

Callers that fix an arity: Foundry overrides (`_prepareSubmitData(event, form, formData, updateData)`), Foundry hook
handlers (`updateActiveEffect(effect, changes, options, userId)`), and the sheet handler shape `(context, event,
element[, delta])` that 46 of 66 handler statics in `module/sheets/handlers/` follow. ESLint reports 34 functions with
four or more parameters; 8 of them have a fixed arity, 26 are the system's own.

| Rule                         | Conforming                                                                                                                  | Non-conforming                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two positional, then options | `module/services/effects/apply.js:74`: `applyEffect(actor, id, { turnOf, ...options } = {})`                                | `module/services/ledger.js:67`: `recordTrackChange(actor, track, points, reason)`                                                                    |
| Options last                 | `module/services/combat/damage-roll.js:39`: `rollDamageFromAttack(message, { askForOptions = true } = {})`                  | `module/utils/ten-dice.js:38`: `applyTenDiceRule(diceRoll, diceKeep, bonus = 0, { littleTruths = false } = {})`, three positional before the options |
| Options only                 | `module/services/fear.js:103`: `testFear({ npc, character } = {})`                                                          | `module/documents/item/preparation/derived-data.js:43`: `applyDiceFormula` with five positional parameters                                           |
| Fixed arity                  | `module/services/animations/hooks.js:100`: `onUpdateActiveEffectAnimation` takes core's four `updateActiveEffect` arguments | `module/utils/rule-engine.js:54`: `forEachRule` with five positional parameters and no caller fixing them                                            |

## Boolean parameters

A positional boolean that picks what a function does is two jobs in one signature. Split it into two functions, or
pass the fact by name in the options object.

| Rule                                                                                             | Enforced by |
| ------------------------------------------------------------------------------------------------ | ----------- |
| No positional boolean parameter. A fact the result depends on goes in the options object by name | review      |
| Two behaviors behind one flag become two functions, each named for its job                       | review      |

Five positional booleans exist today: `module/services/animations/status-animations.js:49` (`isStance`),
`module/services/dice/resources/spell-slots.js:66` (`isVoidSlot`), `module/apps/xp-manager.js:121`
(`duplicate`), `module/utils/check.js:118` (`unskilled`), and `module/data/fields.js:34` (`initial`). The last is the
initial value of a boolean field, a value and not a switch, so it stays.

| Rule          | Conforming                                                                                                                            | Non-conforming                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two functions | `module/services/animations/asset-library.js:212` and `:222`: `getStanceAnimation(stanceId)` and `getConditionAnimation(conditionId)` | `module/services/animations/status-animations.js:49`: `startAnimation(actor, statusId, isStance = false)` picks the stance or the condition table at 56 |
| Fact by name  | `module/utils/ten-dice.js:38`: `{ littleTruths = false }` in the options object                                                       | `module/utils/check.js:118`: `maxRaises(voidRing, unskilled = false)`                                                                                   |

## Result or problem

What a function hands back when it cannot do its job depends on its layer, because only some layers may talk to the
user (CLAUDE.md **Layers**).

| Layer                               | On success                                                            | On a problem the user can fix                                                                                                         | Basis                                                                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utils                               | The value, or `{ valid: true, ...values }` from a validator or parser | `{ valid: false, error: "<i18n key>" }`. Utils have no Foundry globals, so the caller localizes `error`                               | Utils majority: `{ valid, error }` 15 against `{ ok, error }` 12; the key, not English text, because every user-facing string is an i18n key (CLAUDE.md **Presentation**) |
| Services, Documents, Sheets, Apps   | The value, or nothing                                                 | Show `ui.notifications?.warn(T(key))`, then return `null`; a function with no return value returns                                    | Services majority: 15 against 5 other shapes                                                                                                                              |
| GM query handler (`CONFIG.queries`) | The value, or nothing                                                 | `throw new Error(...)`; the request came from another client, so it is a trust boundary and the handler refuses it                    | Services: 18 throws, all on the GM side                                                                                                                                   |
| A prompt the user dismisses         | The answer                                                            | `null`: `DialogV2.wait` resolves to `null` on dismissal when `rejectClose` is false [src: client/applications/api/dialog.mjs:405-418] | 9 of the 10 `DialogV2` calls that set `rejectClose` set it to `false`                                                                                                     |

A pure read with no answer (a roll with no TN) returns `null` too; that is a value, not a problem, and shows no
notification.

| Rule                                                                                                                                             | Enforced by |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Utils validators and parsers return `{ valid, error }` with an i18n key in `error`                                                               | review      |
| Client-side code reports a fixable problem with one notification and `null` (or a bare `return` when it returns no value), never a result object | review      |
| Only GM query handlers throw for a refused request                                                                                               | review      |
| `DialogV2` calls pass `rejectClose: false`                                                                                                       | review      |
| A caller checks the documented "no result" value and returns early                                                                               | review      |

| Rule              | Conforming                                                                                      | Non-conforming                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utils shape       | `module/utils/validators.js:44`: `validateEmphasisName` returns `{ valid, error }`              | `module/utils/validators.js:49`: `error` holds English text, not a key; `module/utils/link-syntax.js:127`: `{ ok: false, error: "l5r4.ui.links.error.pool" }` uses `ok` |
| Warn, then `null` | `module/services/dice/check/spell-slots.js:40-49`: `planSlot` warns and returns `null`          | `module/services/dice/resources/void-points.js:144`: `spendVoidPoint` returns `{ success, rollBonus, keepBonus, message }` and leaves the warning to its caller         |
| GM side throws    | `module/services/combat/damage.js:243-282`: `runDamageAction` throws on a request it refuses    | none found                                                                                                                                                              |
| Dismissed prompt  | `module/services/dice/check/roll-check.js:176-181`: `DialogV2.prompt` with `rejectClose: false` | `module/services/chat.js:93`: `rejectClose: true`, caught and turned into `{ cancelled: true }`                                                                         |

## Async code

| Rule                                                                                                                                      | Enforced by |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `async` and `await`. `.then` only to chain a serial queue                                                                                 | review      |
| Every promise is awaited or returned. A call left running on purpose carries a comment saying why                                         | review      |
| A function of the system's own is `async` only when it awaits. A Foundry override keeps core's `async` signature whether it awaits or not | review      |
| Independent work runs together with `Promise.all`                                                                                         | review      |
| A timer never orders work: wait for the promise that does the work                                                                        | review      |

ESLint core `require-await` reports 75 `async` functions with no `await`; many are Foundry overrides such as
`_prepareContext`, which core declares `async`, so the rule cannot tell a departure from an override and is not used.
No ESLint core rule finds a floating promise without type information.

| Rule                       | Conforming                                                                                                     | Non-conforming                                                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.then` for a queue        | `module/documents/item/lifecycle/grants.js:30`: `previous.then(task)` chains one grant after another           | none found                                                                                                                                                                                                                                                                      |
| Await or return            | `module/services/dice/check/spell-slots.js:65-69`: `spendSlot` awaits `actor.update`                           | `dist/l5r4-enhanced.js:190`: `preloadTemplates()` is called without `await`, so its errors become unhandled rejections                                                                                                                                                          |
| `async` only when awaiting | `module/services/effects/apply.js:74`: `applyEffect` awaits                                                    | `module/documents/combat.js:21`: `static async resolveInitiativeBonuses` awaits nothing                                                                                                                                                                                         |
| `Promise.all`              | `module/sheets/item-sheet.js:342`: enriches every field at once                                                | none found                                                                                                                                                                                                                                                                      |
| No timer ordering          | `module/services/effects/apply.js:89-99`: `applyEffectAnywhere` awaits the write or the GM query that makes it | `module/sheets/handlers/item-crud-handler.js:305`: waits one tick with `setTimeout`, then patches button text; `module/services/dice/resources/void-points.js:210` and `spell-slots.js:167` poll a lock every 10 ms where a promise queue (`grants.js:30`) would order the work |

## Early returns

A function checks what stops it first and returns, then does its work unindented.

| Rule                                                                                                                                                                                                                | Enforced by                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Guard clauses first, each returning at once                                                                                                                                                                         | review                       |
| No `else` after a branch that returns                                                                                                                                                                               | ESLint core `no-else-return` |
| A guard checks a value that can be absent at a trust boundary; inside the boundary an absent value is a bug to trace, not a guard to add (`~/.claude/CLAUDE.md` **Change Control**, CLAUDE.md **Defensive coding**) | review                       |
| Every `if` body has braces                                                                                                                                                                                          | ESLint core `curly` (`all`)  |

ESLint core `no-else-return` reports 2 departures in all of `module/`, so the code agrees with itself here.

| Rule                     | Conforming                                                                                               | Non-conforming                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Guard clauses            | `module/services/animations/status-animations.js:51-67`: three guards return before the token loop       | `module/services/dice/resources/void-points.js:114`: a fallback on `actor.system?.rings?.void?.value ?? 0`, a schema field that always exists |
| No `else` after `return` | `module/services/dice/check/spell-slots.js:36-55`: each branch returns and the last path needs no `else` | `module/documents/actor/calculations/wound-system.js:62`, `module/utils/mechanics.js:408`                                                     |
