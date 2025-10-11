/**
 * @fileoverview L5R4 PC Sheet - Player Character Sheet Implementation for Foundry VTT v13+
 * 
 * This class extends BaseActorSheet to provide comprehensive PC-specific functionality including
 * complex trait management with family bonuses, experience tracking, advanced item sorting,
 * bio item integration, and sophisticated character sheet interactions. Built for the Legend
 * of the Five Rings 4th Edition system with full L5R4 mechanics support.
 *
 * **Core Responsibilities:**
 * - **Complex Trait Management**: Advanced trait adjustment with family bonuses and XP calculation
 * - **Item Organization**: Sophisticated sorting and filtering for skills, spells, advantages
 * - **Experience Tracking**: Automatic XP calculation and logging for character advancement
 * - **Bio Item Integration**: Seamless drag/drop support for clan, family, and school items
 * - **Sheet Locking**: Toggle edit mode to prevent accidental changes during play
 * - **Void Point Management**: Interactive visual dot interface for void point tracking
 * - **Advanced UI Controls**: Custom header controls and context-sensitive interfaces
 *
 * **ApplicationV2 Architecture:**
 * Modern Foundry v13+ implementation with enhanced capabilities:
 * - **Template System**: Uses HandlebarsApplicationMixin for efficient template rendering
 * - **Context Preparation**: Replaces legacy getData() with modern _prepareContext()
 * - **Event Handling**: Replaces activateListeners() with _onRender() lifecycle
 * - **Action Delegation**: Clean event handling using data-action attributes
 * - **Header Controls**: Custom header controls for sheet locking and edit mode
 * - **Lifecycle Management**: Proper setup/teardown with memory management
 *
 * **Advanced Features:**
 * - **Family Bonus Integration**: Live family item references with Active Effects system
 * - **Sorting Preferences**: Per-user, per-actor sorting preferences for all item lists
 * - **Inline Editing**: Direct field editing with proper data type coercion
 * - **Context Menus**: Comprehensive right-click menus for item management
 * - **Mastery Tracking**: Automatic skill mastery display based on current ranks
 * - **XP Manager Integration**: Seamless integration with XP tracking application
 * - **Drag & Drop**: Full support for bio items and equipment organization
 *
 * **Trait System Architecture:**
 * PC traits use a sophisticated multi-layer system:
 * - **Base Traits**: Core values stored in system.traits.* (editable)
 * - **Family Bonuses**: Applied via Active Effects from family items
 * - **Effective Traits**: Final calculated values in prepareDerivedData()
 * - **Display Logic**: Sheet shows effective values but edits base values
 * - **XP Calculation**: Costs calculated based on effective rank increases
 * - **Validation**: Range checking and family bonus integration
 *
 * **Item Management System:**
 * - **Bio Items**: Clan, family, school items with special handling
 * - **Skills**: Complex skill system with emphases, masteries, and school bonuses
 * - **Spells**: Spell slot management with school and ring restrictions
 * - **Advantages/Disadvantages**: Cost tracking and XP integration
 * - **Equipment**: Weapons, armor, and gear with encumbrance tracking
 * - **Sorting**: User-customizable sorting for all item categories
 *
 * **Experience Point Integration:**
 * - **Automatic Tracking**: XP costs calculated for all character changes
 * - **Manual Adjustments**: GM tools for XP modifications
 * - **History Logging**: Complete audit trail of XP expenditures
 * - **Validation**: Prevents invalid XP expenditures
 * - **Manager Integration**: Seamless XP Manager application integration
 *
 * **Performance Optimizations:**
 * - **Lazy Loading**: Item lists rendered only when visible
 * - **Efficient Sorting**: Cached sort preferences with minimal recalculation
 * - **DOM Optimization**: Targeted updates for trait and void point changes
 * - **Template Caching**: Reuse of template data where possible
 * - **Event Delegation**: Minimal event listeners with efficient routing
 *
 * **Usage Examples:**
 * ```javascript
 * // Open PC sheet
 * const pc = game.actors.getName("Samurai Character");
 * pc.sheet.render(true);
 * 
 * // Adjust trait with family bonus handling
 * await pcSheet._onTraitAdjust(event, target);
 * 
 * // Toggle sheet lock
 * await pcSheet._onToggleLock();
 * ```
 *
 * **Code Navigation Guide:**
 * 1. **Context Preparation** (`_prepareContext()`) - Template data with sorting and bonuses
 * 2. **Event Binding** (`_onRender()`) - Post-render setup and event delegation
 * 3. **Trait Management** (`_onTraitAdjust()`) - Complex trait adjustment with family bonuses
 * 4. **Bio Items** (`_onDrop()`) - Clan/family/school drag/drop handling
 * 5. **Void Management** (`_onVoidAdjust()`) - Void ring rank adjustment
 * 6. **Spell Slots** (`_onSpellSlotAdjust()`) - Spell slot management
 * 7. **Visual Updates** (`_paintVoidPointsDots()`) - Void points dot rendering
 * 8. **Sorting** (`_onSortClick()`) - Item list sorting preference management
 * 9. **Family Bonuses** (FamilyBonusService) - Family bonus calculation from Active Effects
 * 10. **XP Integration** (various methods) - Experience point tracking and validation
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @extends {BaseActorSheet}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#getDragEventData|TextEditor.getDragEventData}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 */

