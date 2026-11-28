/**
 * @module services/combat/flow
 * @description Chat cards that run a multi-step flow (an iaijutsu duel, a grapple, a group's Fear test). The card's
 * state lives in
 * its flags; only the active GM makes and changes it, so a player's step goes to the GM as a query, the step checks
 * the requesting user and the roll it records (getFreshRoll), and the GM re-renders the card. A card's steps run one
 * at a time, each reading the card fresh, so two steps sent together are both kept (#164). The GM can always correct a
 * card: Redo clears the step in play and End stops the flow, even when a participant is gone (#164, #223). A roll
 * that replaces a recorded one (an Honor Roll, a re-roll keeping the better) takes its place while no later step
 * depends on it (#169).
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { hideUnusable } from "../../utils/dom.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";
import { queueWrite } from "../write-queue.js";

/** Name of the GM query that runs a flow step for a player. */
const FLOW_QUERY = `${SYS_ID}.flow`;

/**
 * @typedef {object} Flow
 * @property {function(ChatMessage, object, {dataset: DOMStringMap, shiftKey: boolean}): Promise<object|null>} click  On
 *   the clicking client, with the button pressed and whether Shift was held: roll if the step needs it, and return the
 *   step to send, or null
 * @property {function(object, DOMStringMap): Actor|null} actorOf  The actor a button acts for; the card shows the
 *   button only to that actor's owners (#112)
 * @property {function(object, {card: ChatMessage, data: object, user: User}): Promise<object>} step  On the GM:
 *   check the user, return the new state
 * @property {function(object, {originalId: string, roll: ChatMessage}): Promise<object|null>} replace  On the GM:
 *   put a roll that replaces a recorded one (an Honor Roll, a re-roll keeping the better) in its place and settle its
 *   stage again; null when a later step already depends on the original (#169)
 * @property {function(object): object} redo  On the GM: the state with the step in play cleared
 * @property {function(object): Promise<object>} end  On the GM: the state ended, its statuses cleared
 * @property {function(object): Promise<string>} render  The card's HTML for a state
 */

/** The GM's own corrections a flow card offers, which any flow handles through `redo` and `end`. */
const GM_ACTIONS = Object.freeze(["redo", "end"]);

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
 * Wire a flow card's buttons: each `[data-flow-action]` calls the flow's `click(card, state, press)` on this client,
 * which rolls if needed and returns the step to send, or nothing.
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
  hideUnusable(html, "[data-flow-gm]", () => game.user.isGM);
  for (const button of html.querySelectorAll("[data-flow-action]")) {
    button.addEventListener("click", event => onFlowClick(event, message, handler));
  }
  for (const button of html.querySelectorAll("[data-flow-gm]")) {
    button.addEventListener("click", event => {
      event.preventDefault();
      requestStep(message, { action: event.currentTarget.dataset.flowGm });
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

/**
 * Send a roll that replaces another (an Honor Roll, a re-roll keeping the better) to every flow card that recorded the
 * original, so each puts it in the original's place (#169, Ernie's ruling).
 * game-rules/43_honor.md, p.92
 * @param {ChatMessage} original - The roll replaced
 * @param {ChatMessage} replacement - The roll that replaces it
 * @returns {Promise<void>}
 */
export async function applyRerollToFlows(original, replacement) {
  const cards = game.messages.filter(card =>
    (card.getFlag(SYS_ID, "flow")?.state.usedRolls ?? []).includes(original.id)
  );
  for (const card of cards) {
    await requestStep(card, { action: "replace", of: original.id, rollId: replacement.id });
  }
}

/**
 * Tell the table a roll came too late to replace the one a flow or contest recorded: a later step already depends on
 * it, so the GM corrects the card with Redo (#169).
 * @param {Actor|null} actor - The roller
 * @returns {Promise<ChatMessage>}
 */
export async function postReplacedTooLate(actor) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.note, {
      lines: [F("l5r4.ui.requests.replacedTooLate", { name: actor?.name ?? "?" })]
    })
  });
}

/** Register the GM side of flow steps. */
export function registerFlowQueries() {
  registerGmQuery(FLOW_QUERY, (request, { user }) => applyFlowStep(request, user));
}

