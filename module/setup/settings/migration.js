/**
 * @module setup/settings/migration
 * @description Registers the world settings that control the data migration in `module/setup/migrations.js`:
 * `runMigration` turns automatic migration on or off, `forceMigration` runs every step again, and the hidden
 * `lastMigratedVersion` keeps the version a world last migrated to under 4.0.0 and before, which no longer write it.
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
  // Default: true (each GM world load brings older documents up to date)
  // Use case: Disable for troubleshooting migration issues
  game.settings.register(SYS_ID, "runMigration", {
    scope: "world", // Shared setting across all users in this world
    config: true, // Visible in Foundry settings menu
    name: "l5r4.system.settings.runMigration.name",
    hint: "l5r4.system.settings.runMigration.hint",
    type: Boolean,
    default: true
  });

  // Developer/troubleshooting toggle: Force re-run every step on every document, whatever schema it records
  // Default: false (each step runs once per document)
  // Use case: Re-apply migrations after data corruption or testing
  // Note: Automatically resets to false after migration completes
  game.settings.register(SYS_ID, "forceMigration", {
    scope: "world", // Shared setting across all users in this world
    config: true, // Visible in Foundry settings menu
    name: "l5r4.system.settings.forceMigration.name",
    hint: "l5r4.system.settings.forceMigration.hint",
    type: Boolean,
    default: false
  });

  // The version a world last migrated to under 4.0.0 and before, which wrote it; read for Scenes saved before scenes
  // carried a migration schema (module/setup/migrations.js migrateScene). Hidden from the settings menu
  game.settings.register(SYS_ID, "lastMigratedVersion", {
    scope: "world", // Shared setting across all users in this world
    config: false, // Hidden - internal system setting
    type: String,
    default: "0.0.0"
  });
}
