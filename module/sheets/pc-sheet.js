/**
 * @module sheets/pc-sheet
 * @description The player character sheet. On top of BaseActorSheet it routes the PC's actions to the handlers
 * (PcAdjustmentHandler for spell slots and rank tracks; PcTraitHandler for Traits; TraitHandler for the Void Ring;
 * AppLauncherHandler for the configuration windows; StanceHandler; PcRollHandler and RollHandler; PcActionsHandler;
 * RestHandler), builds the sorted item lists and
 * Mastery Abilities through PcContextBuilder, enriches the notes with TextEditor.enrichHTML, and shows a limited view
 * (pc-limited.hbs) to a player who does not own the character.
 */
import { SYS_ID } from "../config/constants.js";
import { STANCES } from "../config/localization.js";
import { on } from "../utils/dom.js";
import { F } from "../utils/localization.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";
import { effectsOf } from "../services/effects/apply.js";
import { openLedgerDialog } from "../services/ledger.js";
import { activeItemIdsOf, updateActivation } from "../services/effects/activation.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { ItemCrudHandler } from "./handlers/item-crud-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { PcTraitHandler } from "./handlers/pc-trait-handler.js";
import { PcContextBuilder } from "./pc-context-builder.js";
import { PcRollHandler } from "./handlers/pc-roll-handler.js";
import { PcActionsHandler } from "./handlers/pc-actions-handler.js";
import { RestHandler } from "./handlers/rest-handler.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";
import { TraitHandler } from "./handlers/trait-handler.js";

const { TextEditor } = foundry.applications.ux;

/**
 * L5R4 Player Character Sheet
 *
 * Primary character sheet for PC actors. Provides comprehensive character management UI
 * including traits, skills, rings, items, spells, advantages/disadvantages, and advancement.
 *
 * **Key Features:**
 * - Sorted item lists with user-scoped sort preferences
 * - Calculated roll formulas (skills, weapons, rings) displayed in UI
 * - Full Attack stance integration with +2k1 attack bonuses
 * - Bio item (clan/family/school) drag-drop with linking
 * - XP Manager and Wound Configuration app launchers
 * - Void Points and spell slot adjustments
 * - Mastery ability tracking at ranks 3, 5, 7
 * - Limited view for non-owner players
 *
 * **Template Structure:**
 * Main template: `templates/actor/pc.hbs`
 * Limited template: `templates/actor/pc-limited.hbs`
 *
 * @class
 * @augments {BaseActorSheet}
 */
export default class L5R4PcSheet extends BaseActorSheet {
  /**
   * PC-specific options, merged over BaseActorSheet's by ApplicationV2: the "pc" class and an 870px width for the
   * PC columns.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    classes: ["pc"],
    position: { width: 870 }
  };

  /**
   * Application v2 part configuration.
   *
   * Single-part sheet with scrollable content area and auto-submit forms.
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/pc.hbs`,
      scrollable: [".scrollable-content"]
    }
  };

  /**
   * Tracks bound root element for extra event listeners.
   *
   * Used to prevent duplicate binding of non-delegated event listeners
   * (image edit click) during re-renders.
   *
   * @type {HTMLElement|null}
   */
  #boundExtraRoot = null;

