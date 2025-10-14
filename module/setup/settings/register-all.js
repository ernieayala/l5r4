/**
 * Settings Registration Coordinator
 * 
 * Coordinates the registration of all game system settings with the Foundry VTT settings API.
 * This module delegates to specialized registration modules for different setting scopes:
 * - Migration settings: Control automatic data migrations between system versions
 * - Client settings: Per-user preferences for UI behavior and roll display
 * - World settings: Game master controls for rule variants and house rules
 * 
 * Must be called during the 'init' hook before document classes are configured
 * or data preparation occurs, as settings may be accessed during those processes.
 * 
 * Foundry API: Uses game.settings.register() - see Foundry VTT Settings API documentation
 * @module setup/settings/register-all
 */
import { registerMigrationSettings } from "./migration.js";
import { registerClientSettings } from "./client.js";
import { registerWorldSettings } from "./world.js";

/**
 * Registers all game system settings with Foundry VTT
 * 
 * Coordinates the registration of migration, client, and world settings by delegating
 * to specialized registration modules. Each module handles a specific scope:
 * - Migration settings control automatic data migrations and version tracking
 * - Client settings configure per-user UI preferences and roll display options
 * - World settings enable GM control of rule variants (e.g., armor stacking, Void usage)
 * 
 * This function must be called during the 'init' hook before any data preparation or
 * document configuration occurs, as settings may be accessed during those processes.
 * Typically invoked via Hooks.once('init', registerSettings) in the system entry point.
 * 
 * @function registerSettings
 * @returns {void}
 * @throws {Error} If called before game.settings is available
 */
export function registerSettings() {
  // Register migration control and version tracking settings (world scope)
  registerMigrationSettings();
  
  // Register per-user UI preferences and roll display options (client scope)
  registerClientSettings();
  
  // Register GM controls for rule variants and house rules (world scope)
  registerWorldSettings();
}
