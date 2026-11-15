# Section

A titled block of a sheet: a title bar on core's header background, then the body. Every list on the PC and NPC
sheets (Skills, weapons, armor, items, spells, techniques, kiho, kata, tattoos, Advantages, Disadvantages, bio) and
every sidebar block (stance, armor, Wounds, Fear) is a section. A list section can collapse to its title.

| Item        | Detail                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial     | Each section is its own partial: `templates/actor/_partials/_<noun>-section.hbs`, `_combat.hbs`, `_armor.hbs`, `_wounds.hbs`, `_fear.hbs`, `_bio.hbs` |
| Parameters  | The sheet context: the section's list (`skills`, `weapons`, ...), `collapsedSections.<scope>` for its collapsed state                                 |
| SCSS        | `scss/components/_section.scss` (target), the rename of `scss/components/_sections.scss`                                                              |
| Block class | `l5r4-section`                                                                                                                                        |
| Shows in    | PC sheet (`_stats.hbs:237-290`), NPC sheet (`_stats-npc.hbs:209-296`), both sidebars (`pc.hbs:8-11`, `npc.hbs:6-9`), the XP manager                   |
| Gallery     | A list section open and collapsed, a compact sidebar section, a section with title tools (wealth, spell slots), a Notes section                       |

## Anatomy

| Part          | Element                                                                        | Class                                  | Class now                                                             |
| ------------- | ------------------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| Section       | `<section>`                                                                    | `l5r4-section flexcol -gap-sm`         | `flexcol -gap-sm`; `combat`, `armor`, `wounds`, `fear` in the sidebar |
| Title bar     | `<div>`                                                                        | `l5r4-section-title flexrow -gap-sm`   | `section-title flexrow -gap-sm`                                       |
| Heading       | `<h4>`                                                                         | `l5r4-section-heading`                 | `title` (`_sections.scss:81-92`)                                      |
| Title tools   | Fields or slots between the heading and the buttons                            | per component                          | `flexrow wealth`, `flexrow spells` (`_sections.scss:39-42`)           |
| Title buttons | Icon buttons (`icon-button.md`), the expand control last (`expand-control.md`) | `inline-control icon`                  | `a.button inline-control icon`                                        |
| Body          | An item list (`item-row.md`), a grid (`grid.md`), or `<div>` for prose         | `l5r4-section-body` on a prose `<div>` | `section-container` (`_sections.scss:73-79`)                          |

The title bar carries `data-scope="<scope>"`, the key a collapsed state is stored under
(`module/utils/section-state.js`).

## Variants

| Variant | Selects it                                                       | Look                                                                 | Used at                                                         |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| List    | `l5r4-section` with an expand control and `data-scope`           | Title bar, sort header, item list                                    | Every `*-section.hbs`                                           |
| Compact | `l5r4-section-title -compact`                                    | The heading drops core's field height, so a sidebar title sits tight | `_combat.hbs:3`, `_armor.hbs:4`, `_wounds.hbs:3`, `_fear.hbs:3` |
| Bio     | `l5r4-section -bio`                                              | The rows sit on `--l5r4-color-panel`                                 | `_bio.hbs:1`                                                    |
| Prose   | `l5r4-section` with a `l5r4-section-body` holding `prose-mirror` | No list; inline padding on the body                                  | Notes (`_stats.hbs:270-290`)                                    |

## States

| State         | Look                                                                                                                                     | Markup                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Expanded      | Body shows; the expand icon is `fa-angle-up`                                                                                             | `aria-expanded="true"` on the expand control; no `is-collapsed`                    |
| Collapsed     | Body hidden at once (no transition, `foundations/motion.md`); the title bar stays; icon `fa-angle-down`                                  | `aria-expanded="false"`; `is-collapsed` on `l5r4-section-title` mirrors it for CSS |
| Focus-visible | The focused title button shows core's focus ring                                                                                         | `:focus-visible`                                                                   |
| Empty         | A list section with no entries is not rendered (`{{#if skills.length}}`); the items section, which holds wealth, renders its title alone | `{{#if}}` in the sheet body                                                        |
| Read-only     | Core disables title tools and buttons on a sheet the viewer cannot edit (`button.md` B8); the stored collapsed state still renders       | Core's `disabled`                                                                  |

## Tokens

| Token                                                | Use                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `--l5r4-color-header`, `--l5r4-color-text-on-header` | Title bar background and text, icons, title tool inputs         |
| `--l5r4-space-card`                                  | Title bar padding                                               |
| `--l5r4-space-8`                                     | Prose body inline padding                                       |
| `--l5r4-space-gap-tight`                             | Gap inside the title bar and between title and body (`-gap-sm`) |
| `--l5r4-font-size-title`                             | Heading                                                         |

Contrast: `text-on-header` on `header` is 11.40:1 light and 16.97:1 dark (`foundations/color.md`).

