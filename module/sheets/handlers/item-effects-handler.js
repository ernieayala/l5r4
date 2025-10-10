/**
 * @fileoverview Item Effects Handler - L5R4 Active Effects Management for Item Sheets
 * 
 * Encapsulates Active Effects CRUD operations and event binding logic for item sheets.
 * Provides comprehensive effect management with safety checks and error handling.
 * 
 * **Responsibilities:**
 * - Bind all Active Effect event handlers to item sheet
 * - Create new Active Effects with transfer=true for actor application
 * - Edit existing effects via ActiveEffectConfig integration
 * - Toggle effect enabled/disabled state with visual feedback
 * - Delete effects with duplicate-click protection
 * 
 * **Integration:**
 * Used by L5R4ItemSheet via composition pattern. Methods are called with
 * explicit context object containing item, element, and sheet references.
 * 
 * **Safety Features:**
 * - Duplicate binding prevention via dataset flag
 * - Busy-state protection against double-click deletion
 * - Graceful error handling for missing effects
 * - Defensive null checks throughout
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActiveEffectConfig.html|ActiveEffectConfig}
 */

import { on } from "../../utils/dom.js";

/**
 * Item Effects Handler Class
 * Manages Active Effects CRUD operations for item sheets.
 */
export class ItemEffectsHandler {
  /**
   * Bind all Active Effects event handlers to the item sheet root element.
   * Prevents duplicate binding via dataset flag on the root element.
   * 
   * **Event Bindings:**
   * - `.effect-create` (click) → Create new effect
   * - `.effect-edit` (click) → Edit existing effect
   * - `.effect-toggle` (click) → Enable/disable effect
   * - `.effect-delete` (click) → Delete effect with safety
   * 
   * **Binding Prevention:**
   * Uses `data-effects-bound` flag on root element to prevent duplicate
   * event handlers across re-renders. Safe for Foundry v13+ DOM replacement.
   * 
   * @param {object} context - Sheet context
   * @param {Item} context.item - The item document with embedded effects
   * @param {HTMLElement} context.element - The sheet root element
   * @returns {void}
   */
  static bind(context) {
    const { item, element: root } = context;
    if (!root || !item) return;

    // Bind once per DOM element to prevent duplicate handlers
    if (root.dataset.effectsBound === "1") return;
    root.dataset.effectsBound = "1";

    // Create (transfer=true so it applies to the owning Actor)
    on(root, ".effect-create", "click", async (ev) => {
      await this.create(context, ev, ev.target);
    });

    // Edit
    on(root, ".effect-edit", "click", (ev, el) => {
      this.edit(context, ev, el);
    });

    // Enable/Disable
    on(root, ".effect-toggle", "click", async (ev, el) => {
      await this.toggle(context, ev, el);
    });

    // Delete (safe against double-fire)
    on(root, ".effect-delete", "click", async (ev, el) => {
      await this.remove(context, ev, el);
    });
  }

