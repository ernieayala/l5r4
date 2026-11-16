# Section

A titled block of a sheet: a title bar on core's header background, then the body. Every list on the PC and NPC sheets (Skills, weapons, armor, items, spells, techniques, kiho, kata, tattoos, Advantages, Disadvantages, bio) and every sidebar block (stance, armor, Wounds, Fear) is a section. A list section can collapse to its title.

| Item | Detail |
| --- | --- |
| Partial | Each section is its own partial in `templates/actor/_partials/`: lists `templates/actor/_partials/_skill-section.hbs`, `templates/actor/_partials/_weapon-section.hbs`, `templates/actor/_partials/_armor-section.hbs`, `templates/actor/_partials/_item-section.hbs`, `templates/actor/_partials/_spell-section.hbs`, `templates/actor/_partials/_technique-section.hbs`, `templates/actor/_partials/_kiho-section.hbs`, `templates/actor/_partials/_kata-section.hbs`, `templates/actor/_partials/_tattoo-section.hbs`, `templates/actor/_partials/_advantage-section.hbs`, `templates/actor/_partials/_disadvantage-section.hbs`; the bio `templates/actor/_partials/_bio.hbs`; Notes `templates/actor/_partials/_note-section.hbs`; sidebar blocks `_combat.hbs`, `_armor.hbs`, `_wounds.hbs`, `_fear.hbs` |
| Parameters | The sheet context: the section's list (`skills`, `weapons`, ...), `collapsedSections.<scope>` for its collapsed state |
| SCSS | `scss/components/_section.scss` |
| Block class | `l5r4-section` |
| Shows in | PC sheet (`templates/actor/_partials/_stats.hbs`), NPC sheet (`templates/actor/_partials/_stats-npc.hbs`), both sidebars (`l5r4-sheet-sidebar` (`templates/actor/pc.hbs`), `l5r4-sheet-sidebar` (`templates/actor/npc.hbs`)), the XP manager |
| Gallery | A list section open and collapsed, a compact sidebar section, a section with title tools (wealth, spell slots), a Notes section |

## Anatomy

| Part | Element | Class |
| --- | --- | --- |
| Section | `<section>` | `l5r4-section flexcol -gap-sm` on a list; `l5r4-section` with its block's class in the sidebar (`l5r4-combat`, `l5r4-armor`, `l5r4-fear`) |
| Title bar | `<div data-section-title>` | `l5r4-section-title flexrow -gap-sm` |
| Heading | `<h4>` | `l5r4-section-heading` |
| Title tools | Fields or slots between the heading and the buttons | Per component: `l5r4-wealth`, `l5r4-spell-slots` (`scss/components/_section.scss`) |
| Title buttons | Icon buttons (`icon-button.md`), the expand control last (`expand-control.md`) | `inline-control icon` on a `<button>`; the sidebar sections' buttons add core's `button` |
| Body | An item list (`item-row.md`), a grid (`grid.md`), or `<div>` for prose | `l5r4-section-body` on a prose `<div>` |

The title bar carries `data-scope="<scope>"`, the key a collapsed state is stored under (`module/services/section-state.js`).

## Variants

| Variant | Selects it | Look | Used at |
| --- | --- | --- | --- |
| List | `l5r4-section` with an expand control and `data-scope` | Title bar, sort header, item list | Every `*-section.hbs` |
| Compact | `l5r4-section-title -compact` | The heading drops core's field height, so a sidebar title sits tight | `templates/actor/_partials/_combat.hbs`, `templates/actor/_partials/_armor.hbs`, `templates/actor/_partials/_wounds.hbs`, `templates/actor/_partials/_fear.hbs` |
| Bio | `l5r4-section -bio` | The rows sit on `--l5r4-color-panel` | `l5r4-section -bio` (`templates/actor/_partials/_bio.hbs`) |
| Prose | `l5r4-section` with a `l5r4-section-body` holding `prose-mirror` | No list; inline padding on the body | Notes (`templates/actor/_partials/_note-section.hbs`) |

## States

| State | Look | Markup |
| --- | --- | --- |
| Expanded | Body shows; the expand icon is `fa-angle-up` | `aria-expanded="true"` on the expand control; no `is-collapsed` |
| Collapsed | Body hidden at once (no transition, `foundations/motion.md`); the title bar stays; icon `fa-angle-down` | `aria-expanded="false"`; `is-collapsed` on `l5r4-section-title` mirrors it for CSS |
| Focus-visible | The focused title button shows core's focus ring | `:focus-visible` |
| Empty | A list section with no entries is not rendered (`{{#if skills.length}}`); the items section, which holds wealth, renders its title alone | `{{#if}}` in the sheet body |
| Read-only | Core disables title tools and buttons on a sheet the viewer cannot edit (`button.md` B8); the stored collapsed state still renders | Core's `disabled` |

