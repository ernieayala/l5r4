/**
 * @module sheets/npc-sheet
 * @description The NPC actor sheet, for creatures, adversaries, and supporting cast. On top of BaseActorSheet it
 * adds the Fear test, the NPC's three attack slots, direct Void Ring editing (an NPC's Rings are not derived from
 * its Traits), Void Points shown only when the Void Ring is 1 or more, and a limited view (npc-limited.hbs) for a
 * player who does not own the NPC.
 */
import { SYS_ID } from "../config/constants.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { ACTION_TYPES, STANCES } from "../config/localization.js";
import { NPC_SORT_KEYS } from "../config/sort-keys.js";
import { getClamped } from "../utils/type-coercion.js";
import { T } from "../utils/localization.js";
import { on } from "../utils/dom.js";
import { applySortPref } from "../utils/sorting.js";
import { getActiveStance } from "../utils/stances.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";
import { summaryOf } from "../documents/summary.js";
import * as Fear from "../services/fear.js";
import { getSortPref } from "../services/sort-preferences.js";
import { getSectionCollapsedMap } from "../services/section-state.js";
import { applyLongRest } from "../services/rest.js";
import { rollSpellCast } from "../services/dice/rolls/spell-cast-roll.js";
import { rollMahoCast } from "../services/dice/rolls/maho-cast-roll.js";
import NpcAttackConfigApplication from "../apps/npc-attack-config.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { ItemCrudHandler } from "./handlers/item-crud-handler.js";
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
      return { num, key: `attack${num}`, attack, damage, empty, actionLabel };
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
        return this._onApplyHealing(event, element);
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
        return this._onVoidAdjust(event, element, +1);
      // The arrows step the Void Ring without Shift, like the Trait arrows (issue #30)
      case "increase-void-ring":
        return this._onVoidAdjust(
          { preventDefault: () => event.preventDefault(), shiftKey: true },
          element,
          +1
        );
      case "decrease-void-ring":
        return this._onVoidAdjust(
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
        return this._onCastSpell(event, element);
      case "test-fear":
        return this._onFearTest(event, element);
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
        return this._onEditAttack(event, element);
      case "delete-attack":
        return this._onDeleteAttack(event, element);
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
        return this._onVoidAdjust(event, element, -1);
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
    const next = getClamped(cur + (delta > 0 ? 1 : -1), min, max);
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
   * Returns allowed sort field names for a given scope.
   *
   * Defines which columns can be used for sorting in each item list.
   * Currently only skills list supports sorting by multiple fields.
   *
   * @param {string} scope - Sort scope identifier (e.g., "skills", "weapons")
   * @returns {string[]} Array of allowed column keys for sorting
   * @override
   */
  _getAllowedSortKeys(scope) {
    return NPC_SORT_KEYS[scope] ?? ["name"];
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
   * @param {HTMLElement} _element - Button element (unused)
   * @returns {Promise<void>}
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
   * @param {HTMLElement} _element - Element that was clicked
   * @returns {Promise<void>}
   */
  async _onFearTest(event, _element) {
    event?.preventDefault?.();

    if (!this.actor.hasFear?.()) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noFear"));
      return;
    }

    await Fear.onFearClick({ npc: this.actor });
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
   * detection and slot management handled by rollSpellCast service. Dialog always
   * appears to give user control over modifiers and raises before casting.
   *
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-item-id for spell lookup
   * @returns {Promise<ChatMessage|null>|undefined} The cast's chat message, or undefined when the row holds no spell
   */
  _onCastSpell(event, element) {
    event.preventDefault();
    const row = element.closest("[data-item-id]");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const spell = id ? this.actor.items.get(id) : null;
    if (!spell || spell.type !== "spell") {
      return;
    }

    // Route to maho casting if spell is blood magic
    const cast = spell.system?.maho ? rollMahoCast : rollSpellCast;
    return cast({ actor: this.actor, spell, showDialog: !event.shiftKey });
  }

  /**
   * Opens attack editor dialog for NPC attack configuration.
   *
   * Launches NpcAttackConfigApplication to edit attack and damage values
   * for the specified attack slot (attack1-3). "Add Attack" opens it on the first empty slot.
   *
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-attack-key attribute
   * @returns {Promise<void>}
   */
  async _onEditAttack(event, element) {
    event?.preventDefault?.();

    const attackKey = element.dataset.attackKey;
    if (!attackKey) {
      console.warn("L5R4 | No attack key found on element", element);
      return;
    }

    const editor = new NpcAttackConfigApplication(this.actor, attackKey);

    editor.render(true);
  }

  /**
   * Removes an NPC attack by clearing its slot: the attack and its damage go back to empty, and the sheet hides
   * the row. Asks first unless Shift is held, as deleting an item does.
   *
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-attack-key attribute
   * @returns {Promise<void>}
   */
  async _onDeleteAttack(event, element) {
    event?.preventDefault?.();
    const attackKey = element.dataset.attackKey;
    const damageKey = attackKey.replace("attack", "damage");
    const attack = this.actor.system[attackKey];

    if (!event.shiftKey) {
      const name =
        attack.name ||
        `${game.i18n.localize("l5r4.ui.mechanics.combat.attack")} ${attackKey.replace("attack", "")}`;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "l5r4.ui.dialogs.deleteAttack.title" },
        content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.confirm, {
          question: game.i18n.localize("l5r4.ui.dialogs.deleteAttack.content", { name })
        })
      });
      if (!confirmed) {
        return;
      }
    }

    await this.actor.update({
      [`system.${attackKey}`]: { name: "", roll: 0, keep: 0, modifier: 0, type: "" },
      [`system.${damageKey}`]: { roll: 0, keep: 0, modifier: 0, type: "" }
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
