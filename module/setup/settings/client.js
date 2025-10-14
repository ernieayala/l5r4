/**
 * Client Settings Registration
 * Registers client-scoped settings for the L5R4 Enhanced system.
 * Client settings are stored per-user and control individual user preferences for roll dialogs and debugging.
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
 * Client settings control per-user preferences for roll dialog display and debugging options.
 *
 * Settings registered:
 * - showTraitRollOptions: Display trait roll dialog by default (holding Shift inverts this setting)
 * - showSkillRollOptions: Display skill/damage roll dialog by default (holding Shift inverts this setting)
 * - showSpellRollOptions: Display spell ring roll dialog by default (holding Shift inverts this setting)
 * - showWeaponRollOptions: Display weapon roll dialog by default (holding Shift inverts this setting)
 * - debugWoundConfig: Enable console logging for Wound Configuration troubleshooting
 *
 * All settings use the Foundry client scope, storing values in browser localStorage per user.
 * Setting names and hints use i18n keys formatted as SETTINGS.{key}.name and SETTINGS.{key}.label.
 *
 * @function registerClientSettings
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry ClientSettings API}
 */
export function registerClientSettings() {
  const settings = [
    { key: "showTraitRollOptions", default: true }, // Display trait roll dialog by default
    { key: "showSkillRollOptions", default: true }, // Display skill/damage roll dialog by default
    { key: "showSpellRollOptions", default: true }, // Display spell ring roll dialog by default
    { key: "showWeaponRollOptions", default: true }, // Display weapon roll dialog by default
    { key: "debugWoundConfig", default: false } // Enable wound config debug logging
  ];

  settings.forEach(({ key, default: defaultValue }) => {
    game.settings.register(SYS_ID, key, {
      config: true,
      scope: "client",
      name: `SETTINGS.${key}.name`,
      hint: `SETTINGS.${key}.label`,
      type: Boolean,
      default: defaultValue
    });
  });
}
