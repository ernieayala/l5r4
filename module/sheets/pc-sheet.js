/**
 * L5R4 PC Character Sheet (Application v2)
 *
 * Primary character sheet for player characters in the Legend of the Five Rings 4th Edition
 * system. Extends BaseActorSheet to provide PC-specific UI, event handling, and context
 * preparation for character management.
 *
 * **Architecture:**
 * Uses handler delegation pattern where UI interactions route to specialized handler classes:
 * - PcAdjustmentHandler: Void Ring, spell slots, rank/points adjustments
 * - PcTraitHandler: Trait rank adjustments with Shift+Click safety
 * - BioItemHandler: Clan/family/school item drag-drop and linking
 * - AppLauncherHandler: XP Manager and Wound Configuration dialogs
 * - StanceHandler: Stance changes (Attack, Defense, Full Attack, Full Defense, Center)
 * - PcContextBuilder: Sorted item lists with roll formulas and mastery abilities
 *
 * **Game Mechanics Implemented:**
 * - Ring Rolls: XkX formula where X = Ring rank (raw ability checks)
 * - Skill Rolls: (Skill + Trait)k(Trait) via RollHandler in base class
 * - Weapon Attacks: (Skill + Agility)k(Agility) vs Armor TN (Reflexes × 5 + 5 + armor)
 * - Weapon Damage: (Weapon DR + Strength)k(Keep) with exploding d10s
 * - Full Attack Stance: +2k1 attack bonus, -10 Armor TN (Fire Ring stance)
 * - Void Points: Equal to Void Ring, spent for +1k1 roll bonus or damage reduction
 * - Void Ring Advancement: Unique ring with no traits, costs 6×next rank XP
 * - Mastery Abilities: Displayed at skill ranks 3, 5, 7 per core rules
 *
 * **Foundry Integration:**
 * - Extends ActorSheetV2 (Foundry v13+ Application v2 architecture)
 * - Uses HandlebarsApplicationMixin with PARTS configuration
 * - Overrides _renderHTML for limited/full template selection
 * - Implements event delegation via data-action attributes
 * - Limited view rendering for non-owner players (pc-limited.hbs template)
 * - Integrates with enhanceItemSheetData for unified item context
 *
 * **Foundry APIs:** ActorSheetV2, HandlebarsApplicationMixin, TextEditor.enrichHTML
 * **Requires:** Foundry v13+
 *
 * @extends {BaseActorSheet}
 */

// Config
import { SYS_ID } from "../config/constants.js";
import { TEMPLATE } from "../config/templates.js";
import { STANCES } from "../config/localization.js";
import { PC_SORT_KEYS } from "../config/sort-keys.js";

// Utils
import { on } from "../utils/dom.js";

// Documents
import { enhanceItemSheetData } from "../documents/item/integration/sheet-data.js";

// Local
import { BaseActorSheet } from "./base-actor-sheet.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { BioItemHandler } from "./handlers/bio-item-handler.js";
import { PcTraitHandler } from "./handlers/pc-trait-handler.js";
import { PcContextBuilder } from "./handlers/pc-context-builder.js";
import { PcRollHandler } from "./handlers/pc-roll-handler.js";
import { PcActionsHandler } from "./handlers/pc-actions-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";

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
 */
export default class L5R4PcSheet extends BaseActorSheet {
  /**
   * Tracks bound root element for extra event listeners.
   *
   * Used to prevent duplicate binding of non-delegated event listeners
   * (image edit click, context menus) during re-renders.
   *
   * @type {HTMLElement|null}
   * @private
   */
  _boundExtraRoot = null;

