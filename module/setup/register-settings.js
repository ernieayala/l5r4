/**
 * L5R4 Settings Registration - System Configuration Management for Foundry VTT v13+.
 * 
 * This module centralizes all L5R4 system settings registration in a single location
 * to maintain clean separation of concerns and avoid side effects during module imports.
 * Settings are organized by scope (world/client) and functionality for easy maintenance.
 *
 * ## Setting Categories:
 * - **Migration Settings**: Control data migration behavior and version tracking
 * - **Roll Dialog Settings**: Client preferences for roll modifier dialogs
 * - **Game Logic Settings**: World-wide rule toggles and mechanical options
 * - **UI/UX Settings**: User interface and experience customizations
 *
 * ## Setting Scopes:
 * - **World Settings**: Shared across all users in the world (GM configurable)
 * - **Client Settings**: Per-user preferences stored locally
 * - **Hidden Settings**: Internal system state not exposed in UI
 *
 * ## Design Principles:
 * - **Pure Function**: No side effects during import, only when called
 * - **Centralized Management**: All settings defined in one location
 * - **Consistent Naming**: Uses localization keys for names and hints
 * - **Type Safety**: Explicit type definitions with sensible defaults
 * - **Documentation**: Clear comments explaining setting purpose and usage
 *
 * @see {@link https://foundryvtt.com/api/classes/client.settings.Settings.html#register|Settings.register}
 */

import { SYS_ID } from "../config.js";

/**
 * Register all L5R4 system settings with Foundry's settings API.
 * This function is called once during system initialization to define
 * all configuration options available to users and the system.
 * 
 * **Registration Order:**
 * 1. Migration and version tracking settings
 * 2. Client UI preference settings
 * 3. World game logic settings
 * 4. Mechanical rule toggles
 * 
 * @returns {void}
 * 
 * @example
 * // Called from system initialization
 * Hooks.once("init", () => {
 *   registerSettings();
 * });
 */
export function registerSettings() {
  // Migration tracking: one-time v12→v13 item-type migration status
  game.settings.register(SYS_ID, "migratedCommonItemTypes", {
    scope: "world", config: false, type: Boolean, default: false
  });

  // Client UI preferences: roll dialog visibility toggles
  game.settings.register(SYS_ID, "showTraitRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showTraitRollOptions.name",
    hint: "SETTINGS.showTraitRollOptions.label",
    type: Boolean, default: true
  });

  game.settings.register(SYS_ID, "showSkillRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showSkillRollOptions.name",
    hint: "SETTINGS.showSkillRollOptions.label",
    type: Boolean, default: true
  });

  game.settings.register(SYS_ID, "showSpellRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showSpellRollOptions.name",
    hint: "SETTINGS.showSpellRollOptions.label",
    type: Boolean, default: true
  });

  // Client UI preference: weapon roll dialog visibility
  game.settings.register(SYS_ID, "showWeaponRollOptions", {
    config: true, scope: "client",
    name: "SETTINGS.showWeaponRollOptions.name",
    hint: "SETTINGS.showWeaponRollOptions.label",
    type: Boolean, default: true
  });

  /**
   * Migration control: enables/disables automatic data migrations.
   * Provides a safety mechanism to prevent migrations from running
   * if issues are discovered. Should normally remain enabled.
   * 
   * @type {boolean} true = migrations run automatically, false = skip migrations
   */
  game.settings.register(SYS_ID, "runMigration", {
    scope: "world",
    config: true,
    name: "SETTINGS.runMigration.name",
    hint: "SETTINGS.runMigration.label",
    type: Boolean,
    default: true
  });

  /**
   * Migration tracking: stores the last system version that had migrations applied.
   * Used internally to determine if migrations need to run when the system
   * version changes. Hidden from UI as it's purely for system bookkeeping.
   * 
   * @type {string} Semantic version string (e.g., "1.2.3")
   */
  game.settings.register(SYS_ID, "lastMigratedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  // World game logic: automatic calculation settings
  game.settings.register(SYS_ID, "calculateRank", {
    config: true, scope: "world",
    name: "SETTINGS.calculateRank.name",
    hint: "SETTINGS.calculateRank.label",
    type: Boolean, default: true
  });

  /**
   * Ten Dice Rule variant: Little Truths exception.
   * When the Ten Dice Rule reduces kept dice below 10, adds a +2 bonus
   * to compensate. This is a house rule variant not in the core L5R4 rules.
   * 
   * **Mechanical Effect:**
   * - Normal: 12k8 becomes 10k8 + 4 bonus
   * - With LT Exception: 12k8 becomes 10k8 + 6 bonus (extra +2)
   * 
   * @type {boolean} true = apply Little Truths exception, false = standard Ten Dice Rule
   */
  game.settings.register(SYS_ID, "LtException", {
    config: true, scope: "world",
    name: "SETTINGS.LtException.name",
    hint: "SETTINGS.LtException.label",
    type: Boolean, default: false
  });

  /**
   * NPC void point usage: controls whether NPCs can spend void points on rolls.
   * By default, NPCs don't track void points as a resource, but this setting
   * allows them to gain the mechanical benefits (+1k1) without resource deduction.
   * 
   * @type {boolean} true = NPCs can use void points, false = NPCs cannot use void points
   */
  game.settings.register(SYS_ID, "allowNpcVoidPoints", {
    config: true, scope: "world",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean, default: false
  });

  /**
   * Armor mechanics: controls whether multiple armor pieces stack their TN bonuses.
   * Standard L5R4 rules typically don't allow armor stacking, but this provides
   * flexibility for house rules or specific campaign needs.
   * 
   * **Mechanical Effect:**
   * - false (default): Only highest armor TN bonus applies
   * - true: All equipped armor TN bonuses stack together
   * 
   * @type {boolean} true = armor bonuses stack, false = only highest applies
   */
  game.settings.register(SYS_ID, "allowArmorStacking", {
    config: true, scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    hint: "SETTINGS.allowArmorStacking.label",
    type: Boolean, default: false
  });
}
