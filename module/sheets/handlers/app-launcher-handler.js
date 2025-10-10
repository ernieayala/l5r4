/**
 * @fileoverview Application Launcher Handler - Configuration Application Management
 * 
 * Provides reusable utilities for opening and managing configuration applications
 * from actor sheets. Implements bring-to-front pattern for singleton applications
 * that should only have one instance per actor.
 * 
 * **Responsibilities:**
 * - Open configuration applications (wound config, XP manager, etc.)
 * - Ensure only one instance per actor (bring existing to front)
 * - Handle application lifecycle errors gracefully
 * - Provide consistent pattern across PC and NPC sheets
 * 
 * **Usage:**
 * ```javascript
 * import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
 * 
 * // In sheet _onAction handler:
 * case "wound-config": 
 *   return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html|ApplicationV2}
 */

import { SYS_ID } from "../../config/constants.js";
import WoundConfigApplication from "../../apps/wound-config.js";

/**
 * Application Launcher Handler Class
 * Manages configuration application lifecycle for actor sheets.
 */
export class AppLauncherHandler {
  /**
   * Open wound configuration application for an actor.
   * Implements singleton pattern - brings existing app to front if already open,
   * otherwise creates new instance.
   * 
   * **Wound Configuration:**
   * - Allows switching between Formula and Manual wound track modes
   * - Provides real-time wound system configuration
   * - Updates actor's wound system settings
   * 
   * **Singleton Behavior:**
   * - Only one wound config per actor at a time
   * - If already open, brings window to front instead of creating duplicate
   * - Prevents multiple config windows causing state conflicts
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The click event on config button
   * @param {HTMLElement} element - The clicked element (unused)
   * @returns {Promise<void>}
   * 
   * @example
   * // In sheet action handler:
   * case "wound-config":
   *   return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
   */
  static async openWoundConfig(context, event, element) {
    event?.preventDefault?.();
    
    try {
      // Check if wound config already open for this actor
      const existingApp = Object.values(ui.windows).find(app => 
        app instanceof WoundConfigApplication && app.actor.id === context.actor.id
      );
      
      if (existingApp) {
        // Bring existing window to front
        existingApp.bringToTop();
      } else {
        // Create new wound config application
        const woundConfig = new WoundConfigApplication(context.actor);
        await woundConfig.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID} AppLauncherHandler: Failed to open wound configuration application`, { 
        err, 
        actorId: context.actor.id 
      });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.woundConfigFailed"));
    }
  }
}
