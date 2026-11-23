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
import { hideUnusable } from "../../utils/dom.js";
import { registerGmQuery } from "../gm-client.js";

/** Name of the GM query that runs a flow step for a player. */
const FLOW_QUERY = `${SYS_ID}.flow`;

/**
 * @typedef {object} Flow
 * @property {function(ChatMessage, object, DOMStringMap): Promise<object|null>} click  On the clicking client: roll
 *   if the step needs it, and return the step to send, or null
 * @property {function(object, DOMStringMap): Actor|null} actorOf  The actor a button acts for; the card shows the
 *   button only to that actor's owners (#112)
 * @property {function(object, {card: ChatMessage, data: object, user: User}): Promise<object>} step  On the GM:
 *   check the user, return the new state
 * @property {function(object): Promise<string>} render  The card's HTML for a state
 */

/**
 * Registered flows by name.
 * @type {Map<string, Flow>}
 */
const flows = new Map();

/**
 * The parts of a check request for a Skill Roll with a Trait or the Void Ring: the pool, the selectors, the
 * Unskilled flag, and the trained Emphases.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {Actor} actor
 * @param {string} skill - Skill name in lower case
 * @param {string} trait - Trait key, or "void"
 * @returns {object}
 */
export function buildSkillRequest(actor, skill, trait) {
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

/**
 * Register a flow.
 * @param {string} name
 * @param {Flow} flow
 */
export function registerFlow(name, flow) {
  flows.set(name, flow);
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
    content: await flows.get(name).render(state),
    flags: { [SYS_ID]: { flow: { name, state } } }
  });
}

/**
 * Ask the active GM to run a step, or run it when this user is the GM.
 * @param {ChatMessage} card
 * @param {object} data - The step: an action and its values
 * @returns {Promise<void>}
 */
export async function requestStep(card, data) {
  if (game.user.isGM) {
    return applyFlowStep({ messageId: card.id, data }, game.user);
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
export function canActFor(user, actor) {
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
  const handler = flow ? flows.get(flow.name) : null;
  if (!handler) {
    return;
  }
  hideUnusable(html, "[data-flow-action]", button =>
    Boolean(handler.actorOf(flow.state, button.dataset)?.isOwner)
  );
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
  registerGmQuery(FLOW_QUERY, (request, { user }) => applyFlowStep(request, user));
}

/**
 * Run one step on the GM: the flow updates the state, and the card re-renders.
 * @param {{messageId: string, data: object}} request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyFlowStep({ messageId, data }, user) {
  const card = game.messages.get(String(messageId));
  const flow = card?.getFlag(SYS_ID, "flow");
  const handler = flow ? flows.get(flow.name) : null;
  if (!handler) {
    throw new Error(`Not a flow card: ${messageId}`);
  }
  const state = await handler.step(foundry.utils.deepClone(flow.state), { card, data, user });
  await card.update({
    content: await handler.render(state),
    [`flags.${SYS_ID}.flow.state`]: state
  });
}
