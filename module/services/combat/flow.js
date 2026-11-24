/**
 * @module services/combat/flow
 * @description Chat cards that run a multi-step combat flow (an iaijutsu duel, a grapple). The card's state lives in
 * its flags; only the active GM makes and changes it, so a player's step goes to the GM as a query, the step checks
 * the requesting user and the roll it records (getFreshRoll), and the GM re-renders the card.
 */

import { SYS_ID } from "../../config/constants.js";
import { toInt } from "../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { hideUnusable } from "../../utils/dom.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";

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
 * Ask the active GM to run a step, or run it when this user is the GM; a refusal is shown to this user.
 * @param {ChatMessage} card
 * @param {object} data - The step: an action and its values
 * @returns {Promise<void>}
 */
export async function requestStep(card, data) {
  await requestGmQuery(FLOW_QUERY, { messageId: card.id, data }, applyFlowStep);
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

/**
 * The roll a step records, checked on the GM: a roll message by the side's actor, of the kind the step expects, posted
 * after the flow card, and not recorded by the flow before, so an old roll or one roll twice cannot fill a step (#162).
 * The flow's state keeps the rolls it recorded in `usedRolls`.
 * @param {ChatMessage} card - The flow card
 * @param {object} state - The flow's state, whose `usedRolls` gains the roll
 * @param {{rollId: string, actor: Actor, kinds: string[]}} expected - The roll named, its actor, and the kinds allowed
 * @returns {ChatMessage}
 */
export function getFreshRoll(card, state, { rollId, actor, kinds }) {
  const roll = game.messages.get(String(rollId));
  const fresh =
    roll?.type === "roll" &&
    roll.system.actorUuid === actor.uuid &&
    kinds.includes(roll.system.kind) &&
    roll.timestamp >= card.timestamp &&
    !(state.usedRolls ?? []).includes(roll.id);
  if (!fresh) {
    throw new Error("l5r4.ui.requests.notFreshRoll");
  }
  state.usedRolls = [...(state.usedRolls ?? []), roll.id];
  return roll;
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
  // A flow card is the GM's client's: a player's own message carrying a flow could hold any state (#162)
  const flow = card?.author?.isGM ? card.getFlag(SYS_ID, "flow") : null;
  const handler = flow ? flows.get(flow.name) : null;
  if (!handler) {
    throw new Error("l5r4.ui.requests.notFlowCard");
  }
  const state = await handler.step(foundry.utils.deepClone(flow.state), { card, data, user });
  await card.update({
    content: await handler.render(state),
    [`flags.${SYS_ID}.flow.state`]: state
  });
}
