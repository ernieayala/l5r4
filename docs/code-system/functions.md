# Functions

How a function in `module/` and `dist/l5r4-enhanced.js` takes its inputs and hands back its result: parameters, the shape of "result or problem", async code, early returns, and boolean parameters. Function names and the verb vocabulary are in `docs/code-system/naming.md`; JSDoc is in `docs/code-system/documentation.md`.

Counts on this page come from ESLint core rules run over `module/` and `dist/l5r4-enhanced.js`.

## Parameters

A function takes at most two positional parameters. Everything past them goes in one options object, destructured in the signature with its defaults, and defaulted to `{}` when every option is optional.

| Rule | Enforced by |
| --- | --- |
| At most three parameters: two positional and an options object | ESLint core `max-params` (3) |
| The third parameter, when present, is the options object | review |
| Options are destructured in the signature, with their defaults there | review |
| A function whose arity a caller fixes keeps that arity, with an `eslint-disable-next-line max-params` comment naming the caller | ESLint core `max-params` (3), review of the comment |

Callers that fix an arity: Foundry overrides (`_prepareSubmitData(event, form, formData, updateData)`), Foundry hook handlers (`updateActiveEffect(effect, changes, options, userId)`), and the sheet handler shape `(context, event, element[, delta])` of the statics in `module/sheets/handlers/`. Seven functions take four parameters, each with a fixed arity and its `eslint-disable-next-line max-params` comment; no function of the system's own takes more than three.

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Two positional, then options | `applyEffect` (`module/services/effects/apply.js`): `applyEffect(actor, id, { turnOf, ...options } = {})` | `getArmorTnPenalty` (`module/utils/armor-penalties.js`): `getArmorTnPenalty(actor, skillName = null, traitName = null)`, a third positional parameter that is not the options object |
| Options last | `rollDamageFromAttack` (`module/services/combat/damage-roll.js`): `rollDamageFromAttack(message, { askForOptions = true } = {})` | `makeExamplePool(roll, keep, bonus, { label } = {})`, three positional before the options (modeled) |
| Options only | `testFear` (`module/services/fear.js`): `testFear({ npc, character } = {})` | A builder with five positional parameters (modeled) |
| Fixed arity | `_prepareSubmitData` (`module/sheets/npc-sheet.js`) takes core's four `DocumentSheetV2#_prepareSubmitData` arguments | A function of the system's own with five positional parameters and no caller fixing them (modeled) |

## Boolean parameters

A positional boolean that picks what a function does is two jobs in one signature. Split it into two functions, or pass the fact by name in the options object.

| Rule | Enforced by |
| --- | --- |
| No positional boolean parameter. A fact the result depends on goes in the options object by name | review |
| Two behaviors behind one flag become two functions, each named for its job | review |

Positional booleans in the code:

- `duplicate` in `XpManagerApplication#_getXpManual` (`module/apps/xp-manager.js`)
- `unskilled` in `getMaxRaises` (`module/utils/check.js`)
- `askForOptions` in `RollHandler.rollSkill`, `RollHandler.rollWeaponAttack`, `RollHandler.rollTrait`, and `RollHandler.rollRing`, and `showDialog` in `RollHandler.rollSpellCast` (`module/sheets/handlers/roll-handler.js`)
- `initial` in `booleanField` (`module/data/fields.js`)

The last is the initial value of a boolean field, a value and not a switch, so it stays.

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Two functions | `getStanceAnimation` and `getConditionAnimation` (`module/services/animations/asset-library.js`): `getStanceAnimation(stanceId)` and `getConditionAnimation(conditionId)` | `startAnimation(actor, statusId, isStance = false)` picking the stance or the condition table in its body (modeled) |
| Fact by name | `applyTenDiceRule` (`module/utils/ten-dice.js`): `{ littleTruths = false }` in the options object | `getMaxRaises` (`module/utils/check.js`): `getMaxRaises(voidRing, unskilled = false)` |

## Function length

A function does one step. When a function runs a job of several steps, each step is a function named for what it does, and the function that runs the job calls them in order, so it reads as the job's outline.

| Rule | Enforced by |
| --- | --- |
| At most 30 lines of code in a function, blank lines and comment lines not counted; a nested function counts in its outer | ESLint core `max-lines-per-function` (`max: 30, skipBlankLines: true, skipComments: true`) |
| A long function splits along its own steps, each a named function the job calls in order; never at an arbitrary line | review |
| A list of values (paths, option lists, one builder per key) is data the function reads, not more lines | review |
| The count of functions over the limit only falls | `tests/conventions/eslint.test.js` against `tests/conventions/baseline.json` (warning count) |

Blank and comment lines are not counted because a comment says why a step does what it does ([documentation.md](documentation.md)) and should never be the reason to split one.

The limit names the outliers, as the file limits in [modules.md](modules.md) do. No function is over it: the rule's count in `tests/conventions/baseline.json` is 0.

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Steps called in order | `module/services/dice/check/roll-check.js`, `rollCheck`: `askCheck`, `spendCheckVoidPoints`, `rollCheckPool`, `postCheck`, `deleteConsumedEffects`; `askCheck` runs the steps that settle the check's terms | A 337-line pipeline that gathers, asks, rolls, and posts in one body (modeled) |
| Data, not lines | `module/utils/rule-summary.js`, `LINE_BUILDERS`: one line builder per rule key that `linesOf` looks up; `module/config/templates.js`, `PRELOAD_TEMPLATES`: the paths `registerTemplates` loads | A function that lists 125 template paths in its body (modeled) |

## Result or problem

What a function hands back when it cannot do its job depends on its layer, because only some layers may talk to the user (CLAUDE.md **Layers**).

