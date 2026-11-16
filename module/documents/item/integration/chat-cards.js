/**
 * @module documents/item/integration/chat-cards
 * @description Posts an item to the chat log as a card: the item type's template and the item's rule summary, with
 * the owning actor as speaker, the type's localized label as flavor, and the message mode selected in the chat log.
 */

import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { R } from "../../../utils/localization.js";
import { CHAT_CARD_TEMPLATES } from "../constants/item-types.js";
import { summaryText } from "../../summary.js";

/**
 * Render an item as a chat card in the Foundry VTT chat log.
 *
 * Creates a ChatMessage displaying the item's details using a type-specific
 * Handlebars template. The message includes speaker context (from item's
 * owning actor if available), uses the core messageMode setting, and
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
 */
export async function renderItemChatCard(item) {
  const templatePath = CHAT_CARD_TEMPLATES[item.type];
  if (!templatePath) {
    return;
  }

  // The card, then what the item's rules do and the book page it cites (roadmap/STAGE-15)
  const html =
    (await R(templatePath, item)) + (await R(CHAT_TEMPLATES.itemSummary, summaryText(item.system)));

  // Localize item type label from TYPES.Item.{type} key, with title-case fallback
  // Uses optional chaining for has() as defensive check for older Foundry versions
  const typeKey = `TYPES.Item.${item.type}`;
  const typeLabel = game.i18n.has?.(typeKey)
    ? game.i18n.localize(typeKey)
    : item.type.toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase());

  // The mode is a creation option, applied in ChatMessage#_preCreate [src: client/documents/chat-message.mjs:551-556]
  return ChatMessage.create(
    {
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      flavor: `[${typeLabel}]`,
      content: html
    },
    { messageMode: game.settings.get("core", "messageMode") }
  );
}
