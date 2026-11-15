# Item header

The top of the item sheet: the item's image, its name as an editable field, and, for an item from the system's
compendiums, the book citation it carries in place of the book's text.

| Item        | Detail                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Partial     | `templates/item/_partials/_header.hbs`, the item sheet's `header` part (`module/sheets/item-sheet.js:176-178`) |
| Parameters  | `item` (the document), `summary.citation` (from `summaryText`, `module/sheets/item-sheet.js:352`)              |
| SCSS        | `scss/components/_item-header.scss` (target), holding `layout/_item-layout.scss:20-26`                         |
| Block class | `l5r4-item-header`                                                                                             |
| Shows in    | The item sheet, every subtype                                                                                  |
| Gallery     | A header with and without a citation, with a long name, on an editable and a read-only sheet                   |

## Anatomy

| Part     | Element                                                     | Class                              | Class now                                                                        |
| -------- | ----------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Header   | `<header>`                                                  | `l5r4-item-header flexrow -gap-md` | `sheet-header flexrow -gap-md` (`_header.hbs:1`)                                 |
| Image    | `<img data-action="editImage" data-edit="img" alt>`         | `l5r4-item-header-image`           | `img.flex0.profile` with `height="64" width="64"` and no `alt` (`_header.hbs:2`) |
| Fields   | `<div>`                                                     | `l5r4-item-header-fields`          | `header-fields`                                                                  |
| Name     | `<h1>` holding `<input type="text" name="name" aria-label>` | `l5r4-item-header-name`            | `h1.document-name`                                                               |
| Citation | `<p>`                                                       | `l5r4-citation` (fixed)            | same (`_header.hbs:8`)                                                           |

The image uses core's `editImage` action, as core's own sheets do (`resources/app/templates/sheets/base-sheet.hbs:4`):
core opens the file picker and saves on change (`client/applications/api/document-sheet.mjs:376-394`). Today the item
sheet's image has no click handler, so E1 gives it one it lacks: a behavior change, filed as its own issue and fixed in
its own change (Stage 17 decision 10).

## Variants

| Variant       | Selects it             | Look                                     |
| ------------- | ---------------------- | ---------------------------------------- |
| With citation | `summary.citation` set | Citation in `meta` italic below the name |
| Plain         | No citation            | Name only                                |

## States

| State         | Look                                                                                                   | Markup                                             |
| ------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Rest          | Image at 64 by 64 px; name in core's `h1` face inside the input                                        |                                                    |
| Hover (image) | Core's pointer cursor                                                                                  | `:hover`                                           |
| Focus-visible | The name input shows core's field outline                                                              | `:focus`                                           |
| Read-only     | Core disables the name input and adds its `disabled` class to the image (`document-sheet.mjs:224-226`) | Core's `disabled`                                  |
| Empty name    | The input shows its placeholder                                                                        | `placeholder="{{localize "l5r4.ui.common.name"}}"` |

## Tokens

| Token                   | Use                                      |
| ----------------------- | ---------------------------------------- |
| `--l5r4-space-8`        | Gap between image and fields (`-gap-md`) |
| `--l5r4-font-size-meta` | Citation                                 |
| `--l5r4-space-4`        | Space above the citation                 |

The 64 px image size belongs to this component only, so it is a literal in `_item-header.scss`
(`foundations/space-and-size.md` S4).

## Keyboard and screen reader

| Input         | Result                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tab           | Focuses the name input. The image takes no focus: core's `editImage` works on an `<img>`, as on core's own sheets |
| Screen reader | Reads the image's `alt` (the item's name), the name field by its `aria-label`, then the citation as text          |

Editing the image from the keyboard is not offered, as in core's sheets. A keyboard route to the file picker is new
behavior and lands as its own change.

## Long text

The name input is one line and scrolls inside itself; the full name shows in the window title. The citation wraps.

## Rules

| #   | Rule                                                                                                                       | Enforced by                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| E1  | The image carries `data-action="editImage"` and `data-edit="img"`, core's action, so the picker opens and saves as in core | `tests/conventions/actions.test.js` (core-owned action names exempt); review |
| E2  | The image has `alt` with the item's name; the name input has `aria-label`                                                  | `tests/conventions/templates.test.js` (`alt` present); review                |
| E3  | No presentational `height` or `width` attributes; the size is in SCSS                                                      | `tests/conventions/templates.test.js`                                        |
| E4  | The citation keeps its fixed class `l5r4-citation`, which posted item summary cards also use                               | `tests/conventions/templates.test.js` (fixed-name exempt list)               |
| E5  | Styles sit under `.l5r4-item-header`, not under the sheet's `.l5r4.item`                                                   | `tests/conventions/styles.test.js`                                           |

| #   | Conforming                                                                                                                         | Non-conforming                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | `<img src="{{source.img}}" data-action="editImage" data-edit="img" alt="...">` (`resources/app/templates/sheets/base-sheet.hbs:4`) | `<img class="flex0 profile" src="{{item.img}}" data-edit="img" ...>` (`templates/item/_partials/_header.hbs:2`): no action, and no handler in `module/sheets/item-sheet.js` reads `data-edit` |
| E2  | `<img ... alt="{{item.name}}">` (modeled)                                                                                          | `<img ... title="{{item.name}}">` with `title` and no `alt` (`templates/item/_partials/_header.hbs:2`)                                                                                        |
| E3  | `.l5r4-item-header-image { block-size: 64px; inline-size: 64px; }` (modeled)                                                       | `height="64" width="64"` (`templates/item/_partials/_header.hbs:2`)                                                                                                                           |
| E4  | `<p class="l5r4-citation">{{summary.citation}}</p>` (`templates/item/_partials/_header.hbs:8`)                                     | Renaming it `l5r4-item-header-citation`, which unstyles the citation in posted cards                                                                                                          |
| E5  | `.l5r4-item-header-name { margin: 0; }` (modeled on `layout/_item-layout.scss:20-22`)                                              | `.l5r4.item .header-fields > h1 { margin: 0; }` (`scss/layout/_item-layout.scss:20-26`)                                                                                                       |

## Do and don't

| Do                                                   | Don't                                                   |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Show the citation as the book page only              | Put a rule summary or book text in the header           |
| Keep the type in the window title, as the sheet does | Repeat the type as a second heading in the header       |
| Use core's image action                              | Bind a click handler to `[data-edit='img']` by selector |

## Names

| Current         | Target                    | Why         |
| --------------- | ------------------------- | ----------- |
| `sheet-header`  | `l5r4-item-header`        | Decision 15 |
| `profile`       | `l5r4-item-header-image`  | Decision 15 |
| `header-fields` | `l5r4-item-header-fields` | Decision 15 |
| `document-name` | `l5r4-item-header-name`   | Decision 15 |

`editImage` is core's action name. It is camelCase because core names it, as `TYPES` and core classes are core's
(`docs/code-system/naming.md` **Fixed names**, core-owned names), and the actions check exempts it.
