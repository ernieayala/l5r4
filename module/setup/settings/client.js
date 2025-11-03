/**
 * Client Settings Registration
 * Registers client-scoped settings for the L5R4 Enhanced system.
 * Client settings are stored per-user and control individual user preferences.
 *
 * Foundry VTT Requirements:
 * - Uses game.settings.register() API for client-scoped settings
 * - Client scope stores settings in browser localStorage per user
 * - Settings names/hints use i18n keys from lang/ folder
 *
 * @module setup/settings/client
 * @requires Foundry VTT v13+
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Registers all client-scoped settings for the L5R4 system.
 * Currently no client settings are registered.
 * Roll dialog behavior is hardcoded: click shows dialog, shift-click skips dialog.
 *
 * @function registerClientSettings
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry ClientSettings API}
 */
export function registerClientSettings() {
  // No client settings currently registered
  // Roll dialogs always show by default, shift-click to skip
}
