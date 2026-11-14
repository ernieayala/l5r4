/**
 * @module services/combat/flow
 * @description Chat cards that run a multi-step combat flow (an iaijutsu duel, a grapple). The card's state lives in
 * its flags; only the active GM changes it, so a player's step goes to the GM as a query, the step checks the
 * requesting user, and the GM re-renders the card.
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";

/**
 * The parts of a check request for a Skill Roll with a Trait or the Void Ring (p.80): the pool, the selectors, the
 * Unskilled flag, and the trained Emphases.
 * @param {Actor} actor
 * @param {string} skill  Skill name in lower case
 * @param {string} trait  Trait key, or "void"
 * @returns {object}
 */
export function skillRequest(actor, skill, trait) {
  const item = actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === skill);
  const rank = toInt(item?.system.rank);
  const value =
    trait === "void" ? toInt(actor.system.rings.void.rank) : getEffectiveTrait(actor, trait);
  return {
    actor,
    base: { roll: value + rank, keep: value },
    skill,
    ...(trait === "void" ? { ring: "void" } : { trait }),
    unskilled: rank === 0,
    emphases: item?.system.trainedEmphases ?? []
  };
}

/** Name of the GM query that runs a flow step for a player. */
const FLOW_QUERY = `${SYS_ID}.flow`;

/**
 * @typedef {object} Flow
 * @property {function(ChatMessage, object, DOMStringMap): Promise<object|null>} click  On the clicking client: roll
 *   if the step needs it, and return the step to send, or null
 * @property {function(ChatMessage, object, object, User): Promise<object>} step  On the GM: check the user, return
 *   the new state
 * @property {function(object): Promise<string>} render  The card's HTML for a state
 */

/**
 * Registered flows by name.
 * @type {Map<string, Flow>}
 */
const FLOWS = new Map();

/**
 * Register a flow.
 * @param {string} name
 * @param {Flow} flow
 */
export function defineFlow(name, flow) {
  FLOWS.set(name, flow);
}

/**
 * Post a flow card with its first state. Any user may post one; its later steps run on the GM.
 * @param {string} name
 * @param {object} state
 * @param {Actor} speaker
 * @returns {Promise<ChatMessage>}
 */
export async function startFlow(name, state, speaker) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: speaker }),
    content: await FLOWS.get(name).render(state),
    flags: { [SYS_ID]: { flow: { name, state } } }
  });
}

/**
 * Run one step on the GM: the flow updates the state, and the card re-renders.
 * @param {{messageId: string, data: object}} request
 * @param {User} user  The requesting user
 * @returns {Promise<void>}
 */
async function runStep({ messageId, data }, user) {
  const card = game.messages.get(String(messageId));
  const flow = card?.getFlag(SYS_ID, "flow");
  const handler = flow ? FLOWS.get(flow.name) : null;
  if (!handler) {
    throw new Error(`Not a flow card: ${messageId}`);
  }
  const state = await handler.step(card, foundry.utils.deepClone(flow.state), data, user);
  await card.update({
    content: await handler.render(state),
    [`flags.${SYS_ID}.flow.state`]: state
  });
}

/**
 * Ask the active GM to run a step, or run it when this user is the GM.
 * @param {ChatMessage} card
 * @param {object} data  The step: an action and its values
 * @returns {Promise<void>}
 */
export async function requestStep(card, data) {
  if (game.user.isGM) {
    return runStep({ messageId: card.id, data }, game.user);
  }
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications?.warn(T("l5r4.ui.effects.noGM"));
    return undefined;
  }
  return gm.query(FLOW_QUERY, { messageId: card.id, data });
}

/**
 * Whether a user may act for an actor (its owner or a GM).
 * @param {User} user
 * @param {Actor|null} actor
 * @returns {boolean}
 */
export function mayActFor(user, actor) {
  return Boolean(actor) && (user.isGM || actor.testUserPermission(user, "OWNER"));
}

/**
 * Wire a flow card's buttons: each `[data-flow-action]` calls the flow's `click(card, state, dataset)` on this
 * client, which rolls if needed and returns the step to send, or nothing.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindFlowCards(message, html) {
  const flow = message.getFlag(SYS_ID, "flow");
  const handler = flow ? FLOWS.get(flow.name) : null;
  if (!handler) {
    return;
  }
  for (const button of html.querySelectorAll("[data-flow-action]")) {
    button.addEventListener("click", async event => {
      event.preventDefault();
      const step = await handler.click(message, flow.state, event.currentTarget.dataset);
      if (step) {
        await requestStep(message, step);
      }
    });
  }
}

/** Register the GM side of flow steps. */
export function registerFlowQueries() {
  CONFIG.queries[FLOW_QUERY] = (request, { user }) => runStep(request, user);
}