  /**
   * Prepares template context data for PC sheet rendering.
   *
   * Builds comprehensive context object with:
   * - Enriched HTML (notes with @UUID, inline rolls)
   * - Sorted item collections (skills, spells, weapons, etc.) with roll formulas
   * - Bio items (clan, family, school)
   * - Effective traits (includes wound penalties)
   * - Stance and mounted status
   * - Mastery abilities list
   * - Lazy-loaded advantage/disadvantage combined list
   *
   * **Performance Optimization:**
   * Uses lazy getter for advDisList to defer expensive sorting until template
   * accesses the property. Avoids unnecessary computation when rendering
   * non-default tabs.
   *
   * **Game Mechanics:**
   * Effective traits from _derived include wound penalties per the Wound Penalty
   * system (Nicked: +3 TN, Grazed: +5 TN, Hurt: +10 TN, etc.). These feed into
   * skill and weapon roll formulas calculated by PcContextBuilder.
   *
   * @param {object} _options - Render options from Application v2 (unused)
   * @returns {Promise<object>} Template context with all sheet data
   * @override
   */
  async _prepareContext(_options) {
    const base = await super._prepareContext(_options);
    const actorObj = this.document;
    const system = foundry.utils.deepClone(actorObj.system ?? {});
    if (typeof system.notes !== "string") {
      system.notes = String(system.notes ?? "");
    }
    const enrichedNotes = await TextEditor.enrichHTML(system.notes ?? "", {
      async: true,
      secrets: this.isEditable,
      documents: true,
      links: true
    });

    const all = actorObj.items.contents ?? actorObj.items;
    const sortedItems = PcContextBuilder.buildSortedItems(actorObj, all);
    const {
      skills,
      spells,
      advantages,
      disadvantages,
      items,
      katas,
      kihos,
      tattoos,
      techniques,
      armors,
      weapons,
      bows
    } = sortedItems;

    const masteries = PcContextBuilder.buildMasteryList(skills);
    const traitsEff = PcContextBuilder.getEffectiveTraits(actorObj);
    const bioItems = PcContextBuilder.getBioItems(all);
    const currentStance = PcContextBuilder.getStance(actorObj);
    const collapsedSections = PcContextBuilder.getCollapsedSections(actorObj.id);

    const context = {
      ...base,
      actor: this.actor,
      system,
      bioClan: bioItems.clan,
      bioFamily: bioItems.family,
      bioSchool: bioItems.school,
      editable: this.isEditable,
      enriched: { notes: enrichedNotes },
      traitsEff,
      currentStance,
      voidArmor: effectsOf(actorObj, "voidArmor").length > 0,
      activeItemIds: activeItemIdsOf(actorObj),
      collapsedSections,
      // Lazy getter: Defers expensive sorting until template accesses property
      get advDisList() {
        return PcContextBuilder.buildAdvDisList(actorObj, advantages, disadvantages);
      },
      armors,
      bows,
      advantages,
      disadvantages,
      items,
      katas,
      kihos,
      skills,
      spells,
      tattoos,
      techniques,
      weapons,
      masteries
    };

    prepareItemSheetOptions(context);
    context.config.stances = STANCES;
    return context;
  }