  /**
   * Application v2 part configuration.
   *
   * Defines sheet structure for Foundry v13 Application v2 architecture.
   * Single-part sheet with scrollable content area and auto-submit forms.
   *
   * **Foundry v13 Pattern:**
   * Static PARTS object replaces deprecated _getPartTemplates().
   *
   * @static
   * @type {Object}
   */
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/pc.hbs`,
      scrollable: [".scrollable-content"],
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /**
   * Routes click events to appropriate action handlers.
   *
   * Implements Application v2 event delegation pattern by dispatching data-action
   * values to specialized handler methods or handler classes. Supports all PC-specific
   * interactions including:
   * - Bio item linking (clan, family, school)
   * - Item CRUD operations (create, edit, delete, expand)
   * - Roll actions (ring, skill, trait, weapon, weapon attack)
   * - Adjustments (Void Ring, spell slots, rank points, traits, Void Points)
   * - App launchers (XP Manager, Wound Config)
   * - UI toggles (section expand/collapse, inline editing, sorting)
   * - Stance changes
   *
   * **Implementation Note:**
   * Some actions delegate to base class methods (inherited from BaseActorSheet),
   * others to specialized PC handler classes (PcAdjustmentHandler, BioItemHandler, etc.).
   *
   * @param {string} action - The data-action attribute value from clicked element
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked element with data-action attribute
   * @protected
   * @override
   */
  _onAction(action, event, element) {
    switch (action) {
      case "apply-healing":
        return PcActionsHandler.handleApplyHealing(this._getHandlerContext(), event, element);
      case "clan-link":
        return BioItemHandler.openLinked(this.actor, "clan");
      case "family-open":
        return BioItemHandler.openLinked(this.actor, "family");
      case "inline-edit":
        return this._onInlineItemEdit(event, element);
      case "item-chat":
        return this._onItemHeaderToChat(event, element);
      case "item-create":
        return this._onItemCreate(event, element);
      case "item-delete":
        return this._onItemDelete(event, element);
      case "item-edit":
        return this._onItemEdit(event, element);
      case "item-expand":
        return this._onItemExpand(event, element);
      case "item-sort-by":
        return this._onUnifiedSortClick(event, element);
      case "ring-rank-void":
        return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, +1);
      case "roll-ring":
        return PcRollHandler.handleRingRoll(this._getHandlerContext(), event, element);
      case "roll-skill":
        return this._onSkillRoll(event, element);
      case "roll-trait":
        return this._onTraitRoll(event, element);
      case "roll-weapon":
        return PcRollHandler.handleWeaponRoll(this._getHandlerContext(), event, element);
      case "roll-weapon-attack":
        return this._onWeaponAttackRoll(event, element);
      case "cast-spell":
        return PcRollHandler.handleCastSpell(this._getHandlerContext(), event, element);
      case "rp-step":
        return PcAdjustmentHandler.adjustRankPoints(
          this._getHandlerContext(),
          event,
          element,
          +0.1
        );
      case "school-link":
        return BioItemHandler.openLinked(this.actor, "school");
      case "section-expand":
        return PcAdjustmentHandler.toggleSection(this._getHandlerContext(), event, element);
      case "spell-slot":
        return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, +1);
      case "trait-rank":
        return PcTraitHandler.adjust(this._getHandlerContext(), event, element, +1);
      case "trait-increase":
        return PcTraitHandler.increase(this._getHandlerContext(), event, element);
      case "trait-decrease":
        return PcTraitHandler.decrease(this._getHandlerContext(), event, element);
      case "void-points-dots":
        return this._onVoidPointsAdjust(event, element, +1);
      case "toggle-armor-void":
        return PcActionsHandler.handleToggleArmorVoid(this._getHandlerContext(), event, element);
      case "toggle-initiative-void":
        return PcActionsHandler.handleToggleInitiativeVoid(
          this._getHandlerContext(),
          event,
          element
        );
      case "toggle-movement-type":
        return StanceHandler.toggleMovementType(this._getHandlerContext(), event);
      case "condition-manager":
        return AppLauncherHandler.openConditionManager(this._getHandlerContext(), event, element);
      case "combat-config":
        return AppLauncherHandler.openCombatConfig(this._getHandlerContext(), event, element);
      case "armor-config":
        return AppLauncherHandler.openArmorConfig(this._getHandlerContext(), event, element);
      case "wound-config":
        return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
      case "xp-modal":
        return AppLauncherHandler.openXpManager(this._getHandlerContext(), event, element);
      case "open-wealth-manager":
        return AppLauncherHandler.openWealthManager(this._getHandlerContext(), event, element);
      case "recalc-sheet":
        return this._onRecalcSheet(event, element);
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
   * Right-click typically decrements values, while left-click increments.
   * All context actions still respect safety mechanisms (Shift+Click requirements).
   *
   * @param {string} action - The data-action attribute value from right-clicked element
   * @param {Event} event - The contextmenu event
   * @param {HTMLElement} element - The right-clicked element
   * @protected
   * @override
   */
  _onActionContext(action, event, element) {
    switch (action) {
      case "ring-rank-void":
        return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, -1);
      case "rp-step":
        return PcAdjustmentHandler.adjustRankPoints(
          this._getHandlerContext(),
          event,
          element,
          -0.1
        );
      case "spell-slot":
        return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, -1);
      case "trait-rank":
        return PcTraitHandler.adjust(this._getHandlerContext(), event, element, -1);
      case "void-points-dots":
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
   * @protected
   * @override
   */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") {
      return this._onInlineItemEdit(event, element);
    }
    if (action === "change-stance") {
      return StanceHandler.changeStance(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Handles drop events with special bio item (clan/family/school) routing.
   *
   * **Game Rules Context:**
   * Bio items are special Item types that define character identity:
   * - **Clan**: Determines starting family options and clan-specific abilities
   * - **Family**: Grants +1 to a specific trait (e.g., Mirumoto → Agility +1)
   * - **School**: Defines techniques, starting skills, honor rank, and +1 trait
   *
   * Characters can only have one of each bio item type at a time. Dropping a new
   * bio item replaces the existing one (e.g., dropping Crane Clan removes Dragon Clan).
   *
   * **Implementation:**
   * Bio items route to BioItemHandler for replacement logic and trait recalculation.
   * All other item types delegate to base class for standard item creation.
   *
   * @param {DragEvent} event - Drop event from Foundry drag-drop system
   * @returns {Promise<void>}
   * @protected
   * @async
   * @override
   */
  async _onDrop(event) {
    const ev = event?.originalEvent ?? event;
    if (!ev?.dataTransfer) {
      return super._onDrop(event);
    }

    const data = foundry.applications.ux.TextEditor.getDragEventData(ev);
    if (!data || data.type !== "Item") {
      return super._onDrop(event);
    }

    const itemDoc = await fromUuid(data.uuid ?? "");
    if (!itemDoc) {
      return super._onDrop(event);
    }

    const type = String(itemDoc.type);
    const BIO_TYPES = new Set(["clan", "family", "school"]);
    if (!BIO_TYPES.has(type)) {
      return super._onDropItem(event, data);
    }

    return BioItemHandler.handleDrop(this._getHandlerContext(), itemDoc);
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
   * 2. Calls actor.prepareData() to recalculate all derived values
   * 3. Re-renders the sheet to display updated values
   * 4. Shows notification confirming recalculation
   *
   * **Use Cases:**
   * - Testing trait/ring calculations after rest
   * - Verifying wound threshold updates
   * - Debugging derived data issues
   * - Forcing refresh after manual data edits
   *
   * @param {Event} event - Click event on name label
   * @param {HTMLElement} _element - Name label element (unused)
   * @returns {Promise<void>}
   * @private
   */
  async _onRecalcSheet(event, _element) {
    event?.preventDefault?.();

    // Require Shift key to prevent accidental triggers
    if (!event?.shiftKey) {
      return;
    }

    console.log("L5R4 | Manual sheet recalculation triggered");

    // Force full data preparation
    this.actor.prepareData();

    // Re-render sheet to show updated values
    this.render(false);

    // Notify user
    ui.notifications?.info(`Sheet recalculated for ${this.actor.name}`);
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
   * @param {Object} context - Template context from _prepareContext
   * @param {Object} _options - Render options (unused)
   * @returns {Promise<Object>} Object with 'form' property containing rendered HTML element
   * @protected
   * @async
   * @override
   */
  async _renderHTML(context, _options) {
    const isLimited = !game.user.isGM && this.actor.limited;
    const path = isLimited ? TEMPLATE("actor/pc-limited.hbs") : TEMPLATE("actor/pc.hbs");
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    const host = document.createElement("div");
    host.innerHTML = html;
    // querySelector used here for template host parsing (temporary DOM, not live application)
    // This is a Foundry v13 pattern for extracting form element from rendered template string
    const form = host.querySelector("form") || host.firstElementChild || host;
    return { form };
  }

  /* ---------------------------------- */
  /* Options / Tabs                      */
  /* ---------------------------------- */

  /**
   * Default configuration options for PC sheet.
   *
   * Extends BaseActorSheet options with PC-specific settings:
   * - Width: 870px (wider than base to accommodate PC-specific columns)
   * - Classes: Adds "pc" class for styling specificity
   * - Form: Auto-submit on change and close for seamless editing
   *
   * **Foundry v13 Pattern:**
   * Static DEFAULT_OPTIONS replaces deprecated defaultOptions() getter.
   *
   * @static
   * @type {Object}
   */
  static DEFAULT_OPTIONS = {
    ...BaseActorSheet.DEFAULT_OPTIONS,
    classes: [
      ...(BaseActorSheet.DEFAULT_OPTIONS.classes ?? []).filter(
        c => c !== "pc" && c !== "npc" && c !== "l5r4"
      ),
      "l5r4",
      "pc"
    ],
    position: { ...(BaseActorSheet.DEFAULT_OPTIONS.position ?? {}), width: 870 },
    form: {
      ...(BaseActorSheet.DEFAULT_OPTIONS.form ?? {}),
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /* ---------------------------------- */
  /* Data Prep                           */
  /* ---------------------------------- */

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
   * @param {Object} _options - Render options from Application v2 (unused)
   * @returns {Promise<Object>} Template context with all sheet data
   * @protected
   * @async
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
    const traitsEff = PcContextBuilder.extractEffectiveTraits(actorObj);
    const bioItems = PcContextBuilder.extractBioItems(all);
    const { currentStance, mountedStatus } = PcContextBuilder.extractStanceAndMounted(actorObj);
    const collapsedSections = PcContextBuilder.extractCollapsedSections(actorObj.id);

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
      mountedStatus,
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

    enhanceItemSheetData(context);
    context.config.stances = STANCES;
    return context;
  }

  /**
   * Post-render lifecycle hook for DOM manipulation and event binding.
   *
   * Performs PC-specific rendering tasks:
   * 1. Paints Void Points dots based on current/max values
   * 2. Binds image edit click handler (non-delegated)
   * 3. Sets up item context menus
   *
   * **Guard Logic:**
   * Tracks _boundExtraRoot to prevent duplicate event binding on re-renders.
   * Only binds events if actor is owned by current user.
   *
   * @param {Object} context - Template context from _prepareContext
   * @param {Object} options - Render options from Application v2
   * @returns {Promise<void>}
   * @protected
   * @async
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!this._preparedOnce) {
      this.actor?.prepareData();
      this._preparedOnce = true;
    }

    this._paintVoidPointsDots(root);

    if (this._boundRoot === root) {
      return;
    }

    // Guard: Only bind non-delegated events once per root element
    if (this._boundExtraRoot === root) {
      return;
    }
    this._boundExtraRoot = root;
    if (!this.actor.isOwner) {
      return;
    }

    on(root, "[data-edit='img']", "click", ev => this._onEditImage(ev, ev.currentTarget));
  }

  /**
   * Returns allowed sort column keys for a given item list scope.
   *
   * Delegates to PC_SORT_KEYS configuration for sortable columns.
   * See config/sort-keys.js for complete list of supported columns by type.
   *
   * @param {string} scope - Sort scope identifier matching item type or list name
   * @returns {string[]} Array of allowed sort column keys
   * @protected
   * @override
   */
  _getAllowedSortKeys(scope) {
    return PC_SORT_KEYS[scope] ?? ["name"];
  }
}
