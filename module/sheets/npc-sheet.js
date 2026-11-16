/**
 * @module sheets/npc-sheet
 * @description The NPC actor sheet, for creatures, adversaries, and supporting cast. On top of BaseActorSheet it
 * adds the Fear test, the NPC's three attack slots, direct Void Ring editing (an NPC's Rings are not derived from
 * its Traits), Void Points shown only when the Void Ring is 1 or more, and a limited view (npc-limited.hbs) for a
 * player who does not own the NPC.
 */
import { SYS_ID } from "../config/constants.js";
import { ACTION_TYPES, STANCES } from "../config/localization.js";
import { T } from "../utils/localization.js";
import { on } from "../utils/dom.js";
import { applySortPref } from "../utils/sorting.js";
import { getActiveStance } from "../utils/stances.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";
import { summaryOf } from "../documents/summary.js";
import { getSortPref } from "../services/sort-preferences.js";
import { getSectionCollapsedMap } from "../services/section-state.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { ItemCrudHandler } from "./handlers/item-crud-handler.js";
import { NpcActionsHandler } from "./handlers/npc-actions-handler.js";
import { PcActionsHandler } from "./handlers/pc-actions-handler.js";
import { PcAdjustmentHandler } from "./handlers/pc-adjustment-handler.js";
import { PcRollHandler } from "./handlers/pc-roll-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";
import { TraitHandler } from "./handlers/trait-handler.js";

/**
 * NPC Actor Sheet for L5R4 System
 *
 * Renders and manages the character sheet UI for NPC actors. Provides simplified
 * interface compared to PC sheets, with direct stat editing, Fear test integration,
 * and optional limited view for non-owners.
 *
 * **Key Differences from PC Sheet:**
 * - Direct Void Ring rank editing (not derived from Void trait)
 * - Fear test button for creatures with Fear ability
 * - No XP/advancement tracking
 * - Optional Void Points display (controlled by system setting)
 * - Simplified item lists (no advancement hints)
 *
 * @augments {BaseActorSheet}
 */
export default class L5R4NpcSheet extends BaseActorSheet {
  /**
   * NPC-specific options, merged over BaseActorSheet's by ApplicationV2: the "npc" class and an 840px width for
   * the stat block.
   *
   * @type {object}
   * @override
   */
  static DEFAULT_OPTIONS = {
    classes: ["npc"],
    position: { width: 840 }
  };

