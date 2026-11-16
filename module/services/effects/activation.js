/**
 * @module services/effects/activation
 * @description Kata, kiho, and tattoos apply while active, not while owned (roadmap/STAGE-11 decision 8,
 * roadmap/STAGE-15). Activating one makes an Active Effect that carries the item's rules (its choices filled in) and
 * an exclusive group: one kata at a time, one kiho of each type but Martial, and one tattoo. Starting a second in a
 * group ends the first (module/documents/active-effect.js). A tattoo lasts twice the School Rank in Rounds; a passive
 * tattoo applies while owned and is not activated. Deactivating deletes the effect.
 * game-rules/86_kata.md, p.259
 * game-rules/87_kiho.md, p.261
 * game-rules/52_dragon_schools.md, p.115
 */

import { SYS_ID } from "../../config/constants.js";
import { applyChoices } from "../../utils/choices.js";
import { highestSchoolRank } from "../../utils/mechanics.js";

/** Item types activated rather than applied while owned. */
export const ACTIVATED_TYPES = Object.freeze(["kata", "kiho", "tattoo"]);

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
  if (!ACTIVATED_TYPES.includes(item.type) || item.system.passive) {
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
      ...durationOf(actor, item),
      flags: { [SYS_ID]: { activatedFrom: item.id } }
    }
  ]);
}

/**
 * The exclusive group of an item's effect: "kata", "tattoo", "kiho-<type>", or "" for a Martial kiho, of which
 * several may be active.
 * game-rules/87_kiho.md, p.261
 * @param {Item} item
 * @returns {string}
 */
function groupOf(item) {
  if (item.type === "kata" || item.type === "tattoo") {
    return item.type;
  }
  return item.system.type === "martial" ? "" : `kiho-${item.system.type}`;
}

/**
 * How long an activation lasts: a tattoo twice the School Rank in Rounds; a kata or kiho, or the tattoo of a
 * character with no School, until it is ended.
 * game-rules/52_dragon_schools.md, p.115
 * @param {Actor} actor
 * @param {Item} item
 * @returns {object}
 */
function durationOf(actor, item) {
  const rank = item.type === "tattoo" ? highestSchoolRank(actor) : 0;
  return rank ? { duration: { value: 2 * rank, units: "rounds" } } : {};
}
