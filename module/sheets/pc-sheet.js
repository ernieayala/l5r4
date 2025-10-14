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
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Implements event delegation via data-action attributes
 * - Custom window header button for edit mode toggle (is-editable class)
 * - Limited view rendering for non-owner players (pc-limited.hbs template)
 * - Integrates with enhanceItemSheetData for unified item context
 * 
 * **Foundry APIs:** ActorSheetV2, HandlebarsApplicationMixin, TextEditor.enrichHTML
 * **Requires:** Foundry v13+
 * 
 * @extends {BaseActorSheet}
 */

import { SYS_ID } from "../config/constants.js";
import { TEMPLATE } from "../config/templates.js";
import { STANCES } from "../config/localization.js";
import { enhanceItemSheetData } from "../documents/item/integration/sheet-data.js";
import { T } from "../utils/localization.js";
import { on } from "../utils/dom.js";
import { toInt } from "../utils/type-coercion.js";
import { readWoundPenalty } from "../utils/mechanics.js";
import { RingRoll } from "../services/dice/rolls/ring-roll.js";
import { WeaponRoll } from "../services/dice/rolls/weapon-roll.js";
import { getStanceDamageBonuses } from "../services/stance/rolls/attack-bonuses.js";
import { getActiveStances } from "../services/stance/core/helpers.js";
import { getMountedStatus } from "../services/mounted-combat.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { BioItemHandler } from "./handlers/bio-item-handler.js";
import { PcTraitHandler } from "./handlers/pc-trait-handler.js";
import { PcContextBuilder } from "./handlers/pc-context-builder.js";
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
 * - Edit mode toggle via custom window header button
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
      case "clan-link": return BioItemHandler.openLinked(this.actor, "clan");
      case "family-open": return BioItemHandler.openLinked(this.actor, "family");
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-chat": return this._onItemHeaderToChat(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-sort-by": return this._onUnifiedSortClick(event, element);
      case "ring-rank-void": return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-weapon": return this._onWeaponRoll(event, element);
      case "roll-weapon-attack": return this._onWeaponAttackRoll(event, element);
      case "rp-step": return PcAdjustmentHandler.adjustRankPoints(this._getHandlerContext(), event, element, +0.1);
      case "school-link": return BioItemHandler.openLinked(this.actor, "school");
      case "section-expand": return PcAdjustmentHandler.toggleSection(this._getHandlerContext(), event, element);
      case "spell-slot": return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, +1);
      case "trait-rank": return PcTraitHandler.adjust(this._getHandlerContext(), event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
      case "wound-config": return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
      case "xp-modal": return AppLauncherHandler.openXpManager(this._getHandlerContext(), event, element);
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
      case "ring-rank-void": return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, -1);
      case "rp-step": return PcAdjustmentHandler.adjustRankPoints(this._getHandlerContext(), event, element, -0.1);
      case "spell-slot": return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, -1);
      case "trait-rank": return PcTraitHandler.adjust(this._getHandlerContext(), event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
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
   * Sheet has submitOnChange:true, so most form changes trigger actor updates
   * automatically via _prepareSubmitData. These handlers provide additional
   * processing or validation before submission.
   * 
   * @param {string} action - The data-action attribute value from changed element
   * @param {Event} event - The change event
   * @param {HTMLElement} element - The form element that changed
   * @protected
   * @override
   */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
    if (action === "change-stance") return StanceHandler.changeStance(this._getHandlerContext(), event, element);
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
    const ev = (event)?.originalEvent ?? event;
    if (!ev?.dataTransfer) return super._onDrop(event);

    const data = foundry.applications.ux.TextEditor.getDragEventData(ev);
    if (!data || data.type !== "Item") return super._onDrop(event);

    const itemDoc = await fromUuid(data.uuid ?? "");
    if (!itemDoc) return super._onDrop(event);

    const type = String(itemDoc.type);
    const BIO_TYPES = new Set(["clan", "family", "school"]);
    if (!BIO_TYPES.has(type)) {
      return super._onDropItem(event, data);
    }

    return BioItemHandler.handleDrop(this._getHandlerContext(), itemDoc);
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
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/pc-limited.hbs") : TEMPLATE("actor/pc.hbs");
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    const host = document.createElement("div");
    host.innerHTML = html;
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
      ...(BaseActorSheet.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc" && c !== "l5r4"),
      "l5r4",
      "pc"
    ],
    position: { ...(BaseActorSheet.DEFAULT_OPTIONS.position ?? {}), width: 870 },
    form: { ...(BaseActorSheet.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true, submitOnClose: true }
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
   * actually accesses the property. This avoids unnecessary computation when
   * rendering non-default tabs.
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
    if (typeof system.notes !== "string") system.notes = String(system.notes ?? "");
    const enrichedNotes = await TextEditor.enrichHTML(system.notes ?? "", {
      async: true,
      secrets: this.isEditable,
      documents: true,
      links: true
    });
  
    const all = actorObj.items.contents ?? actorObj.items;
    const byType = (t) => all.filter((i) => i.type === t);
    const sortedItems = PcContextBuilder.buildSortedItems(actorObj, all);
    const {
      skills, spells, advantages, disadvantages, items,
      katas, kihos, tattoos, techniques, armors, weapons, bows
    } = sortedItems;
    
    const masteries = PcContextBuilder.buildMasteryList(skills);
  
    const traitsEff = foundry.utils.duplicate(
      this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
    );
    if (!Object.keys(traitsEff).length) {
      console.warn(`${SYS_ID}`, "traitsEff missing in actor.system._derived; check prepareDerivedData()");
    }
  
    const bioClan   = byType("clan")[0]   ?? null;
    const bioFamily = byType("family")[0] ?? null;
    const bioSchool = byType("school")[0] ?? null;
  
    const activeStances = getActiveStances(actorObj);
    const currentStance = activeStances[0] || "";
    const mountedStatus = getMountedStatus(actorObj);
  
    const context = {
      ...base,
      actor: this.actor,
      system,
      bioClan,
      bioFamily,
      bioSchool,
      editable: this.isEditable,
      enriched: { notes: enrichedNotes },
      traitsEff,
      currentStance,
      mountedStatus,
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
   * 1. Injects custom edit mode toggle button into window header
   * 2. Paints Void Points dots based on current/max values
   * 3. Binds image edit click handler (non-delegated)
   * 4. Sets up item context menus
   * 
   * **Custom Header Button:**
   * Adds pen-to-square icon button to window controls that toggles "is-editable"
   * class on sheet element. This enables/disables editing mode without changing
   * Foundry permissions, useful for preventing accidental edits during play.
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

    // Inject custom edit mode toggle button into window header
    try {
      const appEl = root?.closest(".app.window-app");
      const controls = appEl?.querySelector(":scope > header.window-header .window-controls");
      if (controls) {

        controls.querySelectorAll(".l5r4-toggle-edit").forEach(n => n.remove());

        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("window-control", "l5r4-toggle-edit");
        btn.dataset.action = "toggle-is-editable";
        btn.dataset.tooltip = "Toggle Edit Mode";
        btn.setAttribute("aria-label", "Toggle Edit Mode");
        btn.innerHTML = `<i class="fas fa-pen-to-square"></i>`;
        btn.addEventListener("click", ev => {
          ev.preventDefault();
          try {
            this.element?.classList.toggle("is-editable");
          } catch (err) {
            console.warn(`${SYS_ID}`, "PC Sheet: toggle-is-editable failed", { err });
          }
        });

        controls.insertBefore(btn, controls.firstElementChild);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "PC Sheet: header control injection failed", { err });
    }

    // Paint Void Points dots based on current/max values
    this._paintVoidPointsDots(root);

    // Guard: Only bind non-delegated events once per root element
    if (this._boundExtraRoot === root) return;
    this._boundExtraRoot = root;
    if (!this.actor.isOwner) return;

    on(root, "[data-edit='img']", "click", (ev) => this._onEditImage(ev, ev.currentTarget));
    await this._setupItemContextMenu(root);
  }

  /**
   * Returns allowed sort column keys for a given item list scope.
   * 
   * Defines sortable columns for each item type displayed in PC sheet.
   * Used by SortHandler to validate user sort preferences and provide
   * column options in sort UI.
   * 
   * **Sort Columns by Type:**
   * - **armors**: name, bonus, reduction, equipped
   * - **weapons**: name, damage, size
   * - **items**: name only
   * - **skills**: name, rank, trait, roll, emphasis
   * - **spells**: name, ring, mastery, range, aoe, duration
   * - **techniques**: name only
   * - **katas**: name, ring, mastery
   * - **kihos**: name, ring, mastery, type
   * - **tattoos**: name only
   * - **advantages/disadvantages**: name, type, cost
   * - **advDis** (combined): name, type, cost, item
   * 
   * @param {string} scope - Sort scope identifier matching item type or list name
   * @returns {string[]} Array of allowed sort column keys
   * @protected
   * @override
   */
  _getAllowedSortKeys(scope) {
    const keys = {
      armors:       ["name","bonus","reduction","equipped"],
      weapons:      ["name","damage","size"],
      items:        ["name"],
      skills:       ["name","rank","trait","roll","emphasis"],
      spells:       ["name","ring","mastery","range","aoe","duration"],
      techniques:   ["name"],
      technique:    ["name"],
      katas:        ["name","ring","mastery"],
      kihos:        ["name","ring","mastery","type"],
      tattoos:      ["name"],
      advantages:   ["name","type","cost"],
      disadvantages:["name","type","cost"],
      advDis:       ["name","type","cost","item"]
    };
    return keys[scope] ?? ["name"];
  }

  /* ---------------------------------- */
  /* Rolls                               */
  /* ---------------------------------- */

  /**
   * Initiates a Ring roll (XkX where X = Ring rank).
   * 
   * **Game Rules Context:**
   * Ring rolls represent raw supernatural or elemental power checks:
   * - Spell resistance rolls (e.g., "Roll Earth to resist Shadowlands Taint")
   * - Void-based enlightenment checks
   * - Elemental attunement tests
   * 
   * Formula: XkX where both rolled and kept dice equal Ring rank.
   * Includes wound penalties per the Wound Penalty system.
   * 
   * **User Interaction:**
   * Shift+Click opens options dialog for raises, bonuses, and TN entry.
   * Normal click uses default ring value without modifications.
   * 
   * @param {Event} event - Click event (shift key triggers options dialog)
   * @param {HTMLElement} el - Element with dataset.ringRank and dataset.systemRing
   * @protected
   */
  _onRingRoll(event, el) {
    event.preventDefault();
    const ringName = el.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${el.dataset?.systemRing || "void"}`);
    const systemRing = String(el.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(el.dataset?.ringRank);

    RingRoll({
      ringRank,
      ringName,
      systemRing,
      askForOptions: event.shiftKey,
      actor: this.actor,
      woundPenalty: readWoundPenalty(this.actor)
    });
  }

  /**
   * Initiates a weapon damage roll.
   * 
   * **Game Rules Context:**
   * Weapon damage rolls determine wounds inflicted on successful hits:
   * - Formula: (Weapon DR + Strength)k(Keep) for melee weapons
   * - Dice explode on 10s (roll again and add, per core rules)
   * - Full Attack stance: +2k1 damage bonus (Fire Ring stance)
   * 
   * Full Attack Stance Bonus:
   * Characters in Full Attack stance gain +2k1 to damage rolls in addition to
   * the +2k1 attack bonus and -10 Armor TN penalty. This makes Full Attack a
   * high-risk, high-reward offensive posture.
   * 
   * **Implementation:**
   * Reads stance bonuses from actor.system via getStanceDamageBonuses service.
   * Appends stance bonus to description for chat display.
   * 
   * @param {Event} event - Click event (shift key triggers damage modifier dialog)
   * @param {HTMLElement} element - Element with data-item-id for weapon lookup
   * @protected
   */
  _onWeaponRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? this.actor.items.get(id) : null;
    if (!item) return;

    const baseDiceRoll = Number(item.system?.damageRoll ?? 0) || 0;
    const baseDiceKeep = Number(item.system?.damageKeep ?? 0) || 0;
    const stanceBonuses = getStanceDamageBonuses(this.actor);
    const diceRoll = baseDiceRoll + stanceBonuses.roll;
    const diceKeep = baseDiceKeep + stanceBonuses.keep;
    let description = item.system?.description || "";
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      const stanceLabel = T("l5r4.ui.mechanics.stances.fullAttack");
      description = description 
        ? `${description} (${stanceLabel}: ${bonusText})` 
        : `${stanceLabel}: ${bonusText}`;
    }

    return WeaponRoll({
      diceRoll,
      diceKeep,
      weaponName: item.name,
      description,
      askForOptions: event.shiftKey,
      actor: this.actor
    });
  }

  /* ---------------------------------- */
  /* Item CRUD                           */
  /* ---------------------------------- */

  /**
   * Handles inline editing of item properties directly in the sheet.
   * 
   * Allows quick edits of item fields (name, rank, cost, etc.) without opening
   * the full item sheet. Performs type coercion based on data-dtype attribute:
   * - **Integer**: Coerces to integer via toInt()
   * - **Number**: Coerces to float, defaults to 0 if invalid
   * - **Boolean**: Supports checkbox inputs and string boolean values
   * - **Default**: Coerces to string
   * 
   * **Form Integration:**
   * Works in conjunction with submitOnChange for seamless editing experience.
   * Type coercion ensures proper data types in Actor/Item system data.
   * 
   * @param {Event} event - Change event from form field
   * @param {HTMLElement} element - Form element with data-field and data-dtype
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el =  (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    let value = el.type === "checkbox" ? el.checked : el.value;
    const dtype = el.dataset.dtype ?? el.dataset.type;
    switch (dtype) {
      case "Integer": value = toInt(value, 0); break;
      case "Number":  value = Number.isFinite(+value) ? +value : 0; break;
      case "Boolean": value = el.type === "checkbox"
        ? !!value
        : ["true","1","on","yes"].includes(String(value).toLowerCase());
        break;
      default: value = String(value ?? "");
    }
    return this.actor.items.get(id)?.update({ [field]: value });
  }

  /* ---------------------------------- */
  /* Submit pipeline                     */
  /* ---------------------------------- */

  /**
   * Processes form data before submission to actor document.
   * 
   * Intercepts form submission to apply PC-specific data transformations:
   * - Trait value coercion and bounds checking via PcTraitHandler
   * - Conversion of string inputs to proper numeric types
   * - Validation of rank/points values
   * 
   * **Foundry Pattern:**
   * Part of Application v2 form handling pipeline. Called automatically when
   * submitOnChange triggers or user explicitly submits the form.
   * 
   * @param {Event} event - Form submit event
   * @param {HTMLFormElement} form - The form element being submitted
   * @param {FormDataExtended} formData - Foundry's extended FormData object
   * @param {Object} [updateData={}] - Pre-processed update data object
   * @returns {Object} Processed update data ready for Actor.update()
   * @protected
   * @override
   */
  _prepareSubmitData(event, form, formData, updateData = {}) {
    const data = super._prepareSubmitData(event, form, formData, updateData);
    return PcTraitHandler.convertSubmitData(this.actor, data);
  }
}
