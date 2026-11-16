/**
 * @module sheets/handlers/item-effects-handler
 * @description Creates, opens, toggles, and deletes the ActiveEffects embedded on an Item, for the Item sheet's
 * create-effect, edit-effect, toggle-effect, and delete-effect actions. An effect created with transfer: true applies
 * to the Item's owning Actor; editing opens foundry.applications.sheets.ActiveEffectConfig, and a busy flag keeps a
 * double click from deleting twice.
 */

/**
 * Static handler class for Item ActiveEffect operations.
 *
 * All methods are static and receive a context object containing the Item document. The Item sheet's
 * DEFAULT_OPTIONS.actions call them with the clicked control.
 */
export class ItemEffectsHandler {
  /**
   * Create a new ActiveEffect on the Item and open its configuration sheet.
   *
   * Creates an effect with these defaults:
   * - name: Localized "New" string
   * - img: Foundry's default aura.svg
   * - disabled: false (effect is active)
   * - transfer: true (effect applies to owning Actor when Item is owned)
   * - system.changes: [] (empty attribute modifications array)
   *
   * Automatically opens Foundry's ActiveEffectConfig sheet for immediate editing.
   * If creation fails, displays error notification and logs to console.
   *
   * @param {object} context - Sheet context object
   * @param {Item} context.item - The Item document to add the effect to
   * @param {Event} event - Click event from the create-effect button
   * @param {HTMLElement} _targetElement - Button that triggered the event
   * @returns {Promise<void>}
   */
  static async create(context, event, _targetElement) {
    event?.preventDefault?.();

    const { item } = context;
    if (!item) {
      return;
    }

    try {
      const [eff] = await item.createEmbeddedDocuments("ActiveEffect", [
        {
          name: game.i18n.localize("l5r4.ui.common.new"),
          img: "icons/svg/aura.svg",
          disabled: false,
          transfer: true,
          system: { changes: [] }
        }
      ]);

      if (eff) {
        new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
      }
    } catch (err) {
      console.error("L5R4 ItemEffectsHandler: Failed to create effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.createEffect"));
    }
  }

  /**
   * Open the configuration sheet for an existing ActiveEffect.
   *
   * Resolves the effect ID from the closest ancestor with [data-effect-id] attribute,
   * retrieves the effect from the Item's effects collection, and renders Foundry's
   * standard ActiveEffectConfig application.
   *
   * Silently fails if element lacks data-effect-id or effect is not found.
   *
   * @param {object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from the edit-effect button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {void}
   */
  static openEffectSheet(context, event, targetElement) {
    event?.preventDefault?.();

    const { item } = context;
    if (!item) {
      return;
    }

    const id = targetElement.closest("[data-effect-id]")?.dataset?.effectId;
    const eff = id ? item.effects.get(id) : null;

    if (eff) {
      new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
    }
  }

  /**
   * Toggle an ActiveEffect's disabled state.
   *
   * Flips the effect's disabled property between true/false. Disabled effects
   * remain on the Item but do not apply their attribute changes to the Actor.
   * Useful for temporary effects or situational modifiers the player can
   * enable/disable without deleting.
   *
   * If update fails, displays error notification and logs to console.
   *
   * @param {object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from the toggle-effect button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {Promise<void>}
   */
  static async updateEffectDisabled(context, event, targetElement) {
    event?.preventDefault?.();

    const { item } = context;
    if (!item) {
      return;
    }

    const id = targetElement.closest("[data-effect-id]")?.dataset?.effectId;
    const eff = id ? item.effects.get(id) : null;

    if (!eff) {
      return;
    }

    try {
      await eff.update({ disabled: !eff.disabled });
    } catch (err) {
      console.error("L5R4 ItemEffectsHandler: Failed to toggle effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.toggleEffect"));
    }
  }

  /**
   * Delete an ActiveEffect from the Item.
   *
   * Implements race condition protection via data-busy flag to prevent double-deletion
   * when user rapidly clicks delete button. The busy flag is always cleared in finally
   * block to ensure UI doesn't get stuck in busy state even if deletion fails.
   *
   * Error handling:
   * - Silently ignores "does not exist" errors (effect already deleted elsewhere)
   * - Logs other errors to console and shows user notification
   * - Always clears busy flag to prevent UI lockup.
   *
   * @param {object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from the delete-effect button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {Promise<void>}
   */
  static async deleteEffect(context, event, targetElement) {
    event?.preventDefault?.();

    const { item } = context;
    if (!item) {
      return;
    }

    const wrap = targetElement.closest("[data-effect-id]");
    const id = wrap?.dataset?.effectId;
    if (!id) {
      return;
    }

    // Prevent race condition: Skip if already processing a delete operation
    if (wrap.dataset.busy) {
      return;
    }
    wrap.dataset.busy = "1";

    try {
      const eff = item.effects.get(id);
      if (!eff) {
        return;
      } // Effect already deleted by another operation

      await eff.delete();
    } catch (err) {
      // Silently ignore "does not exist" errors - effect was deleted elsewhere (e.g., by another user in same session)
      if (String(err?.message || err).includes("does not exist")) {
        return;
      }

      console.error("L5R4 ItemEffectsHandler: Failed to delete effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.deleteEffect"));
    } finally {
      // Always clear busy flag to prevent UI lockup
      delete wrap.dataset.busy;
    }
  }
}
