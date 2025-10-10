/**
 * @fileoverview L5R4 Item Document - Coordinator for Foundry VTT v13+
 * 
 * Thin coordinator class that delegates to specialized modules for item lifecycle
 * management, data preparation, XP tracking, and chat integration. Follows the
 * modular architecture pattern established in actor.js.
 *
 * **Modular Architecture:**
 * - **constants/**: Item type configuration, XP cost formulas (static, no runtime deps)
 * - **lifecycle/**: Creation, updates, XP tracking (Foundry lifecycle hooks)
 * - **preparation/**: Base data normalization, derived calculations (data prep phase)
 * - **integration/**: Chat cards, sheet data enhancement (external system integration)
 *
 * **Delegation Pattern:**
 * This class acts as a thin coordinator that:
 * 1. Receives Foundry lifecycle calls (_preCreate, _onCreate, _preUpdate, etc.)
 * 2. Delegates to specialized modules for actual implementation
 * 3. Maintains Foundry API contracts and method signatures
 * 4. Provides backward compatibility for external code
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @extends {Item}
 * @see {@link ./item/constants/item-types.js|Item Type Constants}
 * @see {@link ./item/lifecycle/item-creation.js|Item Creation Logic}
 * @see {@link ./item/lifecycle/item-updates.js|Item Update Logic}
 * @see {@link ./item/preparation/base-data.js|Base Data Preparation}
 * @see {@link ./item/preparation/derived-data.js|Derived Data Preparation}
 */

import { CHAT_CARD_TEMPLATES, DEFAULT_ICONS } from "./item/constants/item-types.js";
import { handleItemPreCreate, handleItemOnCreate } from "./item/lifecycle/item-creation.js";
import { handleItemPreUpdate } from "./item/lifecycle/item-updates.js";
import { prepareItemBaseData } from "./item/preparation/base-data.js";
import { prepareItemDerivedData } from "./item/preparation/derived-data.js";
import { renderItemChatCard } from "./item/integration/chat-cards.js";
import { enhanceItemSheetData } from "./item/integration/sheet-data.js";

/**
 * L5R4 Item document class - thin coordinator delegating to specialized modules.
 * Maintains Foundry API contracts while keeping implementation modular.
 * @extends {Item}
 */
export default class L5R4Item extends Item {
  /**
   * Chat template paths for rendering item-specific chat cards.
   * Re-exported from constants module for backward compatibility.
   * @type {Record<string, string>}
   * @static
   */
  static CHAT_CARD_TEMPLATES = CHAT_CARD_TEMPLATES;

  /**
   * Default icon paths by item type for automatic assignment.
   * Re-exported from constants module for backward compatibility.
   * @type {Record<string, string>}
   * @static
   */
  static DEFAULT_ICONS = DEFAULT_ICONS;

  /* -------------------------------------------- */
  /* Lifecycle                                    */
  /* -------------------------------------------- */

  /**
   * Configure item defaults and validate data on creation.
   * Delegates to lifecycle/item-creation module.
   * 
   * @async
   * @param {object} data - The initial data object provided to the document creation
   * @param {DocumentModificationContext} options - Additional options which modify the creation request
   * @param {string} userId - The ID of the User requesting the document creation
   * @returns {Promise<void>}
   * @override
   * @see {handleItemPreCreate}
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);
    handleItemPreCreate(this, data);
  }

  /**
   * Track experience expenditure when items are created on actors.
   * Delegates to lifecycle/item-creation module.
   * 
   * @async
   * @param {object} data - The data object of the created document
   * @param {DocumentModificationContext} options - Additional options which modify the creation request
   * @param {string} userId - The ID of the User who triggered the creation
   * @returns {Promise<void>}
   * @override
   * @see {handleItemOnCreate}
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    await handleItemOnCreate(this, data);
  }

  /**
   * Track experience expenditure and validate costs on item updates.
   * Delegates to lifecycle/item-updates module.
   * 
   * @async
   * @param {object} changes - The differential data that is being updated
   * @param {DocumentModificationContext} options - Additional options which modify the update request
   * @param {string} userId - The ID of the User requesting the document update
   * @returns {Promise<void>}
   * @override
   * @see {handleItemPreUpdate}
   */
  async _preUpdate(changes, options, userId) {
    await super._preUpdate(changes, options, userId);
    await handleItemPreUpdate(this, changes);
  }

  /**
   * Initialize and normalize base item data for template safety.
   * Delegates to preparation/base-data module.
   * 
   * @returns {void}
   * @override
   * @see {prepareItemBaseData}
   */
  prepareBaseData() {
    super.prepareBaseData();
    prepareItemBaseData(this);
  }

  /**
   * Compute derived data for items based on type and context.
   * Delegates to preparation/derived-data module.
   * 
   * @returns {void}
   * @override
   * @see {prepareItemDerivedData}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    prepareItemDerivedData(this);
  }

  /* -------------------------------------------- */
  /* Chat                                         */
  /* -------------------------------------------- */

  /**
   * Create and send a chat message with an item-specific card.
   * Delegates to integration/chat-cards module.
   * 
   * Uses template from CHAT_CARD_TEMPLATES based on item type.
   * If no template exists for the item type, silently returns void.
   * 
   * @async
   * @returns {Promise<ChatMessage|void>} The created chat message, or void if no template
   * @example
   * // Display weapon card in chat
   * const weapon = actor.items.get(weaponId);
   * await weapon.roll();
   * @see {renderItemChatCard}
   */
  async roll() {
    return renderItemChatCard(this);
  }

  /**
   * Enhance template data with system configuration for item sheets.
   * Delegates to integration/sheet-data module.
   * 
   * Adds system-wide configuration and enriches item data for sheet rendering.
   * Called automatically by Foundry when rendering item sheets.
   * 
   * @async
   * @param {object} options - Sheet rendering options from Foundry
   * @returns {Promise<object>} Enhanced data object with config access and enriched item properties
   * @override
   * @see {enhanceItemSheetData}
   */
  async getData(options) {
    const data = await super.getData(options);
    return enhanceItemSheetData(data);
  }
}
