/**
 * @module config/design-gallery/components
 * @description The Components section of the design gallery (module/apps/design-gallery.js): every page in
 * docs/design-system/components/, in the README's order, from the files that hold each run of pages.
 */

import { GALLERY_SHEET_CONTROLS } from "./sheet-controls.js";
import { GALLERY_SHEET_LAYOUT } from "./sheet-layout.js";
import { GALLERY_SHEET_HEADERS } from "./sheet-headers.js";
import { GALLERY_SHEET_BLOCKS } from "./sheet-blocks.js";
import { GALLERY_SHEET_COMBAT_BLOCKS } from "./sheet-combat-blocks.js";
import { GALLERY_ROLL_CARDS } from "./roll-cards.js";
import { GALLERY_PROMPT_AND_ITEM_CARDS } from "./prompt-and-item-cards.js";
import { GALLERY_FORMS } from "./forms.js";
import { GALLERY_PANELS } from "./panels.js";
import { GALLERY_LINKS_AND_CANVAS } from "./links-and-canvas.js";

/**
 * Every component page in docs/design-system/components/, in the README's order. Each sample renders `partial`
 * with its context in a frame `scope` picks: `pc`, `npc`, and `item` are the sheets' own style scope, `chat` a chat
 * message, `effect-panel` and `compendium-browser` the window's root, `plain` none. `partials` and `scss` name what
 * the page draws with today; `seeAlso` names pages whose samples show this component too; `notes` say what the
 * gallery cannot show and why.
 */
export const GALLERY_COMPONENTS = Object.freeze([
  ...GALLERY_SHEET_CONTROLS,
  ...GALLERY_SHEET_LAYOUT,
  ...GALLERY_SHEET_HEADERS,
  ...GALLERY_SHEET_BLOCKS,
  ...GALLERY_SHEET_COMBAT_BLOCKS,
  ...GALLERY_ROLL_CARDS,
  ...GALLERY_PROMPT_AND_ITEM_CARDS,
  ...GALLERY_FORMS,
  ...GALLERY_PANELS,
  ...GALLERY_LINKS_AND_CANVAS
]);
