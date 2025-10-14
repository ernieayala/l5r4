/**
 * Application Launcher Handler
 *
 * Delegates actor sheet actions to launch specialized applications (Wound Config, XP Manager).
 * Implements singleton window management to prevent duplicate application instances per actor.
 *
 * Foundry VTT Integration:
 * - Uses Foundry v13+ Application v2 singleton pattern via ui.windows registry
 * - Integrates with event delegation system (receives context, event, element from sheets)
 * - Leverages bringToTop() for window focus management
 * - Uses foundry.utils.mergeObject pattern in target applications
 *
 * Responsibilities:
 * - Check for existing application instances before creating new ones
 * - Create and render new application instances when none exist
 * - Focus existing instances if already open (prevent duplicates)
 * - Handle errors gracefully with console warnings and user notifications
 *
 * @module sheets/handlers/app-launcher-handler
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html|Application v2 Documentation}
 * @see module:apps/wound-config for wound mechanics configuration UI
 * @see module:apps/xp-manager for XP tracking and advancement UI
 */

import { SYS_ID } from "../../config/constants.js";
import WoundConfigApplication from "../../apps/wound-config.js";
import XpManagerApplication from "../../apps/xp-manager.js";

/**
 * Handler for launching specialized actor applications from sheet actions.
 * Implements singleton pattern to prevent duplicate windows per actor.
 *
 * Usage Pattern:
 * Called via event delegation from actor sheets with standardized handler signature:
 * - context: Sheet rendering context with actor reference
 * - event: DOM event (preventDefault called if present)
 * - element: Target DOM element (unused in these handlers)
 *
 * All methods perform singleton checks against ui.windows registry before instantiation.
 */
export class AppLauncherHandler {
  /**
   * Opens the Wound Configuration application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {Object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose wound configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see WoundConfigApplication for wound mechanics implementation
   */
  static async openWoundConfig(context, event, element) {
    event?.preventDefault?.();

    try {
      // Check ui.windows registry for existing WoundConfigApplication instance for this actor
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof WoundConfigApplication && app.actor.id === context.actor.id
      );

      if (existingApp) {
        // Focus existing window instead of creating duplicate
        existingApp.bringToTop();
      } else {
        // No existing instance - create and render new application
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

  /**
   * Opens the XP Manager application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {Object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose XP to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see XpManagerApplication for XP calculation and tracking implementation
   */
  static async openXpManager(context, event, element) {
    event?.preventDefault?.();

    try {
      // Check ui.windows registry for existing XpManagerApplication instance for this actor
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof XpManagerApplication && app.actor.id === context.actor.id
      );

      if (existingApp) {
        // Focus existing window instead of creating duplicate
        existingApp.bringToTop();
      } else {
        // No existing instance - create and render new application
        const xpManager = new XpManagerApplication(context.actor);
        await xpManager.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID} AppLauncherHandler: Failed to open XP manager application`, {
        err,
        actorId: context.actor.id
      });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.xpManagerFailed"));
    }
  }
}
