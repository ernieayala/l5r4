/**
 * @module apps/example
 * @description A conforming window for the convention checks' ESLint fixtures.
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";

/**
 * A window listing one actor's effects.
 */
export default class ExampleApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "l5r4-example"],
    actions: { "delete-effect": ExampleApplication.#onDeleteEffect }
  };

  static PARTS = { body: { template: `systems/${SYS_ID}/templates/apps/example.hbs` } };

  /**
   * The window's title: one key, with the actor's name as its placeholder.
   * @returns {string} The localized title
   */
  get title() {
    return F("l5r4.apps.example.titleFor", {
      name: this.actor?.name ?? T("l5r4.ui.common.unknown")
    });
  }

  /** @override */
  async _prepareContext(options) {
    return super._prepareContext(options);
  }

  /**
   * Delete an effect the user owns.
   * @this {ExampleApplication}
   * @param {PointerEvent} _event - The click
   * @param {HTMLElement} element - The button, inside the effect's row
   */
  static async #onDeleteEffect(_event, element) {
    const effect = await fromUuid(element.dataset.uuid);
    await effect?.delete();
  }
}
