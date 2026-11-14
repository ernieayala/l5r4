/**
 * @module services/combat
 * @description Wires the combat loop (roadmap/STAGE-10): the attack card's Contested Strength and grapple buttons,
 * damage and result cards, flow cards (duel, grapple), the GM queries behind them, and the token controls for a
 * duel and Guard.
 */

import { SYS_ID } from "../../config/constants.js";
import { bindDamageCards, registerDamageQueries } from "./damage.js";
import { bindFlowCards, registerFlowQueries } from "./flow.js";
import { rollContest } from "./contest.js";
import { startGrapple } from "./grapple.js";
import { duelFromCanvas } from "./duel.js";
import { guardFromCanvas } from "./guard.js";

/**
 * Wire an attack card's Contested Strength (Knockdown, Disarm) and grapple buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function bindAttackCard(message, html) {
  if (message.type !== "roll" || message.system.kind !== "attack") {
    return;
  }
  html.querySelector("[data-action='combat-contest']")?.addEventListener("click", event => {
    event.preventDefault();
    rollContest(message);
  });
  html.querySelector("[data-action='grapple-start']")?.addEventListener("click", event => {
    event.preventDefault();
    startGrapple(message);
  });
}

/**
 * Add the duel (GM) and Guard buttons to the token controls.
 * @param {Record<string, object>} controls
 */
function onGetSceneControlButtons(controls) {
  if (!controls.tokens) {
    return;
  }
  const tools = controls.tokens.tools;
  tools[`${SYS_ID}-duel`] = {
    name: `${SYS_ID}-duel`,
    order: Object.keys(tools).length,
    title: "l5r4.ui.combat.duel.start",
    icon: "fa-solid fa-khanda",
    visible: game.user.isGM,
    button: true,
    onChange: () => duelFromCanvas()
  };
  tools[`${SYS_ID}-guard`] = {
    name: `${SYS_ID}-guard`,
    order: Object.keys(tools).length,
    title: "l5r4.ui.combat.guard",
    icon: "fa-solid fa-shield-halved",
    button: true,
    onChange: () => guardFromCanvas()
  };
}

/** Register the combat loop's hooks and GM queries, once during system init. */
export function initializeCombat() {
  registerDamageQueries();
  registerFlowQueries();
  Hooks.on("renderChatMessageHTML", bindAttackCard);
  Hooks.on("renderChatMessageHTML", bindDamageCards);
  Hooks.on("renderChatMessageHTML", bindFlowCards);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
}
