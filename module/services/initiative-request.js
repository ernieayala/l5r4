/**
 * @module services/initiative-request
 * @description A PC's Initiative sent to their player (#165). Spending a Void Point for +10 Initiative is the player's
 * choice, so when a GM rolls Initiative for a PC that marked one and whose player is connected, the GM's client does
 * not ask it: it whispers that PC's owners and the GMs a request card. The player's press rolls on their own client,
 * where the Void Point question opens; the GM's press rolls for them, with the question on the GM's screen, so a
 * player who stepped away never stalls the table. A PC with no Void Point left has no choice to make and rolls at
 * once.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/31_combat_round.md, p.81
 */

import { SYS_ID } from "../config/constants.js";
import { CHAT_TEMPLATES } from "../config/templates.js";
import { hideUnusable } from "../utils/dom.js";
import { F, R, T } from "../utils/localization.js";
import { hasActivePlayer } from "../utils/ownership.js";

/** The request card's button. */
const ROLL_BUTTON = "[data-action='initiative-request-roll']";

/**
 * On a GM's client, send each PC combatant whose player is connected and whose Void Point is still to choose to that
 * player as a request card, and tell the GM. A combatant whose card is in the chat log already gets no second one.
 * @param {foundry.documents.Combatant[]} combatants - The combatants about to roll, each one the user owns
 * @returns {Promise<Set<string>>} The ids of those sent, which this roll leaves out
 */
export async function postInitiativeRequests(combatants) {
  const sent = new Set();
  if (!game.user.isGM) {
    return sent;
  }
  for (const combatant of combatants.filter(isPlayersChoice)) {
    sent.add(combatant.id);
    if (!game.messages.some(message => requestOf(message)?.combatantId === combatant.id)) {
      await postRequestCard(combatant);
    }
    ui.notifications?.info(F("l5r4.ui.combat.initiativeRequestSent", { name: combatant.name }));
  }
  return sent;
}

/**
 * Wire a request card's button for the PC's owners and the GMs: it rolls that combatant's Initiative on this client,
 * the Void Point question included. A request card is the GM's, so one a player posted shows no button (#162).
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindInitiativeRequestCard(message, html) {
  const request = requestOf(message);
  if (!request) {
    return;
  }
  hideUnusable(html, ROLL_BUTTON, () =>
    Boolean(message.author?.isGM && (game.user.isGM || combatantOf(request)?.isOwner))
  );
  html.querySelector(ROLL_BUTTON)?.addEventListener("click", event => {
    event.preventDefault();
    rollRequestedInitiative(request);
  });
}

/**
 * Whether a combatant's Initiative holds a choice for a connected player: a PC that marked a Void Point and has one.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {foundry.documents.Combatant} combatant
 * @returns {boolean}
 */
function isPlayersChoice(combatant) {
  const actor = combatant.actor;
  return (
    actor?.type === "pc" &&
    actor.system.initiative.useVoid &&
    actor.system.rings.void.value > 0 &&
    hasActivePlayer(actor, game.users)
  );
}

/**
 * Post a combatant's request card, whispered to its actor's owners and the GMs.
 * @param {foundry.documents.Combatant} combatant
 * @returns {Promise<ChatMessage>}
 */
async function postRequestCard(combatant) {
  const actor = combatant.actor;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users
      .filter(user => user.isGM || actor.testUserPermission(user, "OWNER"))
      .map(user => user.id),
    content: await R(CHAT_TEMPLATES.initiativeRequest, { name: combatant.name }),
    flags: {
      [SYS_ID]: {
        initiativeRequest: { combatId: combatant.parent.id, combatantId: combatant.id }
      }
    }
  });
}

/**
 * The request a card carries, read back from chat: its combat's and combatant's ids.
 * @param {ChatMessage} message
 * @returns {{combatId: string, combatantId: string}|null}
 */
function requestOf(message) {
  const request = message.getFlag(SYS_ID, "initiativeRequest");
  return request
    ? { combatId: String(request.combatId), combatantId: String(request.combatantId) }
    : null;
}

/**
 * The combatant a request names, while its combat lasts.
 * @param {{combatId: string, combatantId: string}} request
 * @returns {foundry.documents.Combatant|undefined}
 */
function combatantOf({ combatId, combatantId }) {
  return game.combats.get(combatId)?.combatants.get(combatantId);
}

/**
 * Roll the Initiative a card asks for on this client. A combatant gone or rolled already is said so, and nothing rolls:
 * the GM rerolls from the combat tracker.
 * @param {{combatId: string, combatantId: string}} request
 * @returns {Promise<void>}
 */
async function rollRequestedInitiative(request) {
  const combatant = combatantOf(request);
  if (!combatant) {
    ui.notifications?.warn(T("l5r4.ui.combat.initiativeRequestGone"));
    return;
  }
  if (combatant.initiative !== null) {
    ui.notifications?.warn(F("l5r4.ui.combat.initiativeRequestDone", { name: combatant.name }));
    return;
  }
  await combatant.parent.rollInitiative([combatant.id], { answeringRequest: true });
}
