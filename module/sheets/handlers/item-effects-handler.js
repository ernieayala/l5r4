/**
 * Item Active Effects Handler
 *
 * Manages CRUD operations for ActiveEffects embedded on Item documents in Foundry VTT.
 * Implements event delegation pattern for Item sheets using Application v2 architecture.
 *
 * ActiveEffects in Foundry VTT modify document properties through attribute changes.
 * When embedded on Items with transfer:true, effects apply to the owning Actor.
 * This is commonly used for equipped armor, weapons with special properties, or
 * advantages/disadvantages that modify character statistics.
 *
 * Responsibilities:
 * - Bind delegated event listeners for effect UI actions (.effect-create, .effect-edit, etc.)
 * - Create new ActiveEffect documents with sensible defaults
 * - Open Foundry's ActiveEffectConfig sheet for editing
 * - Toggle effect enabled/disabled state
 * - Delete effects with race condition protection
 *
 * Requires Foundry VTT v13+ for foundry.applications.sheets.ActiveEffectConfig API.
 *
 * @module sheets/handlers/item-effects-handler
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ActiveEffect.html|ActiveEffect}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActiveEffectConfig.html|ActiveEffectConfig}
 */
import { on } from "../../utils/dom.js";

/**
 * Static handler class for Item ActiveEffect operations.
 *
 * All methods are static and receive a context object containing the Item document
 * and sheet root element. This pattern supports event delegation in Application v2
 * where handlers are invoked from delegated events on the sheet root.
 *
 * Typical usage in Item sheet _onRender:
 * ItemEffectsHandler.bind({ item: this.document, element: this.element });
 */
export class ItemEffectsHandler {
  /**
   * Bind delegated event listeners for ActiveEffect UI actions.
   *
   * Attaches click handlers to the sheet root element for:
   * - .effect-create: Create new effect and open config sheet
   * - .effect-edit: Open existing effect config sheet
   * - .effect-toggle: Toggle effect disabled state
   * - .effect-delete: Delete effect with confirmation
   *
   * Idempotent: Uses data-effects-bound flag to prevent duplicate bindings.
   * Safe to call multiple times (e.g., during sheet re-renders).
   *
   * @param {Object} context - Sheet context object
   * @param {Item} context.item - The Item document containing effects
   * @param {HTMLElement} context.element - Sheet root element for event delegation
   * @returns {void}
   */
  static bind(context) {
    const { item, element: root } = context;
    if (!root || !item) {
      return;
    }

    if (root.dataset.effectsBound === "1") {
      return;
    }
    root.dataset.effectsBound = "1";

    on(root, ".effect-create", "click", async ev => {
      await this.create(context, ev, ev.target);
    });

    on(root, ".effect-edit", "click", (ev, el) => {
      this.edit(context, ev, el);
    });

    on(root, ".effect-toggle", "click", async (ev, el) => {
      await this.toggle(context, ev, el);
    });

    on(root, ".effect-delete", "click", async (ev, el) => {
      await this.remove(context, ev, el);
    });
  }

  /**
   * Create a new ActiveEffect on the Item and open its configuration sheet.
   *
   * Creates an effect with these defaults:
   * - name: Localized "New" string
   * - icon: Foundry's default aura.svg
   * - disabled: false (effect is active)
   * - transfer: true (effect applies to owning Actor when Item is owned)
   * - changes: [] (empty attribute modifications array)
   *
   * Automatically opens Foundry's ActiveEffectConfig sheet for immediate editing.
   * If creation fails, displays error notification and logs to console.
   *
   * @param {Object} context - Sheet context object
   * @param {Item} context.item - The Item document to add the effect to
   * @param {Event} event - Click event from .effect-create button
   * @param {HTMLElement} targetElement - Button that triggered the event
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
          icon: "icons/svg/aura.svg",
          disabled: false,
          transfer: true,
          changes: []
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
   * @param {Object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from .effect-edit button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {void}
   */
  static edit(context, event, targetElement) {
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
   * @param {Object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from .effect-toggle button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {Promise<void>}
   */
  static async toggle(context, event, targetElement) {
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
   * - Always clears busy flag to prevent UI lockup
   *
   * @param {Object} context - Sheet context object
   * @param {Item} context.item - The Item document containing the effect
   * @param {Event} event - Click event from .effect-delete button
   * @param {HTMLElement} targetElement - Button that triggered the event
   * @returns {Promise<void>}
   */
  static async remove(context, event, targetElement) {
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
