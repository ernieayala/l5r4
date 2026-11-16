/**
 * @module sheets/handlers/app-launcher-handler
 * @description Opens the actor's configuration windows (armor, combat, conditions, wounds, XP, wealth) from sheet
 * actions, one window per actor: an open window for the same actor is focused through the ui.windows registry
 * instead of opening a second one. A failure logs a warning and shows the user a notification.
 * @see module:apps/wound-config for wound mechanics configuration UI
 * @see module:apps/xp-manager for XP tracking and advancement UI
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import ArmorConfigApplication from "../../apps/armor-config.js";
import CombatConfigApplication from "../../apps/combat-config.js";
import ConditionManager from "../../apps/condition-manager.js";
import WoundConfigApplication from "../../apps/wound-config.js";
import XpManagerApplication from "../../apps/xp-manager.js";
import WealthManagerApplication from "../../apps/wealth-manager.js";

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
   * Opens the Armor Configuration application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose armor configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see ArmorConfigApplication for armor mechanics implementation
   */
  static async openArmorConfig(context, event, _element) {
    event?.preventDefault?.();

    try {
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof ArmorConfigApplication && app.actor.id === context.actor.id
      );

      if (existingApp) {
        existingApp.bringToTop();
      } else {
        const armorConfig = new ArmorConfigApplication(context.actor);
        await armorConfig.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID} AppLauncherHandler: Failed to open armor configuration application`, {
        err,
        actorId: context.actor.id
      });
      ui.notifications?.error(T("l5r4.apps.armorConfig.errors.openFailed"));
    }
  }

  /**
   * Opens the Combat Configuration application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose combat configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see CombatConfigApplication for combat mechanics implementation
   */
  static async openCombatConfig(context, event, _element) {
    event?.preventDefault?.();

    try {
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof CombatConfigApplication && app.actor.id === context.actor.id
      );

      if (existingApp) {
        existingApp.bringToTop();
      } else {
        const combatConfig = new CombatConfigApplication(context.actor);
        await combatConfig.render(true);
      }
    } catch (err) {
      console.warn(
        `${SYS_ID} AppLauncherHandler: Failed to open combat configuration application`,
        {
          err,
          actorId: context.actor.id
        }
      );
      ui.notifications?.error(game.i18n.localize("l5r4.apps.combatConfig.errors.openFailed"));
    }
  }

  /**
   * Opens the Condition Manager application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose conditions to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see ConditionManager for condition management implementation
   */
  static async openConditionManager(context, event, _element) {
    event?.preventDefault?.();

    try {
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof ConditionManager && app.actor.id === context.actor.id
      );

      if (existingApp) {
        existingApp.render(true); // Re-render to refresh checkbox state
      } else {
        const conditionManager = new ConditionManager(context.actor);
        await conditionManager.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID} AppLauncherHandler: Failed to open condition manager application`, {
        err,
        actorId: context.actor.id
      });
      ui.notifications?.error(game.i18n.localize("l5r4.apps.conditionManager.errors.openFailed"));
    }
  }

  /**
   * Opens the Wound Configuration application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose wound configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see WoundConfigApplication for wound mechanics implementation
   */
  static async openWoundConfig(context, event, _element) {
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
      ui.notifications?.error(game.i18n.localize("l5r4.apps.woundConfig.errors.openFailed"));
    }
  }

  /**
   * Opens the XP Manager application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose XP to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see XpManagerApplication for XP calculation and tracking implementation
   */
  static async openXpManager(context, event, _element) {
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
      ui.notifications?.error(game.i18n.localize("l5r4.apps.xpManager.errors.openFailed"));
    }
  }

  /**
   * Opens the Wealth Manager application for the actor.
   * Implements singleton pattern: if an instance exists for this actor, focuses it instead of creating a new one.
   *
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose wealth to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @param {HTMLElement} [_element] - Target element (unused)
   * @returns {Promise<void>}
   * @throws {Error} Logs warning and shows user notification on failure
   *
   * @see WealthManagerApplication for currency management implementation
   */
  static async openWealthManager(context, event, _element) {
    event?.preventDefault?.();

    try {
      // Check ui.windows registry for existing WealthManagerApplication instance for this actor
      const existingApp = Object.values(ui.windows).find(
        app => app instanceof WealthManagerApplication && app.actor.id === context.actor.id
      );

      if (existingApp) {
        // Focus existing window instead of creating duplicate
        existingApp.bringToTop();
      } else {
        // No existing instance - create and render new application
        const wealthManager = new WealthManagerApplication(context.actor);
        await wealthManager.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID} AppLauncherHandler: Failed to open wealth manager application`, {
        err,
        actorId: context.actor.id
      });
      ui.notifications?.error(game.i18n.localize("l5r4.apps.wealthManager.errors.openFailed"));
    }
  }
}
