/**
 * @module apps/example
 * @description A conforming window for the convention checks' ESLint fixtures.
 */

import { SYS_ID } from "../config/constants.js";

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
