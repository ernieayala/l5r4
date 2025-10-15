/**
 * Base Actor Sheet
 *
 * Abstract base class for all L5R4 actor sheets (PC and NPC). Provides shared
 * functionality including event delegation, handler orchestration, Void Points
 * management, drag-and-drop, item CRUD operations, and roll handling.
 *
 * **Architecture:**
 * Uses a handler delegation pattern where UI interactions are routed to specialized
 * handler classes (VoidPointsHandler, ItemCRUDHandler, RollHandler, etc.). This
 * separation keeps the sheet focused on rendering and event routing while handlers
 * encapsulate business logic.
 *
 * **Foundry Integration:**
 * - Extends ActorSheetV2 (Foundry v13+ Application v2 architecture)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Implements event delegation pattern via data-action attributes
 * - Leverages _onRender and _prepareContext lifecycle hooks
 * - Overrides _getHeaderControls to prevent mixin-chain duplicates
 *
 * **Event Delegation:**
 * All user interactions are handled through delegated events on [data-action] elements.
 * Actions are routed to _onAction (click), _onActionContext (right-click), or
 * _onActionChange (change) methods, which subclasses override to implement behavior.
 *
 * **Handler Pattern:**
 * Handlers receive a context object from _getHandlerContext() containing the actor,
 * sheet element, and sheet class name. This allows handlers to operate independently
 * while maintaining access to necessary sheet state.
 *
 * **Game Mechanics:**
 * Implements trait adjustment (Shift+Click) with bounds checking (ranks 1-10),
 * Void Points management, and delegates skill/attack/damage rolls to RollHandler.
 *
 * **Foundry APIs:** ActorSheetV2, HandlebarsApplicationMixin, Actor#update
 * **Requires:** Foundry v13+
 *
 * @abstract
 * @extends {foundry.applications.sheets.ActorSheetV2}
 * @mixes HandlebarsApplicationMixin
 * @mixes KeyboardBehaviorMixin
 */