## Tokens

| Token | Use |
| --- | --- |
| `--l5r4-color-header`, `--l5r4-color-text-on-header` | Title bar background and text, icons, title tool inputs |
| `--l5r4-space-card` | Title bar padding |
| `--l5r4-space-8` | Prose body inline padding |
| `--l5r4-space-gap-tight` | Gap inside the title bar and between title and body (`-gap-sm`) |
| `--l5r4-font-size-title` | Heading |

Contrast: `text-on-header` on `header` is 11.40:1 light and 16.97:1 dark (`foundations/color.md`).

The title tool inputs cap at 46 px wide (`max-width: 46px` under `.l5r4-section-title` (`scss/components/_section.scss`)); that size belongs to this component only, so it stays a literal (`foundations/space-and-size.md` S4).

## Keyboard and screen reader

| Input | Result |
| --- | --- |
| Tab | Moves through the title tools and title buttons, then into the body |
| Enter or Space | On the expand control, toggles the body |
| Screen reader | Reads the heading as a level 4 heading; the expand control as "Expand, button, expanded" or "collapsed" |

## Long text

The title bar is one line (`text-wrap: nowrap`, `foundations/typography.md` T7). A heading must fit beside its tools at the sheet's default width; a translation that does not fit truncates with an ellipsis and keeps its full text in `data-tooltip`. Title tools never wrap below the heading.

## Rules

| # | Rule | Enforced by |
| --- | --- | --- |
| S1 | The heading is an `<h4>` holding only its localized text; it carries no action | `tests/conventions/templates.test.js` (interactive elements are native controls) |
| S2 | A collapsible section's state rides on `aria-expanded` of its expand control; `is-collapsed` only mirrors it | `tests/conventions/templates.test.js` (an expand toggle carries `aria-expanded`) |
| S3 | The collapsed rule hides the body by its class (`.l5r4-section-title.is-collapsed ~ .l5r4-item-row-list`), never by tag | Stylelint `selector-class-pattern` |
| S4 | One key per heading: a heading never joins two keys or uses a literal `&` | Review (`docs/code-system/templates-and-styles.md`) |
| S5 | Styles sit under `.l5r4-section`, so the section looks the same in a sheet, the XP manager, and the gallery | `tests/conventions/styles.test.js` |
| S6 | The expand control is the title bar's last button | Review |

| # | Conforming | Non-conforming |
| --- | --- | --- |
| S1 | `<h4 class="l5r4-section-heading">{{localize "l5r4.ui.sheets.skills"}}</h4>` (`templates/actor/_partials/_skill-section.hbs`) | `<h4 class="flex0 title" data-action="recalc-sheet">` (modeled) |
| S2 | The `foundations/states.md` rule 4 example: `aria-expanded` on the toggle, `is-collapsed` on `l5r4-section-title` | An expand toggle with no `aria-expanded`: the toggle states nothing (modeled) |
| S3 | `&.is-collapsed { ~ .l5r4-item-row-list { display: none; } }` under `.l5r4-section-title` (`scss/components/_section.scss`) | `&.is-collapsed { ~ .item-list { display: none; } }` keyed to a bare class (modeled) |
| S4 | `{{localize "l5r4.ui.sheets.attacksAndDamage"}}` (modeled) | `{{localize "l5r4.ui.mechanics.combat.attack"}} & {{localize "l5r4.ui.common.damage"}}` (`templates/actor/_partials/_stats-npc.hbs`) |
| S5 | `.l5r4-section-title { background: var(--l5r4-color-header); }` (modeled) | `.title` styled twice, once for sheets and once for the XP manager (modeled) |
| S6 | Add, then expand, in the `data-section-title` bar (`templates/actor/_partials/_skill-section.hbs`) | Expand before a section's other tools (modeled) |

## Do and don't

| Do | Don't |
| --- | --- |
| Keep a section's title tools to what applies to the whole list | Put a per-row control in the title bar |
| Use `-compact` for every sidebar section | Mix compact and full headings in one column |
| Store the collapsed state per user and actor, as the sheet does | Collapse a section by default for every user |

## Names

The compact variant sits on the title bar, `l5r4-section-title -compact`, not on the heading (`docs/code-system/naming.md` **Stylesheets**).

`title` on the item name of a posted item card is a fixed name (Stage 17 decision 2) and is not this component's heading; see `item-row.md`.

## Keys this page needs

| Key                               | Value              | For                                 |
| --------------------------------- | ------------------ | ----------------------------------- |
| `l5r4.ui.sheets.attacksAndDamage` | Attacks and damage | The NPC attack section heading (S4) |
