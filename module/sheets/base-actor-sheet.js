/**
 * Base Actor Sheet for L5R4 - Foundry VTT v13
 * Purpose: shared wiring for all actor sheets.
 * API refs: ActorSheetV2, DocumentSheetV2, HandlebarsApplicationMixin - https://foundryvtt.com/api/
 */
import { on } from "../utils.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Extend ActorSheetV2 with the Handlebars rendering pipeline so subclasses
 * don’t need to implement both _renderHTML and _replaceHTML.
 */
export class BaseActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc"),
      "l5r4"
    ],
    form: {
      ...(super.DEFAULT_OPTIONS.form ?? {}),
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /**
   * Bind delegated events on the sheet root using data-action.
   * Subclasses can override _onAction/_onActionContext/_onActionChange.
   * @param {object} context
   * @param {object} options
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Avoid rebinding if the same root is re-used by Foundry.
    if (this._boundRoot === root) return;
    this._boundRoot = root;
    if (!this.actor?.isOwner) return;

    // Click actions
    on(root, "[data-action]", "click", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Right-click/context actions
    on(root, "[data-action]", "contextmenu", (ev, el) => {
      ev.preventDefault();
      const action = el.getAttribute("data-action");
      if (typeof this._onActionContext === "function") this._onActionContext(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Change actions (inline inputs/selects)
    on(root, "[data-action]", "change", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onActionChange === "function") this._onActionChange(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });
  }

  /**
   * Optional generic data-action handlers for subclasses.
   * @param {string|null} _action
   * @param {Event} _ev
   * @param {Element} _el
   */
  // eslint-disable-next-line no-unused-vars
  _onAction(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionContext(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionChange(_action, _ev, _el) {}
}
