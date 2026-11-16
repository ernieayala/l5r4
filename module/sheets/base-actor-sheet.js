/**
 * @module sheets/base-actor-sheet
 * @description The base class of the PC and NPC actor sheets: event delegation on [data-action] elements, Void
 * Points, drag and drop, item create/edit/delete, rolls, Trait adjustment, and sorting, each routed to a handler
 * class in module/sheets/handlers/. Clicks go to _onAction, right-clicks to _onActionContext, and changes to
 * _onActionChange, which the subclasses override; handlers receive the context from _getHandlerContext().
 */
import { SORT_COLUMNS, SORT_KEYS } from "../config/sort-keys.js";
import { getIconPath } from "../utils/icons.js";
import { on } from "../utils/dom.js";
import { KeyboardBehaviorMixin } from "../mixins/keyboard-behavior-mixin.js";
import { VoidPointsHandler } from "./handlers/void-points-handler.js";
import { DragDropHandler } from "./handlers/drag-drop-handler.js";
import { ItemCrudHandler } from "./handlers/item-crud-handler.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { SortHandler } from "./handlers/sort-handler.js";
import { TraitHandler } from "./handlers/trait-handler.js";
import { openImageEditor } from "./ui/image-editor.js";
import { TRAIT_DRAG_TYPE } from "./ui/macros.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The shared base of the L5R4 actor sheets.
 * @abstract
 * @augments {foundry.applications.sheets.ActorSheetV2}
 * @mixes HandlebarsApplicationMixin
 * @mixes KeyboardBehaviorMixin
 */