  /**
   * Create new Active Effect on the item with default configuration.
   * Opens ActiveEffectConfig sheet immediately after creation for user editing.
   * 
   * **Default Effect Settings:**
   * - `name`: Localized "New" label
   * - `icon`: Default aura icon
   * - `disabled`: false (enabled by default)
   * - `transfer`: true (applies to owning actor)
   * - `changes`: Empty array (user adds via config)
   * 
   * @param {object} context - Sheet context
   * @param {Item} context.item - The item document
   * @param {Event} event - The triggering click event
   * @param {HTMLElement} targetElement - The create button element
   * @returns {Promise<void>}
   */
  static async create(context, event, targetElement) {
    event?.preventDefault?.();
    
    const { item } = context;
    if (!item) return;

    try {
      const [eff] = await item.createEmbeddedDocuments("ActiveEffect", [{
        name: game.i18n.localize("l5r4.ui.common.new"),
        icon: "icons/svg/aura.svg",
        disabled: false,
        transfer: true,
        changes: []
      }]);
      
      // Open config sheet for immediate editing
      if (eff) {
        new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
      }
    } catch (err) {
      console.error("L5R4 ItemEffectsHandler: Failed to create effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.createEffect"));
    }
  }

  /**
   * Edit existing Active Effect by opening its ActiveEffectConfig sheet.
   * Finds effect by data-effect-id attribute on parent element.
   * 
   * **Element Structure:**
   * Button must be within element with `data-effect-id` attribute:
   * ```html
   * <li data-effect-id="{{effect.id}}">
   *   <a class="effect-edit">...</a>
   * </li>
   * ```
   * 
   * @param {object} context - Sheet context
   * @param {Item} context.item - The item document
   * @param {Event} event - The triggering click event
   * @param {HTMLElement} targetElement - The edit button element
   * @returns {void}
   */
  static edit(context, event, targetElement) {
    event?.preventDefault?.();
    
    const { item } = context;
    if (!item) return;

    const id = targetElement.closest("[data-effect-id]")?.dataset?.effectId;
    const eff = id ? item.effects.get(id) : null;
    
    if (eff) {
      new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
    }
  }

  /**
   * Toggle Active Effect enabled/disabled state.
   * Updates effect document and triggers re-render with new state.
   * 
   * **Visual Feedback:**
   * - Icon changes: fa-toggle-on ↔ fa-toggle-off
   * - Text indication: "(disabled)" appears when disabled
   * - Transfer effects: Automatically applies/removes from owning actor
   * 
   * @param {object} context - Sheet context
   * @param {Item} context.item - The item document
   * @param {Event} event - The triggering click event
   * @param {HTMLElement} targetElement - The toggle button element
   * @returns {Promise<void>}
   */
  static async toggle(context, event, targetElement) {
    event?.preventDefault?.();
    
    const { item } = context;
    if (!item) return;

    const id = targetElement.closest("[data-effect-id]")?.dataset?.effectId;
    const eff = id ? item.effects.get(id) : null;
    
    if (!eff) return;

    try {
      await eff.update({ disabled: !eff.disabled });
    } catch (err) {
      console.error("L5R4 ItemEffectsHandler: Failed to toggle effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.toggleEffect"));
    }
  }

  /**
   * Delete Active Effect with duplicate-click protection.
   * Uses busy flag on wrapper element to prevent concurrent deletion attempts.
   * 
   * **Safety Features:**
   * - Busy flag prevents double-click deletion
   * - Gracefully handles already-deleted effects
   * - Swallows "does not exist" errors from duplicate listeners
   * - Always cleans up busy flag in finally block
   * 
   * **Element Structure:**
   * Button must be within element with `data-effect-id` attribute:
   * ```html
   * <li data-effect-id="{{effect.id}}">
   *   <a class="effect-delete">...</a>
   * </li>
   * ```
   * 
   * @param {object} context - Sheet context
   * @param {Item} context.item - The item document
   * @param {Event} event - The triggering click event
   * @param {HTMLElement} targetElement - The delete button element
   * @returns {Promise<void>}
   */
  static async remove(context, event, targetElement) {
    event?.preventDefault?.();
    
    const { item } = context;
    if (!item) return;

    const wrap = targetElement.closest("[data-effect-id]");
    const id = wrap?.dataset?.effectId;
    if (!id) return;

    // Prevent double-click spam
    if (wrap.dataset.busy) return;
    wrap.dataset.busy = "1";

    try {
      const eff = item.effects.get(id);
      if (!eff) return; // Already deleted
      
      await eff.delete();
    } catch (err) {
      // Swallow the "does not exist" error from duplicate listener
      if (String(err?.message || err).includes("does not exist")) return;
      
      console.error("L5R4 ItemEffectsHandler: Failed to delete effect", err);
      ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.deleteEffect"));
    } finally {
      delete wrap.dataset.busy;
    }
  }
}
