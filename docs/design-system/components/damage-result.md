# Damage result

The card that says what a damage roll did to one actor: the Wounds taken from the damage, the Reduction, Spirit, or Invulnerability that changed it, and two buttons, Reduce with Void and Undo. The same message re-renders when either button runs. It is a [chat card](chat-card.md).

| Item | Detail |
| --- | --- |
| Template | `templates/chat/damage-result.hbs`, `CHAT_TEMPLATES.damageResult`, preloaded in `PRELOAD_TEMPLATES` (`module/config/templates.js`), which names every `CHAT_TEMPLATES` path (`tests/unit/config/templates.test.js`) |
| Posted by | `postResult` (`module/services/combat/damage.js`), on the GM's client through the `l5r4-enhanced.damage` query |
| Stored in | `flags.l5r4-enhanced.damageResult` (fixed flag): the actor, Wounds, Reduction, and whether Void was spent, the actor killed, the damage undone |
| Wired by | `bindDamageCards` (`module/services/combat/damage.js`) |
| SCSS | `.l5r4-damage-result` (`scss/components/_damage-result.scss`); its note lines share the chat card shell's italic (`scss/components/_chat-card.scss`) |
| Quench | `l5r4-enhanced.combat` |

## Anatomy

All classes and actions are fixed names ([chat card](chat-card.md#fixed-names)).

| Part | Markup | Shows |
| --- | --- | --- |
| Root | `div.chat-card.l5r4-damage-result`, `-undone` when undone | A column |
| Title | `div.dice-flavor` | `l5r4.ui.combat.resultTitle`: who takes how many Wounds from how much damage |
| Notes | `div.check-note`, one each | Reduction, Spirit, Invulnerability, the Void Point spent, killed |
| Undone | `div.check-note` | `l5r4.ui.combat.undoneNote` |
| Buttons | `div.damage-actions.flexrow.-gap-sm` | `damage-void` "Reduce with Void", `damage-undo` "Undo" |

## Variants

| Variant | Shows |
| --- | --- |
| Wounds taken | Title, notes, both buttons |
| No Wounds | Title with 0 Wounds, notes, Undo only (`canVoid` needs Wounds, in `postResult` (`module/services/combat/damage.js`)) |
| Void Point spent | Title with the reduced Wounds, the Void note, Undo only |
| Killed | The killed note; the actor has the `dead` status |
| Undone | Title, notes, the undone note, no buttons, dimmed |

## States

| State | Look | Markup |
| --- | --- | --- |
| Open | Buttons shown | `canVoid`, `undone` false |
| Viewer does not own the actor | Reduce with Void is removed on that client | `voidButton.remove()` in `bindDamageCards` (`module/services/combat/damage.js`) |
| Void spent | Reduce with Void gone; the Void note added | Re-render with `voidSpent: true` in `spendVoidPointOnDamage` (`module/services/combat/damage.js`) |
| Undone | `opacity: var(--l5r4-state-disabled-opacity)`, the undone note, no buttons | `-undone` (fixed), re-render with `undone: true` in `applyDamageUndo` (`module/services/combat/damage.js`) |
| No GM connected | Warning `l5r4.ui.effects.noGM` on a player's click; the card does not change | `requestDamageAction` (`module/services/combat/damage.js`) |

## Parameters

Context from `postResult` (`module/services/combat/damage.js`): the stored result, and

| Name      | Type     | Meaning                                                    |
| --------- | -------- | ---------------------------------------------------------- |
| `title`   | string   | `resultTitle` with `name`, `wounds` (after Void), `damage` |
| `notes`   | string[] | Finished sentences                                         |
| `canVoid` | boolean  | Show Reduce with Void                                      |
| `undone`  | boolean  | The undone variant                                         |

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-space-gap-tight` | `gap` | Root column (`.l5r4-damage-result` (`scss/components/_damage-result.scss`)) |
| `--l5r4-state-disabled-opacity` | `opacity` | `-undone` (`.l5r4-damage-result` (`scss/components/_damage-result.scss`)) |

## Keyboard and screen reader

Both buttons are `<button type="button">` with visible labels. The title is one sentence with the actor, the Wounds, and the damage, so a reader hears the result before the buttons. Undone reads as the note "Undone.", not only as the dimming.

## Long text

A long actor name wraps in the title. The two buttons share one row; each label wraps inside its half ([chat card](chat-card.md#long-text)).

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| DM1 | A change to the result re-renders the same message; no second card | Quench `l5r4-enhanced.combat` | `existing.update({ content, flags })` in `postResult` (`module/services/combat/damage.js`) | Posting a new "Void spent" card under the old one (modeled) |
| DM2 | The buttons act on the flags, which only the GM changes; a player's click goes to the GM as a query | Quench `l5r4-enhanced.combat` | `gm.query(DAMAGE_QUERY, request)` (`module/services/combat/damage.js`) | Updating the actor from the player's client (modeled) |
| DM3 | Undone shows a note and drops the buttons, besides the disabled look | Review, in the gallery's chat section | `{{#if undone}}<div class="check-note">{{localize "l5r4.ui.combat.undoneNote"}}</div>{{/if}}` (`templates/chat/damage-result.hbs`) | Dimming alone (modeled) |
| DM4 | The disabled look reads the state token | `tests/conventions/styles.test.js` (state rules read `--l5r4-state-*`) | `opacity: var(--l5r4-state-disabled-opacity);` in `&.-undone` (`scss/components/_damage-result.scss`) | `opacity: 0.7;` (modeled) |
| DM5 | The Wounds in the title are the Wounds taken after a Void Point, as one sentence | Review | `wounds: taken` (`module/services/combat/damage.js`) | Title and a separate "minus 10" note for the reader to subtract (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Name the actor and the Wounds in the title | Make the reader compare the damage card and the result card |
| Remove Reduce with Void for viewers who cannot use it | Disable it with no reason |
| Keep `-undone` as the state class | Rename it to `is-undone`: posted cards carry `-undone` |
