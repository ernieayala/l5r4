/**
 * @module setup/settings/client
 * @description Registers the client-scoped settings for the L5R4 Enhanced system: per-user preferences stored in the
 * browser. Roll dialogs follow the click: a click shows the dialog, Shift-click skips it.
 */
import { SYS_ID } from "../../config/constants.js";

/**
 * Registers all client-scoped settings for the L5R4 system.
 *
 * - `floatingNumbers`: Wound and Void Point changes float over tokens (module/services/scrolling-text.js), on by
 *   default. Core's "Scrolling Status Text" setting turns all scrolling text off as well.
 *
 * @returns {void}
 */
export function registerClientSettings() {
  game.settings.register(SYS_ID, "floatingNumbers", {
    config: true,
    scope: "client",
    name: "l5r4.system.settings.floatingNumbers.name",
    hint: "l5r4.system.settings.floatingNumbers.hint",
    type: Boolean,
    default: true
  });
}