import { on } from "../utils/dom.js";
import { SYS_ID } from "../config/constants.js";
import { clamp } from "../utils/type-coercion.js";
import { iconPath } from "../config/icons.js";
import { KeyboardBehaviorMixin } from "./mixins/keyboard-behavior.js";
import { VoidPointsHandler } from "./handlers/void-points-handler.js";
import { DragDropHandler } from "./handlers/drag-drop-handler.js";
import { ItemCRUDHandler } from "./handlers/item-crud-handler.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { SortHandler } from "./handlers/sort-handler.js";
import { openImageEditor } from "./ui/image-editor.js";
import { setupItemContextMenu } from "./ui/context-menu-builder.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class BaseActorSheet extends KeyboardBehaviorMixin(
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)
) {
  /**
   * Default configuration options for the actor sheet.
   *
   * Merges with ActorSheetV2 defaults to configure sheet behavior:
   * - Filters out Foundry's default "pc"/"npc" classes, adds "l5r4" system class
   * - Enables automatic form submission on change and close
   *
   * **Foundry v13 Pattern:**
   * Uses static DEFAULT_OPTIONS instead of defaultOptions() getter.
   *
   * @static
   * @type {Object}
   */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc"),
      "l5r4"
    ],
    form: {
      ...(super.DEFAULT_OPTIONS.form ?? {}),
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /**
   * Lifecycle hook called when the sheet is rendered into the DOM.
   *
   * Sets up event delegation for all user interactions via [data-action] attributes,
   * implementing the Foundry v13 Application v2 event delegation pattern. Ensures
   * event handlers are only bound once per root element to prevent duplicate listeners.
   *
   * **Event Delegation:**
   * - click: Routes to _onAction(action, event, element)
   * - contextmenu: Routes to _onActionContext(action, event, element)
   * - change: Routes to _onActionChange(action, event, element)
   *
   * **Guard Logic:**
   * Tracks bound root element to prevent duplicate event listener registration
   * when sheet re-renders. Only binds events if actor is owned by current user.
   *
   * **Foundry Lifecycle:**
   * Called automatically by Foundry after template rendering. Always call
   * super._onRender first to ensure parent class setup completes.
   *
   * @param {Object} context - Template context data prepared by _prepareContext
   * @param {Object} options - Rendering options passed to the sheet
   * @returns {Promise<void>}
   * @protected
   * @async
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    if (this._boundRoot === root) return;
    this._boundRoot = root;
    if (!this.actor?.isOwner) return;

    on(root, "[data-action]", "click", (ev, el) => {
      const action = el.getAttribute("data-action");
      this._onAction(action, ev, el);
    });

    on(
      root,
      "[data-action]",
      "contextmenu",
      (ev, el) => {
        ev.preventDefault();
        const action = el.getAttribute("data-action");
        this._onActionContext(action, ev, el);
      },
      { capture: true }
    );

    on(root, "[data-action]", "change", (ev, el) => {
      const action = el.getAttribute("data-action");
      this._onActionChange(action, ev, el);
    });

    this._setupImageErrorHandling(root);

    this._setupConditionalCursor(root);
  }

  /**
   * Sets up fallback handling for broken actor images.
   *
   * Attaches error event listeners to all .actor-img elements that replace
   * broken images with type-appropriate default icons (pc.webp or npc.webp).
   * Uses data-errorHandled flag to ensure handlers are only attached once.
   *
   * **Implementation:**
   * Prevents multiple error handlers from being attached during re-renders by
   * marking each image with dataset.errorHandled after first attachment.
   *
   * @param {HTMLElement} root - Sheet root element to query for actor images
   * @private
   */
  _setupImageErrorHandling(root) {
    const actorImages = root.querySelectorAll(".actor-img");
    actorImages.forEach(img => {
      if (!img.dataset.errorHandled) {
        img.dataset.errorHandled = "true";
        img.addEventListener("error", () => {
          const defaultImage =
            this.actor.type === "npc" ? iconPath("npc.webp") : iconPath("pc.webp");
          img.src = defaultImage;
        });
      }
    });
  }

  /**
   * Deduplicates header controls from mixin chain.
   *
   * The nested mixin chain causes super._getHeaderControls() to return duplicate
   * entries. Filters by action to ensure each control appears only once in the
   * header dropdown menu.
   *
   * @returns {ApplicationHeaderControlsEntry[]} Deduplicated header controls
   * @protected
   * @override
   */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    const seen = new Set();
    return controls.filter(control => {
      if (seen.has(control.action)) return false;
      seen.add(control.action);
      return true;
    });
  }

  /**
   * Extension point for handling click events on [data-action] elements.
   *
   * Subclasses override this method to implement action routing via switch
   * statements. Called by the delegated click handler in _onRender.
   *
   * **Foundry v13 Pattern:**
   * Part of Application v2 event delegation architecture. Actions are
   * identified by data-action attribute values on interactive elements.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The click event
   * @param {HTMLElement} _el - The element that was clicked
   * @protected
   */
  _onAction(_action, _ev, _el) {}

  /**
   * Extension point for handling right-click (contextmenu) events on [data-action] elements.
   *
   * Subclasses override this method to implement context menu behaviors.
   * Called by the delegated contextmenu handler in _onRender.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The contextmenu event
   * @param {HTMLElement} _el - The element that was right-clicked
   * @protected
   */
  _onActionContext(_action, _ev, _el) {}

  /**
   * Extension point for handling change events on [data-action] form elements.
   *
   * Subclasses override this method to implement form field change behaviors.
   * Called by the delegated change handler in _onRender.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The change event
   * @param {HTMLElement} _el - The form element that changed
   * @protected
   */
  _onActionChange(_action, _ev, _el) {}

  /**
   * Closes the sheet and performs cleanup.
   *
   * Clears the bound root element reference to allow fresh event binding
   * if the sheet is reopened. Delegates to parent class for standard
   * Foundry close behavior (save position, remove from DOM, etc.).
   *
   * **Foundry Lifecycle:**
   * Called when user closes sheet or by Application API. Always call
   * super.close to ensure proper cleanup chain execution.
   *
   * @param {Object} [options={}] - Options passed to Application.close
   * @returns {Promise<void>}
   * @async
   * @override
   */
  async close(options = {}) {
    // Clear bound root to allow fresh event delegation on reopen
    this._boundRoot = null;
    return super.close(options);
  }

  /* ---------------------------------- */
  /* Shared Void Points Management       */
  /* ---------------------------------- */

  /**
   * Adjusts character Void Points by the specified delta.
   *
   * Delegates to VoidPointsHandler for the actual adjustment logic.
   * Void Points represent moments of enlightened insight and are equal
   * to the character's Void Ring (max 10, clamped to 9 in implementation).
   *
   * **Game Rules:**
   * Characters have Void Points equal to their Void Ring rank. These refresh
   * daily after rest and can be spent to enhance rolls (+1k1), reduce damage,
   * or increase Initiative/Armor TN.
   *
   * @param {Event} event - DOM event triggering the adjustment
   * @param {HTMLElement} element - Element that was interacted with
   * @param {number} delta - Amount to adjust (+1 to spend, -1 to regain)
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onVoidPointsAdjust(event, element, delta) {
    return VoidPointsHandler.adjust(this._getHandlerContext(), event, delta);
  }

  /**
   * Updates the visual representation of Void Points dots in the UI.
   *
   * Delegates to VoidPointsHandler to synchronize the dot display with
   * the actor's current Void Point value.
   *
   * @param {HTMLElement} root - Sheet root element containing void-points-dots
   * @protected
   */
  _paintVoidPointsDots(root) {
    VoidPointsHandler.paint(root, this.actor);
  }

  /* ---------------------------------- */
  /* Shared Drag & Drop Handling        */
  /* ---------------------------------- */

  /**
   * Handles drop events on the sheet (items or actors).
   *
   * Delegates to DragDropHandler to route to appropriate handler based
   * on the type of data being dropped. Supports dropping items onto
   * characters and NPCs.
   *
   * **Foundry Pattern:**
   * Overrides ActorSheetV2._onDrop to implement custom drag-drop behavior.
   *
   * @param {DragEvent} event - The drop event from Foundry's drag-drop system
   * @returns {Promise<void>}
   * @protected
   * @async
   * @override
   */
  async _onDrop(event) {
    return DragDropHandler.handleDrop(this._getHandlerContext(), event);
  }

  /**
   * Handles dropping an item onto the sheet.
   *
   * Delegates to DragDropHandler for item-specific drop logic (adding
   * items to inventory, equipment slots, etc.).
   *
   * @param {DragEvent} event - The drop event
   * @param {Object} data - Dropped item data from Foundry drag-drop system
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onDropItem(event, data) {
    return DragDropHandler.handleItemDrop(this._getHandlerContext(), event, data);
  }

  /**
   * Handles dropping an actor onto the sheet.
   *
   * Delegates to DragDropHandler for actor-specific drop logic.
   *
   * @param {DragEvent} event - The drop event
   * @param {Object} data - Dropped actor data from Foundry drag-drop system
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onDropActor(event, data) {
    return DragDropHandler.handleActorDrop(this._getHandlerContext(), event, data);
  }

  /* ---------------------------------- */
  /* Shared Image Editing                */
  /* ---------------------------------- */

  /**
   * Opens the image editor for the actor's portrait.
   *
   * Delegates to openImageEditor utility to show Foundry's FilePicker
   * configured for actor image selection.
   *
   * @param {Event} event - DOM event triggering the image edit
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onEditImage(event) {
    event?.preventDefault?.();
    return openImageEditor(this.actor, this.position);
  }

  /* ---------------------------------- */
  /* Shared Item CRUD Operations         */
  /* ---------------------------------- */

  /**
   * Creates a new item on the actor.
   *
   * Delegates to ItemCRUDHandler to handle item creation from templates
   * or defaults. Item type is determined from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item creation
   * @param {HTMLElement} element - Element containing item type in data attributes
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onItemCreate(event, element) {
    return ItemCRUDHandler.create(this._getHandlerContext(), event, element);
  }

  /**
   * Opens the item sheet for editing an embedded item.
   *
   * Delegates to ItemCRUDHandler to show the item's configuration sheet.
   * Item ID is extracted from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item edit
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @protected
   */
  _onItemEdit(event, element) {
    return ItemCRUDHandler.edit(this._getHandlerContext(), event, element);
  }

  /**
   * Deletes an embedded item from the actor.
   *
   * Delegates to ItemCRUDHandler to handle deletion with confirmation.
   * Item ID is extracted from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item deletion
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onItemDelete(event, element) {
    return ItemCRUDHandler.deleteItem(this._getHandlerContext(), event, element);
  }

  /**
   * Toggles expansion state of an item in the sheet's item list.
   *
   * Delegates to ItemCRUDHandler to show/hide extended item details.
   * Uses data attributes or local state to track expansion.
   *
   * @param {Event} event - DOM event triggering item expansion toggle
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @protected
   */
  _onItemExpand(event, element) {
    return ItemCRUDHandler.expand(this._getHandlerContext(), event, element);
  }

  /**
   * Handles inline editing of item properties in the sheet.
   *
   * Delegates to ItemCRUDHandler for updating item properties directly
   * from form fields in the sheet without opening the full item sheet.
   *
   * @param {Event} event - DOM change event from inline edit field
   * @param {HTMLElement} element - Form element containing new value
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onInlineItemEdit(event, element) {
    return ItemCRUDHandler.inlineEdit(this._getHandlerContext(), event, element);
  }

  /**
   * Posts an item's header information to chat.
   *
   * Delegates to ItemCRUDHandler to create a chat message displaying
   * the item's name, type, and basic information. Useful for showing
   * weapons, spells, or equipment to other players.
   *
   * @param {Event} ev - DOM event triggering chat post
   * @param {HTMLElement} el - Element containing item ID in data attributes
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onItemHeaderToChat(ev, el) {
    return ItemCRUDHandler.toChat(this._getHandlerContext(), ev, el);
  }

  /* ---------------------------------- */
  /* Shared Context Menu Setup          */
  /* ---------------------------------- */

  /**
   * Initializes right-click context menu for item list entries.
   *
   * Sets up ContextMenu instance for item operations (edit, delete,
   * duplicate, send to chat). Preserves existing menu instance to
   * prevent memory leaks from duplicate menu creation.
   *
   * **Foundry Pattern:**
   * Uses ContextMenu API to attach right-click menus to item entries.
   *
   * @param {HTMLElement} root - Sheet root element to attach context menu to
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _setupItemContextMenu(root) {
    this._itemContextMenu = await setupItemContextMenu(root, this.actor, this._itemContextMenu);
  }

  /* ---------------------------------- */
  /* Shared Roll Methods                 */
  /* ---------------------------------- */

  /**
   * Initiates a skill roll.
   *
   * Delegates to RollHandler to construct and evaluate a skill roll using
   * the (Skill + Trait)k(Trait) formula from L5R4 rules.
   *
   * **Game Rules:**
   * Skill rolls use XkY notation where X = Skill rank + Trait rank and
   * Y = Trait rank. Dice explode on 10s.
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing skill/trait info in data attributes
   * @protected
   */
  _onSkillRoll(event, element) {
    return RollHandler.skillRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates an attack roll.
   *
   * Delegates to RollHandler to construct an attack roll (typically a weapon
   * skill roll against opponent's Armor TN).
   *
   * **Game Rules:**
   * Attack rolls use weapon skills paired with Agility or other traits.
   * Success determined by meeting/exceeding target's Armor TN (Reflexes × 5 + 5 + armor).
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing attack info in data attributes
   * @protected
   */
  _onAttackRoll(event, element) {
    return RollHandler.attackRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates a weapon-specific attack roll.
   *
   * Delegates to RollHandler for weapon attack with item-specific modifiers
   * and properties (weapon skill, damage, special abilities).
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing weapon item ID in data attributes
   * @protected
   */
  _onWeaponAttackRoll(event, element) {
    return RollHandler.weaponAttackRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates a damage roll.
   *
   * Delegates to RollHandler to roll weapon damage (DR + Strength for melee).
   *
   * **Game Rules:**
   * Melee damage = (Weapon DR + Strength)kKeep. For example, a katana
   * (3k2) wielded with Strength 3 rolls 6k2 damage.
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing weapon/damage info in data attributes
   * @protected
   */
  _onDamageRoll(event, element) {
    return RollHandler.damageRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates a raw trait roll.
   *
   * Delegates to RollHandler to roll XkX where X = trait rank. Trait rolls
   * are used for tests of raw ability without skill training.
   *
   * **Game Rules:**
   * Trait rolls use XkX notation where both rolled and kept dice equal
   * the trait rank. Used for raw ability checks (resisting, holding breath, etc.).
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing trait info in data attributes
   * @protected
   */
  _onTraitRoll(event, element) {
    return RollHandler.traitRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Handles trait rank click - rolls trait or adjusts rank based on Shift key.
   *
   * **Without Shift Key:**
   * Performs a trait roll (XkX where X = trait rank) via RollHandler.traitRoll().
   * This allows quick trait rolls by clicking directly on the trait rank.
   *
   * **With Shift Key:**
   * Increments or decrements the specified trait rank, clamping to valid
   * range (0-10). Shift key acts as a safety mechanism against accidental adjustments.
   *
   * **Game Rules:**
   * Traits (Stamina, Willpower, Strength, Perception, Agility, Intelligence,
   * Reflexes, Awareness) have ranks from 1-10. Normal humans start at rank 2.
   * Advancement cost = 4 × new rank XP (e.g., 2→3 costs 12 XP).
   *
   * **Safety Mechanism:**
   * Rank adjustment only executes if Shift key is held. Works in conjunction with
   * KeyboardBehaviorMixin which provides visual cursor feedback.
   *
   * @param {Event} event - DOM event (shiftKey determines roll vs adjust behavior)
   * @param {HTMLElement} element - Element with data-trait attribute
   * @param {number} delta - Direction to adjust (+1 to increase, -1 to decrease)
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onTraitAdjust(event, element, delta) {
    event?.preventDefault?.();

    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!key) return;

    // If shift key NOT pressed, perform trait roll instead of adjustment
    if (!event?.shiftKey) {
      return RollHandler.traitRoll(this._getHandlerContext(), event, element);
    }

    const cur = Number(this.actor.system?.traits?.[key] ?? 0) || 0;
    // Clamp to 0-10 per L5R4 rules (traits ranked 1-10, but 0 allowed for flexibility)
    const next = clamp(cur + (delta > 0 ? 1 : -1), 0, 10);
    if (next === cur) return;

    try {
      await this.actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} BaseActorSheet: failed to update trait`, { err, key, cur, next });
    }
  }

  /* Sorting System -------------------------------------------------------- */

  /**
   * Initializes sort direction indicators in the UI.
   *
   * Delegates to SortHandler to set up visual indicators (arrows) showing
   * current sort field and direction for item lists.
   *
   * @param {HTMLElement} root - Sheet root element
   * @param {string} scope - Sort scope identifier (e.g., "skills", "items")
   * @param {string[]} allowedKeys - Array of sortable field names
   * @protected
   */
  _initializeSortIndicators(root, scope, allowedKeys) {
    SortHandler.initializeIndicators(root, this.actor.id, scope, allowedKeys);
  }

  /**
   * Handles click on a sort header to change sort field/direction.
   *
   * Delegates to SortHandler to toggle sort field or reverse direction,
   * then triggers sheet re-render to display sorted list.
   *
   * @param {Event} event - DOM click event on sort header
   * @param {HTMLElement} element - Sort header element with data attributes
   * @returns {Promise<void>}
   * @protected
   * @async
   */
  async _onUnifiedSortClick(event, element) {
    return SortHandler.handleClick(
      this.actor.id,
      event,
      element,
      scope => this._getAllowedSortKeys(scope),
      () => this.render()
    );
  }

  /**
   * Returns allowed sort keys for a given scope.
   *
   * Extension point for subclasses to define sortable fields per list type.
   * Base implementation only allows sorting by "name".
   *
   * @param {string} _scope - Sort scope identifier (e.g., "skills", "items")
   * @returns {string[]} Array of allowed sort field names
   * @protected
   */
  _getAllowedSortKeys(_scope) {
    return ["name"];
  }

  /* Helper Methods -------------------------------------------------------- */

  /**
   * Constructs a context object for handler delegation.
   *
   * Creates a standardized context passed to all handler classes, providing
   * them with access to the actor, sheet element, and sheet class name without
   * coupling handlers to sheet implementation details.
   *
   * **Handler Pattern:**
   * This context object is the primary interface between sheets and handlers.
   * Handlers should only access sheet state through this context, not by
   * storing sheet references.
   *
   * @returns {Object} Handler context
   * @returns {L5R4Actor} returns.actor - The actor document
   * @returns {HTMLElement} returns.element - The sheet's root element
   * @returns {string} returns.sheetClassName - Class name for logging/debugging
   * @protected
   */
  _getHandlerContext() {
    return {
      actor: this.actor,
      element: this.element,
      sheetClassName: this.constructor.name
    };
  }
}
