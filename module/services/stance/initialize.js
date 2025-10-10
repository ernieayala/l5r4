/**
 * @fileoverview Stance Service Initialization
 * 
 * Initializes the L5R4 stance service by registering all necessary hooks
 * for stance automation and effect lifecycle management.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 */

import {
  onPreCreateActiveEffect,
  onCreateActiveEffect,
  onUpdateActiveEffect,
  onDeleteActiveEffect
} from "./hooks/effect-lifecycle.js";

/**
 * Initialize the L5R4 stance service.
 * Registers all hooks required for stance automation and effect lifecycle.
 * Should be called once during system initialization (init hook).
 * 
 * **Registered Hooks:**
 * - `preCreateActiveEffect` - Populate stance effect data from Token HUD
 * - `createActiveEffect` - Handle stance effect creation
 * - `updateActiveEffect` - Handle stance effect updates (enable/disable)
 * - `deleteActiveEffect` - Handle stance effect deletion
 * 
 * @example
 * ```javascript
 * Hooks.once("init", () => {
 *   initializeStanceService();
 * });
 * ```
 */
export function initializeStanceService() {
  Hooks.on("preCreateActiveEffect", onPreCreateActiveEffect);
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
}
