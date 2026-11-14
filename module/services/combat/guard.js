/**
 * @module services/combat/guard
 * @description The Guard action (p.87): the guard names one character within 5 feet; until the guard's next Turn
 * that character has +10 Armor TN and the guard -5 (the "guarded" and "guarding" statuses). Not in the Full Attack
 * Stance. Whether the ward stays within 5 feet is the table's call.
 */

import { T } from "../../utils/localization.js";
import { applyEffectAnywhere } from "../effects/apply.js";

/**
 * Guard a character: both statuses count from the guard's Turn.
 * @param {Actor} protector  The guard
 * @param {Actor} ward
 * @returns {Promise<boolean>} Whether the guard was set
 */
export async function guard(protector, ward) {
  if (protector.statuses.has("fullAttackStance")) {
    ui.notifications?.warn(T("l5r4.ui.combat.guardFullAttack"));
    return false;
  }
  await applyEffectAnywhere(protector, "guarding", { turnOf: protector.uuid });
  await applyEffectAnywhere(ward, "guarded", { turnOf: protector.uuid, origin: protector.uuid });
  return true;
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
