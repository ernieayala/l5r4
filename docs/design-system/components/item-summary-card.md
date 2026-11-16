# Item summary card

What an item posts to chat from a sheet's post-to-chat control: the item's card in its chat form, then the item
summary, the one line per rule saying what the item's rules do and the book page the item cites. The summary's two
parts, the rule lines and the citation, also show on the item sheet and the NPC sheet. It is a variant of the
[chat card](chat-card.md) without a `chat-card` root.

| Item         | Detail                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Templates    | The item card: `templates/cards/<subtype>.hbs`, its `{{#unless inSheet}}` branch (fixed file names, chosen by `CHAT_CARD_TEMPLATES`, `module/config/item-types.js:15-31`). Each text section: `templates/cards/_partials/_text-section.hbs` (`label`, `text`), included at the line's start so the stored HTML keeps its bytes. The summary: `templates/chat/item-summary.hbs`, `CHAT_TEMPLATES.itemSummary` |
| Posted by    | `renderItemChatCard(item)` (`module/documents/item/integration/chat-cards.js:49-75`): the card's HTML and the summary's HTML joined, with the subtype label as flavor, in the chat log's message mode                                                                                                                                                                                                        |
| Summary data | `summaryText(system)` (`module/documents/summary.js:24`): `{ lines, citation }`, both localized                                                                                                                                                                                                                                                                                                              |
| Also shown   | Rule lines: `templates/item/_partials/_tab-description.hbs:5-9`. Citation: `_tab-description.hbs:24`, `templates/item/_partials/_header.hbs:8`, `templates/actor/_partials/_stats-npc.hbs:11`                                                                                                                                                                                                                |
| SCSS         | Item card headings now `scss/components/_chat-card.scss:7-22`, summary now `scss/components/_item-summary-card.scss:6-21`. Both move to `scss/components/_item-summary-card.scss`, named for this page and styling the fixed block `l5r4-item-summary` and the posted item card's headings                                                                                                                   |
| Quench       | `l5r4-enhanced.packs`, `l5r4-enhanced.sheets-and-apps`                                                                                                                                                                                                                                                                                                                                                       |

## Anatomy

