/**
 * L5R4 NPC Actor Sheet
 *
 * Provides character sheet interface for NPC actors in the Legend of the Five Rings
 * 4th Edition system. Handles display and interaction for non-player characters including
 * creatures, adversaries, and supporting cast.
 *
 * **Architecture:**
 * Extends BaseActorSheet to inherit common actor sheet functionality (Void Points,
 * item CRUD, roll handling, drag-drop). Adds NPC-specific features including Fear tests,
 * simplified skill display, and limited view for non-GM players.
 *
 * **NPC-Specific Features:**
 * - Fear Test button for creatures with Fear ability (see game rules)
 * - Optional Void Points display controlled by system setting
 * - Simplified trait adjustment (Shift+Click on ranks)
 * - Limited view for players without ownership
 * - Direct Void Ring rank editing (bypasses trait calculation used for PCs)
 *
 * **Foundry Integration:**
 * - Extends BaseActorSheet (which extends ActorSheetV2)
 * - Uses Application v2 event delegation pattern (Foundry v13+)
 * - Uses HandlebarsApplicationMixin with PARTS configuration
 * - Overrides _renderHTML for limited/full template selection
 * - Supports both full (GM/owner) and limited (observer) views
 *
 * **Game Mechanics:**
 * Implements L5R4 rules for NPC combat stats, skill checks, fear tests, and
 * Void Ring adjustment, skill rolls, and combat actions. NPCs may have simplified
 * stat blocks compared to PCs and don't require trait-to-ring calculations.
 *
 * **Foundry APIs:** ActorSheetV2, HandlebarsApplicationMixin, Actor#update
 * **Requires:** Foundry v13+
 *
 * @extends {BaseActorSheet}
 * @mixes HandlebarsApplicationMixin
 */

// Config
import { SYS_ID } from "../config/constants.js";
import { TEMPLATE } from "../config/templates.js";
import { STANCES } from "../config/localization.js";

// Utils
import { clamp } from "../utils/type-coercion.js";
import { on } from "../utils/dom.js";
import { getSortPref, sortWithPref } from "../utils/sorting.js";
import { getSectionCollapsedMap } from "../utils/section-state.js";
import { readWoundPenalty } from "../utils/mechanics.js";

// Documents
import { enhanceItemSheetData } from "../documents/item/integration/sheet-data.js";

// Services
import * as Fear from "../services/fear.js";
import { applyLongRest } from "../services/rest.js";
import { getActiveStances } from "../services/stance/core/helpers.js";
import { getMountedStatus } from "../services/mounted-combat.js";
import { SpellCastRoll } from "../services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../services/dice/rolls/maho-cast-roll.js";

// Local
import { BaseActorSheet } from "./base-actor-sheet.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";

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
 * @extends {BaseActorSheet}
 */
