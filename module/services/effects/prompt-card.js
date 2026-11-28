/**
 * @module services/effects/prompt-card
 * @description A prompt card: the chat card that asks an actor's owner to roll for an effect, its request stored in its
 * message's flags, which only its author (the GM's client) can change. The card is read back only from a message the
 * GM's client posted, so a player's own message carrying a prompt does nothing (#162), and answered only while what it
 * asks about still holds (#179). prompts.js posts the cards and applies their rolls.
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { T } from "../../utils/localization.js";
import { askGmAllow } from "../gm-allow.js";
import { startedCombatOf } from "./uses.js";

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
 * Whether the user may answer a prompt card now: the prompted actor's owner, on a card not yet answered. A card whose
 * stance or Round has passed asks the GM, who may allow it anyway (#179). Each refusal tells the user why.
 * @param {ChatMessage} message - The prompt card
 * @param {Actor|null} actor - The prompted actor
 * @returns {Promise<boolean>}
 */
export async function canAnswerPrompt(message, actor) {
  if (!actor?.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return false;
  }
  if (message.getFlag(SYS_ID, "promptAnswered")) {
    ui.notifications?.info(T("l5r4.ui.effects.promptAnswered"));
    return false;
  }
  const lapsed = getPromptLapse(actor, promptOf(message));
  return (
    !lapsed ||
    askGmAllow({ title: actor.name, reason: T(lapsed), ask: T("l5r4.ui.requests.allowRequest") })
  );
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

/**
 * Why a prompt card no longer asks what it asked, as an i18n key, or null when it still holds: a Full Defense card
 * whose actor has left the stance, whose bonus comes only with it, or a save card from an earlier Round or another
 * combat, as a save is made once a Round.
 * game-rules/36_stances.md, p.84
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} actor - The prompted actor
 * @param {object} request - The card's stored request
 * @returns {string|null}
 */
function getPromptLapse(actor, request) {
  if (request.kind === "fullDefense") {
    return actor.statuses.has("fullDefenseStance") ? null : "l5r4.ui.effects.promptLapsedStance";
  }
  if (request.kind !== "save" || !request.combatId) {
    return null;
  }
  const combat = startedCombatOf(actor);
  const current = combat?.id === request.combatId && combat.round === request.round;
  return current ? null : "l5r4.ui.effects.promptLapsedRound";
}
