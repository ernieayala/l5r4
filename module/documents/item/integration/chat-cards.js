/**
 * Chat Card Rendering Module
 *
 * Handles rendering L5R4 item documents as chat cards in the Foundry VTT
 * chat log. Maps item types to Handlebars templates and creates ChatMessage
 * documents with appropriate speaker context and formatting.
 *
 * Integrates with Foundry's ChatMessage API to display item information
 * in a formatted card layout, respecting the user's configured roll mode
 * and generating localized type labels.
 *
 * Requires Foundry VTT v10+ for:
 * - ChatMessage.create() - Chat message document creation
 * - ChatMessage.getSpeaker() - Speaker context from actor
 * - game.settings.get() - Roll mode setting retrieval
 * - game.i18n.has() / localize() - Type label localization
 *
 * @module documents/item/integration/chat-cards
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html|Foundry ChatMessage API}
 */

import { CHAT_CARD_TEMPLATES } from "../constants/item-types.js";
import { R } from "../../../utils/localization.js";

/**
 * Render an item as a chat card in the Foundry VTT chat log.
 *
 * Creates a ChatMessage displaying the item's details using a type-specific
 * Handlebars template. The message includes speaker context (from item's
 * owning actor if available), respects the current roll mode setting, and
 * displays a localized item type label as flavor text.
 *
 * Template selection is based on item.type using CHAT_CARD_TEMPLATES lookup.
 * If no template exists for the item type, the function returns early without
 * creating a message.
 *
 * The type label is localized from TYPES.Item.{itemType} translation keys,
 * with a fallback to title-casing the item type string if no translation exists.
 * This provides graceful degradation for custom or unrecognized item types.
 *
 * @param {L5R4Item} item - The item document to render as a chat card
 * @returns {Promise<ChatMessage|undefined>} Created ChatMessage document, or undefined if no template exists for item type
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html#create|ChatMessage.create}
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html#getSpeaker|ChatMessage.getSpeaker}
 */
export async function renderItemChatCard(item) {
  const templatePath = CHAT_CARD_TEMPLATES[item.type];
  if (!templatePath) {
    return;
  }

  const html = await R(templatePath, item);

  // Localize item type label from TYPES.Item.{type} key, with title-case fallback
  // Uses optional chaining for has() as defensive check for older Foundry versions
  const typeKey = `TYPES.Item.${item.type}`;
  const typeLabel = game.i18n.has?.(typeKey)
    ? game.i18n.localize(typeKey)
    : item.type.toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase());

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    rollMode: game.settings.get("core", "rollMode"),
    flavor: `[${typeLabel}]`,
    content: html ?? ""
  });
}
