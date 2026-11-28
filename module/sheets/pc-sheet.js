/**
 * @module sheets/pc-sheet
 * @description The player character sheet. On top of BaseActorSheet it routes the PC's actions to the handlers
 * (PcAdjustmentHandler for spell slots and rank tracks; PcTraitHandler for Traits; TraitHandler for the Void Ring;
 * AppLauncherHandler for the configuration windows; StanceHandler; PcRollHandler; PcActionsHandler), builds the
 * sorted item lists and Mastery Abilities through PcContextBuilder, and shows a limited view (pc-limited.hbs) to a
 * player who does not own the character.
 */
import { SYS_ID } from "../config/constants.js";
import { STANCES } from "../config/localization.js";
import { F } from "../utils/localization.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";
import { effectsOf } from "../services/effects/apply.js";
import { openLedgerDialog } from "../services/ledger.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { PcTraitHandler } from "./handlers/pc-trait-handler.js";
import { PcContextBuilder } from "./pc-context-builder.js";
import { PcRollHandler } from "./handlers/pc-roll-handler.js";
import { PcActionsHandler } from "./handlers/pc-actions-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";
import { TraitHandler } from "./handlers/trait-handler.js";

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
   * The PC sheet's click actions: the shared ones (BaseActorSheet.CLICK_ACTIONS) and the PC's own, the Ring roll,
   * rank points, Traits with the family bonus, the Void Point uses, the PC's windows, and the GM's recalculation and
   * Insight Rank mode.
   *
   * @type {Readonly<Record<string, function(L5R4PcSheet, Event, HTMLElement): unknown>>}
   */
  static CLICK_ACTIONS = Object.freeze({
    ...super.CLICK_ACTIONS,
    "roll-ring": (sheet, event, element) =>
      PcRollHandler.rollClickedRing(sheet._getHandlerContext(), event, element),
    "adjust-rank-points": (sheet, event, element) =>
      PcAdjustmentHandler.updateRankPoints(sheet._getHandlerContext(), event, element, +0.1),
    "adjust-trait": (sheet, event, element) =>
      PcTraitHandler.updateTraitRank(sheet._getHandlerContext(), event, element, +1),
    "increase-trait": (sheet, event, element) =>
      PcTraitHandler.updateTraitRankUp(sheet._getHandlerContext(), event, element),
    "decrease-trait": (sheet, event, element) =>
      PcTraitHandler.updateTraitRankDown(sheet._getHandlerContext(), event, element),
    "toggle-armor-void": (sheet, event, element) =>
      PcActionsHandler.updateArmorVoid(sheet._getHandlerContext(), event, element),
    "toggle-initiative-void": (sheet, event, element) =>
      PcActionsHandler.updateInitiativeVoid(sheet._getHandlerContext(), event, element),
    "open-armor-config": (sheet, event, element) =>
      AppLauncherHandler.openArmorConfig(sheet._getHandlerContext(), event, element),
    "open-xp-manager": (sheet, event, element) =>
      AppLauncherHandler.openXpManager(sheet._getHandlerContext(), event, element),
    "open-wealth-manager": (sheet, event, element) =>
      AppLauncherHandler.openWealthManager(sheet._getHandlerContext(), event, element),
    "open-ledger": sheet => openLedgerDialog(sheet.actor),
    "recalculate-sheet": (sheet, event, element) => sheet._onRecalcSheet(event, element),
    "toggle-rank-mode": (sheet, event, element) =>
      PcActionsHandler.updateRankMode(sheet._getHandlerContext(), event, element)
  });

  /**
   * Prepares template context data for PC sheet rendering.
   *
   * Builds comprehensive context object with:
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

    const all = actorObj.items.contents ?? actorObj.items;
    const sortedItems = PcContextBuilder.buildSortedItems(actorObj, all);

    const context = {
      ...base,
      actor: this.actor,
      system: foundry.utils.deepClone(actorObj.system),
      ...PcContextBuilder.buildBioFields(all),
      editable: this.isEditable,
      // The Insight Rank's computed or typed switch shows to a GM only
      isGM: game.user.isGM,
      ...buildStatusFields(actorObj),
      // Lazy getter: Defers expensive sorting until template accesses property
      get advDisList() {
        return PcContextBuilder.buildAdvDisList(
          actorObj,
          sortedItems.advantages,
          sortedItems.disadvantages
        );
      },
      ...sortedItems,
      masteries: PcContextBuilder.buildMasteryList(sortedItems.skills)
    };

    prepareItemSheetOptions(context);
    context.config.stances = STANCES;
    return context;
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
    switch (action) {
      case "update-item-field":
        return this._onInlineItemEdit(event, element);
      case "apply-stance":
        return StanceHandler.applyStance(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Handles manual sheet recalculation for testing purposes.
   *
   * The recalculate button after the Name field triggers a full actor data preparation
   * cycle and sheet re-render. Useful for debugging data preparation issues or
   * verifying that derived values update correctly.
   *
   * **What It Does:**
   * 1. Calls actor.reset() to rebuild data from storage and recalculate derived values once
   *    (a bare prepareData() on a prepared actor would apply its Active Effects a second time)
   * 2. Re-renders the sheet to display updated values
   * 3. Shows notification confirming recalculation
   *
   * **Use Cases:**
   * - Testing trait/ring calculations after rest
   * - Verifying wound threshold updates
   * - Debugging derived data issues
   * - Forcing refresh after manual data edits.
   *
   * @param {Event} event - Click event on the recalculate button
   * @param {HTMLElement} _element - The recalculate button (unused)
   * @returns {Promise<void>}
   */
  async _onRecalcSheet(event, _element) {
    event?.preventDefault?.();

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
}

/**
 * The character's state the sheet shows: effective Traits, stance, Void for Armor TN, and the collapsed sections.
 * @param {Actor} actorObj
 * @returns {object}
 */
function buildStatusFields(actorObj) {
  return {
    traitsEff: PcContextBuilder.getEffectiveTraits(actorObj),
    currentStance: PcContextBuilder.getStance(actorObj),
    voidArmor: effectsOf(actorObj, "voidArmor").length > 0,
    collapsedSections: PcContextBuilder.getCollapsedSections(actorObj.id)
  };
}