The title tool inputs cap at 46 px wide (`_sections.scss:31`); that size belongs to this component only, so it stays a
literal (`foundations/space-and-size.md` S4).

## Keyboard and screen reader

| Input          | Result                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Tab            | Moves through the title tools and title buttons, then into the body                                     |
| Enter or Space | On the expand control, toggles the body                                                                 |
| Screen reader  | Reads the heading as a level 4 heading; the expand control as "Expand, button, expanded" or "collapsed" |

## Long text

The title bar is one line (`text-wrap: nowrap`, `foundations/typography.md` T7). A heading must fit beside its tools
at 420 px; a translation that does not fit truncates with an ellipsis and keeps its full text in `data-tooltip`. Title tools
never wrap below the heading.

## Rules

| #   | Rule                                                                                                                    | Enforced by                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| S1  | The heading is an `<h4>` holding only its localized text; it carries no action                                          | `tests/conventions/templates.test.js` (interactive elements are native controls) |
| S2  | A collapsible section's state rides on `aria-expanded` of its expand control; `is-collapsed` only mirrors it            | `tests/conventions/templates.test.js` (an expand toggle carries `aria-expanded`) |
| S3  | The collapsed rule hides the body by its class (`.l5r4-section-title.is-collapsed ~ .l5r4-item-row-list`), never by tag | Stylelint `selector-class-pattern`                                               |
| S4  | One key per heading: a heading never joins two keys or uses a literal `&`                                               | Review (`docs/code-system/templates-and-styles.md`)                              |
| S5  | Styles sit under `.l5r4-section`, so the section looks the same in a sheet, the XP manager, and the gallery             | `tests/conventions/styles.test.js`                                               |
| S6  | The expand control is the title bar's last button                                                                       | Review                                                                           |

| #   | Conforming                                                                                                        | Non-conforming                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `<h4 class="title">{{localize "l5r4.ui.sheets.skills"}}</h4>` (`templates/actor/_partials/_skills-section.hbs:3`) | `<h4 class="flex0 title" data-action="recalc-sheet">` (`templates/actor/_partials/_stats.hbs:6`)                                         |
| S2  | The `foundations/states.md` rule 4 example: `aria-expanded` on the toggle, `is-collapsed` on `l5r4-section-title` | `templates/actor/_partials/_expand.hbs:1`: the toggle states nothing                                                                     |
| S3  | `.l5r4-section-title.is-collapsed ~ .l5r4-item-row-list { display: none; }` (modeled on `_sections.scss:16-20`)   | `&.is-collapsed { ~ .item-list { display: none; } }` keyed to a bare class (`scss/components/_sections.scss:16-20`)                      |
| S4  | `{{localize "l5r4.ui.sheets.attacksAndDamage"}}` (modeled)                                                        | `{{localize "l5r4.ui.mechanics.combat.attack"}} & {{localize "l5r4.ui.common.damage"}}` (`templates/actor/_partials/_stats-npc.hbs:211`) |
| S5  | `.l5r4-section-title { background: var(--l5r4-color-header); }` (modeled)                                         | `.title` styled twice, in `scss/components/_sections.scss:81-92` for sheets and `scss/apps/_xp-manager.scss:39-46` for the XP manager    |
| S6  | Add, then expand (`templates/actor/_partials/_skills-section.hbs:4-5`)                                            | Expand before a section's other tools (modeled)                                                                                          |

## Do and don't

| Do                                                              | Don't                                        |
| --------------------------------------------------------------- | -------------------------------------------- |
| Keep a section's title tools to what applies to the whole list  | Put a per-row control in the title bar       |
| Use `-compact` for every sidebar section                        | Mix compact and full headings in one column  |
| Store the collapsed state per user and actor, as the sheet does | Collapse a section by default for every user |

## Names

| Current                   | Target                        | Why                                                                               |
| ------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `section-title`           | `l5r4-section-title`          | Decision 15; `foundations/states.md` rule 4                                       |
| `title` (section heading) | `l5r4-section-heading`        | Decision 15                                                                       |
| `title -compact`          | `l5r4-section-title -compact` | The variant moves to the title bar (`docs/code-system/naming.md` **Stylesheets**) |
| `section-container`       | `l5r4-section-body`           | Decision 15                                                                       |
| `-bio-section`            | `l5r4-section -bio`           | A variant on its block (naming.md)                                                |
| `_skills-section.hbs`     | `_skill-section.hbs`          | Section partials take a singular noun (naming.md)                                 |

`title` on the item name of a posted item card is a fixed name (Stage 17 decision 2) and is not this component's
heading; see `item-row.md`.

## Keys this page needs

| Key                               | Value              | For                                 |
| --------------------------------- | ------------------ | ----------------------------------- |
| `l5r4.ui.sheets.attacksAndDamage` | Attacks and damage | The NPC attack section heading (S4) |
