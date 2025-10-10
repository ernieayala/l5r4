/**
 * @fileoverview L5R4 Settings Registration - Re-export Point
 * 
 * Re-exports settings registration function from the modular structure.
 * Settings are organized into category-specific modules:
 * - `./settings/migration.js` - Migration control and version tracking
 * - `./settings/client.js` - Per-user UI preferences and debug options
 * - `./settings/world.js` - GM-controlled game mechanics and house rules
 * - `./settings/register-all.js` - Orchestrator that coordinates registration
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 */

// Re-export settings registration from modular structure
export { registerSettings } from "./settings/register-all.js";
