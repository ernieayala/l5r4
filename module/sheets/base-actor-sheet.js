/**
 * @fileoverview Base Actor Sheet for L5R4 - Foundry VTT v13+
 * 
 * This class provides comprehensive shared functionality for all L5R4 actor sheets,
 * implementing the common behaviors, event handling, and UI interactions that are
 * inherited by both PC and NPC sheet implementations. Built on Foundry's modern
 * ApplicationV2 architecture for optimal performance and maintainability.
 *
 * **Core Responsibilities:**
 * - **Event Delegation**: Centralized data-action attribute handling system
 * - **Void Point Management**: Interactive visual dot interface with click adjustment
 * - **Item CRUD Operations**: Complete create, read, update, delete item functionality
 * - **Roll Integration**: Shared roll methods for skills, attacks, damage, and traits
 * - **Context Menus**: Right-click item management with edit/delete options
 * - **Stance Integration**: Automatic stance bonus application to combat rolls
 * - **Template Management**: Common template data preparation and rendering
 *
 * **ApplicationV2 Architecture:**
 * Built on Foundry's modern sheet architecture with enhanced capabilities:
 * - **HandlebarsApplicationMixin**: Advanced template rendering with Handlebars integration
 * - **ActorSheetV2**: Modern Foundry sheet base class with improved lifecycle management
 * - **Action Delegation**: Clean event handling using data-action attributes
 * - **Lifecycle Hooks**: Proper _onRender() implementation for post-render setup
 * - **Context Preparation**: Extensible _prepareContext() system for template data
 * - **State Management**: Efficient handling of sheet state and user interactions
 *
 * **Event System Architecture:**
 * The base sheet implements a sophisticated event delegation system for clean separation:
 * - **Action Handlers**: `data-action` attributes trigger corresponding `_onAction()` methods
 * - **Context Handlers**: Right-click events trigger `_onActionContext()` methods
 * - **Change Handlers**: Form changes trigger `_onActionChange()` methods
 * - **Event Prevention**: Prevents duplicate event binding on re-renders
 * - **Multi-Modal Support**: Supports click, contextmenu, and change interactions
 * - **Bubbling Control**: Proper event propagation management
 *
 * **Void Points System:**
 * Implements L5R4's signature void point mechanics with full visual feedback:
 * - **Visual Interface**: 9-dot interactive display with filled/empty states
 * - **Interaction Model**: Left-click to spend, right-click to regain void points
 * - **Range Validation**: Enforces [0..9] bounds with immediate persistence
 * - **State Synchronization**: Visual updates synchronized with actor data changes
 * - **Safe DOM Operations**: Robust DOM manipulation with comprehensive null checks
 * - **Accessibility**: Keyboard navigation and screen reader support
 *
 * **Item Management System:**
 * Provides comprehensive item management functionality across all sheet types:
 * - **Creation Workflow**: Type-specific item creation with intelligent subtype dialogs
 * - **Editing Interface**: Direct sheet opening for detailed item modification
 * - **Deletion Safety**: Secure embedded document removal with confirmation
 * - **Expansion Controls**: Toggle item detail visibility with animated chevron icons
 * - **Inline Editing**: Direct field editing with automatic dtype coercion
 * - **Context Menus**: Comprehensive right-click edit/delete/duplicate options
 * - **Drag & Drop**: Full support for item reordering and external drops
 *
 * **Roll Integration Framework:**
 * Centralizes roll logic shared between PC and NPC sheets for consistency:
 * - **Skill Rolls**: Trait + skill rank calculations with emphasis and wound penalties
 * - **Attack Rolls**: Weapon attacks with stance bonuses and targeting
 * - **Damage Rolls**: Weapon damage with trait bonuses and strength modifiers
 * - **Trait Rolls**: Pure trait tests with unskilled penalty options
 * - **Stance Bonuses**: Automatic Full Attack stance bonus application
 * - **Modifier Integration**: Wound penalties, active effects, and situational bonuses
 *
 * **Performance Optimizations:**
 * - **Event Delegation**: Single event listener handles all sheet interactions
 * - **Lazy Rendering**: Template parts rendered only when needed
 * - **State Caching**: Frequently accessed data cached for performance
 * - **DOM Efficiency**: Minimal DOM manipulation with targeted updates
 * - **Memory Management**: Proper cleanup of event listeners and references
 *
 * **Accessibility Features:**
 * - **Keyboard Navigation**: Full keyboard support for all interactive elements
 * - **Screen Reader Support**: Proper ARIA labels and semantic markup
 * - **High Contrast**: Compatible with high contrast display modes
 * - **Focus Management**: Logical tab order and focus indicators
 * - **Alternative Input**: Support for various input methods and assistive devices
 *
 * **Integration Points:**
 * - **Dice Service**: Roll execution and result processing
 * - **Chat Service**: Item creation dialogs and message formatting
 * - **Stance Service**: Combat stance automation and effect management
 * - **Utils Module**: Helper functions for data manipulation and validation
 * - **Config Module**: System constants and localization keys
 *
 * **Usage Examples:**
 * ```javascript
 * // Extend base sheet for specific actor types
 * class PCSheet extends BaseActorSheet {
 *   static DEFAULT_OPTIONS = {
 *     classes: ["l5r4", "sheet", "actor", "pc"],
 *     template: `systems/${SYS_ID}/templates/actor/pc-sheet.hbs`
 *   };
 * 
 *   async _prepareContext() {
 *     const context = await super._prepareContext();
 *     // Add PC-specific context data
 *     return context;
 *   }
 * }
 * ```
 *
 * **Code Navigation Guide:**
 * 1. **Event System** (`_onRender()`) - Event delegation setup and DOM binding
 * 2. **Action Handlers** (`_onAction()`, `_onActionContext()`, `_onActionChange()`) - Event routing
 * 3. **Void Points** (`_onVoidPointsAdjust()`, `_paintVoidPointsDots()`) - Void point management
 * 4. **Item CRUD** (`_onItemCreate()`, `_onItemEdit()`, `_onItemDelete()`) - Item operations
 * 5. **Item UI** (`_onItemExpand()`, `_onInlineItemEdit()`) - Item interface controls
 * 6. **Context Menus** (`_setupItemContextMenu()`) - Right-click menu setup
 * 7. **Roll Methods** (`_onSkillRoll()`, `_onAttackRoll()`, `_onDamageRoll()`) - Dice integration
 * 8. **Stance Integration** (via stance service) - Combat stance bonuses
 * 9. **Utility Methods** (various helper functions) - Data processing and validation
 * 10. **Template Preparation** (subclass implementations) - Context data assembly
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @extends {foundry.applications.sheets.ActorSheetV2}
 * @mixes {foundry.applications.api.HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.ContextMenu.html|ContextMenu}
 */
