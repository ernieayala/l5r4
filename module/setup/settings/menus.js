/**
 * Settings Menus Registration
 * Registers the buttons the system adds to Configure Settings, each opening a window.
 *
 * @module setup/settings/menus
 */

import { SYS_ID } from "../../config/constants.js";
import DesignGalleryApplication from "../../apps/design-gallery.js";

/**
 * Registers the system's settings menus.
 *
 * - `designGallery`: opens the design gallery (roadmap/STAGE-17 Deliverable 2). GMs only (`restricted`), as the
 *   gallery is a tool for building the system, not for play.
 *
 * Foundry API: `game.settings.registerMenu` with an ApplicationV2 `type` [src: client/helpers/client-settings.mjs:166-194]
 *
 * @function registerMenus
 * @returns {void}
 */
export function registerMenus() {
  game.settings.registerMenu(SYS_ID, "designGallery", {
    name: "l5r4.system.settings.designGallery.name",
    label: "l5r4.system.settings.designGallery.label",
    hint: "l5r4.system.settings.designGallery.hint",
    icon: "fa-solid fa-palette",
    type: DesignGalleryApplication,
    restricted: true
  });
}
