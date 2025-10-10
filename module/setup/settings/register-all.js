/**
 * @fileoverview Settings Registration - Orchestrator
 * 
 * Coordinates registration of all system settings by calling individual
 * registration functions from category-specific modules.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import { registerMigrationSettings } from "./migration.js";
import { registerClientSettings } from "./client.js";
import { registerWorldSettings } from "./world.js";

/**
 * Register all L5R4 system settings.
 * Should be called once during system initialization (init hook).
 * 
 * **Registration Order:**
 * 1. Migration settings - Version tracking and migration control
 * 2. Client settings - Per-user UI preferences
 * 3. World settings - GM-controlled game mechanics
 * 
 * **Safety:**
 * This function relies on Foundry's guarantee that game.settings exists
 * during the init hook. No defensive checks are implemented as this is
 * an internal system function with controlled invocation context.
 * 
 * @returns {void}
 * 
 * @integration-test Scenario: All 14 settings persist across Foundry restarts
 * @integration-test Reason: Unit tests mock game.settings.register completely
 * @integration-test Validates: Settings save to world/client storage and are retrievable
 * 
 * @integration-test Scenario: Duplicate registration is properly rejected by Foundry
 * @integration-test Reason: Unit tests cannot simulate Foundry's internal registration state
 * @integration-test Validates: Calling twice produces clear error (dev hot-reload scenario)
 * 
 * @integration-test Scenario: Settings appear in Foundry's settings UI correctly
 * @integration-test Reason: Unit tests mock UI rendering completely
 * @integration-test Validates: config:true settings visible, config:false hidden
 * 
 * @example
 * ```javascript
 * Hooks.once("init", () => {
 *   registerSettings();
 * });
 * ```
 */
export function registerSettings() {
  registerMigrationSettings();
  registerClientSettings();
  registerWorldSettings();
}
