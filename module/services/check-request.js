/**
 * @module services/check-request
 * @description The GM's request card (roadmap/STAGE-14): a Check link's second button posts a `checkRequest`
 * message, and each player's Roll button on it rolls the check with their own character through the same request a
 * Check link makes (module/services/links.js).
 */

import { CHAT_TEMPLATES } from "../config/templates.js";
import { T } from "../utils/localization.js";
import { rollCheck } from "./dice/check/roll-check.js";
import { getRollActor } from "./dice/resources/void-points.js";
import { checkRequestOf, formatLinkText } from "./links.js";

/**
 * Post a request card for a Check link. GMs only.
 * @param {import("../utils/link-syntax.js").LinkSpec} spec - A Check link that parsed
 * @returns {Promise<ChatMessage|null>}
 */
export async function postCheckRequest(spec) {
  if (!game.user.isGM) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  const system = {
    label: spec.label,
    skill: spec.skill,
    trait: spec.trait,
    ring: spec.ring,
    tn: spec.tn
  };
  const content = await foundry.applications.handlebars.renderTemplate(
    CHAT_TEMPLATES.checkRequest,
    {
      text: formatLinkText(spec),
      tn: spec.tn
    }
  );
  return ChatMessage.create({
    type: "checkRequest",
    system,
    content,
    speaker: ChatMessage.getSpeaker({ alias: game.user.name })
  });
}

/**
 * Wire a request card's Roll button: the clicking user rolls with their own character (their controlled token,
 * else their assigned character). The card's stored request is read back through its data model.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindCheckRequestCard(message, html) {
  if (message.type !== "checkRequest") {
    return;
  }
  html
    .querySelector("[data-action='check-request-roll']")
    ?.addEventListener("click", async event => {
      event.preventDefault();
      const actor = getRollActor();
      if (!actor) {
        ui.notifications?.warn(T("l5r4.ui.links.noActor"));
        return;
      }
      const request = checkRequestOf(actor, message.system);
      if (request) {
        await rollCheck(request);
      }
    });
}
