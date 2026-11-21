# Components

One page per component: a reusable piece of the UI with one partial (or one core element), one SCSS block, and the tokens it reads. Patterns (`../patterns/`) compose these pages into sheets, chat cards, dialogs, and panels; the foundations (`../foundations/`) define every token a page names.

## What every page holds

| Section | Holds |
| --- | --- |
| Summary table | Partial and its parameters, SCSS file, block class, where it shows, game terms with book pages |
| Anatomy | Each part, its element, and its class; where the code differs, what it has |
| Variants | Each variant and the class or parameter that selects it |
| States | Every state the component can show, with the look from `foundations/states.md` and the markup |
| Tokens | Every token the component reads |
| Keyboard and screen reader | What each key does and what assistive technology announces |
| Long text | Wrapping and truncation at the sheet's default width |
| Rules | Each rule with the check that enforces it, then one conforming and one non-conforming example |
| Do and don't | Short guidance a reviewer applies |
| Names | Fixed names the component keeps (Stage 17 decision 2) and the action names it uses |
| Keys this page needs | `lang/en.json` keys the page's markup reads that the file lacks; the `lang/` owner adds them |

A page describes the component as the rules want it: what the code does where it agrees with itself, plus the Stage 17 decision 15 and 16 picks. Where the code falls short of the page, the page says what the code has: a "Where the code differs" column or note beside the part, a non-conforming example cited from the code, or a `(target)` path.

### Target paths

A partial or SCSS file a page names that does not exist is written in one form: the full path from the repo root in backticks, one space, then `(target)` with nothing else inside the parentheses.

| Form | Example |
| --- | --- |
| Conforming | `` `scss/components/_<name>.scss` (target), holding `_<old-name>.scss` `` |
| Non-conforming | `` `scss/components/_<name>.scss` (target; holds `_<old-name>.scss`) ``, `` Target: `_<name>.scss` `` |

The design system's other pages use the same form. `tests/conventions/design-system.test.js` reads every backticked path that starts `templates/` or `scss/` in `docs/design-system/`: one followed by ` (target)` must not exist, and every other must exist; a path holding a `<placeholder>` or `*` is skipped. Core's files are written from `resources/app/` (`resources/app/templates/dice/roll.hbs`), so the check skips them too. The change that creates a target registers a new partial in `PRELOAD_TEMPLATES` (`module/config/templates.js`) and drops the marker from its page.

### One name for block, file, and page

Block, file, and page share one name: `scss/components/_<name>.scss` styles `.l5r4-<name>` and is documented in `components/<name>.md`, which `tests/conventions/design-system.test.js` checks. A window's file sits in `scss/apps/` instead, named as its `module/apps/` file (`effect-panel.md`, `compendium-browser.md`; `docs/code-system/templates-and-styles.md`, Folders). A chat card whose root class is a fixed name keeps that class as its block, and its file takes the page's name: `_request-card.scss` styles `.l5r4-check-request`, `_check-card.scss` styles `.l5r4-check`, `_item-summary-card.scss` styles `.l5r4-item-summary` (`patterns/chat-cards.md` rule 6). A component that styles nothing of its own (the icon button, the expand control, the effect prompt, the sidebar blocks built from a section and a grid) has no SCSS file.

## Pages

### Sheet components

| Page | Component | Shows in |
| --- | --- | --- |
| [button.md](button.md) | Labelled button: core's button and the mask-sprite roll button | Sheets, cards, dialogs, apps |
| [icon-button.md](icon-button.md) | Icon-only button with a tooltip name | Section titles, the PC header, apps |
| [inline-control.md](inline-control.md) | A row's cluster of icon buttons, shown on hover and focus | Item rows, NPC attacks, the effects tab, header fields |
| [form-field.md](form-field.md) | Label and input, read-only value box, a field with trailing controls | Sheets, apps, dialogs |
| [grid.md](grid.md) | Two-column label and value grid | Sheet sidebars, the wound configuration window |
| [section.md](section.md) | Section, section title, heading, and body | PC, NPC, and item sheets |
| [expand-control.md](expand-control.md) | Toggle that shows or hides a section body or a row's details | Section titles, item rows |
| [item-row.md](item-row.md) | Item row and item list | Sheet sections, the XP manager |
| [sort-header.md](sort-header.md) | Column header row whose columns sort the list below | Sheet sections, the XP manager |
| [tabs.md](tabs.md) | Sheet tabs and filter tabs | Item sheet, compendium browser |
| [item-header.md](item-header.md) | Item sheet header: image, name, citation | Item sheet |
| [ring-trait-block.md](ring-trait-block.md) | Ring medallions, Ring ranks, and Trait rows | PC and NPC sheets |
| [rank-control.md](rank-control.md) | A rank stepped in place: Trait ranks, the Void Ring, Honor, Glory, Status, Taint | PC and NPC sheets |
| [void-point-dots.md](void-point-dots.md) | Void Points as nine dots | PC and NPC sheets |
| [wound-track.md](wound-track.md) | Wound Ranks with penalty, threshold, and the current rank | PC and NPC sheets, wound configuration window |
| [initiative-block.md](initiative-block.md) | Stance, Initiative, and movement | PC and NPC sheet sidebar |
| [armor-tn-block.md](armor-tn-block.md) | Armor TN and Reduction | PC and NPC sheet sidebar |
| [fear-block.md](fear-block.md) | Fear Rank and the Fear test | NPC sheet sidebar |
| [spell-slots.md](spell-slots.md) | Spell slots per Ring | Spells section title |

### Chat, dialog, and panel components

| Page | Component | Shows in |
| --- | --- | --- |
| [chat-card.md](chat-card.md) | Card frame shared by every system chat message | Chat log |
| [dice-row.md](dice-row.md) | Kept and dropped dice of a roll | Check and damage cards |
| [check-card.md](check-card.md) | A roll's result: TN, Raises, outcome, follow-up actions | Chat log |
| [request-card.md](request-card.md) | A GM's request for a roll | Chat log |
| [damage-result.md](damage-result.md) | Wounds dealt, Void reduction, undo | Chat log |
| [effect-prompt.md](effect-prompt.md) | A save or check an effect asks for | Chat log |
| [flow-card.md](flow-card.md) | A guided duel or grapple | Chat log |
| [item-summary-card.md](item-summary-card.md) | An item's rule lines and book citation | Chat log, sheets, browser |
| [check-dialog.md](check-dialog.md) | Roll options before a check | `DialogV2` |
| [ledger-dialog.md](ledger-dialog.md) | A change to Honor, Glory, Status, or Taint | `DialogV2` |
| [rules-editor.md](rules-editor.md) | Rule forms and JSON on item and Active Effect sheets | Item and effect sheets |
| [effect-panel.md](effect-panel.md) | Effects on the selected token | Effect panel window |
| [compendium-browser.md](compendium-browser.md) | Filtered compendium entries | Compendium browser window |
| [inline-link.md](inline-link.md) | Check, Damage, Condition, and Fear text links | Journals, descriptions |
| [floating-number.md](floating-number.md) | Wound and Void Point changes drawn on the canvas | Canvas |

A sheet partial that draws no component of its own is named here: `templates/actor/_partials/_limited.hbs`, the Limited view (`../patterns/sheets.md` rule 5).

## Adding a page

Follow **Adding a component** in `../README.md`, then add the page to the table above. A page names only partials and SCSS files that exist and tokens that `scss/` declares or a foundations table defines in its `Token` column, or marks a path in the **Target paths** form until a change creates it (`tests/conventions/design-system.test.js`).
