/**
 * @fileoverview L5R4 Migration Settings
 * 
 * Registers migration-related system settings that control automatic data structure
 * updates when the system version changes. These settings manage migration behavior,
 * version tracking, and provide manual override controls for troubleshooting.
 * 
 * **Responsibilities:**
 * - Register migration control flags (enable/disable, force run)
 * - Track system version and migration completion status
 * - Provide internal flags for one-time migration tracking
 * 
 * **Settings Registered:**
 * - `migratedCommonItemTypes`: One-time v12→v13 item type migration completion flag
 * - `runMigration`: Master switch to enable/disable automatic migrations
 * - `forceMigration`: Manual trigger to force migrations regardless of version
 * - `lastMigratedVersion`: Tracks last system version that had migrations applied
 * 
 * **Scope:** All settings are `world` scope (stored with world data, GM-controlled)
 * **Visibility:** Most are hidden from UI (`config: false`) as they're for internal tracking
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/client.ClientSettings.html|Foundry Settings API}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Register all migration-related system settings.
 * These settings control migration behavior and track version history.
 * 
 * **Registration Order:**
 * Settings registered in logical order: flag tracking → control switches → version tracking
 * 
 * @returns {void}
 * 
 * @example
 * // Called from main settings registration
 * registerMigrationSettings();
 * 
 * @example
 * // Accessing migration settings
 * const shouldMigrate = game.settings.get('l5r4', 'runMigration');
 * const lastVersion = game.settings.get('l5r4', 'lastMigratedVersion');
 */
export function registerMigrationSettings() {
  /**
   * Migration tracking: one-time v12→v13 item-type migration status.
   * Internal flag to track completion of the item type migration that occurred
   * during the Foundry v12 to v13 transition. Hidden from UI as it's purely
   * for system bookkeeping and should not be modified by users.
   * 
   * @type {boolean} true = migration completed, false = migration pending
   */
  game.settings.register(SYS_ID, "migratedCommonItemTypes", {
    scope: "world", 
    config: false, 
    type: Boolean, 
    default: false
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
   * Manual migration trigger: forces migrations to run regardless of version.
   * Useful for debugging migration issues or re-running migrations after fixes.
   * Automatically resets to false after migration completes.
   * 
   * @type {boolean} true = force migration on next startup, false = normal behavior
   */
  game.settings.register(SYS_ID, "forceMigration", {
    scope: "world",
    config: true,
    name: "SETTINGS.forceMigration.name",
    hint: "SETTINGS.forceMigration.label",
    type: Boolean,
    default: false
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
}