export class BaseActorSheet extends KeyboardBehaviorMixin(
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)
) {
  /**
   * This class's own options: the "l5r4" class, the "l5r4-actor-sheet" block class the sheet's own styles sit under
   * (scss/sheets/_actor-sheet.scss), and saving each field as it changes. ApplicationV2 merges every
   * class's DEFAULT_OPTIONS up the chain and concatenates arrays [src: client/applications/api/application.mjs:437-484],
   * so a class lists only its own entries; copying the parent's in would repeat them.
   *
   * @type {object}
   */
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "l5r4-actor-sheet"],
    form: { submitOnChange: true }
  };

  /**
   * Adds the sort header columns of every list (module/config/sort-keys.js), which the section partials pass to
   * templates/actor/_partials/_sort-header.hbs.
   *
   * @param {object} options - Rendering options
   * @returns {Promise<object>} The context, with `sortColumns`
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.sortColumns = SORT_COLUMNS;
    return context;
  }

  /**
   * Lifecycle hook called when the sheet is rendered into the DOM.
   *
   * Sets up event delegation for all user interactions via [data-action] attributes.
   * Ensures event handlers are only bound once per root element to prevent duplicate listeners.
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
   * @param {object} context - Template context data prepared by _prepareContext
   * @param {object} options - Rendering options passed to the sheet
   * @returns {Promise<void>}
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    if (this._boundRoot === root) {
      return;
    }
    this._boundRoot = root;
    if (!this.actor?.isOwner) {
      return;
    }

    on(root, "click", {
      selector: "[data-action]",
      handler: (ev, el) => {
        const action = el.getAttribute("data-action");
        this._onAction(action, ev, el);
      }
    });

    on(root, "contextmenu", {
      selector: "[data-action]",
      handler: (ev, el) => {
        ev.preventDefault();
        const action = el.getAttribute("data-action");
        this._onActionContext(action, ev, el);
      },
      capture: true
    });

    on(root, "change", {
      selector: "[data-action]",
      handler: (ev, el) => {
        const action = el.getAttribute("data-action");
        this._onActionChange(action, ev, el);
      }
    });

    this._setupImageErrorHandling(root);

    this._setupConditionalCursor(root);
  }

  /**
   * Sets up fallback handling for broken actor images.
   *
   * Attaches error event listeners to all [data-actor-image] elements that replace
   * broken images with type-appropriate default icons (pc.webp or npc.webp).
   * Uses data-errorHandled flag to ensure handlers are only attached once.
   *
   * **Implementation:**
   * Prevents multiple error handlers from being attached during re-renders by
   * marking each image with dataset.errorHandled after first attachment.
   *
   * @param {HTMLElement} root - Sheet root element to query for actor images
   */
  _setupImageErrorHandling(root) {
    const actorImages = root.querySelectorAll("[data-actor-image]");
    actorImages.forEach(img => {
      if (!img.dataset.errorHandled) {
        img.dataset.errorHandled = "true";
        img.addEventListener("error", () => {
          const defaultImage =
            this.actor.type === "npc" ? getIconPath("npc.webp") : getIconPath("pc.webp");
          img.src = defaultImage;
        });
      }
    });
  }

  /**
   * Extension point for handling click events on [data-action] elements.
   *
   * Subclasses override this method to implement action routing via switch
   * statements. Called by the delegated click handler in _onRender.
   *
   * Actions are identified by data-action attribute values on interactive elements.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The click event
   * @param {HTMLElement} _el - The element that was clicked
   */
  _onAction(_action, _ev, _el) {
    // Extension point for subclasses
  }

  /**
   * Extension point for handling right-click (contextmenu) events on [data-action] elements.
   *
   * Subclasses override this method to implement context menu behaviors.
   * Called by the delegated contextmenu handler in _onRender.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The contextmenu event
   * @param {HTMLElement} _el - The element that was right-clicked
   */
  _onActionContext(_action, _ev, _el) {
    // Extension point for subclasses
  }

  /**
   * Extension point for handling change events on [data-action] form elements.
   *
   * Subclasses override this method to implement form field change behaviors.
   * Called by the delegated change handler in _onRender.
   *
   * @param {string} _action - The data-action attribute value
   * @param {Event} _ev - The change event
   * @param {HTMLElement} _el - The form element that changed
   */
  _onActionChange(_action, _ev, _el) {
    // Extension point for subclasses
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
   */
  async _onVoidPointsAdjust(event, element, delta) {
    return VoidPointsHandler.updateVoidPoints(this._getHandlerContext(), event, delta);
  }

  /**
   * Updates the visual representation of Void Points dots in the UI.
   *
   * Delegates to VoidPointsHandler to synchronize the dot display with
   * the actor's current Void Point value.
   *
   * @param {HTMLElement} root - Sheet root element containing void-points-dots
   */
  _paintVoidPointsDots(root) {
    VoidPointsHandler.updateVoidDots(root, this.actor);
  }

  /* ---------------------------------- */
  /* Shared Drag & Drop Handling        */
  /* ---------------------------------- */

  /**
   * Start a drag: a Trait or Ring carries its actor and key for a hotbar macro (module/sheets/ui/macros.js); an item
   * row is core's Item drag data.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   * @override
   */
  async _onDragStart(event) {
    const target = event.currentTarget;
    // The Ring roll carries its key; a Trait's roll button sits in its Trait row with the rank control's key
    const key =
      target.dataset.ringKey ??
      target.closest("[data-trait-block]")?.querySelector("[data-action='adjust-trait']")?.dataset
        .trait ??
      null;
    if (key) {
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ type: TRAIT_DRAG_TYPE, actorUuid: this.actor.uuid, key })
      );
      return;
    }
    return super._onDragStart(event);
  }

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
   * @override
   */
  async _onDrop(event) {
    return DragDropHandler.onDrop(this._getHandlerContext(), event);
  }

  /**
   * Handles dropping an item onto the sheet.
   *
   * Delegates to DragDropHandler for item-specific drop logic (adding
   * items to inventory, equipment slots, etc.).
   *
   * @param {DragEvent} event - The drop event
   * @param {object} data - Dropped item data from Foundry drag-drop system
   * @returns {Promise<void>}
   */
  async _onDropItem(event, data) {
    return DragDropHandler.onItemDrop(this._getHandlerContext(), event, data);
  }

  /**
   * Handles dropping an actor onto the sheet.
   *
   * Delegates to DragDropHandler for actor-specific drop logic.
   *
   * @param {DragEvent} event - The drop event
   * @param {object} data - Dropped actor data from Foundry drag-drop system
   * @returns {Promise<void>}
   */
  async _onDropActor(event, data) {
    return DragDropHandler.onActorDrop(this._getHandlerContext(), event, data);
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
   * Delegates to ItemCrudHandler to handle item creation from templates
   * or defaults. Item type is determined from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item creation
   * @param {HTMLElement} element - Element containing item type in data attributes
   * @returns {Promise<void>}
   */
  async _onItemCreate(event, element) {
    return ItemCrudHandler.create(this._getHandlerContext(), event, element);
  }

  /**
   * Opens the item sheet for editing an embedded item.
   *
   * Delegates to ItemCrudHandler to show the item's configuration sheet.
   * Item ID is extracted from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item edit
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @returns {void}
   */
  _onItemEdit(event, element) {
    return ItemCrudHandler.openItemSheet(this._getHandlerContext(), event, element);
  }

  /**
   * Deletes an embedded item from the actor.
   *
   * Delegates to ItemCrudHandler to handle deletion with confirmation.
   * Item ID is extracted from element's data attributes.
   *
   * @param {Event} event - DOM event triggering item deletion
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @returns {Promise<void>}
   */
  async _onItemDelete(event, element) {
    return ItemCrudHandler.deleteItem(this._getHandlerContext(), event, element);
  }

  /**
   * Toggles expansion state of an item in the sheet's item list.
   *
   * Delegates to ItemCrudHandler to show/hide extended item details.
   * Uses data attributes or local state to track expansion.
   *
   * @param {Event} event - DOM event triggering item expansion toggle
   * @param {HTMLElement} element - Element containing item ID in data attributes
   * @returns {void}
   */
  _onItemExpand(event, element) {
    return ItemCrudHandler.updateItemExpanded(this._getHandlerContext(), event, element);
  }

  /**
   * Handles inline editing of item properties in the sheet.
   *
   * Delegates to ItemCrudHandler for updating item properties in place
   * from form fields in the sheet without opening the full item sheet.
   *
   * @param {Event} event - DOM change event from inline edit field
   * @param {HTMLElement} element - Form element containing new value
   * @returns {Promise<void>}
   */
  async _onInlineItemEdit(event, element) {
    return ItemCrudHandler.updateItemField(this._getHandlerContext(), event, element);
  }

  /**
   * Posts an item's header information to chat.
   *
   * Delegates to ItemCrudHandler to create a chat message displaying
   * the item's name, type, and basic information. Useful for showing
   * weapons, spells, or equipment to other players.
   *
   * @param {Event} ev - DOM event triggering chat post
   * @param {HTMLElement} el - Element containing item ID in data attributes
   * @returns {Promise<void>}
   */
  async _onItemHeaderToChat(ev, el) {
    return ItemCrudHandler.toChat(this._getHandlerContext(), ev, el);
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
   * @returns {Promise<ChatMessage|null|undefined>} The roll's chat message
   */
  _onSkillRoll(event, element) {
    return RollHandler.rollClickedSkill(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates an attack roll.
   *
   * Delegates to RollHandler to construct an attack roll (usually a weapon
   * skill roll against opponent's Armor TN).
   *
   * **Game Rules:**
   * Attack rolls use weapon skills paired with Agility or other traits.
   * Success determined by meeting/exceeding target's Armor TN (Reflexes × 5 + 5 + armor).
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing attack info in data attributes
   * @returns {Promise<ChatMessage|null|undefined>} The roll's chat message
   */
  _onAttackRoll(event, element) {
    return RollHandler.rollNpcAttack(this._getHandlerContext(), event, element);
  }

  /**
   * Initiates a weapon-specific attack roll.
   *
   * Delegates to RollHandler for weapon attack with item-specific modifiers
   * and properties (weapon skill, damage, special abilities).
   *
   * @param {Event} event - DOM event triggering the roll
   * @param {HTMLElement} element - Element containing weapon item ID in data attributes
   * @returns {Promise<ChatMessage|null|undefined>} The roll's chat message
   */
  _onWeaponAttackRoll(event, element) {
    return RollHandler.rollClickedWeaponAttack(this._getHandlerContext(), event, element);
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
   * @returns {Promise<ChatMessage|null|undefined>} The roll's chat message
   */
  _onDamageRoll(event, element) {
    return RollHandler.rollNpcDamage(this._getHandlerContext(), event, element);
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
   * @returns {Promise<ChatMessage|null|undefined>} The roll's chat message
   */
  _onTraitRoll(event, element) {
    return RollHandler.rollClickedTrait(this._getHandlerContext(), event, element);
  }

  /**
   * Handles trait rank click - rolls trait or adjusts rank based on Shift key.
   *
   * Delegates to TraitHandler for trait roll or rank adjustment logic.
   *
   * **Without Shift Key:**
   * Performs a trait roll (XkX where X = trait rank) via TraitHandler/RollHandler.
   * This allows quick trait rolls by clicking the trait rank.
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
   * @param {Event} event - DOM event (shiftKey determines roll vs adjust behavior)
   * @param {HTMLElement} element - Element with data-trait attribute
   * @param {number} delta - Direction to adjust (+1 to increase, -1 to decrease)
   * @returns {Promise<void>}
   */
  async _onTraitAdjust(event, element, delta) {
    return TraitHandler.updateTraitRank(this._getHandlerContext(), event, element, delta);
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
   */
  _initializeSortIndicators(root, scope, allowedKeys) {
    SortHandler.updateSortIndicators(root, this.actor.id, { scope, allowedKeys });
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
   */
  async _onUnifiedSortClick(event, element) {
    return SortHandler.updateSortPref(event, element, {
      actorId: this.actor.id,
      getAllowedKeys: scope => this._getAllowedSortKeys(scope),
      renderSheet: () => this.render()
    });
  }

  /**
   * Returns the sort keys a list accepts: its sort header's keys (module/config/sort-keys.js), so a stored or
   * clicked key is one the header offers.
   *
   * @param {string} scope - Sort scope identifier (e.g., "skills", "items"), read from the header's data-scope
   * @returns {readonly string[]} The list's sort keys; "name" alone for a scope the config does not name
   */
  _getAllowedSortKeys(scope) {
    return SORT_KEYS[scope] ?? ["name"];
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
   * @returns {{actor: L5R4Actor, element: HTMLElement, sheetClassName: string}} Handler context: the actor
   *   document, the sheet's root element, and the class name for logging
   */
  _getHandlerContext() {
    return {
      actor: this.actor,
      element: this.element,
      sheetClassName: this.constructor.name
    };
  }

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
   * @param {object} [options={}] - Options passed to Application.close
   * @returns {Promise<void>}
   * @override
   */
  async close(options = {}) {
    // Clear bound root to allow fresh event delegation on reopen
    this._boundRoot = null;
    return super.close(options);
  }
}
