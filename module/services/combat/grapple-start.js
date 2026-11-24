/**
 * @module services/combat/grapple-start
 * @description Starting a grapple from a hit with the Grapple maneuver: both sides become Grappled and the attacker is
 * in control. The GM's client starts it, after checking the hit, and posts the grapple card, so a player cannot write
 * the card's state (#162); grapple.js runs the card's steps, and importing it registers that flow before a card is
 * posted.
 * game-rules/40_grappling.md, p.88-89
 */

import { SYS_ID } from "../../config/constants.js";
import { F, T } from "../../utils/localization.js";
import { updateCheckCardUse } from "../dice/check/card.js";
import { applyEffect } from "../effects/apply.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";
import { startFlow } from "./flow.js";
import { GRAPPLED } from "./grapple.js";

/** Name of the GM query that starts a grapple for a player. */
const GRAPPLE_QUERY = `${SYS_ID}.startGrapple`;

/**
 * Start a grapple from a hit with the Grapple maneuver, through the GM's client.
 * @param {ChatMessage} attack - The attack message
 * @returns {Promise<ChatMessage|null>} The grapple card, or null when it did not start
 */
export async function startGrapple(attack) {
  const attacker = fromUuidSync(attack.system.actorUuid);
  if (!attacker?.isOwner || !fromUuidSync(attack.system.target.uuid)) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  if (attack.getFlag(SYS_ID, "used")?.grapple) {
    ui.notifications?.info(T("l5r4.ui.combat.grappleStarted"));
    return null;
  }
  const cardId = await requestGmQuery(GRAPPLE_QUERY, { messageId: attack.id }, applyGrappleStart);
  return cardId ? (game.messages.get(cardId) ?? null) : null;
}

/** Register the GM side of startGrapple. */
export function registerGrappleQueries() {
  registerGmQuery(GRAPPLE_QUERY, (request, { user }) => applyGrappleStart(request, user));
}

/**
 * Start a grapple on the GM: the attack must be a hit with the Grapple maneuver by a character the user owns, against a
 * target. Both sides become Grappled and the GM's client posts the card.
 * game-rules/40_grappling.md, p.88-89
 * @param {{messageId: string}} request - From the requesting client
 * @param {User} user - The requesting user
 * @returns {Promise<string>} The grapple card's id
 */
async function applyGrappleStart({ messageId }, user) {
  const attack = game.messages.get(String(messageId));
  const attacker = attack?.type === "roll" ? fromUuidSync(attack.system.actorUuid) : null;
  const target = attacker ? fromUuidSync(attack.system.target.uuid) : null;
  const hit = attack?.system.kind === "attack" && attack.system.outcome.success === true;
  if (!hit || !attack.system.maneuvers?.grapple || !target) {
    throw new Error("l5r4.ui.requests.notGrappleHit");
  }
  if (!attacker.testUserPermission(user, "OWNER")) {
    throw new Error("l5r4.ui.requests.notYourSide");
  }
  // A hit starts one grapple; its card then says so (#140)
  if (attack.getFlag(SYS_ID, "used")?.grapple) {
    throw new Error("l5r4.ui.combat.grappleStarted");
  }
  for (const actor of [attacker, target]) {
    if (!actor.statuses.has(GRAPPLED)) {
      await applyEffect(actor, GRAPPLED);
    }
  }
  const card = await startFlow("grapple", buildGrappleState(attack, attacker, target), attacker);
  await updateCheckCardUse(attack, { grapple: card.id });
  return card.id;
}

/**
 * A new grapple's state: the attacker in control, with the Skill the grapple began with. A grapple begun with a
 * Weapon Skill is a weapon grapple; an "Unarmed" item rolled with Jiujutsu is not.
 * game-rules/40_grappling.md, p.89
 * @param {ChatMessage} attack - The attack message
 * @param {Actor} attacker
 * @param {Actor} target
 * @returns {object}
 */
function buildGrappleState(attack, attacker, target) {
  const skill = attack.system.skill || "jiujutsu";
  const weapon = skill !== "jiujutsu" && attack.system.weaponUuid ? attack.system.damage : null;
  return {
    sides: [attacker.uuid, target.uuid],
    skill,
    weapon: weapon?.label ? { ...weapon } : null,
    control: 0,
    rolls: [null, null],
    log: [F("l5r4.ui.combat.grapple.inControl", { name: attacker.name })],
    over: false
  };
}
