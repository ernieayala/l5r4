/**
 * @fileoverview Chat Card Rendering Integration
 * 
 * Handles rendering of item-specific chat cards with proper templates and
 * speaker attribution. Provides roll() method logic for chat integration.
 * 
 * **Responsibilities:**
 * - Render item-specific chat card templates
 * - Create chat messages with proper speaker and roll mode
 * - Provide localized flavor text for item types
 * - Handle missing templates gracefully
 * 
 * **Architecture:**
 * Integration logic called from item.roll() method to display items in chat.
 * Uses type-specific Handlebars templates for rich card formatting.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { CHAT_CARD_TEMPLATES } from "../constants/item-types.js";

/**
 * Render and send item chat card to chat log.
 * 
 * Renders the appropriate template for the item type and posts it to chat
 * with proper speaker attribution and roll mode settings. Returns the created
 * chat message for further processing if needed.
 * 
 * **Template Selection:**
 * - Uses CHAT_CARD_TEMPLATES mapping to find type-specific template
 * - Returns early if no template exists for item type
 * - Passes full item context to template (item.system available)
 * 
 * **Chat Message Settings:**
 * - Speaker: Derived from item.actor if embedded, otherwise generic
 * - Roll Mode: Uses current user's roll mode setting
 * - Flavor: Localized item type label in brackets [Type]
 * 
 * **Error Handling:**
 * - Template rendering failures are not caught; will propagate to caller
 * - Missing templates result in early return (void)
 * - Missing i18n keys fall back to raw item.type string
 * 
 * @async
 * @param {L5R4Item} item - The item to display in chat
 * @returns {Promise<ChatMessage|void>} Created chat message or void if no template
 * @throws {Error} If template rendering fails or ChatMessage.create fails
 * 
 * @example
 * // Display a weapon in chat when clicked
 * const weapon = actor.items.getName("Katana");
 * const message = await renderItemChatCard(weapon);
 * if (message) console.log(`Posted message ${message.id}`);
 */
export async function renderItemChatCard(item) {
  const templatePath = CHAT_CARD_TEMPLATES[item.type];
  if (!templatePath) return;

  // Render template with full item context (templates can access item.system)
  const html = await foundry.applications.handlebars.renderTemplate(templatePath, item);

  // Get localized item type label for chat flavor text
  const typeKey = `TYPES.Item.${item.type}`;
  const typeLabel = game.i18n.has?.(typeKey) ? game.i18n.localize(typeKey) : item.type;

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    rollMode: game.settings.get("core", "rollMode"),
    flavor: `[${typeLabel}]`,
    content: html ?? "" // Fallback to empty string if template returns null/undefined
  });
}