import { SYS_ID } from "../config/constants.js";
import { TEMPLATE } from "../config/templates.js";
import { 
  ARROWS, 
  SIZES, 
  RINGS, 
  RINGS_WITH_NONE, 
  SPELL_RINGS, 
  SKILL_TRAITS, 
  NPC_TRAITS, 
  SKILL_TYPES, 
  ACTION_TYPES, 
  KIHO_TYPES, 
  ADVANTAGE_TYPES,
  STANCES 
} from "../config/localization.js";
import { NPC_NUMBER_WOUND_LVLS } from "../config/game-data.js";
import { T } from "../utils/localization.js";
import { getSortPref, setSortPref, sortWithPref } from "../utils/sorting.js";
import { on } from "../utils/dom.js";
import { toInt } from "../utils/type-coercion.js";
import { applyRankPointsDelta } from "../utils/advancement.js";
import { resolveWeaponSkillTrait, readWoundPenalty } from "../utils/mechanics.js";
import { RingRoll } from "../services/dice/rolls/ring-roll.js";
import { WeaponRoll } from "../services/dice/rolls/weapon-roll.js";
import { NpcRoll } from "../services/dice/rolls/npc-roll.js";
import { FamilyBonusService } from "../services/family-bonus-service.js";
import { getAllAttackBonuses, getStanceDamageBonuses } from "../services/stance/rolls/attack-bonuses.js";
import { getActiveStances } from "../services/stance/core/helpers.js";
import { getMountedStatus } from "../services/mounted-combat.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import XpManagerApplication from "../apps/xp-manager.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { BioItemHandler } from "./handlers/bio-item-handler.js";
import { PcTraitHandler } from "./handlers/pc-trait-handler.js";
import { PcContextBuilder } from "./handlers/pc-context-builder.js";
import { StanceHandler } from "./handlers/stance-handler.js";

/** Foundry UX TextEditor (for enrichHTML) — https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html */
const { TextEditor } = foundry.applications.ux;

/** Stable trait keys used by templates and derived math */
const TRAIT_KEYS = /** @type {const} */ (["sta","wil","str","per","ref","awa","agi","int"]);

// Sorting logic now handled by PcContextBuilder
// Family bonus calculations handled by FamilyBonusService

export default class L5R4PcSheet extends BaseActorSheet {
  /**
   * Track the DOM root we last bound listeners to.
   * Foundry v13 replaces the root on every render, so we must re-bind for each new root.
   * @private @type {HTMLElement|null}
   */
  _boundExtraRoot = null;

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