| Layer | On success | On a problem the user can fix | Basis |
| --- | --- | --- | --- |
| Utils | The value, or `{ valid: true, ...values }` from a validator or parser | `{ valid: false, error: "<i18n key>" }`. Utils have no Foundry globals, so the caller localizes `error` | The shape most validators use; the key, not English text, because every user-facing string is an i18n key (CLAUDE.md **Presentation**) |
| Services, Documents, Sheets, Apps | The value, or nothing | Show `ui.notifications?.warn(T(key))`, then return `null`; a function with no return value returns | The shape most services use |
| GM query handler (`CONFIG.queries`) | The value, or nothing | `throw new Error("<i18n key>")`, a key under `l5r4.ui.requests`; the request came from another client, so it is a trust boundary and the handler refuses it. `requestGmQuery` (`module/services/gm-client.js`) localizes the key on the requester's client and shows it | The services' throws refuse a request on the GM side; the requester reads the refusal in their own language (#139) |
| A prompt the user dismisses | The answer | `null`: `DialogV2.wait` resolves to `null` on dismissal when `rejectClose` is false [src: client/applications/api/dialog.mjs:405-418] | Every `DialogV2` call that sets `rejectClose` sets it to `false` |

A pure read with no answer (a roll with no TN) returns `null` too; that is a value, not a problem, and shows no notification.

| Rule | Enforced by |
| --- | --- |
| Utils validators and parsers return `{ valid, error }` with an i18n key in `error` | review |
| Client-side code reports a fixable problem with one notification and `null` (or a bare `return` when it returns no value), never a result object | review |
| Only GM query handlers throw for a refused request, and the message is an i18n key under `l5r4.ui.requests` | review |
| `DialogV2` calls pass `rejectClose: false` | review |
| A caller checks the documented "no result" value and returns early | review |

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Utils shape | `validateAttackRaises` (`module/utils/validators.js`) returns `{ valid, error }` with an i18n key in `error` | `parseDamage` (`module/utils/link-syntax.js`): `{ ok: false, error: "l5r4.ui.links.errors.pool" }` uses `ok` |
| Warn, then `null` | `rollFearTest` (`module/services/fear.js`) warns and returns `null` for a character with no Willpower | `spendVoidPoint` (`module/services/dice/resources/void-points.js`) returns `{ success, rollBonus, keepBonus, message }` and leaves the warning to its caller |
| GM side throws | `applyDamageAction` (`module/services/combat/damage.js`) throws on a request it refuses | none found |
| Dismissed prompt | `askChoices` (`module/services/dice/check/dialog.js`): `DialogV2.prompt` with `rejectClose: false` | none found |

## Async code

| Rule | Enforced by |
| --- | --- |
| `async` and `await`. `.then` only to chain a serial queue | review |
| Every promise is awaited or returned. A call left running on purpose carries a comment saying why | review |
| A function of the system's own is `async` only when it awaits. A Foundry override keeps core's `async` signature whether it awaits or not | review |
| Independent work runs together with `Promise.all` | review |
| A timer never orders work: wait for the promise that does the work | review |

ESLint core `require-await` reports 73 `async` functions with no `await`; many are Foundry overrides such as `_prepareContext`, which core declares `async`, so the rule cannot tell a departure from an override and is not used. No ESLint core rule finds a floating promise without type information.

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| `.then` for a queue | `updateGrantQueue` (`module/documents/item/lifecycle/grants.js`): `previous.then(task)` chains one grant after another | none found |
| Await or return | `spendSlot` (`module/services/dice/check/spell-slots.js`) awaits `actor.update` under the lock and returns the lock's promise | `registerTemplates` (`dist/l5r4-enhanced.js`): `registerTemplates()` is called without `await`, so its errors become unhandled rejections |
| `async` only when awaiting | `applyEffect` (`module/services/effects/apply.js`) awaits | `isRetroactiveUpdateDue` (`module/services/xp/versioning.js`): `async` and awaits nothing |
| `Promise.all` | `formatEnrichedFields` (`module/sheets/item-sheet.js`) enriches every field at once | none found |
| No timer ordering | `applyEffectAnywhere` (`module/services/effects/apply.js`) awaits the write or the GM query that makes it | `updateUnderLock` (`module/services/dice/resources/void-points.js`) and `updateUnderLock` (`module/services/dice/check/spell-slots.js`) poll a lock every 10 ms where a promise queue like `updateGrantQueue` (`module/documents/item/lifecycle/grants.js`) would order the work |

## Early returns

A function checks what stops it first and returns, then does its work unindented.

| Rule | Enforced by |
| --- | --- |
| Guard clauses first, each returning at once | review |
| No `else` after a branch that returns | ESLint core `no-else-return` |
| A guard checks a value that can be absent at a trust boundary; inside the boundary an absent value is a bug to trace, not a guard to add (`~/.claude/CLAUDE.md` **Change Control**, CLAUDE.md **Defensive coding**) | review |
| Every `if` body has braces | ESLint core `curly` (`all`) |

ESLint core `no-else-return` reports no departure in `module/` or `dist/l5r4-enhanced.js`.

| Rule | Conforming | Non-conforming |
| --- | --- | --- |
| Guard clauses | `startAttackAnimation` (`module/services/animations/attack-animations.js`): two guards return before it picks the animation | `validateVoidPoints` (`module/services/dice/resources/void-points.js`): a fallback on `actor.system?.rings?.void?.value ?? 0`, a schema field that always exists |
| No `else` after `return` | `getSlotStatus` (`module/services/dice/check/spell-slots.js`): each branch returns and the last path needs no `else` | An `if` branch that returns, then an `else` holding the rest of the function (modeled) |
