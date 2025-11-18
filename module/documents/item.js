/**
 * @module documents/item
 * @description Core Item document for L5R4 Enhanced system.
 *
 * Extends Foundry's Item class to implement Legend of the Five Rings 4th Edition
 * item types including:
 * - Skills (High, Bugei, Merchant, Low)
 * - Equipment (weapons, armor)
 * - Advantages and Disadvantages
 * - Spells and kiho
 * - Techniques and kata
 *
 * Architecture:
 * - Delegates lifecycle hooks to specialized modules (item-creation, item-updates)
 * - Uses preparation modules for data calculation (base-data, derived-data)
 * - Chat card rendering for rolling items to chat
 * - Sheet data enhancement for item sheet display
 *
 * @requires Foundry VTT v11+
 */

import { CHAT_CARD_TEMPLATES, DEFAULT_ICONS } from "./item/constants/item-types.js";
import { handleItemPreCreate, handleItemOnCreate } from "./item/lifecycle/item-creation.js";
import { handleItemPreUpdate } from "./item/lifecycle/item-updates.js";
import { prepareItemBaseData } from "./item/preparation/base-data.js";
import { prepareItemDerivedData } from "./item/preparation/derived-data.js";
import { renderItemChatCard } from "./item/integration/chat-cards.js";
import { enhanceItemSheetData } from "./item/integration/sheet-data.js";

/**
 * Item document for L5R4 Enhanced system.
 * Implements L5R4 item types and chat card rendering.
 */
export default class L5R4Item extends Item {
  /** @type {Object<string, string>} Map of item types to chat card template paths */
  static CHAT_CARD_TEMPLATES = CHAT_CARD_TEMPLATES;

  /** @type {Object<string, string>} Map of item types to default icon paths */
  static DEFAULT_ICONS = DEFAULT_ICONS;

  /**
   * Configure item defaults before creation.
   * Sets default icons and initializes type-specific data.
   *
   * @param {object} data - Initial item data
   * @param {object} options - Creation options
   * @param {string} userId - ID of user creating the item
   * @returns {Promise<void>}
   * @override
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);
    handleItemPreCreate(this, data);
  }

  /**
   * Handle post-creation tasks.
   * Performs additional setup after item is created in database.
   *
   * @param {object} data - Created item data
   * @param {object} options - Creation options
   * @param {string} userId - ID of user who created the item
   * @returns {Promise<void>}
   * @override
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    await handleItemOnCreate(this, data);
  }

  /**
   * Handle item updates before they are applied.
   * Validates changes and performs pre-update processing.
   *
   * @param {object} changes - Pending changes to item data
   * @param {object} options - Update options
   * @param {string} userId - ID of user performing update
   * @returns {Promise<void>}
   * @override
   */
  async _preUpdate(changes, options, userId) {
    await super._preUpdate(changes, options, userId);
    await handleItemPreUpdate(this, changes);
  }

  /**
   * Initialize base item data structures.
   * Ensures all required properties exist for item type.
   * Called before Active Effects are applied.
   *
   * @returns {void}
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    prepareItemBaseData(this);
  }

  /**
   * Calculate derived item data.
   * Computes values based on base data and effects.
   * Called after Active Effects are applied.
   *
   * @returns {void}
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    prepareItemDerivedData(this);
  }

  /**
   * Roll item to chat.
   * Renders appropriate chat card for item type (skill roll, spell description, etc.).
   *
   * @returns {Promise<ChatMessage|null>} Created chat message or null if cancelled
   */
  async roll() {
    return renderItemChatCard(this);
  }

  /**
   * Enhance item sheet data.
   * Adds computed values and formatting for sheet display.
   *
   * @param {object} options - Sheet rendering options
   * @returns {Promise<object>} Enhanced sheet data
   * @override
   */
  async getData(options) {
    const data = await super.getData(options);
    return enhanceItemSheetData(data);
  }
}
