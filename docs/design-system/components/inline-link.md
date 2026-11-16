# Inline link

A text link written in a journal, an item description, or a chat message as `@Check[...]`, `@Damage[...]`, `@Condition[...]`, or `@Fear[...]`, rendered as a chip inside the text. Clicking it rolls the check for the acting character, rolls the damage, applies the condition, or tests Fear for the targeted tokens. A GM's Check link carries a second control that posts a [request card](request-card.md). A link that does not parse renders broken, with its reason.

| Item | Detail |
| --- | --- |
| Template | `templates/links/inline-link.hbs`, `LINK_TEMPLATES.inlineLink` (`module/config/templates.js`) |
| Rendered by | The core text enricher `l5r4-link`, registered by `registerEnrichers` (`module/setup/enrichers.js`): `renderLink` renders the template; `onRenderLink` wires it when core's `<enriched-content>` joins the page |
| Runs | `onLinkClick` (`module/services/links.js`); the request control calls `postCheckRequest(spec)` |
| Syntax | `module/utils/link-syntax.js` (`LINK_PATTERN`, `parseLink`). The link syntax and the `data-link-type` values `Check`, `Damage`, `Condition`, `Fear` are fixed names: journals store them |
| SCSS | `scss/components/_inline-link.scss`, styling `.l5r4-inline-link` |
| Quench | `l5r4-enhanced.table-tools` |

## Anatomy

The link's HTML is built each time core enriches the text, never stored, so its classes may change. The `data-link-*` attribute names are not stored either; the `data-link-type` values are.

| Part | Markup | Class | Target, where the markup differs |
| --- | --- | --- | --- |
| Link | `<a role="button" tabindex="0" data-link-type data-link-params data-link-label>` with a click and a keydown listener | `l5r4-inline-link` | `<button type="button" class="l5r4-inline-link">` with the same `data-link-*`; the native button handles Enter and Space |
| Icon | `<i inert>` from `ICONS` (`module/setup/enrichers.js`) | the icon's classes |  |
| Text | Text node: `formatLinkText(spec)` (`module/services/links.js`), or the link's own label |  |  |
| Request | `<a role="button" tabindex="0">` built in JavaScript with `document.createElement` by `renderRequestButton` (`module/setup/enrichers.js`), GM and Check only | `l5r4-inline-link-request` | Rendered by the template when `canRequest` is set: `<button type="button" class="l5r4-inline-link-request" data-tooltip="{{localize "l5r4.ui.links.request"}}" aria-label="{{localize "l5r4.ui.links.request"}}">` with `fa-comment-dots` |
| Broken | `<span data-link-broken data-tooltip>`: `fa-link-slash`, the source text, the reason | `l5r4-inline-link -broken` |  |
| Reason | `<span>` in parentheses | `l5r4-inline-link-reason` |  |

| Link type | Icon | Runs |
| --- | --- | --- |
| `Check` | `fa-dice-d10` | The check dialog for the acting character, filled from the link |
| `Damage` | `fa-burst` | A damage roll whose card carries the Apply buttons |
| `Condition` | `fa-person-falling-burst` | The status on the targeted tokens, else the controlled ones |
| `Fear` | `fa-ghost` | A Fear test for those tokens |

## Variants

| Variant             | Shows                                                          |
| ------------------- | -------------------------------------------------------------- |
| Link                | Icon and text                                                  |
| Labelled link       | Icon and the link's `{label}`                                  |
| Check link for a GM | Link, then the request control                                 |
| Broken              | Dashed frame, `fa-link-slash`, the source as typed, the reason |

## States

| State               | Look                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| Default             | A chip: thin muted frame, small corner, one line                        |
| Hover, focus        | Core's button looks on the target `<button>`; focus ring per states.md  |
| Broken              | Dashed frame and the help cursor; the reason in words beside the source |
| No acting character | Warning `l5r4.ui.links.noActor`                                         |
| No targets          | Warning `l5r4.ui.links.noTargets`                                       |

## Parameters

Context from `renderLink` (`module/setup/enrichers.js`):

| Name         | Type    | Meaning                                                                |
| ------------ | ------- | ---------------------------------------------------------------------- |
| `ok`         | boolean | The link parsed                                                        |
| `type`       | string  | `Check`, `Damage`, `Condition`, `Fear` (fixed)                         |
| `params`     | string  | The link's parameters as typed                                         |
| `label`      | string  | The link's `{label}`, or empty                                         |
| `icon`       | string  | Font Awesome classes for the type                                      |
| `text`       | string  | What the link shows                                                    |
| `source`     | string  | The whole link as typed, for a broken link                             |
| `reason`     | string  | Why a broken link did not parse, localized                             |
| `canRequest` | boolean | Target: a GM's Check link, so the template renders the request control |

