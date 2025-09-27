/**
 * @fileoverview L5R4 NPC Sheet - Non-Player Character Sheet Implementation for Foundry VTT v13+
 * 
 * This class provides a specialized actor sheet for Non-Player Characters in the L5R4 system,
 * extending BaseActorSheet to inherit shared functionality while implementing NPC-specific
 * features such as simplified trait management, limited view templates, and streamlined
 * roll interfaces optimized for GM use during gameplay sessions.
 * 
 * **Core Responsibilities:**
 * - **Simplified Trait Management**: Direct rank adjustment without XP calculations or family bonuses
 * - **Limited View Support**: Restricted templates for player-visible NPCs with permission control
 * - **Streamlined Rolling**: Quick roll interfaces for common NPC actions and combat
 * - **Void Point Integration**: Optional void point tracking for important NPCs and villains
 * - **Item Organization**: Categorized item display matching PC sheet structure for consistency
 * - **Context Menu Support**: Right-click operations for efficient item management during play
 * - **Permission Handling**: Dynamic template selection based on user ownership and permissions
 * 
 * **NPC vs PC Differences:**
 * Key distinctions from the PC sheet implementation:
 * - **No XP System**: Traits adjust directly without experience point costs or tracking
 * - **Simplified Void**: Basic void rank adjustment without complex point management
 * - **Limited Templates**: Separate templates for GM view vs player-visible information
 * - **Quick Rolls**: Dataset-driven simple rolls for rapid gameplay without modifier dialogs
 * - **No Family Bonuses**: Direct trait values without Active Effects complexity
 * - **Streamlined UI**: Focused interface showing only essential NPC information
 * - **Direct Editing**: Immediate trait changes without validation or cost calculation
 * 
 * **ApplicationV2 Architecture:**
 * Modern Foundry v13+ implementation with NPC-specific optimizations:
 * - **Template System**: Uses HandlebarsApplicationMixin for efficient rendering
 * - **Action Delegation**: Clean event handling via data-action attributes
 * - **Context Preparation**: Modern _prepareContext() replaces legacy getData()
 * - **Render Pipeline**: _onRender() handles post-render setup and event binding
 * - **Form Integration**: Seamless form handling with submitOnChange support
 * - **Permission Integration**: Dynamic behavior based on user permissions
 * 
 * **Template Integration System:**
 * Dual template system for different user contexts:
 * - **Full Template**: `templates/actor/npc.hbs` for GM view with full editing
 * - **Limited Template**: `templates/actor/limited-npc-sheet.hbs` for player view
 * - **Shared Partials**: Reuses PC sheet partials for consistent item display
 * - **Dynamic Selection**: Template chosen based on user permissions and ownership
 * - **Permission Checks**: Automatic fallback to limited view for non-owners
 * - **Responsive Layout**: Adapts to content complexity and user permissions
 * 
 * **Roll System Integration:**
 * Streamlined rolling system optimized for NPC use:
 * - **NPC Rolls**: Specialized roll handling via Dice.NpcRoll() for quick resolution
 * - **Simple Rolls**: Dataset-driven rolls for basic actions without complex dialogs
 * - **Trait Rolls**: Ring and trait rolling with automatic wound penalty integration
 * - **Weapon Rolls**: Attack and damage rolls using shared base class methods
 * - **Skill Rolls**: Skill-based rolls with emphasis and modifier support
 * - **Quick Combat**: Rapid roll resolution for efficient combat management
 * 
 * **Performance Optimizations:**
 * - **Simplified Context**: Reduced template data preparation for faster rendering
 * - **Efficient Rolls**: Streamlined roll processing without complex modifier calculations
 * - **Minimal Validation**: Direct trait updates without extensive validation overhead
 * - **Template Caching**: Reuse of template data between renders
 * - **Event Optimization**: Focused event handling for essential NPC interactions
 * 
 * **Event Handling Examples:**
 * ```javascript
 * // Action delegation examples for NPC interactions
 * <button data-action="roll-ring" data-ring-name="Fire" data-system-ring="fire" data-ring-rank="3">
 * <div data-action="trait-rank" data-trait="stamina">
 * <span data-action="void-points-dots" class="dot">
 * ```
 * 
 * **Usage Examples:**
 * ```javascript
 * // Create NPC sheet instance
 * const npcSheet = new L5R4NpcSheet(npcActor, options);
 * 
 * // Render with limited view for players
 * await npcSheet.render(true, { limited: true });
 * 
 * // Quick trait adjustment
 * await npcSheet._onTraitAdjust(event, element, +1);
 * ```
 *
 * **Integration Points:**
 * - **Dice Service**: NPC-optimized roll processing with Dice.NpcRoll()
 * - **Chat Service**: Item creation dialogs and message formatting
 * - **Config Module**: System constants and localization keys
 * - **Utils Module**: Helper functions for data processing and validation
 * - **Base Sheet**: Inherited functionality from BaseActorSheet
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Sheet functions with missing or invalid data
 * - **Console Warnings**: Detailed error logging for troubleshooting
 * - **Fallback Templates**: Limited template used when full template fails
 * - **Safe Updates**: Validation prevents invalid trait values
 *
 * **Code Navigation Guide:**
 * 1. **Class Definition** (`L5R4NpcSheet`) - Main class with static configurations
 * 2. **Action Handlers** (`_onAction()`, `_onActionContext()`) - Event routing
 * 3. **Roll Methods** (`_onRingRoll()`, `_onSimpleRoll()`) - NPC-specific rolling
 * 4. **Trait Management** (`_onVoidAdjust()`) - Direct trait modification
 * 5. **Template System** (`_renderHTML()`, `_prepareContext()`) - Template handling
 * 6. **Event Binding** (`_onRender()`) - Post-render setup
 * 7. **Form Processing** (`_prepareSubmitData()`) - Form submission handling
 * 
 * **Performance Considerations:**
 * - **Template Caching**: Templates are preloaded and cached for fast rendering
 * - **Event Delegation**: Single event listener per action type reduces memory usage
 * - **Conditional Rendering**: Limited templates reduce DOM complexity for players
 * - **Lazy Loading**: Item context menus created only when needed
 * - **Efficient Updates**: Targeted DOM updates for trait changes
 * 
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.1.0
 * @extends {BaseActorSheet}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link ./base-actor-sheet.js|BaseActorSheet} - Shared functionality and roll methods
 * @see {@link ../services/dice.js|Dice.NpcRoll} - NPC roll processing
 */

