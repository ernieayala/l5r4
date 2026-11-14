/**
 * @module services/effects/activation
 * @description Kata and kiho apply while active, not while owned (roadmap/STAGE-11 decision 8; Core Rulebook pp.259,
 * 261). Activating one makes an Active Effect that carries the item's rules (its choices filled in) and an exclusive
 * group: one kata at a time, and one kiho of each type but Martial. Starting a second in a group ends the first
 * (module/documents/active-effect.js). Deactivating deletes the effect.
 */

import { SYS_ID } from "../../config/constants.js";
import { applyChoices } from "../../utils/choices.js";

/** Item types activated rather than applied while owned. */
export const ACTIVATED_TYPES = Object.freeze(["kata", "kiho"]);

/**
 * The exclusive group of an item's effect: "kata", "kiho-<type>", or "" for a Martial kiho, of which several may be
 * active (p.261).
 * @param {Item} item
 * @returns {string}
 */
function groupOf(item) {
  if (item.type === "kata") {
    return "kata";
  }
  return item.system.type === "martial" ? "" : `kiho-${item.system.type}`;
}

/**
 * The effect an item's activation made, if it is active.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {ActiveEffect|undefined}
 */
export function activationOf(actor, item) {
  return actor.effects.find(effect => effect.getFlag(SYS_ID, "activatedFrom") === item.id);
}

/**
 * The ids of the actor's items that are active now.
 * @param {Actor} actor
 * @returns {string[]}
 */
export function activeItemIds(actor) {
  return actor.effects.map(effect => effect.getFlag(SYS_ID, "activatedFrom")).filter(Boolean);
}

/**
 * Activate a kata or kiho, or end it if it is active.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function toggleActivation(actor, item) {
  if (!ACTIVATED_TYPES.includes(item.type)) {
    return;
  }
  const active = activationOf(actor, item);
  if (active) {
    await active.delete();
    return;
  }
  await actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: item.name,
      img: item.img,
      origin: item.uuid,
      system: { rules: applyChoices(item.system.rules), group: groupOf(item) },
      flags: { [SYS_ID]: { activatedFrom: item.id } }
    }
  ]);
}
