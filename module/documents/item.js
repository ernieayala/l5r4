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
 */

import { SYS_ID } from "../config/constants.js";
import { CHAT_CARD_TEMPLATES, DEFAULT_ICONS } from "./item/constants/item-types.js";
import { handleItemPreCreate, handleItemOnCreate } from "./item/lifecycle/item-creation.js";
import { forgetGrant, syncGrants, ungrant } from "./item/lifecycle/grants.js";
import { handleItemPreUpdate } from "./item/lifecycle/item-updates.js";
import { prepareItemBaseData } from "./item/preparation/base-data.js";
import { prepareItemDerivedData } from "./item/preparation/derived-data.js";
import { renderItemChatCard } from "./item/integration/chat-cards.js";

/**
 * Item document for L5R4 Enhanced system.
 * Implements L5R4 item types and chat card rendering.
 */
export default class L5R4Item extends Item {
  /** @type {Record<string, string>} Map of item types to chat card template paths */
  static CHAT_CARD_TEMPLATES = CHAT_CARD_TEMPLATES;

  /** @type {Record<string, string>} Map of item types to default icon paths */
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
    if (userId === game.user.id && this.actor) {
      syncGrants(this.actor);
    }
    await handleItemOnCreate(this, data);
  }

  /**
   * After an owned item changes (its rules, a choice, a Skill rank that moves Insight Rank, a School Rank), grant
   * whatever has come due (module/documents/item/lifecycle/grants.js). Only the user who made the change does it.
   * @override
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id && this.actor) {
      syncGrants(this.actor);
    }
  }

  /**
   * A deleted giver takes back what it granted; a deleted granted item is noted on its giver, so it is not granted
   * again (roadmap/STAGE-11 decision 7); an active kata or kiho ends.
   * @override
   */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (userId !== game.user.id || !this.actor) {
      return;
    }
    if (this.getFlag(SYS_ID, "grants")?.length) {
      ungrant(this.actor, this);
    }
    if (this.getFlag(SYS_ID, "grantedBy")) {
      forgetGrant(this.actor, this);
    }
    // An activated kata or kiho ends with its item (module/services/effects/activation.js)
    const activations = this.actor.effects
      .filter(effect => effect.getFlag(SYS_ID, "activatedFrom") === this.id)
      .map(effect => effect.id);
    if (activations.length) {
      this.actor.deleteEmbeddedDocuments("ActiveEffect", activations);
    }
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
}
