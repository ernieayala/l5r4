/**
 * @module sheets/handlers/app-launcher-handler
 * @description Opens the actor's configuration windows (armor, combat, conditions, wounds, XP, wealth) from sheet
 * actions, one window per actor: a window already open for the same actor comes to the front instead of a second
 * one opening (#189). A failure logs a warning and shows the user a notification.
 * @see module:apps/wound-config for wound mechanics configuration UI
 * @see module:apps/xp-manager for XP tracking and advancement UI
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import ArmorConfigApplication from "../../apps/armor-config.js";
import CombatConfigApplication from "../../apps/combat-config.js";
import ConditionManagerApplication from "../../apps/condition-manager.js";
import WoundConfigApplication from "../../apps/wound-config.js";
import XpManagerApplication from "../../apps/xp-manager.js";
import WealthManagerApplication from "../../apps/wealth-manager.js";

/**
 * Bring a window that is open to the front, or open it. ApplicationV2 windows are registered by id in
 * `foundry.applications.instances` while they are open [src: client/applications/api/application.mjs:580], so a
 * window whose id is its document's finds itself there.
 * @param {string} id - The window's id
 * @param {function(): foundry.applications.api.ApplicationV2} create - Makes the window when none is open
 * @returns {Promise<foundry.applications.api.ApplicationV2>} The window, open
 */
export async function openWindow(id, create) {
  const open = foundry.applications.instances.get(id);
  if (open) {
    open.bringToFront();
    return open;
  }
  const app = create();
  await app.render(true);
  return app;
}

/**
 * Opens the actor's configuration windows from the sheet's gear buttons, one window per actor.
 */
export class AppLauncherHandler {
  /**
   * Open the actor's Armor configuration.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose armor configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openArmorConfig(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      ArmorConfigApplication,
      context.actor,
      "l5r4.apps.armorConfig.errors.openFailed"
    );
  }

  /**
   * Open the actor's Combat configuration.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose combat configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openCombatConfig(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      CombatConfigApplication,
      context.actor,
      "l5r4.apps.combatConfig.errors.openFailed"
    );
  }

  /**
   * Open the actor's Condition manager. It redraws itself as the actor's conditions change (registered in
   * `actor.apps`), so an open one only comes to the front.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose conditions to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openConditionManager(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      ConditionManagerApplication,
      context.actor,
      "l5r4.apps.conditionManager.errors.openFailed"
    );
  }

  /**
   * Open the actor's Wound configuration.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose wound configuration to open
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openWoundConfig(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      WoundConfigApplication,
      context.actor,
      "l5r4.apps.woundConfig.errors.openFailed"
    );
  }

  /**
   * Open the actor's XP manager.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose XP to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openXpManager(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      XpManagerApplication,
      context.actor,
      "l5r4.apps.xpManager.errors.openFailed"
    );
  }

  /**
   * Open the actor's Wealth manager.
   * @param {object} context - Sheet rendering context
   * @param {L5R4Actor} context.actor - The actor whose wealth to manage
   * @param {Event} [event] - DOM event to prevent default behavior on
   * @returns {Promise<void>}
   */
  static async openWealthManager(context, event) {
    event?.preventDefault?.();
    await openActorWindow(
      WealthManagerApplication,
      context.actor,
      "l5r4.apps.wealthManager.errors.openFailed"
    );
  }
}

/**
 * Bring the actor's window of a kind to the front, or open it; a failure is logged and shown to the user.
 * @param {typeof foundry.applications.api.ApplicationV2} AppClass - The window's class, with `getWindowId(actor)`
 * @param {L5R4Actor} actor
 * @param {string} failedKey - The i18n key of the message a failure shows
 * @returns {Promise<void>}
 */
async function openActorWindow(AppClass, actor, failedKey) {
  try {
    await openWindow(AppClass.getWindowId(actor), () => new AppClass(actor));
  } catch (err) {
    console.warn(`${SYS_ID} AppLauncherHandler: Failed to open ${AppClass.name}`, {
      err,
      actorId: actor.id
    });
    ui.notifications?.error(T(failedKey));
  }
}