/**
 * A flow button pressed on this client: the flow's `click` gets the button and whether Shift was held, then its step
 * goes to the GM.
 * @param {MouseEvent} event
 * @param {ChatMessage} message - The flow card, its state as rendered
 * @param {Flow} handler - The flow
 * @returns {Promise<void>}
 */
async function onFlowClick(event, message, handler) {
  event.preventDefault();
  // No roll is made that no GM could record (#164)
  if (!game.user.isGM && !game.users.activeGM) {
    ui.notifications?.warn(T("l5r4.ui.effects.noGM"));
    return;
  }
  const press = { dataset: event.currentTarget.dataset, shiftKey: event.shiftKey };
  const step = await handler.click(message, message.getFlag(SYS_ID, "flow").state, press);
  if (step) {
    await requestStep(message, step);
  }
}

/**
 * Run one step on the GM after the card's earlier steps, so each reads the state the one before wrote (#164).
 * @param {{messageId: string, data: object}} request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
function applyFlowStep(request, user) {
  return queueWrite(`flow:${request.messageId}`, () => updateFlowCard(request, user));
}

/**
 * Run one step on the GM: the flow updates the state read fresh from the card, and the card re-renders. Redo and End
 * are the GM's own.
 * @param {{messageId: string, data: object}} request
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function updateFlowCard({ messageId, data }, user) {
  const card = game.messages.get(String(messageId));
  // A flow card is the GM's client's: a player's own message carrying a flow could hold any state (#162)
  const flow = card?.author?.isGM ? card.getFlag(SYS_ID, "flow") : null;
  const handler = flow ? flows.get(flow.name) : null;
  if (!handler) {
    throw new Error("l5r4.ui.requests.notFlowCard");
  }
  const state = foundry.utils.deepClone(flow.state);
  let next;
  if (GM_ACTIONS.includes(data?.action)) {
    if (!user.isGM) {
      throw new Error("l5r4.ui.requests.gmCorrects");
    }
    next = data.action === "redo" ? handler.redo(state) : await handler.end(state);
  } else if (data?.action === "replace") {
    next = await applyFlowReplacement(handler, state, { data, user });
  } else {
    next = await handler.step(state, { card, data, user });
  }
  if (!next) {
    return;
  }
  await card.update({
    content: await handler.render(next),
    [`flags.${SYS_ID}.flow.state`]: next
  });
}

/**
 * A replacement step on the GM: the roll is checked, the user must act for its roller, and the flow puts it in the
 * original's place. When a later step depends on the original, the table is told and the card stays as it is (#169).
 * game-rules/43_honor.md, p.92
 * @param {Flow} handler - The card's flow
 * @param {object} state - The flow's state, read fresh
 * @param {{data: object, user: User}} step - The step and the requesting user
 * @returns {Promise<object|null>} The new state, or null when the card stays as it is
 */
async function applyFlowReplacement(handler, state, { data, user }) {
  const { original, roll } = getReplacementRoll(state, data);
  const actor = fromUuidSync(roll.system.actorUuid) ?? null;
  if (!canActFor(user, actor)) {
    throw new Error("l5r4.ui.requests.notReplacement");
  }
  const next = await handler.replace(state, { originalId: original.id, roll });
  if (!next) {
    await postReplacedTooLate(actor);
  }
  return next;
}

/**
 * The roll that replaces one the flow recorded, checked on the GM: a roll message that names the original as the roll
 * it re-rolled, by the same actor, the original recorded by this flow and the replacement not yet. The flow's state
 * keeps it in `usedRolls`.
 * @param {object} state - The flow's state, whose `usedRolls` gains the replacement
 * @param {{of: string, rollId: string}} data - The step: the original and the replacement (from another client)
 * @returns {{original: ChatMessage, roll: ChatMessage}}
 */
function getReplacementRoll(state, data) {
  const used = state.usedRolls ?? [];
  const original = used.includes(String(data.of)) ? game.messages.get(String(data.of)) : null;
  const roll = game.messages.get(String(data.rollId));
  const replaces =
    Boolean(original) &&
    roll?.type === "roll" &&
    [roll.system.honorRollOf, roll.system.rerollOf].includes(original.id) &&
    roll.system.actorUuid === original.system.actorUuid &&
    !used.includes(roll.id);
  if (!replaces) {
    throw new Error("l5r4.ui.requests.notReplacement");
  }
  state.usedRolls = [...used, roll.id];
  return { original, roll };
}