  /**
   * Template part configuration for the NPC sheet.
   *
   * Supports switching between full and limited views based on ownership.
   *
   * **Template Variants:**
   * - Full view (npc.hbs): Complete stat block for GM/owners
   * - Limited view (npc-limited.hbs): Restricted info for observers
   *
   * @type {object}
   */
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/npc.hbs`,
      scrollable: [".scrollable-content"]
    }
  };

  /**
   * Prepares template context data for rendering the NPC sheet.
   *
   * Gathers and organizes all data needed by the Handlebars template:
   * - Actor system data (traits, rings, stats)
   * - Embedded items sorted by type (skills, weapons, armor, spells)
   * - Derived values (effective traits with modifiers)
   * - UI state (current stance, mounted status, sort preferences)
   * - System settings (Void Points display toggle)
   *
   * **Skills Sorting:**
   * Skills are sorted using user preference (stored per-actor) with sortable columns:
   * name, rank, trait, roll (skill+trait), emphasis. Default sort is alphabetical by name.
   *
   * **Item Type Filtering:**
   * Separates items into categories for distinct display sections. "item" and "commonItem"
   * types are combined into generic items list.
   *
   * **Foundry Lifecycle:**
   * Called automatically before rendering. Always call super._prepareContext first to
   * inherit base context (editable, limited, owner flags, config data).
   *
   * @param {object} options - Rendering options
   * @returns {Promise<object>} Complete context object for template rendering
   * @override
   */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actorObj = this.actor;

    const all = this.actor.items.contents;
    const getItemsOfType = t => all.filter(i => i.type === t);

    const currentStance = getActiveStance(actorObj.statuses);

    // Prepare sortable skills list with user preference
    const skills = (() => {
      // Define column extractors for sorting
      const cols = {
        name: it => String(it?.name ?? ""),
        rank: it => Number(it?.system?.rank ?? 0) || 0,
        trait: it => {
          // Localize trait key if it matches known pattern
          const raw = String(it?.system?.trait ?? "").toLowerCase();
          const key =
            raw && /^l5r4\.mechanics\.traits\./.test(raw)
              ? raw
              : raw
                ? `l5r4.ui.mechanics.traits.${raw}`
                : "";
          const loc = key ? game.i18n?.localize?.(key) : "";
          return String(loc && loc !== key ? loc : (it?.system?.trait ?? ""));
        },
        roll: it => Number(it?.system?.roll ?? it?.system?.rank ?? 0) || 0,
        emphasis: it => {
          const trained = Array.isArray(it?.system?.trainedEmphases)
            ? it.system.trainedEmphases
            : [];
          return trained.join(", ");
        }
      };
      const allowedKeys = this._getAllowedSortKeys("skills");
      const pref = getSortPref(actorObj.id, "skills", { allowedKeys, defaultKey: "name" });
      return applySortPref(getItemsOfType("skill"), cols, { pref, locale: game.i18n?.lang });
    })();

    const collapsedSections = getSectionCollapsedMap(actorObj.id, [
      "skills",
      "weapons",
      "armors",
      "spells",
      "items"
    ]);

    // The three attack slots; an empty one (no name, no dice) is hidden until "Add Attack" fills it (issue #30).
    // `attack.type` stores the action key the attack config's select writes; a value from older data that is no
    // key shows as stored.
    const attacks = ["1", "2", "3"].map(num => {
      const attack = actorObj.system[`attack${num}`];
      const damage = actorObj.system[`damage${num}`];
      const empty = !attack.name && !attack.roll && !attack.keep && !damage.roll && !damage.keep;
      const actionLabel = attack.type in ACTION_TYPES ? T(ACTION_TYPES[attack.type]) : attack.type;
      return {
        num,
        key: `attack${num}`,
        attack,
        damage,
        empty,
        actionLabel,
        attackPool: formatAttackPool(attack),
        damagePool: formatAttackPool(damage),
        attackLabel: attack.name || `${T("l5r4.ui.mechanics.combat.attack")} ${num}`,
        damageLabel: `${T("l5r4.ui.common.damage")} ${num}`
      };
    });

    const context = {
      ...base,
      actor: this.actor,
      system: actorObj.system,
      currentStance,
      collapsedSections,
      attacks,
      firstEmptyAttack: attacks.find(slot => slot.empty)?.key ?? null,
      // The book page a creature from the packs cites (roadmap/STAGE-15)
      summary: summaryOf(actorObj.system),

      // Show Void Points section only if NPC has Void Ring >= 1
      showNpcVoidPoints: (actorObj.system?.rings?.void?.rank ?? 0) >= 1,

      traitsEff: foundry.utils.duplicate(this.actor.system?._derived?.traitsEff ?? {}),

      skills,
      weapons: getItemsOfType("weapon"),
      bows: getItemsOfType("bow"),
      armors: getItemsOfType("armor"),
      spells: getItemsOfType("spell"),
      items: all.filter(i => i.type === "item" || i.type === "commonItem")
    };

    prepareItemSheetOptions(context);
    context.config.stances = STANCES;
    return context;
  }

  /**
   * Routes click events on [data-action] elements to appropriate handlers.
   *
   * Implements event delegation pattern for all user interactions on the sheet.
   * Actions are identified by data-action attribute values on interactive elements.
   *
   * **Supported Actions:**
   * - update-item-field: Update item properties in the sheet
   * - create-item, delete-item, edit-item, expand-item, post-item: Item CRUD operations
   * - expand-section: Collapse or expand an item list section
   * - sort-items: Change sort field/direction for item lists
   * - adjust-void-ring: Adjust Void Ring rank (Shift+Click, NPC-specific)
   * - roll-ring/skill/trait/attack/damage/weapon-attack: Initiate dice rolls
   * - test-fear: Trigger Fear test for selected tokens
   * - adjust-trait: Adjust trait ranks (Shift+Click)
   * - adjust-void-points: Spend/regain Void Points
   * - open-combat-config: Open combat configuration dialog (initiative/movement)
   * - open-wound-config: Open wound threshold configuration dialog
   *
   * **Implementation Note:**
   * Most actions delegate to BaseActorSheet or specialized handlers. NPC-specific
   * actions include adjust-void-ring (direct Void Ring editing) and test-fear.
   *
   * @param {string} action - The data-action attribute value from the clicked element
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The element that was clicked
   * @override
   */
  _onAction(action, event, element) {
    switch (action) {
      case "apply-healing":
        return PcActionsHandler.applyHealing(this._getHandlerContext(), event, element);
      case "update-item-field":
        return this._onInlineItemEdit(event, element);
      case "create-item":
        return this._onItemCreate(event, element);
      case "delete-item":
        return this._onItemDelete(event, element);
      case "edit-item":
        return this._onItemEdit(event, element);
      case "expand-item":
        return this._onItemExpand(event, element);
      case "expand-section":
        return ItemCrudHandler.updateSectionCollapsed(this._getHandlerContext(), event, element);
      case "post-item":
        return this._onItemHeaderToChat(event, element);
      case "sort-items":
        return this._onUnifiedSortClick(event, element);
      case "adjust-void-ring":
        return PcAdjustmentHandler.updateVoidRing(this._getHandlerContext(), event, element, +1);
      // The arrows step the Void Ring without Shift, like the Trait arrows (issue #30)
      case "increase-void-ring":
        return PcAdjustmentHandler.updateVoidRing(
          this._getHandlerContext(),
          { preventDefault: () => event.preventDefault(), shiftKey: true },
          element,
          +1
        );
      case "decrease-void-ring":
        return PcAdjustmentHandler.updateVoidRing(
          this._getHandlerContext(),
          { preventDefault: () => event.preventDefault(), shiftKey: true },
          element,
          -1
        );
      case "roll-ring":
        return RollHandler.rollClickedNpcRing(this._getHandlerContext(), event, element);
      case "roll-skill":
        return this._onSkillRoll(event, element);
      case "roll-trait":
        return this._onTraitRoll(event, element);
      case "roll-attack":
        return this._onAttackRoll(event, element);
      case "roll-damage":
        return this._onDamageRoll(event, element);
      case "roll-weapon-attack":
        return this._onWeaponAttackRoll(event, element);
      case "cast-spell":
        return PcRollHandler.rollClickedSpellCast(this._getHandlerContext(), event, element);
      case "test-fear":
        return NpcActionsHandler.testFear(this._getHandlerContext(), event, element);
      case "adjust-trait":
        return this._onTraitAdjust(event, element, +1);
      case "increase-trait":
        return TraitHandler.updateTraitRankUp(this._getHandlerContext(), event, element);
      case "decrease-trait":
        return TraitHandler.updateTraitRankDown(this._getHandlerContext(), event, element);
      case "adjust-void-points":
        return this._onVoidPointsAdjust(event, element, +1);
      case "toggle-movement-type":
        return StanceHandler.updateMovementType(this._getHandlerContext(), event);
      case "open-condition-manager":
        return AppLauncherHandler.openConditionManager(this._getHandlerContext(), event, element);
      case "open-combat-config":
        return AppLauncherHandler.openCombatConfig(this._getHandlerContext(), event, element);
      case "open-wound-config":
        return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
      case "edit-attack":
      case "add-attack":
        return NpcActionsHandler.openAttackConfig(this._getHandlerContext(), event, element);
      case "delete-attack":
        return NpcActionsHandler.deleteAttack(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Routes right-click (contextmenu) events on [data-action] elements.
   *
   * Handles reverse operations for rank adjustment actions (decrement instead of
   * increment). Falls back to _onAction for actions that don't have context variants.
   *
   * **Context-Specific Actions:**
   * - adjust-trait: Decrement trait (Shift+Right-Click)
   * - adjust-void-ring: Decrement Void Ring (Shift+Right-Click, NPC-specific)
   * - adjust-void-points: Regain Void Point (Right-Click)
   *
   * @param {string} action - The data-action attribute value
   * @param {Event} event - The contextmenu event
   * @param {HTMLElement} element - The element that was right-clicked
   * @override
   */
  _onActionContext(action, event, element) {
    switch (action) {
      case "adjust-trait":
        return this._onTraitAdjust(event, element, -1);
      case "adjust-void-ring":
        return PcAdjustmentHandler.updateVoidRing(this._getHandlerContext(), event, element, -1);
      case "adjust-void-points":
        return this._onVoidPointsAdjust(event, element, -1);
      default:
        return this._onAction(action, event, element);
    }
  }

  /**
   * Routes change events on [data-action] form elements.
   *
   * Handles form field changes for inline editing and stance changes.
   * Only processes actions that require change event handling.
   *
   * **Supported Actions:**
   * - update-item-field: Update item properties from form fields
   * - apply-stance: Update character's combat stance.
   *
   * @param {string} action - The data-action attribute value
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
   * Renders the sheet's HTML based on ownership level.
   *
   * Non-GM users without ownership see a limited view showing only basic information
   * (name, image, basic stats). GMs and owners see the full NPC stat block.
   *
   * **View Selection:**
   * - Limited view (npc-limited.hbs): Non-GM observers
   * - Full view (npc.hbs): GM or actor owners
   *
   * **Foundry Pattern:**
   * Overrides ActorSheetV2._renderHTML to implement custom template selection.
   * Returns object with 'form' property containing the rendered element.
   *
   * @param {object} context - Template context data from _prepareContext
   * @param {object} _options - Rendering options (unused)
   * @returns {Promise<{form: HTMLElement}>} Object containing rendered form element
   * @override
   */
  async _renderHTML(context, _options) {
    const isLimited = !game.user.isGM && this.actor.limited;
    const path = isLimited
      ? `systems/${SYS_ID}/templates/actor/npc-limited.hbs`
      : `systems/${SYS_ID}/templates/actor/npc.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    // Both templates render one <form> root
    const form = foundry.utils.parseHTML(html);
    return { form };
  }

  /**
   * Post-render lifecycle hook for setting up interactive UI elements.
   *
   * Initializes UI components that require DOM access:
   * - Paints Void Points dots to match actor's current Void Points
   * - Sets up sort indicators for skills list headers
   * - Binds simple roll handlers (non-delegated clicks)
   * - Binds image editor click handler
   *
   * **Ownership Check:**
   * Only sets up interactive elements (sort indicators) if current
   * user owns the actor. Void Points painting happens regardless for visual consistency.
   *
   * **Foundry Lifecycle:**
   * Called automatically after template rendering. Always call super._onRender first
   * to ensure parent class setup (event delegation, image error handling) completes.
   *
   * @param {object} context - Template context data used for rendering
   * @param {object} options - Rendering options
   * @returns {Promise<void>}
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    this._paintVoidPointsDots(root);

    if (!this.actor.isOwner) {
      return;
    }

    this._initializeSortIndicators(root, "skills", this._getAllowedSortKeys("skills"));

    on(root, "click", {
      selector: ".simple-roll",
      handler: ev => RollHandler.rollNpcPool(this._getHandlerContext(), ev)
    });

    on(root, "click", {
      selector: "[data-edit='img']",
      handler: ev => this._onEditImage(ev, ev.currentTarget)
    });
  }

  /**
   * Validates and coerces form data before submitting to actor update.
   *
   * Ensures actor always has a valid name. If name field is empty or whitespace-only,
   * falls back to current actor name or "Unnamed" placeholder.
   *
   * **Foundry Pattern:**
   * Part of ActorSheetV2 form submission lifecycle. Called before actor.update() to
   * allow field validation and type coercion.
   *
   * @param {Event} event - Form submission event
   * @param {HTMLFormElement} form - The form element being submitted
   * @param {FormData} formData - Raw form data from the browser
   * @param {object} [updateData={}] - Additional update data from parent classes
   * @returns {object} Validated and coerced data ready for actor.update()
   * @override
   */
  // eslint-disable-next-line max-params -- core's DocumentSheetV2#_prepareSubmitData(event, form, formData, updateData) override
  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) {
      submit.name = this.actor.name || "Unnamed";
    }
    return submit;
  }
}

/**
 * An attack or damage slot's pool as its roll button shows it: "5k3", with a nonzero modifier signed after it
 * ("5k3+2", "3k2-1"), written as core's numberFormat helper writes a signed whole number.
 * @param {{roll: number, keep: number, modifier: number}} slot - The stored attack or damage slot
 * @returns {string}
 */
function formatAttackPool({ roll, keep, modifier }) {
  const bonus = modifier ? `${modifier >= 0 ? "+" : ""}${modifier.toFixed(0)}` : "";
  return `${roll}k${keep}${bonus}`;
}
