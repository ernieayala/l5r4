/**
 * @module setup/settings/register-all
 * @description Registers every system setting by calling each scope's registration in turn: the migration settings,
 * the client settings, the world settings, and the settings menus. It runs during `init`, before document classes
 * are configured or data is prepared, because both read settings.
 */
import { registerMigrationSettings } from "./migration.js";
import { registerClientSettings } from "./client.js";
import { registerWorldSettings } from "./world.js";
import { registerMenus } from "./menus.js";

/**
 * Registers all game system settings with Foundry VTT.
 *
 * Coordinates the registration of migration, client, and world settings by delegating
 * to specialized registration modules. Each module handles a specific scope:
 * - Migration settings control automatic data migrations and version tracking.
 * - Client settings configure per-user UI preferences and roll display options.
 * - World settings enable GM control of rule variants (e.g., armor stacking, Void usage).
 *
 * This function must be called during the 'init' hook before any data preparation or
 * document configuration occurs, as settings may be accessed during those processes.
 * The system entry module calls it first in its `init` hook.
 *
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

  // Register the settings buttons that open windows (GM-only design gallery)
  registerMenus();
}
