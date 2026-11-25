/**
 * @module documents/item/lifecycle/grant-notes
 * @description The chat notes GrantItem rules post (module/documents/item/lifecycle/grants.js): that a grant which
 * waited for a School Rank has come, and that a grant could not be made, to the GM and the owners (#143).
 * game-rules/49_improving_your_character.md, p.104
 */

import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { F, R } from "../../../utils/localization.js";

/**
 * The grant problems already noted this session, by actor and message, so a grant tried again on every change notes
 * its problem once.
 * @type {Set<string>}
 */
const noted = new Set();

/**
 * Post a note that a grant could not be made, to the GM and the actor's owners, once a session for each problem: a
 * grant is tried again on every change to the actor.
 * @param {Actor} actor
 * @param {string} line - The localized problem, naming the giver
 * @returns {Promise<void>}
 */
export async function postGrantProblem(actor, line) {
  const key = `${actor.uuid}|${line}`;
  if (noted.has(key)) {
    return;
  }
  noted.add(key);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users
      .filter(user => user.isGM || actor.testUserPermission(user, "OWNER"))
      .map(user => user.id),
    content: await R(CHAT_TEMPLATES.note, { lines: [line] })
  });
}

/**
 * Post the chat note that a grant which waited for a School Rank has come.
 * game-rules/49_improving_your_character.md, p.104
 * @param {Actor} actor
 * @param {object} grant
 * @param {Item} grant.giver - The item whose rule grants it
 * @param {Item} grant.source - The item granted
 * @param {number} grant.rank - The School Rank it waited for
 * @returns {Promise<void>}
 */
export async function postGrantNote(actor, { giver, source, rank }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await R(CHAT_TEMPLATES.note, {
      lines: [
        F("l5r4.ui.grants.granted", {
          name: actor.name,
          item: source.name,
          giver: giver.name,
          rank
        })
      ]
    })
  });
}