export default class L5R4NpcSheet extends BaseActorSheet {
  /**
   * Template part configuration for the NPC sheet.
   *
   * Defines the Handlebars template structure using Foundry v13 PARTS pattern.
   * Supports switching between full and limited views based on ownership.
   *
   * **Template Variants:**
   * - Full view (npc.hbs): Complete stat block for GM/owners
   * - Limited view (npc-limited.hbs): Restricted info for observers
   *
   * @static
   * @type {Object}
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
   * Default configuration options for the NPC sheet.
   *
   * Extends BaseActorSheet options to:
   * - Add "npc" class for styling specificity
   * - Set wider default width (840px) for NPC stat blocks
   * - Enable form auto-submission on field changes
   *
   * Filters out Foundry's default "pc"/"npc" classes before adding system-specific
   * "l5r4" and "npc" classes for proper CSS targeting.
   *
   * **Foundry v13 Pattern:**
   * Uses static DEFAULT_OPTIONS instead of defaultOptions() getter method.
   *
   * @static
   * @type {Object}
   * @override
   */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(
        c => c !== "pc" && c !== "npc" && c !== "l5r4"
      ),
      "l5r4",
      "npc"
    ],
    position: { ...(super.DEFAULT_OPTIONS.position ?? {}), width: 840 },
    form: { ...(super.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true }
  };

  /**
   * Routes click events on [data-action] elements to appropriate handlers.
   *
   * Implements event delegation pattern for all user interactions on the sheet.
   * Actions are identified by data-action attribute values on interactive elements.
   *
   * **Supported Actions:**
   * - inline-edit: Update item properties directly in the sheet
   * - item-create/delete/edit/expand/chat: Item CRUD operations
   * - item-sort-by: Change sort field/direction for item lists
   * - ring-rank-void: Adjust Void Ring rank (Shift+Click, NPC-specific)
   * - roll-ring/skill/trait/attack/damage/weapon-attack: Initiate dice rolls
   * - test-fear: Trigger Fear test for selected tokens
   * - trait-rank: Adjust trait ranks (Shift+Click)
   * - void-points-dots: Spend/regain Void Points
   * - wound-config: Open wound threshold configuration dialog
   *
   * **Implementation Note:**
   * Most actions delegate to BaseActorSheet or specialized handlers. NPC-specific
   * actions include ring-rank-void (direct Void Ring editing) and test-fear.
   *
   * @param {string} action - The data-action attribute value from the clicked element
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The element that was clicked
   * @protected
   * @override
   */
  _onAction(action, event, element) {
    switch (action) {
      case "apply-healing":
        return this._onApplyHealing(event, element);
      case "inline-edit":
        return this._onInlineItemEdit(event, element);
      case "item-create":
        return this._onItemCreate(event, element);
      case "item-delete":
        return this._onItemDelete(event, element);
      case "item-edit":
        return this._onItemEdit(event, element);
      case "item-expand":
        return this._onItemExpand(event, element);
      case "item-chat":
        return this._onItemHeaderToChat(event, element);
      case "item-sort-by":
        return this._onUnifiedSortClick(event, element);
      case "ring-rank-void":
        return this._onVoidAdjust(event, element, +1);
      case "roll-ring":
        return RollHandler.npcRingRoll(this._getHandlerContext(), event, element);
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
        return this._onCastSpell(event, element);
      case "test-fear":
        return this._onFearTest(event, element);
      case "trait-rank":
        return this._onTraitAdjust(event, element, +1);
      case "void-points-dots":
        return this._onVoidPointsAdjust(event, element, +1);
      case "wound-config":
        return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
    }
  }

  /**
   * Routes right-click (contextmenu) events on [data-action] elements.
   *
   * Handles reverse operations for rank adjustment actions (decrement instead of
   * increment). Falls back to _onAction for actions that don't have context variants.
   *
   * **Context-Specific Actions:**
   * - trait-rank: Decrement trait (Shift+Right-Click)
   * - ring-rank-void: Decrement Void Ring (Shift+Right-Click, NPC-specific)
   * - void-points-dots: Regain Void Point (Right-Click)
   *
   * @param {string} action - The data-action attribute value
   * @param {Event} event - The contextmenu event
   * @param {HTMLElement} element - The element that was right-clicked
   * @protected
   * @override
   */
  _onActionContext(action, event, element) {
    switch (action) {
      case "trait-rank":
        return this._onTraitAdjust(event, element, -1);
      case "ring-rank-void":
        return this._onVoidAdjust(event, element, -1);
      case "void-points-dots":
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
   * - inline-edit: Update item properties from form fields
   * - change-stance: Update character's combat stance
   *
   * @param {string} action - The data-action attribute value
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
   * Adjusts NPC's Void Ring rank by the specified delta.
   *
   * NPCs have direct Void Ring editing unlike PCs where Rings are derived from traits.
   * This allows GMs to quickly adjust NPC power levels and Void Point pools.
   *
   * **Safety Mechanism:**
   * Requires Shift key to prevent accidental adjustments. Works with KeyboardBehaviorMixin
   * to show visual cursor feedback when Shift is held.
   *
   * **Game Rules:**
   * Void Ring determines Void Points available (equal to Void Ring rank). Most creatures
   * don't have Void Rings, but some intelligent NPCs and supernatural beings do.
   *
   * **Implementation Note:**
   * Clamps to 0-9 range. Standard character range is 1-10 per core rules, but 0 is
   * allowed for flexibility (creatures without Void). Max of 9 instead of 10 may be
   * implementation choice for UI consistency.
   *
   * @param {Event} event - DOM event (must have shiftKey = true to execute)
   * @param {HTMLElement} element - Element containing Void Ring data
   * @param {number} delta - Direction to adjust (+1 to increase, -1 to decrease)
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onVoidAdjust(event, element, delta) {
    event?.preventDefault?.();

    // Safety check: require Shift key to prevent accidental adjustments
    if (!event?.shiftKey) {
      return;
    }

    const cur =
      Number(
        this.actor._source?.system?.rings?.void?.rank ?? this.actor.system?.rings?.void?.rank ?? 0
      ) || 0;
    const min = 0;
    const max = 9;
    const next = clamp(cur + (delta > 0 ? 1 : -1), min, max);
    if (next === cur) {
      return;
    }
    try {
      await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} NPC Sheet: failed to update void rank`, { err });
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
   * @param {Object} context - Template context data from _prepareContext
   * @param {Object} _options - Rendering options (unused)
   * @returns {Promise<{form: HTMLElement}>} Object containing rendered form element
   * @protected
   * @async
   * @override
   */
  async _renderHTML(context, _options) {
    const isLimited = !game.user.isGM && this.actor.limited;
    const path = isLimited ? TEMPLATE("actor/npc-limited.hbs") : TEMPLATE("actor/npc.hbs");
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    const host = document.createElement("div");
    host.innerHTML = html;
    // querySelector used here for template host parsing (temporary DOM, not live application)
    // This is a Foundry v13 pattern for extracting form element from rendered template string
    const form = host.querySelector("form") || host.firstElementChild || host;
    return { form };
  }

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
   * @param {Object} options - Rendering options
   * @returns {Promise<Object>} Complete context object for template rendering
   * @protected
   * @async
   * @override
   */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actorObj = this.actor;

    const all = this.actor.items.contents;
    const byType = t => all.filter(i => i.type === t);

    const activeStances = getActiveStances(actorObj);
    const currentStance = activeStances[0] || "";

    const mountedStatus = getMountedStatus(actorObj);

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
          return String(loc && loc !== key ? loc : it?.system?.trait ?? "");
        },
        roll: it => Number(it?.system?.rollDice ?? it?.system?.rank ?? 0) || 0,
        emphasis: it => {
          const trained = Array.isArray(it?.system?.trainedEmphases)
            ? it.system.trainedEmphases
            : [];
          return trained.join(", ");
        }
      };
      const pref = getSortPref(actorObj.id, "skills", Object.keys(cols), "name");
      return sortWithPref(byType("skill"), cols, pref, game.i18n?.lang);
    })();

    const collapsedSections = getSectionCollapsedMap(actorObj.id, [
      "skills",
      "weapons",
      "armors",
      "spells",
      "items"
    ]);

    const context = {
      ...base,
      actor: this.actor,
      system: actorObj.system,
      currentStance,
      mountedStatus,
      collapsedSections,

      // Show Void Points section only if system setting enabled
      showNpcVoidPoints: game.settings.get(SYS_ID, "allowNpcVoidPoints"),

      traitsEff: foundry.utils.duplicate(this.actor.system?._derived?.traitsEff ?? {}),

      skills,
      weapons: byType("weapon"),
      bows: byType("bow"),
      armors: byType("armor"),
      spells: byType("spell"),
      items: all.filter(i => i.type === "item" || i.type === "commonItem")
    };

    enhanceItemSheetData(context);
    context.config.stances = STANCES;
    return context;
  }

  /**
   * Post-render lifecycle hook for setting up interactive UI elements.
   *
   * Initializes UI components that require DOM access:
   * - Paints Void Points dots to match actor's current Void Points
   * - Sets up sort indicators for skills list headers
   * - Binds simple roll handlers (non-delegated clicks)
   * - Binds image editor click handler
   * - Initializes right-click context menu for items
   *
   * **Ownership Check:**
   * Only sets up interactive elements (sort indicators, context menus) if current
   * user owns the actor. Void Points painting happens regardless for visual consistency.
   *
   * **Foundry Lifecycle:**
   * Called automatically after template rendering. Always call super._onRender first
   * to ensure parent class setup (event delegation, image error handling) completes.
   *
   * @param {Object} context - Template context data used for rendering
   * @param {Object} options - Rendering options
   * @returns {Promise<void>}
   * @protected
   * @async
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    this._paintVoidPointsDots(root);
    if (!this.actor.isOwner) {
      return;
    }

    this._initializeSortIndicators(root, "skills", ["name", "rank", "trait", "roll", "emphasis"]);

    on(root, ".simple-roll", "click", ev =>
      RollHandler.npcSimpleRoll(this._getHandlerContext(), ev)
    );

    on(root, "[data-edit='img']", "click", ev => this._onEditImage(ev, ev.currentTarget));
  }

  /**
   * Returns allowed sort field names for a given scope.
   *
   * Defines which columns can be used for sorting in each item list.
   * Currently only skills list supports sorting by multiple fields.
   *
   * **Skills Sort Fields:**
   * - name: Alphabetical by skill name
   * - rank: Skill rank (0-10)
   * - trait: Associated trait (localized)
   * - roll: Total rolled dice (skill + trait)
   * - emphasis: Skill emphasis (if any)
   *
   * @param {string} scope - Sort scope identifier ("skills", etc.)
   * @returns {string[]} Array of allowed sort field names for the scope
   * @protected
   * @override
   */
  _getAllowedSortKeys(scope) {
    const keys = {
      skills: ["name", "rank", "trait", "roll", "emphasis"]
    };
    return keys[scope] ?? ["name"];
  }

  /**
   * Applies natural healing to the NPC.
   *
   * **Game Rules Context:**
   * NPCs heal (Stamina × 2) + Insight Rank wounds per night of rest, same as PCs.
   * Healing cannot reduce suffered wounds below 0 (no over-healing).
   *
   * **Implementation:**
   * Delegates to healing service which handles calculation, actor update, and chat output.
   *
   * @param {Event} event - Click event on healing button
   * @param {HTMLElement} element - Button element (unused)
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onApplyHealing(event, _element) {
    event?.preventDefault?.();
    await applyLongRest(this.actor);
  }

  /**
   * Initiates a Fear resistance test against this NPC.
   *
   * Triggers Fear tests for all currently selected tokens (excluding the NPC itself).
   * Selected characters make Raw Willpower rolls vs TN (5 + 5×Fear Rank), adding their
   * Honor Rank to the roll.
   *
   * **Game Rules:**
   * Creatures with Fear ability automatically inflict Fear at encounter start. Characters
   * who fail the test suffer -Xk0 penalty to all rolls (X = Fear Rank) for the encounter.
   * Catastrophic failure (fail by 15+) causes character to flee or cower.
   *
   * **Requirements:**
   * - NPC must have Fear ability (fear.rank > 0)
   * - At least one token must be selected on the canvas
   * - Selected tokens must be different from the NPC
   *
   * **Implementation:**
   * Delegates to Fear service which handles roll mechanics and chat output.
   *
   * @param {Event} event - DOM event triggering the Fear test
   * @param {HTMLElement} element - Element that was clicked
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onFearTest(event, _element) {
    event?.preventDefault?.();

    if (!this.actor.hasFear?.()) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noFear"));
      return;
    }

    await Fear.handleFearClick({ npc: this.actor });
  }

  /**
   * Initiates a spell casting roll for an NPC shugenja.
   *
   * **Game Rules Context:**
   * Spell Casting rolls determine if a shugenja successfully invokes the kami:
   * - Formula: (Ring + School Rank)k(Ring)
   * - TN: 5 + (Mastery Level × 5)
   * - Affinity: +1 effective School Rank (auto-detected)
   * - Deficiency: -1 effective School Rank (auto-detected)
   * - Spell slots consumed automatically (elemental or Void bonus slots)
   *
   * **Automatic Detection:**
   * - Affinity/Deficiency: Detected from actor's school and applied automatically
   * - Target Number: Calculated from spell's Mastery Level automatically
   * - Spell Slots: Consumed automatically (elemental preferred, void fallback)
   *
   * **Implementation:**
   * Extracts spell data from .item row, shows simplified dialog (wound penalty,
   * void, modifiers, raises only), then executes spell casting with all automatic
   * detection and slot management handled by SpellCastRoll service. Dialog always
   * appears to give user control over modifiers and raises before casting.
   *
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-item-id for spell lookup
   * @protected
   */
  _onCastSpell(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const spell = id ? this.actor.items.get(id) : null;
    if (!spell || spell.type !== "spell") {
      return;
    }

    // Route to maho casting if spell is blood magic
    if (spell.system?.maho) {
      return MahoCastRoll({
        actor: this.actor,
        spell,
        woundPenalty: readWoundPenalty(this.actor),
        showDialog: true
      });
    }

    return SpellCastRoll({
      actor: this.actor,
      spell,
      woundPenalty: readWoundPenalty(this.actor),
      showDialog: true // Always show dialog for user control
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
   * @param {Object} [updateData={}] - Additional update data from parent classes
   * @returns {Object} Validated and coerced data ready for actor.update()
   * @protected
   * @override
   */
  _prepareSubmitData(event, form, formData, updateData = {}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) {
      submit.name = this.actor.name || "Unnamed";
    }
    return submit;
  }
}