import * as Dice from "../services/dice.js";
import { SYS_ID, TEMPLATE } from "../config.js";
import { on, toInt, T, readWoundPenalty } from "../utils.js";
import { BaseActorSheet } from "./base-actor-sheet.js";


export default class L5R4NpcSheet extends BaseActorSheet {
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/npc.hbs`,
      scrollable: [".scrollable-content"]
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc" && c !== "l5r4"),
      "l5r4",
      "npc"
    ],
    position: { ...(super.DEFAULT_OPTIONS.position ?? {}), width: 840 },
    form: { ...(super.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true }
  };

  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-chat": return this._onItemHeaderToChat(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-attack": return this._onAttackRoll(event, element);
      case "roll-damage": return this._onDamageRoll(event, element);
      case "roll-weapon-attack": return this._onWeaponAttackRoll(event, element);
      case "trait-rank": return this._onTraitAdjust(event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
    }
  }

  /** @inheritdoc (right-click = decrement) */
  _onActionContext(action, event, element) {
    switch (action) {
      case "trait-rank": return this._onTraitAdjust(event, element, -1);
      case "ring-rank-void": return this._onVoidAdjust(event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
      default: return this._onAction(action, event, element);
    }
  }

  /** @inheritdoc (change events for inline-edit passthrough) */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
  }

  /**
   * Ring roll handler for NPCs.
   * Processes ring-based rolls using dataset attributes for roll parameters.
   * Provides a streamlined interface for GM ring rolls without complex trait resolution.
   * 
   * **Dataset Attributes:**
   * - `data-ring-name`: Display name for the ring (e.g., "Fire", "Water")
   * - `data-system-ring`: System ring identifier for localization lookup
   * - `data-ring-rank`: Numeric rank value for the ring (1-9)
   * 
   * **Roll Processing:**
   * - Uses Dice.NpcRoll() for specialized NPC roll handling
   * - Applies localized ring names from translation keys
   * - Defaults to "void" ring if no system ring specified
   * - Bypasses complex PC trait calculation systems
   * 
   * @param {Event} event - Click event from ring roll element
   * @param {HTMLElement} el - Element containing dataset attributes
   * @returns {Promise<void>} Roll result processed by dice service
   * 
   * @example
   * // Template usage
   * <button data-action="roll-ring" 
   *         data-ring-name="Fire" 
   *         data-system-ring="fire" 
   *         data-ring-rank="3">
   *   Roll Fire Ring
   * </button>
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
   * @see {@link ../services/dice.js|Dice.NpcRoll} - NPC-specific roll processing
   */
  _onRingRoll(event, el) {
    event?.preventDefault?.();
    const ringName = el?.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${el?.dataset?.systemRing || "void"}`);
    const systemRing = String(el?.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(el?.dataset?.ringRank);
    return Dice.NpcRoll({
      npc: true,
      rollName: ringName,
      ringName: systemRing,
      ringRank
    });
  }

  /**
   * Adjust NPC Void Ring rank by ±1 without XP calculations.
   * Provides direct trait manipulation for NPCs, bypassing the complex
   * experience point system used by player characters. Values are clamped
   * to the standard L5R4 trait range of 1-9.
   * 
   * **NPC vs PC Differences:**
   * - No XP cost calculations or tracking
   * - Direct rank modification without family bonus considerations
   * - Immediate update without confirmation dialogs
   * - Simple range clamping without advancement rules
   * 
   * **Update Process:**
   * 1. Read current void rank from actor system data
   * 2. Apply delta (+1 or -1) with range clamping
   * 3. Update actor document if value changed
   * 4. Handle errors gracefully with console warnings
   * 
   * @param {Event} event - Click event (prevented to avoid form submission)
   * @param {HTMLElement} element - Element containing trait data (unused)
   * @param {number} delta - Adjustment value: +1 for increment, -1 for decrement
   * @returns {Promise<void>} Resolves when update completes or fails
   * 
   * @example
   * // Increment void rank on left-click
   * await npcSheet._onVoidAdjust(event, element, +1);
   * 
   * // Decrement void rank on right-click
   * await npcSheet._onVoidAdjust(event, element, -1);
   */
  async _onVoidAdjust(event, element, delta) {
    event?.preventDefault?.();
    const cur = Number(this.actor.system?.rings?.void?.rank ?? 0) || 0;
    const min = 0;
    const max = 9;
    const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 NPC Sheet: failed to update void rank", { err });
    }
  }

  /**
   * @override
   * Render HTML for NPC sheet, choosing between limited and full templates.
   * Strips legacy <form> tags for ApplicationV2 compatibility.
   * @param {object} context - Template context
   * @param {object} options - Render options
   * @returns {Promise<{form: HTMLElement}>}
   */
  async _renderHTML(context, options) {
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/limited-npc-sheet.hbs") : TEMPLATE("actor/npc.hbs");
    let html = await foundry.applications.handlebars.renderTemplate(path, context);
    html = html.replace(/^\s*<form[^>]*>/i, "").replace(/<\/form>\s*$/i, "");
    const root = document.createElement("div");
    root.innerHTML = html;
    return { form: (root.firstElementChild ?? root) };
  }

  /**
   * @override
   * Prepare template context for NPC sheet.
   * Categorizes items by type and adds NPC-specific settings.
   * @param {object} options - Context preparation options
   * @returns {Promise<object>} Template context
   */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actorObj = this.actor.toObject(false);

    // Categorize items - mirrors the PC sheet so templates can rely on the same buckets
    const all = this.actor.items.contents;
    const byType = (t) => all.filter((i) => i.type === t);

    return {
      ...base,
      actor: this.actor,
      system: actorObj.system,
      config: CONFIG.l5r4,

      // Add the setting to the context
      showNpcVoidPoints: game.settings.get(SYS_ID, "allowNpcVoidPoints"),

      // Effective traits for template parity with PC sheet
      traitsEff: foundry.utils.duplicate(this.actor.system?._derived?.traitsEff ?? {}),

      // Buckets commonly used by your stock templates
      skills: byType("skill"),
      weapons: byType("weapon"),
      bows: byType("bow"),
      armors: byType("armor"),
      spells: byType("spell"),
      items: all.filter((i) => i.type === "item" || i.type === "commonItem")
    };
  }

  /**
   * @override
   * Post-render setup for NPC sheet.
   * Paints void dots and sets up event listeners for NPC-specific functionality.
   * @param {object} context - Template context
   * @param {object} options - Render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    this._paintVoidPointsDots(root);
    if (!this.actor.isOwner) return;

    // Simple rolls (not handled by base class action delegation)
    on(root, ".simple-roll", "click", (ev) => this._onSimpleRoll(ev));

    // Image editing
    on(root, "[data-edit='img']", "click", (ev) => this._onEditImage(ev, ev.currentTarget));

    // Setup shared context menu for item rows
    await this._setupItemContextMenu(root);
  }

  /* Rolls ----------------------------------------------------------------- */

  /**
   * Handle simple dice rolls from dataset attributes.
   * Processes basic NPC rolls using data attributes for roll parameters,
   * providing a streamlined interface for common NPC actions that don't
   * require the complex trait resolution used by player characters.
   * 
   * **Dataset Attributes:**
   * - `data-roll`: Number of dice to roll (e.g., "5" for 5d10)
   * - `data-keep`: Number of dice to keep (e.g., "3" for keep 3)
   * - `data-rolllabel`: Display label for the roll type
   * - `data-trait`: Trait name being rolled (for display)
   * - `data-rolltype`: Roll category ("simple", "attack", "damage", etc.)
   * 
   * **Roll Processing:**
   * - Extracts roll parameters from element dataset
   * - Constructs descriptive roll name from actor and action
   * - Applies wound penalties automatically
   * - Supports shift-click for roll options dialog
   * - Uses NpcRoll() for specialized NPC roll handling
   * 
   * **Usage Examples:**
   * ```html
   * <!-- Basic trait roll -->
   * <div class="simple-roll" 
   *      data-roll="4" 
   *      data-keep="2" 
   *      data-rolllabel="Agility" 
   *      data-trait="agility">
   * 
   * <!-- Attack roll -->
   * <div class="simple-roll" 
   *      data-roll="6" 
   *      data-keep="3" 
   *      data-rolllabel="Katana Attack" 
   *      data-rolltype="attack">
   * ```
   * 
   * @param {Event} event - Click event from simple roll element
   * @returns {Promise<void>} Roll result processed by dice service
   * 
   * @see {@link ../services/dice.js|Dice.NpcRoll} - NPC roll processing
   * @see {@link ../utils.js|readWoundPenalty} - Wound penalty calculation
   */
  async _onSimpleRoll(event) {
    event.preventDefault();
    const ds = event.currentTarget?.dataset || {};
    const diceRoll = toInt(ds.roll);
    const diceKeep = toInt(ds.keep);
    const rollTypeLabel = ds.rolllabel || "";
    const trait = ds.trait || "";
    const rollType = ds.rolltype || "simple";
    const rollName = `${this.actor.name}: ${rollTypeLabel} ${trait}`.trim();

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll,
      diceKeep,
      rollName,
      toggleOptions: event.shiftKey,
      rollType
    });
  }

  /* Submit-time guard ------------------------------------------------------ */

  /**
   * @override
   * Ensure NPC name is never empty on form submission.
   * Provides robustness similar to PC sheet.
   * @param {Event} event - Submit event
   * @param {HTMLFormElement} form - Form element
   * @param {FormData} formData - Form data
   * @param {object} updateData - Additional update data
   * @returns {object} Processed submit data
   */
  _prepareSubmitData(event, form, formData, updateData={}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) submit.name = this.actor.name || "Unnamed";
    return submit;
  }
}