Every class on a posted item card is a fixed name ([naming.md](../../code-system/naming.md#fixed-names)).

| Part          | Markup                                                                                     | Shows                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Flavor        | Core's message flavor                                                                      | `[<subtype label>]` from `TYPES.Item.<subtype>` (`chat-cards.js:61-70`)              |
| Card root     | `div.item.-<subtype>` (`-expandable` when it has text), `data-item-id`, `data-document-id` | One item                                                                             |
| Name          | `h4.title.flexrow.-gap-sm`                                                                 | The item's name                                                                      |
| Fields        | `<p><strong>{{localize label}}:</strong> value</p>`, one per field                         | The subtype's fields                                                                 |
| Text sections | `h5` heading, then `<p>` with the item's rich text                                         | Rules summary, Mastery Abilities, description: the item's own fields                 |
| Summary root  | `div.l5r4-item-summary`, rendered only with lines or a citation                            | A thin line above, then the parts below                                              |
| Rule lines    | `ul.l5r4-rule-lines`, one `li` each                                                        | What each rule does, in the system's words                                           |
| Citation      | `p.l5r4-citation`                                                                          | The source book and printed page, `l5r4.ui.ruleSummary.citation` ("{book} p.{page}") |

## Variants

| Variant           | Shows                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item with rules   | Card, then rule lines                                                                                                                                                                                                     |
| Compendium entry  | Card, rule lines, and the citation; pack entries carry no book text, so the citation points the reader to the page (`roadmap/STAGE-15-COMPENDIUM-PACKS.md` **Content policy**)                                            |
| Item with neither | The card alone; `item-summary.hbs` renders nothing (`item-summary.hbs:1`)                                                                                                                                                 |
| On the item sheet | Rule lines under the "What it does" heading (`l5r4.ui.ruleSummary.heading`) in the description tab; the citation in the header, and in the description tab when the sheet is not editable and the item has no description |
| On the NPC sheet  | The creature's citation under its name                                                                                                                                                                                    |

## States

None. The card is posted once and never changes. The item's own text is what the item held when posted.

## Parameters

`templates/chat/item-summary.hbs`:

| Name       | Type           | Meaning                                  |
| ---------- | -------------- | ---------------------------------------- |
| `lines`    | string[]       | One localized sentence per rule          |
| `citation` | string or null | Localized "source p.N", or null for none |

The item card's context is the item document itself (`R(templatePath, item)`), with `inSheet` unset.

## Tokens

| Token                                                 | Property                                    | Part                                                                                            |
| ----------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--l5r4-font-size-label`                              | `font-size`                                 | `h5` (`_chat.scss:15`, `--font-size-16` now)                                                    |
| `--l5r4-space-8`                                      | `margin-block-start`                        | `h5` (`_chat.scss:16`)                                                                          |
| `--sidebar-separator`                                 | `border-block-end`                          | `h5`: a divider, core's whole value (frames.md rule 2)                                          |
| `--l5r4-border-width-thin`, `--l5r4-color-line-muted` | `border-block-start`                        | Summary root (`_compendium-browser.scss:140`, now `border-top` with an undefined core variable) |
| `--l5r4-space-4`                                      | `margin-block-start`, `padding-block-start` | Summary root (`:141-142`)                                                                       |
| `--l5r4-space-indent`                                 | `padding-inline-start`                      | Rule lines (`:136`, `1.25rem` now)                                                              |
| `--l5r4-space-4`, `--l5r4-space-8`                    | `margin-block`                              | Rule lines (`:135`)                                                                             |
| `--l5r4-font-size-meta`                               | `font-size`                                 | Citation (`:129`), italic                                                                       |

## Keyboard and screen reader

The posted card has no controls. Headings are `h4` for the name and `h5` for each section, in order. Rule lines are a
list, so a reader hears their count. The citation is a paragraph after them.

## Long text

Names, field values, and rule lines wrap. Rich text keeps its own markup inside core's message width.

## Rules

| #   | Rule                                                                                                                        | Enforced by                                                                       | Conforming                                                                                                                                                                                         | Non-conforming                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IS1 | The rule lines and the citation are each one partial, included by the chat summary and by every sheet that shows them       | `tests/conventions/templates.test.js` (markup used twice is a registered partial) | `templates/chat/_partials/_rule-lines.hbs` (target) and `templates/chat/_partials/_citation.hbs` (target), included by `item-summary.hbs`, `_tab-description.hbs`, `_header.hbs`, `_stats-npc.hbs` | `<p class="l5r4-citation">{{summary.citation}}</p>` written out in four templates (`_tab-description.hbs:24`, `_header.hbs:8`, `_stats-npc.hbs:11`, `item-summary.hbs:11`) |
| IS2 | The summary renders nothing when it has nothing                                                                             | Review                                                                            | `{{#if (or lines.length citation)}}` (`item-summary.hbs:1`)                                                                                                                                        | An empty bordered block under every card (modeled)                                                                                                                         |
| IS3 | Lines and citation are localized phrases built in code from the rules; no book text                                         | Review (CLAUDE.md **Licensed material**)                                          | `rulesSummary(…).map(phraseText)` (`summary.js:27`)                                                                                                                                                | A pack entry's description holding the book's wording (modeled)                                                                                                            |
| IS4 | Borders use logical sides and token colors                                                                                  | Stylelint `property-disallowed-list`, `tests/conventions/styles.test.js`          | `border-block-start: var(--l5r4-border-width-thin) solid var(--l5r4-color-line-muted);`                                                                                                            | `border-top: 1px solid var(--color-border-light-tertiary);` (`_compendium-browser.scss:140`)                                                                               |
| IS5 | Posted item card classes stay as they are                                                                                   | `tests/conventions/templates.test.js` (exempt list)                               | `class="item -{{type}}"` (`templates/cards/skill.hbs:1`)                                                                                                                                           | Renaming the chat branch's root to `l5r4-item-card` (modeled)                                                                                                              |
| IS6 | A field label's colon comes from the template after `{{localize}}`, never from the value: the form all 41 colon labels take | Review                                                                            | `<strong>{{localize "l5r4.ui.common.ring"}}:</strong>` (`templates/cards/spell.hbs:38`)                                                                                                            | A key whose value is "Ring:" (modeled)                                                                                                                                     |

The flavor `[<subtype label>]` is built with brackets in code (`chat-cards.js:70`); whether the brackets stay is a
copy review item.

## Do and don't

| Do                                     | Don't                                     |
| -------------------------------------- | ----------------------------------------- |
| Cite the printed page for pack content | Paste the book's text into a description  |
| Keep the summary after the card        | Mix rule lines into the card's own fields |