The click reads the link again from its data attributes, which are page content (`specOf` (`module/setup/enrichers.js`)), never from the text.

## Tokens

| Token | Property | Part |
| --- | --- | --- |
| `--l5r4-border-width-thin`, `--l5r4-color-line-muted` | `border` | Link and request (`.l5r4-inline-link` (`scss/components/_inline-link.scss`)) |
| `--l5r4-radius-sm` | `border-radius` | Link and request (frames.md rule 4) |
| `--l5r4-space-4` | `padding-inline` | Link and request |
| `--l5r4-space-4` | `margin-inline-start` | Request (`.l5r4-inline-link-request` (`scss/components/_inline-link.scss`)) |
| `--l5r4-font-size-meta` | `font-size` | Reason (`.l5r4-inline-link-reason` (`scss/components/_inline-link.scss`)) |

## Keyboard and screen reader

| Contract | Detail |
| --- | --- |
| Focus | `role="button"` and `tabindex="0"` on an `<a>`, with a keydown listener for Enter and Space (`onActivate` (`module/setup/enrichers.js`)). Target: a `<button type="button">`, which takes focus and runs on both keys with no listener |
| Name | The link's text is its name. The request control carries a `data-tooltip` and `aria-label` pair, both `l5r4.ui.links.request` (`foundations/iconography.md` rule 4) |
| Broken | Not a control: a `<span>` with its reason as visible text, so a reader hears why |
| Icons | `inert` |

## Long text

The chip stays on one line (`white-space: nowrap` on `.l5r4-inline-link` (`scss/components/_inline-link.scss`); typography.md, text links). A labelled link keeps its label short enough to fit a journal at its default width; a link wider than its text column overflows it, so review checks long labels in the gallery. A broken link's reason sits outside the chip's nowrap and wraps.

## Rules

| # | Rule | Enforced by | Conforming | Non-conforming |
| --- | --- | --- | --- | --- |
| IL1 | The link is a native button | `tests/conventions/templates.test.js` (native controls) | `<button type="button" class="l5r4-inline-link" data-link-type="{{type}}">` (target) | `<a class="l5r4-inline-link" …>` with `role="button" tabindex="0"` (`templates/links/inline-link.hbs`) |
| IL2 | All link markup comes from the template; JavaScript writes no HTML | ESLint `no-restricted-syntax` | `renderTemplate(LINK_TEMPLATES.inlineLink, …)` then `foundry.utils.parseHTML`, in `renderLink` (`module/setup/enrichers.js`) | The request control built with `document.createElement` in `renderRequestButton` (`module/setup/enrichers.js`) |
| IL3 | JavaScript finds the link by its data attribute | ESLint `no-restricted-syntax` | `element.querySelector("[data-link-type]")` in `onRenderLink` (`module/setup/enrichers.js`) | `element.querySelector(".l5r4-link[data-link-type]")` (modeled) |
| IL4 | A click re-parses the link from its attributes and runs nothing that did not parse | Quench `l5r4-enhanced.table-tools` | `const spec = specOf(link); if (spec.ok) { action(spec); }` in `onLinkActivate` (`module/setup/enrichers.js`) | Running the text the link displays (modeled) |
| IL5 | A broken link shows its reason in words | Quench `l5r4-enhanced.table-tools`, review | `<span class="l5r4-inline-link-reason">({{reason}})</span>` (`templates/links/inline-link.hbs`) | A broken link marked by a dashed frame alone (modeled) |
| IL6 | The link syntax and `data-link-type` values never change | Review (fixed names) | `@Check[skill=…]` in stored journals keeps working | Renaming `Check` to `SkillCheck` (modeled) |
| IL7 | The link's styles live in their own file | `tests/conventions/styles.test.js` (one component per file) | `scss/components/_inline-link.scss` | The link's rules in the effect panel's stylesheet (modeled) |

The Quench batch selects links by their data attributes, as `[data-link-type]` (`tests/quench/table-tools.js`), never by class (templates-and-styles.md: the rules apply to `tests/quench/`).

## Do and don't

| Do | Don't |
| --- | --- |
| Open the check dialog with the link's values, editable | Roll a Check link with no dialog |
| Render the request control for a GM only | Show the request control to players and refuse on click |
| Keep the chip on one line | Break a link across lines inside a sentence |