  /** @inheritdoc */
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
      case "item-roll": return this._onItemRoll(event, element);
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
      case "xp-add": return this._onXpAdd(event);
      case "xp-log": return this._onXpLog(event);
      case "xp-modal": return this._onXpModal(event);
    }
  }

  /** @inheritdoc */
  _onActionContext(action, event, element) {
    switch (action) {
      case "ring-rank-void": return PcAdjustmentHandler.adjustVoidRing(this._getHandlerContext(), event, element, -1);
      case "rp-step": return PcAdjustmentHandler.adjustRankPoints(this._getHandlerContext(), event, element, -0.1);
      case "spell-slot": return PcAdjustmentHandler.adjustSpellSlot(this._getHandlerContext(), event, element, -1);
      case "trait-rank": return PcTraitHandler.adjust(this._getHandlerContext(), event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
    }
  }

  /** @inheritdoc */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
    if (action === "change-stance") return StanceHandler.changeStance(this._getHandlerContext(), event, element);
  }

  /**
   * @override
   * Handle clan/family/school drops using BioItemHandler.
   * For all other items, delegate to the base class implementation.
   */
  async _onDrop(event) {
    const ev = /** @type {{originalEvent?: DragEvent}} */(event)?.originalEvent ?? event;
    if (!ev?.dataTransfer) return super._onDrop(event);

    const data = foundry.applications.ux.TextEditor.getDragEventData(ev);
    if (!data || data.type !== "Item") return super._onDrop(event);

    const itemDoc = await fromUuid(data.uuid ?? "");
    if (!itemDoc) return super._onDrop(event);

    const type = String(itemDoc.type);
    const BIO_TYPES = new Set(["clan", "family", "school"]);
    if (!BIO_TYPES.has(type)) {
      // For non-bio items, use the base class implementation
      return super._onDropItem(event, data);
    }

    // Delegate bio item handling to BioItemHandler
    return BioItemHandler.handleDrop(this._getHandlerContext(), itemDoc);
  }



  /**
   * @override
   * Render HTML for PC sheet, choosing between limited and full templates.
   * @param {object} context - Template context
   * @param {object} _options - Render options (unused)
   * @returns {Promise<{form: HTMLElement}>}
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

  /** @override */
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
   * @override
   * Prepare the context passed to the Handlebars template.
   * Handles complex PC-specific data like sorted items, effective traits, and family bonuses.
   * @param {object} _options - Context preparation options (unused)
   * @returns {Promise<object>} Template context
   * @see https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html#_prepareContext
   */
  async _prepareContext(_options) {
    const base = await super._prepareContext(_options);
    const actorObj = this.document;
    const system = foundry.utils.deepClone(actorObj.system ?? {});
    // Normalize notes to a string for the editor.
    if (typeof system.notes !== "string") system.notes = String(system.notes ?? "");
    // Pre-enrich for read-only rendering.
    const enrichedNotes = await TextEditor.enrichHTML(system.notes ?? "", {
      async: true,
      secrets: this.isEditable,
      documents: true,
      links: true
    });
  
    // Use PcContextBuilder to sort all item types (eliminates ~200 lines of duplication)
    const all = actorObj.items.contents ?? actorObj.items;
    const byType = (t) => all.filter((i) => i.type === t);
    const sortedItems = PcContextBuilder.buildSortedItems(actorObj, all);
    const {
      skills, spells, advantages, disadvantages, items,
      katas, kihos, tattoos, techniques, armors, weapons, bows
    } = sortedItems;
    
    // Build mastery list from sorted skills
    const masteries = PcContextBuilder.buildMasteryList(skills);
  
    // Effective traits logic (unchanged)
    let fam = {};
    try {
      const uuid = this.actor.getFlag(SYS_ID, "familyItemUuid");
      if (uuid && globalThis.fromUuidSync) {
        const doc = /** @type {any} */ (fromUuidSync(uuid));
        const key = String(doc?.system?.trait ?? "").toLowerCase();
        const amt = Number(doc?.system?.bonus ?? 1);
        if (key && actorObj.system?.traits && (key in actorObj.system.traits) && Number.isFinite(amt) && amt !== 0) {
          fam = { [key]: amt };
        }
      }
    } catch (_e) {}
    if (!fam || Object.keys(fam).length === 0) fam = this.actor.flags?.[SYS_ID]?.familyBonus ?? {};
  
    let traitsEff = foundry.utils.duplicate(
      this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
    );
    if (!Object.keys(traitsEff).length) {
      traitsEff = foundry.utils.duplicate(
        this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
      );
      if (!Object.keys(traitsEff).length) {
        console.warn(`${SYS_ID}`, "traitsEff missing in actor.system._derived; check prepareDerivedData()");
      }
    }
  
    const bioClan   = byType("clan")[0]   ?? null;
    const bioFamily = byType("family")[0] ?? null;
    const bioSchool = byType("school")[0] ?? null;
  
    // Get current active stance for dropdown
    const activeStances = getActiveStances(actorObj);
    const currentStance = activeStances[0] || "";
    
    // Get mounted combat status
    const mountedStatus = getMountedStatus(actorObj);
  
    /**
     * Template context with consistently pre-computed sorted item collections.
     * All item types now use the same pre-computed pattern for maintainability.
     */
    return {
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
      config: {
        arrows: ARROWS,
        sizes: SIZES,
        rings: RINGS,
        ringsWithNone: RINGS_WITH_NONE,
        spellRings: SPELL_RINGS,
        traits: SKILL_TRAITS,
        npcTraits: NPC_TRAITS,
        skillTypes: SKILL_TYPES,
        actionTypes: ACTION_TYPES,
        kihoTypes: KIHO_TYPES,
        advantageTypes: ADVANTAGE_TYPES,
        stances: STANCES,
        npcNumberWoundLvls: NPC_NUMBER_WOUND_LVLS
      },
      // Combined advantage/disadvantage list (uses PcContextBuilder)
      get advDisList() {
        return PcContextBuilder.buildAdvDisList(actorObj, advantages, disadvantages);
      },
      // Clean, consistent variable references - much more maintainable!
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
  }

  /**
   * @override
   * Bind UI events and setup post-render functionality.
   * Replaces the old activateListeners pattern from ApplicationV1.
   * @param {object} context - Template context
   * @param {object} options - Render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;


    // Inline header control: Toggle Edit Mode (inject into window header controls).
    // v13 exposes header *menu* via _getHeaderControls()/hook; there is no public API for inline icons.
    // We scope to this sheet and make it idempotent on every render.
    try {
      const appEl = root?.closest(".app.window-app");
      const controls = appEl?.querySelector(":scope > header.window-header .window-controls");
      if (controls) {
        // Remove any prior copies to prevent the "button parade" on re-renders.
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

        // Put it first, before the kebab.
        controls.insertBefore(btn, controls.firstElementChild);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "PC Sheet: header control injection failed", { err });
    }

    // Always repaint Void dots after any render, even if the root element is reused.
    // Foundry v13 often re-renders by replacing innerHTML without swapping the root.
    // @see https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html#render
    this._paintVoidPointsDots(root);

    // Bind once per *current* DOM root; rebind only if the root element actually changed.
    if (this._boundExtraRoot === root) return;
    this._boundExtraRoot = root;
    if (!this.actor.isOwner) return;

    // All [data-action] handlers are now delegated via BaseActorSheet.
    // Keep only non-[data-action] bindings here:
    // Sorting is now handled via data-action delegation - no direct binding needed

    // After render, paint the dot faces to match current value
    this._paintVoidPointsDots(root);

    /**
     * Persist trait edits immediately (debounced) using the matched element,
     * not the event, since our "on(...)" helper is delegated.
     * @see https://foundryvtt.com/api/classes/foundry.utils.html#debounce
     */
    const saveTrait = foundry.utils.debounce((el) => this._onInlineActorEdit(null, el), 200);
    // Traits (Earth, Air, Fire, Water pairs)
    on(root, "input[name^='system.traits.']", "input",  (ev, el) => saveTrait(el));
    on(root, "input[name^='system.traits.']", "change", (ev, el) => this._onInlineActorEdit(ev, el));
    /** Void ring fields live under system.rings.void.*, not system.traits.* */
    on(root, "input[name='system.rings.void.rank']",  "input",  (ev, el) => saveTrait(el));
    on(root, "input[name='system.rings.void.rank']",  "change", (ev, el) => this._onInlineActorEdit(ev, el));
    on(root, "input[name='system.rings.void.value']", "input",  (ev, el) => saveTrait(el));
    on(root, "input[name='system.rings.void.value']", "change", (ev, el) => this._onInlineActorEdit(ev, el));

    // Clan/family/school now handled by action delegation (BioItemHandler)
    // Image editing
    on(root, "[data-edit='img']", "click", (ev) => this._onEditImage(ev, ev.currentTarget));

    // Experience actions
    on(root, "[data-action='xp-add']", "click", (ev) => this._onXpAdd(ev));
    on(root, "[data-action='xp-log']", "click", (ev) => this._onXpLog(ev));

    // Setup shared context menu for item rows
    await this._setupItemContextMenu(root);
  }



  /**
   * @override
   * Define allowed sort keys for PC lists.
   * Specifies which columns are sortable for each list scope.
   * 
   * @param {string} scope - Sort scope identifier (e.g., "skills", "spells", "advantages")
   * @returns {string[]} Array of allowed sort keys for this scope
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

  /* Trait adjustment now handled by PcTraitHandler */

  /**
   * Minimal inline actor edit for "system.*" fields.
   * Works with delegated handlers by accepting an explicit element.
   * @param {Event|null} ev
   * @param {HTMLElement} [element]
   */
  async _onInlineActorEdit(ev, element) {
    const el = /** @type {HTMLInputElement|null} */ (
      element instanceof HTMLElement ? element
      : (ev?.target instanceof HTMLElement ? ev.target
      : (ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null))
    );
    if (!el) return; // nothing to do
    const path = el.name || el.getAttribute("name");
    if (!path) return;
    let value = el.value;

    /** Respect Foundry's dtype casting.
     *  @see https://foundryvtt.com/api/classes/foundry.utils.FormDataExtended.html
     */
    const dtype = el.dataset.dtype || el.getAttribute("data-dtype");
    if (dtype === "Boolean") {
      value = !!el.checked;
    } else if (dtype === "Number" || el.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) return; // ignore incomplete input like "-" or ""
      value = n;
    }

    // Update only the changed path
    try {
      await this.actor.update({ [path]: value });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

  /* ---------------------------------- */
  /* Rolls                               */
  /* ---------------------------------- */

  /**
   * Handle item roll for simple item chat display.
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked element
   */
  _onItemRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const rid = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = rid ? this.actor.items.get(rid) : null;
    if (!item) return;

    // Send item to chat
    return item.toMessage();
  }

  /**
   * Handle Ring rolls from the rings wheel.
   * @param {MouseEvent} event - The click event
   * @param {HTMLElement} el - The ring roll element with dataset attributes
   */
  _onRingRoll(event, el) {
    event.preventDefault();
    /** Localized ring name for chat flavor. */
    const ringName = el.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${el.dataset?.systemRing || "void"}`);
    /** System ring key: "earth" | "air" | "water" | "fire" | "void". */
    const systemRing = String(el.dataset?.systemRing || "void").toLowerCase();
    /** Numeric ring rank from dataset, already formatted by the template. */
    const ringRank = toInt(el.dataset?.ringRank);

    // Pass the exact option names RingRoll expects.
    RingRoll({
      ringRank,
      ringName,
      systemRing,
      askForOptions: event.shiftKey,
      actor: this.actor,
      // Ensure wound penalties apply to ring rolls like skills/traits
      woundPenalty: readWoundPenalty(this.actor)
    });
  }

  /**
   * Handle weapon damage rolls using stored damage dice.
   * Applies Full Attack stance bonuses (+1k1) when active.
   * Shift-click to open roll options dialog.
   * @param {MouseEvent} event - The click event
   * @param {HTMLElement} element - The clicked element in the weapon row
   */
  _onWeaponRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? this.actor.items.get(id) : null;
    if (!item) return;

    const baseDiceRoll = Number(item.system?.damageRoll ?? 0) || 0;
    const baseDiceKeep = Number(item.system?.damageKeep ?? 0) || 0;
    
    // Apply stance damage bonuses
    const stanceBonuses = getStanceDamageBonuses(this.actor);
    const diceRoll = baseDiceRoll + stanceBonuses.roll;
    const diceKeep = baseDiceKeep + stanceBonuses.keep;
    
    // Add stance bonus information to description
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
      askForOptions: event.shiftKey
    });
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Uses the weapon's associated skill if the character has it, otherwise falls back to the weapon's trait.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element in the weapon row
   */
  _onWeaponAttackRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? this.actor.items.get(id) : null;
    if (!item) return;

    const weaponSkill = resolveWeaponSkillTrait(this.actor, item);
    const untrained = weaponSkill.skillRank === 0;
    
    const rollName = untrained 
      ? `${item.name} (${T("l5r4.ui.mechanics.rolls.unskilled")})`
      : `${item.name} ${T("l5r4.ui.mechanics.rolls.attackRoll")}`;

    // NpcRoll now applies all attack bonuses (stance + mounted) internally
    return NpcRoll({
      rollName,
      diceRoll: weaponSkill.rollBonus,
      diceKeep: weaponSkill.keepBonus,
      rollType: "attack",
      actor: this.actor,
      untrained,
      woundPenalty: readWoundPenalty(this.actor),
      weaponId: id
    });
  }

  /* ---------------------------------- */
  /* Item CRUD                           */
  /* ---------------------------------- */

  /**
   * @override
   * Handle inline item editing with enhanced dtype support for PC sheet.
   * Supports checkboxes, numbers, booleans, and string values.
   * @param {Event} event - The input event
   * @param {HTMLElement} element - The input element
   */
  async _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLInputElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // Handle checkbox values and extended dtype support
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
  /* Experience: manual adjustments and log */
  /* ---------------------------------- */

  /**
   * Prompt to add or remove XP manually with a reason note.
   * Stores entries in the actor's manual XP log under flags.
   * @param {Event} event - The click event
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#setFlag
   * @see https://foundryvtt.com/api/classes/client.Dialog.html#static-prompt
   */
  async _onXpAdd(event) {
    event?.preventDefault?.();
    const html = document.createElement("div");
    html.innerHTML = `
      <div class="form-group">
        <label>${game.i18n.localize("l5r4.character.experience.xpAmount")}</label>
        <input type="number" step="1" value="1" class="xp-amount" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("l5r4.character.experience.note")}</label>
        <input type="text" class="xp-note" placeholder="${game.i18n.localize("l5r4.character.experience.reason")}" />
      </div>
    `;

    const value = await Dialog.prompt({
      title: game.i18n.localize("l5r4.character.experience.adjustExperience"),
      content: html,
      label: game.i18n.localize("l5r4.ui.common.apply"),
      callback: (dlg) => {
        const amount = Number.isFinite(+dlg.querySelector(".xp-amount")?.value) ? +dlg.querySelector(".xp-amount").value : 0;
        const note = String(dlg.querySelector(".xp-note")?.value ?? "").trim();
        return { amount, note };
      }
    });
    if (!value) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    manual.push({
      id: foundry.utils.randomID(),
      delta: Number.isFinite(+value.amount) ? +value.amount : 0,
      note: value.note,
      ts: Date.now()
    });
    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in PcSheet", { err });
    }
  }

  /**
   * Display a detailed XP breakdown dialog showing spent, earned, and available XP.
   * Includes manual XP adjustments from the log.
   * @param {Event} event - The click event
   * @see https://foundryvtt.com/api/classes/client.Dialog.html#static-prompt
   */
  async _onXpLog(event) {
    event?.preventDefault?.();
    const sys = this.actor.system ?? {};
    const xp = sys?._xp ?? {};
    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? ns.xpManual : [];  // pool changes
    const spent  = Array.isArray(ns.xpSpent)  ? ns.xpSpent  : [];  // purchases

    const rows = (arr) =>
      arr
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .map(e => {
          const when = new Date(e.ts || Date.now()).toLocaleString();
          const sign = (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "");
          return `<tr><td>${when}</td><td style="text-align:right">${sign}${e.delta ?? 0}</td><td>${foundry.utils.escapeHTML(e.note || "")}</td></tr>`;
        })
        .join("");

    const manualRows  = rows(manual);
    const spentRows   = rows(spent);
    const manualTotal = manual.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);
    const spentTotal  = spent.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);

    const content = `
      <h3>${game.i18n.localize("l5r4.character.experience.experienceSummary")}</h3>
      <p><b>${game.i18n.localize("l5r4.character.experience.usedTotal")}:</b> ${xp.spent ?? 0} / ${xp.total ?? 40} <i>(${(xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0))} ${game.i18n.localize("l5r4.ui.common.left")})</i></p>
      <ul>
        <li>Base: ${xp?.breakdown?.base ?? 40}</li>
        <li>Disadvantages grant: ${xp?.breakdown?.disadvantagesGranted ?? 0} (cap 10)</li>
        <li>Manual adjustments: ${xp?.breakdown?.manual ?? 0}</li>
        <li>Traits: ${xp?.breakdown?.traits ?? 0}</li>
        <li>Void: ${xp?.breakdown?.void ?? 0}</li>
        <li>Skills: ${xp?.breakdown?.skills ?? 0}</li>
        <li>Advantages: ${xp?.breakdown?.advantages ?? 0}</li>
      </ul>

      <h4>${game.i18n.localize("l5r4.character.experience.poolChanges")}:</h4>
      <table class="table">
        <thead><tr>
          <th>${game.i18n.localize("l5r4.character.experience.when")}</th>
          <th style="text-align:right">${game.i18n.localize("l5r4.ui.common.xp")}</th>
          <th>${game.i18n.localize("l5r4.character.experience.note")}</th>
        </tr></thead>
        <tbody>${manualRows || `<tr><td colspan="3"><i>${game.i18n.localize("l5r4.ui.common.none")}</i></td></tr>`}</tbody>
        <tfoot><tr><td style="text-align:right" colspan="1"><b>${game.i18n.localize("l5r4.ui.common.total")}</b></td>
        <td style="text-align:right"><b>${manualTotal}</b></td><td></td></tr></tfoot>
      </table>

      <h4>${game.i18n.localize("l5r4.character.experience.purchases")}:</h4>
      <table class="table">
        <thead><tr>
          <th>${game.i18n.localize("l5r4.character.experience.when")}</th>
          <th style="text-align:right">${game.i18n.localize("l5r4.ui.common.xp")}</th>
          <th>${game.i18n.localize("l5r4.character.experience.note")}</th>
        </tr></thead>
        <tbody>${spentRows || `<tr><td colspan="3"><i>${game.i18n.localize("l5r4.ui.common.none")}</i></td></tr>`}</tbody>
        <tfoot><tr><td style="text-align:right" colspan="1"><b>${game.i18n.localize("l5r4.ui.common.total")}</b></td>
        <td style="text-align:right"><b>${spentTotal}</b></td><td></td></tr></tfoot>
      </table>
    `;

    await Dialog.prompt({
      title: game.i18n.localize("l5r4.character.experience.xpLog"),
      content,
      label: game.i18n.localize("l5r4.ui.common.close"),
      callback: () => true
    });
  }

  /**
   * Legacy _retroactivelyUpdateXP method removed to prevent XP log duplication.
   * XP Manager now handles all XP calculations and retroactive updates.
   * This method was creating duplicate entries when both PC sheet and XP Manager
   * attempted to rebuild XP tracking data simultaneously.
   * 
   * @deprecated Removed in favor of XP Manager's _retroactivelyUpdateXP method
   * @see module/apps/xp-manager.js XpManagerApplication._retroactivelyUpdateXP()
   */

  /**
   * Display the XP modal with comprehensive experience tracking.
   * Shows XP breakdown, manual adjustments, and purchase history in a dialog.
   * @param {Event} event - The click event
   */
  async _onXpModal(event) {
    event?.preventDefault?.();
    
    // Create and show the new XP Manager Application
    const xpManager = new XpManagerApplication(this.actor);
    xpManager.render(true);
  }

  /* ---------------------------------- */
  /* Clan/Family/School now handled by BioItemHandler */
  /* ---------------------------------- */

  /* ---------------------------------- */
  /* Submit pipeline                     */
  /* ---------------------------------- */

  /**
   * @override
   * Convert trait inputs that display "effective" (base + family) back to base before submit.
   * Handles family bonus calculations to maintain proper trait values.
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @param {object} updateData - Additional update data
   * @returns {object} Processed submit data
   * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html#_prepareSubmitData
   */
  _prepareSubmitData(event, form, formData, updateData = {}) {
    // Call parent to build the update object first
    const data = super._prepareSubmitData(event, form, formData, updateData);

    // Convert effective traits to base (uses FamilyBonusService, same logic as PcTraitHandler.convertSubmitData)
    const t = data?.system?.traits;
    if (t && typeof t === "object") {
      for (const [k, v] of Object.entries(t)) {
        if (v === undefined || v === null) continue;
        const eff = Number(v) || 0;
        const bonus = FamilyBonusService.getBonus(this.actor, k);
        const base  = eff - bonus;
        // Clamp to >= 0 (L5R traits can’t be negative)
        t[k] = Math.max(0, base);
      }
    }
    return data;
  }

  /**
   * @override
   * Process submit data with family-specific side effects.
   * Handles family base name persistence and delegates to parent.
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {object} submitData - The processed submit data
   * @param {object} options - Submit options
   * @returns {Promise<void>}
   */
  async _processSubmitData(event, form, submitData, options) {
    // Persist base name if we prefixed during _prepareSubmitData
    if (submitData.__familyBaseName) {
      submitData[`flags.${SYS_ID}.familyBaseName`] = submitData.__familyBaseName;
      delete submitData.__familyBaseName;
    }

    console.debug("[L5R4] submit traits", submitData?.system?.traits);

    return super._processSubmitData(event, form, submitData, options);
  }

  /* ---------------------------------- */
  /* Family bonus from item              */
  /* ---------------------------------- */

  /**
   * Handle preference-based sorting for most item types.
   * Uses user flags to store sort preferences and triggers a render.
   * @param {string} scope - The item list scope (weapons, spells, etc.)
   * @param {string} key - The sort key (name, rank, etc.)
   * @param {HTMLElement} el - The clicked sort element
   * @returns {Promise<void>}
   */
  async _onPreferenceBasedSort(scope, key, el) {
    try {
      const allowed = {
        armors:       ["name","bonus","reduction","equipped"],
        weapons:      ["name","damage","size"],
        items:        ["name"],
        spells:       ["name","ring","mastery","range","aoe","duration"],
        techniques:   ["name"],
        technique:    ["name"],
        katas:        ["name","ring","mastery"],
        kihos:        ["name","ring","mastery","type"],
        tattoos:      ["name"],
        advantages:   ["name","type","cost"],
        disadvantages:["name","type","cost"],
        advDis:       ["name","type","cost","item"]
      }[scope] ?? ["name"];
      
      if (!allowed.includes(key)) {
        console.warn(`${SYS_ID}`, "Invalid sort key for scope", { scope, key, allowed });
        return;
      }
      
      const cur = getSortPref(this.actor.id, scope, allowed, allowed[0]);
      await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });
      
      // Update visual indicator
      const header = el.closest('.item-list.-header');
      if (header) {
        header.querySelectorAll('.item-sort-by').forEach(a => {
          a.classList.toggle('is-active', a === el);
          if (a !== el) a.removeAttribute('data-dir');
        });
        
        const newPref = getSortPref(this.actor.id, scope, allowed, allowed[0]);
        el.setAttribute('data-dir', newPref.dir);
      }
      
      // Trigger re-render to apply new sort
      this.render();
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Preference-based sort failed", { err, scope, key });
    }
  }
  
  /**
   * Handle document-based sorting for skills to preserve sort bins.
   * Updates the item.sort property directly to maintain item ordering.
   * @param {MouseEvent} event - The original click event
   * @param {HTMLElement} el - The clicked sort element
   * @param {string} key - The sort key (name, rank, trait, etc.)
   * @returns {Promise<void>}
   */
  async _onSkillsDocumentSort(event, el, key) {
    try {
      // Toggle direction per-header: asc ⇄ desc
      const dir = (el.dataset.dir = el.dataset.dir === "asc" ? "desc" : "asc");
      const asc = dir === "asc" ? 1 : -1;

      // Current skills on the Actor
      const skills = this.actor.items.filter(i => i.type === "skill");
      if (!skills.length) return;

      // Preserve existing numeric "sort bins" so other item types stay in place
      const bins = skills.map(i => i.sort).sort((a, b) => a - b);

      // Value selector per column
      const val = (it) => {
        switch (key) {
          case "name":     return String(it.name ?? "");
          case "rank":     return Number(it.system?.rank ?? 0);
          case "trait":    return String(it.system?.trait ?? "");
          case "type":     return String(it.system?.type ?? "");
          case "school":   return it.system?.school ? 1 : 0; // true/false → 1/0
          case "emphasis": return String(it.system?.emphasis ?? "");
          default:         return String(it.name ?? "");
        }
      };

      // Comparator that handles both numbers and strings (with locale)
      const cmp = (a, b) => {
        const va = val(a), vb = val(b);
        if (typeof va === "number" && typeof vb === "number") return asc * (va - vb);
        return asc * String(va).localeCompare(String(vb), game.i18n.lang);
      };

      const sorted = skills.slice().sort(cmp);

      // Reassign the existing bins to the new order; fall back to spaced ints if needed
      const updates = sorted.map((it, i) => ({ _id: it.id, sort: bins[i] ?? ((i + 1) * 10) }));

      if (updates.length) {
        await this.actor.updateEmbeddedDocuments("Item", updates);
        
        // Update visual indicators
        const skillsHeader = this.element.querySelector('.item-list.-header[data-scope="skills"]');
        if (skillsHeader) {
          skillsHeader.querySelectorAll('.item-sort-by').forEach(a => {
            a.classList.toggle('is-active', a === el);
            if (a !== el) a.removeAttribute('data-dir');
          });
        }
      }
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Skills document sort failed", { err, key });
    }
  }
}
