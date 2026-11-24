/**
 * @module services/combat/attack-card
 * @description The attack card's combat buttons: Contested Strength for Knockdown and Disarm, and the start of a
 * grapple. Its damage button is wired by module/services/combat/damage.js.
 */

import { hideUnusable } from "../../utils/dom.js";
import { rollContest } from "./contest.js";
import { startGrapple } from "./grapple-start.js";

/**
 * Wire an attack card's Contested Strength (Knockdown, Disarm) and grapple buttons, each shown only to a user who
 * may press it: either side's owner rolls the contest, the attacker's owner starts the grapple (#112).
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindAttackCard(message, html) {
  if (message.type !== "roll" || message.system.kind !== "attack") {
    return;
  }
  const attacker = fromUuidSync(message.system.actorUuid);
  const target = message.system.target?.uuid ? fromUuidSync(message.system.target.uuid) : null;
  hideUnusable(html, "[data-action='combat-contest']", () =>
    Boolean(attacker?.isOwner || target?.isOwner)
  );
  hideUnusable(html, "[data-action='grapple-start']", () => Boolean(attacker?.isOwner));
  html.querySelector("[data-action='combat-contest']")?.addEventListener("click", event => {
    event.preventDefault();
    rollContest(message);
  });
  html.querySelector("[data-action='grapple-start']")?.addEventListener("click", event => {
    event.preventDefault();
    startGrapple(message);
  });
}
