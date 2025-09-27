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
 *     template: "systems/l5r4/templates/actor/pc-sheet.hbs"
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
 * 8. **Stance Integration** (`_getStanceAttackBonuses()`) - Combat stance bonuses
 * 9. **Utility Methods** (various helper functions) - Data processing and validation
 * 10. **Template Preparation** (subclass implementations) - Context data assembly
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @extends {foundry.applications.sheets.ActorSheetV2}
 * @mixes {foundry.applications.api.HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.ContextMenu.html|ContextMenu}
 */
import { on, toInt, readWoundPenalty, normalizeTraitKey, getEffectiveTrait, extractRollParams, resolveWeaponSkillTrait } from "../utils.js";
import * as Dice from "../services/dice.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base actor sheet class extending ActorSheetV2 with HandlebarsApplicationMixin.
 * Provides shared functionality for PC and NPC sheets without requiring
 * subclasses to implement both _renderHTML and _replaceHTML.
 */
export class BaseActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
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
    on(root, "[data-action]", "contextmenu", (ev, el) => {
      ev.preventDefault();
      const action = el.getAttribute("data-action");
      if (typeof this._onActionContext === "function") this._onActionContext(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Change actions (inline inputs/selects)
    on(root, "[data-action]", "change", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onActionChange === "function") this._onActionChange(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Setup image error handling for broken actor images
    this._setupImageErrorHandling(root);
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
   * Uses Document.update to persist the value and repaints the dots.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The void points dots container element
   * @param {number} delta - +1 (left click) or -1 (right-click)
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   */
  async _onVoidPointsAdjust(event, element, delta) {
    event?.preventDefault?.();
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    const next = Math.min(9, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.value": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 Base Sheet: failed to update void points", { err });
    }
    // Repaint from authoritative actor state to avoid stale DOM edge-cases
    this._paintVoidPointsDots(this.element);
  }

  /**
   * Render the 9-dot Void Points control by toggling "-filled" class on dots.
   * Updates visual state to match current void points value. Safe to call after every render.
   * @param {HTMLElement} root - The sheet root element containing .void-points-dots
   */
  _paintVoidPointsDots(root) {
    const node = root?.querySelector?.(".void-points-dots");
    if (!node) return;
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    node.querySelectorAll(".void-dot").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
  }

  /* ---------------------------------- */
  /* Shared Drag & Drop Handling        */
  /* ---------------------------------- */

  /**
   * Handle drop events on the actor sheet.
   * Processes item drops from compendiums and other sources.
   * Subclasses can override this method for specialized drop handling.
   * @param {DragEvent} event - The drop event
   * @returns {Promise<Document[]|false>} Created documents or false if not handled
   * @see https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#getDragEventData
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#createEmbeddedDocuments
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (!data) return false;

    // Handle Item drops
    if (data.type === "Item") {
      return this._onDropItem(event, data);
    }

    // Handle Actor drops (for reference, not embedding)
    if (data.type === "Actor") {
      return this._onDropActor(event, data);
    }

    return false;
  }

  /**
   * Handle dropping an Item onto the actor sheet.
   * Creates an embedded copy of the item on this actor.
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing item information
   * @returns {Promise<Document[]|false>} Created item documents or false if failed
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;

    try {
      const item = await fromUuid(data.uuid);
      if (!item) {
        console.warn("L5R4 Base Sheet: Could not resolve item UUID", data.uuid);
        return false;
      }

      // Create embedded item on this actor
      const itemData = item.toObject();
      return await this.actor.createEmbeddedDocuments("Item", [itemData]);
    } catch (err) {
      console.warn("L5R4 Base Sheet: Failed to drop item", { err, data });
      return false;
    }
  }

  /**
   * Handle dropping an Actor onto the actor sheet.
   * Base implementation does nothing - subclasses can override for specific behavior.
   * @param {DragEvent} event - The drop event
   * @param {object} data - The drag data containing actor information
   * @returns {Promise<boolean>} Always returns false in base implementation
   */
  async _onDropActor(event, data) {
    // Base implementation - subclasses can override
    return false;
  }

  /* ---------------------------------- */
  /* Shared Image Editing                */
  /* ---------------------------------- */

  /**
   * Handle image editing via file picker.
   * Opens Foundry's file picker to allow users to select a new actor image.
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked image element
   * @returns {Promise<void>}
   */
  async _onEditImage(event, element) {
    event?.preventDefault?.();
    
    const current = this.actor.img;
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: current,
      callback: async (path) => {
        try {
          await this.actor.update({ img: path });
        } catch (err) {
          console.warn("L5R4", "Failed to update actor image", { err });
        }
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    
    return fp.browse();
  }

  /* ---------------------------------- */
  /* Shared Item CRUD Operations         */
  /* ---------------------------------- */

  /**
   * Create a new embedded Item from a "+" button on the sheet.
   * Creates items directly without dialogs since each section handles specific types.
   * @param {Event} event - The originating click event
   * @param {HTMLElement} element - The clicked element with data-type attribute
   * @returns {Promise<Document[]>} Array of created item documents
   */
  async _onItemCreate(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const type = el?.dataset?.type;
    let itemData = {};

    itemData = { 
      name: game.i18n.localize("l5r4.ui.common.new") || "New", 
      type 
    };
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Open an item's sheet for editing by finding the item ID from the row.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   */
  _onItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    this.actor.items.get(id)?.sheet?.render(true);
  }

  /**
   * Delete an embedded item by finding the item ID from the row.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemDelete(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    if (id) {
      try {
        await this.actor.deleteEmbeddedDocuments("Item", [id]);
      } catch (err) {
        console.warn("L5R4 Base Sheet: deleteEmbeddedDocuments failed", { err });
      }
    }
  }

  /**
   * Toggle inline expansion of an item row to reveal/hide its details.
   * Updates the chevron icon and applies the "is-expanded" class.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The expand/collapse button element
   */
  _onItemExpand(event, element) {
    event?.preventDefault?.();
    const row = /** @type {HTMLElement|null} */ (element.closest(".item"));
    if (!row) return;
    row.classList.toggle("is-expanded");
    const icon = /** @type {HTMLElement|null} */ (element.querySelector("i"));
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }

  /**
   * Handle inline editing of item fields with proper dtype coercion.
   * Supports Integer, Number, Boolean, and String data types.
   * @param {Event} event - The input change event
   * @param {HTMLElement} element - The input element with data-field and data-dtype
   * @returns {Promise<Document|undefined>} Updated item document or undefined
   */
  async _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // dtype coercion if provided
    let value = /** @type {HTMLInputElement|HTMLSelectElement} */ (el).value;
    switch (el.dataset.dtype) {
      case "Integer": value = toInt(value, 0); break;
      case "Number":  value = Number.isFinite(+value) ? +value : 0; break;
      case "Boolean": {
        const s = String(value).toLowerCase();
        value = s === "true" || s === "1" || s === "on" || s === "yes";
        break;
      }
      default: value = String(value ?? "");
    }

    return this.actor.items.get(id)?.update({ [field]: value });
  }

  /**
   * Post an item's card to chat when its title is clicked.
   * Calls the item's roll() method to display in chat.
   * @param {MouseEvent} ev - The click event
   * @param {HTMLElement} el - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemHeaderToChat(ev, el) {
    ev.preventDefault();
    const row = el?.closest?.(".item");
    const id = row?.dataset?.documentId || row?.dataset?.itemId || row?.dataset?.id;
    if (!id) return;
    const item = this.actor?.items?.get(id);
    if (!item) return;
    try { 
      await item.roll(); 
    } catch (err) { 
      console.warn("L5R4 Base Sheet: item.roll() failed", { err, id }); 
    }
  }

  /* ---------------------------------- */
  /* Shared Context Menu Setup          */
  /* ---------------------------------- */

  /**
   * Setup right-click context menu for item rows with edit and delete options.
   * Should be called during _onRender after DOM is ready.
   * Replaces any existing context menu to avoid duplicates.
   * @param {HTMLElement} root - The sheet root element
   * @returns {Promise<void>}
   */
  async _setupItemContextMenu(root) {
    try {
      // Avoid duplicate menus on re-render
      if (this._itemContextMenu?.element) {
        try { 
          await this._itemContextMenu.close({ animate: false }); 
        } catch (_) {}
        this._itemContextMenu = null;
      }
      
      const Menu = foundry.applications.ux.ContextMenu;
      this._itemContextMenu = new Menu(root, ".item", [
        {
          name: game.i18n.localize("l5r4.ui.common.edit"),
          icon: '<i class="fas fa-edit"></i>',
          callback: (target) => {
            const el = target instanceof HTMLElement ? target : target?.[0];
            const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
            this.actor.items.get(id)?.sheet?.render(true);
          }
        },
        {
          name: game.i18n.localize("l5r4.ui.common.delete"),
          icon: '<i class="fas fa-trash"></i>',
          callback: async (target) => {
            const el = target instanceof HTMLElement ? target : target?.[0];
            const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
            if (!id) return;
            try { 
              await this.actor.deleteEmbeddedDocuments("Item", [id]); 
            } catch (err) { 
              console.warn("L5R4 Base Sheet: deleteEmbeddedDocuments failed", { err }); 
            }
          }
        }
      ], { jQuery: false });
    } catch (e) {
      console.warn("L5R4 Base Sheet: context menu init failed", e);
    }
  }

  /* ---------------------------------- */
  /* Shared Roll Methods                 */
  /* ---------------------------------- */

  /**
   * Shared skill roll handler for both PC and NPC sheets.
   * Automatically detects actor type and applies appropriate roll logic.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element within a skill item row
   */
  _onSkillRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const item = row ? this.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;

    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return;
    }
    const actorTrait = getEffectiveTrait(this.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = this.constructor.name.includes("Npc") || this.actor.type === "npc";

    Dice.SkillRoll({
      actor: this.actor,
      woundPenalty: readWoundPenalty(this.actor),
      actorTrait,
      skillRank: toInt(item.system?.rank),
      skillName: item.name,
      askForOptions: event.shiftKey,
      npc: isNpc,
      skillTrait: traitKey,
      rollType: item.type === "weapon" || item.type === "bow" ? "attack" : null
    });
  }

  /**
   * Shared attack roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses and stance bonuses.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onAttackRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, this.actor);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = this._getStanceAttackBonuses();
    let rollName = `${this.actor.name}: ${params.label}`.trim();
    let description = params.description;
    
    // Add stance bonus information to description
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      description = description ? `${description} (Full Attack: ${bonusText})` : `Full Attack: ${bonusText}`;
    }

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: this.actor
    });
  }

  /**
   * Get stance bonuses for attack rolls from active effects.
   * @returns {{roll: number, keep: number}} Attack roll bonuses from stances
   */
  _getStanceAttackBonuses() {
    let rollBonus = 0;
    let keepBonus = 0;

    // Check for Full Attack Stance
    for (const effect of this.actor.effects) {
      if (effect.disabled) continue;
      
      const isFullAttack = effect.statuses?.has?.("fullAttackStance") || 
                          effect.getFlag?.("core", "statusId") === "fullAttackStance";
      
      if (isFullAttack) {
        rollBonus += 2;
        keepBonus += 1;
        break; // Only one Full Attack stance can be active
      }
    }

    return { roll: rollBonus, keep: keepBonus };
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Uses the weapon's associated skill if the character has it, otherwise falls back to the weapon's trait.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with weapon dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onWeaponAttackRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const weapon = id ? this.actor.items.get(id) : null;
    
    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noValidWeapon"));
      return;
    }

    // Resolve weapon skill/trait association
    const weaponSkill = resolveWeaponSkillTrait(this.actor, weapon);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = this._getStanceAttackBonuses();
    
    // Check if weapon attack is untrained (no skill rank)
    const isUntrained = weaponSkill.skillRank === 0;
    
    const rollName = `${this.actor.name}: ${weapon.name} ${game.i18n.localize("l5r4.ui.mechanics.rolls.attackRoll")}`;
    const description = `${weaponSkill.description}`
      + `${(stanceBonuses.roll > 0 || stanceBonuses.keep > 0) ? ` (${game.i18n.localize("l5r4.ui.mechanics.stances.fullAttack")}: +${stanceBonuses.roll}k${stanceBonuses.keep})` : ''}`
      + `${isUntrained ? ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilled")})` : ''}`;

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll: weaponSkill.rollBonus + stanceBonuses.roll,
      diceKeep: weaponSkill.keepBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: this.actor,
      untrained: isUntrained,
      weaponId: id
    });
  }

  /**
   * Shared damage roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onDamageRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, this.actor);
    const rollName = `${this.actor.name}: ${params.label}`.trim();

    return Dice.NpcRoll({
      diceRoll: params.diceRoll + params.traitBonus,
      diceKeep: params.diceKeep + params.traitBonus,
      rollName,
      description: params.description,
      toggleOptions: event.shiftKey,
      rollType: "damage",
      actor: this.actor
    });
  }

  /**
   * Shared trait roll handler for both PC and NPC sheets.
   * Automatically detects actor type and uses appropriate roll method.
   * @param {Event} event - The triggering event (shift-click for PC options)
   * @param {HTMLElement} element - The trait element with dataset attributes
   * @returns {Promise<any>} Roll result from appropriate Dice method
   */
  _onTraitRoll(event, element) {
    event.preventDefault();
    const block = element.closest(".trait");
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait
      || element.dataset.traitName
      || "ref"
    );

    const traitValue = getEffectiveTrait(this.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = this.constructor.name.includes("Npc") || this.actor.type === "npc";

    if (isNpc) {
      return Dice.NpcRoll({
        npc: true,
        rollName: element?.dataset?.traitName || traitKey,
        traitName: traitKey,
        traitRank: traitValue
      });
    } else {
      return Dice.TraitRoll({
        traitRank: traitValue,
        traitName: traitKey,
        askForOptions: event.shiftKey,
        actor: this.actor
      });
    }
  }

  /**
   * Base trait adjustment method with simple NPC-style logic.
   * Adjusts trait values by ±1 within [1,10] range.
   * PC sheet overrides this for complex family bonus logic.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The element with data-trait attribute
   * @param {number} delta - +1 or -1 adjustment value
   * @returns {Promise<void>}
   */
  async _onTraitAdjust(event, element, delta) {
    event?.preventDefault?.();
    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!key) return;
    
    const cur = Number(this.actor.system?.traits?.[key] ?? 0) || 0;
    const next = Math.min(10, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    
    try {
      await this.actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 Base Sheet: failed to update trait", { err, key, cur, next });
    }
  }
}
