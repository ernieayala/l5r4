/**
 * Migration Settings Registration
 *
 * Registers Foundry VTT world settings that control the system's data migration behavior.
 * These settings work in conjunction with migrations.js to handle schema updates, legacy
 * data conversions, and icon path migrations when the system version changes.
 *
 * Settings registered:
 * - runMigration: User-controlled flag to enable/disable automatic migrations
 * - forceMigration: Developer/troubleshooting flag to force re-run all migrations
 * - lastMigratedVersion: Internal version tracking for incremental migrations
 *
 * API: game.settings (Foundry VTT Settings API)
 * Scope: world (all settings persist in world database, shared across users)
 *
 * @module setup/settings/migration
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Registers migration-related world settings.
 *
 * Called during system initialization (see register-all.js) to configure settings
 * that control when and how data migrations execute. The migration system handles:
 * - Schema field renames and restructuring
 * - Legacy data format conversions (e.g., bow → weapon type)
 * - Icon path updates
 * - NPC wound system normalization
 * - Skill default value enforcement
 *
 * Foundry API: Uses game.settings.register() to create world-scoped persistent settings.
 * Each setting uses i18n keys from SETTINGS namespace for localized names and hints.
 *
 * @see module:setup/migrations for migration execution logic
 */
export function registerMigrationSettings() {
  // User-visible toggle: Enable/disable automatic migrations on world load
  // Default: true (migrations run automatically when version changes)
  // Use case: Disable for troubleshooting migration issues
  game.settings.register(SYS_ID, "runMigration", {
    scope: "world", // Shared setting across all users in this world
    config: true, // Visible in Foundry settings menu
    name: "SETTINGS.runMigration.name",
    hint: "SETTINGS.runMigration.label",
    type: Boolean,
    default: true
  });

  // Developer/troubleshooting toggle: Force re-run all migrations regardless of version
  // Default: false (only run migrations when version advances)
  // Use case: Re-apply migrations after data corruption or testing
  // Note: Automatically resets to false after migration completes
  game.settings.register(SYS_ID, "forceMigration", {
    scope: "world", // Shared setting across all users in this world
    config: true, // Visible in Foundry settings menu
    name: "SETTINGS.forceMigration.name",
    hint: "SETTINGS.forceMigration.label",
    type: Boolean,
    default: false
  });

  // Internal version tracker: Records last successfully migrated system version
  // Default: "0.0.0" (triggers migrations on first world load)
  // Hidden from settings menu (config: false) - managed automatically by migration system
  // Used to determine which migrations need to run (only runs for version changes)
  game.settings.register(SYS_ID, "lastMigratedVersion", {
    scope: "world", // Shared setting across all users in this world
    config: false, // Hidden - internal system setting
    type: String,
    default: "0.0.0"
  });
}
