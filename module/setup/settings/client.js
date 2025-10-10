/**
 * @fileoverview L5R4 Client Settings
 * 
 * Registers per-user UI preference settings stored locally on each client.
 * These settings control roll dialog behavior and debug options that don't
 * affect game mechanics and should be customizable per-user.
 * 
 * **Responsibilities:**
 * - Register roll dialog visibility preferences for different roll types
 * - Register client-side debug flags for troubleshooting
 * - Provide per-user UI customization without affecting other players
 * 
 * **Settings Registered:**
 * - `showTraitRollOptions`: Control trait roll dialog visibility
 * - `showSkillRollOptions`: Control skill roll dialog visibility
 * - `showSpellRollOptions`: Control spell/ring roll dialog visibility
 * - `showWeaponRollOptions`: Control weapon roll dialog visibility
 * - `debugWoundConfig`: Enable debug logging for Wound Configuration Application
 * 
 * **Scope:** All settings are `client` scope (stored locally, per-user)
 * **Visibility:** All are visible in Settings UI (`config: true`)
 * 
 * **Design Notes:**
 * These settings allow holding Shift to toggle behavior from default preference.
 * For example, if `showTraitRollOptions` is true, holding Shift skips the dialog.
 * If false, holding Shift shows the dialog.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry Settings API}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Register all client-scope UI preference settings.
 * These settings are stored locally and don't synchronize across clients.
 * 
 * **Registration Order:**
 * Roll dialog settings registered first, then debug options
 * 
 * **Safety Requirements:**
 * This function MUST be called during Foundry's 'init' hook after the game
 * object is initialized. It relies on Foundry's guarantee that game.settings
 * exists during the init hook and will fail with a generic error if called
 * incorrectly or if Foundry's settings API is unavailable.
 * 
 * @returns {void}
 * 
 * @integration-test Scenario: Settings persist across browser sessions
 * @integration-test Reason: Unit tests mock game.settings completely
 * @integration-test Validates: Settings save to browser storage and restore correctly
 * 
 * @example
 * // Called from main settings registration during init
 * Hooks.once('init', () => {
 *   registerClientSettings();
 * });
 * 
 * @example
 * // Accessing client settings at runtime
 * const showDialog = game.settings.get('l5r4', 'showTraitRollOptions');
 * const debug = game.settings.get('l5r4', 'debugWoundConfig');
 */
export function registerClientSettings() {
  /**
   * Client UI preference: trait roll dialog visibility.
   * Controls whether the roll options dialog appears when making trait rolls
   * (Ring and Trait rolls). When disabled, rolls use default parameters without
   * prompting for modifiers, void points, or other options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showTraitRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showTraitRollOptions.name",
    hint: "SETTINGS.showTraitRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: skill roll dialog visibility.
   * Controls whether the roll options dialog appears when making skill rolls.
   * When disabled, skill rolls proceed immediately with default parameters,
   * bypassing modifier selection and emphasis options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showSkillRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showSkillRollOptions.name",
    hint: "SETTINGS.showSkillRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: spell roll dialog visibility.
   * Controls whether the roll options dialog appears when casting spells.
   * When disabled, spell rolls proceed immediately without prompting for
   * raises, void points, or other casting modifiers.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showSpellRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showSpellRollOptions.name",
    hint: "SETTINGS.showSpellRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Client UI preference: weapon roll dialog visibility.
   * Controls whether the roll options dialog appears when making weapon attacks.
   * When disabled, weapon rolls proceed immediately with default parameters,
   * bypassing stance selection, called shots, and other combat options.
   * 
   * @type {boolean} true = show dialog, false = skip dialog and roll immediately
   */
  game.settings.register(SYS_ID, "showWeaponRollOptions", {
    config: true, 
    scope: "client",
    name: "SETTINGS.showWeaponRollOptions.name",
    hint: "SETTINGS.showWeaponRollOptions.label",
    type: Boolean, 
    default: true
  });

  /**
   * Debug setting: enables detailed logging for Wound Configuration Application.
   * Provides comprehensive debugging information for troubleshooting form
   * interactions, event handling, and actor updates in the wound config system.
   * 
   * **Debug Information Includes:**
   * - Form element detection and event listener attachment
   * - User interaction events (change, input, click)
   * - Actor update operations and success/failure status
   * - Application lifecycle events (render, close)
   * 
   * @type {boolean} true = enable debug logging, false = normal operation
   */
  game.settings.register(SYS_ID, "debugWoundConfig", {
    config: true, 
    scope: "client",
    name: "SETTINGS.debugWoundConfig.name",
    hint: "SETTINGS.debugWoundConfig.label",
    type: Boolean,
    default: false
  });
}