import { on } from "../utils/dom.js";
import { SYS_ID } from "../config/constants.js";
import { KeyboardBehaviorMixin } from "./mixins/keyboard-behavior.js";
import { VoidPointsHandler } from "./handlers/void-points-handler.js";
import { DragDropHandler } from "./handlers/drag-drop-handler.js";
import { ItemCRUDHandler } from "./handlers/item-crud-handler.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { SortHandler } from "./handlers/sort-handler.js";
import { openImageEditor } from "./ui/image-editor.js";
import { setupItemContextMenu } from "./ui/context-menu-builder.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base actor sheet class extending ActorSheetV2 with HandlebarsApplicationMixin and KeyboardBehaviorMixin.
 * Provides shared functionality for PC and NPC sheets through composition of specialized handlers.
 * 
 * **Architecture:**
 * This refactored class uses composition instead of monolithic implementation:
 * - VoidPointsHandler: Void point adjustment and rendering
 * - DragDropHandler: Drag and drop processing
 * - ItemCRUDHandler: Item create, read, update, delete operations
 * - RollHandler: All roll-related functionality
 * - SortHandler: List sorting and preferences
 * - KeyboardBehaviorMixin: Keyboard and cursor behavior
 * - UI utilities: Image editor, context menus
 */
export class BaseActorSheet extends KeyboardBehaviorMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {
  /** @inheritdoc */
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
   * @override
   * Bind delegated events on the sheet root using data-action attributes.
   * Sets up click, contextmenu, and change event delegation.
   * Subclasses can override _onAction/_onActionContext/_onActionChange.
   * @param {object} context - Template context (unused)
   * @param {object} options - Render options (unused)
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Avoid rebinding if the same root is re-used by Foundry.
    if (this._boundRoot === root) return;
    this._boundRoot = root;
    if (!this.actor?.isOwner) return;