  /**
   * Routes click events to appropriate action handlers.
   *
   * Implements Application v2 event delegation pattern by dispatching data-action
   * values to specialized handler methods or handler classes. Supports all PC-specific
   * interactions including:
   * - Item CRUD operations (create, edit, delete, expand)
   * - Roll actions (ring, skill, trait, weapon, weapon attack)
   * - Adjustments (Void Ring, spell slots, rank points, traits, Void Points)
   * - App launchers (XP Manager, Wound Config)
   * - UI toggles (section expand/collapse, inline editing, sorting)
   * - Stance changes
   *
   * **Implementation Note:**
   * Some actions delegate to base class methods (inherited from BaseActorSheet),
   * others to specialized PC handler classes (PcAdjustmentHandler, PcTraitHandler, etc.).
   *
   * @param {string} action - The data-action attribute value from clicked element
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked element with data-action attribute
   * @override
   */
  _onAction(action, event, element) {
    switch (action) {
      case "apply-healing":
        return RestHandler.applyHealing(this._getHandlerContext(), event, element);
      case "update-item-field":
        return this._onInlineItemEdit(event, element);
      case "post-item":
        return this._onItemHeaderToChat(event, element);
      case "create-item":
        return this._onItemCreate(event, element);
      case "delete-item":
        return this._onItemDelete(event, element);
      case "edit-item":
        return this._onItemEdit(event, element);
      case "expand-item":
        return this._onItemExpand(event, element);
      case "sort-items":
        return this._onUnifiedSortClick(event, element);
      case "adjust-void-ring":
        return TraitHandler.updateVoidRing(this._getHandlerContext(), event, element, +1);
      // The arrows step the Void Ring without Shift, like the Trait arrows (issue #30)
      case "increase-void-ring":
        return TraitHandler.updateVoidRing(
          this._getHandlerContext(),
          { preventDefault: () => event.preventDefault(), shiftKey: true },
          element,
          +1
        );
      case "decrease-void-ring":
        return TraitHandler.updateVoidRing(
          this._getHandlerContext(),
          { preventDefault: () => event.preventDefault(), shiftKey: true },
          element,
          -1
        );
      case "roll-ring":
        return PcRollHandler.rollClickedRing(this._getHandlerContext(), event, element);
      case "roll-skill":
        return this._onSkillRoll(event, element);
      case "roll-trait":
        return this._onTraitRoll(event, element);
      case "roll-weapon-damage":
        return PcRollHandler.rollWeaponDamage(this._getHandlerContext(), event, element);
      case "roll-weapon-attack":
        return this._onWeaponAttackRoll(event, element);
      case "cast-spell":
        return RollHandler.rollClickedSpellCast(this._getHandlerContext(), event, element);
      case "adjust-rank-points":
        return PcAdjustmentHandler.updateRankPoints(
          this._getHandlerContext(),
          event,
          element,
          +0.1
        );
      case "expand-section":
        return ItemCrudHandler.updateSectionCollapsed(this._getHandlerContext(), event, element);
      case "adjust-spell-slot":
        return PcAdjustmentHandler.updateSpellSlot(this._getHandlerContext(), event, element, +1);
      case "adjust-trait":
        return PcTraitHandler.updateTraitRank(this._getHandlerContext(), event, element, +1);
      case "increase-trait":
        return PcTraitHandler.updateTraitRankUp(this._getHandlerContext(), event, element);
      case "decrease-trait":
        return PcTraitHandler.updateTraitRankDown(this._getHandlerContext(), event, element);
      case "adjust-void-points":
        return this._onVoidPointsAdjust(event, element, +1);
      case "toggle-armor-void":
        return PcActionsHandler.updateArmorVoid(this._getHandlerContext(), event, element);
      case "toggle-initiative-void":
        return PcActionsHandler.updateInitiativeVoid(this._getHandlerContext(), event, element);
      case "toggle-movement-type":
        return StanceHandler.updateMovementType(this._getHandlerContext(), event);
      case "open-condition-manager":
        return AppLauncherHandler.openConditionManager(this._getHandlerContext(), event, element);
      case "open-combat-config":
        return AppLauncherHandler.openCombatConfig(this._getHandlerContext(), event, element);
      case "open-armor-config":
        return AppLauncherHandler.openArmorConfig(this._getHandlerContext(), event, element);
      case "open-wound-config":
        return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
      case "open-xp-manager":
        return AppLauncherHandler.openXpManager(this._getHandlerContext(), event, element);
      case "open-wealth-manager":
        return AppLauncherHandler.openWealthManager(this._getHandlerContext(), event, element);
      case "open-ledger":
        return openLedgerDialog(this.actor);
      case "toggle-activation": {
        const item = this.actor.items.get(element.closest("[data-item-id]")?.dataset.itemId);
        return item ? updateActivation(this.actor, item) : undefined;
      }
      case "recalculate-sheet":
        return this._onRecalcSheet(event, element);
      case "toggle-rank-mode":
        return PcActionsHandler.updateRankMode(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Routes right-click events to appropriate action handlers.
   *
   * Implements Application v2 contextmenu event delegation for modifier-based actions.
   * Right-click (or context menu) triggers decrement operations for adjustable values:
   * - Void Ring rank (-1)
   * - Spell slots (-1)
   * - Rank/points (-0.1)
   * - Trait ranks (-1)
   * - Void Points (-1)
   *
   * **User Interaction Pattern:**
   * Right-click decrements values; left-click increments.
   * All context actions still respect safety mechanisms (Shift+Click requirements).
   *
   * @param {string} action - The data-action attribute value from right-clicked element
   * @param {Event} event - The contextmenu event
   * @param {HTMLElement} element - The right-clicked element
   * @override
   */
  _onActionContext(action, event, element) {
    switch (action) {
      case "adjust-void-ring":
        return TraitHandler.updateVoidRing(this._getHandlerContext(), event, element, -1);
      case "adjust-rank-points":
        return PcAdjustmentHandler.updateRankPoints(
          this._getHandlerContext(),
          event,
          element,
          -0.1
        );
      case "adjust-spell-slot":
        return PcAdjustmentHandler.updateSpellSlot(this._getHandlerContext(), event, element, -1);
      case "adjust-trait":
        return PcTraitHandler.updateTraitRank(this._getHandlerContext(), event, element, -1);
      case "adjust-void-points":
        return this._onVoidPointsAdjust(event, element, -1);
    }
  }

  /**
   * Routes change events to appropriate action handlers.
   *
   * Implements Application v2 change event delegation for form field updates.
   * Handles:
   * - Inline item editing (skills, weapons, armor, etc.)
   * - Stance changes (dropdown selection)
   *
   * **Auto-Submit Behavior:**
   * Sheet has submitOnChange:true, so form changes trigger automatic actor updates.
   * Handlers provide additional processing or validation before submission.
   *
   * @param {string} action - The data-action attribute value from changed element
   * @param {Event} event - The change event
   * @param {HTMLElement} element - The form element that changed
   * @override
   */
  _onActionChange(action, event, element) {
    if (action === "update-item-field") {
      return this._onInlineItemEdit(event, element);
    }
    if (action === "apply-stance") {
      return StanceHandler.applyStance(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Handles manual sheet recalculation for testing purposes.
   *
   * **Testing Tool:**
   * Shift+Click on the character name label triggers a full actor data preparation
   * cycle and sheet re-render. Useful for debugging data preparation issues or
   * verifying that derived values update correctly.
   *
   * **What It Does:**
   * 1. Checks for Shift key (safety mechanism)
   * 2. Calls actor.reset() to rebuild data from storage and recalculate derived values once
   *    (a bare prepareData() on a prepared actor would apply its Active Effects a second time)
   * 3. Re-renders the sheet to display updated values
   * 4. Shows notification confirming recalculation
   *
   * **Use Cases:**
   * - Testing trait/ring calculations after rest
   * - Verifying wound threshold updates
   * - Debugging derived data issues
   * - Forcing refresh after manual data edits.
   *
   * @param {Event} event - Click event on name label
   * @param {HTMLElement} _element - Name label element (unused)
   * @returns {Promise<void>}
   */
  async _onRecalcSheet(event, _element) {
    event?.preventDefault?.();

    // Require Shift key to prevent accidental triggers
    if (!event?.shiftKey) {
      return;
    }

    // Rebuild from source and prepare once [src: client/documents/abstract/client-document.mjs:60-67]
    this.actor.reset();

    // Re-render sheet to show updated values
    this.render(false);

    // Notify user
    ui.notifications?.info(F("l5r4.ui.sheets.recalculated", { name: this.actor.name }));
  }

  /**
   * Renders the sheet's HTML with limited/full view logic.
   *
   * Selects between full character sheet (pc.hbs) and limited view (pc-limited.hbs)
   * based on ownership and GM status. Limited view shows only basic info for
   * non-owner players (respects Foundry's limited permission level).
   *
   * **Foundry Pattern:**
   * Custom _renderHTML implementation for Application v2 to support conditional
   * template selection. Returns object with named part keys matching PARTS config.
   *
   * @param {object} context - Template context from _prepareContext
   * @param {object} _options - Render options (unused)
   * @returns {Promise<object>} Object with 'form' property containing rendered HTML element
   * @override
   */
  async _renderHTML(context, _options) {
    const isLimited = !game.user.isGM && this.actor.limited;
    const path = isLimited
      ? `systems/${SYS_ID}/templates/actor/pc-limited.hbs`
      : `systems/${SYS_ID}/templates/actor/pc.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    // Both templates render one <form> root
    const form = foundry.utils.parseHTML(html);
    return { form };
  }

  /**
   * Post-render lifecycle hook for DOM manipulation and event binding.
   *
   * Performs PC-specific rendering tasks:
   * 1. Paints Void Points dots based on current/max values
   * 2. Binds image edit click handler (non-delegated)
   *
   * **Guard Logic:**
   * Tracks #boundExtraRoot to prevent duplicate event binding on re-renders.
   * Only binds events if actor is owned by current user.
   *
   * @param {object} context - Template context from _prepareContext
   * @param {object} options - Render options from Application v2
   * @returns {Promise<void>}
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    this._paintVoidPointsDots(root);

    // Guard: Only bind non-delegated events once per root element
    if (this.#boundExtraRoot === root) {
      return;
    }
    this.#boundExtraRoot = root;
    if (!this.actor.isOwner) {
      return;
    }

    on(root, "click", {
      selector: "[data-edit='img']",
      handler: ev => this._onEditImage(ev, ev.currentTarget)
    });
  }
}
