/**
 * @module services/combat/attack-card
 * @description The attack card's combat buttons: Contested Strength for Knockdown and Disarm, and the start of a
 * grapple. Its damage button is wired by module/services/combat/damage.js.
 */

import { rollContest } from "./contest.js";
import { startGrapple } from "./grapple.js";

/**
 * Wire an attack card's Contested Strength (Knockdown, Disarm) and grapple buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindAttackCard(message, html) {
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