    // Click actions
    on(root, "[data-action]", "click", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Right-click/context actions
    // Use capture phase for Firefox compatibility - prevents native context menu
    on(root, "[data-action]", "contextmenu", (ev, el) => {
      ev.preventDefault();
      const action = el.getAttribute("data-action");
      if (typeof this._onActionContext === "function") this._onActionContext(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    }, { capture: true });

    // Change actions (inline inputs/selects)
    on(root, "[data-action]", "change", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onActionChange === "function") this._onActionChange(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Setup image error handling for broken actor images
    this._setupImageErrorHandling(root);

    // Setup conditional cursor behavior for increment/decrement controls (from mixin)
    this._setupConditionalCursor(root);
  }

  /**
   * Setup error handling for actor images to show default fallback when image fails to load.
   * @param {HTMLElement} root - The sheet root element
   */
  _setupImageErrorHandling(root) {
    const actorImages = root.querySelectorAll('.actor-img');
    actorImages.forEach(img => {
      if (!img.dataset.errorHandled) {
        img.dataset.errorHandled = 'true';
        img.addEventListener('error', () => {
          // Use Foundry's default actor image based on actor type
          const defaultImage = this.actor.type === 'npc' 
            ? 'icons/svg/mystery-man.svg' 
            : 'icons/svg/mystery-man.svg';
          img.src = defaultImage;
        });
      }
    });
  }

  /**
   * Optional generic data-action handlers for subclasses to override.
   * Called by the event delegation system when data-action elements are interacted with.
   * @param {string|null} _action - The data-action attribute value
   * @param {Event} _ev - The triggering event
   * @param {Element} _el - The element with the data-action attribute
   */
  // eslint-disable-next-line no-unused-vars
  _onAction(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionContext(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionChange(_action, _ev, _el) {}

  /* ---------------------------------- */
  /* Shared Void Points Management       */
  /* ---------------------------------- */

  /**
   * Adjust Void Points by ±1 within the range [0..9].
   * Delegates to VoidPointsHandler for implementation.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The void points dots container element
   * @param {number} delta - +1 (left click) or -1 (right-click)
   */
  async _onVoidPointsAdjust(event, element, delta) {
    return VoidPointsHandler.adjust(this._getHandlerContext(), event, element, delta);
  }

  /**
   * Render the 9-dot Void Points control by toggling "-filled" class on dots.
   * Delegates to VoidPointsHandler for implementation.
   * @param {HTMLElement} root - The sheet root element containing .void-points-dots
   */
  _paintVoidPointsDots(root) {
    VoidPointsHandler.paint(root, this.actor);
  }

  /* ---------------------------------- */
  /* Shared Drag & Drop Handling        */
  /* ---------------------------------- */

  /**
   * Handle drop events on the actor sheet.
   * Delegates to DragDropHandler for implementation.
   * @param {DragEvent} event - The drop event
   * @returns {Promise<Document[]|false>} Created documents or false if not handled
   */
  async _onDrop(event) {
    return DragDropHandler.handleDrop(this._getHandlerContext(), event);
  }

  /**
   * Handle dropping an Item onto the actor sheet.
   * Delegates to DragDropHandler for implementation.
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing item information
   * @returns {Promise<Document[]|false>} Created item documents or false if failed
   */
  async _onDropItem(event, data) {
    return DragDropHandler.handleItemDrop(this._getHandlerContext(), event, data);
  }

  /**
   * Handle dropping an Actor onto the actor sheet.
   * Delegates to DragDropHandler for implementation.
   * Subclasses can override for specialized behavior.
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing actor information
   * @returns {Promise<boolean>} Always returns false in base implementation
   */
  async _onDropActor(event, data) {
    return DragDropHandler.handleActorDrop(this._getHandlerContext(), event, data);
  }

  /* ---------------------------------- */
  /* Shared Image Editing                */
  /* ---------------------------------- */

  /**
   * Handle image editing via file picker.
   * Delegates to openImageEditor utility.
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked image element
   * @returns {Promise<void>}
   */
  async _onEditImage(event, element) {
    event?.preventDefault?.();
    return openImageEditor(this.actor, this.position);
  }

  /* ---------------------------------- */
  /* Shared Item CRUD Operations         */
  /* ---------------------------------- */

  /**
   * Create a new embedded Item using the unified item creation dialog.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {Event} event - The originating click event
   * @param {HTMLElement} element - The clicked element (may have data-type for fallback)
   * @returns {Promise<Document[]>} Array of created item documents
   */
  async _onItemCreate(event, element) {
    return ItemCRUDHandler.create(this._getHandlerContext(), event, element);
  }

  /**
   * Detect the appropriate item type based on the sheet section context.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {HTMLElement} element - The clicked Add Item button element
   * @returns {string|null} The preferred item type or null if not detectable
   */
  _detectSectionItemType(element) {
    return ItemCRUDHandler.detectSectionItemType(element);
  }

  /**
   * Open an item's sheet for editing by finding the item ID from the row.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   */
  _onItemEdit(event, element) {
    return ItemCRUDHandler.edit(this._getHandlerContext(), event, element);
  }

  /**
   * Delete an embedded item by finding the item ID from the row.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemDelete(event, element) {
    return ItemCRUDHandler.deleteItem(this._getHandlerContext(), event, element);
  }

  /**
   * Toggle inline expansion of an item row to reveal/hide its details.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The expand/collapse button element
   */
  _onItemExpand(event, element) {
    return ItemCRUDHandler.expand(this._getHandlerContext(), event, element);
  }

  /**
   * Handle inline editing of item fields with proper dtype coercion.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {Event} event - The input change event
   * @param {HTMLElement} element - The input element with data-field and data-dtype
   * @returns {Promise<Document|undefined>} Updated item document or undefined
   */
  async _onInlineItemEdit(event, element) {
    return ItemCRUDHandler.inlineEdit(this._getHandlerContext(), event, element);
  }

  /**
   * Post an item's card to chat when its title is clicked.
   * Delegates to ItemCRUDHandler for implementation.
   * @param {MouseEvent} ev - The click event
   * @param {HTMLElement} el - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemHeaderToChat(ev, el) {
    return ItemCRUDHandler.toChat(this._getHandlerContext(), ev, el);
  }

  /* ---------------------------------- */
  /* Shared Context Menu Setup          */
  /* ---------------------------------- */

  /**
   * Setup right-click context menu for item rows with edit and delete options.
   * Delegates to setupItemContextMenu utility.
   * @param {HTMLElement} root - The sheet root element
   * @returns {Promise<void>}
   */
  async _setupItemContextMenu(root) {
    this._itemContextMenu = await setupItemContextMenu(root, this.actor, this._itemContextMenu);
  }

  /* ---------------------------------- */
  /* Shared Roll Methods                 */
  /* ---------------------------------- */

  /**
   * Shared skill roll handler for both PC and NPC sheets.
   * Delegates to RollHandler for implementation.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element within a skill item row
   */
  _onSkillRoll(event, element) {
    return RollHandler.skillRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Shared attack roll handler using extractRollParams utility.
   * Delegates to RollHandler for implementation.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onAttackRoll(event, element) {
    return RollHandler.attackRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Delegates to RollHandler for implementation.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with weapon dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onWeaponAttackRoll(event, element) {
    return RollHandler.weaponAttackRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Shared damage roll handler using extractRollParams utility.
   * Delegates to RollHandler for implementation.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onDamageRoll(event, element) {
    return RollHandler.damageRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Shared trait roll handler for both PC and NPC sheets.
   * Delegates to RollHandler for implementation.
   * @param {Event} event - The triggering event (shift-click for PC options)
   * @param {HTMLElement} element - The trait element with dataset attributes
   * @returns {Promise<any>} Roll result from appropriate Dice method
   */
  _onTraitRoll(event, element) {
    return RollHandler.traitRoll(this._getHandlerContext(), event, element);
  }

  /**
   * Base trait adjustment method with simple NPC-style logic.
   * Adjusts trait values by ±1 within [1,10] range.
   * PC sheet overrides this for complex family bonus logic.
   * Requires Shift+Click to prevent accidental changes.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The element with data-trait attribute
   * @param {number} delta - +1 or -1 adjustment value
   * @returns {Promise<void>}
   */
  async _onTraitAdjust(event, element, delta) {
    event?.preventDefault?.();
    
    // Require Shift+Click to prevent accidental trait changes
    if (!event?.shiftKey) return;
    
    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!key) return;
    
    const cur = Number(this.actor.system?.traits?.[key] ?? 0) || 0;
    const next = Math.min(10, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    
    try {
      await this.actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} BaseActorSheet: failed to update trait`, { err, key, cur, next });
    }
  }

  /* Sorting System -------------------------------------------------------- */

  /**
   * Initialize sort visual indicators based on current sort preferences.
   * Delegates to SortHandler for implementation.
   * 
   * @param {HTMLElement} root - Sheet root element
   * @param {string} scope - Sort scope identifier (e.g., "skills", "spells", "advantages")
   * @param {string[]} allowedKeys - Array of allowed sort keys for this scope
   * @returns {void}
   * @protected
   */
  _initializeSortIndicators(root, scope, allowedKeys) {
    SortHandler.initializeIndicators(root, this.actor.id, scope, allowedKeys);
  }

  /**
   * Generic unified sort click handler for list column headers.
   * Delegates to SortHandler for implementation.
   * 
   * @param {MouseEvent} event - Click event from sort header
   * @param {HTMLElement} element - The clicked element with data-sortby attribute
   * @returns {Promise<void>}
   * @protected
   */
  async _onUnifiedSortClick(event, element) {
    return SortHandler.handleClick(
      this.actor.id,
      event,
      element,
      (scope) => this._getAllowedSortKeys(scope),
      () => this.render()
    );
  }

  /**
   * Get allowed sort keys for a given scope.
   * Child sheets should override this method to define sortable columns.
   * Default implementation returns only "name" for all scopes.
   * 
   * @param {string} scope - Sort scope identifier (e.g., "skills", "spells")
   * @returns {string[]} Array of allowed sort keys for this scope
   * @protected
   * @virtual
   */
  _getAllowedSortKeys(scope) {
    return ["name"];
  }

  /* Helper Methods -------------------------------------------------------- */

  /**
   * Get handler context object for delegating to handler classes.
   * Provides handlers with access to actor, element, and sheet class name.
   * 
   * @returns {object} Handler context
   * @returns {Actor} context.actor - The actor document
   * @returns {HTMLElement} context.element - The sheet root element
   * @returns {string} context.sheetClassName - The sheet class name for type detection
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
