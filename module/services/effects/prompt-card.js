/**
 * @module services/effects/prompt-card
 * @description A prompt card: the chat card that asks an actor's owner to roll for an effect, its request stored in its
 * message's flags, which only its author (the GM's client) can change. The card is read back only from a message the
 * GM's client posted, so a player's own message carrying a prompt does nothing (#162). prompts.js posts the cards and
 * applies their rolls.
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { T } from "../../utils/localization.js";

/**
 * Post a prompt card for an actor.
 * @param {Actor} actor
 * @param {object} request - Stored in the message flags; `kind` names the handler
 * @param {{title: string, text?: string, button: string}} card
 * @returns {Promise<ChatMessage>}
 */
export async function postPrompt(actor, request, card) {
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.effectPrompt,
    card
  );
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [SYS_ID]: { prompt: { actorUuid: actor.uuid, ...request } } }
  });
}

/**
 * A prompt card's request, from a card the GM's client posted.
 * @param {ChatMessage|undefined} message
 * @returns {object|null}
 */
export function promptOf(message) {
  return message?.author?.isGM ? (message.getFlag(SYS_ID, "prompt") ?? null) : null;
}

/**
 * Label of a save's roll: the Ring or Trait name.
 * @param {string} roll - "ring:earth" or "trait:wil"
 * @returns {string}
 */
export function formatRollLabel(roll) {
  const [type, key] = roll.split(":");
  return T(type === "ring" ? `l5r4.ui.mechanics.rings.${key}` : `l5r4.ui.mechanics.traits.${key}`);
}
