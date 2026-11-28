/**
 * @module services/combat/guard
 * @description The Guard action: the guard names one character within 5 feet; until the guard's next Turn that
 * character has +10 Armor TN and the guard -5 (the "guarded" and "guarding" statuses). Not in the Full Attack
 * Stance. Whether the ward stays within 5 feet is the table's call.
 * game-rules/38_maneuvers.md, p.87
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import { applyEffectAnywhere, effectsOf } from "../effects/apply.js";
import { askGmAllow } from "../gm-allow.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";

/** Name of the GM query that ends a guard's Guard (registered in registerGuardQueries). */
export const END_GUARD_QUERY = `${SYS_ID}.endGuard`;

/**
 * Guard a character: both statuses count from the guard's Turn. A guard protects one character, so a Guard the guard
 * already holds ends first, on the same ward or another (#168).
 * game-rules/38_maneuvers.md, p.87
 * @param {Actor} protector - The guard
 * @param {Actor} ward
 * @returns {Promise<boolean>} Whether the guard was set
 */
export async function guard(protector, ward) {
  // Not in the Full Attack Stance, unless the GM allows it (#223)
  const allowed =
    !protector.statuses.has("fullAttackStance") ||
    (await askGmAllow({
      title: T("l5r4.ui.combat.guard"),
      reason: T("l5r4.ui.combat.guardFullAttack"),
      ask: T("l5r4.ui.requests.allowRequest")
    }));
  if (!allowed) {
    return false;
  }
  if (effectsOf(protector, "guarding").length) {
    await requestGmQuery(END_GUARD_QUERY, { protectorUuid: protector.uuid }, ({ protectorUuid }) =>
      endGuard(protectorUuid)
    );
  }
  await applyEffectAnywhere(protector, "guarding", { turnOf: protector.uuid });
  // The guard the GM's client checks before it guards a ward the user does not own (#162)
  await applyEffectAnywhere(ward, "guarded", {
    turnOf: protector.uuid,
    origin: protector.uuid,
    proof: { kind: "guard", protectorUuid: protector.uuid }
  });
  return true;
}

/**
 * Register the GM side of ending a Guard: a guard's owner ends that guard's Guard, the Guarded on a ward the owner
 * may not own included.
 */
export function registerGuardQueries() {
  registerGmQuery(END_GUARD_QUERY, async ({ protectorUuid }, { user }) => {
    const protector = await fromUuid(String(protectorUuid));
    if (protector?.documentName !== "Actor" || !protector.testUserPermission(user, "OWNER")) {
      throw new Error("l5r4.ui.requests.notYourGuard");
    }
    await endGuard(protector.uuid);
  });
}

/**
 * The "Guard" token control: the selected token's actor guards the targeted token's actor.
 * @returns {Promise<void>}
 */
export async function guardFromCanvas() {
  const guardActor = canvas.tokens.controlled[0]?.actor;
  const ward = [...game.user.targets][0]?.actor;
  if (!guardActor?.isOwner || !ward || guardActor === ward) {
    ui.notifications?.warn(T("l5r4.ui.combat.guardPick"));
    return;
  }
  await guard(guardActor, ward);
}

/**
 * Add the "Guard" button to the token controls.
 * @param {Record<string, object>} controls
 */
export function onGetSceneControlButtonsGuard(controls) {
  if (!controls.tokens) {
    return;
  }
  const tools = controls.tokens.tools;
  tools[`${SYS_ID}-guard`] = {
    name: `${SYS_ID}-guard`,
    order: Object.keys(tools).length,
    title: "l5r4.ui.combat.guard",
    icon: "fa-solid fa-shield-halved",
    button: true,
    onChange: () => guardFromCanvas()
  };
}

/**
 * End a guard's Guard: its Guarding, and the Guarded it put on any actor in the world or on the canvas. Runs on the
 * GM's client, or the GM's own.
 * game-rules/38_maneuvers.md, p.87
 * @param {string} protectorUuid
 * @returns {Promise<void>}
 */
async function endGuard(protectorUuid) {
  const tokenActors = (canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(Boolean);
  for (const actor of new Set([...game.actors, ...tokenActors])) {
    const ended = [
      ...effectsOf(actor, "guarded").filter(e => e.origin === protectorUuid),
      ...(actor.uuid === protectorUuid ? effectsOf(actor, "guarding") : [])
    ].map(e => e.id);
    if (ended.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", ended);
    }
  }
}
